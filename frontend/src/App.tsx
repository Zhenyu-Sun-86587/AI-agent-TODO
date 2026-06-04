import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock3,
  FileText,
  Home,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Sun,
  Tags,
  Trash2,
  UserRound,
  X,
} from "lucide-react";

type PageKey =
  | "dashboard"
  | "all"
  | "ai"
  | "board"
  | "calendar"
  | "stats"
  | "tags"
  | "settings";
type TaskStatus = "待办" | "进行中" | "已完成";
type TaskPriority = "高" | "中" | "低";
type CalendarView = "7" | "14" | "30" | "24h" | "overdue";

interface DemoSession {
  name: string;
  email: string;
  token: string;
  isApiSession: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate: string;
  dueTime: string;
  createdAt: string;
  completedAt: string | null;
  tags: string[];
  aiReason: string;
  estimatedTime: string;
  aiCategory: string;
  isAiCreated: boolean;
  confidence?: number;
  rawDueText?: string;
  sourceText?: string;
}

interface NewTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  dueDate: string;
  dueTime: string;
  tags: string;
  aiReason?: string;
  estimatedTime?: string;
  aiCategory?: string;
  isAiCreated?: boolean;
  confidence?: number;
  rawDueText?: string;
  sourceText?: string;
}

interface SettingsState {
  openaiApiKey: string;
  modelName: string;
  maskedKey?: string;
  hasOpenaiApiKey?: boolean;
}

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  request_id?: string;
}

