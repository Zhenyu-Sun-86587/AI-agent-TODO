import { getStoredToken, request } from "./client";
import {
  createDemoTask,
  deleteDemoTask,
  isDemoToken,
  listDemoCategories,
  listDemoTasks,
  updateDemoTask,
  updateDemoTaskStatus,
} from "./demo";
import type {
  CategoryRead,
  Task,
  TaskCreatePayload,
  TaskListParams,
  TaskListResponse,
  TaskStatus,
  TaskUpdatePayload,
} from "./types";

export function listTasks(params: TaskListParams): Promise<TaskListResponse> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(listDemoTasks(params));
  }
  return request<TaskListResponse>({
    url: "/tasks",
    method: "GET",
    params: compactParams(params),
  });
}

export function listCategories(): Promise<CategoryRead[]> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(listDemoCategories());
  }
  return request<CategoryRead[]>({
    url: "/tasks/categories",
    method: "GET",
  });
}

export function createTask(payload: TaskCreatePayload): Promise<Task> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(createDemoTask(payload));
  }
  return request<Task>({
    url: "/tasks",
    method: "POST",
    data: payload,
  });
}

export function updateTask(id: number, payload: TaskUpdatePayload): Promise<Task> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(updateDemoTask(id, payload));
  }
  return request<Task>({
    url: `/tasks/${id}`,
    method: "PUT",
    data: payload,
  });
}

export function updateTaskStatus(id: number, status: TaskStatus): Promise<Task> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(updateDemoTaskStatus(id, status));
  }
  return request<Task>({
    url: `/tasks/${id}/status`,
    method: "PATCH",
    data: { status },
  });
}

export function deleteTask(id: number): Promise<void> {
  if (isDemoToken(getStoredToken())) {
    deleteDemoTask(id);
    return Promise.resolve();
  }
  return request<void>({
    url: `/tasks/${id}`,
    method: "DELETE",
  });
}

function compactParams(params: TaskListParams): TaskListParams {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== "" && value != null),
  ) as TaskListParams;
}
