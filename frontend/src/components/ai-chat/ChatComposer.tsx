import { ArrowUp, FilePlus2, X } from "lucide-react";
import { useRef, useState, type Dispatch, type KeyboardEvent, type SetStateAction } from "react";
import type { ChatAttachment, ChatModelGroup, ChatSendOptions } from "../../features/ai-chat/types";
import ModelSelector from "./ModelSelector";

function createAttachmentId() {
  // 附件仅在前端会话内使用，组合时间戳和随机串即可满足唯一性要求。
  return `attachment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function toAttachment(file: File): ChatAttachment {
  return {
    id: createAttachmentId(),
    name: file.name,
    size: file.size,
    type: file.type,
    content: "",
  };
}

function isMarkdownFile(file: File) {
  return file.name.toLowerCase().endsWith(".md");
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
  onAttachmentsChange: Dispatch<SetStateAction<ChatAttachment[]>>;
  onFollowUpModeChange: (enabled: boolean) => void;
  onInputChange: (value: string) => void;
  onModelChange: (modelId: string) => void;
  onSend: (input: string, attachments: ChatAttachment[], options: ChatSendOptions) => Promise<void> | void;
  selectedModelId: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [attachmentError, setAttachmentError] = useState("");
  const [isReadingFiles, setIsReadingFiles] = useState(false);
  const canSend = Boolean(input.trim()) || attachments.length > 0;

  const submit = () => {
    const nextInput = textareaRef.current?.value ?? input;
    const nextAttachments = attachments;
    if (disabled || isReadingFiles || (!nextInput.trim() && nextAttachments.length === 0)) {
      return;
    }
    if (textareaRef.current) {
      textareaRef.current.value = "";
    }
    // 先清空本地输入，再异步发送，避免网络慢时用户误以为提交没有生效。
    onInputChange("");
    onAttachmentsChange([]);
    setAttachmentError("");
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
                onClick={() => onAttachmentsChange((current) => current.filter((item) => item.id !== attachment.id))}
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
          accept=".md"
          onChange={(event) => {
            const files = Array.from(event.target.files || []);
            event.target.value = "";
            if (!files.length) {
              return;
            }
            const markdownFiles = files.filter(isMarkdownFile);
            const rejectedFiles = files.filter((file) => !isMarkdownFile(file));
            if (rejectedFiles.length) {
              setAttachmentError(`只支持 .md 文件：${rejectedFiles.map((file) => file.name).join("、")}`);
            } else {
              setAttachmentError("");
            }
            if (!markdownFiles.length) {
              return;
            }
            setIsReadingFiles(true);
            void Promise.all(
              markdownFiles.map(async (file) => ({
                ...(toAttachment(file)),
                content: await file.text(),
              })),
            )
              .then((loadedAttachments) => {
                onAttachmentsChange((current) => [...current, ...loadedAttachments]);
              })
              .catch(() => {
                setAttachmentError("读取 .md 附件失败，请重试。");
              })
              .finally(() => {
                setIsReadingFiles(false);
              });
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="选择文件"
          title={isReadingFiles ? "正在读取附件" : "选择 .md 附件"}
          disabled={isReadingFiles}
        >
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

        <button className="ai-chat-send" type="button" onClick={submit} disabled={disabled || isReadingFiles || !canSend} aria-label="发送消息">
          <ArrowUp size={18} />
        </button>
      </div>
      {attachmentError ? <p className="ai-chat-composer-error">{attachmentError}</p> : null}
    </form>
  );
}
