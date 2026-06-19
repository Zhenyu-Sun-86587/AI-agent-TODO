import { apiRequest } from "./client";
import type { ApiAiChatResponse, ApiAiLog, ApiAiSuggestResponse, ApiPageResult } from "./types";

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
  options: { followUpMode: boolean } = { followUpMode: false },
) {
  return apiRequest<ApiAiChatResponse>("/ai/chat", {
    method: "POST",
    token,
    body: JSON.stringify({
      agent_mode: true,
      follow_up_mode: options.followUpMode,
      messages,
      model_name: modelName,
      timezone: "Asia/Shanghai",
    }),
  });
}
