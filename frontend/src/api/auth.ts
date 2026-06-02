import { request } from "./client";
import type { AuthResponse, LoginPayload, RegisterPayload, User } from "./types";

export function login(payload: LoginPayload): Promise<AuthResponse> {
  return request<AuthResponse>({
    url: "/auth/login",
    method: "POST",
    data: payload,
  });
}

export function register(payload: RegisterPayload): Promise<AuthResponse> {
  return request<AuthResponse>({
    url: "/auth/register",
    method: "POST",
    data: payload,
  });
}

export function logout(): Promise<null> {
  return request<null>({
    url: "/auth/logout",
    method: "POST",
  });
}

export function getCurrentUser(): Promise<User> {
  return request<User>({
    url: "/users/me",
    method: "GET",
  });
}
