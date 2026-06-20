import { dateFromToday } from "../../../lib/date";
import {
  TASK_FILTER_ALL,
  TASK_PRIORITY_SCORE,
  type TaskPriorityFilter,
  type TaskStatusFilter,
} from "../constants";
import type { Task } from "../types";

export type TaskSortKey = "dueDate" | "priority" | "createdAt";

export interface TaskQueryFilters {
  category?: string;
  globalSearch?: string;
  priority?: TaskPriorityFilter;
  query?: string;
  status?: TaskStatusFilter;
}

export const TASK_SORT_OPTIONS: readonly TaskSortKey[] = ["dueDate", "priority", "createdAt"];

export function isTaskSortKey(value: string): value is TaskSortKey {
  return TASK_SORT_OPTIONS.some((item) => item === value);
}

export function normalizeTaskSortKey(value: string): TaskSortKey {
  return isTaskSortKey(value) ? value : "dueDate";
}

export function buildTaskKeyword({ globalSearch = "", query = "" }: Pick<TaskQueryFilters, "globalSearch" | "query">) {
  return `${globalSearch} ${query}`.trim().toLowerCase();
}

export function taskMatchesKeyword(task: Task, keyword: string) {
  return !keyword || [task.title, task.description, task.category, task.tags.join(" ")].some((field) => field.toLowerCase().includes(keyword));
}

export function filterTasks(tasks: Task[], filters: TaskQueryFilters) {
  const keyword = buildTaskKeyword(filters);
  const status = filters.status ?? TASK_FILTER_ALL;
  const priority = filters.priority ?? TASK_FILTER_ALL;
  const category = filters.category ?? TASK_FILTER_ALL;

  // 全部筛选项采用同一个哨兵值，便于本地列表和远程查询参数保持一致的筛选语义。
  return tasks.filter((task) => {
    const matchesStatus = status === TASK_FILTER_ALL || task.status === status;
    const matchesPriority = priority === TASK_FILTER_ALL || task.priority === priority;
    const matchesCategory = category === TASK_FILTER_ALL || task.category === category;
    return taskMatchesKeyword(task, keyword) && matchesStatus && matchesPriority && matchesCategory;
  });
}

export function sortTasks(tasks: Task[], sort: TaskSortKey | string) {
  const normalizedSort = normalizeTaskSortKey(sort);
  return [...tasks].sort((left, right) => {
    if (normalizedSort === "priority") {
      return TASK_PRIORITY_SCORE[right.priority] - TASK_PRIORITY_SCORE[left.priority];
    }

    if (normalizedSort === "createdAt") {
      return right.createdAt.localeCompare(left.createdAt);
    }

    // 没有截止日期的任务排到最后，避免空日期在字符串排序中抢到最前面。
    return (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31");
  });
}

export function filterAndSortTasks(tasks: Task[], filters: TaskQueryFilters, sort: TaskSortKey | string) {
  return sortTasks(filterTasks(tasks, filters), sort);
}

export function getTodayTasks(tasks: Task[], today = dateFromToday(0)) {
  // 今日页只看截止日期等于今天的任务，再按截止时段从早到晚排列。
  return tasks
    .filter((task) => task.dueDate && task.dueDate === today)
    .sort((left, right) => (left.dueTime || "23:59").localeCompare(right.dueTime || "23:59"));
}
