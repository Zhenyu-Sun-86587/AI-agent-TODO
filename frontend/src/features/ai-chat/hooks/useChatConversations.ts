import { useEffect, useMemo, useState } from "react";
import { sendChatMessage } from "../../../components/ai-chat/aiClient";
import { DEFAULT_CHAT_MODEL_ID, getChatModel, isKnownChatModel } from "../../../components/ai-chat/models";
import type { ChatAttachment, ChatMessage, Conversation } from "../../../components/ai-chat/types";
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

export function useChatConversations(initialModelId: string | undefined) {
  const [isSending, setSending] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(() => readConversations());
  const [activeConversationId, setActiveConversationId] = useState(() => getInitialActiveConversationId(readConversations()));
  const [selectedModelId, setSelectedModelId] = useState(() => getInitialModelId(initialModelId));
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);

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
    setConversations((current) => current.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)));
  };

  const createConversation = ({ onOpen }: { onOpen: () => void }) => {
    if (isFreshEmptyConversation(activeConversation)) {
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

  const sendMessage = async (input: string, attachments: ChatAttachment[]) => {
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

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title: isFreshEmptyConversation(conversation) ? getConversationTitle(input, attachments) : conversation.title,
      messages: [...conversation.messages, userMessage],
      updatedAt: now,
    }));

    setSending(true);
    try {
      const response = await sendChatMessage({
        conversationId,
        model: selectedModel,
        messages: nextMessages,
        input,
        attachments,
      });
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: [...conversation.messages, response.message],
        updatedAt: response.message.createdAt,
      }));
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
    requestDeleteConversation,
    selectConversation,
    selectedModel,
    selectedModelId,
    sendMessage,
    setSelectedModelId,
    sortedConversations,
  };
}
