import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
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
  Minimize2,
  Moon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Send,
  Settings,
  Sparkles,
  Sun,
  SlidersHorizontal,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import MinimalDashboard from "./Dashboard";
import Layout from "./Layout";
import ToastViewport, { type ToastMessage, type ToastTone } from "./components/Toast";

type PageKey =
  | "dashboard"
  | "today"
  | "all"
  | "ai"
  | "board"
  | "calendar"
  | "stats"
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
  aiBackendMode?: "backend" | "frontend-fallback";
}

interface SettingsState {
  openaiApiKey: string;
  modelName: string;
  maskedKey?: string;
  hasOpenaiApiKey?: boolean;
}

interface ProfileState {
  username: string;
  email: string;
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
  created_at?: string;
  updated_at?: string;
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

interface ApiAiLog {
  id: number;
  input_text: string;
  output_json: unknown;
  status: "success" | "failed" | "mocked";
  model_name: string | null;
  created_at: string;
}

interface RemoteStatsState {
  overview: ApiStatsOverview | null;
  categories: ApiCategoryStats[];
  priorities: ApiPriorityStats[];
  trend: ApiTrendStats[];
}

interface TaskDetailState {
  isLoading: boolean;
  error: string;
}

interface TaskFieldSuggestion {
  priority: TaskPriority;
  category: string;
  reason: string;
  source?: string;
}

interface AssistantMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
  actions?: AssistantAction[];
  taskCandidates?: Task[];
}

interface AssistantAction {
  label: string;
  tone?: "primary" | "danger";
  pendingAction: AssistantPendingAction;
}

type AssistantPendingAction =
  | { type: "delete"; taskId: number }
  | { type: "update"; input: NewTaskInput; taskId: number }
  | { type: "toggle"; taskId: number }
  | { type: "open"; taskId: number };

type AssistantIntentResult =
  | { type: "create"; input: NewTaskInput }
  | { type: "delete"; matches: Task[] }
  | { type: "update"; matches: Task[]; patch: Partial<NewTaskInput>; summary: string }
  | { type: "toggle"; matches: Task[]; targetStatus?: TaskStatus }
  | { type: "open"; matches: Task[] }
  | { type: "help" };

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
const OVERLAY_EXIT_MS = 180;

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
  today: "/today",
  all: "/tasks",
  ai: "/ai",
  board: "/board",
  calendar: "/calendar",
  stats: "/stats",
  settings: "/settings",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isKnownPagePath(pathname: string) {
  return Object.values(pagePaths).includes(pathname);
}

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

function apiRangeIso(date: string, time: "00:00" | "23:59") {
  return isoFromLocalParts(date, time) || "";
}

