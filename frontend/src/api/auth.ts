import { apiRequest } from "./client";
import type { ApiAuthResponse, ApiUser } from "./types";

// 认证相关请求统一经过 apiRequest，保证 token、错误包裹和响应结构处理一致。
export function login(account: string, password: string) {
  return apiRequest<ApiAuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ account, password }),
  });
}

export function register(username: string, email: string, password: string) {
  return apiRequest<ApiAuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export function demoLogin() {
  return apiRequest<ApiAuthResponse>("/auth/demo", {
    method: "POST",
  });
}

export function logout(token: string) {
  return apiRequest<null>("/auth/logout", {
    method: "POST",
    token,
  });
}

export function fetchMe(token: string) {
  return apiRequest<ApiUser>("/users/me", { token });
}

export function updateMe(token: string, username: string, email: string) {
  return apiRequest<ApiUser>("/users/me", {
    method: "PUT",
    token,
    body: JSON.stringify({ username, email }),
  });
}
