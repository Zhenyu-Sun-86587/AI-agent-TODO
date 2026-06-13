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

  return {
    createTask,
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
    suggestTaskFields,
    taskDetailState,
    taskVersion,
    tasks,
    toggleComplete,
    updateTask,
    updateTaskStatus,
  };
}
