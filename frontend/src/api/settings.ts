import { getStoredToken, request } from "./client";
import {
  getDemoSettings,
  isDemoToken,
  testDemoOpenAIKey,
  updateDemoSettings,
} from "./demo";
import type {
  OpenAIKeyTestResponse,
  UserSetting,
  UserSettingUpdate,
} from "./types";

export function getSettings(): Promise<UserSetting> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(getDemoSettings());
  }
  return request<UserSetting>({
    url: "/settings",
    method: "GET",
  });
}

export function updateSettings(payload: UserSettingUpdate): Promise<UserSetting> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(updateDemoSettings(payload));
  }
  return request<UserSetting>({
    url: "/settings",
    method: "PUT",
    data: payload,
  });
}

export function testOpenAIKey(
  openai_api_key?: string,
  model_name?: string,
): Promise<OpenAIKeyTestResponse> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(testDemoOpenAIKey());
  }
  return request<OpenAIKeyTestResponse>({
    url: "/settings/test-openai-key",
    method: "POST",
    data: { openai_api_key, model_name },
  });
}
