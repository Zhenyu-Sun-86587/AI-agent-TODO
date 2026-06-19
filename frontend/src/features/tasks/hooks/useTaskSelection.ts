import { useCallback, useState } from "react";
import { fetchTask } from "../../../api/tasks";
import { mapApiTask } from "../../../api/mappers";
import type { Task, TaskDetailState } from "../types";

export function useTaskSelection({
  activeToken,
  handleApiError,
  tasks,
}: {
  activeToken: string;
  handleApiError: (error: unknown) => string;
  tasks: Task[];
}) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [taskDetailState, setTaskDetailState] = useState<TaskDetailState>({ isLoading: false, error: "" });

  const resetTaskSelection = useCallback(() => {
    setSelectedTask(null);
    setEditingTask(null);
    setTaskDetailState({ isLoading: false, error: "" });
  }, []);

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

  const requestDeleteTask = useCallback((taskId: number) => {
    const task = selectedTask?.id === taskId ? selectedTask : editingTask?.id === taskId ? editingTask : tasks.find((item) => item.id === taskId);
    if (task) {
      setDeleteCandidate(task);
    }
  }, [editingTask, selectedTask, tasks]);

  return {
    deleteCandidate,
    editingTask,
    isCreateOpen,
    openTaskDetails,
    requestDeleteTask,
    resetTaskSelection,
    selectedTask,
    setCreateOpen,
    setDeleteCandidate,
    setEditingTask,
    setSelectedTask,
    taskDetailState,
  };
}
