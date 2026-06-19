import { useCallback, type Dispatch, type SetStateAction } from "react";
import {
  dateFromIso,
  inputToApiTaskPayload,
  mapApiTask,
  statusFromApi,
  statusToApi,
} from "../../../api/mappers";
import {
  createTask as createRemoteTask,
  createTaskWithAi,
  deleteTask as deleteRemoteTask,
  updateTask as updateRemoteTask,
  updateTaskStatus as updateRemoteTaskStatus,
} from "../../../api/tasks";
import type { ToastTone } from "../../../components/Toast";
import type { NewTaskInput, Task, TaskStatus } from "../types";
import {
  createTaskFromInput,
  mergeTaskInput,
  normalizeTaskInput,
} from "../utils/generation";
import { getNextToggleStatus, taskWithStatus } from "../utils/taskState";

export function useTaskCrud({
  activeToken,
  deleteCandidate,
  editingTask,
  handleApiError,
  loadRemoteWorkspace,
  markTaskDataChanged,
  selectedTask,
  setApiMessage,
  setApiState,
  setCreateOpen,
  setDeleteCandidate,
  setEditingTask,
  setSelectedTask,
  setTasks,
  showToast,
  tasks,
}: {
  activeToken: string;
  deleteCandidate: Task | null;
  editingTask: Task | null;
  handleApiError: (error: unknown) => string;
  loadRemoteWorkspace: (token?: string) => Promise<void>;
  markTaskDataChanged: () => void;
  selectedTask: Task | null;
  setApiMessage: (message: string) => void;
  setApiState: (state: "local" | "loading" | "online" | "offline") => void;
  setCreateOpen: Dispatch<SetStateAction<boolean>>;
  setDeleteCandidate: Dispatch<SetStateAction<Task | null>>;
  setEditingTask: Dispatch<SetStateAction<Task | null>>;
  setSelectedTask: Dispatch<SetStateAction<Task | null>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  showToast: (title: string, message?: string, tone?: ToastTone) => void;
  tasks: Task[];
}) {
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
        const applyStatus = (task: Task): Task => taskWithStatus(task, resolvedStatus, dateFromIso(updatedStatus.updated_at));
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

    const applyStatus = (task: Task): Task => taskWithStatus(task, nextStatus);
    setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? applyStatus(task) : task)));
    setSelectedTask((currentTask) => (currentTask?.id === taskId ? applyStatus(currentTask) : currentTask));
    markTaskDataChanged();
    showToast(`状态已更新为${nextStatus}`, currentTask.title, "success");
  }, [activeToken, handleApiError, loadRemoteWorkspace, markTaskDataChanged, setApiMessage, setApiState, setSelectedTask, setTasks, showToast, tasks]);

  const toggleComplete = useCallback(async (taskId: number) => {
    const currentTask = tasks.find((item) => item.id === taskId);
    if (!currentTask) {
      return;
    }

    await updateTaskStatus(taskId, getNextToggleStatus(currentTask.status));
  }, [tasks, updateTaskStatus]);

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
  }, [activeToken, deleteCandidate, editingTask, handleApiError, loadRemoteWorkspace, markTaskDataChanged, selectedTask, setApiMessage, setApiState, setDeleteCandidate, setEditingTask, setSelectedTask, setTasks, showToast, tasks]);

  const createLocalTask = useCallback((input: NewTaskInput) => {
    const task = createTaskFromInput(input, Math.max(0, ...tasks.map((item) => item.id)) + 1);
    setTasks((currentTasks) => [task, ...currentTasks]);
    markTaskDataChanged();
    setCreateOpen(false);
    showToast("任务已创建", task.title, "success");
  }, [markTaskDataChanged, setCreateOpen, setTasks, showToast, tasks]);

  const createTask = useCallback(async (input: NewTaskInput) => {
    if (activeToken) {
      const normalizedInput = normalizeTaskInput(input);
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

    createLocalTask(input);
  }, [activeToken, createLocalTask, handleApiError, loadRemoteWorkspace, markTaskDataChanged, setApiMessage, setApiState, setCreateOpen, setTasks, showToast]);

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
  }, [activeToken, handleApiError, loadRemoteWorkspace, markTaskDataChanged, setApiMessage, setApiState, setEditingTask, setSelectedTask, setTasks, showToast, tasks]);

  return {
    createTask,
    deleteTask,
    toggleComplete,
    updateTask,
    updateTaskStatus,
  };
}