interface ApiPageResult<T> {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

type ApiPriority = "low" | "medium" | "high";
type ApiTaskStatus = "todo" | "done";

interface ApiUser {
  id: number;
  username: string;
  email: string;
}

interface ApiAuthResponse {
  user: ApiUser;
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ApiTask {
  id: number;
  title: string;
  description: string | null;
  priority: ApiPriority;
  category: string | null;
  due_time: string | null;
  status: ApiTaskStatus;
  is_ai_created: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiCategory {
  name: string;
  task_count: number;
}

interface ApiParsedTask {
  title: string;
  description: string | null;
  priority: ApiPriority;
  category: string | null;
  due_time: string | null;
  confidence: number | null;
  raw_due_text: string | null;
}

interface ApiAiParseResponse {
  parsed_task: ApiParsedTask;
  ai_status: "success" | "failed" | "mocked";
  model_name: string;
}

interface ApiAiCreateResponse extends ApiAiParseResponse {
  task: ApiTask;
}

interface ApiAiSuggestResponse {
  priority: ApiPriority;
  category: string | null;
  reason: string | null;
}

interface ApiStatsOverview {
  total_tasks: number;
  done_tasks: number;
  todo_tasks: number;
  completion_rate: number;
  overdue_tasks: number;
  today_due_tasks: number;
  ai_created_tasks: number;
}

interface ApiCategoryStats {
  category: string;
  total: number;
  done: number;
  todo: number;
  completion_rate: number;
}

interface ApiPriorityStats {
  priority: ApiPriority;
  total: number;
  done: number;
  todo: number;
}

interface ApiTrendStats {
  date: string;
  created: number;
  done: number;
}

interface ApiSettings {
  openai_api_key_masked: string | null;
  has_openai_api_key: boolean;
  model_name: string;
}

interface ApiOpenAIKeyTest {
  valid: boolean;
  model_name: string | null;
  latency_ms: number | null;
}

interface RemoteStatsState {
  overview: ApiStatsOverview | null;
  categories: ApiCategoryStats[];
  priorities: ApiPriorityStats[];
  trend: ApiTrendStats[];
}

interface TaskFieldSuggestion {
  priority: TaskPriority;
  category: string;
  reason: string;
}

class ApiError extends Error {
  status: number;
  code?: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const TASKS_STORAGE_KEY = "ai-agent-todo.tasks";
const SESSION_STORAGE_KEY = "ai-agent-todo.session";
const THEME_STORAGE_KEY = "ai-agent-todo.theme";
const SETTINGS_STORAGE_KEY = "ai-agent-todo.settings";
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromToday(offsetDays: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return formatLocalDate(date);
}

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key: string, value: unknown) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

const pagePaths: Record<PageKey, string> = {
  dashboard: "/",
  all: "/tasks",
  ai: "/ai",
  board: "/board",
  calendar: "/calendar",
  stats: "/stats",
  tags: "/tags",
  settings: "/settings",
};

function getPageFromPath(pathname: string): PageKey {
  const matchedPage = (Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0] || "dashboard") as PageKey;
  return matchedPage;
}

function pushAppPath(page: PageKey) {
  if (typeof window === "undefined") {
    return;
  }

  const targetPath = pagePaths[page];
  if (window.location.pathname !== targetPath) {
    window.history.pushState(null, "", targetPath);
  }
}

function formatDue(task: Pick<Task, "dueDate" | "dueTime">) {
  if (!task.dueDate) {
    return "未设置";
  }

  return task.dueTime ? `${task.dueDate} ${task.dueTime}` : task.dueDate;
}

function toggleTaskActionLabel(status: TaskStatus) {
  return status === "已完成" ? "恢复待办" : "标记完成";
}

function parseHour(time: string) {
  const hour = Number(time.split(":")[0]);
  return Number.isFinite(hour) ? hour : null;
}

function priorityFromApi(priority: ApiPriority): TaskPriority {
  return priority === "high" ? "高" : priority === "low" ? "低" : "中";
}

function priorityToApi(priority: TaskPriority): ApiPriority {
  return priority === "高" ? "high" : priority === "低" ? "low" : "medium";
}

function statusFromApi(status: ApiTaskStatus): TaskStatus {
  return status === "done" ? "已完成" : "待办";
}

function statusToApi(status: TaskStatus): ApiTaskStatus {
  return status === "已完成" ? "done" : "todo";
}

function localPartsFromIso(value: string | null) {
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

function isoFromLocalParts(date: string, time: string) {
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

function dateFromIso(value: string | null) {
  return localPartsFromIso(value).date || dateFromToday(0);
}

function mapApiTask(task: ApiTask, parsedTask?: ApiParsedTask): Task {
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

function mapParsedTaskToInput(parsedTask: ApiParsedTask, sourceText: string): NewTaskInput {
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

function inputToApiTaskPayload(input: NewTaskInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim() || null,
    priority: priorityToApi(input.priority),
    category: input.category.trim() || null,
    due_time: isoFromLocalParts(input.dueDate, input.dueTime),
  };
}

function buildTaskListPath({
  category,
  keyword,
  page,
  pageSize,
  priority,
  sort,
  status,
}: {
  category: string;
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

async function apiRequest<T>(path: string, options: RequestInit & { token?: string } = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload || payload.code !== 0) {
    throw new ApiError(payload?.message || `请求失败：${response.status}`, response.status, payload?.code);
  }

  return payload.data;
}

function asErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "请求失败，请稍后再试。";
}

const initialTasks: Task[] = [
  {
    id: 1,
    title: "完成前端首页布局",
    description: "设计并实现 AI TODO 系统的 Dashboard 首页。",
    status: "进行中",
    priority: "高",
    category: "前端开发",
    dueDate: dateFromToday(2),
    dueTime: "15:00",
    createdAt: dateFromToday(-2),
    completedAt: null,
    tags: ["React", "UI设计"],
    aiReason: "该任务是后续功能开发的基础，建议优先完成。",
    estimatedTime: "2小时",
    aiCategory: "核心开发",
    isAiCreated: false,
  },
  {
    id: 2,
    title: "整理接口文档",
    description: "根据后端接口整理前端调用说明。",
    status: "待办",
    priority: "中",
    category: "文档",
    dueDate: dateFromToday(3),
    dueTime: "10:00",
    createdAt: dateFromToday(-2),
    completedAt: null,
    tags: ["API", "协作"],
    aiReason: "接口文档会影响前后端联调效率。",
    estimatedTime: "1小时",
    aiCategory: "协作文档",
    isAiCreated: false,
  },
  {
    id: 3,
    title: "测试任务分类功能",
    description: "验证 AI 自动分类和手动标签编辑是否一致。",
    status: "待办",
    priority: "高",
    category: "测试",
    dueDate: dateFromToday(1),
    dueTime: "16:00",
    createdAt: dateFromToday(-1),
    completedAt: null,
    tags: ["AI", "测试"],
    aiReason: "截止时间最近，并且会阻塞演示验收。",
    estimatedTime: "1.5小时",
    aiCategory: "质量保障",
    isAiCreated: true,
    confidence: 0.86,
    rawDueText: "明天下午",
  },
  {
    id: 4,
    title: "设计任务详情抽屉",
    description: "展示任务字段、子任务和 AI 分析结果。",
    status: "进行中",
    priority: "中",
    category: "前端开发",
    dueDate: dateFromToday(4),
    dueTime: "14:00",
    createdAt: dateFromToday(-1),
    completedAt: null,
    tags: ["Drawer", "交互"],
    aiReason: "详情抽屉能提升任务编辑效率。",
    estimatedTime: "2小时",
    aiCategory: "体验优化",
    isAiCreated: false,
  },
  {
    id: 5,
    title: "修复统计页空数据状态",
    description: "没有任务时图表区域需要显示合理的空态。",
    status: "待办",
    priority: "中",
    category: "数据统计",
    dueDate: dateFromToday(5),
    dueTime: "11:00",
    createdAt: dateFromToday(-1),
    completedAt: null,
    tags: ["统计", "空态"],
    aiReason: "统计页会用于展示项目完整性。",
    estimatedTime: "1小时",
    aiCategory: "数据体验",
    isAiCreated: false,
  },
  {
    id: 6,
    title: "准备课程项目演示脚本",
    description: "梳理从登录、任务创建、AI 推荐到统计分析的演示路线。",
    status: "待办",
    priority: "高",
    category: "演示",
    dueDate: dateFromToday(2),
    dueTime: "18:00",
    createdAt: dateFromToday(0),
    completedAt: null,
    tags: ["答辩", "演示"],
    aiReason: "演示脚本直接影响答辩表达质量。",
    estimatedTime: "1.5小时",
    aiCategory: "项目交付",
    isAiCreated: true,
    confidence: 0.91,
    rawDueText: "这周",
  },
  {
    id: 7,
    title: "接入 BYOK 设置页",
    description: "实现 OpenAI API Key 保存、测试和脱敏展示。",
    status: "待办",
    priority: "中",
    category: "后端联调",
    dueDate: dateFromToday(6),
    dueTime: "17:00",
    createdAt: dateFromToday(0),
    completedAt: null,
    tags: ["BYOK", "设置"],
    aiReason: "AI 能力依赖 BYOK 配置，建议在核心 UI 后联调。",
    estimatedTime: "2小时",
    aiCategory: "AI 能力",
    isAiCreated: false,
  },
  {
    id: 8,
    title: "完成移动端 Web 适配",
    description: "Sidebar 改为底部导航，任务卡片纵向排列。",
    status: "待办",
    priority: "低",
    category: "响应式",
    dueDate: dateFromToday(7),
    dueTime: "13:00",
    createdAt: dateFromToday(0),
    completedAt: null,
    tags: ["移动端", "WebView"],
    aiReason: "App 套壳前需要保证移动 Web 可用。",
    estimatedTime: "3小时",
    aiCategory: "跨端体验",
    isAiCreated: false,
  },
  {
    id: 9,
    title: "补充任务表格分页逻辑",
    description: "支持搜索、筛选、排序和分页联动。",
    status: "已完成",
    priority: "中",
    category: "前端开发",
    dueDate: dateFromToday(0),
    dueTime: "09:00",
    createdAt: dateFromToday(-2),
    completedAt: dateFromToday(0),
    tags: ["表格", "筛选"],
    aiReason: "任务表格是全部任务页的主要交互。",
    estimatedTime: "1小时",
    aiCategory: "核心开发",
    isAiCreated: false,
  },
  {
    id: 10,
    title: "整理后续灵感池",
    description: "记录暂时没有明确截止时间的产品想法和优化点。",
    status: "待办",
    priority: "低",
    category: "标签管理",
    dueDate: "",
    dueTime: "",
    createdAt: dateFromToday(0),
    completedAt: null,
    tags: ["灵感", "待排期"],
    aiReason: "没有明确截止时间，适合作为低压任务池持续维护。",
    estimatedTime: "30分钟",
    aiCategory: "任务整理",
    isAiCreated: false,
  },
];

const navItems: Array<{ key: PageKey; label: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "all", label: "全部任务", icon: ListTodo },
  { key: "ai", label: "AI 推荐", icon: Sparkles },
  { key: "board", label: "任务看板", icon: LayoutDashboard },
  { key: "calendar", label: "日历", icon: CalendarDays },
  { key: "stats", label: "数据统计", icon: BarChart3 },
  { key: "tags", label: "标签管理", icon: Tags },
  { key: "settings", label: "设置", icon: Settings },
];

const statusOptions: TaskStatus[] = ["待办", "进行中", "已完成"];
const apiStatusOptions: TaskStatus[] = ["待办", "已完成"];
const priorityOptions: TaskPriority[] = ["高", "中", "低"];

function isToday(date: string) {
  return Boolean(date) && date === dateFromToday(0);
}

function isOverdue(task: Task) {
  return task.status !== "已完成" && Boolean(task.dueDate) && task.dueDate < dateFromToday(0);
}

function createEmptyTask(): NewTaskInput {
  return {
    title: "",
    description: "",
    status: "待办",
    priority: "中",
    category: "前端开发",
    dueDate: dateFromToday(3),
    dueTime: "15:00",
    tags: "React, UI设计",
  };
}

function addDays(baseDate: string, days: number) {
  const [year, month, day] = baseDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

function pickGeneratedPriority(text: string): TaskPriority {
  if (includesAny(text, ["紧急", "截止", "今天", "明天", "演示", "答辩", "测试", "阻塞", "发布", "上线"])) {
    return "高";
  }
  if (includesAny(text, ["整理", "优化", "联调", "文档", "接口", "复盘"])) {
    return "中";
  }
  return "低";
}

function pickGeneratedCategory(text: string) {
  if (includesAny(text, ["接口", "api", "联调", "后端"])) {
    return "后端联调";
  }
  if (includesAny(text, ["文档", "说明", "报告", "脚本"])) {
    return "文档";
  }
  if (includesAny(text, ["测试", "验收", "bug", "修复"])) {
    return "测试";
  }
  if (includesAny(text, ["统计", "数据", "图表", "趋势"])) {
    return "数据统计";
  }
  if (includesAny(text, ["移动端", "app", "webview", "响应式"])) {
    return "响应式";
  }
  if (includesAny(text, ["页面", "ui", "react", "前端", "表格", "看板", "首页"])) {
    return "前端开发";
  }
  if (includesAny(text, ["演示", "答辩", "汇报"])) {
    return "演示";
  }
  return "前端开发";
}

function createGeneratedTitle(prompt: string, category: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  const firstSentence = normalized.split(/[。；;,.，\n]/)[0]?.trim();
  if (firstSentence && firstSentence.length <= 22) {
    return firstSentence;
  }
  const prefixMap: Record<string, string> = {
    前端开发: "完成前端任务规划",
    后端联调: "整理接口联调任务",
    文档: "整理项目文档任务",
    测试: "验证任务测试流程",
    数据统计: "完善数据统计模块",
    响应式: "完成移动端适配任务",
    演示: "准备项目演示任务",
  };
  return prefixMap[category] || "完成 AI 生成任务";
}

function pickGeneratedDueTime(text: string) {
  if (includesAny(text, ["上午", "早上", "早晨"])) {
    return "10:00";
  }
  if (includesAny(text, ["晚上", "夜间"])) {
    return "20:00";
  }
  if (includesAny(text, ["中午"])) {
    return "12:00";
  }
  if (includesAny(text, ["下午", "午后"])) {
    return "15:00";
  }
  return "14:00";
}

function generateTaskFromPrompt(prompt: string): NewTaskInput {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  const text = normalized.toLowerCase();
  const priority = pickGeneratedPriority(text);
  const category = pickGeneratedCategory(text);
  const dueOffset = priority === "高" ? 1 : priority === "中" ? 2 : 4;
  const title = createGeneratedTitle(normalized, category);
  const baseTags = [category, "AI生成"];
  if (includesAny(text, ["react", "ui", "表格", "看板"])) {
    baseTags.push("React");
  }
  if (includesAny(text, ["接口", "api", "联调"])) {
    baseTags.push("API");
  }
  if (includesAny(text, ["演示", "答辩"])) {
    baseTags.push("演示");
  }

  return {
    title,
    description: normalized || "由 AI 根据输入内容生成的待办任务。",
    status: "待办",
    priority,
    category,
    dueDate: addDays(dateFromToday(0), dueOffset),
    dueTime: pickGeneratedDueTime(text),
    tags: Array.from(new Set(baseTags)).join(", "),
    aiReason:
      priority === "高"
        ? "输入内容包含紧急、截止、演示或测试信号，AI 建议优先处理。"
        : "AI 已根据任务类型和执行复杂度生成默认计划，可在创建前继续编辑。",
    estimatedTime: priority === "高" ? "2小时" : priority === "中" ? "1.5小时" : "1小时",
    aiCategory: category,
    isAiCreated: true,
    confidence: priority === "高" ? 0.9 : 0.78,
    rawDueText: priority === "高" ? "近期优先" : "默认规划",
    sourceText: normalized,
  };
}

function taskToInput(task: Task): NewTaskInput {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category: task.category,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    tags: task.tags.join(", "),
    aiReason: task.aiReason,
    estimatedTime: task.estimatedTime,
    aiCategory: task.aiCategory,
    isAiCreated: task.isAiCreated,
    confidence: task.confidence,
    rawDueText: task.rawDueText,
    sourceText: `${task.title}\n${task.description}`.trim(),
  };
}

function mergeTaskInput(task: Task, input: NewTaskInput): Task {
  return {
    ...task,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    category: input.category,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    completedAt: input.status === "已完成" ? task.completedAt || dateFromToday(0) : null,
    tags: input.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    aiReason: input.aiReason || task.aiReason,
    estimatedTime: input.estimatedTime || (input.priority === "高" ? "2小时" : "1小时"),
    aiCategory: input.aiCategory || input.category,
    isAiCreated: input.isAiCreated ?? task.isAiCreated,
    confidence: input.confidence ?? task.confidence,
    rawDueText: input.rawDueText ?? task.rawDueText,
    sourceText: input.sourceText || `${input.title}\n${input.description}`.trim(),
  };
}

const defaultSettings: SettingsState = {
  openaiApiKey: "",
  modelName: "gpt-4.1-mini",
};

const emptyRemoteStats: RemoteStatsState = {
  overview: null,
  categories: [],
  priorities: [],
  trend: [],
};

export function App() {
  const [session, setSession] = useState<DemoSession | null>(() => readStoredJson<DemoSession | null>(SESSION_STORAGE_KEY, null));
  const [tasks, setTasks] = useState<Task[]>(() => readStoredJson<Task[]>(TASKS_STORAGE_KEY, initialTasks));
  const [settings, setSettings] = useState<SettingsState>(() => readStoredJson<SettingsState>(SETTINGS_STORAGE_KEY, defaultSettings));
  const [remoteStats, setRemoteStats] = useState<RemoteStatsState>(emptyRemoteStats);
  const [remoteCategories, setRemoteCategories] = useState<string[]>([]);
  const [taskVersion, setTaskVersion] = useState(0);
  const [apiState, setApiState] = useState<"local" | "loading" | "online" | "offline">("local");
  const [apiMessage, setApiMessage] = useState("");
  const [activePage, setActivePage] = useState<PageKey>(() => getPageFromPath(window.location.pathname));
  const [authMode, setAuthMode] = useState<"login" | "register">(() =>
    window.location.pathname === "/register" ? "register" : "login",
  );
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => readStoredJson<boolean>(THEME_STORAGE_KEY, false));
  const [globalSearch, setGlobalSearch] = useState("");
  const activeToken = session?.isApiSession ? session.token : "";

  useEffect(() => {
    if (!session?.isApiSession) {
      writeStoredJson(TASKS_STORAGE_KEY, tasks);
    }
  }, [session?.isApiSession, tasks]);

  useEffect(() => {
    writeStoredJson(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  useEffect(() => {
    writeStoredJson(THEME_STORAGE_KEY, isDark);
  }, [isDark]);

  useEffect(() => {
    if (session) {
      writeStoredJson(SESSION_STORAGE_KEY, session);
    }
  }, [session]);

  const handleApiError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      logout();
      return "登录已过期，请重新登录。";
    }

    const message = asErrorMessage(error);
    setApiState("offline");
    setApiMessage(message);
    return message;
  };

  const loadRemoteWorkspace = async (token = activeToken) => {
    if (!token) {
      return;
    }

    setApiState("loading");
    setApiMessage("正在同步后端数据...");
    try {
      const [me, taskPage, categoryList, remoteSettings, overview, categoryStats, priorityStats, trendStats] = await Promise.all([
        apiRequest<ApiUser>("/users/me", { token }),
        apiRequest<ApiPageResult<ApiTask>>("/tasks?page=1&page_size=100&sort_by=created_at&sort_order=desc", { token }),
        apiRequest<ApiCategory[]>("/tasks/categories", { token }),
        apiRequest<ApiSettings>("/settings", { token }),
        apiRequest<ApiStatsOverview>("/stats/overview", { token }),
        apiRequest<ApiCategoryStats[]>("/stats/category", { token }),
        apiRequest<ApiPriorityStats[]>("/stats/priority", { token }),
        apiRequest<ApiTrendStats[]>("/stats/trend?days=30", { token }),
      ]);

      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              name: me.username,
              email: me.email,
            }
          : currentSession,
      );
      setTasks(taskPage.items.map((task) => mapApiTask(task)));
      setRemoteCategories(categoryList.map((item) => item.name).filter(Boolean));
      setSettings({
        openaiApiKey: "",
        modelName: remoteSettings.model_name,
        maskedKey: remoteSettings.openai_api_key_masked || undefined,
        hasOpenaiApiKey: remoteSettings.has_openai_api_key,
      });
      setRemoteStats({
        overview,
        categories: categoryStats,
        priorities: priorityStats,
        trend: trendStats,
      });
      setTaskVersion((value) => value + 1);
      setApiState("online");
      setApiMessage("已连接后端 API");
    } catch (error) {
      handleApiError(error);
    }
  };

  useEffect(() => {
    if (session?.isApiSession) {
      void loadRemoteWorkspace(session.token);
    } else {
      setApiState("local");
      setApiMessage("本地演示模式");
      setRemoteStats(emptyRemoteStats);
      setRemoteCategories([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.isApiSession, session?.token]);

  useEffect(() => {
    const syncPageFromPath = () => {
      const pathname = window.location.pathname;
      if (pathname === "/login" || pathname === "/register") {
        setAuthMode(pathname === "/register" ? "register" : "login");
        return;
      }
      setActivePage(getPageFromPath(pathname));
    };

    window.addEventListener("popstate", syncPageFromPath);
    return () => window.removeEventListener("popstate", syncPageFromPath);
  }, []);

  const navigateTo = (pageKey: PageKey) => {
    setActivePage(pageKey);
    pushAppPath(pageKey);
  };

  const authenticate = (nextSession: DemoSession) => {
    setSession(nextSession);
    writeStoredJson(SESSION_STORAGE_KEY, nextSession);
    navigateTo("dashboard");
  };

  const loginWithApi = async (account: string, password: string) => {
    setApiState("loading");
    setApiMessage("正在登录后端...");
    try {
      const data = await apiRequest<ApiAuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ account, password }),
      });
      authenticate({
        name: data.user.username,
        email: data.user.email,
        token: data.access_token,
        isApiSession: true,
      });
    } catch (error) {
      setApiState("offline");
      setApiMessage(asErrorMessage(error));
      throw error;
    }
  };

