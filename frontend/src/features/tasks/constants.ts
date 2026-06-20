import type { TaskPriority, TaskStatus } from "./types";

// API_TASK_STATUS_OPTIONS 受当前后端能力限制，只暴露后端真正接受的状态集合。
export const TASK_STATUS_OPTIONS: readonly TaskStatus[] = ["待办", "进行中", "已完成"];
export const API_TASK_STATUS_OPTIONS: readonly TaskStatus[] = ["待办", "已完成"];
export const TASK_PRIORITY_OPTIONS: readonly TaskPriority[] = ["高", "中", "低"];

export const TASK_PRIORITY_SCORE: Record<TaskPriority, number> = {
  高: 3,
  中: 2,
  低: 1,
};

export const TASK_FILTER_ALL = "全部";

export type TaskStatusFilter = TaskStatus | typeof TASK_FILTER_ALL;
export type TaskPriorityFilter = TaskPriority | typeof TASK_FILTER_ALL;

export function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUS_OPTIONS.some((item) => item === value);
}

export function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITY_OPTIONS.some((item) => item === value);
}

export function isTaskStatusFilter(value: string): value is TaskStatusFilter {
  return value === TASK_FILTER_ALL || isTaskStatus(value);
}

export function isTaskPriorityFilter(value: string): value is TaskPriorityFilter {
  return value === TASK_FILTER_ALL || isTaskPriority(value);
}
