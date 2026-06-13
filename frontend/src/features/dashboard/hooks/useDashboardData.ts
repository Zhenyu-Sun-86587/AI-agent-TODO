import { useMemo } from "react";
import type { Task, TaskPriority } from "../../tasks/types";

export function useDashboardData({
  isApiMode,
  remoteCategories,
  tasks,
}: {
  isApiMode: boolean;
  remoteCategories: string[];
  tasks: Task[];
}) {
  const categories = useMemo(() => Array.from(new Set(tasks.map((task) => task.category))).sort(), [tasks]);
  const visibleCategories = isApiMode ? remoteCategories : categories;
  const recommendedTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => task.status !== "已完成")
        .sort((left, right) => {
          const priorityScore: Record<TaskPriority, number> = { 高: 3, 中: 2, 低: 1 };
          return (
            priorityScore[right.priority] - priorityScore[left.priority] ||
            (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31")
          );
        })
        .slice(0, 3),
    [tasks],
  );

  return {
    categories,
    recommendedTasks,
    visibleCategories,
  };
}
