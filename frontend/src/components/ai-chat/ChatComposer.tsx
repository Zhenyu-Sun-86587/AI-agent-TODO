import { ArrowUp, FilePlus2, X } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import type { ChatAttachment, ChatModelGroup, ChatSendOptions } from "../../features/ai-chat/types";
import ModelSelector from "./ModelSelector";

function createAttachmentId() {
  return `attachment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toAttachment(file: File): ChatAttachment {
  return {
    id: createAttachmentId(),
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

export default function ChatComposer({
  attachments,
  disabled,
  input,
  isFollowUpMode,
  onAttachmentsChange,
  onFollowUpModeChange,
  onInputChange,
  onModelChange,
  onSend,
  modelGroups,
  selectedModelId,
}: {
  attachments: ChatAttachment[];
  disabled: boolean;
  input: string;
  isFollowUpMode: boolean;
  modelGroups: ChatModelGroup[];
  onAttachmentsChange: (attachments: ChatAttachment[]) => void;
  onFollowUpModeChange: (enabled: boolean) => void;
  onInputChange: (value: string) => void;
  onModelChange: (modelId: string) => void;
  onSend: (input: string, attachments: ChatAttachment[], options: ChatSendOptions) => Promise<void> | void;
  selectedModelId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSend = Boolean(input.trim()) || attachments.length > 0;

  const submit = () => {
    const nextInput = textareaRef.current?.value ?? input;
    const nextAttachments = attachments;
    if (disabled || (!nextInput.trim() && nextAttachments.length === 0)) {
      return;
    }
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
    onInputChange("");
    onAttachmentsChange([]);
    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.value = "";
      }
      onInputChange("");
    });
    void onSend(nextInput, nextAttachments, { followUpMode: isFollowUpMode });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form
      className="ai-chat-composer"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      {attachments.length ? (
        <div className="ai-chat-composer-attachments">
          {attachments.map((attachment) => (
            <span key={attachment.id}>
              {attachment.name}
              <button
                type="button"
                onClick={() => onAttachmentsChange(attachments.filter((item) => item.id !== attachment.id))}
                aria-label={`移除 ${attachment.name}`}
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>
      ) : null}
      <textarea
        aria-label="AI 聊天输入"
        ref={textareaRef}
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="向 AI 发送消息..."
        rows={3}
      />
      <div className="ai-chat-composer-toolbar">
        <input
          ref={fileInputRef}
          className="ai-chat-file-input"
          multiple
          type="file"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            onAttachmentsChange([...attachments, ...files.map(toAttachment)]);
            event.target.value = "";
          }}
        />
        <button type="button" onClick={() => fileInputRef.current?.click()} aria-label="选择文件">
          <FilePlus2 size={19} />
        </button>
        <button
          className={`ai-follow-up-toggle ${isFollowUpMode ? "active" : ""}`}
          type="button"
          aria-label={isFollowUpMode ? "关闭追问模式" : "开启追问模式"}
          aria-pressed={isFollowUpMode}
          title={isFollowUpMode ? "追问模式已开启" : "追问模式"}
          onClick={() => onFollowUpModeChange(!isFollowUpMode)}
        >
          <span>追问模式</span>
        </button>

        <ModelSelector groups={modelGroups} selectedModelId={selectedModelId} onModelChange={onModelChange} />

        <button className="ai-chat-send" type="button" onClick={submit} disabled={disabled || !canSend} aria-label="发送消息">
          <ArrowUp size={18} />
        </button>
      </div>
    </form>
  );
}
