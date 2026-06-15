import { apiRequest } from "./client";
import type { ApiAuthResponse, ApiUser } from "./types";

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
