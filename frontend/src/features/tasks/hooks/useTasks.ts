import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { parseTask, suggestTask } from "../../../api/ai";
import { fetchMe } from "../../../api/auth";
import { asErrorMessage, isAiConfigError } from "../../../api/errors";
import {
  dateFromIso,
  inputToApiTaskPayload,
  mapApiTask,
  mapParsedTaskToInput,
  priorityFromApi,
  statusFromApi,
  statusToApi,
} from "../../../api/mappers";
import { fetchSettings as fetchRemoteSettings } from "../../../api/settings";
import { fetchCategoryStats, fetchOverview, fetchPriorityStats, fetchTrendStats } from "../../../api/stats";
import {
  createTask as createRemoteTask,
  createTaskWithAi,
  deleteTask as deleteRemoteTask,
  fetchTask,
  fetchTaskCategories,
  fetchTasksPage,
  updateTask as updateRemoteTask,
  updateTaskStatus as updateRemoteTaskStatus,
} from "../../../api/tasks";
import type { RemoteStatsState } from "../../../api/types";
import type { ChatActionContext, ChatActionResult, ChatTaskAction } from "../../../components/ai-chat/types";
import type { ToastTone } from "../../../components/Toast";
import type { DemoSession } from "../../auth/types";
import type { ProfileState, SettingsState } from "../../settings/types";
import { dateFromToday } from "../../../lib/date";
import { readStoredJson, writeStoredJson } from "../../../lib/storage";
import { initialTasks } from "../services/mockData";
import type { NewTaskInput, Task, TaskDetailState, TaskFieldSuggestion, TaskPriority, TaskStatus } from "../types";
import {
  buildFrontendFallbackTask,
  generateTaskFromPrompt,
  mergeTaskInput,
  normalizeTaskInput,
} from "../utils/generation";

const TASKS_STORAGE_KEY = "ai-agent-todo.tasks";

const statusOptions: TaskStatus[] = ["待办", "进行中", "已完成"];
const priorityOptions: TaskPriority[] = ["高", "中", "低"];

const emptyRemoteStats: RemoteStatsState = {
  overview: null,
  categories: [],
  priorities: [],
  trend: [],
};

const CHAT_HELP_TEXT = [
  "我可以直接帮你操作任务。常用指令：",
  "创建：创建任务,明天下午三点完成报告",
  "查询：查询任务 / 查询任务 报告 / 列出高优先级任务",
  "详情：查看任务 报告",
  "修改：修改任务 报告 优先级为高",
  "完成：完成任务 报告",
  "恢复：恢复任务 报告",
  "删除：删除任务 报告",
  "如果任务名匹配多个，我会先列出候选，不会直接误删误改。",
].join("\n");

function looksUnderspecifiedTaskText(text: string) {
  const normalized = text.trim();
  if (!normalized) {
    return true;
  }
  if (normalized.length <= 2) {
    return true;
  }
  return /^(任务|待办|事情|这个|那个|一下|弄一下|处理一下|搞一下)$/i.test(normalized);
}

