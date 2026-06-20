import { dateFromToday } from "../../../lib/date";
import { readStoredJson } from "../../../lib/storage";
import { isTaskPriority, isTaskStatus } from "../constants";
import { initialTasks } from "./mockData";
import type { Task } from "../types";

export const TASKS_STORAGE_KEY = "ai-agent-todo.tasks";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStoredTask(item: unknown, index: number): Task | null {
  if (!isRecord(item) || typeof item.title !== "string") {
    return null;
  }

  // 本地存储可能来自旧版本或被手动修改，恢复时统一补齐枚举和 AI 字段的默认值。
  const status = typeof item.status === "string" && isTaskStatus(item.status) ? item.status : "待办";
  const priority = typeof item.priority === "string" && isTaskPriority(item.priority) ? item.priority : "中";
  const category = typeof item.category === "string" && item.category.trim() ? item.category : "未分类";

  return {
    id: typeof item.id === "number" && Number.isFinite(item.id) ? item.id : Date.now() + index,
    title: item.title,
    description: typeof item.description === "string" ? item.description : "",
    status,
    priority,
    category,
    dueDate: typeof item.dueDate === "string" ? item.dueDate : "",
    dueTime: typeof item.dueTime === "string" ? item.dueTime : "",
    createdAt: typeof item.createdAt === "string" ? item.createdAt : dateFromToday(0),
    completedAt: typeof item.completedAt === "string" ? item.completedAt : null,
    tags: Array.isArray(item.tags) ? item.tags.filter((tag): tag is string => typeof tag === "string") : [category],
    aiReason: typeof item.aiReason === "string" ? item.aiReason : "AI 将根据截止时间、优先级和任务上下文持续更新建议。",
    estimatedTime: typeof item.estimatedTime === "string" ? item.estimatedTime : priority === "高" ? "2小时" : "1小时",
    aiCategory: typeof item.aiCategory === "string" ? item.aiCategory : category,
    isAiCreated: item.isAiCreated === true,
    confidence: typeof item.confidence === "number" ? item.confidence : undefined,
    rawDueText: typeof item.rawDueText === "string" ? item.rawDueText : undefined,
    sourceText: typeof item.sourceText === "string" ? item.sourceText : undefined,
  };
}

export function readStoredTasks() {
  const storedTasks = readStoredJson<unknown>(TASKS_STORAGE_KEY, null);
  if (!Array.isArray(storedTasks)) {
    // 首次打开或存储损坏时回退到 mockData，保证本地演示始终有可操作任务。
    return initialTasks;
  }

  const normalizedTasks = storedTasks
    .map((item, index) => normalizeStoredTask(item, index))
    .filter((task): task is Task => Boolean(task));

  return normalizedTasks.length ? normalizedTasks : initialTasks;
}
