import type { CSSProperties } from "react";
import type { CalendarView } from "../../app/types/common";
import type { Task, TaskPriority } from "../../features/tasks/types";
import { dateFromToday, formatLocalDate, getMonthEnd, getMonthStart, getWeekStart } from "../../lib/date";

export const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];

export const calendarTaskRowLimit = 4;

const priorityRank: Record<TaskPriority, number> = { 高: 0, 中: 1, 低: 2 };

export interface CalendarDay {
  date: string;
  isOutsideMonth: boolean;
}

export interface CalendarWeekDay {
  date: string;
  dayNumber: number;
  isToday: boolean;
  monthNumber: number;
  weekday: string;
}

export interface CalendarDateRange {
  start: string;
  end: string;
}

export type CalendarTaskTone = "done" | "urgent" | "focus" | "calm";

export function isToday(date: string) {
  return Boolean(date) && date === dateFromToday(0);
}

export function isOverdue(task: Task) {
  return task.status !== "已完成" && Boolean(task.dueDate) && task.dueDate < dateFromToday(0);
}

export function isDateInRange(date: string, start: string, end: string) {
  return Boolean(date) && date >= start && date <= end;
}

export function parseHour(time: string) {
  const hour = Number(time.split(":")[0]);
  return Number.isFinite(hour) ? hour : null;
}

export function getSelectedDate(baseDate: Date) {
  return formatLocalDate(baseDate);
}

export function buildDateKeys(start: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatLocalDate(date);
  });
}

export function getCalendarGridStart(date: Date) {
  const value = getMonthStart(date);
  value.setDate(value.getDate() - value.getDay());
  return value;
}

export function buildCalendarDays(baseDate: Date): CalendarDay[] {
  const monthStart = getMonthStart(baseDate);
  const monthEnd = getMonthEnd(baseDate);
  const gridStart = getCalendarGridStart(baseDate);
  const leadingDays = monthStart.getDay();
  const trailingDays = 6 - monthEnd.getDay();
  const totalDays = Math.ceil((leadingDays + monthEnd.getDate() + trailingDays) / 7) * 7;

  return buildDateKeys(gridStart, totalDays).map((date) => ({
    date,
    isOutsideMonth: new Date(`${date}T00:00:00`).getMonth() !== baseDate.getMonth(),
  }));
}

export function buildWeekDays(baseDate: Date): CalendarWeekDay[] {
  return buildDateKeys(getWeekStart(baseDate), 7).map((date) => {
    const value = new Date(`${date}T00:00:00`);
    return {
      date,
      dayNumber: value.getDate(),
      isToday: isToday(date),
      monthNumber: value.getMonth() + 1,
      weekday: weekLabels[value.getDay()],
    };
  });
}

export function getDateRangeForView(
  view: CalendarView,
  baseDate: Date,
  monthDays: Array<{ date: string }>,
  weekDays: Array<{ date: string }>,
): CalendarDateRange {
  if (view === "24h") {
    const selectedDate = getSelectedDate(baseDate);
    return { start: selectedDate, end: selectedDate };
  }
  if (view === "week") {
    return { start: weekDays[0]?.date || dateFromToday(0), end: weekDays[weekDays.length - 1]?.date || dateFromToday(0) };
  }
  if (view === "month") {
    return { start: monthDays[0]?.date || dateFromToday(0), end: monthDays[monthDays.length - 1]?.date || dateFromToday(0) };
  }
  return { start: dateFromToday(0), end: dateFromToday(0) };
}

export function chunkCalendarWeeks(days: CalendarDay[]) {
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
}

export function getTaskTone(task: Task): CalendarTaskTone {
  if (task.status === "已完成") {
    return "done";
  }
  if (task.priority === "高") {
    return "urgent";
  }
  if (task.priority === "中") {
    return "focus";
  }
  return "calm";
}

