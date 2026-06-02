import type { Priority, TaskStatus } from "../api/types";

export const priorityText: Record<Priority, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

export const statusText: Record<TaskStatus, string> = {
  todo: "待办",
  done: "已完成",
};

export function formatDateTime(value: string | null): string {
  if (!value) {
    return "无截止时间";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function toDateTimeInputValue(value: string | null | undefined): string {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export function fromDateTimeInputValue(value: string): string | null {
  if (!value) {
    return null;
  }
  return new Date(value).toISOString();
}

export function percent(value: number): string {
  const normalized = value > 1 ? value : value * 100;
  return `${Math.round(normalized)}%`;
}
