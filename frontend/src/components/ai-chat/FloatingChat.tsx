import { MessageCirclePlus, Minus } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import ChatComposer from "./ChatComposer";
import ChatThread from "./ChatThread";
import ConversationMenu from "./ConversationMenu";
import "./FloatingChat.css";
import { useChatConversations } from "../../features/ai-chat/hooks/useChatConversations";
import { useChatPanelResize } from "../../features/ai-chat/hooks/useChatPanelResize";
import { DEFAULT_CONVERSATION_TITLE } from "../../features/ai-chat/constants";
import type { ChatAttachment } from "../../features/ai-chat/types";

const CLOSE_ANIMATION_MS = 200;

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
  const [isClosing, setClosing] = useState(false);
  const [isConversationMenuOpen, setConversationMenuOpen] = useState(false);
  const [composerInput, setComposerInput] = useState("");
  const [composerAttachments, setComposerAttachments] = useState<ChatAttachment[]>([]);
  const [isFollowUpMode, setFollowUpMode] = useState(false);
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
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
    modelGroups,
    requestDeleteConversation,
    selectConversation,
    selectedModel,
    sendMessage,
    setSelectedModelId,
    sortedConversations,
  } = useChatConversations(initialModelId, token, onTaskChanged);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeChatPanel = useCallback(() => {
    setConversationMenuOpen(false);

    if (!isOpen || isClosing) {
      return;
    }

    // 关闭时先进入 closing 状态等待 CSS 动画结束，再真正卸载面板。
    clearCloseTimer();
    setClosing(true);
    closeTimerRef.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      closeTimerRef.current = null;
    }, CLOSE_ANIMATION_MS);
  }, [clearCloseTimer, isClosing, isOpen]);

  const openChatPanel = useCallback(() => {
    clearCloseTimer();
    setClosing(false);
    setOpen(true);
  }, [clearCloseTimer]);

  useEffect(() => {
    return () => clearCloseTimer();
  }, [clearCloseTimer]);

  useEffect(() => {
    if (!isOpen) {
      setClosing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isBlocked) {
      return;
    }
    // 设置弹窗打开时收起聊天，避免两个浮层同时抢焦点和键盘事件。
    closeChatPanel();
  }, [closeChatPanel, isBlocked]);

  useEffect(() => {
    if (!isOpen || isBlocked) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      if (floatingRef.current?.contains(target)) {
        return;
      }
      // 点击浮窗外部只关闭面板，不清空当前会话或输入草稿。
      closeChatPanel();
    };

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
  }, [closeChatPanel, isBlocked, isOpen]);

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
        // 新建/复用空会话后统一打开面板，保证启动按钮和菜单入口行为一致。
        setConversationMenuOpen(false);
        openChatPanel();
      },
    });
  };

  const openSelectedConversation = (conversationId: string) => {
    selectConversation(conversationId);
    setConversationMenuOpen(false);
    openChatPanel();
  };

  return (
    <div className={`ai-chat-floating ${isOpen ? "open" : ""} ${isClosing ? "closing" : ""}`} ref={floatingRef}>
      {isOpen ? (
        <section className={`ai-chat-panel ${isClosing ? "closing" : ""}`} aria-label="AI 聊天浮窗" style={panelSize.width > 0 ? { width: panelSize.width, height: panelSize.height } : undefined}>
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
                onClick={closeChatPanel}
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
            modelGroups={modelGroups}
            onAttachmentsChange={setComposerAttachments}
            onFollowUpModeChange={setFollowUpMode}
            onInputChange={setComposerInput}
            onModelChange={setSelectedModelId}
            onSend={sendMessage}
            selectedModelId={selectedModel.id}
          />
        </section>
      ) : !isBlocked ? (
        <button className="ai-chat-launcher" type="button" onClick={openChatPanel} aria-label="打开 AI 聊天">
          <span className="ai-chat-launcher-avatar" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
