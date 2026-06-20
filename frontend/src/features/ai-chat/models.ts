import type { ChatModel, ChatModelGroup } from "./types";

// 默认模型需要和产品预设一致，同时作为本地存储损坏时的兜底值。
export const DEFAULT_CHAT_MODEL_ID = "deepseek-v4-pro";

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

export const CHAT_MODEL_GROUPS: ChatModelGroup[] = [
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
  return (
    // 先查指定模型，再退回默认模型，最后保证至少返回列表中的第一项。
    CHAT_MODELS.find((model) => model.id === modelId) ||
    CHAT_MODELS.find((model) => model.id === DEFAULT_CHAT_MODEL_ID) ||
    CHAT_MODELS[0]!
  );
}

export function isKnownChatModel(modelId: string | undefined) {
  return CHAT_MODELS.some((model) => model.id === modelId);
}
