import { Bot, Check, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChatModelGroup } from "../../features/ai-chat/types";

type ProviderLogoProps = {
  alt: string;
  className?: string;
  provider: string;
  src: string;
};

function getProviderLogo(provider: string) {
  // 图标资源按 provider 分发，缺省时退回统一的 Bot 图标。
  if (provider === "openai") {
    return { alt: "GPT", provider, src: "/gpt-logo.png" };
  }
  if (provider === "deepseek") {
    return { alt: "DeepSeek", provider, src: "/deepseek-logo.png" };
  }
  return null;
}

function ProviderLogo({ alt, className, provider, src }: ProviderLogoProps) {
  return <img alt={alt} className={`${className || ""} ai-model-provider-${provider}`.trim()} src={src} />;
}

export default function ModelSelector({
  groups,
  selectedModelId,
  onModelChange,
}: {
  groups: ChatModelGroup[];
  selectedModelId: string;
  onModelChange: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    // 模型菜单采用点击外部关闭，避免遮挡聊天输入时用户无处收起。
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const selectedModel = groups.flatMap((group) => group.models).find((model) => model.id === selectedModelId);
  const selectedLogo = selectedModel ? getProviderLogo(selectedModel.provider) : null;

  return (
    <div className="ai-model-selector" ref={containerRef}>
      <button
        type="button"
        className="ai-model-trigger"
        onClick={() => setIsOpen((value) => !value)}
        aria-label="选择模型"
      >
        {selectedLogo ? <ProviderLogo {...selectedLogo} className="ai-model-icon" /> : <Bot size={14} className="ai-model-icon" />}
        <span>{selectedModel?.label || "选择模型"}</span>
        <ChevronDown size={14} />
      </button>

      {isOpen ? (
        <div className="ai-model-menu">
          <div className="ai-model-menu-header">选择模型</div>
          {groups.map((group) => (
            <div key={group.provider} className="ai-model-group">
              <div className="ai-model-group-title">{group.label}</div>
              {group.models.map((model) => {
                const logo = getProviderLogo(model.provider);
                return (
                  <button
                    key={model.id}
                    type="button"
                    className={`ai-model-item ${selectedModelId === model.id ? "active" : ""}`}
                    onClick={() => {
                      onModelChange(model.id);
                      setIsOpen(false);
                    }}
                  >
                    {logo ? <ProviderLogo {...logo} className="ai-model-icon" /> : <Bot size={14} className="ai-model-icon" />}
                    <span>{model.label}</span>
                    {selectedModelId === model.id ? <Check size={14} className="ai-model-check" /> : null}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
