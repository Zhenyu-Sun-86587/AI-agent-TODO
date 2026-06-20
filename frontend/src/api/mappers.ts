import type { ApiParsedTask, ApiPriority, ApiTask, ApiTaskStatus } from "./types";
import { buildTasksPagePath } from "./tasks";
import type { NewTaskInput, Task, TaskPriority, TaskStatus } from "../features/tasks/types";
import { dateFromToday, formatLocalDate } from "../lib/date";
import {
  priorityFromApiCode,
  priorityToApiCode,
  statusFromApiCode,
  statusToApiCode,
} from "../lib/taskPresentation";
import { pickGeneratedCategory, pickGeneratedDueTime } from "../features/tasks/utils/generation";

export function priorityFromApi(priority: ApiPriority): TaskPriority {
  return priorityFromApiCode(priority);
}

export function priorityToApi(priority: TaskPriority): ApiPriority {
  return priorityToApiCode(priority);
}

export function statusFromApi(status: ApiTaskStatus): TaskStatus {
  return statusFromApiCode(status);
}

export function statusToApi(status: TaskStatus): ApiTaskStatus {
  return statusToApiCode(status);
}

export function localPartsFromIso(value: string | null) {
  // 后端日期可能为空或被旧数据污染，解析失败时返回空字段让表单走默认值。
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

  // 没填具体时间时按当天结束处理，并显式带上本地时区偏移交给后端。
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
  // 页面 Task 模型包含展示文案、标签和 AI 辅助信息，这里把后端字段补齐为可直接渲染的数据。
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
  // AI 未返回分类或时间时使用本地生成规则兜底，保持创建表单字段完整。
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
  const normalizedKeyword = keyword.trim();
  // UI 的“全部”是本地筛选状态，发请求时省略对应参数表示不过滤。
  return buildTasksPagePath({
    category: category === "全部" ? undefined : category,
    dueFrom,
    dueTo,
    keyword: normalizedKeyword || undefined,
    page,
    pageSize,
    priority: priority === "全部" ? undefined : priorityToApi(priority),
    sortBy: sort === "priority" ? "priority" : sort === "createdAt" ? "created_at" : "due_time",
    sortOrder: sort === "dueDate" ? "asc" : "desc",
    status: status === "全部" ? undefined : statusToApi(status),
  });
}
