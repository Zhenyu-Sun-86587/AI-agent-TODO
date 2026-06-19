import type { ApiCategoryStats, ApiPriority, ApiPriorityStats } from "../../../api/types";
import { formatLocalDate, getMonthEnd, getMonthStart, getWeekStart } from "../../../lib/date";
import { TASK_PRIORITY_OPTIONS } from "../constants";
import type { Task } from "../types";
import { isTaskOverdue } from "../utils/taskState";

export type StatsRangeKey = "currentWeek" | "lastWeek" | "currentMonth" | "lastMonth";

export function getStatsRangeConfig(range: StatsRangeKey) {
  const today = new Date();

  if (range === "currentWeek" || range === "lastWeek") {
    const weekStart = getWeekStart(today);
    const start = new Date(weekStart);
    start.setDate(start.getDate() + (range === "lastWeek" ? -7 : 0));
    const labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const days = labels.map((label, index) => ({
      key: formatLocalDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)),
      label,
    }));

    return {
      title: range === "lastWeek" ? "上周任务趋势" : "本周任务趋势",
      subtitle: range === "lastWeek" ? "按周一到周日查看上周任务变化" : "按周一到周日查看本周任务变化",
      apiDays: 7,
      startDate: days[0].key,
      endDate: days[days.length - 1].key,
      buckets: days,
    };
  }

  if (range === "currentMonth") {
    const monthStart = getMonthStart(today);
    const totalDays = today.getDate();
    const startDate = formatLocalDate(monthStart);
    const endDate = formatLocalDate(today);

    return {
      title: "本月任务趋势",
      subtitle: "按日期查看本月至今的任务变化",
      apiDays: totalDays,
      startDate,
      endDate,
      buckets: Array.from({ length: totalDays }, (_, index) => ({
        key: formatLocalDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() + index)),
        label: `${index + 1}日`,
      })),
    };
  }

  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const start = getMonthStart(lastMonthDate);
  const end = getMonthEnd(lastMonthDate);
  const totalDays = end.getDate();

  return {
    title: "上月任务趋势",
    subtitle: "按日期查看上月每日任务变化",
    apiDays: totalDays,
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    buckets: Array.from({ length: totalDays }, (_, index) => ({
      key: formatLocalDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)),
      label: `${index + 1}日`,
    })),
  };
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  return Boolean(date) && date >= startDate && date <= endDate;
}

export function isOverdue(task: Task) {
  return isTaskOverdue(task);
}

export function buildLocalTrend(tasks: Task[], buckets: Array<{ key: string; label: string }>) {
  return buckets.map((bucket) => ({
    label: bucket.label,
    created: tasks.filter((task) => task.createdAt === bucket.key).length,
    done: tasks.filter((task) => task.completedAt === bucket.key || (task.status === "已完成" && task.dueDate === bucket.key)).length,
  }));
}

export function buildLocalCategoryStats(tasks: Task[], startDate: string, endDate: string): ApiCategoryStats[] {
  const relevantTasks = tasks.filter((task) => !task.dueDate || isDateInRange(task.dueDate, startDate, endDate));
  const categoryMap = new Map<string, { done: number; todo: number; total: number }>();

  relevantTasks.forEach((task) => {
    const category = task.category || "未分类";
    const current = categoryMap.get(category) || { done: 0, todo: 0, total: 0 };
    current.total += 1;
    if (task.status === "已完成") {
      current.done += 1;
    } else {
      current.todo += 1;
    }
    categoryMap.set(category, current);
  });

  return Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      done: stats.done,
      todo: stats.todo,
      total: stats.total,
      completion_rate: stats.total ? stats.done / stats.total : 0,
    }))
    .sort((left, right) => right.total - left.total);
}

export function buildLocalPriorityStats(tasks: Task[], startDate: string, endDate: string): ApiPriorityStats[] {
  const relevantTasks = tasks.filter((task) => !task.dueDate || isDateInRange(task.dueDate, startDate, endDate));

  return TASK_PRIORITY_OPTIONS.map((priority) => {
    const priorityTasks = relevantTasks.filter((task) => task.priority === priority);
    const apiPriority: ApiPriority = priority === "高" ? "high" : priority === "低" ? "low" : "medium";

    return {
      priority: apiPriority,
      done: priorityTasks.filter((task) => task.status === "已完成").length,
      todo: priorityTasks.filter((task) => task.status !== "已完成").length,
      total: priorityTasks.length,
    };
  }).filter((item) => item.total > 0);
}

export function priorityLabel(priority: ApiPriorityStats["priority"]) {
  return priority === "high" ? "高" : priority === "low" ? "低" : "中";
}
