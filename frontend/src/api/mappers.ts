import type { ApiParsedTask, ApiPriority, ApiTask, ApiTaskStatus } from "./types";
import type { NewTaskInput, Task, TaskPriority, TaskStatus } from "../features/tasks/types";
import { dateFromToday, formatLocalDate } from "../lib/date";
import { pickGeneratedCategory, pickGeneratedDueTime } from "../features/tasks/utils/generation";

export function priorityFromApi(priority: ApiPriority): TaskPriority {
  return priority === "high" ? "高" : priority === "low" ? "低" : "中";
}

export function priorityToApi(priority: TaskPriority): ApiPriority {
  return priority === "高" ? "high" : priority === "低" ? "low" : "medium";
}

export function statusFromApi(status: ApiTaskStatus): TaskStatus {
  return status === "done" ? "已完成" : "待办";
}

export function statusToApi(status: TaskStatus): ApiTaskStatus {
  return status === "已完成" ? "done" : "todo";
}

export function localPartsFromIso(value: string | null) {
  if (!value) {
    return { date: "", time: "" };
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return { date: "", time: "" };
  }

  return {
    date: formatLocalDate(date),
    time: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
  };
}

export function isoFromLocalParts(date: string, time: string) {
  if (!date) {
    return null;
  }

  const localDate = new Date(`${date}T${time || "23:59"}:00`);
  const offsetMinutes = -localDate.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, "0");
  const offsetRestMinutes = String(absoluteOffset % 60).padStart(2, "0");
  return `${date}T${time || "23:59"}:00${offsetSign}${offsetHours}:${offsetRestMinutes}`;
}

export function apiRangeIso(date: string, time: "00:00" | "23:59") {
  return isoFromLocalParts(date, time) || "";
}

export function buildDateRange(startDate: string, endDate: string) {
  return {
    from: apiRangeIso(startDate, "00:00"),
    to: apiRangeIso(endDate, "23:59"),
  };
}

export function dateFromIso(value: string | null) {
  return localPartsFromIso(value).date || dateFromToday(0);
}

export function mapApiTask(task: ApiTask, parsedTask?: ApiParsedTask): Task {
  const due = localPartsFromIso(task.due_time);
  return {
    id: task.id,
    title: task.title,
    description: task.description || "",
    status: statusFromApi(task.status),
    priority: priorityFromApi(task.priority),
    category: task.category || "未分类",
    dueDate: due.date,
    dueTime: due.time,
    createdAt: dateFromIso(task.created_at),
    completedAt: task.status === "done" ? dateFromIso(task.updated_at) : null,
    tags: task.is_ai_created ? ["AI生成", task.category || "未分类"] : [task.category || "未分类"],
    aiReason: parsedTask?.raw_due_text
      ? `AI 已识别时间表达：“${parsedTask.raw_due_text}”。`
      : task.is_ai_created
        ? "该任务由 AI 根据自然语言生成。"
        : "后端任务已同步，AI 建议将在联调后持续更新。",
    estimatedTime: task.priority === "high" ? "2小时" : task.priority === "medium" ? "1.5小时" : "1小时",
    aiCategory: task.category || "未分类",
    isAiCreated: task.is_ai_created,
    confidence: parsedTask?.confidence ?? undefined,
    rawDueText: parsedTask?.raw_due_text ?? undefined,
    sourceText: parsedTask ? `${parsedTask.title}\n${parsedTask.description || ""}`.trim() : undefined,
  };
}

export function mapParsedTaskToInput(parsedTask: ApiParsedTask, sourceText: string): NewTaskInput {
  const due = localPartsFromIso(parsedTask.due_time);
  const category = parsedTask.category || pickGeneratedCategory(sourceText.toLowerCase());
  const priority = priorityFromApi(parsedTask.priority);
  return {
    title: parsedTask.title,
    description: parsedTask.description || sourceText,
    status: "待办",
    priority,
    category,
    dueDate: due.date || dateFromToday(priority === "高" ? 1 : 2),
    dueTime: due.time || pickGeneratedDueTime(sourceText.toLowerCase()),
    tags: Array.from(new Set([category, "AI生成"])).join(", "),
    aiReason: parsedTask.raw_due_text
      ? `AI 识别到时间表达：“${parsedTask.raw_due_text}”。`
      : "AI 已根据自然语言拆出任务字段。",
    estimatedTime: priority === "高" ? "2小时" : priority === "中" ? "1.5小时" : "1小时",
    aiCategory: category,
    isAiCreated: true,
    confidence: parsedTask.confidence ?? undefined,
    rawDueText: parsedTask.raw_due_text ?? undefined,
    sourceText,
  };
}

export function inputToApiTaskPayload(input: NewTaskInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim() || null,
    priority: priorityToApi(input.priority),
    category: input.category.trim() || null,
    due_time: isoFromLocalParts(input.dueDate, input.dueTime),
  };
}

export function buildTaskListPath({
  category,
  dueFrom,
  dueTo,
  keyword,
  page,
  pageSize,
  priority,
  sort,
  status,
}: {
  category: string;
  dueFrom?: string;
  dueTo?: string;
  keyword: string;
  page: number;
  pageSize: number;
  priority: TaskPriority | "全部";
  sort: string;
  status: TaskStatus | "全部";
}) {
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  const normalizedKeyword = keyword.trim();
  if (normalizedKeyword) {
    params.set("keyword", normalizedKeyword);
  }
  if (status !== "全部") {
    params.set("status", statusToApi(status));
  }
  if (priority !== "全部") {
    params.set("priority", priorityToApi(priority));
  }
  if (category !== "全部") {
    params.set("category", category);
  }
  if (dueFrom) {
    params.set("due_from", dueFrom);
  }
  if (dueTo) {
    params.set("due_to", dueTo);
  }

  if (sort === "priority") {
    params.set("sort_by", "priority");
    params.set("sort_order", "desc");
  } else if (sort === "createdAt") {
    params.set("sort_by", "created_at");
    params.set("sort_order", "desc");
  } else {
    params.set("sort_by", "due_time");
    params.set("sort_order", "asc");
  }

  return `/tasks?${params.toString()}`;
}
