import { apiRequest } from "./client";
import type { ApiAiCreateResponse, ApiCategory, ApiPageResult, ApiTask, ApiTaskStatus } from "./types";

export function fetchTasksPage(path: string, token: string) {
  return apiRequest<ApiPageResult<ApiTask>>(path, { token });
}

export function fetchTask(taskId: number, token: string) {
  return apiRequest<ApiTask>(`/tasks/${taskId}`, { token });
}

export function fetchTaskCategories(token: string) {
  return apiRequest<ApiCategory[]>("/tasks/categories", { token });
}

export function createTask(payload: unknown, token: string) {
  return apiRequest<ApiTask>("/tasks", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export function updateTask(taskId: number, payload: unknown, token: string) {
  return apiRequest<ApiTask>(`/tasks/${taskId}`, {
    method: "PUT",
    token,
    body: JSON.stringify(payload),
  });
}

export function deleteTask(taskId: number, token: string) {
  return apiRequest<null>(`/tasks/${taskId}`, {
    method: "DELETE",
    token,
  });
}

export function updateTaskStatus(taskId: number, status: ApiTaskStatus, token: string) {
  return apiRequest<{ id: number; status: ApiTaskStatus; updated_at: string }>(`/tasks/${taskId}/status`, {
    method: "PATCH",
    token,
    body: JSON.stringify({ status }),
  });
}

export function createTaskWithAi(payload: unknown, token: string) {
  return apiRequest<ApiAiCreateResponse>("/ai/create-task", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}
