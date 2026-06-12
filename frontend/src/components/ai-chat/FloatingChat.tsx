import { MessageCirclePlus, Minus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sendChatMessage } from "./aiClient";
import ChatComposer from "./ChatComposer";
import ChatThread from "./ChatThread";
import ConversationMenu from "./ConversationMenu";
import "./FloatingChat.css";
import { DEFAULT_CHAT_MODEL_ID, getChatModel, isKnownChatModel } from "./models";
import {
  createEmptyConversation,
  createId,
  DEFAULT_CONVERSATION_TITLE,
  getConversationTitle,
  readActiveConversationId,
  readConversations,
  readSelectedModelId,
  writeActiveConversationId,
  writeConversations,
  writeSelectedModelId,
} from "./storage";
import type { ChatAttachment, ChatMessage, Conversation } from "./types";

function sortConversations(conversations: Conversation[]) {
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

export default function FloatingChat({ initialModelId, isBlocked = false }: { initialModelId?: string; isBlocked?: boolean }) {
  const [isOpen, setOpen] = useState(false);
  const [isConversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [isSending, setSending] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>(() => readConversations());
  const [activeConversationId, setActiveConversationId] = useState(() => getInitialActiveConversationId(readConversations()));
  const [selectedModelId, setSelectedModelId] = useState(() => getInitialModelId(initialModelId));
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const conversationMenuRef = useRef<HTMLDivElement | null>(null);
  const conversationTitleButtonRef = useRef<HTMLButtonElement | null>(null);
  const [panelSize, setPanelSize] = useState({ width: 0, height: 0 });
  const isResizing = useRef(false);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  const handleResizeStart = (e: React.PointerEvent<HTMLDivElement>, direction: 'top' | 'left' | 'both') => {
    isResizing.current = true;
    const parent = (e.target as HTMLElement).parentElement;
    if (!parent) return;

    resizeStart.current = {
      width: panelSize.width || parent.offsetWidth,
      height: panelSize.height || parent.offsetHeight,
      x: e.clientX,
      y: e.clientY
    };
    document.body.style.userSelect = 'none';
    
    const handleResizeMove = (moveEvent: PointerEvent) => {
      if (!isResizing.current) return;
      const deltaX = resizeStart.current.x - moveEvent.clientX;
      const deltaY = resizeStart.current.y - moveEvent.clientY;
      
      setPanelSize({
        width: direction === 'top' ? resizeStart.current.width : Math.max(320, Math.min(1000, resizeStart.current.width + deltaX)),
        height: direction === 'left' ? resizeStart.current.height : Math.max(400, Math.min(1200, resizeStart.current.height + deltaY))
      });
    };

    const handleResizeEnd = () => {
      isResizing.current = false;
      document.body.style.userSelect = '';
      document.removeEventListener('pointermove', handleResizeMove);
      document.removeEventListener('pointerup', handleResizeEnd);
    };

    document.addEventListener('pointermove', handleResizeMove);
    document.addEventListener('pointerup', handleResizeEnd);
  };

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
    if (!isBlocked) {
      return;
    }
    setOpen(false);
    setConversationMenuOpen(false);
  }, [isBlocked]);

  useEffect(() => {
    if (!activeConversationId || !conversations.some((conversation) => conversation.id === activeConversationId)) {
      setActiveConversationId(getInitialActiveConversationId(conversations));
    }
  }, [activeConversationId, conversations]);

  useEffect(() => {
    if (!isConversationMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (conversationMenuRef.current?.contains(target) || conversationTitleButtonRef.current?.contains(target)) {
        return;
      }
      setConversationMenuOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setConversationMenuOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isConversationMenuOpen]);

  const updateConversation = (conversationId: string, updater: (conversation: Conversation) => Conversation) => {
    setConversations((current) => current.map((conversation) => (conversation.id === conversationId ? updater(conversation) : conversation)));
  };

  const createConversation = () => {
    if (isFreshEmptyConversation(activeConversation)) {
      setConversationMenuOpen(false);
      setOpen(true);
      return;
    }
    const conversation = createEmptyConversation();
    setConversations((current) => [conversation, ...current]);
    setActiveConversationId(conversation.id);
    setConversationMenuOpen(false);
    setOpen(true);
  };

  const selectConversation = (conversationId: string) => {
    setActiveConversationId(conversationId);
    setConversationMenuOpen(false);
    setOpen(true);
  };

  const deleteConversation = (conversationId: string) => {
    setConversationToDelete(conversationId);
  };

  const executeDeleteConversation = () => {
    if (!conversationToDelete) return;
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

  return (
    <div className={`ai-chat-floating ${isOpen ? "open" : ""}`}>
      {isOpen ? (
        <section className="ai-chat-panel" aria-label="AI 聊天浮窗" style={panelSize.width > 0 ? { width: panelSize.width, height: panelSize.height } : undefined}>
          <div className="ai-chat-resizer-top" onPointerDown={(e) => handleResizeStart(e, 'top')} />
          <div className="ai-chat-resizer-left" onPointerDown={(e) => handleResizeStart(e, 'left')} />
          <div className="ai-chat-resizer-corner" onPointerDown={(e) => handleResizeStart(e, 'both')} />
          <header className="ai-chat-header">
            <button
              className="ai-chat-title-button"
              ref={conversationTitleButtonRef}
              type="button"
              aria-expanded={isConversationMenuOpen}
              aria-haspopup="menu"
              onClick={() => setConversationMenuOpen((value) => !value)}
            >
              <span>{activeConversation?.title || DEFAULT_CONVERSATION_TITLE}</span>
              <i aria-hidden="true" />
            </button>
            <div className="ai-chat-header-actions">
              <button type="button" onClick={createConversation} aria-label="新建 AI 对话">
                <MessageCirclePlus size={22} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setConversationMenuOpen(false);
                }}
                aria-label="最小化 AI 聊天"
              >
                <Minus size={24} />
              </button>
            </div>
          </header>
          {isConversationMenuOpen ? (
            <ConversationMenu
              activeConversationId={activeConversation?.id || ""}
              conversations={sortedConversations}
              ref={conversationMenuRef}
              onDelete={deleteConversation}
              onSelect={selectConversation}
            />
          ) : null}
          {conversationToDelete ? (
            <div className="ai-chat-confirm-overlay">
              <div className="ai-chat-confirm-dialog">
                <div className="ai-chat-confirm-title">删除对话记录</div>
                <div className="ai-chat-confirm-desc">确定要删除这条对话记录吗？删除后将无法恢复。</div>
                <div className="ai-chat-confirm-actions">
                  <button className="ai-chat-confirm-btn cancel" type="button" onClick={() => setConversationToDelete(null)}>取消</button>
                  <button className="ai-chat-confirm-btn danger" type="button" onClick={executeDeleteConversation}>删除</button>
                </div>
              </div>
            </div>
          ) : null}
          <ChatThread isSending={isSending} messages={activeConversation?.messages || []} />
          <ChatComposer disabled={isSending} onModelChange={setSelectedModelId} onSend={sendMessage} selectedModelId={selectedModel.id} />
        </section>
      ) : !isBlocked ? (
        <button className="ai-chat-launcher" type="button" onClick={() => setOpen(true)} aria-label="打开 AI 聊天">
          <span className="ai-chat-launcher-avatar" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