  const registerWithApi = async (username: string, email: string, password: string) => {
    setApiState("loading");
    setApiMessage("正在注册后端账号...");
    try {
      const data = await apiRequest<ApiAuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ username, email, password }),
      });
      authenticate({
        name: data.user.username,
        email: data.user.email,
        token: data.access_token,
        isApiSession: true,
      });
    } catch (error) {
      setApiState("offline");
      setApiMessage(asErrorMessage(error));
      throw error;
    }
  };

  const useDemoSession = () => {
    authenticate({
      name: "Demo User",
      email: "demo@aitodo.local",
      token: `mock-token-${Date.now()}`,
      isApiSession: false,
    });
  };

  const logout = () => {
    setSession(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.history.pushState(null, "", "/login");
    setAuthMode("login");
    setSelectedTask(null);
    setEditingTask(null);
  };

  const categories = useMemo(() => Array.from(new Set(tasks.map((task) => task.category))).sort(), [tasks]);
  const visibleCategories = activeToken ? remoteCategories : categories;
  const recommendedTasks = useMemo(
    () =>
      [...tasks]
        .filter((task) => task.status !== "已完成")
        .sort((left, right) => {
          const priorityScore: Record<TaskPriority, number> = { 高: 3, 中: 2, 低: 1 };
          return (
            priorityScore[right.priority] - priorityScore[left.priority] ||
            (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31")
          );
        })
        .slice(0, 3),
    [tasks],
  );

  const toggleComplete = async (taskId: number) => {
    if (activeToken) {
      const task = tasks.find((item) => item.id === taskId);
      if (!task) {
        return;
      }

      try {
        setApiState("loading");
        setApiMessage("正在更新任务状态...");
        await apiRequest(`/tasks/${taskId}/status`, {
          method: "PATCH",
          token: activeToken,
          body: JSON.stringify({ status: task.status === "已完成" ? "todo" : "done" }),
        });
        await loadRemoteWorkspace(activeToken);
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    const toggleTaskStatus = (task: Task): Task => {
      const nextStatus = task.status === "已完成" ? "待办" : "已完成";
      return {
        ...task,
        status: nextStatus,
        completedAt: nextStatus === "已完成" ? dateFromToday(0) : null,
      };
    };

    setTasks((currentTasks) =>
      currentTasks.map((task) => (task.id === taskId ? toggleTaskStatus(task) : task)),
    );
    setSelectedTask((currentTask) => (currentTask?.id === taskId ? toggleTaskStatus(currentTask) : currentTask));
  };

  const deleteTask = async (taskId: number) => {
    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage("正在删除任务...");
        await apiRequest(`/tasks/${taskId}`, {
          method: "DELETE",
          token: activeToken,
        });
        setSelectedTask(null);
        setEditingTask(null);
        await loadRemoteWorkspace(activeToken);
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
    if (selectedTask?.id === taskId) {
      setSelectedTask(null);
    }
    if (editingTask?.id === taskId) {
      setEditingTask(null);
    }
  };

  const createLocalTask = (input: NewTaskInput) => {
    const task: Task = {
      id: Math.max(0, ...tasks.map((item) => item.id)) + 1,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      category: input.category,
      dueDate: input.dueDate,
      dueTime: input.dueTime,
      createdAt: dateFromToday(0),
      completedAt: input.status === "已完成" ? dateFromToday(0) : null,
      tags: Array.from(
        new Set(
          input.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .concat(input.isAiCreated ? ["AI生成"] : []),
        ),
      ),
      aiReason: input.aiReason || "AI 将根据截止时间、优先级和任务上下文持续更新建议。",
      estimatedTime: input.estimatedTime || (input.priority === "高" ? "2小时" : "1小时"),
      aiCategory: input.aiCategory || input.category,
      isAiCreated: Boolean(input.isAiCreated),
      confidence: input.confidence,
      rawDueText: input.rawDueText,
      sourceText: input.sourceText,
    };
    setTasks((currentTasks) => [task, ...currentTasks]);
    setCreateOpen(false);
  };

  const createTask = async (input: NewTaskInput) => {
    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage(input.isAiCreated ? "正在通过 AI 创建任务..." : "正在创建任务...");
        if (input.isAiCreated) {
          const data = await apiRequest<ApiAiCreateResponse>("/ai/create-task", {
            method: "POST",
            token: activeToken,
            body: JSON.stringify({
              text: input.sourceText || `${input.title}\n${input.description}`.trim(),
              timezone: "Asia/Shanghai",
              overrides: inputToApiTaskPayload(input),
            }),
          });
          setTasks((currentTasks) => [mapApiTask(data.task, data.parsed_task), ...currentTasks]);
        } else {
          const task = await apiRequest<ApiTask>("/tasks", {
            method: "POST",
            token: activeToken,
            body: JSON.stringify(inputToApiTaskPayload(input)),
          });
          setTasks((currentTasks) => [mapApiTask(task), ...currentTasks]);
        }
        setCreateOpen(false);
        await loadRemoteWorkspace(activeToken);
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    createLocalTask(input);
  };

  const updateTask = async (taskId: number, input: NewTaskInput) => {
    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage("正在保存任务...");
        const task = await apiRequest<ApiTask>(`/tasks/${taskId}`, {
          method: "PUT",
          token: activeToken,
          body: JSON.stringify({
            ...inputToApiTaskPayload(input),
            status: statusToApi(input.status),
          }),
        });
        const updatedTask = mapApiTask(task);
        setTasks((currentTasks) => currentTasks.map((currentTask) => (currentTask.id === taskId ? updatedTask : currentTask)));
        setSelectedTask((currentTask) => (currentTask?.id === taskId ? updatedTask : currentTask));
        setEditingTask(null);
        await loadRemoteWorkspace(activeToken);
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    let updatedTask: Task | null = null;
    setTasks((currentTasks) =>
      currentTasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }
        updatedTask = mergeTaskInput(task, input);
        return updatedTask;
      }),
    );
    if (updatedTask) {
      setSelectedTask((currentTask) => (currentTask?.id === taskId ? updatedTask : currentTask));
      setEditingTask(null);
    }
  };

  const parseTaskWithAi = async (prompt: string) => {
    if (!activeToken) {
      return generateTaskFromPrompt(prompt);
    }

    try {
      setApiState("loading");
      setApiMessage("正在调用 /ai/parse-task...");
      const data = await apiRequest<ApiAiParseResponse>("/ai/parse-task", {
        method: "POST",
        token: activeToken,
        body: JSON.stringify({ text: prompt, timezone: "Asia/Shanghai" }),
      });
      setApiState("online");
      setApiMessage(`AI 解析完成：${data.ai_status}`);
      return mapParsedTaskToInput(data.parsed_task, prompt);
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const suggestTaskFields = async (title: string, description: string): Promise<TaskFieldSuggestion> => {
    if (!activeToken) {
      const suggestion = generateTaskFromPrompt(`${title}\n${description}`);
      return {
        priority: suggestion.priority,
        category: suggestion.category,
        reason: suggestion.aiReason || "本地规则已根据关键词推荐分类与优先级。",
      };
    }

    try {
      setApiState("loading");
      setApiMessage("正在调用 /ai/suggest...");
      const data = await apiRequest<ApiAiSuggestResponse>("/ai/suggest", {
        method: "POST",
        token: activeToken,
        body: JSON.stringify({ title, description }),
      });
      setApiState("online");
      setApiMessage("AI 字段建议已返回");
      return {
        priority: priorityFromApi(data.priority),
        category: data.category || "未分类",
        reason: data.reason || "后端 AI 已返回推荐结果。",
      };
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  };

  const saveSettings = async (nextSettings: SettingsState) => {
    if (!activeToken) {
      setSettings(nextSettings);
      return "已保存到本地演示设置。";
    }

    try {
      setApiState("loading");
      setApiMessage("正在保存 /settings...");
      const data = await apiRequest<ApiSettings>("/settings", {
        method: "PUT",
        token: activeToken,
        body: JSON.stringify({
          openai_api_key: nextSettings.openaiApiKey || undefined,
          model_name: nextSettings.modelName,
        }),
      });
      setSettings({
        openaiApiKey: "",
        modelName: data.model_name,
        maskedKey: data.openai_api_key_masked || undefined,
        hasOpenaiApiKey: data.has_openai_api_key,
      });
      setApiState("online");
      setApiMessage("设置已同步后端");
      return "设置已保存到后端。";
    } catch (error) {
      return handleApiError(error);
    }
  };

  const testOpenAIKey = async (nextSettings: SettingsState) => {
    if (!activeToken) {
      return nextSettings.openaiApiKey.trim().length >= 8 || !nextSettings.openaiApiKey.trim()
        ? "本地演示测试通过；真实校验需要后端登录。"
        : "Key 长度过短，请检查输入。";
    }

    try {
      setApiState("loading");
      setApiMessage("正在调用 /settings/test-openai-key...");
      const data = await apiRequest<ApiOpenAIKeyTest>("/settings/test-openai-key", {
        method: "POST",
        token: activeToken,
        body: JSON.stringify({
          openai_api_key: nextSettings.openaiApiKey || undefined,
          model_name: nextSettings.modelName,
        }),
      });
      setApiState("online");
      setApiMessage(data.valid ? "OpenAI Key 测试通过" : "OpenAI Key 测试失败");
      return data.valid
        ? `测试通过${data.latency_ms ? `，耗时 ${data.latency_ms}ms` : ""}。`
        : "测试失败，请检查 Key 或模型权限。";
    } catch (error) {
      return handleApiError(error);
    }
  };

  const page = (
    <PageRenderer
      activePage={activePage}
      categories={visibleCategories}
      globalSearch={globalSearch}
      isApiMode={Boolean(activeToken)}
      onDelete={deleteTask}
      onCreateTask={() => setCreateOpen(true)}
      onEditTask={setEditingTask}
      onApiError={handleApiError}
      onOpenTask={setSelectedTask}
      onPageChange={navigateTo}
      onSaveSettings={saveSettings}
      onSuggestTaskFields={suggestTaskFields}
      onTestOpenAIKey={testOpenAIKey}
      onToggleComplete={toggleComplete}
      recommendedTasks={recommendedTasks}
      remoteStats={remoteStats}
      settings={settings}
      taskVersion={taskVersion}
      token={activeToken}
      tasks={tasks}
    />
  );

  if (!session) {
    return (
      <AuthPage
        apiMessage={apiMessage}
        mode={authMode}
        onDemo={useDemoSession}
        onLogin={loginWithApi}
        onModeChange={(mode) => {
          setAuthMode(mode);
          window.history.pushState(null, "", mode === "register" ? "/register" : "/login");
        }}
        onRegister={registerWithApi}
      />
    );
  }

  return (
    <div className={`app-dashboard ${isDark ? "theme-dark" : ""}`}>
      <Sidebar
        activePage={activePage}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={(pageKey) => {
          navigateTo(pageKey);
          setSidebarOpen(false);
        }}
      />
      <div className="app-workspace">
        <Header
          apiMessage={apiMessage}
          apiState={apiState}
          globalSearch={globalSearch}
          isDark={isDark}
          session={session}
          onCreateTask={() => setCreateOpen(true)}
          onLogout={logout}
          onMenu={() => setSidebarOpen(true)}
          onSearchChange={setGlobalSearch}
          onToggleTheme={() => setIsDark((value) => !value)}
        />
        {page}
      </div>
      <MobileBottomNav activePage={activePage} onCreateTask={() => setCreateOpen(true)} onNavigate={navigateTo} />
      <TaskDetailDrawer
        onClose={() => setSelectedTask(null)}
        onDelete={deleteTask}
        onToggleComplete={toggleComplete}
        task={selectedTask}
      />
      {isCreateOpen && (
        <CreateTaskModal
          categories={visibleCategories}
          isApiMode={Boolean(activeToken)}
          onClose={() => setCreateOpen(false)}
          onCreate={createTask}
          onParseTask={parseTaskWithAi}
        />
      )}
      {editingTask && (
        <EditTaskModal
          categories={visibleCategories}
          isApiMode={Boolean(activeToken)}
          onClose={() => setEditingTask(null)}
          onUpdate={(input) => updateTask(editingTask.id, input)}
          task={editingTask}
        />
      )}
    </div>
  );
}

interface SidebarProps {
  activePage: PageKey;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageKey) => void;
}

function Sidebar({ activePage, isOpen, onClose, onNavigate }: SidebarProps) {
  return (
    <>
      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <span className="brand-mark">
            <Bot size={22} />
          </span>
          <div>
            <strong>AI TODO</strong>
            <small>Agent Workspace</small>
          </div>
        </div>
        <nav className="sidebar-nav" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={activePage === item.key ? "active" : ""}
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="sidebar-ai-card">
          <Sparkles size={18} />
          <strong>AI 规划助手</strong>
          <p>自动识别高风险任务，并给出今日执行顺序。</p>
        </div>
      </aside>
      {isOpen && <button className="mobile-overlay" type="button" onClick={onClose} aria-label="关闭菜单" />}
    </>
  );
}

interface HeaderProps {
  apiMessage: string;
  apiState: "local" | "loading" | "online" | "offline";
  globalSearch: string;
  isDark: boolean;
  session: DemoSession;
  onCreateTask: () => void;
  onLogout: () => void;
  onMenu: () => void;
  onSearchChange: (value: string) => void;
  onToggleTheme: () => void;
}

function Header({
  apiMessage,
  apiState,
  globalSearch,
  isDark,
  session,
  onCreateTask,
  onLogout,
  onMenu,
  onSearchChange,
  onToggleTheme,
}: HeaderProps) {
  return (
    <header className="top-header">
      <button className="icon-button mobile-menu" type="button" onClick={onMenu} aria-label="打开菜单">
        <Menu size={20} />
      </button>
      <label className="header-search">
        <Search size={18} />
        <input
          value={globalSearch}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索任务、标签或项目..."
        />
      </label>
      <div className="header-actions">
        <button className="primary-button" type="button" onClick={onCreateTask}>
          <Plus size={17} />
          新建任务
        </button>
        <button className="icon-button" type="button" aria-label="通知">
          <Bell size={18} />
        </button>
        <button className="icon-button" type="button" onClick={onToggleTheme} aria-label="切换主题">
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <span className={`api-status ${apiState}`} title={apiMessage || API_BASE_URL}>
          {apiState === "online" ? "API" : apiState === "loading" ? "同步中" : apiState === "offline" ? "离线" : "本地"}
        </span>
        <div className="user-pill">
          <span className="user-avatar">
            <UserRound size={18} />
          </span>
          <strong>{session.name}</strong>
        </div>
        <button className="icon-button" type="button" onClick={onLogout} aria-label="退出登录">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}

interface AuthPageProps {
  apiMessage: string;
  mode: "login" | "register";
  onDemo: () => void;
  onLogin: (account: string, password: string) => Promise<void>;
  onModeChange: (mode: "login" | "register") => void;
  onRegister: (username: string, email: string, password: string) => Promise<void>;
}

function isBackendCompatibleEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1] || "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return false;
  }
  return !domain.endsWith(".local") && !["example.com", "example.net", "example.org", "localhost"].includes(domain);
}

