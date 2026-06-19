import { sendAiChat } from "../../api/ai";
import { createId } from "./services/chatStorage";
import type { ChatAttachment, ChatMessage, ChatModel } from "./types";

export type SendChatRequest = {
  conversationId: string;
  model: ChatModel;
  messages: ChatMessage[];
  input: string;
  attachments: ChatAttachment[];
  followUpMode: boolean;
  token?: string;
};

export type SendChatResponse = {
  message: ChatMessage;
  taskChanged: boolean;
};

export async function sendChatMessage(request: SendChatRequest): Promise<SendChatResponse> {
  if (!request.token) {
    throw new Error("请先登录后端账号，再使用真实 AI 聊天。");
  }
  if (request.attachments.length) {
    throw new Error("当前真实 AI 聊天暂不支持附件，请先移除附件后发送。");
  }

  const data = await sendAiChat(
    request.token,
    request.model.id,
    request.messages
      .filter((message) => message.content.trim())
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      })),
    { followUpMode: request.followUpMode },
  );

  return {
    message: {
      id: createId("ai-message"),
      role: "assistant",
      content: data.content,
      modelId: data.model_name,
      createdAt: new Date().toISOString(),
      status: "sent",
    },
    taskChanged: Boolean(data.task_changed),
  };
}
