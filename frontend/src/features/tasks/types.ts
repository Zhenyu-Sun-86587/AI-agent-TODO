export type TaskStatus = "待办" | "进行中" | "已完成";
export type TaskPriority = "高" | "中" | "低";

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
