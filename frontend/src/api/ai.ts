import { apiRequest } from "./client";
import type { ApiAiChatResponse, ApiAiLog, ApiAiParseResponse, ApiAiSuggestResponse, ApiPageResult } from "./types";

export function parseTask(text: string, token: string) {
  return apiRequest<ApiAiParseResponse>("/ai/parse-task", {
    method: "POST",
    token,
    body: JSON.stringify({ text, timezone: "Asia/Shanghai" }),
  });
}

export function suggestTask(title: string, description: string, token: string) {
  return apiRequest<ApiAiSuggestResponse>("/ai/suggest", {
    method: "POST",
    token,
    body: JSON.stringify({ title, description }),
  });
}

export function fetchAiLogs(path: string, token: string) {
  return apiRequest<ApiPageResult<ApiAiLog>>(path, { token });
}

export function sendAiChat(
  token: string,
  modelName: string,
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
) {
  return apiRequest<ApiAiChatResponse>("/ai/chat", {
    method: "POST",
    token,
    body: JSON.stringify({ model_name: modelName, messages }),
  });
}
