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
  // 本地模式从任务实时聚合分类，API 模式使用后端分类列表以包含暂时无任务的分类。
  const categories = useMemo(() => Array.from(new Set(tasks.map((task) => task.category))).sort(), [tasks]);
  const visibleCategories = isApiMode ? remoteCategories : categories;
  const recommendedTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => task.status !== "已完成")
        .sort((left, right) => {
          const priorityScore: Record<TaskPriority, number> = { 高: 3, 中: 2, 低: 1 };
          // 仪表盘推荐先看优先级，再按截止日期兜底排序，空日期放到最后。
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