function AuthPage({ apiMessage, mode, onDemo, onLogin, onModeChange, onRegister }: AuthPageProps) {
  const [name, setName] = useState("Hikari");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("aitodo1234");
  const [confirmPassword, setConfirmPassword] = useState("aitodo1234");
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim();

    if (!isBackendCompatibleEmail(normalizedEmail)) {
      setError("请输入有效邮箱，不能使用 .local 或 example.com 等保留域名。");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 位。");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("注册时需要填写用户名。");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    try {
      setSubmitting(true);
      if (mode === "register") {
        await onRegister(name.trim(), normalizedEmail, password);
      } else {
        await onLogin(normalizedEmail, password);
      }
    } catch (requestError) {
      setError(asErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <span className="brand-mark">
          <Bot size={24} />
        </span>
        <p className="eyebrow">AI TODO</p>
        <h1>把一段想法变成可执行的任务系统</h1>
        <p>默认连接 {API_BASE_URL}。如果后端未启动，可以使用演示账号进入本地模式。</p>
        <div className="auth-feature-list">
          <span>AI 生成 TODO</span>
          <span>任务表格筛选</span>
          <span>日历和统计</span>
        </div>
      </section>
      <section className="auth-card">
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => onModeChange("login")}>
            登录
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => onModeChange("register")}>
            注册
          </button>
        </div>
        <div className="auth-title">
          <p className="eyebrow">{mode === "login" ? "Welcome Back" : "Create Account"}</p>
          <h2>{mode === "login" ? "登录 AI TODO" : "注册 AI TODO"}</h2>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              用户名
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入用户名" />
            </label>
          )}
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@qq.com" />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 位"
            />
          </label>
          {mode === "register" && (
            <label>
              确认密码
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再次输入密码"
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {!error && apiMessage && <p className="api-message">{apiMessage}</p>}
          <button className="primary-button full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "请求中..." : mode === "login" ? "登录后端" : "注册并进入"}
          </button>
          <button className="ghost-button full" type="button" onClick={onDemo}>
            使用演示账号（本地）
          </button>
        </form>
      </section>
    </main>
  );
}

interface PageRendererProps {
  activePage: PageKey;
  categories: string[];
  globalSearch: string;
  isApiMode: boolean;
  onCreateTask: () => void;
  onApiError: (error: unknown) => string;
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onPageChange: (page: PageKey) => void;
  onSaveSettings: (settings: SettingsState) => Promise<string | void>;
  onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion>;
  onTestOpenAIKey: (settings: SettingsState) => Promise<string>;
  onToggleComplete: (taskId: number) => void;
  recommendedTasks: Task[];
  remoteStats: RemoteStatsState;
  settings: SettingsState;
  taskVersion: number;
  token: string;
  tasks: Task[];
}

function PageRenderer({
  activePage,
  categories,
  globalSearch,
  isApiMode,
  onApiError,
  onCreateTask,
  onDelete,
  onEditTask,
  onOpenTask,
  onPageChange,
  onSaveSettings,
  onSuggestTaskFields,
  onTestOpenAIKey,
  onToggleComplete,
  recommendedTasks,
  remoteStats,
  settings,
  taskVersion,
  token,
  tasks,
}: PageRendererProps) {
  if (activePage === "dashboard") {
    return (
      <DashboardPage
        onOpenTask={onOpenTask}
        onPageChange={onPageChange}
        onToggleComplete={onToggleComplete}
        recommendedTasks={recommendedTasks}
        tasks={tasks}
      />
    );
  }

  if (activePage === "all") {
    return (
      <AllTasksPage
        categories={categories}
        globalSearch={globalSearch}
        isApiMode={isApiMode}
        onApiError={onApiError}
        onDelete={onDelete}
        onEditTask={onEditTask}
        onOpenTask={onOpenTask}
        onToggleComplete={onToggleComplete}
        taskVersion={taskVersion}
        token={token}
        tasks={tasks}
      />
    );
  }

  if (activePage === "board") {
    return <TaskBoard categories={categories} isApiMode={isApiMode} onCreateTask={onCreateTask} onOpenTask={onOpenTask} tasks={tasks} />;
  }

  if (activePage === "ai") {
    return <AIPage onOpenTask={onOpenTask} onSuggestTaskFields={onSuggestTaskFields} recommendedTasks={recommendedTasks} />;
  }

  if (activePage === "calendar") {
    return <CalendarPage onOpenTask={onOpenTask} tasks={tasks} />;
  }

  if (activePage === "stats") {
    return <StatsPage remoteStats={remoteStats} tasks={tasks} />;
  }

  if (activePage === "tags") {
    return <TagsPage tasks={tasks} />;
  }

  if (activePage === "settings") {
    return <SettingsPage onSave={onSaveSettings} onTest={onTestOpenAIKey} settings={settings} />;
  }

  return <PlaceholderPage activePage={activePage} />;
}