export function buildTaskBarsForWeek(weekDays: CalendarDay[], tasks: Task[]) {
  const dayIndexByDate = new Map(weekDays.map((day, index) => [day.date, index]));
  const usedRowsByDate = new Map<string, Set<number>>();

  return tasks
    .filter((task) => dayIndexByDate.has(task.dueDate))
    .sort((left, right) => `${left.dueDate} ${left.dueTime || "99:99"}`.localeCompare(`${right.dueDate} ${right.dueTime || "99:99"}`))
    .map((task) => {
      const usedRows = usedRowsByDate.get(task.dueDate) ?? new Set<number>();
      let row = 0;
      while (usedRows.has(row) && row < calendarTaskRowLimit) {
        row += 1;
      }
      usedRows.add(row);
      usedRowsByDate.set(task.dueDate, usedRows);

      return {
        task,
        column: (dayIndexByDate.get(task.dueDate) ?? 0) + 1,
        isOverflow: row >= calendarTaskRowLimit,
        row: Math.min(row, calendarTaskRowLimit - 1),
        tone: getTaskTone(task),
      };
    });
}

export function buildWeekTasksByDate(weekDays: CalendarWeekDay[], tasks: Task[]) {
  const tasksByDate = new Map(weekDays.map((day) => [day.date, [] as Task[]]));

  tasks
    .filter((task) => tasksByDate.has(task.dueDate))
    .sort((left, right) => {
      const leftTime = left.dueTime || "99:99";
      const rightTime = right.dueTime || "99:99";
      return `${left.dueDate} ${leftTime} ${left.title}`.localeCompare(`${right.dueDate} ${rightTime} ${right.title}`);
    })
    .forEach((task) => {
      tasksByDate.get(task.dueDate)?.push(task);
    });

  return tasksByDate;
}

export function buildTimelineTasksByHour(selectedDate: string, tasks: Task[]) {
  const tasksByHour = new Map<number, Task[]>();

  tasks
    .filter((task) => task.dueDate === selectedDate && Boolean(task.dueTime))
    .sort((left, right) => `${left.dueTime || "99:99"} ${left.title}`.localeCompare(`${right.dueTime || "99:99"} ${right.title}`))
    .forEach((task) => {
      const hour = parseHour(task.dueTime);
      if (hour === null || hour < 0 || hour > 23) {
        return;
      }
      const hourTasks = tasksByHour.get(hour) ?? [];
      hourTasks.push(task);
      tasksByHour.set(hour, hourTasks);
    });

  return tasksByHour;
}

export function sortByPriorityThenDue(left: Task, right: Task) {
  const priorityDiff = priorityRank[left.priority] - priorityRank[right.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  return `${left.dueDate} ${left.title}`.localeCompare(`${right.dueDate} ${right.title}`);
}

export function formatWeekRangeTitle(weekDays: CalendarWeekDay[]) {
  const firstDay = weekDays[0];
  const lastDay = weekDays[weekDays.length - 1];
  if (!firstDay || !lastDay) {
    return "本周";
  }

  const first = new Date(`${firstDay.date}T00:00:00`);
  const last = new Date(`${lastDay.date}T00:00:00`);
  const firstMonth = String(first.getMonth() + 1).padStart(2, "0");
  const firstDate = String(first.getDate()).padStart(2, "0");
  const lastMonth = String(last.getMonth() + 1).padStart(2, "0");
  const lastDate = String(last.getDate()).padStart(2, "0");

  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
    return `${first.getFullYear()}年${firstMonth}月${firstDate}日 - ${lastDate}日`;
  }
  if (first.getFullYear() === last.getFullYear()) {
    return `${first.getFullYear()}年${firstMonth}月${firstDate}日 - ${lastMonth}月${lastDate}日`;
  }
  return `${first.getFullYear()}年${firstMonth}月${firstDate}日 - ${last.getFullYear()}年${lastMonth}月${lastDate}日`;
}

export function formatDateTitle(date: Date) {
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`;
}

export function motionStyle(index: number, extra: Record<string, string | number> = {}) {
  return { "--stagger-index": index, ...extra } as CSSProperties;
}
