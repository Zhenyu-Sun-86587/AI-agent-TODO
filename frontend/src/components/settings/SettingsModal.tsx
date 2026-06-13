import { useEffect, useState, type FormEvent } from "react";
import { Bot, FileText, Moon, Settings, Sun, X } from "lucide-react";
import { API_BASE_URL } from "../../api/client";
import { asErrorMessage } from "../../api/errors";
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
    <div className={`modal-backdrop settings-modal-backdrop ${isClosing ? "closing" : ""}`} style={{ backdropFilter: "blur(12px)", backgroundColor: "rgba(0,0,0,0.4)" }}>
      <div
        className={`create-modal ${isClosing ? "closing" : ""}`}
        style={{
          maxWidth: "800px",
          width: "90%",
          padding: 0,
          overflow: "hidden",
          backgroundColor: isDark ? "rgba(30, 30, 30, 0.75)" : "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "1px solid rgba(0, 0, 0, 0.1)",
          boxShadow: "0 24px 48px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ display: "flex", height: "65vh", minHeight: "450px" }}>
          <aside style={{ width: "240px", backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.03)", borderRight: isDark ? "1px solid rgba(255,255,255,0.05)" : "1px solid rgba(0,0,0,0.05)", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "24px 20px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "18px", fontWeight: 600, margin: 0 }}>设置</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", padding: "0 12px", gap: "4px" }}>
              <button
                className={`ghost-button ${activeTab === "theme" ? "active" : ""}`}
                onClick={() => setActiveTab("theme")}
                style={{ justifyContent: "flex-start", width: "100%", padding: "10px 12px", backgroundColor: activeTab === "theme" ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent", color: activeTab === "theme" ? "var(--text)" : "var(--text-secondary)", border: "none" }}
              >
                <Settings size={18} style={{ marginRight: "12px" }} />
                常规
              </button>
              <button
                className={`ghost-button ${activeTab === "ai" ? "active" : ""}`}
                onClick={() => setActiveTab("ai")}
                style={{ justifyContent: "flex-start", width: "100%", padding: "10px 12px", backgroundColor: activeTab === "ai" ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent", color: activeTab === "ai" ? "var(--text)" : "var(--text-secondary)", border: "none" }}
              >
                <Bot size={18} style={{ marginRight: "12px" }} />
                AI 配置
              </button>
              <button
                className={`ghost-button ${activeTab === "debug" ? "active" : ""}`}
                onClick={() => setActiveTab("debug")}
                style={{ justifyContent: "flex-start", width: "100%", padding: "10px 12px", backgroundColor: activeTab === "debug" ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)") : "transparent", color: activeTab === "debug" ? "var(--text)" : "var(--text-secondary)", border: "none" }}
              >
                <FileText size={18} style={{ marginRight: "12px" }} />
                联调信息
              </button>
            </div>
          </aside>

          <main style={{ flex: 1, backgroundColor: "transparent", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: "16px", right: "16px", zIndex: 10 }}>
              <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭设置" style={{ width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={18} />
              </button>
            </div>
            <div style={{ padding: "40px", overflowY: "auto", flex: 1 }}>
              {activeTab === "theme" && (
                <div className="settings-section">
                  <h3 style={{ fontSize: "20px", marginBottom: "24px", fontWeight: 600 }}>常规</h3>
                  <div className="settings-actions" style={{ justifyContent: "flex-start" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
                        <div>
                          <span style={{ fontSize: "14px", fontWeight: 500, display: "block" }}>外观</span>
                          <span style={{ fontSize: "13px", color: "var(--text-secondary)" }}>切换亮色或暗色模式</span>
                        </div>
                        <button className="ghost-button" type="button" onClick={onToggleTheme} style={{ border: "1px solid var(--border)", padding: "8px 16px" }}>
                          {isDark ? <Sun size={16} style={{ marginRight: "8px" }} /> : <Moon size={16} style={{ marginRight: "8px" }} />}
                          {isDark ? "亮色模式" : "暗色模式"}
                        </button>
                      </div>
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
                  <h3 style={{ fontSize: "20px", marginBottom: "24px", fontWeight: 600 }}>联调信息</h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                    <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>API Base URL</span>
                      <div style={{ padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", color: "var(--text)", width: "100%", maxWidth: "400px" }}>
                        {API_BASE_URL}
                      </div>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>AI 模式</span>
                      <div style={{ padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", color: "var(--text)", width: "100%", maxWidth: "400px" }}>
                        {settings.hasOpenaiApiKey || draft.openaiApiKey ? "已配置 Key" : "mock / 未配置 Key"}
                      </div>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>脱敏 Key</span>
                      <div style={{ padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", color: "var(--text)", width: "100%", maxWidth: "400px" }}>
                        {settings.maskedKey || "未保存"}
                      </div>
                    </label>
                    <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      <span style={{ fontSize: "14px", fontWeight: 500 }}>存储方式</span>
                      <div style={{ padding: "10px 12px", borderRadius: "6px", border: "1px solid var(--border)", background: isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.5)", color: "var(--text)", width: "100%", maxWidth: "400px" }}>
                        后端 /settings，本地模式使用 localStorage
                      </div>
                    </label>
                  </div>
                  <p style={{ marginTop: "16px", fontSize: "13px", color: "var(--text-secondary)" }}>保存会调用 /settings，测试会调用 /settings/test-openai-key。</p>
                </aside>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