interface DashboardPageProps {
  onOpenTask: (task: Task) => void;
  onPageChange: (page: PageKey) => void;
  onToggleComplete: (taskId: number) => void;
  recommendedTasks: Task[];
  tasks: Task[];
}

function DashboardPage({
  onOpenTask,
  onPageChange,
  onToggleComplete,
  recommendedTasks,
  tasks,
}: DashboardPageProps) {
  const todayTasks = tasks.filter((task) => isToday(task.dueDate));
  const visibleTasks = todayTasks.slice(0, 5);
  const completedToday = todayTasks.filter((task) => task.status === "已完成").length;
  const overdue = tasks.filter(isOverdue).length;

  return (
    <main className="page-content">
      <section className="welcome-panel">
        <div>
          <p className="eyebrow">AI TODO Dashboard</p>
          <h1>早上好，今天也要高效完成任务！</h1>
          <p>AI 已根据截止时间、优先级和依赖关系，为你整理好今日重点。</p>
        </div>
        <div className="welcome-progress">
          <span>今日完成率</span>
          <strong>{todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0}%</strong>
        </div>
      </section>

      <section className="stats-grid">
        <StatsCard icon={CalendarDays} label="今日任务" value={todayTasks.length} tone="blue" />
        <StatsCard icon={CheckCircle2} label="已完成" value={completedToday} tone="green" />
        <StatsCard icon={AlertCircle} label="逾期任务" value={overdue} tone="red" />
        <StatsCard icon={Sparkles} label="AI 推荐优先处理" value={recommendedTasks.length} tone="purple" />
      </section>

      <section className="dashboard-grid">
        <AIAssistantCard onOpenTask={onOpenTask} tasks={recommendedTasks} />
        <div className="content-card">
          <div className="section-title">
            <div>
              <h2>今日任务</h2>
              <p>按截止时间和 AI 优先级排序。</p>
            </div>
            <button className="ghost-button" type="button" onClick={() => onPageChange("all")}>
              查看全部
            </button>
          </div>
          <div className="task-card-list">
            {visibleTasks.length ? (
              visibleTasks.map((task) => (
                <TaskCard key={task.id} onOpen={onOpenTask} onToggleComplete={onToggleComplete} task={task} />
              ))
            ) : (
              <EmptyState title="今天没有截止任务" description="可以用底部或顶部的新建按钮添加一个今日任务。" />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  tone: "blue" | "green" | "red" | "purple";
  value: number | string;
}

function StatsCard({ icon: Icon, label, tone, value }: StatsCardProps) {
  return (
    <article className={`stats-card ${tone}`}>
      <span>
        <Icon size={20} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function EmptyState({ description, title }: { description: string; title: string }) {
  return (
    <div className="empty-state">
      <FileText size={26} />
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

interface AIAssistantCardProps {
  onOpenTask: (task: Task) => void;
  tasks: Task[];
}

function AIAssistantCard({ onOpenTask, tasks }: AIAssistantCardProps) {
  return (
    <section className="ai-card">
      <div className="ai-card-header">
        <span>
          <Sparkles size={21} />
        </span>
        <div>
          <h2>AI 智能建议</h2>
          <p>根据截止时间、优先级和任务复杂度，AI 建议你优先完成以下任务。</p>
        </div>
      </div>
      <div className="ai-recommend-list">
        {tasks.length ? (
          tasks.map((task) => (
            <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
              <div>
                <strong>{task.title}</strong>
                <p>推荐原因：{task.aiReason}</p>
              </div>
              <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
              <small>{formatDue(task)}</small>
            </button>
          ))
        ) : (
          <EmptyState title="暂无 AI 推荐" description="所有任务都已完成，或者还没有可分析的待办任务。" />
        )}
      </div>
    </section>
  );
}

interface TaskCardProps {
  onOpen: (task: Task) => void;
  onToggleComplete: (taskId: number) => void;
  task: Task;
}

function TaskCard({ onOpen, onToggleComplete, task }: TaskCardProps) {
  const toggleLabel = toggleTaskActionLabel(task.status);

  return (
    <article className="task-card" onClick={() => onOpen(task)}>
      <button
        className={`task-check ${task.status === "已完成" ? "checked" : ""}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onToggleComplete(task.id);
        }}
        aria-label={toggleLabel}
        title={toggleLabel}
      >
        {task.status === "已完成" && <Check size={15} />}
      </button>
      <div className="task-card-body">
        <div className="task-card-title">
          <h3>{task.title}</h3>
          <PriorityBadge priority={task.priority} />
        </div>
        <p>{task.description}</p>
        <div className="task-meta">
          <StatusBadge status={task.status} />
          <span>{task.category}</span>
          <span>
            <Clock3 size={14} />
            {formatDue(task)}
          </span>
        </div>
      </div>
    </article>
  );
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return <span className={`priority-badge priority-${priority}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}

interface AllTasksPageProps {
  categories: string[];
  globalSearch: string;
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onToggleComplete: (taskId: number) => void;
  taskVersion: number;
  token: string;
  tasks: Task[];
}

function AllTasksPage({
  categories,
  globalSearch,
  isApiMode,
  onApiError,
  onDelete,
  onEditTask,
  onOpenTask,
  onToggleComplete,
  taskVersion,
  token,
  tasks,
}: AllTasksPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "全部">("全部");
  const [priority, setPriority] = useState<TaskPriority | "全部">("全部");
  const [category, setCategory] = useState("全部");
  const [sort, setSort] = useState("dueDate");
  const [page, setPage] = useState(1);
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([]);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const pageSize = 6;
  const statusChoices = isApiMode ? apiStatusOptions : statusOptions;

  useEffect(() => {
    setPage(1);
  }, [globalSearch]);

  useEffect(() => {
    if (isApiMode && status === "进行中") {
      setStatus("全部");
      setPage(1);
    }
  }, [isApiMode, status]);

  useEffect(() => {
    if (!isApiMode || !token) {
      return;
    }

    let isCancelled = false;
    const keyword = `${globalSearch} ${query}`.trim();
    const remoteStatus = isApiMode && status === "进行中" ? "全部" : status;
    setRemoteLoading(true);
    setRemoteError("");
    void apiRequest<ApiPageResult<ApiTask>>(
      buildTaskListPath({
        category,
        keyword,
        page,
        pageSize,
        priority,
        sort,
        status: remoteStatus,
      }),
      { token },
    )
      .then((data) => {
        if (isCancelled) {
          return;
        }
        setRemoteTasks(data.items.map((item) => mapApiTask(item)));
        setRemoteTotal(data.pagination.total);
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }
        setRemoteError(onApiError(error));
      })
      .finally(() => {
        if (!isCancelled) {
          setRemoteLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [category, globalSearch, isApiMode, page, priority, query, sort, status, taskVersion, token]);

  const filteredTasks = useMemo(() => {
    const keyword = `${globalSearch} ${query}`.trim().toLowerCase();
    return tasks
      .filter((task) => {
        const matchesKeyword =
          !keyword ||
          [task.title, task.description, task.category, task.tags.join(" ")].some((field) =>
            field.toLowerCase().includes(keyword),
          );
        const matchesStatus = status === "全部" || task.status === status;
        const matchesPriority = priority === "全部" || task.priority === priority;
        const matchesCategory = category === "全部" || task.category === category;
        return matchesKeyword && matchesStatus && matchesPriority && matchesCategory;
      })
      .sort((left, right) => {
        if (sort === "priority") {
          const rank: Record<TaskPriority, number> = { 高: 3, 中: 2, 低: 1 };
          return rank[right.priority] - rank[left.priority];
        }
        if (sort === "createdAt") {
          return right.createdAt.localeCompare(left.createdAt);
        }
        return (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31");
      });
  }, [category, globalSearch, priority, query, sort, status, tasks]);

  const localPageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const remotePageCount = Math.max(1, Math.ceil(remoteTotal / pageSize));
  const pageCount = isApiMode ? remotePageCount : localPageCount;
  const currentPage = Math.min(page, pageCount);
  const visibleTasks = isApiMode ? remoteTasks : filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalTasks = isApiMode ? remoteTotal : filteredTasks.length;

  return (
    <main className="page-content">
      <PageHeading title="全部任务" description="参考 shadcn/ui Tasks Example 的表格与筛选交互。" />
      <div className="content-card table-card">
        <FilterBar
          categories={categories}
          category={category}
          onCategoryChange={(value) => {
            setCategory(value);
            setPage(1);
          }}
          onPriorityChange={(value) => {
            setPriority(value);
            setPage(1);
          }}
          onQueryChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
          onSortChange={(value) => {
            setSort(value);
            setPage(1);
          }}
          onStatusChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
          priority={priority}
          query={query}
          sort={sort}
          status={status}
          statusOptions={statusChoices}
        />
        {isRemoteLoading && <p className="api-message">正在从后端加载任务...</p>}
        {remoteError && <p className="form-error">{remoteError}</p>}
        <TaskTable
          onDelete={onDelete}
          onEditTask={onEditTask}
          onOpenTask={onOpenTask}
          onToggleComplete={onToggleComplete}
          tasks={visibleTasks}
        />
        <footer className="table-footer">
          <span>
            共 {totalTasks} 条，第 {currentPage} / {pageCount} 页
          </span>
          <div>
            <button disabled={currentPage <= 1} type="button" onClick={() => setPage(currentPage - 1)}>
              上一页
            </button>
            <button disabled={currentPage >= pageCount} type="button" onClick={() => setPage(currentPage + 1)}>
              下一页
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}

interface FilterBarProps {
  categories: string[];
  category: string;
  onCategoryChange: (value: string) => void;
  onPriorityChange: (value: TaskPriority | "全部") => void;
  onQueryChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "全部") => void;
  priority: TaskPriority | "全部";
  query: string;
  sort: string;
  status: TaskStatus | "全部";
  statusOptions: TaskStatus[];
}

function FilterBar({
  categories,
  category,
  onCategoryChange,
  onPriorityChange,
  onQueryChange,
  onSortChange,
  onStatusChange,
  priority,
  query,
  sort,
  status,
  statusOptions: availableStatusOptions,
}: FilterBarProps) {
  return (
    <section className="filter-bar">
      <label className="filter-search">
        <Search size={17} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索任务..." />
      </label>
      <select value={status} onChange={(event) => onStatusChange(event.target.value as TaskStatus | "全部")}>
        <option value="全部">全部状态</option>
        {availableStatusOptions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select value={priority} onChange={(event) => onPriorityChange(event.target.value as TaskPriority | "全部")}>
        <option value="全部">全部优先级</option>
        {priorityOptions.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
        <option value="全部">全部分类</option>
        {categories.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
        <option value="dueDate">按截止时间排序</option>
        <option value="priority">按优先级排序</option>
        <option value="createdAt">按创建时间排序</option>
      </select>
    </section>
  );
}

interface TaskTableProps {
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onToggleComplete: (taskId: number) => void;
  tasks: Task[];
}

function TaskTable({ onDelete, onEditTask, onOpenTask, onToggleComplete, tasks }: TaskTableProps) {
  const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);

  return (
    <div className="task-table-wrap">
      <table className="task-table">
        <thead>
          <tr>
            <th>任务名称</th>
            <th>状态</th>
            <th>优先级</th>
            <th>分类</th>
            <th>截止时间</th>
            <th>创建时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length ? (
            tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => {
                  setOpenMenuTaskId(null);
                  onOpenTask(task);
                }}
              >
              <td>
                <div className="table-title">
                  <strong>{task.title}</strong>
                  <span>{task.description}</span>
                </div>
              </td>
              <td>
                <StatusBadge status={task.status} />
              </td>
              <td>
                <PriorityBadge priority={task.priority} />
              </td>
              <td>{task.category}</td>
              <td>{formatDue(task)}</td>
              <td>{task.createdAt}</td>
              <td>
                <div className="row-actions">
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId(null);
                      onToggleComplete(task.id);
                    }}
                    aria-label={toggleTaskActionLabel(task.status)}
                    title={toggleTaskActionLabel(task.status)}
                  >
                    <Check size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId(null);
                      onEditTask(task);
                    }}
                    aria-label="编辑任务"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId(null);
                      onDelete(task.id);
                    }}
                    aria-label="删除任务"
                  >
                    <Trash2 size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setOpenMenuTaskId((currentTaskId) => (currentTaskId === task.id ? null : task.id));
                    }}
                    aria-expanded={openMenuTaskId === task.id}
                    aria-label="更多操作"
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {openMenuTaskId === task.id && (
                    <div className="row-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuTaskId(null);
                          onOpenTask(task);
                        }}
                      >
                        查看详情
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuTaskId(null);
                          onEditTask(task);
                        }}
                      >
                        编辑任务
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setOpenMenuTaskId(null);
                          onDelete(task.id);
                        }}
                      >
                        删除任务
                      </button>
                    </div>
                  )}
                </div>
              </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={7}>
                <EmptyState title="没有匹配任务" description="调整搜索词或筛选条件后再试一次。" />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

interface TaskBoardProps {
  categories: string[];
  isApiMode: boolean;
  onCreateTask: () => void;
  onOpenTask: (task: Task) => void;
  tasks: Task[];
}

function TaskBoard({ categories, isApiMode, onCreateTask, onOpenTask, tasks }: TaskBoardProps) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "全部">("全部");
  const [category, setCategory] = useState("全部");
  const filteredTasks = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesKeyword =
        !keyword ||
        [task.title, task.description, task.category, task.tags.join(" ")].some((field) =>
          field.toLowerCase().includes(keyword),
        );
      const matchesPriority = priority === "全部" || task.priority === priority;
      const matchesCategory = category === "全部" || task.category === category;
      return matchesKeyword && matchesPriority && matchesCategory;
    });
  }, [category, priority, query, tasks]);

  return (
    <main className="page-content">
      <PageHeading title="任务看板" description="按状态组织任务，适合规划开发流程。" />
      <div className="board-toolbar">
        <label className="filter-search">
          <Search size={17} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务" />
        </label>
        <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | "全部")}>
          <option value="全部">全部优先级</option>
          {priorityOptions.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <select value={category} onChange={(event) => setCategory(event.target.value)}>
          <option value="全部">全部分类</option>
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
        <button className="primary-button" type="button" onClick={onCreateTask}>
          <Plus size={17} />
          新建任务
        </button>
      </div>
      <div className="kanban-board">
        {(isApiMode ? apiStatusOptions : statusOptions).map((status) => (
          <TaskColumn
            key={status}
            onOpenTask={onOpenTask}
            status={status}
            tasks={filteredTasks.filter((task) => task.status === status)}
          />
        ))}
      </div>
    </main>
  );
}