function buildDateRange(startDate: string, endDate: string) {
  return {
    from: apiRangeIso(startDate, "00:00"),
    to: apiRangeIso(endDate, "23:59"),
  };
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

function isAiConfigError(error: unknown) {
  return error instanceof ApiError && (error.code === 4001 || error.code === 4002 || error.message.includes("OpenAI API Key"));
}

function buildFrontendFallbackTask(prompt: string, reason: string) {
  const task = generateTaskFromPrompt(prompt);
  return {
    ...task,
    aiBackendMode: "frontend-fallback" as const,
    aiReason: `${reason}，已使用前端规则生成预览。`,
  };
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
    category: "产品规划",
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
  { key: "today", label: "今日任务", icon: Clock3 },
  { key: "all", label: "全部任务", icon: ListTodo },
  { key: "ai", label: "AI 推荐", icon: Sparkles },
  { key: "board", label: "任务看板", icon: LayoutDashboard },
  { key: "calendar", label: "日历", icon: CalendarDays },
  { key: "stats", label: "数据统计", icon: BarChart3 },
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

function isAiPriorityTask(task: Pick<Task, "isAiCreated" | "priority" | "status">) {
  return task.status !== "已完成" && (task.isAiCreated || task.priority === "高");
}

function getTaskOverview(tasks: Task[]) {
  const todayTasks = tasks.filter((task) => isToday(task.dueDate));
  const completedToday = todayTasks.filter((task) => task.status === "已完成").length;

  return {
    aiPriorityCount: tasks.filter(isAiPriorityTask).length,
    completedToday,
    overdueCount: tasks.filter(isOverdue).length,
    todayTasks,
  };
}

function readStoredSession() {
  const storedSession = readStoredJson<unknown>(SESSION_STORAGE_KEY, null);
  if (!isRecord(storedSession) || typeof storedSession.name !== "string" || typeof storedSession.email !== "string") {
    return null;
  }

  return {
    name: storedSession.name,
    email: storedSession.email,
    token: typeof storedSession.token === "string" ? storedSession.token : "",
    isApiSession: storedSession.isApiSession === true,
  };
}

function readStoredTheme() {
  return readStoredJson<unknown>(THEME_STORAGE_KEY, false) === true;
}

function normalizeStoredTask(item: unknown, index: number): Task | null {
  if (!isRecord(item) || typeof item.title !== "string") {
    return null;
  }

  const status = statusOptions.includes(item.status as TaskStatus) ? (item.status as TaskStatus) : "待办";
  const priority = priorityOptions.includes(item.priority as TaskPriority) ? (item.priority as TaskPriority) : "中";
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

function readStoredTasks() {
  const storedTasks = readStoredJson<unknown>(TASKS_STORAGE_KEY, null);
  if (!Array.isArray(storedTasks)) {
    return initialTasks;
  }

  const normalizedTasks = storedTasks
    .map((item, index) => normalizeStoredTask(item, index))
    .filter((task): task is Task => Boolean(task));

  return normalizedTasks.length ? normalizedTasks : initialTasks;
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

function normalizeTaskInput(input: NewTaskInput): NewTaskInput {
  const category = input.category.trim() || "未分类";
  return {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    category,
    tags: input.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(", "),
    aiReason: input.aiReason?.trim(),
    estimatedTime: input.estimatedTime?.trim(),
    aiCategory: input.aiCategory?.trim() || category,
    sourceText: input.sourceText?.trim(),
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

function normalizeAssistantText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stripAssistantIntentWords(text: string) {
  return normalizeAssistantText(text)
    .replace(/^(请|帮我|麻烦)?\s*(创建|新建|添加|新增|加一个|删除|移除|修改|更新|把|将|设为|设置|标记|完成|恢复|打开|查看)\s*/i, "")
    .replace(/(这个|任务|待办|todo|TODO)/g, " ")
    .replace(/[，。,.；;：:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTextAfter(text: string, markers: string[]) {
  for (const marker of markers) {
    const index = text.indexOf(marker);
    if (index >= 0) {
      return text.slice(index + marker.length).trim();
    }
  }
  return "";
}

function extractQuotedText(text: string) {
  const match = text.match(/[“"']([^”"']+)[”"']/);
  return match?.[1]?.trim() || "";
}

function findAssistantTaskMatches(tasks: Task[], query: string) {
  const commandText = normalizeAssistantText(query).toLowerCase();
  const exactTitleMatches = tasks.filter((task) => commandText.includes(task.title.toLowerCase()));
  if (exactTitleMatches.length) {
    return exactTitleMatches;
  }
  const normalizedQuery = stripAssistantIntentWords(query).toLowerCase();
  const directQuoted = extractQuotedText(query).toLowerCase();
  const searchText = directQuoted || normalizedQuery;
  const tokens = searchText
    .split(/[\s,，。:：;；]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);

  if (!searchText && !tokens.length) {
    return [];
  }

  return tasks
    .map((task) => {
      const taskTitle = task.title.toLowerCase();
      const haystack = [task.title, task.description, task.category, task.tags.join(" ")].join(" ").toLowerCase();
      let score = 0;
      if (commandText.includes(taskTitle)) {
        score += 14;
      }
      if (directQuoted && task.title.toLowerCase().includes(directQuoted)) {
        score += 12;
      }
      if (searchText && taskTitle.includes(searchText)) {
        score += 10;
      }
      if (searchText && haystack.includes(searchText)) {
        score += 4;
      }
      score += tokens.filter((token) => haystack.includes(token)).length * 2;
      return { score, task };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.task.id - right.task.id)
    .slice(0, 5)
    .map((item) => item.task);
}

function parseAssistantPriority(text: string): TaskPriority | null {
  if (/高优先级|优先级.*高|紧急|重要/.test(text)) {
    return "高";
  }
  if (/低优先级|优先级.*低|不急|低/.test(text)) {
    return "低";
  }
  if (/中优先级|优先级.*中|普通|一般/.test(text)) {
    return "中";
  }
  return null;
}

function parseAssistantStatus(text: string): TaskStatus | null {
  if (/完成|已完成|done/i.test(text)) {
    return "已完成";
  }
  if (/进行中|处理中/.test(text)) {
    return "进行中";
  }
  if (/恢复|待办|todo|未完成/i.test(text)) {
    return "待办";
  }
  return null;
}

function parseAssistantDueDate(text: string) {
  if (/今天|今日/.test(text)) {
    return dateFromToday(0);
  }
  if (/明天|明日/.test(text)) {
    return dateFromToday(1);
  }
  if (/后天/.test(text)) {
    return dateFromToday(2);
  }
  const dayMatch = text.match(/(\d{4}-\d{1,2}-\d{1,2})/);
  if (dayMatch) {
    const [year, month, day] = dayMatch[1].split("-").map((part) => part.padStart(2, "0"));
    return `${year}-${month}-${day}`;
  }
  return "";
}

function parseAssistantDueTime(text: string) {
  const timeMatch = text.match(/(\d{1,2})[:：点](\d{1,2})?/);
  if (timeMatch) {
    const hour = Math.min(23, Math.max(0, Number(timeMatch[1])));
    const minute = Math.min(59, Math.max(0, Number(timeMatch[2] || "0")));
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  return pickGeneratedDueTime(text.toLowerCase());
}

function parseAssistantCategory(text: string) {
  const explicit = text.match(/(?:分类|类别|归类)(?:为|成|到|:|：)?\s*([\u4e00-\u9fa5A-Za-z0-9_-]{2,20})/);
  if (explicit?.[1]) {
    return explicit[1].trim();
  }
  return "";
}

function parseAssistantTitlePatch(text: string) {
  const quoted = extractQuotedText(text);
  if (/标题|名称|改名|重命名/.test(text) && quoted) {
    return quoted;
  }
  const match = text.match(/(?:标题|名称|改名|重命名)(?:改成|改为|设为|设置为|成|为)\s*([^，。,.；;]+)/);
  return match?.[1]?.trim() || "";
}

function parseAssistantDescriptionPatch(text: string) {
  const match = text.match(/(?:描述|说明|内容)(?:改成|改为|设为|设置为|成|为)\s*([^；;]+)/);
  return match?.[1]?.trim() || "";
}

function buildAssistantUpdatePatch(text: string): { patch: Partial<NewTaskInput>; summary: string } {
  const patch: Partial<NewTaskInput> = {};
  const summary: string[] = [];
  const priority = parseAssistantPriority(text);
  const status = parseAssistantStatus(text);
  const category = parseAssistantCategory(text);
  const dueDate = parseAssistantDueDate(text);
  const dueTime = /上午|下午|晚上|中午|早上|早晨|夜间|\d{1,2}[:：点]/.test(text) ? parseAssistantDueTime(text) : "";
  const title = parseAssistantTitlePatch(text);
  const description = parseAssistantDescriptionPatch(text);

  if (priority) {
    patch.priority = priority;
    summary.push(`优先级改为${priority}`);
  }
  if (status) {
    patch.status = status;
    summary.push(`状态改为${status}`);
  }
  if (category) {
    patch.category = category;
    patch.aiCategory = category;
    summary.push(`分类改为${category}`);
  }
  if (dueDate) {
    patch.dueDate = dueDate;
    summary.push(`截止日期改为${dueDate}`);
  }
  if (dueTime) {
    patch.dueTime = dueTime;
    summary.push(`截止时间改为${dueTime}`);
  }
  if (title) {
    patch.title = title;
    summary.push(`标题改为${title}`);
  }
  if (description) {
    patch.description = description;
    summary.push("描述已更新");
  }

  return { patch, summary: summary.join("，") };
}

function createInputFromTaskPatch(task: Task, patch: Partial<NewTaskInput>) {
  return {
    ...taskToInput(task),
    ...patch,
    tags: patch.category && !patch.tags ? Array.from(new Set([...task.tags, patch.category])).join(", ") : (patch.tags ?? task.tags.join(", ")),
    aiReason: patch.aiReason || task.aiReason,
    estimatedTime: patch.estimatedTime || task.estimatedTime,
    aiCategory: patch.aiCategory || patch.category || task.aiCategory,
  };
}

function parseAssistantIntent(text: string, tasks: Task[]): AssistantIntentResult {
  const normalized = normalizeAssistantText(text);
  if (!normalized) {
    return { type: "help" };
  }
  if (/^(帮助|help|怎么用|你能做什么)$/i.test(normalized)) {
    return { type: "help" };
  }
  if (/(创建|新建|添加|新增|加一个|帮我加)/.test(normalized)) {
    const prompt = normalized.replace(/^(请|帮我|麻烦)?\s*(创建|新建|添加|新增|加一个|帮我加)\s*/, "");
    return { type: "create", input: generateTaskFromPrompt(prompt || normalized) };
  }
  if (/(删除|移除)/.test(normalized)) {
    return { type: "delete", matches: findAssistantTaskMatches(tasks, normalized) };
  }
  if (/(打开|查看|详情)/.test(normalized)) {
    return { type: "open", matches: findAssistantTaskMatches(tasks, normalized) };
  }
  if (/(标记.*完成|完成|恢复)/.test(normalized)) {
    return { type: "toggle", matches: findAssistantTaskMatches(tasks, normalized), targetStatus: parseAssistantStatus(normalized) || undefined };
  }
  if (/(修改|更新|改成|改为|设为|设置|把|将|优先级|分类|截止|标题|名称|描述)/.test(normalized)) {
    const { patch, summary } = buildAssistantUpdatePatch(normalized);
    if (!Object.keys(patch).length) {
      return { type: "help" };
    }
    return { type: "update", matches: findAssistantTaskMatches(tasks, normalized), patch, summary };
  }
  return { type: "help" };
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
  const [session, setSession] = useState<DemoSession | null>(() => readStoredSession());
  const [profile, setProfile] = useState<ProfileState>(() => ({
    username: session?.name || "Demo User",
    email: session?.email || "demo@aitodo.local",
  }));
  const [tasks, setTasks] = useState<Task[]>(() => readStoredTasks());
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
  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => readStoredTheme());
  const [globalSearch, setGlobalSearch] = useState("");
  const [taskDetailState, setTaskDetailState] = useState<TaskDetailState>({ isLoading: false, error: "" });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);
  const activeToken = session?.isApiSession ? session.token : "";
  const markTaskDataChanged = useCallback(() => {
    setTaskVersion((value) => value + 1);
  }, []);

  const dismissToast = useCallback((id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, tone: ToastTone = "info") => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((currentToasts) => [...currentToasts.slice(-2), { id, message, title, tone }]);
  }, []);

  const clearSession = () => {
    setSession(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.history.pushState(null, "", "/login");
    setAuthMode("login");
    setSelectedTask(null);
    setEditingTask(null);
    setTaskDetailState({ isLoading: false, error: "" });
  };

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
      showToast("登录已过期", "请重新登录后继续操作。", "error");
      clearSession();
      return "登录已过期，请重新登录。";
    }

    const message = asErrorMessage(error);
    setApiState("offline");
    setApiMessage(message);
    showToast("请求失败", message, "error");
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
      setProfile({ username: me.username, email: me.email });
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
      setProfile({
        username: session?.name || "Demo User",
        email: session?.email || "demo@aitodo.local",
      });
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
      if (!isKnownPagePath(pathname)) {
        window.history.replaceState(null, "", pagePaths.dashboard);
        setActivePage("dashboard");
        return;
      }
      setActivePage(getPageFromPath(pathname));
    };

    syncPageFromPath();
    window.addEventListener("popstate", syncPageFromPath);
    return () => window.removeEventListener("popstate", syncPageFromPath);
  }, []);

  const navigateTo = (pageKey: PageKey) => {
    setActivePage(pageKey);
    pushAppPath(pageKey);
  };

  const authenticate = (nextSession: DemoSession) => {
    setSession(nextSession);
    setProfile({ username: nextSession.name, email: nextSession.email });
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

  const logout = async () => {
    if (activeToken) {
      try {
        await apiRequest<null>("/auth/logout", {
          method: "POST",
          token: activeToken,
        });
      } catch (error) {
        setApiMessage(asErrorMessage(error));
      }
    }
    clearSession();
  };

  const openTaskDetails = async (task: Task) => {
    setSelectedTask(task);
    setTaskDetailState({ isLoading: Boolean(activeToken), error: "" });
    if (!activeToken) {
      return;
    }

    try {
      const remoteTask = await apiRequest<ApiTask>(`/tasks/${task.id}`, { token: activeToken });
      setSelectedTask(mapApiTask(remoteTask));
      setTaskDetailState({ isLoading: false, error: "" });
    } catch (error) {
      setTaskDetailState({ isLoading: false, error: handleApiError(error) });
    }
  };

  const saveProfile = async (nextProfile: ProfileState) => {
    const username = nextProfile.username.trim();
    const email = nextProfile.email.trim();
    if (!username) {
      return "用户名不能为空。";
    }
    if (!isBackendCompatibleEmail(email)) {
      return "请输入有效邮箱，不能使用 .local 或 example.com 等保留域名。";
    }

    if (!activeToken) {
      setProfile({ username, email });
      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              name: username,
              email,
            }
          : currentSession,
      );
      return "已保存到本地演示资料。";
    }

    try {
      setApiState("loading");
      setApiMessage("正在保存 /users/me...");
      const user = await apiRequest<ApiUser>("/users/me", {
        method: "PUT",
        token: activeToken,
        body: JSON.stringify({ username, email }),
      });
      setProfile({ username: user.username, email: user.email });
      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              name: user.username,
              email: user.email,
            }
          : currentSession,
      );
      setApiState("online");
      setApiMessage("用户资料已同步后端");
      return "用户资料已保存到后端。";
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return handleApiError(error);
      }
      const message = asErrorMessage(error);
      setApiState("online");
      setApiMessage(message);
      return message;
    }
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
    const currentTask = tasks.find((item) => item.id === taskId);
    if (!currentTask) {
      return;
    }

    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage("正在更新任务状态...");
        const updatedStatus = await apiRequest<{ id: number; status: ApiTaskStatus; updated_at: string }>(`/tasks/${taskId}/status`, {
          method: "PATCH",
          token: activeToken,
          body: JSON.stringify({ status: currentTask.status === "已完成" ? "todo" : "done" }),
        });
        const nextStatus = statusFromApi(updatedStatus.status);
        const updateTaskStatus = (task: Task): Task => ({
          ...task,
          status: nextStatus,
          completedAt: nextStatus === "已完成" ? dateFromIso(updatedStatus.updated_at) : null,
        });
        setTasks((currentTasks) => currentTasks.map((task) => (task.id === taskId ? updateTaskStatus(task) : task)));
        setSelectedTask((currentTask) =>
          currentTask?.id === taskId ? updateTaskStatus(currentTask) : currentTask,
        );
        markTaskDataChanged();
        await loadRemoteWorkspace(activeToken);
        showToast(nextStatus === "已完成" ? "任务已完成" : "任务已恢复", currentTask.title, "success");
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
    markTaskDataChanged();
    const nextStatus = currentTask.status === "已完成" ? "待办" : "已完成";
    showToast(nextStatus === "已完成" ? "任务已完成" : "任务已恢复", currentTask.title, "success");
  };

  const requestDeleteTask = (taskId: number) => {
    const task = selectedTask?.id === taskId ? selectedTask : editingTask?.id === taskId ? editingTask : tasks.find((item) => item.id === taskId);
    if (task) {
      setDeleteCandidate(task);
    }
  };

  const deleteTask = async (taskId: number) => {
    const taskTitle = deleteCandidate?.id === taskId ? deleteCandidate.title : tasks.find((task) => task.id === taskId)?.title;
    setDeleteCandidate(null);
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
        setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
        markTaskDataChanged();
        await loadRemoteWorkspace(activeToken);
        showToast("任务已删除", taskTitle, "success");
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
    markTaskDataChanged();
    showToast("任务已删除", taskTitle, "success");
  };

  const createLocalTask = (input: NewTaskInput) => {
    const normalizedInput = normalizeTaskInput(input);
    const task: Task = {
      id: Math.max(0, ...tasks.map((item) => item.id)) + 1,
      title: normalizedInput.title,
      description: normalizedInput.description,
      status: normalizedInput.status,
      priority: normalizedInput.priority,
      category: normalizedInput.category,
      dueDate: normalizedInput.dueDate,
      dueTime: normalizedInput.dueTime,
      createdAt: dateFromToday(0),
      completedAt: normalizedInput.status === "已完成" ? dateFromToday(0) : null,
      tags: Array.from(
        new Set(
          normalizedInput.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
            .concat(normalizedInput.isAiCreated ? ["AI生成"] : []),
        ),
      ),
      aiReason: normalizedInput.aiReason || "AI 将根据截止时间、优先级和任务上下文持续更新建议。",
      estimatedTime: normalizedInput.estimatedTime || (normalizedInput.priority === "高" ? "2小时" : "1小时"),
      aiCategory: normalizedInput.aiCategory || normalizedInput.category,
      isAiCreated: Boolean(normalizedInput.isAiCreated),
      confidence: normalizedInput.confidence,
      rawDueText: normalizedInput.rawDueText,
      sourceText: normalizedInput.sourceText,
    };
    setTasks((currentTasks) => [task, ...currentTasks]);
    markTaskDataChanged();
    setCreateOpen(false);
    showToast("任务已创建", task.title, "success");
  };

  const createTask = async (input: NewTaskInput) => {
    const normalizedInput = normalizeTaskInput(input);
    if (activeToken) {
      try {
        setApiState("loading");
        setApiMessage(normalizedInput.isAiCreated ? "正在通过 AI 创建任务..." : "正在创建任务...");
        if (normalizedInput.isAiCreated && normalizedInput.aiBackendMode !== "frontend-fallback") {
          const data = await apiRequest<ApiAiCreateResponse>("/ai/create-task", {
            method: "POST",
            token: activeToken,
            body: JSON.stringify({
              text: normalizedInput.sourceText || `${normalizedInput.title}\n${normalizedInput.description}`.trim(),
              timezone: "Asia/Shanghai",
              overrides: inputToApiTaskPayload(normalizedInput),
            }),
          });
          setTasks((currentTasks) => [mapApiTask(data.task, data.parsed_task), ...currentTasks]);
        } else {
          const task = await apiRequest<ApiTask>("/tasks", {
            method: "POST",
            token: activeToken,
            body: JSON.stringify(inputToApiTaskPayload(normalizedInput)),
          });
          setTasks((currentTasks) => [mapApiTask(task), ...currentTasks]);
        }
        markTaskDataChanged();
        setCreateOpen(false);
        await loadRemoteWorkspace(activeToken);
        showToast("任务已创建", normalizedInput.title, "success");
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    createLocalTask(normalizedInput);
  };

  const updateTask = async (taskId: number, input: NewTaskInput) => {
    const normalizedInput = normalizeTaskInput(input);
    if (activeToken) {
      try {
	        setApiState("loading");
	        setApiMessage("正在保存任务...");
	        const task = await apiRequest<ApiTask>(`/tasks/${taskId}`, {
	          method: "PUT",
	          token: activeToken,
	          body: JSON.stringify({
	            ...inputToApiTaskPayload(normalizedInput),
	            status: statusToApi(normalizedInput.status),
	          }),
	        });
        const updatedTask = mapApiTask(task);
        setTasks((currentTasks) => currentTasks.map((currentTask) => (currentTask.id === taskId ? updatedTask : currentTask)));
        setSelectedTask((currentTask) => (currentTask?.id === taskId ? updatedTask : currentTask));
        setEditingTask(null);
        markTaskDataChanged();
        await loadRemoteWorkspace(activeToken);
        showToast("任务已更新", updatedTask.title, "success");
      } catch (error) {
        handleApiError(error);
      }
      return;
    }

    const originalTask = tasks.find((task) => task.id === taskId);
    if (originalTask) {
      const updatedTask = mergeTaskInput(originalTask, normalizedInput);
      setTasks((currentTasks) =>
        currentTasks.map((task) => {
          if (task.id !== taskId) {
            return task;
          }
          return updatedTask;
        }),
      );
      setSelectedTask((currentTask) => (currentTask?.id === taskId ? updatedTask : currentTask));
      setEditingTask(null);
      markTaskDataChanged();
      showToast("任务已更新", updatedTask.title, "success");
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
      return { ...mapParsedTaskToInput(data.parsed_task, prompt), aiBackendMode: "backend" as const };
    } catch (error) {
      if (isAiConfigError(error)) {
        const message = asErrorMessage(error);
        setApiState("online");
        setApiMessage(message);
        return buildFrontendFallbackTask(prompt, message);
      }
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
        source: "前端规则兜底",
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
        source: "/ai/suggest",
      };
    } catch (error) {
      if (isAiConfigError(error)) {
        const suggestion = generateTaskFromPrompt(`${title}\n${description}`);
        setApiState("online");
        setApiMessage(asErrorMessage(error));
        return {
          priority: suggestion.priority,
          category: suggestion.category,
          reason: "后端 AI Key 未配置，已使用前端规则推荐分类与优先级。",
          source: "前端规则兜底",
        };
      }
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
      if (error instanceof ApiError && error.status === 401) {
        return handleApiError(error);
      }
      const message = asErrorMessage(error);
      setApiState("online");
      setApiMessage(message);
      return message;
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
      if (isAiConfigError(error)) {
        const message = asErrorMessage(error);
        setApiState("online");
        setApiMessage(message);
        return message;
      }
      if (error instanceof ApiError && error.status === 401) {
        return handleApiError(error);
      }
      const message = asErrorMessage(error);
      setApiState("online");
      setApiMessage(message);
      return message;
    }
  };

  const page = (
    <PageRenderer
      activePage={activePage}
      categories={visibleCategories}
      globalSearch={globalSearch}
      isApiMode={Boolean(activeToken)}
      onDelete={requestDeleteTask}
      onCreateTask={() => setCreateOpen(true)}
      onEditTask={setEditingTask}
      onApiError={handleApiError}
      onOpenTask={openTaskDetails}
      onPageChange={navigateTo}
      onSaveProfile={saveProfile}
      onSaveSettings={saveSettings}
      onSuggestTaskFields={suggestTaskFields}
      onTestOpenAIKey={testOpenAIKey}
      onToggleComplete={toggleComplete}
      profile={profile}
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
    <Layout
      activePage={activePage}
      apiMessage={apiMessage}
      apiState={apiState}
      globalSearch={globalSearch}
      isDark={isDark}
      navItems={navItems}
      onCreateTask={() => setCreateOpen(true)}
      onLogout={logout}
      onNavigate={(pageKey) => navigateTo(pageKey as PageKey)}
      onSearchChange={setGlobalSearch}
      onToggleTheme={() => setIsDark((value) => !value)}
      userName={session.name}
    >
      {page}
      <TaskDetailDrawer
        detailState={taskDetailState}
        isApiMode={Boolean(activeToken)}
        onClose={() => setSelectedTask(null)}
        onDelete={requestDeleteTask}
        onEdit={setEditingTask}
        onToggleComplete={toggleComplete}
        task={selectedTask}
      />
      {isCreateOpen && (
        <CreateTaskModal
          categories={visibleCategories}
          isApiMode={Boolean(activeToken)}
          onClose={() => setCreateOpen(false)}
          onCreate={createTask}
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
      {deleteCandidate && (
        <DeleteConfirmModal
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => {
            void deleteTask(deleteCandidate.id);
          }}
          task={deleteCandidate}
        />
      )}
      <TaskAssistant
        onCreateTask={createTask}
        onDeleteTask={deleteTask}
        onOpenTask={openTaskDetails}
        onToggleComplete={toggleComplete}
        onUpdateTask={updateTask}
        tasks={tasks}
      />
      <ToastViewport items={toasts} onDismiss={dismissToast} />
    </Layout>
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
          <span>AI 任务助手</span>
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
  onSaveProfile: (profile: ProfileState) => Promise<string | void>;
  onSaveSettings: (settings: SettingsState) => Promise<string | void>;
  onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion>;
  onTestOpenAIKey: (settings: SettingsState) => Promise<string>;
  onToggleComplete: (taskId: number) => void;
  profile: ProfileState;
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
  onSaveProfile,
  onSaveSettings,
  onSuggestTaskFields,
  onTestOpenAIKey,
  onToggleComplete,
  profile,
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

  if (activePage === "today") {
    return (
      <TodayTasksPage
        onDelete={onDelete}
        onEditTask={onEditTask}
        onOpenTask={onOpenTask}
        onToggleComplete={onToggleComplete}
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
    return (
      <AIPage
        isApiMode={isApiMode}
        onApiError={onApiError}
        onOpenTask={onOpenTask}
        onSuggestTaskFields={onSuggestTaskFields}
        recommendedTasks={recommendedTasks}
        taskVersion={taskVersion}
        token={token}
      />
    );
  }

  if (activePage === "calendar") {
    return (
      <CalendarPage
        isApiMode={isApiMode}
        onApiError={onApiError}
        onOpenTask={onOpenTask}
        taskVersion={taskVersion}
        tasks={tasks}
        token={token}
      />
    );
  }

  if (activePage === "stats") {
    return (
      <StatsPage
        isApiMode={isApiMode}
        onApiError={onApiError}
        remoteStats={remoteStats}
        taskVersion={taskVersion}
        tasks={tasks}
        token={token}
      />
    );
  }

  if (activePage === "settings") {
    return <SettingsPage onSave={onSaveSettings} onSaveProfile={onSaveProfile} onTest={onTestOpenAIKey} profile={profile} settings={settings} />;
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
  const { aiPriorityCount, completedToday, overdueCount, todayTasks } = getTaskOverview(tasks);

  return (
    <MinimalDashboard
      aiPriorityCount={aiPriorityCount}
      completedToday={completedToday}
      onOpenTask={(task) => onOpenTask(task as Task)}
      onPageChange={() => onPageChange("all")}
      onToggleComplete={onToggleComplete}
      overdueCount={overdueCount}
      recommendedTasks={recommendedTasks}
      todayTasks={todayTasks}
    />
  );
}

function TodayTasksPage({
  onDelete,
  onEditTask,
  onOpenTask,
  onToggleComplete,
  tasks,
}: {
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onToggleComplete: (taskId: number) => void;
  tasks: Task[];
}) {
  const todayTasks = tasks
    .filter((task) => isToday(task.dueDate))
    .sort((left, right) => (left.dueTime || "23:59").localeCompare(right.dueTime || "23:59"));
  const done = todayTasks.filter((task) => task.status === "已完成").length;
  const remaining = todayTasks.length - done;
  const aiRecommended = todayTasks.filter(isAiPriorityTask).length;

  return (
    <main className="page-content">
      <PageHeading title="今日任务" />
      <section className="stats-grid">
        <StatsCard icon={CalendarDays} label="今日任务" value={todayTasks.length} tone="blue" />
        <StatsCard icon={CheckCircle2} label="已完成" value={done} tone="green" />
        <StatsCard icon={Clock3} label="待处理" value={remaining} tone="purple" />
        <StatsCard icon={Sparkles} label="AI 重点" value={aiRecommended} tone="purple" />
      </section>
      <section className="content-card table-card">
        <div className="section-title">
          <div>
            <h2>今天的执行清单</h2>
            <p>按截止时段排列，点击任务可打开详情抽屉。</p>
          </div>
        </div>
        <TaskTable
          onDelete={onDelete}
          onEditTask={onEditTask}
          onOpenTask={onOpenTask}
          onToggleComplete={onToggleComplete}
          tasks={todayTasks}
        />
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
    <article className={`stats-card ${tone}`} data-value={value}>
      <span>
        <Icon size={20} />
      </span>
      <div>
        <p>{label}</p>
        <strong key={value}>{value}</strong>
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
          tasks.map((task, index) => (
            <button
              className="ai-recommend-item"
              key={task.id}
              style={{ "--stagger-index": index } as CSSProperties}
              type="button"
              onClick={() => onOpenTask(task)}
            >
              <div>
                <strong>{task.title}</strong>
                <p>推荐原因：{task.aiReason}</p>
                <div className="ai-recommend-meta">
                  <span>AI 分类：{task.aiCategory}</span>
                  <span>预计：{task.estimatedTime}</span>
                  <span>截止：{formatDue(task)}</span>
                </div>
              </div>
              <span className={`priority-badge priority-${task.priority}`}>{task.priority}</span>
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
  const isDone = task.status === "已完成";

  return (
    <article className={`task-card motion-enter ${isDone ? "is-complete" : ""} ${task.priority === "高" ? "is-high-priority" : ""}`} onClick={() => onOpen(task)}>
      <button
        className={`task-check ${isDone ? "checked" : ""}`}
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
          <h3 className={isDone ? "task-title-done" : ""}>{task.title}</h3>
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

function AITag({ children, confidence }: { children: ReactNode; confidence?: number }) {
  return (
    <span className="ai-brand-tag">
      <Sparkles size={12} />
      {children}
      {confidence ? <i>{Math.round(confidence * 100)}%</i> : null}
    </span>
  );
}

function AIReasonBlock({ reason, source }: { reason: string; source?: string }) {
  return (
    <div className="ai-reason-block">
      <div className="ai-reason-header">
        <Sparkles size={16} />
        <strong>AI 智能分析</strong>
        {source ? <AITag>{source}</AITag> : null}
      </div>
      <p>{reason}</p>
    </div>
  );
}

function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

function useAnimatedDismiss(onClose: () => void, duration = OVERLAY_EXIT_MS, resetKey?: unknown) {
  const [isClosing, setClosing] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setClosing(false);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [resetKey]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const closeWithAnimation = useCallback((afterClose = onClose) => {
    if (isClosing) {
      return;
    }
    setClosing(true);
    timeoutRef.current = window.setTimeout(() => {
      afterClose();
    }, duration);
  }, [duration, isClosing, onClose]);

  return { closeWithAnimation, isClosing };
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
      <PageHeading title="全部任务" />
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

  if (!tasks.length) {
    return (
      <div className="responsive-task-container">
        <EmptyState title="没有匹配任务" description="调整搜索词或筛选条件后再试一次。" />
      </div>
    );
  }

  return (
    <div className="responsive-task-container">
      <div className="desktop-table-wrapper task-table-wrap">
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
            {tasks.map((task, index) => (
                <tr
                  className={`task-table-row ${task.status === "已完成" ? "is-complete" : ""} ${task.priority === "高" ? "is-high-priority" : ""}`}
                  key={task.id}
                  style={{ "--stagger-index": index } as CSSProperties}
                  onClick={() => {
                    setOpenMenuTaskId(null);
                    onOpenTask(task);
                  }}
                >
                <td>
                  <div className="table-title">
                    <strong className={task.status === "已完成" ? "task-title-done" : ""}>{task.title}</strong>
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
                  <TaskRowActions
                    isMenuOpen={openMenuTaskId === task.id}
                    onDelete={onDelete}
                    onEditTask={onEditTask}
                    onMenuChange={setOpenMenuTaskId}
                    onOpenTask={onOpenTask}
                    onToggleComplete={onToggleComplete}
                    task={task}
                  />
                </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mobile-card-list">
        {tasks.map((task, index) => (
          <article
            className={`mobile-task-card ${task.status === "已完成" ? "is-complete" : ""} ${task.priority === "高" ? "is-high-priority" : ""}`}
            key={task.id}
            style={{ "--stagger-index": index } as CSSProperties}
            onClick={() => onOpenTask(task)}
          >
            <div className="mobile-task-card-header">
              <div className="mobile-task-title">
                <button
                  className={`task-check ${task.status === "已完成" ? "checked" : ""}`}
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleComplete(task.id);
                  }}
                  aria-label={toggleTaskActionLabel(task.status)}
                  title={toggleTaskActionLabel(task.status)}
                >
                  {task.status === "已完成" && <Check size={14} />}
                </button>
                <strong className={task.status === "已完成" ? "task-title-done" : ""}>{task.title}</strong>
              </div>
              <button
                className="mobile-card-more"
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenMenuTaskId((currentTaskId) => (currentTaskId === task.id ? null : task.id));
                }}
                aria-expanded={openMenuTaskId === task.id}
                aria-label="更多操作"
              >
                <MoreHorizontal size={18} />
              </button>
            </div>
            {task.description && <p>{task.description}</p>}
            <div className="mobile-task-meta">
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <span>{task.category}</span>
              <span>{formatDue(task)}</span>
              {task.isAiCreated && <span className="ai-tiny-tag">AI</span>}
            </div>
            {openMenuTaskId === task.id && (
              <div className="mobile-quick-actions" onClick={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => onOpenTask(task)}>
                  查看详情
                </button>
                <button type="button" onClick={() => onEditTask(task)}>
                  编辑
                </button>
                <button className="danger" type="button" onClick={() => onDelete(task.id)}>
                  删除
                </button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function TaskRowActions({
  isMenuOpen,
  onDelete,
  onEditTask,
  onMenuChange,
  onOpenTask,
  onToggleComplete,
  task,
}: {
  isMenuOpen: boolean;
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onMenuChange: (taskId: number | null | ((currentTaskId: number | null) => number | null)) => void;
  onOpenTask: (task: Task) => void;
  onToggleComplete: (taskId: number) => void;
  task: Task;
}) {
  return (
    <div className="row-actions">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onMenuChange(null);
          onOpenTask(task);
        }}
        aria-label="查看详情"
        title="查看详情"
      >
        <FileText size={15} />
      </button>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onMenuChange(null);
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
          onMenuChange(null);
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
          onMenuChange(null);
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
          onMenuChange((currentTaskId) => (currentTaskId === task.id ? null : task.id));
        }}
        aria-expanded={isMenuOpen}
        aria-label="更多操作"
      >
        <MoreHorizontal size={15} />
      </button>
      {isMenuOpen && (
        <div className="row-menu" role="menu" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onMenuChange(null);
              onOpenTask(task);
            }}
          >
            查看详情
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onMenuChange(null);
              onEditTask(task);
            }}
          >
            编辑任务
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onMenuChange(null);
              onDelete(task.id);
            }}
          >
            删除任务
          </button>
        </div>
      )}
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
      <PageHeading title="任务看板" />
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
        {(isApiMode ? apiStatusOptions : statusOptions).map((status, index) => (
          <TaskColumn
            columnIndex={index}
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
  columnIndex: number;
  onOpenTask: (task: Task) => void;
  status: TaskStatus;
  tasks: Task[];
}

function TaskColumn({ columnIndex, onOpenTask, status, tasks }: TaskColumnProps) {
  return (
    <section className="task-column" style={{ "--stagger-index": columnIndex } as CSSProperties}>
      <header>
        <h2>{status}</h2>
        <span>{tasks.length}</span>
      </header>
      <div className="task-column-list">
        {tasks.length ? (
          tasks.map((task, index) => (
            <button
              className={`kanban-card ${task.status === "已完成" ? "is-complete" : ""} ${task.priority === "高" ? "is-high-priority" : ""}`}
              key={task.id}
              style={{ "--stagger-index": index } as CSSProperties}
              type="button"
              onClick={() => onOpenTask(task)}
            >
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
  isApiMode,
  onApiError,
  onOpenTask,
  onSuggestTaskFields,
  recommendedTasks,
  taskVersion,
  token,
}: {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onOpenTask: (task: Task) => void;
  onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion>;
  recommendedTasks: Task[];
  taskVersion: number;
  token: string;
}) {
  return (
    <main className="page-content">
      <PageHeading title="AI 推荐" />
      <AIAssistantCard onOpenTask={onOpenTask} tasks={recommendedTasks} />
      <AISuggestTool onSuggestTaskFields={onSuggestTaskFields} />
      <AILogsPanel isApiMode={isApiMode} onApiError={onApiError} taskVersion={taskVersion} token={token} />
    </main>
  );
}

function formatAiLogOutput(output: unknown) {
  if (typeof output === "string") {
    try {
      return formatAiLogOutput(JSON.parse(output));
    } catch {
      return output.slice(0, 120);
    }
  }

  if (!output || typeof output !== "object") {
    return "无结构化输出";
  }

  const record = output as Record<string, unknown>;
  const parsed = record.parsed_task as Record<string, unknown> | undefined;
  const task = record.task as Record<string, unknown> | undefined;
  const title = parsed?.title || task?.title || record.title;
  const category = parsed?.category || task?.category || record.category;
  const priority = parsed?.priority || task?.priority || record.priority;
  const reason = record.reason;
  if (title) {
    return `${String(title)}${category ? ` / ${String(category)}` : ""}${priority ? ` / ${String(priority)}` : ""}`;
  }
  if (reason) {
    return `${category ? `${String(category)} / ` : ""}${priority ? `${String(priority)} / ` : ""}${String(reason)}`;
  }
  return JSON.stringify(output).slice(0, 120);
}

function AILogsPanel({
  isApiMode,
  onApiError,
  taskVersion,
  token,
}: {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  taskVersion: number;
  token: string;
}) {
  const [status, setStatus] = useState<"全部" | ApiAiLog["status"]>("全部");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<ApiAiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);
  const pageSize = 5;

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    if (!isApiMode || !token) {
      setLogs([]);
      setTotal(0);
      return;
    }

    let isCancelled = false;
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (status !== "全部") {
      params.set("status", status);
    }
    setLoading(true);
    setError("");
    void apiRequest<ApiPageResult<ApiAiLog>>(`/ai/logs?${params.toString()}`, { token })
      .then((data) => {
        if (!isCancelled) {
          setLogs(data.items);
          setTotal(data.pagination.total);
        }
      })
      .catch((requestError) => {
        if (!isCancelled) {
          setError(onApiError(requestError));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isApiMode, onApiError, page, status, taskVersion, token]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <section className="content-card ai-logs-panel">
      <div className="section-title">
        <div>
          <h2>AI 调用记录</h2>
          <p>来自 /ai/logs，用于确认解析、创建和推荐请求已由后端处理。</p>
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value as typeof status)}>
          <option value="全部">全部状态</option>
          <option value="success">success</option>
          <option value="mocked">mocked</option>
          <option value="failed">failed</option>
        </select>
      </div>
      {!isApiMode ? (
        <EmptyState title="本地演示模式无 AI 日志" description="登录后端账号后，这里会展示真实 /ai/logs 返回。" />
      ) : isLoading ? (
        <p className="table-state">正在读取 AI 日志...</p>
      ) : error ? (
        <p className="form-error">{error}</p>
      ) : logs.length ? (
        <>
          <div className="ai-log-list">
            {logs.map((log) => (
              <article className="ai-log-row" key={log.id}>
                <span className={`ai-log-status ${log.status}`}>{log.status}</span>
                <div>
                  <strong>{log.input_text}</strong>
                  <p>{formatAiLogOutput(log.output_json)}</p>
                </div>
                <small>
                  {log.model_name || "mock"}
                  <br />
                  {new Date(log.created_at).toLocaleString()}
                </small>
              </article>
            ))}
          </div>
          <div className="pagination-row">
            <button className="ghost-button" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>
              上一页
            </button>
            <span>
              第 {page} / {totalPages} 页
            </span>
            <button
              className="ghost-button"
              type="button"
              onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
              disabled={page >= totalPages}
            >
              下一页
            </button>
          </div>
        </>
      ) : (
        <EmptyState title="暂无 AI 调用记录" description="使用 AI 生成任务或获取字段建议后会出现记录。" />
      )}
    </section>
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
    source: "前端规则兜底",
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
          {isLoading ? (
            <>
              分析中
              <span className="thinking-dots" aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </>
          ) : (
            "获取建议"
          )}
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
          <Field label="建议来源">{suggestion.source || "/ai/suggest"}</Field>
          <p>{suggestion.reason}</p>
          {error && <p className="form-error">{error}</p>}
        </div>
      </div>
    </section>
  );
}

function CalendarPage({
  isApiMode,
  onApiError,
  onOpenTask,
  taskVersion,
  tasks,
  token,
}: {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onOpenTask: (task: Task) => void;
  taskVersion: number;
  tasks: Task[];
  token: string;
}) {
  const [view, setView] = useState<CalendarView>("7");
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([]);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const dayCount = view === "14" ? 14 : view === "30" ? 30 : 7;
  const days = Array.from({ length: dayCount }, (_, index) => dateFromToday(index));
  const calendarTasks = isApiMode ? remoteTasks : tasks;
  const todayTimedTasks = calendarTasks.filter((task) => isToday(task.dueDate) && Boolean(task.dueTime));
  const todayUntimedTasks = calendarTasks.filter((task) => isToday(task.dueDate) && !task.dueTime);
  const unscheduledTasks = tasks.filter((task) => !task.dueDate);
  const overdueTasks = calendarTasks.filter(isOverdue).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const currentHour = new Date().getHours();

  useEffect(() => {
    if (!isApiMode || !token) {
      return;
    }

    let isCancelled = false;
    const params = new URLSearchParams({
      page: "1",
      page_size: "100",
      sort_by: "due_time",
      sort_order: "asc",
    });

    if (view === "overdue") {
      params.set("status", "todo");
      params.set("due_to", apiRangeIso(dateFromToday(-1), "23:59"));
    } else {
      const endOffset = view === "24h" ? 0 : dayCount - 1;
      const range = buildDateRange(dateFromToday(0), dateFromToday(endOffset));
      params.set("due_from", range.from);
      params.set("due_to", range.to);
    }

    setRemoteLoading(true);
    setRemoteError("");
    void apiRequest<ApiPageResult<ApiTask>>(`/tasks?${params.toString()}`, { token })
      .then((data) => {
        if (!isCancelled) {
          setRemoteTasks(data.items.map((item) => mapApiTask(item)));
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setRemoteError(onApiError(error));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setRemoteLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [dayCount, isApiMode, onApiError, taskVersion, token, view]);

  return (
    <main className="page-content">
      <PageHeading title="日历" />
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
      {isRemoteLoading && <p className="table-state">正在同步当前日历范围...</p>}
      {remoteError && <p className="form-error">{remoteError}</p>}

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
            const dayTasks = calendarTasks.filter((task) => task.dueDate === day);
            return (
              <section className={`calendar-day ${day === dateFromToday(0) ? "today" : ""}`} key={day}>
                <strong>{day}</strong>
                {dayTasks.length ? (
                  dayTasks.map((task) => (
                    <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                      <strong className="calendar-task-title">{task.title}</strong>
                      <span className="calendar-task-time">{task.dueTime || "全天"}</span>
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

function StatsPage({
  isApiMode,
  onApiError,
  remoteStats,
  taskVersion,
  tasks,
  token,
}: {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  remoteStats: RemoteStatsState;
  taskVersion: number;
  tasks: Task[];
  token: string;
}) {
  const [range, setRange] = useState<"7" | "24h">("7");
  const [rangeStats, setRangeStats] = useState<RemoteStatsState | null>(null);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const statsSource = rangeStats || remoteStats;
  const localDone = tasks.filter((task) => task.status === "已完成").length;
  const totalTasks = statsSource.overview?.total_tasks ?? tasks.length;
  const done = statsSource.overview?.done_tasks ?? localDone;
  const todo = statsSource.overview?.todo_tasks ?? tasks.length - localDone;
  const completion = statsSource.overview ? Math.round(statsSource.overview.completion_rate * 100) : tasks.length ? Math.round((localDone / tasks.length) * 100) : 0;
  const aiCreated = statsSource.overview?.ai_created_tasks ?? tasks.filter((task) => task.isAiCreated).length;
  const todayDue = statsSource.overview?.today_due_tasks ?? tasks.filter((task) => isToday(task.dueDate)).length;
  const overdueTotal = statsSource.overview?.overdue_tasks ?? tasks.filter(isOverdue).length;
  const categoryStats = statsSource.categories.length
    ? statsSource.categories.map((item) => [item.category, item.total] as [string, number])
    : Array.from(tasks.reduce((map, task) => map.set(task.category, (map.get(task.category) || 0) + 1), new Map<string, number>())).sort(
        (left, right) => right[1] - left[1],
      );
  const priorityStats = statsSource.priorities.length
    ? statsSource.priorities.map((item) => ({
        priority: priorityFromApi(item.priority),
        total: item.total,
      }))
    : priorityOptions.map((priority) => ({
        priority,
        total: tasks.filter((task) => task.priority === priority).length,
      }));
  const trendDayCount = 7;
  const trendDays = Array.from({ length: trendDayCount }, (_, index) => dateFromToday(index - trendDayCount + 1));
  const localTrend = trendDays.map((day) => ({
    day,
    created: tasks.filter((task) => task.createdAt === day).length,
    done: tasks.filter((task) => task.completedAt === day).length,
  }));
  const remoteTrend = statsSource.trend.map((item) => ({ day: item.date, created: item.created, done: item.done })).slice(-trendDayCount);
  const trend = remoteTrend.length ? remoteTrend : localTrend;
  const maxTrendValue = Math.max(1, ...trend.map((item) => Math.max(item.created, item.done)));
  const hourlyTrend = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    due: tasks.filter((task) => isToday(task.dueDate) && parseHour(task.dueTime) === hour).length,
  }));
  const maxHourlyValue = Math.max(1, ...hourlyTrend.map((item) => item.due));

  useEffect(() => {
    if (!isApiMode || !token) {
      setRangeStats(null);
      return;
    }

    let isCancelled = false;
    const days = 7;
    const endDate = dateFromToday(0);
    const startDate = range === "24h" ? endDate : dateFromToday(-(days - 1));
    const rangeQuery = new URLSearchParams(buildDateRange(startDate, endDate)).toString();

    setRemoteLoading(true);
    setRemoteError("");
    void Promise.all([
      apiRequest<ApiStatsOverview>(`/stats/overview?${rangeQuery}`, { token }),
      apiRequest<ApiCategoryStats[]>(`/stats/category?${rangeQuery}`, { token }),
      apiRequest<ApiTrendStats[]>(`/stats/trend?days=${days}`, { token }),
    ])
      .then(([overview, categories, trend]) => {
        if (!isCancelled) {
          setRangeStats({
            overview,
            categories,
            priorities: remoteStats.priorities,
            trend,
          });
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setRemoteError(onApiError(error));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setRemoteLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isApiMode, onApiError, range, remoteStats.priorities, taskVersion, token]);

  return (
    <main className="page-content">
      <PageHeading title="数据统计" />
      {isRemoteLoading && <p className="table-state">正在同步统计范围...</p>}
      {remoteError && <p className="form-error">{remoteError}</p>}
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

function SettingsPage({
  onSave,
  onSaveProfile,
  onTest,
  profile,
  settings,
}: {
  onSave: (settings: SettingsState) => Promise<string | void>;
  onSaveProfile: (profile: ProfileState) => Promise<string | void>;
  onTest: (settings: SettingsState) => Promise<string>;
  profile: ProfileState;
  settings: SettingsState;
}) {
  const [draft, setDraft] = useState(settings);
  const [profileDraft, setProfileDraft] = useState(profile);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"idle" | "success" | "failed">("idle");
  const [isSaving, setSaving] = useState(false);
  const [isSavingProfile, setSavingProfile] = useState(false);
  const [isTesting, setTesting] = useState(false);
  const apiBaseUrl = API_BASE_URL;

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  useEffect(() => {
    setProfileDraft(profile);
  }, [profile]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setFeedback("");
    try {
      const message = await onSaveProfile(profileDraft);
      const isFailure = (message || "").includes("不能") || (message || "").includes("无效") || (message || "").includes("不能为空");
      setFeedback(message || "用户资料已保存。");
      setFeedbackTone(isFailure ? "failed" : "success");
    } catch (error) {
      setFeedback(asErrorMessage(error));
      setFeedbackTone("failed");
    } finally {
      setSavingProfile(false);
    }
  };

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
      <PageHeading title="设置" />
      <section className="settings-layout">
        <form className="content-card settings-form" onSubmit={saveProfile}>
          <h2>个人资料</h2>
          <label>
            用户名
            <input
              value={profileDraft.username}
              onChange={(event) => setProfileDraft({ ...profileDraft, username: event.target.value })}
              placeholder="请输入用户名"
            />
          </label>
          <label>
            邮箱
            <input
              value={profileDraft.email}
              onChange={(event) => setProfileDraft({ ...profileDraft, email: event.target.value })}
              placeholder="you@qq.com"
            />
          </label>
          <div className="settings-actions">
            <button className="primary-button" type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? "保存中..." : "保存资料"}
            </button>
          </div>
          <p>保存会调用 /users/me，用于验证后端用户资料更新能力。</p>
        </form>

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
      <PageHeading title={label} />
      <section className="content-card empty-module">
        <FileText size={32} />
        <h2>{label}</h2>
        <p>这里会承载项目的扩展能力，例如个人设置和更多 AI 工作流。</p>
      </section>
    </main>
  );
}

function PageHeading({ action, description, title }: { action?: ReactNode; description?: string; title: string }) {
  return (
    <div className="page-heading">
      <div>
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </div>
      {action ? <div className="page-heading-action">{action}</div> : null}
    </div>
  );
}

interface TaskDetailDrawerProps {
  detailState: TaskDetailState;
  isApiMode: boolean;
  onClose: () => void;
  onDelete: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onToggleComplete: (taskId: number) => void;
  task: Task | null;
}

function TaskDetailDrawer({ detailState, isApiMode, onClose, onDelete, onEdit, onToggleComplete, task }: TaskDetailDrawerProps) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, OVERLAY_EXIT_MS, task?.id ?? null);
  useEscapeToClose(closeWithAnimation);

  if (!task) {
    return null;
  }

  return (
    <>
      <button
        className={`drawer-backdrop ${isClosing ? "closing" : ""}`}
        type="button"
        onClick={() => closeWithAnimation()}
        aria-label="关闭任务详情遮罩"
      />
      <aside className={`drawer ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">任务详情</p>
            <h2>{task.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭详情">
            <X size={18} />
          </button>
        </div>
        {detailState.isLoading && <p className="table-state">{`正在读取 /tasks/${task.id} ...`}</p>}
        {detailState.error && <p className="form-error">{detailState.error}</p>}
        <p className="drawer-description">{task.description || "暂无描述。"}</p>
        <div className="drawer-fields">
          <Field label="状态"><StatusBadge status={task.status} /></Field>
          <Field label="优先级"><PriorityBadge priority={task.priority} /></Field>
          <Field label="截止时间">{formatDue(task)}</Field>
          {!isApiMode && <Field label="标签">{task.tags.join(" / ") || "未设置"}</Field>}
          <Field label="创建来源">{task.isAiCreated ? "AI 生成" : "自定义创建"}</Field>
        </div>
        <section className="subtasks">
          <h3>子任务</h3>
          {isApiMode ? (
            <p>后端任务模型暂未提供子任务字段，前端不再展示假数据。</p>
          ) : (
            <>
              <label><input type="checkbox" /> 确认字段结构</label>
              <label><input type="checkbox" /> 联调后端接口</label>
              <label><input type="checkbox" /> 补充验收截图</label>
            </>
          )}
        </section>
        <section className="ai-analysis">
          <div className="ai-analysis-heading">
            <Sparkles size={18} />
            <h3>AI 分析结果</h3>
            {task.isAiCreated && <AITag confidence={task.confidence}>AI 生成</AITag>}
          </div>
          <div className="ai-analysis-grid">
            <Field label="AI 自动分类">{task.aiCategory}</Field>
            <Field label="AI 推荐优先级">{task.priority}</Field>
            <Field label="AI 预计完成时间">{task.estimatedTime}</Field>
            <Field label="AI 解析置信度">{task.confidence ? `${Math.round(task.confidence * 100)}%` : "待确认"}</Field>
          </div>
          <AIReasonBlock
            reason={task.aiReason || "该任务建议安排在今天下午完成，因为它优先级较高，并且会影响后续开发进度。"}
            source={task.isAiCreated ? "任务生成" : "任务分析"}
          />
        </section>
        <div className="drawer-actions">
          <button className="ghost-button" type="button" onClick={() => onEdit(task)}>
            编辑任务
          </button>
          <button className="primary-button" type="button" onClick={() => onToggleComplete(task.id)}>
            {task.status === "已完成" ? "恢复待办" : "标记完成"}
          </button>
          <button className="danger-button" type="button" onClick={() => onDelete(task.id)}>
            删除任务
          </button>
        </div>
      </aside>
    </>
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
}

interface EditTaskModalProps {
  categories: string[];
  isApiMode: boolean;
  onClose: () => void;
  onUpdate: (input: NewTaskInput) => void;
  task: Task;
}

function DeleteConfirmModal({
  onCancel,
  onConfirm,
  task,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  task: Task;
}) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onCancel, OVERLAY_EXIT_MS);
  useEscapeToClose(closeWithAnimation);

  return (
    <div className={`modal-backdrop ${isClosing ? "closing" : ""}`}>
      <div className={`create-modal confirm-modal ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Delete Task</p>
            <h2>确认删除任务？</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭确认">
            <X size={18} />
          </button>
        </div>
        <p className="drawer-description">删除后无法恢复。请确认是否删除以下任务：</p>
        <div className="confirm-target">
          <strong>{task.title}</strong>
          {task.description && <span>{task.description}</span>}
        </div>
        <div className="preview-actions">
          <button className="ghost-button" type="button" onClick={() => closeWithAnimation()}>
            取消
          </button>
          <button className="danger-button" type="button" onClick={() => closeWithAnimation(onConfirm)}>
            确认删除
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTaskModal({ categories, isApiMode, onClose, onUpdate, task }: EditTaskModalProps) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, OVERLAY_EXIT_MS);
  useEscapeToClose(closeWithAnimation);

  const [form, setForm] = useState<NewTaskInput>(() => taskToInput(task));

  const submitEdit = (input: NewTaskInput) => {
    if (!input.title.trim()) {
      return;
    }
    onUpdate(input);
  };

  return (
    <div className={`modal-backdrop ${isClosing ? "closing" : ""}`}>
      <div className={`create-modal ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Edit Task</p>
            <h2>编辑任务</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭弹窗">
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

function CreateTaskModal({ categories, isApiMode, onClose, onCreate }: CreateTaskModalProps) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, OVERLAY_EXIT_MS);
  useEscapeToClose(closeWithAnimation);

  const [form, setForm] = useState<NewTaskInput>(() => createEmptyTask());

  const submitManual = (input: NewTaskInput) => {
    if (!input.title.trim()) {
      return;
    }
    onCreate(input);
  };

  return (
    <div className={`modal-backdrop ${isClosing ? "closing" : ""}`}>
      <div className={`create-modal ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Create Task</p>
            <h2>新建任务</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭弹窗">
            <X size={18} />
          </button>
        </div>
        <ManualTaskForm categories={categories} form={form} isApiMode={isApiMode} onChange={setForm} onSubmit={submitManual} />
      </div>
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
  const [validationError, setValidationError] = useState("");
  const statusChoices = isApiMode ? apiStatusOptions : statusOptions;
  const safeStatus = statusChoices.includes(form.status) ? form.status : "待办";
  const categoryOptions = Array.from(new Set([form.category, ...categories].filter(Boolean)));
  const fieldPrefix = submitLabel === "保存修改" ? "edit-task" : "create-task";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setValidationError("请输入任务标题。");
      return;
    }
    setValidationError("");
    onSubmit({ ...form, status: safeStatus });
  };

  return (
    <form className="manual-task-form" onSubmit={submit}>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-title`}>任务标题</label>
        <input
          id={`${fieldPrefix}-title`}
          value={form.title}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? `${fieldPrefix}-title-error` : undefined}
          onChange={(event) => {
            if (validationError) {
              setValidationError("");
            }
            onChange({ ...form, title: event.target.value });
          }}
        />
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
            onInput={(event) => onChange({ ...form, dueDate: event.currentTarget.value })}
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
          onInput={(event) => onChange({ ...form, dueTime: event.currentTarget.value })}
          onChange={(event) => onChange({ ...form, dueTime: event.target.value })}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-tags`}>标签</label>
        <input id={`${fieldPrefix}-tags`} value={form.tags} onChange={(event) => onChange({ ...form, tags: event.target.value })} />
      </div>
      {validationError && (
        <p className="form-error" id={`${fieldPrefix}-title-error`} role="alert">
          {validationError}
        </p>
      )}
      <button className="primary-button full" type="submit">
        {submitLabel}
      </button>
    </form>
  );
}

function TaskAssistant({
  onCreateTask,
  onDeleteTask,
  onOpenTask,
  onToggleComplete,
  onUpdateTask,
  tasks,
}: {
  onCreateTask: (input: NewTaskInput) => Promise<void> | void;
  onDeleteTask: (taskId: number) => Promise<void> | void;
  onOpenTask: (task: Task) => Promise<void> | void;
  onToggleComplete: (taskId: number) => Promise<void> | void;
  onUpdateTask: (taskId: number, input: NewTaskInput) => Promise<void> | void;
  tasks: Task[];
}) {
  const [isOpen, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isWorking, setWorking] = useState(false);
  const messageIdRef = useRef(1);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "今日事，我来帮。可以直接说：创建任务、修改优先级、标记完成、删除任务。",
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [isOpen, messages]);

  const nextMessageId = () => {
    messageIdRef.current += 1;
    return messageIdRef.current;
  };

  const appendMessage = (message: Omit<AssistantMessage, "id">) => {
    setMessages((currentMessages) => [...currentMessages, { ...message, id: nextMessageId() }]);
  };

  const getTaskById = (taskId: number) => tasks.find((task) => task.id === taskId);

  const executePendingAction = async (pendingAction: AssistantPendingAction) => {
    const task = getTaskById(pendingAction.taskId);
    if (!task) {
      appendMessage({ role: "assistant", text: "没有找到这个任务，可能已经被更新或删除了。" });
      return;
    }

    setWorking(true);
    try {
      if (pendingAction.type === "delete") {
        await onDeleteTask(task.id);
        appendMessage({ role: "assistant", text: `已删除「${task.title}」。` });
      }
      if (pendingAction.type === "update") {
        await onUpdateTask(task.id, pendingAction.input);
        appendMessage({ role: "assistant", text: `已更新「${pendingAction.input.title}」。` });
      }
      if (pendingAction.type === "toggle") {
        await onToggleComplete(task.id);
        appendMessage({ role: "assistant", text: `已${task.status === "已完成" ? "恢复" : "完成"}「${task.title}」。` });
      }
      if (pendingAction.type === "open") {
        await onOpenTask(task);
        appendMessage({ role: "assistant", text: `已打开「${task.title}」详情。` });
      }
    } catch (error) {
      appendMessage({ role: "assistant", text: asErrorMessage(error) });
    } finally {
      setWorking(false);
    }
  };

  const buildCandidateActions = (
    matches: Task[],
    getPendingAction: (task: Task) => AssistantPendingAction,
    labelPrefix: string,
    tone?: AssistantAction["tone"],
  ): AssistantAction[] =>
    matches.map((task) => ({
      label: `${labelPrefix}「${task.title}」`,
      pendingAction: getPendingAction(task),
      tone,
    }));

  const handleIntent = async (text: string) => {
    const intent = parseAssistantIntent(text, tasks);
    setWorking(true);
    try {
      if (intent.type === "create") {
        await onCreateTask(intent.input);
        appendMessage({ role: "assistant", text: `已创建「${intent.input.title}」，优先级为${intent.input.priority}。` });
        return;
      }

      if (intent.type === "delete") {
        if (!intent.matches.length) {
          appendMessage({ role: "assistant", text: "没有找到要删除的任务。可以带上更完整的任务标题。" });
          return;
        }
        appendMessage({
          actions: buildCandidateActions(intent.matches, (task) => ({ type: "delete", taskId: task.id }), "确认删除", "danger"),
          role: "assistant",
          taskCandidates: intent.matches,
          text: intent.matches.length === 1 ? "删除后无法恢复，请确认。" : "找到多个可能的任务，请选择要删除的一个。",
        });
        return;
      }

      if (intent.type === "update") {
        if (!intent.matches.length) {
          appendMessage({ role: "assistant", text: "没有找到要修改的任务。可以这样说：把「任务标题」优先级改成低。" });
          return;
        }
        const toPendingAction = (task: Task): AssistantPendingAction => ({
          type: "update",
          taskId: task.id,
          input: createInputFromTaskPatch(task, intent.patch),
        });
        if (intent.matches.length === 1) {
          await executePendingAction(toPendingAction(intent.matches[0]));
          return;
        }
        appendMessage({
          actions: buildCandidateActions(intent.matches, toPendingAction, "修改"),
          role: "assistant",
          taskCandidates: intent.matches,
          text: `找到多个可能的任务，请选择要应用“${intent.summary}”的任务。`,
        });
        return;
      }

      if (intent.type === "toggle") {
        if (!intent.matches.length) {
          appendMessage({ role: "assistant", text: "没有找到要标记状态的任务。可以带上任务标题里的关键词。" });
          return;
        }
        const toPendingAction = (task: Task): AssistantPendingAction => {
          if (intent.targetStatus === "已完成" && task.status !== "已完成") {
            return { type: "toggle", taskId: task.id };
          }
          if (intent.targetStatus === "待办" && task.status === "已完成") {
            return { type: "toggle", taskId: task.id };
          }
          if (intent.targetStatus && task.status !== intent.targetStatus) {
            return {
              type: "update",
              taskId: task.id,
              input: createInputFromTaskPatch(task, { status: intent.targetStatus }),
            };
          }
          return { type: "toggle", taskId: task.id };
        };
        if (intent.matches.length === 1) {
          await executePendingAction(toPendingAction(intent.matches[0]));
          return;
        }
        appendMessage({
          actions: buildCandidateActions(intent.matches, toPendingAction, "更新状态"),
          role: "assistant",
          taskCandidates: intent.matches,
          text: "找到多个可能的任务，请选择要更新状态的一个。",
        });
        return;
      }

      if (intent.type === "open") {
        if (!intent.matches.length) {
          appendMessage({ role: "assistant", text: "没有找到要查看的任务。可以输入任务标题中的关键词。" });
          return;
        }
        if (intent.matches.length === 1) {
          await executePendingAction({ type: "open", taskId: intent.matches[0].id });
          return;
        }
        appendMessage({
          actions: buildCandidateActions(intent.matches, (task) => ({ type: "open", taskId: task.id }), "查看"),
          role: "assistant",
          taskCandidates: intent.matches,
          text: "找到多个可能的任务，请选择要查看的一个。",
        });
        return;
      }

      appendMessage({
        role: "assistant",
        text: "我可以帮你管理任务。试试：创建明天下午完成的测试任务；把整理接口文档优先级改成低；标记测试任务分类功能完成；删除整理后续灵感池。",
      });
    } catch (error) {
      appendMessage({ role: "assistant", text: asErrorMessage(error) });
    } finally {
      setWorking(false);
    }
  };

  const sendMessage = async () => {
    const text = normalizeAssistantText(input);
    if (!text || isWorking) {
      return;
    }
    setInput("");
    appendMessage({ role: "user", text });
    await handleIntent(text);
  };

  const sendShortcut = (text: string) => {
    setInput(text);
  };

  return (
    <div className={`task-assistant ${isOpen ? "open" : ""}`}>
      {isOpen ? (
        <section className="assistant-panel" aria-label="AI 任务助手">
          <header className="assistant-header">
            <div className="assistant-avatar">
              <Bot size={24} />
            </div>
            <div>
              <strong>新建 AI 对话</strong>
              <span>使用 AI 处理各种任务...</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="最小化助手">
              <Minimize2 size={17} />
            </button>
          </header>
          <div className="assistant-body">
            {messages.map((message) => (
              <article className={`assistant-message ${message.role}`} key={message.id}>
                <p>{message.text}</p>
                {message.taskCandidates?.length ? (
                  <div className="assistant-candidates">
                    {message.taskCandidates.map((task) => (
                      <span key={task.id}>
                        {task.title}
                        <small>{formatDue(task)}</small>
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.actions?.length ? (
                  <div className="assistant-message-actions">
                    {message.actions.map((action) => (
                      <button
                        className={action.tone === "danger" ? "danger" : action.tone === "primary" ? "primary" : ""}
                        disabled={isWorking}
                        key={`${message.id}-${action.label}`}
                        type="button"
                        onClick={() => void executePendingAction(action.pendingAction)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="assistant-shortcuts">
            <button type="button" onClick={() => sendShortcut("创建一个明天下午完成的高优先级测试任务")}>
              <Plus size={14} />
              创建
            </button>
            <button type="button" onClick={() => sendShortcut("把整理接口文档优先级改成低")}>
              <SlidersHorizontal size={14} />
              修改
            </button>
            <button type="button" onClick={() => sendShortcut("标记测试任务分类功能完成")}>
              <CheckCircle2 size={14} />
              完成
            </button>
          </div>
          <form
            className="assistant-composer"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <Plus size={18} />
            <input
              aria-label="AI 助手输入"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="使用 AI 处理各种任务..."
            />
            <span>自动</span>
            <button type="submit" disabled={isWorking || !input.trim()} aria-label="发送给 AI 助手">
              <Send size={17} />
            </button>
          </form>
        </section>
      ) : (
        <button className="assistant-launcher" type="button" onClick={() => setOpen(true)} aria-label="打开 AI 任务助手">
          <Bot size={26} />
        </button>
      )}
    </div>
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
