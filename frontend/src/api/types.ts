export interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
  request_id?: string;
}

export interface ApiPageResult<T> {
  items: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
}

export type ApiPriority = "low" | "medium" | "high";
export type ApiTaskStatus = "todo" | "done";

export interface ApiUser {
  id: number;
  username: string;
  email: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiAuthResponse {
  user: ApiUser;
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiTask {
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

export interface ApiCategory {
  name: string;
  task_count: number;
}

export interface ApiParsedTask {
  title: string;
  description: string | null;
  priority: ApiPriority;
  category: string | null;
  due_time: string | null;
  confidence: number | null;
  raw_due_text: string | null;
}

export interface ApiAiParseResponse {
  parsed_task: ApiParsedTask;
  ai_status: "success" | "failed" | "mocked";
  model_name: string;
}

export interface ApiAiCreateResponse extends ApiAiParseResponse {
  task: ApiTask;
}

export interface ApiAiSuggestResponse {
  priority: ApiPriority;
  category: string | null;
  reason: string | null;
}

export interface ApiAiChatResponse {
  content: string;
  model_name: string;
  agent_action?: string | null;
  task_changed?: boolean;
  task?: ApiTask | null;
}

export interface ApiStatsOverview {
  total_tasks: number;
  done_tasks: number;
  todo_tasks: number;
  completion_rate: number;
  overdue_tasks: number;
  today_due_tasks: number;
  ai_created_tasks: number;
}

export interface ApiCategoryStats {
  category: string;
  total: number;
  done: number;
  todo: number;
  completion_rate: number;
}

export interface ApiPriorityStats {
  priority: ApiPriority;
  total: number;
  done: number;
  todo: number;
}

export interface ApiTrendStats {
  date: string;
  created: number;
  done: number;
}

export interface ApiSettings {
  openai_api_key_masked: string | null;
  has_openai_api_key: boolean;
  model_name: string;
}

export interface ApiOpenAIKeyTest {
  valid: boolean;
  model_name: string | null;
  latency_ms: number | null;
}

export interface ApiAiLog {
  id: number;
  input_text: string;
  output_json: unknown;
  status: "success" | "failed" | "mocked";
  model_name: string | null;
  created_at: string;
}

export interface RemoteStatsState {
  overview: ApiStatsOverview | null;
  categories: ApiCategoryStats[];
  priorities: ApiPriorityStats[];
  trend: ApiTrendStats[];
}
