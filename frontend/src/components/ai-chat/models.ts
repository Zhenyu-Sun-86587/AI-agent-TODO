import type { ChatModel, ModelProvider } from "./types";

export const DEFAULT_CHAT_MODEL_ID = "gpt-5.4-mini";

export const CHAT_MODELS: ChatModel[] = [
  {
    id: "gpt-5.5",
    provider: "openai",
    label: "GPT-5.5",
    description: "旗舰推理与编码",
    supportsFiles: true,
    supportsReasoning: true,
  },
  {
    id: "gpt-5.4",
    provider: "openai",
    label: "GPT-5.4",
    description: "通用高质量对话",
    supportsFiles: true,
    supportsReasoning: true,
  },
  {
    id: "gpt-5.4-mini",
    provider: "openai",
    label: "GPT-5.4 mini",
    description: "低延迟、低成本",
    supportsFiles: true,
  },
  {
    id: "deepseek-v4-pro",
    provider: "deepseek",
    label: "DeepSeek V4 Pro",
    description: "复杂推理",
    supportsReasoning: true,
  },
  {
    id: "deepseek-v4-flash",
    provider: "deepseek",
    label: "DeepSeek V4 Flash",
    description: "快速响应",
  },
];

export const CHAT_MODEL_GROUPS: Array<{ label: string; provider: ModelProvider; models: ChatModel[] }> = [
  {
    label: "GPT",
    provider: "openai",
    models: CHAT_MODELS.filter((model) => model.provider === "openai"),
  },
  {
    label: "DeepSeek",
    provider: "deepseek",
    models: CHAT_MODELS.filter((model) => model.provider === "deepseek"),
  },
];

export function getChatModel(modelId: string | undefined): ChatModel {
  return CHAT_MODELS.find((model) => model.id === modelId) || CHAT_MODELS.find((model) => model.id === DEFAULT_CHAT_MODEL_ID) || CHAT_MODELS[0]!;
}

export function isKnownChatModel(modelId: string | undefined) {
  return CHAT_MODELS.some((model) => model.id === modelId);
}
