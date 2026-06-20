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
      // 空 Key 会被 JSON.stringify 省略，允许只改模型名而不清空已保存的密钥。
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
      // 测试连接复用保存接口的空值语义，未填写 Key 时让后端使用已保存配置。
      openai_api_key: openaiApiKey || undefined,
      model_name: modelName,
    }),
  });
}
