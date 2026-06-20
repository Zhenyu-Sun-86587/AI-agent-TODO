import { apiRequest } from "./client";
import type { ApiAiCreateResponse, ApiCategory, ApiPageResult, ApiTask, ApiTaskPageParams, ApiTaskStatus } from "./types";

// 前端分页筛选使用 camelCase，后端查询参数使用 snake_case，这里集中维护映射关系。
const taskPageParamKeys = {
  category: "category",
  dueFrom: "due_from",
  dueTo: "due_to",
  keyword: "keyword",
  page: "page",
  pageSize: "page_size",
  priority: "priority",
  sortBy: "sort_by",
  sortOrder: "sort_order",
  status: "status",
} satisfies Record<keyof ApiTaskPageParams, string>;

function setSearchParam(params: URLSearchParams, key: string, value: string | number | undefined) {
  // 空字符串和 undefined 不发送给后端，避免把“未筛选”误解成具体筛选条件。
  if (value === undefined || value === "") {
    return;
  }

  const normalizedValue = typeof value === "string" ? value.trim() : String(value);
  if (normalizedValue) {
    params.set(key, normalizedValue);
  }
}

export function buildTasksPageSearchParams(pageParams: ApiTaskPageParams = {}) {
  const params = new URLSearchParams();
  setSearchParam(params, taskPageParamKeys.page, pageParams.page);
  setSearchParam(params, taskPageParamKeys.pageSize, pageParams.pageSize);
  setSearchParam(params, taskPageParamKeys.keyword, pageParams.keyword);
  setSearchParam(params, taskPageParamKeys.status, pageParams.status);
  setSearchParam(params, taskPageParamKeys.priority, pageParams.priority);
  setSearchParam(params, taskPageParamKeys.category, pageParams.category);
  setSearchParam(params, taskPageParamKeys.dueFrom, pageParams.dueFrom);
  setSearchParam(params, taskPageParamKeys.dueTo, pageParams.dueTo);
  setSearchParam(params, taskPageParamKeys.sortBy, pageParams.sortBy);
  setSearchParam(params, taskPageParamKeys.sortOrder, pageParams.sortOrder);
  return params;
}

export function buildTasksPagePath(pageParams: ApiTaskPageParams = {}) {
  const params = buildTasksPageSearchParams(pageParams);
  const query = params.toString();
  return query ? `/tasks?${query}` : "/tasks";
}

export function fetchTasksPage(params: ApiTaskPageParams, token: string): Promise<ApiPageResult<ApiTask>>;
export function fetchTasksPage(path: string, token: string): Promise<ApiPageResult<ApiTask>>;
export function fetchTasksPage(paramsOrPath: ApiTaskPageParams | string, token: string) {
  // 支持直接传 path，方便复用已经构造好的分页/筛选 URL。
  const path = typeof paramsOrPath === "string" ? paramsOrPath : buildTasksPagePath(paramsOrPath);
  return apiRequest<ApiPageResult<ApiTask>>(path, { token });
}

export function fetchTasksPageByPath(path: string, token: string) {
  return fetchTasksPage(path, token);
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
