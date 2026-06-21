import { sendAiChat } from "../../api/ai";
import { createId } from "./services/chatStorage";
import type { ChatAttachment, ChatMessage, ChatModel } from "./types";

export type SendChatRequest = {
  conversationId: string;
  model: ChatModel;
  messages: ChatMessage[];
  input: string;
  followUpMode: boolean;
  token?: string;
};

export type SendChatResponse = {
  message: ChatMessage;
  taskChanged: boolean;
};

function serializeAttachment(attachment: ChatAttachment) {
  const content = attachment.content.trim();
  if (!content) {
    return "";
  }
  return `\n\n[附件: ${attachment.name}]\n${content}`;
}

function serializeMessage(message: ChatMessage) {
  const content = message.content.trim();
  const attachmentText = message.attachments?.map(serializeAttachment).join("") || "";
  return `${content}${attachmentText}`.trim();
}

export async function sendChatMessage(request: SendChatRequest): Promise<SendChatResponse> {
  if (!request.token) {
    throw new Error("请先登录后端账号，再使用真实 AI 聊天。");
  }

  const data = await sendAiChat(
    request.token,
    request.model.id,
    request.messages.map((message) => ({
      role: message.role,
      content: serializeMessage(message),
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
