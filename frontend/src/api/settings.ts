import { apiRequest } from "./client";
import type { ApiOpenAIKeyTest, ApiSettings } from "./types";

export function fetchSettings(token: string) {
  return apiRequest<ApiSettings>("/settings", { token });
}

export function updateSettings(token: string, openaiApiKey: string, modelName: string) {
  return apiRequest<ApiSettings>("/settings", {
    method: "PUT",
    token,
    body: JSON.stringify({
      openai_api_key: openaiApiKey || undefined,
      model_name: modelName,
    }),
  });
}

export function testOpenAIKey(token: string, openaiApiKey: string, modelName: string) {
  return apiRequest<ApiOpenAIKeyTest>("/settings/test-openai-key", {
    method: "POST",
    token,
    body: JSON.stringify({
      openai_api_key: openaiApiKey || undefined,
      model_name: modelName,
    }),
  });
}
