import { ArrowUp, FilePlus2, X, ChevronDown, Check, Bot } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { CHAT_MODEL_GROUPS } from "./models";
import { createId } from "./storage";
import type { ChatAttachment } from "./types";

function toAttachment(file: File): ChatAttachment {
  return {
    id: createId("attachment"),
    name: file.name,
    size: file.size,
    type: file.type,
  };
}

function getProviderLogo(provider: string) {
  if (provider === "openai") {
    return { alt: "GPT", provider, src: "/gpt-logo.png" };
  }
  if (provider === "deepseek") {
    return { alt: "DeepSeek", provider, src: "/deepseek-logo.png" };
  }
  return null;
}

function ProviderLogo({ alt, className, provider, src }: { alt: string; className?: string; provider: string; src: string }) {
  return <img alt={alt} className={`${className || ""} ai-model-provider-${provider}`.trim()} src={src} />;
}

function ModelSelector({ selectedModelId, onModelChange }: { selectedModelId: string; onModelChange: (id: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedModel = CHAT_MODEL_GROUPS.flatMap(g => g.models).find(m => m.id === selectedModelId);
  const selectedLogo = selectedModel ? getProviderLogo(selectedModel.provider) : null;

  return (
    <div className="ai-model-selector" ref={containerRef}>
      <button 
        type="button" 
        className="ai-model-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        aria-label="选择模型"
      >
        {selectedLogo ? <ProviderLogo {...selectedLogo} className="ai-model-icon" /> : <Bot size={14} className="ai-model-icon" />}
        <span>{selectedModel?.label || "选择模型"}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <div className="ai-model-menu">
          <div className="ai-model-menu-header">选择模型</div>
          {CHAT_MODEL_GROUPS.map((group) => (
            <div key={group.provider} className="ai-model-group">
              <div className="ai-model-group-title">{group.label}</div>
              {group.models.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`ai-model-item ${selectedModelId === model.id ? "active" : ""}`}
                  onClick={() => {
                    onModelChange(model.id);
                    setIsOpen(false);
                  }}
                >
                  {getProviderLogo(model.provider) ? (
                    <ProviderLogo {...getProviderLogo(model.provider)!} className="ai-model-icon" />
                  ) : (
                    <Bot size={14} className="ai-model-icon" />
                  )}
                  <span>{model.label}</span>
                  {selectedModelId === model.id && <Check size={14} className="ai-model-check" />}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChatComposer({
  attachments,
  disabled,
  input,
  onAttachmentsChange,
  onInputChange,
  onModelChange,
  onSend,
  selectedModelId,
}: {
  attachments: ChatAttachment[];
  disabled: boolean;
  input: string;
  onAttachmentsChange: (attachments: ChatAttachment[]) => void;
  onInputChange: (value: string) => void;
  onModelChange: (modelId: string) => void;
  onSend: (input: string, attachments: ChatAttachment[]) => Promise<void> | void;
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
    void onSend(nextInput, nextAttachments);
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
        
        <ModelSelector selectedModelId={selectedModelId} onModelChange={onModelChange} />

        <button className="ai-chat-send" type="button" onClick={submit} disabled={disabled || !canSend} aria-label="发送消息">
          <ArrowUp size={18} />
        </button>
      </div>
    </form>
  );
}
