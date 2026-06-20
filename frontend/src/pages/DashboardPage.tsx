import type { PageKey } from "../app/types/common";
import Dashboard from "../features/dashboard/Dashboard";
import type { Task } from "../features/tasks/types";
import { dateFromToday } from "../lib/date";

function getTaskOverview(tasks: Task[]) {
  // 首页概览以“今天”为中心计算，避免把完整统计逻辑复制到 Dashboard。
  const todayTasks = tasks.filter((task) => task.dueDate && task.dueDate === dateFromToday(0));
  const completedToday = todayTasks.filter((task) => task.status === "已完成").length;

  return {
    completedToday,
    overdueCount: tasks.filter((task) => task.status !== "已完成" && Boolean(task.dueDate) && task.dueDate < dateFromToday(0)).length,
    todayTasks,
  };
}

export interface DashboardPageProps {
  onOpenTask: (task: Task) => void;
  onPageChange: (page: PageKey) => void;
  onToggleComplete: (taskId: number) => void;
  recommendedTasks: Task[];
  tasks: Task[];
}

export default function DashboardPage({
  onOpenTask,
  onPageChange,
  onToggleComplete,
  recommendedTasks,
  tasks,
}: DashboardPageProps) {
  const { completedToday, overdueCount, todayTasks } = getTaskOverview(tasks);

  return (
    <Dashboard
      completedToday={completedToday}
      onOpenTask={onOpenTask}
      onPageChange={() => onPageChange("tasks")}
      onToggleComplete={onToggleComplete}
      overdueCount={overdueCount}
      recommendedTasks={recommendedTasks}
      todayTasks={todayTasks}
    />
  );
}