interface TaskColumnProps {
  onOpenTask: (task: Task) => void;
  status: TaskStatus;
  tasks: Task[];
}

function TaskColumn({ onOpenTask, status, tasks }: TaskColumnProps) {
  return (
    <section className="task-column">
      <header>
        <h2>{status}</h2>
        <span>{tasks.length}</span>
      </header>
      <div className="task-column-list">
        {tasks.length ? (
          tasks.map((task) => (
            <button className="kanban-card" key={task.id} type="button" onClick={() => onOpenTask(task)}>
              <div>
                <strong>{task.title}</strong>
                <PriorityBadge priority={task.priority} />
              </div>
              <p>{task.description}</p>
              <div className="task-meta">
                <span>{task.category}</span>
                <span>{formatDue(task)}</span>
                <span>AI: {task.aiCategory}</span>
              </div>
            </button>
          ))
        ) : (
          <EmptyState title="暂无任务" description="符合当前筛选条件的任务会出现在这里。" />
        )}
      </div>
    </section>
  );
}

function AIPage({
  onOpenTask,
  onSuggestTaskFields,
  recommendedTasks,
}: {
  onOpenTask: (task: Task) => void;
  onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion>;
  recommendedTasks: Task[];
}) {
  return (
    <main className="page-content">
      <PageHeading title="AI 推荐" description="AI 根据截止时间、优先级和复杂度给出的今日处理建议。" />
      <AIAssistantCard onOpenTask={onOpenTask} tasks={recommendedTasks} />
      <AISuggestTool onSuggestTaskFields={onSuggestTaskFields} />
    </main>
  );
}

