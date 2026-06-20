import { useEffect, useMemo, useState } from "react";
import { sendChatMessage } from "../client";
import { CHAT_MODEL_GROUPS, DEFAULT_CHAT_MODEL_ID, getChatModel, isKnownChatModel } from "../models";
import type {
  ChatAttachment,
  ChatMessage,
  ChatSendOptions,
  Conversation,
} from "../types";
import { DEFAULT_CONVERSATION_TITLE } from "../constants";
import {
  createEmptyConversation,
  createId,
  getConversationTitle,
  readActiveConversationId,
  readConversations,
  readSelectedModelId,
  writeActiveConversationId,
  writeConversations,
  writeSelectedModelId,
} from "../services/chatStorage";

export function sortConversations(conversations: Conversation[]) {
  return [...conversations].sort((left, right) => (Date.parse(right.updatedAt) || 0) - (Date.parse(left.updatedAt) || 0));
}

function getInitialModelId(initialModelId: string | undefined) {
  const storedModelId = readSelectedModelId();
  // 外部传入的模型优先级高于本地缓存，用于设置页改模型后同步浮窗默认值。
  if (isKnownChatModel(initialModelId) && storedModelId !== initialModelId) {
    return initialModelId || DEFAULT_CHAT_MODEL_ID;
  }
  if (isKnownChatModel(storedModelId)) {
    return storedModelId;
  }
  if (isKnownChatModel(initialModelId)) {
    return initialModelId || DEFAULT_CHAT_MODEL_ID;
  }
  return DEFAULT_CHAT_MODEL_ID;
}

function getInitialActiveConversationId(conversations: Conversation[]) {
  const storedId = readActiveConversationId();
  if (conversations.some((conversation) => conversation.id === storedId)) {
    return storedId;
  }
  return sortConversations(conversations)[0]?.id || conversations[0]?.id || "";
}

function isFreshEmptyConversation(conversation: Conversation | undefined) {
  return Boolean(conversation && conversation.messages.length === 0 && conversation.title === DEFAULT_CONVERSATION_TITLE);
}

export function useChatConversations(initialModelId: string | undefined, token?: string, onTaskChanged?: () => Promise<void> | void) {
  const [isSending, setSending] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(() => readConversations());
  const [activeConversationId, setActiveConversationId] = useState(() => getInitialActiveConversationId(conversations));
  const [selectedModelId, setSelectedModelId] = useState(() => getInitialModelId(initialModelId));
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

  // activeConversationId 失效时回退到最新会话，防止删除当前会话后线程区域悬空。
  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeConversationId) || sortConversations(conversations)[0],
    [activeConversationId, conversations],
  );
  const sortedConversations = useMemo(() => sortConversations(conversations), [conversations]);
  const selectedModel = getChatModel(selectedModelId);

  useEffect(() => {
    writeConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    if (activeConversationId) {
      writeActiveConversationId(activeConversationId);
    }
  }, [activeConversationId]);

  useEffect(() => {
    writeSelectedModelId(selectedModelId);
  }, [selectedModelId]);

  useEffect(() => {
    if (!activeConversationId || !conversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(getInitialActiveConversationId(conversations));
    }
  }, [activeConversationId, conversations]);

  const updateConversation = (conversationId: string, updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => {
      return current.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation));
    });
  };

  const createConversation = ({ onOpen }: { onOpen: () => void }) => {
    if (isFreshEmptyConversation(activeConversation)) {
      // 空白新会话不重复创建，只负责打开面板，避免侧边菜单堆积无标题记录。
      onOpen();
      return false;
    }
    const conversation = createEmptyConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    onOpen();
    return true;
  };

  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
  };

  const requestDeleteConversation = (conversationId: string) => {
    setConversationToDelete(conversationId);
  };

  const cancelDeleteConversation = () => {
    setConversationToDelete(null);
  };

  const executeDeleteConversation = () => {
    if (!conversationToDelete) {
      return;
    }
    const conversationId = conversationToDelete;
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== conversationId);
      if (!remaining.length) {
        // 至少保留一个空会话，后续发送流程始终有稳定的 conversationId。
        const fallbackConversation = createEmptyConversation();
        setActiveConversationId(fallbackConversation.id);
        return [fallbackConversation];
      }
      if (conversationId === activeConversationId) {
        setActiveConversationId(sortConversations(remaining)[0].id);
      }
      return remaining;
    });
    setConversationToDelete(null);
  };

  const sendMessage = async (input: string, attachments: ChatAttachment[], options: ChatSendOptions = { followUpMode: false }) => {
    if (!activeConversation || isSending) {
      return;
    }

    const conversationId = activeConversation.id;
    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: createId("user-message"),
      role: "user",
      content: input.trim(),
      attachments,
      modelId: selectedModel.id,
      createdAt: now,
      status: "sent",
    };
    const nextMessages = [...activeConversation.messages, userMessage];

    // 先乐观写入用户消息，再等待后端回复；失败也追加 assistant 错误消息以保留完整对话流。
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title: isFreshEmptyConversation(conversation) ? getConversationTitle(input, attachments) : conversation.title,
      messages: [...conversation.messages, userMessage],
      updatedAt: now,
    }));

    setSending(true);
    try {
      const response = await sendChatMessage({
        model: selectedModel,
        conversationId,
        input,
        messages: nextMessages,
        attachments,
        followUpMode: options.followUpMode,
        token,
      });
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, response.message],
        updatedAt: response.message.createdAt,
      }));
      if (response.taskChanged) {
        // AI 可能通过工具改动任务，通知上层重新拉取工作区数据。
        await onTaskChanged?.();
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "消息发送失败，请稍后再试。";
      const createdAt = new Date().toISOString();
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [
          ...conversation.messages,
          {
            id: createId("ai-error"),
            role: "assistant",
            content: errorMessage,
            modelId: selectedModel.id,
            createdAt,
            status: "error",
          },
        ],
        updatedAt: createdAt,
      }));
    } finally {
      setSending(false);
    }
  };

  return {
    activeConversation,
    cancelDeleteConversation,
    conversationToDelete,
    createConversation,
    executeDeleteConversation,
    isSending,
    modelGroups: CHAT_MODEL_GROUPS,
    requestDeleteConversation,
    selectConversation,
    selectedModel,
    selectedModelId,
    sendMessage,
    setSelectedModelId,
    sortedConversations,
  };
}
