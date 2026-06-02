export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "done";
export type AiStatus = "success" | "failed" | "mocked";

export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  request_id?: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginPayload {
  account: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  password: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  category: string | null;
  due_time: string | null;
  status: TaskStatus;
  is_ai_created: boolean;
  created_at: string;
  updated_at: string;
}

export interface TaskCreatePayload {
  title: string;
  description?: string | null;
  priority?: Priority;
  category?: string | null;
  due_time?: string | null;
}

export interface TaskUpdatePayload {
  title?: string;
  description?: string | null;
  priority?: Priority;
  category?: string | null;
  due_time?: string | null;
  status?: TaskStatus;
}

export interface TaskListParams {
  page?: number;
  page_size?: number;
  status?: TaskStatus | "";
  priority?: Priority | "";
  category?: string;
  keyword?: string;
  due_from?: string;
  due_to?: string;
  sort_by?: "created_at" | "due_time" | "priority" | "updated_at";
  sort_order?: "asc" | "desc";
}

export interface TaskListResponse {
  items: Task[];
  pagination: Pagination;
}

export interface CategoryRead {
  name: string;
  task_count: number;
}

export interface AiParsedTask {
  title: string;
  description: string | null;
  priority: Priority;
  category: string | null;
  due_time: string | null;
  confidence?: number | null;
  raw_due_text?: string | null;
}

export interface CreateTaskByAiResponse {
  parsed: AiParsedTask;
  task: Task;
  ai_status?: AiStatus;
}

export interface AiSuggestResponse {
  priority: Priority;
  category: string | null;
  reason?: string | null;
}

export interface StatsOverview {
  total_tasks: number;
  done_tasks: number;
  todo_tasks: number;
  completion_rate: number;
  overdue_tasks: number;
  today_due_tasks: number;
  ai_created_tasks: number;
}

export interface CategoryStats {
  category: string;
  total: number;
  done: number;
  todo: number;
  completion_rate: number;
}

export interface PriorityStats {
  priority: Priority;
  total: number;
  done: number;
  todo: number;
}

export interface TrendStats {
  date: string;
  created: number;
  done: number;
}

export interface UserSetting {
  openai_api_key_masked: string | null;
  has_openai_api_key: boolean;
  model_name: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettingUpdate {
  openai_api_key?: string | null;
  model_name?: string;
}

export interface OpenAIKeyTestResponse {
  valid: boolean;
  model_name: string | null;
  latency_ms: number | null;
}
