import { Trash2 } from "lucide-react";
import { forwardRef } from "react";
import type { Conversation } from "./types";

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "刚刚";
  }
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

type ConversationMenuProps = {
  activeConversationId: string;
  conversations: Conversation[];
  onDelete: (conversationId: string) => void;
  onSelect: (conversationId: string) => void;
};

const ConversationMenu = forwardRef<HTMLDivElement, ConversationMenuProps>(function ConversationMenu(
  { activeConversationId, conversations, onDelete, onSelect },
  ref,
) {
  return (
    <div className="ai-chat-conversation-menu" ref={ref} role="menu" aria-label="AI 对话列表">
      {conversations.map((conversation) => (
        <button
          className={conversation.id === activeConversationId ? "active" : ""}
          key={conversation.id}
          type="button"
          role="menuitem"
          onClick={() => onSelect(conversation.id)}
        >
          <span className="ai-chat-conversation-meta">
            <strong>{conversation.title}</strong>
            <small>
              {conversation.messages.length ? `${conversation.messages.length} 条消息` : "空对话"} · {formatUpdatedAt(conversation.updatedAt)}
            </small>
          </span>
          <span
            className="ai-chat-conversation-delete"
            role="button"
            tabIndex={0}
            aria-label={`删除 ${conversation.title}`}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(conversation.id);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onDelete(conversation.id);
              }
            }}
          >
            <Trash2 size={15} />
          </span>
        </button>
      ))}
    </div>
  );
});

export default ConversationMenu;
