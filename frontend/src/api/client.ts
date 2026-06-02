import axios, { AxiosError, type AxiosRequestConfig } from "axios";

import type { ApiEnvelope } from "./types";

const TOKEN_KEY = "ai-agent-todo-token";
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api";

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  try {
    const response = await client.request<ApiEnvelope<T>>(config);
    if (response.status === 204) {
      return undefined as T;
    }

    const envelope = response.data;
    if (envelope.code !== 0) {
      throw new Error(envelope.message || "请求失败");
    }
    return envelope.data;
  } catch (error) {
    throw new Error(getErrorMessage(error));
  }
}

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return parseAxiosError(error);
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "操作失败，请稍后重试";
}

function parseAxiosError(error: AxiosError<ApiEnvelope<unknown>>): string {
  const message = error.response?.data?.message;
  if (message) {
    return message;
  }
  if (error.code === "ECONNABORTED") {
    return "请求超时，请检查后端服务";
  }
  if (!error.response) {
    return "无法连接后端服务，已保留当前界面状态";
  }
  return `请求失败：${error.response.status}`;
}
