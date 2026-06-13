import type { SettingsState } from "../types";

export function ModelSettings({
  draft,
  feedback,
  feedbackTone,
  isSaving,
  isTesting,
  onDraftChange,
  onSubmit,
  onTestConnection,
  settings,
}: {
  draft: SettingsState;
  feedback: string;
  feedbackTone: "idle" | "success" | "failed";
  isSaving: boolean;
  isTesting: boolean;
  onDraftChange: (settings: SettingsState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onTestConnection: () => void;
  settings: SettingsState;
}) {
  return (
    <form className="settings-section settings-form" onSubmit={onSubmit}>
      <h3 style={{ fontSize: "20px", marginBottom: "24px", fontWeight: 600 }}>AI 配置</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 500 }}>OpenAI API Key</span>
          <input
            value={draft.openaiApiKey}
            onChange={(event) => onDraftChange({ ...draft, openaiApiKey: event.target.value })}
            placeholder={settings.maskedKey || "sk-... 留空则使用后端已保存 Key"}
            type="password"
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ fontSize: "14px", fontWeight: 500 }}>模型名称</span>
          <input
            value={draft.modelName}
            onChange={(event) => onDraftChange({ ...draft, modelName: event.target.value })}
            placeholder="例如: gpt-3.5-turbo (留空使用系统默认)"
          />
        </label>
        <div className="settings-actions" style={{ marginTop: "8px", justifyContent: "flex-start", gap: "12px" }}>
          <button className="primary-button" type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存设置"}
          </button>
          <button className="ghost-button" type="button" onClick={onTestConnection} disabled={isTesting}>
            {isTesting ? "测试中..." : "测试连接"}
          </button>
        </div>
        {feedbackTone !== "idle" && <p className={`connection-result ${feedbackTone}`} style={{ margin: 0 }}>{feedback}</p>}
      </div>
    </form>
  );
}
