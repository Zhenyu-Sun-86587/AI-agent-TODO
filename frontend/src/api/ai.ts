import { getStoredToken, request } from "./client";
import { createDemoTaskByAi, isDemoToken, parseDemoTask } from "./demo";
import type {
  AiParsedTask,
  AiSuggestResponse,
  CreateTaskByAiResponse,
} from "./types";

export function parseTaskText(text: string): Promise<AiParsedTask> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(parseDemoTask(text));
  }
  return request<AiParsedTask>({
    url: "/ai/parse-task",
    method: "POST",
    data: { text, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  });
}

export function createTaskByAi(
  text: string,
  overrides?: Partial<AiParsedTask>,
): Promise<CreateTaskByAiResponse> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(createDemoTaskByAi(text, overrides));
  }
  return request<CreateTaskByAiResponse>({
    url: "/ai/create-task",
    method: "POST",
    data: {
      text,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      overrides,
    },
  });
}

export function suggestTaskFields(
  title: string,
  description?: string | null,
): Promise<AiSuggestResponse> {
  return request<AiSuggestResponse>({
    url: "/ai/suggest",
    method: "POST",
    data: { title, description },
  });
}
