import type { ChatAttachment, ChatMessage, ChatPendingFollowUp, ChatTaskAction, Conversation } from "../../../components/ai-chat/types";
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

function normalizeTaskAction(value: unknown): ChatTaskAction | null {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return null;
  }
  if (value.kind === "help") {
    return { kind: "help" };
  }
  if (value.kind === "create-task" && typeof value.text === "string") {
    return { kind: "create-task", text: value.text };
  }
  if (value.kind === "list-tasks") {
    return {
      category: typeof value.category === "string" ? value.category : undefined,
      kind: "list-tasks",
      priority: typeof value.priority === "string" ? value.priority : undefined,
      query: typeof value.query === "string" ? value.query : undefined,
      status: typeof value.status === "string" ? value.status : undefined,
    };
  }
  if (value.kind === "show-task" && typeof value.target === "string") {
    return { kind: "show-task", target: value.target };
  }
  if (value.kind === "update-task" && typeof value.target === "string" && typeof value.changesText === "string") {
    return { changesText: value.changesText, kind: "update-task", target: value.target };
  }
  if (value.kind === "delete-task" && typeof value.target === "string") {
    return { kind: "delete-task", target: value.target };
  }
  if (
    value.kind === "set-task-status" &&
    typeof value.target === "string" &&
    (value.status === "待办" || value.status === "已完成")
  ) {
    return { kind: "set-task-status", status: value.status, target: value.target };
  }
  return null;
}

function normalizePendingFollowUp(value: unknown): ChatPendingFollowUp | undefined {
  if (!isRecord(value) || typeof value.prompt !== "string") {
    return undefined;
  }
  const action = normalizeTaskAction(value.action);
  if (!action) {
    return undefined;
  }
  const candidates = Array.isArray(value.candidates)
    ? value.candidates.flatMap((candidate) => {
        if (!isRecord(candidate) || typeof candidate.id !== "number" || typeof candidate.title !== "string") {
          return [];
        }
        return [{ id: candidate.id, title: candidate.title }];
      })
    : undefined;
  return {
    action,
    candidates: candidates?.length ? candidates : undefined,
    prompt: value.prompt,
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
          pendingFollowUp: normalizePendingFollowUp(value.pendingFollowUp),
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
