import { useEffect, useState, type FormEvent } from "react";
import { Bot, FileText, Moon, Settings, Sun, X } from "lucide-react";
import { API_BASE_URL } from "../../api/client";
import { asErrorMessage } from "../../api/errors";
import { ActionButton } from "../ui/primitives";
import { ModelSettings } from "../../features/settings/components/ModelSettings";
import type { SettingsState } from "../../features/settings/types";
import { useAnimatedDismiss, useEscapeToClose } from "../../hooks/useDismissAnimation";

interface SettingsModalProps {
  isDark: boolean;
  onClose: () => void;
  onSave: (settings: SettingsState) => Promise<string | void>;
  onTest: (settings: SettingsState) => Promise<string>;
  onToggleTheme: () => void;
  overlayExitMs?: number;
  settings: SettingsState;
}

export default function SettingsModal({
  isDark,
  onClose,
  onSave,
  onTest,
  onToggleTheme,
  overlayExitMs = 180,
  settings,
}: SettingsModalProps) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, overlayExitMs);
  useEscapeToClose(closeWithAnimation);

  const [draft, setDraft] = useState(settings);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"idle" | "success" | "failed">("idle");
  const [isSaving, setSaving] = useState(false);
  const [isTesting, setTesting] = useState(false);
  const [activeTab, setActiveTab] = useState<"theme" | "ai" | "debug">("theme");

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFeedback("");
    try {
      const message = await onSave(draft);
      setFeedback(message || "设置已保存。");
      setFeedbackTone("success");
    } catch (error) {
      setFeedback(asErrorMessage(error));
      setFeedbackTone("failed");
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setFeedback("");
    try {
      const message = await onTest(draft);
      const isFailure = message.includes("失败") || message.includes("过短") || message.includes("无效");
      setFeedback(message);
      setFeedbackTone(isFailure ? "failed" : "success");
    } catch (error) {
      setFeedback(asErrorMessage(error));
      setFeedbackTone("failed");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={`modal-backdrop settings-modal-backdrop ${isClosing ? "closing" : ""}`}>
      <div className={`create-modal settings-shell-modal ${isClosing ? "closing" : ""}`}>
        <div className="settings-shell-layout">
          <aside className="settings-shell-sidebar">
            <div className="settings-shell-brand">
              <h2>设置</h2>
            </div>
            <div className="settings-nav-list">
              <button
                className={`settings-nav-button ${activeTab === "theme" ? "active" : ""}`}
                onClick={() => setActiveTab("theme")}
                type="button"
              >
                <Settings size={18} />
                常规
              </button>
              <button
                className={`settings-nav-button ${activeTab === "ai" ? "active" : ""}`}
                onClick={() => setActiveTab("ai")}
                type="button"
              >
                <Bot size={18} />
                AI 配置
              </button>
              <button
                className={`settings-nav-button ${activeTab === "debug" ? "active" : ""}`}
                onClick={() => setActiveTab("debug")}
                type="button"
              >
                <FileText size={18} />
                联调信息
              </button>
            </div>
          </aside>

          <main className="settings-shell-main">
            <div className="settings-close-anchor">
              <button className="icon-button settings-close-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭设置">
                <X size={18} />
              </button>
            </div>
            <div className="settings-shell-content">
              {activeTab === "theme" && (
                <div className="settings-section">
                  <h3 className="settings-section-title">常规</h3>
                  <div className="settings-stack">
                    <div className="settings-row">
                      <div>
                        <span>外观</span>
                        <small>切换亮色或暗色模式</small>
                      </div>
                      <ActionButton icon={isDark ? <Sun size={16} /> : <Moon size={16} />} onClick={onToggleTheme}>
                          {isDark ? "亮色模式" : "暗色模式"}
                      </ActionButton>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "ai" && (
                <ModelSettings
                  draft={draft}
                  feedback={feedback}
                  feedbackTone={feedbackTone}
                  isSaving={isSaving}
                  isTesting={isTesting}
                  onDraftChange={setDraft}
                  onSubmit={save}
                  onTestConnection={testConnection}
                  settings={settings}
                />
              )}

              {activeTab === "debug" && (
                <aside className="settings-section">
                  <h3 className="settings-section-title">联调信息</h3>
                  <div className="settings-stack">
                    <label className="settings-field">
                      <span>API Base URL</span>
                      <div className="settings-readonly">
                        {API_BASE_URL}
                      </div>
                    </label>
                    <label className="settings-field">
                      <span>AI 模式</span>
                      <div className="settings-readonly">
                        {settings.hasOpenaiApiKey || draft.openaiApiKey ? "已配置 Key" : "mock / 未配置 Key"}
                      </div>
                    </label>
                    <label className="settings-field">
                      <span>脱敏 Key</span>
                      <div className="settings-readonly">
                        {settings.maskedKey || "未保存"}
                      </div>
                    </label>
                    <label className="settings-field">
                      <span>存储方式</span>
                      <div className="settings-readonly">
                        后端 /settings，本地模式使用 localStorage
                      </div>
                    </label>
                  </div>
                  <p className="settings-help-text">保存会调用 /settings，测试会调用 /settings/test-openai-key。</p>
                </aside>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