function buildCreateFollowUp(text: string) {
  return [
    `我可以创建任务，不过“${text || "这个任务"}”的信息有点少。`,
    "请补充任务内容，最好包含截止时间、优先级或分类。",
    "例如：创建任务：明天下午 3 点完成软件工程报告，优先级高，分类学习",
  ].join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStoredTask(item: unknown, index: number): Task | null {
  if (!isRecord(item) || typeof item.title !== "string") {
    return null;
  }

  const status = statusOptions.includes(item.status as TaskStatus) ? (item.status as TaskStatus) : "待办";
  const priority = priorityOptions.includes(item.priority as TaskPriority) ? (item.priority as TaskPriority) : "中";
  const category = typeof item.category === "string" && item.category.trim() ? item.category : "未分类";

  return {
    id: typeof item.id === "number" && Number.isFinite(item.id) ? item.id : Date.now() + index,
    title: item.title,
    description: typeof item.description === "string" ? item.description : "",
    status,
    priority,
    category,
    dueDate: typeof item.dueDate === "string" ? item.dueDate : "",
    dueTime: typeof item.dueTime === "string" ? item.dueTime : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : dateFromToday(0),
    completedAt: typeof item.completedAt === "string" ? item.completedAt : null,
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [category],
    aiReason: typeof item.aiReason === "string" ? item.aiReason : "AI 将根据截止时间、优先级和任务上下文持续更新建议。",
    estimatedTime: typeof item.estimatedTime === "string" ? item.estimatedTime : priority === "高" ? "2小时" : "1小时",
    aiCategory: typeof item.aiCategory === "string" ? item.aiCategory : category,
    isAiCreated: item.isAiCreated === true,
    confidence: typeof item.confidence === "number" ? item.confidence : undefined,
    rawDueText: typeof item.rawDueText === "string" ? item.rawDueText : undefined,
    sourceText: typeof item.sourceText === "string" ? item.sourceText : undefined,
  };
}

function readStoredTasks() {
  const storedTasks = readStoredJson<unknown>(TASKS_STORAGE_KEY, null);
  if (!Array.isArray(storedTasks)) {
    return initialTasks;
  }

  const normalizedTasks = storedTasks
    .map((item, index) => normalizeStoredTask(item, index))
    .filter((task): task is Task => Boolean(task));

  return normalizedTasks.length ? normalizedTasks : initialTasks;
}

function formatTaskDue(task: Task) {
  return task.dueDate ? `${task.dueDate}${task.dueTime ? ` ${task.dueTime}` : ""}` : "未设置";
}

function formatTaskLine(task: Task, index?: number) {
  const prefix = typeof index === "number" ? `${index + 1}. ` : "";
  return `${prefix}${task.title}｜${task.status}｜${task.priority}｜${task.category}｜${formatTaskDue(task)}`;
}

function normalizeSearchText(text: string) {
  return text.trim().toLowerCase();
}

function findMatchingTasks(taskList: Task[], target: string) {
  const normalizedTarget = normalizeSearchText(target);
  if (!normalizedTarget) {
    return [];
  }

  const idMatch = normalizedTarget.match(/^#?(\d+)$/);
  if (idMatch) {
    const id = Number(idMatch[1]);
    return taskList.filter((task) => task.id === id);
  }

  const exactMatches = taskList.filter((task) => normalizeSearchText(task.title) === normalizedTarget);
  if (exactMatches.length) {
    return exactMatches;
  }

  return taskList.filter((task) => {
    const haystack = `${task.title}\n${task.description}\n${task.category}\n${task.tags.join(" ")}`.toLowerCase();
    return haystack.includes(normalizedTarget);
  });
}

function filterTasksForChat(taskList: Task[], action: Extract<ChatTaskAction, { kind: "list-tasks" }>) {
  const query = normalizeSearchText(action.query || "");
  return taskList.filter((task) => {
    if (action.status && task.status !== action.status) {
      return false;
    }
    if (action.priority && task.priority !== action.priority) {
      return false;
    }
    if (action.category && normalizeSearchText(task.category) !== normalizeSearchText(action.category)) {
      return false;
    }
    if (query) {
      const haystack = `${task.title}\n${task.description}\n${task.category}\n${task.tags.join(" ")}`.toLowerCase();
      if (!haystack.includes(query)) {
        return false;
      }
    }
    return true;
  });
}

function parseChatTaskChanges(currentTask: Task, changesText: string): NewTaskInput {
  const input = taskToInputForChat(currentTask);
  const normalized = changesText.trim();
  const lower = normalized.toLowerCase();

  const titleMatch = normalized.match(/(?:标题|名称)\s*(?:为|改为|是|:|：)\s*([^，,。；;]+)/);
  if (titleMatch?.[1]) {
    input.title = titleMatch[1].trim();
  } else if (!/(优先级|分类|类别|截止|时间|描述|状态)/.test(normalized)) {
    input.title = normalized;
  }

  const descriptionMatch = normalized.match(/(?:描述|说明|备注)\s*(?:为|改为|是|:|：)\s*([^。；;]+)/);
  if (descriptionMatch?.[1]) {
    input.description = descriptionMatch[1].trim();
  }

  const categoryMatch = normalized.match(/(?:分类|类别)\s*(?:为|改为|是|:|：)\s*([\u4e00-\u9fa5A-Za-z0-9_-]+)/);
  if (categoryMatch?.[1]) {
    input.category = categoryMatch[1].trim();
  }

  if (/(高优先级|优先级\s*(?:为|改为|是|:|：)?\s*高|priority\s*high|high)/i.test(normalized)) {
    input.priority = "高";
  } else if (/(低优先级|优先级\s*(?:为|改为|是|:|：)?\s*低|priority\s*low|low)/i.test(normalized)) {
    input.priority = "低";
  } else if (/(中优先级|优先级\s*(?:为|改为|是|:|：)?\s*中|priority\s*medium|medium)/i.test(normalized)) {
    input.priority = "中";
  }

  if (/(完成|已完成|done)/i.test(normalized)) {
    input.status = "已完成";
  } else if (/(待办|未完成|todo)/i.test(normalized)) {
    input.status = "待办";
  }

  const dateMatch = normalized.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch?.[1]) {
    input.dueDate = dateMatch[1];
  }
  const timeMatch = normalized.match(/(\d{1,2}:\d{2})/);
  if (timeMatch?.[1]) {
    const [hour, minute] = timeMatch[1].split(":");
    input.dueTime = `${hour.padStart(2, "0")}:${minute}`;
  } else if (lower.includes("上午")) {
    input.dueTime = "10:00";
  } else if (lower.includes("中午")) {
    input.dueTime = "12:00";
  } else if (lower.includes("下午")) {
    input.dueTime = "15:00";
  } else if (lower.includes("晚上")) {
    input.dueTime = "20:00";
  }

  return input;
}

function taskToInputForChat(task: Task): NewTaskInput {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category: task.category,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    tags: task.tags.join(", "),
    aiReason: task.aiReason,
    estimatedTime: task.estimatedTime,
    aiCategory: task.aiCategory,
    isAiCreated: task.isAiCreated,
    confidence: task.confidence,
    rawDueText: task.rawDueText,
    sourceText: task.sourceText,
  };
}

