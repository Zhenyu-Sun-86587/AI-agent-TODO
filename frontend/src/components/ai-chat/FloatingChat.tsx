import { MessageCirclePlus, Minus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ChatComposer from "./ChatComposer";
import ChatThread from "./ChatThread";
import ConversationMenu from "./ConversationMenu";
import "./FloatingChat.css";
import { useChatConversations } from "../../features/ai-chat/hooks/useChatConversations";
import { useChatPanelResize } from "../../features/ai-chat/hooks/useChatPanelResize";
import { DEFAULT_CONVERSATION_TITLE } from "../../features/ai-chat/constants";
import type { ChatAttachment } from "./types";

export default function FloatingChat({
  initialModelId,
  isBlocked = false,
  onTaskChanged,
  token = "",
}: {
  initialModelId?: string;
  isBlocked?: boolean;
  onTaskChanged?: () => Promise<void> | void;
  token?: string;
}) {
  const [isOpen, setOpen] = useState(false);
  const [isConversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [composerInput, setComposerInput] = useState("");
  const [composerAttachments, setComposerAttachments] = useState<ChatAttachment[]>([]);
  const [isFollowUpMode, setFollowUpMode] = useState(false);
  const conversationMenuRef = useRef<HTMLDivElement | null>(null);
  const conversationTitleButtonRef = useRef<HTMLButtonElement | null>(null);
  const { handleResizeStart, panelSize } = useChatPanelResize();
  const {
    activeConversation,
    cancelDeleteConversation,
    conversationToDelete,
    createConversation,
    executeDeleteConversation,
    isSending,
    requestDeleteConversation,
    selectConversation,
    selectedModel,
    sendMessage,
    setSelectedModelId,
    sortedConversations,
  } = useChatConversations(initialModelId, token, onTaskChanged);

  useEffect(() => {
    if (!isBlocked) {
      return;
    }
    setOpen(false);
    setConversationMenuOpen(false);
  }, [isBlocked]);

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

  const openConversation = () => {
    createConversation({
      onOpen: () => {
        setConversationMenuOpen(false);
        setOpen(true);
      },
    });
  };

  const openSelectedConversation = (conversationId: string) => {
    selectConversation(conversationId);
    setConversationMenuOpen(false);
    setOpen(true);
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
              <button type="button" onClick={openConversation} aria-label="新建 AI 对话">
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
              onDelete={requestDeleteConversation}
              onSelect={openSelectedConversation}
            />
          ) : null}
          {conversationToDelete ? (
            <div className="ai-chat-confirm-overlay">
              <div className="ai-chat-confirm-dialog">
                <div className="ai-chat-confirm-title">删除对话记录</div>
                <div className="ai-chat-confirm-desc">确定要删除这条对话记录吗？删除后将无法恢复。</div>
                <div className="ai-chat-confirm-actions">
                  <button className="ai-chat-confirm-btn cancel" type="button" onClick={cancelDeleteConversation}>取消</button>
                  <button className="ai-chat-confirm-btn danger" type="button" onClick={executeDeleteConversation}>删除</button>
                </div>
              </div>
            </div>
          ) : null}
          <ChatThread isSending={isSending} messages={activeConversation?.messages || []} />
          <ChatComposer
            attachments={composerAttachments}
            disabled={isSending}
            input={composerInput}
            isFollowUpMode={isFollowUpMode}
            onAttachmentsChange={setComposerAttachments}
            onFollowUpModeChange={setFollowUpMode}
            onInputChange={setComposerInput}
            onModelChange={setSelectedModelId}
            onSend={sendMessage}
            selectedModelId={selectedModel.id}
          />
        </section>
      ) : !isBlocked ? (
        <button className="ai-chat-launcher" type="button" onClick={() => setOpen(true)} aria-label="打开 AI 聊天">
          <span className="ai-chat-launcher-avatar" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
