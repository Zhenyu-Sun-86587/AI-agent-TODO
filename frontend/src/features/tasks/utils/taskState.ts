import { dateFromToday } from "../../../lib/date";
import type { Task, TaskStatus } from "../types";

export function isTaskDone(task: Pick<Task, "status">) {
  return task.status === "已完成";
}

export function getNextToggleStatus(status: TaskStatus): TaskStatus {
  return status === "已完成" ? "待办" : "已完成";
}

export function resolveCompletedAt(status: TaskStatus, completedAtWhenDone = dateFromToday(0)) {
  // completedAt 只在已完成状态下参与统计，状态回退时必须清空以免完成数被重复计算。
  return status === "已完成" ? completedAtWhenDone : null;
}

export function taskWithStatus(task: Task, status: TaskStatus, completedAtWhenDone = dateFromToday(0)): Task {
  return {
    ...task,
    status,
    completedAt: resolveCompletedAt(status, completedAtWhenDone),
  };
}

export function isTaskOverdue(task: Task, today = dateFromToday(0)) {
  return task.status !== "已完成" && Boolean(task.dueDate) && task.dueDate < today;
}

export function statusActionLabel(status: TaskStatus) {
  return status === "待办" ? "设为待办" : status === "进行中" ? "设为进行中" : "设为已完成";
}

export function toggleTaskActionLabel(status: TaskStatus) {
  return status === "已完成" ? "恢复待办" : "标记完成";
}
