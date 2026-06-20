import type { ChatAttachment, ChatMessage, Conversation } from "../types";
import { readStoredString, writeStoredString } from "../../../lib/storage";
import {
  CHAT_ACTIVE_CONVERSATION_STORAGE_KEY,
  CHAT_CONVERSATIONS_STORAGE_KEY,
  CHAT_SELECTED_MODEL_STORAGE_KEY,
  CONVERSATION_TITLE_MAX_LENGTH,
  DEFAULT_CONVERSATION_TITLE,
} from "../constants";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyConversation(): Conversation {
  const now = new Date().toISOString();
  return {
    id: createId("chat"),
    title: DEFAULT_CONVERSATION_TITLE,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function getConversationTitle(input: string, attachments: ChatAttachment[] = []) {
  const content = input.replace(/\s+/g, " ").trim() || attachments[0]?.name || DEFAULT_CONVERSATION_TITLE;
  return content.length > CONVERSATION_TITLE_MAX_LENGTH ? `${content.slice(0, CONVERSATION_TITLE_MAX_LENGTH)}...` : content;
}

function normalizeAttachment(value: unknown, index: number): ChatAttachment | null {
  if (!isRecord(value) || typeof value.name !== "string") {
    return null;
  }
  return {
    id: typeof value.id === "string" && value.id ? value.id : createId(`attachment-${index}`),
    name: value.name,
    size: typeof value.size === "number" && Number.isFinite(value.size) ? value.size : 0,
    type: typeof value.type === "string" ? value.type : "",
  };
}

function normalizeMessage(value: unknown, index: number): ChatMessage | null {
  // localStorage 中的历史消息按字段白名单恢复，脏数据直接丢弃或补默认值。
  if (!isRecord(value) || (value.role !== "user" && value.role !== "assistant") || typeof value.content !== "string") {
    return null;
  }
  return {
    id: typeof value.id === "string" && value.id ? value.id : createId(`message-${index}`),
    role: value.role,
    content: value.content,
    attachments: Array.isArray(value.attachments)
      ? value.attachments.flatMap((attachment, attachmentIndex) => {
          const normalized = normalizeAttachment(attachment, attachmentIndex);
          return normalized ? [normalized] : [];
        })
      : undefined,
    modelId: typeof value.modelId === "string" ? value.modelId : undefined,
    createdAt: typeof value.createdAt === "string" ? value.createdAt : new Date().toISOString(),
    status: value.status === "sending" || value.status === "sent" || value.status === "error" ? value.status : "sent",
  };
}

export function readConversations(): Conversation[] {
  const fallback = [createEmptyConversation()];
  const raw = readStoredString(CHAT_CONVERSATIONS_STORAGE_KEY);
  if (!raw) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return fallback;
    }
    // 会话恢复时容忍旧版本缺字段，确保升级后仍能进入一个可发送的线程。
    const now = new Date().toISOString();
    const conversations = parsed.flatMap((value, index) => {
      if (!isRecord(value)) {
        return [];
      }
      const messages = Array.isArray(value.messages)
        ? value.messages.flatMap((message, messageIndex) => {
            const normalized = normalizeMessage(message, messageIndex);
            return normalized ? [normalized] : [];
          })
        : [];
      return [
        {
          id: typeof value.id === "string" && value.id ? value.id : createId(`restored-${index}`),
          title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : DEFAULT_CONVERSATION_TITLE,
          messages,
          createdAt: typeof value.createdAt === "string" ? value.createdAt : now,
          updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : now,
        },
      ];
    });
    return conversations.length ? conversations : fallback;
  } catch {
    return fallback;
  }
}

export function writeConversations(conversations: Conversation[]) {
  writeStoredString(CHAT_CONVERSATIONS_STORAGE_KEY, JSON.stringify(conversations));
}

export function readActiveConversationId() {
  return readStoredString(CHAT_ACTIVE_CONVERSATION_STORAGE_KEY) || "";
}

export function writeActiveConversationId(conversationId: string) {
  writeStoredString(CHAT_ACTIVE_CONVERSATION_STORAGE_KEY, conversationId);
}

export function readSelectedModelId() {
  return readStoredString(CHAT_SELECTED_MODEL_STORAGE_KEY) || "";
}

export function writeSelectedModelId(modelId: string) {
  writeStoredString(CHAT_SELECTED_MODEL_STORAGE_KEY, modelId);
}
