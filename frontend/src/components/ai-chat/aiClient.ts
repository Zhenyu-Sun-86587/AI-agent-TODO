import type { ChatAttachment, ChatMessage, ChatModel } from "./types";
import { createId } from "./storage";

export type SendChatRequest = {
  conversationId: string;
  model: ChatModel;
  messages: ChatMessage[];
  input: string;
  attachments: ChatAttachment[];
};

export type SendChatResponse = {
  message: ChatMessage;
};

export async function sendChatMessage(request: SendChatRequest): Promise<SendChatResponse> {
  // 后续真实接入点：
  // request.model.provider === "openai" -> 后端 OpenAI 代理
  // request.model.provider === "deepseek" -> 后端 DeepSeek 代理
  // 文件当前只传 metadata，真实上传应由后端签名/代理处理，API Key 不应放在前端。
  await new Promise((resolve) => window.setTimeout(resolve, 320));

  const attachmentText = request.attachments.length
    ? `\n\n已收到 ${request.attachments.length} 个附件 metadata：${request.attachments.map((attachment) => attachment.name).join("、")}。`
    : "";
  const inputSummary = request.input.trim() || "附件";

  return {
    message: {
      id: createId("ai-message"),
      role: "assistant",
      content: `收到：${inputSummary}\n\n当前使用 ${request.model.label}。这轮先返回 mock 回复，真实接口会在 aiClient.ts 的 sendChatMessage(request) 中接入。${attachmentText}`,
      modelId: request.model.id,
      createdAt: new Date().toISOString(),
      status: "sent",
    },
  };
}
