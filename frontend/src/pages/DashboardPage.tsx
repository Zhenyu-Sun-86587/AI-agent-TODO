import Dashboard from "../Dashboard";
import type { PageKey } from "../app/types/common";
import { dateFromToday } from "../lib/date";
import type { Task } from "../features/tasks/types";

function getTaskOverview(tasks: Task[]) {
  const todayTasks = tasks.filter((task) => task.dueDate && task.dueDate === dateFromToday(0));
  const completedToday = todayTasks.filter((task) => task.status === "已完成").length;

  return {
    aiPriorityCount: tasks.filter((task) => task.status !== "已完成" && (task.isAiCreated || task.priority === "高")).length,
    completedToday,
    overdueCount: tasks.filter((task) => task.status !== "已完成" && Boolean(task.dueDate) && task.dueDate < dateFromToday(0)).length,
    todayTasks,
  };
}

export default function DashboardPage({
  onOpenTask,
  onPageChange,
  onToggleComplete,
  recommendedTasks,
  tasks,
}: {
  onOpenTask: (task: Task) => void;
  onPageChange: (page: PageKey) => void;
  onToggleComplete: (taskId: number) => void;
  recommendedTasks: Task[];
  tasks: Task[];
}) {
  const { aiPriorityCount, completedToday, overdueCount, todayTasks } = getTaskOverview(tasks);

  return (
    <Dashboard
      aiPriorityCount={aiPriorityCount}
      completedToday={completedToday}
      onOpenTask={(task) => onOpenTask(task as Task)}
      onPageChange={() => onPageChange("tasks")}
      onToggleComplete={onToggleComplete}
      overdueCount={overdueCount}
      recommendedTasks={recommendedTasks}
      todayTasks={todayTasks}
    />
  );
}
