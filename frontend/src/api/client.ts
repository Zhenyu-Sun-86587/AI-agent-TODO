import { ApiError } from "./errors";
import type { ApiEnvelope } from "./types";

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api").replace(/\/$/, "");

export async function apiRequest<T>(path: string, options: RequestInit & { token?: string } = {}) {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  // 后端 204 没有响应体，统一映射为调用方声明的空结果。
  if (response.status === 204) {
    return null as T;
  }

  // API 约定使用 { code, message, data } 包裹业务结果，HTTP 成功但 code 非 0 也视为失败。
  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload || payload.code !== 0) {
    throw new ApiError(payload?.message || `请求失败：${response.status}`, response.status, payload?.code);
  }

  return payload.data;
}
