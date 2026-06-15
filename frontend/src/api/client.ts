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

  if (response.status === 204) {
    return null as T;
  }

  const payload = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;
  if (!response.ok || !payload || payload.code !== 0) {
    throw new ApiError(payload?.message || `请求失败：${response.status}`, response.status, payload?.code);
  }

  return payload.data;
}
