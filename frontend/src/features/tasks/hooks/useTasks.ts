import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { ToastTone } from "../../../components/Toast";
import type { DemoSession } from "../../auth/types";
import type { ProfileState, SettingsState } from "../../settings/types";
import { writeStoredJson } from "../../../lib/storage";
import { TASKS_STORAGE_KEY, readStoredTasks } from "../services/taskStorage";
import type { Task } from "../types";
import { useTaskCrud } from "./useTaskCrud";
import { useTaskRemoteSync } from "./useTaskRemoteSync";
import { useTaskSelection } from "./useTaskSelection";
import { useTaskSuggestions } from "./useTaskSuggestions";

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
  const [taskVersion, setTaskVersion] = useState(0);

  // 任务变更版本号供分页列表和统计页重新拉取远程数据，避免把派生刷新绑死在任务数组引用上。
  const markTaskDataChanged = useCallback(() => {
    setTaskVersion((value) => value + 1);
  }, []);

  useEffect(() => {
    // API 会话以服务端为准，只有本地演示模式才把任务快照写回浏览器存储。
    if (!session?.isApiSession) {
      writeStoredJson(TASKS_STORAGE_KEY, tasks);
    }
  }, [session?.isApiSession, tasks]);

  const {
    loadRemoteWorkspace,
    remoteCategories,
    remoteStats,
  } = useTaskRemoteSync({
    activeToken,
    handleApiError,
    markTaskDataChanged,
    session,
    setApiMessage,
    setApiState,
    setProfile,
    setSession,
    setSettings,
    setTasks,
  });

  const selection = useTaskSelection({
    activeToken,
    handleApiError,
    tasks,
  });

  const {
    createTask,
    deleteTask,
    toggleComplete,
    updateTask,
    updateTaskStatus,
  } = useTaskCrud({
    activeToken,
    deleteCandidate: selection.deleteCandidate,
    editingTask: selection.editingTask,
    handleApiError,
    loadRemoteWorkspace,
    markTaskDataChanged,
    selectedTask: selection.selectedTask,
    setApiMessage,
    setApiState,
    setCreateOpen: selection.setCreateOpen,
    setDeleteCandidate: selection.setDeleteCandidate,
    setEditingTask: selection.setEditingTask,
    setSelectedTask: selection.setSelectedTask,
    setTasks,
    showToast,
    tasks,
  });

  const { suggestTaskFields } = useTaskSuggestions({
    activeToken,
    handleApiError,
    setApiMessage,
    setApiState,
  });

  return {
    createTask,
    deleteCandidate: selection.deleteCandidate,
    deleteTask,
    editingTask: selection.editingTask,
    isCreateOpen: selection.isCreateOpen,
    loadRemoteWorkspace,
    openTaskDetails: selection.openTaskDetails,
    remoteCategories,
    remoteStats,
    requestDeleteTask: selection.requestDeleteTask,
    resetTaskSelection: selection.resetTaskSelection,
    selectedTask: selection.selectedTask,
    setCreateOpen: selection.setCreateOpen,
    setDeleteCandidate: selection.setDeleteCandidate,
    setEditingTask: selection.setEditingTask,
    setSelectedTask: selection.setSelectedTask,
    suggestTaskFields,
    taskDetailState: selection.taskDetailState,
    taskVersion,
    tasks,
    toggleComplete,
    updateTask,
    updateTaskStatus,
  };
}