export function useTasks({
  activeToken,
  handleApiError,
  session,
  setApiMessage,
  setApiState,
  setProfile,
  setSession,
  setSettings,
  showToast,
}: {
  activeToken: string;
  handleApiError: (error: unknown) => string;
  session: DemoSession | null;
  setApiMessage: (message: string) => void;
  setApiState: (state: "local" | "loading" | "online" | "offline") => void;
  setProfile: Dispatch<SetStateAction<ProfileState>>;
  setSession: Dispatch<SetStateAction<DemoSession | null>>;
  setSettings: Dispatch<SetStateAction<SettingsState>>;
  showToast: (title: string, message?: string, tone?: ToastTone) => void;
}) {
  const [tasks, setTasks] = useState<Task[]>(() => readStoredTasks());
  const [remoteStats, setRemoteStats] = useState<RemoteStatsState>(emptyRemoteStats);
  const [remoteCategories, setRemoteCategories] = useState<string[]>([]);
  const [taskVersion, setTaskVersion] = useState(0);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [taskDetailState, setTaskDetailState] = useState<TaskDetailState>({ isLoading: false, error: "" });

  const markTaskDataChanged = useCallback(() => {
    setTaskVersion((value) => value + 1);
  }, []);

  const resetTaskSelection = useCallback(() => {
    setSelectedTask(null);
    setEditingTask(null);
    setTaskDetailState({ isLoading: false, error: "" });
  }, []);

  useEffect(() => {
    if (!session?.isApiSession) {
      writeStoredJson(TASKS_STORAGE_KEY, tasks);
    }
  }, [session?.isApiSession, tasks]);

  const loadRemoteWorkspace = useCallback(async (token = activeToken) => {
    if (!token) {
      return;
    }

    setApiState("loading");
    setApiMessage("正在同步后端数据...");
    try {
      const [me, taskPage, categoryList, remoteSettings, overview, categoryStats, priorityStats, trendStats] = await Promise.all([
        fetchMe(token),
        fetchTasksPage("/tasks?page=1&page_size=100&sort_by=created_at&sort_order=desc", token),
        fetchTaskCategories(token),
        fetchRemoteSettings(token),
        fetchOverview(token),
        fetchCategoryStats(token),
        fetchPriorityStats(token),
        fetchTrendStats(token, 30),
      ]);

      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              name: me.username,
              email: me.email,
            }
          : currentSession,
      );
      setProfile({ username: me.username, email: me.email });
      setTasks(taskPage.items.map((task) => mapApiTask(task)));
      setRemoteCategories(categoryList.map((item) => item.name).filter(Boolean));
      setSettings({
        openaiApiKey: "",
        modelName: remoteSettings.model_name,
        maskedKey: remoteSettings.openai_api_key_masked || undefined,
        hasOpenaiApiKey: remoteSettings.has_openai_api_key,
      });
      setRemoteStats({
        overview,
        categories: categoryStats,
        priorities: priorityStats,
        trend: trendStats,
      });
      setTaskVersion((value) => value + 1);
      setApiState("online");
      setApiMessage("已连接后端 API");
    } catch (error) {
      handleApiError(error);
    }
  }, [activeToken, handleApiError, setApiMessage, setApiState, setProfile, setSession, setSettings]);

  useEffect(() => {
    if (session?.isApiSession) {
      void loadRemoteWorkspace(session.token);
    } else {
      setApiState("local");
      setApiMessage("本地演示模式");
      setRemoteStats(emptyRemoteStats);
      setRemoteCategories([]);
      setProfile({
        username: session?.name || "Demo User",
        email: session?.email || "demo@aitodo.local",
      });
    }
  }, [loadRemoteWorkspace, session?.email, session?.isApiSession, session?.name, session?.token, setApiMessage, setApiState, setProfile]);

  const openTaskDetails = useCallback(async (task: Task) => {
    setSelectedTask(task);
    setTaskDetailState({ isLoading: Boolean(activeToken), error: "" });
    if (!activeToken) {
      return;
    }

    try {
      const remoteTask = await fetchTask(task.id, activeToken);
      setSelectedTask(mapApiTask(remoteTask));
      setTaskDetailState({ isLoading: false, error: "" });
    } catch (error) {
      setTaskDetailState({ isLoading: false, error: handleApiError(error) });
    }
  }, [activeToken, handleApiError]);

  const updateTaskStatus = useCallback(async (taskId: number, nextStatus: TaskStatus) => {
    const currentTask = tasks.find((item) => item.id === taskId);
    if (!currentTask || currentTask.status === nextStatus) {
      return;
    }

    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage("正在更新任务状态...");
        const updatedStatus = await updateRemoteTaskStatus(taskId, statusToApi(nextStatus), activeToken);
        const resolvedStatus = statusFromApi(updatedStatus.status);
        const applyStatus = (task: Task): Task => ({
          ...task,
          status: resolvedStatus,
          completedAt: resolvedStatus === "已完成" ? dateFromIso(updatedStatus.updated_at) : null,
        });
        setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? applyStatus(task) : task)));
        setSelectedTask((currentTask) =>
          currentTask?.id === taskId ? applyStatus(currentTask) : currentTask,
        );
        markTaskDataChanged();
        await loadRemoteWorkspace(activeToken);
        showToast(`状态已更新为${resolvedStatus}`, currentTask.title, "success");
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    const applyStatus = (task: Task): Task => ({
      ...task,
      status: nextStatus,
      completedAt: nextStatus === "已完成" ? dateFromToday(0) : null,
    });

    setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? applyStatus(task) : task)));
    setSelectedTask((currentTask) => (currentTask?.id === taskId ? applyStatus(currentTask) : currentTask));
    markTaskDataChanged();
    showToast(`状态已更新为${nextStatus}`, currentTask.title, "success");
  }, [activeToken, handleApiError, loadRemoteWorkspace, markTaskDataChanged, setApiMessage, setApiState, showToast, tasks]);

  const toggleComplete = useCallback(async (taskId: number) => {
    const currentTask = tasks.find((item) => item.id === taskId);
    if (!currentTask) {
      return;
    }
    const nextStatus = currentTask.status === "已完成" ? "待办" : "已完成";
    await updateTaskStatus(taskId, nextStatus);
  }, [tasks, updateTaskStatus]);

  const requestDeleteTask = useCallback((taskId: number) => {
    const task = selectedTask?.id === taskId ? selectedTask : editingTask?.id === taskId ? editingTask : tasks.find((item) => item.id === taskId);
    if (task) {
      setDeleteCandidate(task);
    }
  }, [editingTask, selectedTask, tasks]);

  const deleteTask = useCallback(async (taskId: number) => {
    const taskTitle = deleteCandidate?.id === taskId ? deleteCandidate.title : tasks.find((task) => task.id === taskId)?.title;
    setDeleteCandidate(null);
    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage("正在删除任务...");
        await deleteRemoteTask(taskId, activeToken);
        setSelectedTask(null);
        setEditingTask(null);
        setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
        markTaskDataChanged();
        await loadRemoteWorkspace(activeToken);
        showToast("任务已删除", taskTitle, "success");
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
    if (editingTask?.id === taskId) {
      setEditingTask(null);
    }
    markTaskDataChanged();
    showToast("任务已删除", taskTitle, "success");
  }, [activeToken, deleteCandidate, editingTask, handleApiError, loadRemoteWorkspace, markTaskDataChanged, selectedTask, setApiMessage, setApiState, showToast, tasks]);

  const createLocalTask = useCallback((input: NewTaskInput) => {
    const normalizedInput = normalizeTaskInput(input);
    const task: Task = {
      id: Math.max(0, ...tasks.map((item) => item.id)) + 1,
      title: normalizedInput.title,
      description: normalizedInput.description,
      status: normalizedInput.status,
      priority: normalizedInput.priority,
      category: normalizedInput.category,
      dueDate: normalizedInput.dueDate,
      dueTime: normalizedInput.dueTime,
      createdAt: dateFromToday(0),
      completedAt: normalizedInput.status === "已完成" ? dateFromToday(0) : null,
      tags: Array.from(
        new Set(
          normalizedInput.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .concat(normalizedInput.isAiCreated ? ["AI生成"] : []),
        ),
      ),
      aiReason: normalizedInput.aiReason || "AI 将根据截止时间、优先级和任务上下文持续更新建议。",
      estimatedTime: normalizedInput.estimatedTime || (normalizedInput.priority === "高" ? "2小时" : "1小时"),
      aiCategory: normalizedInput.aiCategory || normalizedInput.category,
      isAiCreated: Boolean(normalizedInput.isAiCreated),
      confidence: normalizedInput.confidence,
      rawDueText: normalizedInput.rawDueText,
      sourceText: normalizedInput.sourceText,
    };
    setTasks((currentTasks) => [task, ...currentTasks]);
    markTaskDataChanged();
    setCreateOpen(false);
    showToast("任务已创建", task.title, "success");
  }, [markTaskDataChanged, showToast, tasks]);

  const createTask = useCallback(async (input: NewTaskInput) => {
    const normalizedInput = normalizeTaskInput(input);
    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage(normalizedInput.isAiCreated ? "正在通过 AI 创建任务..." : "正在创建任务...");
        if (normalizedInput.isAiCreated && normalizedInput.aiBackendMode !== "frontend-fallback") {
          const data = await createTaskWithAi({
            text: normalizedInput.sourceText || `${normalizedInput.title}\n${normalizedInput.description}`.trim(),
            timezone: "Asia/Shanghai",
            overrides: inputToApiTaskPayload(normalizedInput),
          }, activeToken);
          setTasks((currentTasks) => [mapApiTask(data.task, data.parsed_task), ...currentTasks]);
        } else {
          const task = await createRemoteTask(inputToApiTaskPayload(normalizedInput), activeToken);
          setTasks((currentTasks) => [mapApiTask(task), ...currentTasks]);
        }
        markTaskDataChanged();
        setCreateOpen(false);
        await loadRemoteWorkspace(activeToken);
        showToast("任务已创建", normalizedInput.title, "success");
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    createLocalTask(normalizedInput);
  }, [activeToken, createLocalTask, handleApiError, loadRemoteWorkspace, markTaskDataChanged, setApiMessage, setApiState, showToast]);

  const createTaskFromChat = useCallback(async (prompt: string) => {
    const normalizedPrompt = prompt.trim();
    if (!normalizedPrompt) {
      throw new Error("请告诉我任务内容。");
    }

    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage("正在通过聊天创建任务...");
        const data = await createTaskWithAi({
          text: normalizedPrompt,
          timezone: "Asia/Shanghai",
        }, activeToken);
        const task = mapApiTask(data.task, data.parsed_task);
        setTasks((currentTasks) => [task, ...currentTasks]);
        markTaskDataChanged();
        await loadRemoteWorkspace(activeToken);
        setApiState("online");
        setApiMessage(`聊天已创建任务：${task.title}`);
        showToast("聊天已创建任务", task.title, "success");
        return task;
      } catch (error) {
        handleApiError(error);
        throw error;
      }
    }

    const input = generateTaskFromPrompt(normalizedPrompt);
    const normalizedInput = normalizeTaskInput(input);
    const task: Task = {
      id: Math.max(0, ...tasks.map((item) => item.id)) + 1,
      title: normalizedInput.title,
      description: normalizedInput.description,
      status: normalizedInput.status,
      priority: normalizedInput.priority,
      category: normalizedInput.category,
      dueDate: normalizedInput.dueDate,
      dueTime: normalizedInput.dueTime,
      createdAt: dateFromToday(0),
      completedAt: normalizedInput.status === "已完成" ? dateFromToday(0) : null,
      tags: Array.from(
        new Set(
          normalizedInput.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .concat(normalizedInput.isAiCreated ? ["AI生成"] : []),
        ),
      ),
      aiReason: normalizedInput.aiReason || "AI 将根据截止时间、优先级和任务上下文持续更新建议。",
      estimatedTime: normalizedInput.estimatedTime || (normalizedInput.priority === "高" ? "2小时" : "1小时"),
      aiCategory: normalizedInput.aiCategory || normalizedInput.category,
      isAiCreated: true,
      confidence: normalizedInput.confidence,
      rawDueText: normalizedInput.rawDueText,
      sourceText: normalizedPrompt,
    };
    setTasks((currentTasks) => [task, ...currentTasks]);
    markTaskDataChanged();
    showToast("聊天已创建任务", task.title, "success");
    return task;
  }, [activeToken, handleApiError, loadRemoteWorkspace, markTaskDataChanged, setApiMessage, setApiState, showToast, tasks]);

  const updateTask = useCallback(async (taskId: number, input: NewTaskInput) => {
    const normalizedInput = normalizeTaskInput(input);
    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage("正在保存任务...");
        const task = await updateRemoteTask(taskId, {
          ...inputToApiTaskPayload(normalizedInput),
          status: statusToApi(normalizedInput.status),
        }, activeToken);
        const updatedTask = mapApiTask(task);
        setTasks((currentTasks) => currentTasks.map((currentTask) => (currentTask.id === taskId ? updatedTask : currentTask)));
        setSelectedTask((currentTask) => (currentTask?.id === taskId ? updatedTask : currentTask));
        setEditingTask(null);
        markTaskDataChanged();
        await loadRemoteWorkspace(activeToken);
        showToast("任务已更新", updatedTask.title, "success");
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    const originalTask = tasks.find((task) => task.id === taskId);
    if (originalTask) {
      const updatedTask = mergeTaskInput(originalTask, normalizedInput);
      setTasks((currentTasks) =>
        currentTasks.map((task) => {
          if (task.id !== taskId) {
            return task;
          }
          return updatedTask;
        }),
      );
      setSelectedTask((currentTask) => (currentTask?.id === taskId ? updatedTask : currentTask));
      setEditingTask(null);
      markTaskDataChanged();
      showToast("任务已更新", updatedTask.title, "success");
    }
  }, [activeToken, handleApiError, loadRemoteWorkspace, markTaskDataChanged, setApiMessage, setApiState, showToast, tasks]);

  const parseTaskWithAi = useCallback(async (prompt: string) => {
    if (!activeToken) {
      return generateTaskFromPrompt(prompt);
    }

    try {
      setApiState("loading");
      setApiMessage("正在调用 /ai/parse-task...");
      const data = await parseTask(prompt, activeToken);
      setApiState("online");
      setApiMessage(`AI 解析完成：${data.ai_status}`);
      return { ...mapParsedTaskToInput(data.parsed_task, prompt), aiBackendMode: "backend" as const };
    } catch (error) {
      if (isAiConfigError(error)) {
        const message = asErrorMessage(error);
        setApiState("online");
        setApiMessage(message);
        return buildFrontendFallbackTask(prompt, message);
      }
      handleApiError(error);
      throw error;
    }
  }, [activeToken, handleApiError, setApiMessage, setApiState]);

  const suggestTaskFields = useCallback(async (title: string, description: string): Promise<TaskFieldSuggestion> => {
    if (!activeToken) {
      const suggestion = generateTaskFromPrompt(`${title}\n${description}`);
      return {
        priority: suggestion.priority,
        category: suggestion.category,
        reason: suggestion.aiReason || "本地规则已根据关键词推荐分类与优先级。",
        source: "前端规则兜底",
      };
    }

    try {
      setApiState("loading");
      setApiMessage("正在调用 /ai/suggest...");
      const data = await suggestTask(title, description, activeToken);
      setApiState("online");
      setApiMessage("AI 字段建议已返回");
      return {
        priority: priorityFromApi(data.priority),
        category: data.category || "未分类",
        reason: data.reason || "后端 AI 已返回推荐结果。",
        source: "/ai/suggest",
      };
    } catch (error) {
      if (isAiConfigError(error)) {
        const suggestion = generateTaskFromPrompt(`${title}\n${description}`);
        setApiState("online");
        setApiMessage(asErrorMessage(error));
        return {
          priority: suggestion.priority,
          category: suggestion.category,
          reason: "后端 AI Key 未配置，已使用前端规则推荐分类与优先级。",
          source: "前端规则兜底",
        };
      }
      handleApiError(error);
      throw error;
    }
  }, [activeToken, handleApiError, setApiMessage, setApiState]);

  const executeTaskChatAction = useCallback(async (action: ChatTaskAction, context: ChatActionContext = { followUpMode: false }): Promise<ChatActionResult> => {
    const resolveOneTask = (target: string) => {
      const matches = findMatchingTasks(tasks, target);
      if (matches.length === 1) {
        return { task: matches[0] };
      }
      if (!matches.length) {
        return {
          error: `没有找到匹配“${target}”的任务。可以输入“查询任务”查看当前任务列表。`,
        };
      }
      return {
        error: `找到多个匹配“${target}”的任务，请说得更具体一些：\n${matches.slice(0, 6).map(formatTaskLine).join("\n")}`,
      };
    };

    if (action.kind === "help") {
      return { content: CHAT_HELP_TEXT };
    }

    if (action.kind === "create-task") {
      if (context.followUpMode && looksUnderspecifiedTaskText(action.text)) {
        return { content: buildCreateFollowUp(action.text) };
      }
      const task = await createTaskFromChat(action.text);
      return {
        content: `已创建任务：${task.title}\n优先级：${task.priority}\n分类：${task.category}\n截止时间：${formatTaskDue(task)}`,
        task: {
          category: task.category,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          priority: task.priority,
          title: task.title,
        },
      };
    }

    if (action.kind === "list-tasks") {
      const matches = filterTasksForChat(tasks, action);
      if (!matches.length) {
        return { content: "没有找到符合条件的任务。" };
      }
      const preview = matches.slice(0, 10).map(formatTaskLine).join("\n");
      const moreText = matches.length > 10 ? `\n还有 ${matches.length - 10} 条未显示。` : "";
      return { content: `找到 ${matches.length} 条任务：\n${preview}${moreText}` };
    }

    if (action.kind === "show-task") {
      const resolved = resolveOneTask(action.target);
      if (!resolved.task) {
        return { content: resolved.error || "没有找到任务。" };
      }
      const task = activeToken ? mapApiTask(await fetchTask(resolved.task.id, activeToken)) : resolved.task;
      return {
        content: [
          `任务：${task.title}`,
          `状态：${task.status}`,
          `优先级：${task.priority}`,
          `分类：${task.category}`,
          `截止时间：${formatTaskDue(task)}`,
          task.description ? `描述：${task.description}` : "",
          `标签：${task.tags.join("、") || "无"}`,
        ].filter(Boolean).join("\n"),
        task: {
          category: task.category,
          dueDate: task.dueDate,
          dueTime: task.dueTime,
          priority: task.priority,
          title: task.title,
        },
      };
    }

    if (action.kind === "set-task-status") {
      if (context.followUpMode && looksUnderspecifiedTaskText(action.target)) {
        return { content: `你想更新哪个任务的状态？请提供更明确的任务标题，例如：完成任务 软件工程报告` };
      }
      const resolved = resolveOneTask(action.target);
      if (!resolved.task) {
        return { content: resolved.error || "没有找到任务。" };
      }
      const targetTask = resolved.task;
      if (targetTask.status === action.status) {
        return { content: `任务“${targetTask.title}”已经是${action.status}状态。` };
      }

      if (activeToken) {
        try {
          setApiState("loading");
          setApiMessage("正在通过聊天更新任务状态...");
          const updatedStatus = await updateRemoteTaskStatus(targetTask.id, statusToApi(action.status), activeToken);
          const resolvedStatus = statusFromApi(updatedStatus.status);
          const applyStatus = (task: Task): Task => ({
            ...task,
            status: resolvedStatus,
            completedAt: resolvedStatus === "已完成" ? dateFromIso(updatedStatus.updated_at) : null,
          });
          setTasks((currentTasks) => currentTasks.map((task) => (task.id === targetTask.id ? applyStatus(task) : task)));
          setSelectedTask((currentTask) => (currentTask?.id === targetTask.id ? applyStatus(currentTask) : currentTask));
          markTaskDataChanged();
          await loadRemoteWorkspace(activeToken);
          setApiState("online");
          setApiMessage(`聊天已更新任务状态：${targetTask.title}`);
          showToast(`状态已更新为${resolvedStatus}`, targetTask.title, "success");
          return { content: `已将任务“${targetTask.title}”标记为${resolvedStatus}。` };
        } catch (error) {
          handleApiError(error);
          throw error;
        }
      }

      const applyStatus = (task: Task): Task => ({
        ...task,
        status: action.status,
        completedAt: action.status === "已完成" ? dateFromToday(0) : null,
      });
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === targetTask.id ? applyStatus(task) : task)));
      setSelectedTask((currentTask) => (currentTask?.id === targetTask.id ? applyStatus(currentTask) : currentTask));
      markTaskDataChanged();
      showToast(`状态已更新为${action.status}`, targetTask.title, "success");
      return { content: `已将任务“${targetTask.title}”标记为${action.status}。` };
    }

    if (action.kind === "update-task") {
      if (context.followUpMode && (looksUnderspecifiedTaskText(action.target) || looksUnderspecifiedTaskText(action.changesText))) {
        return { content: `你想修改哪个任务、改成什么？请说得更完整一些，例如：修改任务 软件工程报告 优先级为高` };
      }
      const resolved = resolveOneTask(action.target);
      if (!resolved.task) {
        return { content: resolved.error || "没有找到任务。" };
      }
      const targetTask = resolved.task;
      const nextInput = parseChatTaskChanges(targetTask, action.changesText);

      if (activeToken) {
        try {
          setApiState("loading");
          setApiMessage("正在通过聊天修改任务...");
          const updatedRemoteTask = await updateRemoteTask(targetTask.id, {
            ...inputToApiTaskPayload(normalizeTaskInput(nextInput)),
            status: statusToApi(nextInput.status),
          }, activeToken);
          const updatedTask = mapApiTask(updatedRemoteTask);
          setTasks((currentTasks) => currentTasks.map((task) => (task.id === targetTask.id ? updatedTask : task)));
          setSelectedTask((currentTask) => (currentTask?.id === targetTask.id ? updatedTask : currentTask));
          setEditingTask(null);
          markTaskDataChanged();
          await loadRemoteWorkspace(activeToken);
          setApiState("online");
          setApiMessage(`聊天已修改任务：${updatedTask.title}`);
          showToast("任务已更新", updatedTask.title, "success");
          return { content: `已修改任务：${formatTaskLine(updatedTask)}` };
        } catch (error) {
          handleApiError(error);
          throw error;
        }
      }

      const updatedTask = mergeTaskInput(targetTask, normalizeTaskInput(nextInput));
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === targetTask.id ? updatedTask : task)));
      setSelectedTask((currentTask) => (currentTask?.id === targetTask.id ? updatedTask : currentTask));
      setEditingTask(null);
      markTaskDataChanged();
      showToast("任务已更新", updatedTask.title, "success");
      return { content: `已修改任务：${formatTaskLine(updatedTask)}` };
    }

    if (action.kind === "delete-task") {
      if (context.followUpMode && looksUnderspecifiedTaskText(action.target)) {
        return { content: `你想删除哪个任务？请提供明确的任务标题，例如：删除任务 软件工程报告` };
      }
      const resolved = resolveOneTask(action.target);
      if (!resolved.task) {
        return { content: resolved.error || "没有找到任务。" };
      }
      const targetTask = resolved.task;

      if (activeToken) {
        try {
          setApiState("loading");
          setApiMessage("正在通过聊天删除任务...");
          await deleteRemoteTask(targetTask.id, activeToken);
          setSelectedTask((currentTask) => (currentTask?.id === targetTask.id ? null : currentTask));
          setEditingTask((currentTask) => (currentTask?.id === targetTask.id ? null : currentTask));
          setDeleteCandidate((currentTask) => (currentTask?.id === targetTask.id ? null : currentTask));
          setTasks((currentTasks) => currentTasks.filter((task) => task.id !== targetTask.id));
          markTaskDataChanged();
          await loadRemoteWorkspace(activeToken);
          setApiState("online");
          setApiMessage(`聊天已删除任务：${targetTask.title}`);
          showToast("任务已删除", targetTask.title, "success");
          return { content: `已删除任务：“${targetTask.title}”。` };
        } catch (error) {
          handleApiError(error);
          throw error;
        }
      }

      setSelectedTask((currentTask) => (currentTask?.id === targetTask.id ? null : currentTask));
      setEditingTask((currentTask) => (currentTask?.id === targetTask.id ? null : currentTask));
      setDeleteCandidate((currentTask) => (currentTask?.id === targetTask.id ? null : currentTask));
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== targetTask.id));
      markTaskDataChanged();
      showToast("任务已删除", targetTask.title, "success");
      return { content: `已删除任务：“${targetTask.title}”。` };
    }

    return { content: "这个任务操作我还没有识别出来。" };
  }, [
    activeToken,
    createTaskFromChat,
    handleApiError,
    loadRemoteWorkspace,
    markTaskDataChanged,
    setApiMessage,
    setApiState,
    showToast,
    tasks,
  ]);

  return {
    createTask,
    createTaskFromChat,
    deleteCandidate,
    deleteTask,
    editingTask,
    isCreateOpen,
    loadRemoteWorkspace,
    openTaskDetails,
    parseTaskWithAi,
    remoteCategories,
    remoteStats,
    requestDeleteTask,
    resetTaskSelection,
    selectedTask,
    setCreateOpen,
    setDeleteCandidate,
    setEditingTask,
    setSelectedTask,
    executeTaskChatAction,
    suggestTaskFields,
    taskDetailState,
    taskVersion,
    tasks,
    toggleComplete,
    updateTask,
    updateTaskStatus,
  };
}