function AISuggestTool({
  onSuggestTaskFields,
}: {
  onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion>;
}) {
  const [title, setTitle] = useState("修复移动端弹窗遮挡问题");
  const [description, setDescription] = useState("检查 WebView 下底部导航和新建任务弹窗是否被安全区遮挡。");
  const fallbackSuggestion = useMemo(() => generateTaskFromPrompt(`${title}。${description}`), [description, title]);
  const [suggestion, setSuggestion] = useState<TaskFieldSuggestion>(() => ({
    priority: fallbackSuggestion.priority,
    category: fallbackSuggestion.category,
    reason: fallbackSuggestion.aiReason || "本地规则已根据关键词推荐分类与优先级。",
  }));
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestSuggestion = async () => {
    setLoading(true);
    setError("");
    try {
      setSuggestion(await onSuggestTaskFields(title, description));
    } catch (requestError) {
      setError(asErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="content-card ai-suggest-tool">
      <div className="section-title">
        <div>
          <h2>AI 推荐分类和优先级</h2>
          <p>点击后调用 /ai/suggest；本地演示模式会使用前端规则兜底。</p>
        </div>
        <button className="ghost-button" type="button" onClick={requestSuggestion} disabled={isLoading}>
          {isLoading ? "分析中..." : "获取建议"}
        </button>
      </div>
      <div className="ai-suggest-grid">
        <label>
          任务标题
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          任务描述
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} />
        </label>
        <div className="suggest-result">
          <Field label="推荐优先级"><PriorityBadge priority={suggestion.priority} /></Field>
          <Field label="推荐分类">{suggestion.category}</Field>
          <Field label="建议来源">/ai/suggest</Field>
          <p>{suggestion.reason}</p>
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </section>
  );
}

function CalendarPage({ onOpenTask, tasks }: { onOpenTask: (task: Task) => void; tasks: Task[] }) {
  const [view, setView] = useState<CalendarView>("7");
  const dayCount = view === "14" ? 14 : view === "30" ? 30 : 7;
  const days = Array.from({ length: dayCount }, (_, index) => dateFromToday(index));
  const todayTimedTasks = tasks.filter((task) => isToday(task.dueDate) && Boolean(task.dueTime));
  const todayUntimedTasks = tasks.filter((task) => isToday(task.dueDate) && !task.dueTime);
  const unscheduledTasks = tasks.filter((task) => !task.dueDate);
  const overdueTasks = tasks.filter(isOverdue).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const currentHour = new Date().getHours();

  return (
    <main className="page-content">
      <PageHeading title="日历" description="用日历、24 小时轴和逾期视图检查任务时间安排。" />
      <section className="calendar-controls" aria-label="日历视图">
        {[
          ["7", "近 7 天"],
          ["14", "近 14 天"],
          ["30", "近 30 天"],
          ["24h", "今日 24 小时"],
          ["overdue", "逾期"],
        ].map(([key, label]) => (
          <button className={view === key ? "active" : ""} key={key} type="button" onClick={() => setView(key as CalendarView)}>
            {label}
          </button>
        ))}
      </section>

      {view === "24h" ? (
        <section className="timeline-layout">
          <div className="today-timeline">
            {Array.from({ length: 24 }, (_, hour) => {
              const hourTasks = todayTimedTasks.filter((task) => parseHour(task.dueTime) === hour);
              const isCurrentHour = hour === currentHour;
              return (
                <div className={`timeline-hour ${isCurrentHour ? "current" : ""}`} key={hour}>
                  <span className="timeline-hour-label">
                    <strong>{String(hour).padStart(2, "0")}:00</strong>
                    {isCurrentHour ? <em>当前时间</em> : null}
                  </span>
                  <div>
                    {hourTasks.map((task) => (
                      <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                        <strong>{task.title}</strong>
                        <small>{task.category}</small>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <aside className="unscheduled-panel">
            <h2>今日未设时段</h2>
            {todayUntimedTasks.length ? (
              todayUntimedTasks.map((task) => (
                <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                  {task.title}
                </button>
              ))
            ) : (
              <EmptyState title="没有未设时段任务" description="带具体时间的今日任务会被放进左侧时间轴。" />
            )}
            <h2>无截止时间</h2>
            {unscheduledTasks.length ? (
              unscheduledTasks.map((task) => (
                <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                  {task.title}
                </button>
              ))
            ) : (
              <EmptyState title="没有无截止任务" description="所有任务都已经有明确截止安排。" />
            )}
          </aside>
        </section>
      ) : view === "overdue" ? (
        <section className="content-card overdue-list">
          {overdueTasks.length ? (
            overdueTasks.map((task) => (
              <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                <div>
                  <strong>{task.title}</strong>
                  <span>{formatDue(task)}</span>
                </div>
                <PriorityBadge priority={task.priority} />
              </button>
            ))
          ) : (
            <EmptyState title="没有逾期任务" description="当前所有未完成任务都还在截止时间内。" />
          )}
        </section>
      ) : (
        <div className={`calendar-grid calendar-grid-${view}`}>
          {days.map((day) => {
            const dayTasks = tasks.filter((task) => task.dueDate === day);
            return (
              <section className={`calendar-day ${day === dateFromToday(0) ? "today" : ""}`} key={day}>
                <strong>{day}</strong>
                {dayTasks.length ? (
                  dayTasks.map((task) => (
                    <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                      <span>{task.dueTime || "全天"}</span>
                      {task.title}
                    </button>
                  ))
                ) : (
                  <p>暂无任务</p>
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}

function StatsPage({ remoteStats, tasks }: { remoteStats: RemoteStatsState; tasks: Task[] }) {
  const [range, setRange] = useState<"7" | "14" | "30" | "24h">("7");
  const localDone = tasks.filter((task) => task.status === "已完成").length;
  const totalTasks = remoteStats.overview?.total_tasks ?? tasks.length;
  const done = remoteStats.overview?.done_tasks ?? localDone;
  const todo = remoteStats.overview?.todo_tasks ?? tasks.length - localDone;
  const completion = remoteStats.overview ? Math.round(remoteStats.overview.completion_rate * 100) : tasks.length ? Math.round((localDone / tasks.length) * 100) : 0;
  const aiCreated = remoteStats.overview?.ai_created_tasks ?? tasks.filter((task) => task.isAiCreated).length;
  const todayDue = remoteStats.overview?.today_due_tasks ?? tasks.filter((task) => isToday(task.dueDate)).length;
  const overdueTotal = remoteStats.overview?.overdue_tasks ?? tasks.filter(isOverdue).length;
  const categoryStats = remoteStats.categories.length
    ? remoteStats.categories.map((item) => [item.category, item.total] as [string, number])
    : Array.from(tasks.reduce((map, task) => map.set(task.category, (map.get(task.category) || 0) + 1), new Map<string, number>())).sort(
        (left, right) => right[1] - left[1],
      );
  const priorityStats = remoteStats.priorities.length
    ? remoteStats.priorities.map((item) => ({
        priority: priorityFromApi(item.priority),
        total: item.total,
      }))
    : priorityOptions.map((priority) => ({
        priority,
        total: tasks.filter((task) => task.priority === priority).length,
      }));
  const trendDayCount = range === "30" ? 30 : range === "14" ? 14 : 7;
  const trendDays = Array.from({ length: trendDayCount }, (_, index) => dateFromToday(index - trendDayCount + 1));
  const localTrend = trendDays.map((day) => ({
    day,
    created: tasks.filter((task) => task.createdAt === day).length,
    done: tasks.filter((task) => task.completedAt === day).length,
  }));
  const remoteTrend = remoteStats.trend.map((item) => ({ day: item.date, created: item.created, done: item.done })).slice(-trendDayCount);
  const trend = remoteTrend.length ? remoteTrend : localTrend;
  const maxTrendValue = Math.max(1, ...trend.map((item) => Math.max(item.created, item.done)));
  const hourlyTrend = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    due: tasks.filter((task) => isToday(task.dueDate) && parseHour(task.dueTime) === hour).length,
  }));
  const maxHourlyValue = Math.max(1, ...hourlyTrend.map((item) => item.due));

  return (
    <main className="page-content">
      <PageHeading title="数据统计" description="查看任务完成趋势、分类分布、优先级分布与 AI 创建占比。" />
      <section className="stats-grid stats-grid-wide">
        <StatsCard icon={ListTodo} label="任务总数" value={totalTasks} tone="blue" />
        <StatsCard icon={CheckCircle2} label="已完成" value={done} tone="green" />
        <StatsCard icon={Clock3} label="待处理" value={todo} tone="purple" />
        <StatsCard icon={AlertCircle} label="逾期任务" value={overdueTotal} tone="red" />
        <StatsCard icon={CalendarDays} label="今日截止" value={todayDue} tone="blue" />
        <StatsCard icon={Sparkles} label="AI 创建数量" value={aiCreated} tone="purple" />
      </section>

      {!totalTasks ? (
        <section className="content-card">
          <EmptyState title="暂无统计数据" description="创建任务后，这里会显示完成率、分布和趋势。" />
        </section>
      ) : (
        <section className="stats-panels">
          <div className="content-card chart-card">
            <div className="section-title">
              <div>
                <h2>每日完成任务趋势</h2>
                <p>当前完成率 {completion}%</p>
              </div>
              <div className="range-tabs">
                {[
                  ["7", "近 7 天"],
                  ["14", "近 14 天"],
                  ["30", "近 30 天"],
                  ["24h", "今日 24 小时"],
                ].map(([key, label]) => (
                  <button className={range === key ? "active" : ""} key={key} type="button" onClick={() => setRange(key as typeof range)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {range === "24h" ? (
              <div className="trend-bars hourly">
                {hourlyTrend.map((item) => (
                  <span key={item.hour} style={{ height: `${(item.due / maxHourlyValue) * 100}%` }} title={`${item.hour}:00 ${item.due} 个任务`}>
                    <small>{item.hour % 4 === 0 ? item.hour : ""}</small>
                  </span>
                ))}
              </div>
            ) : (
              <div className="trend-bars">
                {trend.map((item) => (
                  <span key={item.day} style={{ height: `${(item.done / maxTrendValue) * 100}%` }} title={`${item.day} 完成 ${item.done} 个`}>
                    <small>{item.day.slice(5)}</small>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="content-card distribution-card">
            <h2>任务分类分布</h2>
            {categoryStats.map(([category, total]) => (
              <div className="distribution-row" key={category}>
                <span>{category}</span>
                <div>
                  <i style={{ width: `${(total / totalTasks) * 100}%` }} />
                </div>
                <strong>{total}</strong>
              </div>
            ))}
          </div>

          <div className="content-card distribution-card">
            <h2>优先级分布</h2>
            {priorityStats.map((item) => (
              <div className="distribution-row" key={item.priority}>
                <span>{item.priority}</span>
                <div>
                  <i className={`bar-${item.priority}`} style={{ width: `${(item.total / totalTasks) * 100}%` }} />
                </div>
                <strong>{item.total}</strong>
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function TagsPage({ tasks }: { tasks: Task[] }) {
  const tagStats = Array.from(
    tasks
      .flatMap((task) => task.tags)
      .reduce((map, tag) => map.set(tag, (map.get(tag) || 0) + 1), new Map<string, number>()),
  ).sort((left, right) => right[1] - left[1]);

  return (
    <main className="page-content">
      <PageHeading title="标签管理" description="查看当前任务标签分布，后续可扩展为标签重命名和合并。" />
      <section className="content-card tag-cloud">
        {tagStats.length ? (
          tagStats.map(([tag, total]) => (
            <button key={tag} type="button">
              <Tags size={16} />
              <span>{tag}</span>
              <strong>{total}</strong>
            </button>
          ))
        ) : (
          <EmptyState title="暂无标签" description="创建任务并填写标签后，这里会展示标签统计。" />
        )}
      </section>
    </main>
  );
}

function SettingsPage({
  onSave,
  onTest,
  settings,
}: {
  onSave: (settings: SettingsState) => Promise<string | void>;
  onTest: (settings: SettingsState) => Promise<string>;
  settings: SettingsState;
}) {
  const [draft, setDraft] = useState(settings);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"idle" | "success" | "failed">("idle");
  const [isSaving, setSaving] = useState(false);
  const [isTesting, setTesting] = useState(false);
  const apiBaseUrl = API_BASE_URL;

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      const message = await onSave(draft);
      setFeedback(message || "设置已保存。");
      setFeedbackTone("success");
    } catch (error) {
      setFeedback(asErrorMessage(error));
      setFeedbackTone("failed");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setFeedback("");
    try {
      const message = await onTest(draft);
      const isFailure = message.includes("失败") || message.includes("过短") || message.includes("无效");
      setFeedback(message);
      setFeedbackTone(isFailure ? "failed" : "success");
    } catch (error) {
      setFeedback(asErrorMessage(error));
      setFeedbackTone("failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <main className="page-content">
      <PageHeading title="设置" description="配置 AI 模型、OpenAI Key 和前端联调信息。" />
      <section className="settings-layout">
        <form className="content-card settings-form" onSubmit={save}>
          <h2>AI 配置</h2>
          <label>
            OpenAI API Key
            <input
              value={draft.openaiApiKey}
              onChange={(event) => setDraft({ ...draft, openaiApiKey: event.target.value })}
              placeholder={settings.maskedKey || "sk-... 留空则使用后端已保存 Key"}
              type="password"
            />
          </label>
          <label>
            模型名称
            <input value={draft.modelName} onChange={(event) => setDraft({ ...draft, modelName: event.target.value })} />
          </label>
          <div className="settings-actions">
            <button className="ghost-button" type="button" onClick={testConnection} disabled={isTesting}>
              {isTesting ? "测试中..." : "测试连接"}
            </button>
            <button className="primary-button" type="submit" disabled={isSaving}>
              {isSaving ? "保存中..." : "保存设置"}
            </button>
          </div>
          {feedbackTone !== "idle" && <p className={`connection-result ${feedbackTone}`}>{feedback}</p>}
        </form>

        <aside className="content-card settings-info">
          <h2>联调信息</h2>
          <Field label="API Base URL">{apiBaseUrl}</Field>
          <Field label="AI 模式">{settings.hasOpenaiApiKey || draft.openaiApiKey ? "已配置 Key" : "mock / 未配置 Key"}</Field>
          <Field label="脱敏 Key">{settings.maskedKey || "未保存"}</Field>
          <Field label="存储方式">后端 /settings，本地模式使用 localStorage</Field>
          <p>保存会调用 /settings，测试会调用 /settings/test-openai-key。</p>
        </aside>
      </section>
    </main>
  );
}

function PlaceholderPage({ activePage }: { activePage: PageKey }) {
  const label = navItems.find((item) => item.key === activePage)?.label || "页面";
  return (
    <main className="page-content">
      <PageHeading title={label} description="该模块已预留入口，后续可继续扩展。" />
      <section className="content-card empty-module">
        <FileText size={32} />
        <h2>{label}</h2>
        <p>这里会承载项目的扩展能力，例如标签管理、个人设置和更多 AI 工作流。</p>
      </section>
    </main>
  );
}

function PageHeading({ description, title }: { description: string; title: string }) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">AI-agent-TODO</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
    </div>
  );
}

interface TaskDetailDrawerProps {
  onClose: () => void;
  onDelete: (taskId: number) => void;
  onToggleComplete: (taskId: number) => void;
  task: Task | null;
}

function TaskDetailDrawer({ onClose, onDelete, onToggleComplete, task }: TaskDetailDrawerProps) {
  if (!task) {
    return null;
  }

  return (
    <aside className="drawer">
      <div className="drawer-header">
        <div>
          <p className="eyebrow">任务详情</p>
          <h2>{task.title}</h2>
        </div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="关闭详情">
          <X size={18} />
        </button>
      </div>
      <p className="drawer-description">{task.description}</p>
      <div className="drawer-fields">
        <Field label="状态"><StatusBadge status={task.status} /></Field>
        <Field label="优先级"><PriorityBadge priority={task.priority} /></Field>
        <Field label="截止时间">{formatDue(task)}</Field>
        <Field label="标签">{task.tags.join(" / ")}</Field>
        <Field label="创建来源">{task.isAiCreated ? "AI 生成" : "自定义创建"}</Field>
      </div>
      <section className="subtasks">
        <h3>子任务</h3>
        <label><input type="checkbox" /> 确认字段结构</label>
        <label><input type="checkbox" /> 联调后端接口</label>
        <label><input type="checkbox" /> 补充验收截图</label>
      </section>
      <section className="ai-analysis">
        <Sparkles size={18} />
        <h3>AI 分析结果</h3>
        <p>AI 自动分类：{task.aiCategory}</p>
        <p>AI 推荐优先级：{task.priority}</p>
        <p>AI 预计完成时间：{task.estimatedTime}</p>
        {task.confidence && <p>AI 解析置信度：{Math.round(task.confidence * 100)}%</p>}
        <strong>AI 建议：该任务建议安排在今天下午完成，因为它优先级较高，并且会影响后续开发进度。</strong>
      </section>
      <div className="drawer-actions">
        <button className="primary-button" type="button" onClick={() => onToggleComplete(task.id)}>
          {task.status === "已完成" ? "恢复待办" : "标记完成"}
        </button>
        <button className="danger-button" type="button" onClick={() => onDelete(task.id)}>
          删除任务
        </button>
      </div>
    </aside>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="drawer-field">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

interface CreateTaskModalProps {
  categories: string[];
  isApiMode: boolean;
  onClose: () => void;
  onCreate: (input: NewTaskInput) => void;
  onParseTask: (prompt: string) => Promise<NewTaskInput>;
}

interface EditTaskModalProps {
  categories: string[];
  isApiMode: boolean;
  onClose: () => void;
  onUpdate: (input: NewTaskInput) => void;
  task: Task;
}

function EditTaskModal({ categories, isApiMode, onClose, onUpdate, task }: EditTaskModalProps) {
  const [form, setForm] = useState<NewTaskInput>(() => taskToInput(task));

  const submitEdit = (input: NewTaskInput) => {
    if (!input.title.trim()) {
      return;
    }
    onUpdate(input);
  };

  return (
    <div className="modal-backdrop">
      <div className="create-modal">
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Edit Task</p>
            <h2>编辑任务</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭弹窗">
            <X size={18} />
          </button>
        </div>
        <ManualTaskForm
          categories={categories}
          form={form}
          isApiMode={isApiMode}
          onChange={setForm}
          onSubmit={submitEdit}
          submitLabel="保存修改"
        />
      </div>
    </div>
  );
}

type CreateMode = "manual" | "ai";

function CreateTaskModal({ categories, isApiMode, onClose, onCreate, onParseTask }: CreateTaskModalProps) {
  const [mode, setMode] = useState<CreateMode>("ai");
  const [form, setForm] = useState<NewTaskInput>(() => createEmptyTask());
  const [prompt, setPrompt] = useState("这周要完成前端首页、任务表格筛选、看板页面，还要准备项目演示。");
  const [generatedTask, setGeneratedTask] = useState<NewTaskInput | null>(null);
  const [generateError, setGenerateError] = useState("");
  const [isGenerating, setGenerating] = useState(false);

  const submitManual = (input: NewTaskInput) => {
    if (!input.title.trim()) {
      return;
    }
    onCreate(input);
  };

  const generateTask = async () => {
    if (!prompt.trim()) {
      return;
    }
    setGenerating(true);
    setGenerateError("");
    try {
      setGeneratedTask(await onParseTask(prompt));
    } catch (error) {
      setGenerateError(asErrorMessage(error));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="create-modal">
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Create Task</p>
            <h2>新建任务</h2>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭弹窗">
            <X size={18} />
          </button>
        </div>
        <ModeSegment mode={mode} onChange={setMode} />
        {mode === "manual" ? (
          <ManualTaskForm categories={categories} form={form} isApiMode={isApiMode} onChange={setForm} onSubmit={submitManual} />
        ) : (
          <AITaskGenerator
            error={generateError}
            generatedTask={generatedTask}
            isGenerating={isGenerating}
            onGenerate={generateTask}
            onPromptChange={setPrompt}
            onSwitchToManual={(task) => {
              setForm(task);
              setMode("manual");
            }}
            onUseTask={submitManual}
            prompt={prompt}
          />
        )}
      </div>
    </div>
  );
}

function ModeSegment({ mode, onChange }: { mode: CreateMode; onChange: (mode: CreateMode) => void }) {
  return (
    <div className="mode-segment" role="tablist" aria-label="新建任务方式">
      <button className={mode === "ai" ? "active" : ""} type="button" onClick={() => onChange("ai")}>
        <Sparkles size={16} />
        AI 生成
      </button>
      <button className={mode === "manual" ? "active" : ""} type="button" onClick={() => onChange("manual")}>
        自定义创建
      </button>
    </div>
  );
}

interface ManualTaskFormProps {
  categories: string[];
  form: NewTaskInput;
  isApiMode: boolean;
  onChange: (form: NewTaskInput) => void;
  onSubmit: (form: NewTaskInput) => void;
  submitLabel?: string;
}

function ManualTaskForm({ categories, form, isApiMode, onChange, onSubmit, submitLabel = "创建任务" }: ManualTaskFormProps) {
  const statusChoices = isApiMode ? apiStatusOptions : statusOptions;
  const safeStatus = statusChoices.includes(form.status) ? form.status : "待办";
  const categoryOptions = Array.from(new Set([form.category, ...categories].filter(Boolean)));
  const fieldPrefix = submitLabel === "保存修改" ? "edit-task" : "create-task";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({ ...form, status: safeStatus });
  };

  return (
    <form className="manual-task-form" onSubmit={submit}>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-title`}>任务标题</label>
        <input id={`${fieldPrefix}-title`} value={form.title} onChange={(event) => onChange({ ...form, title: event.target.value })} />
      </div>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-description`}>描述</label>
        <textarea
          id={`${fieldPrefix}-description`}
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          rows={3}
        />
      </div>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor={`${fieldPrefix}-status`}>状态</label>
          <select
            id={`${fieldPrefix}-status`}
            value={safeStatus}
            onChange={(event) => onChange({ ...form, status: event.target.value as TaskStatus })}
          >
            {statusChoices.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor={`${fieldPrefix}-priority`}>优先级</label>
          <select
            id={`${fieldPrefix}-priority`}
            value={form.priority}
            onChange={(event) => onChange({ ...form, priority: event.target.value as TaskPriority })}
          >
            {priorityOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor={`${fieldPrefix}-category`}>分类</label>
          <select
            id={`${fieldPrefix}-category`}
            value={form.category}
            onChange={(event) => onChange({ ...form, category: event.target.value })}
          >
            {categoryOptions.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor={`${fieldPrefix}-due-date`}>截止时间</label>
          <input
            id={`${fieldPrefix}-due-date`}
            type="date"
            value={form.dueDate}
            onChange={(event) => onChange({ ...form, dueDate: event.target.value })}
          />
        </div>
      </div>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-due-time`}>截止时段</label>
        <input
          id={`${fieldPrefix}-due-time`}
          type="time"
          value={form.dueTime}
          onChange={(event) => onChange({ ...form, dueTime: event.target.value })}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-tags`}>标签</label>
        <input id={`${fieldPrefix}-tags`} value={form.tags} onChange={(event) => onChange({ ...form, tags: event.target.value })} />
      </div>
      <button className="primary-button full" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}

interface AITaskGeneratorProps {
  error: string;
  generatedTask: NewTaskInput | null;
  isGenerating: boolean;
  onGenerate: () => void;
  onPromptChange: (prompt: string) => void;
  onSwitchToManual: (task: NewTaskInput) => void;
  onUseTask: (task: NewTaskInput) => void;
  prompt: string;
}

function AITaskGenerator({
  error,
  generatedTask,
  isGenerating,
  onGenerate,
  onPromptChange,
  onSwitchToManual,
  onUseTask,
  prompt,
}: AITaskGeneratorProps) {
  return (
    <section className="ai-task-generator">
      <label htmlFor="ai-task-prompt">告诉 AI 你想做什么</label>
      <textarea
        id="ai-task-prompt"
        value={prompt}
        onChange={(event) => onPromptChange(event.target.value)}
        placeholder="例如：这周要完成前端首页、任务表格筛选、看板页面，还要准备项目演示。"
        rows={4}
      />
      <button className="primary-button full" type="button" onClick={onGenerate} disabled={isGenerating}>
        <Sparkles size={17} />
        {isGenerating ? "AI 解析中..." : "AI 生成 TODO"}
      </button>
      {error && <p className="form-error">{error}</p>}
      {generatedTask ? (
        <GeneratedTaskPreview
          task={generatedTask}
          onEdit={() => onSwitchToManual(generatedTask)}
          onRegenerate={onGenerate}
          onUse={() => onUseTask(generatedTask)}
        />
      ) : (
        <div className="ai-empty-preview">
          <Sparkles size={20} />
          <strong>输入一段自然语言，AI 会自动拆出任务字段。</strong>
          <p>后端登录态会调用 /ai/parse-task；本地演示模式使用前端规则。</p>
        </div>
      )}
    </section>
  );
}

interface GeneratedTaskPreviewProps {
  onEdit: () => void;
  onRegenerate: () => void;
  onUse: () => void;
  task: NewTaskInput;
}

function GeneratedTaskPreview({ onEdit, onRegenerate, onUse, task }: GeneratedTaskPreviewProps) {
  return (
    <article className="generated-preview">
      <div className="generated-preview-header">
        <div>
          <span>AI 任务预览</span>
          <h3>{task.title}</h3>
        </div>
        <PriorityBadge priority={task.priority} />
      </div>
      <p>{task.description}</p>
      <div className="preview-grid">
        <Field label="状态">{task.status}</Field>
        <Field label="分类">{task.category}</Field>
        <Field label="截止时间">{formatDue(task)}</Field>
        <Field label="预计耗时">{task.estimatedTime}</Field>
        <Field label="标签">{task.tags}</Field>
        <Field label="AI 分类">{task.aiCategory}</Field>
        <Field label="置信度">{task.confidence ? `${Math.round(task.confidence * 100)}%` : "待确认"}</Field>
        <Field label="原始时间">{task.rawDueText || "默认规划"}</Field>
      </div>
      <div className="ai-reason-box">
        <Sparkles size={17} />
        <span>推荐原因：{task.aiReason}</span>
      </div>
      <div className="preview-actions">
        <button className="ghost-button" type="button" onClick={onRegenerate}>
          重新生成
        </button>
        <button className="ghost-button" type="button" onClick={onEdit}>
          切换到自定义编辑
        </button>
        <button className="primary-button" type="button" onClick={onUse}>
          使用该任务
        </button>
      </div>
    </article>
  );
}

function MobileBottomNav({
  activePage,
  onCreateTask,
  onNavigate,
}: {
  activePage: PageKey;
  onCreateTask: () => void;
  onNavigate: (page: PageKey) => void;
}) {
  const items = navItems.filter((item) => ["dashboard", "all", "calendar", "stats"].includes(item.key));
  return (
    <nav className="mobile-bottom-nav" aria-label="移动端导航">
      {items.slice(0, 2).map((item) => {
        const Icon = item.icon;
        return (
          <button className={activePage === item.key ? "active" : ""} key={item.key} type="button" onClick={() => onNavigate(item.key)}>
            <Icon size={19} />
            {item.label}
          </button>
        );
      })}
      <button className="mobile-create-action" type="button" onClick={onCreateTask}>
        <Plus size={21} />
        新建
      </button>
      {items.slice(2).map((item) => {
        const Icon = item.icon;
        return (
          <button className={activePage === item.key ? "active" : ""} key={item.key} type="button" onClick={() => onNavigate(item.key)}>
            <Icon size={19} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
