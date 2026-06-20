export type TaskStatus = "待办" | "进行中" | "已完成";
export type TaskPriority = "高" | "中" | "低";

// Task 同时承担列表、详情、统计和 AI 推荐展示的数据模型，因此包含少量展示态字段。
export interface Task {
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

export interface NewTaskInput {
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
  // aiBackendMode 用于区分“真实 AI 创建”与“前端兜底推断”两条提交链路。
  aiBackendMode?: "backend" | "frontend-fallback";
}

export interface TaskDetailState {
  isLoading: boolean;
  error: string;
}

export interface TaskFieldSuggestion {
  priority: TaskPriority;
  category: string;
  reason: string;
  source?: string;
}
