import { ActionButton } from "../../../components/ui/primitives";
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
      <h3 className="settings-section-title">AI 配置</h3>
      <div className="settings-stack">
        <label className="settings-field">
          <span>OpenAI API Key</span>
          <input
            value={draft.openaiApiKey}
            onChange={(event) => onDraftChange({ ...draft, openaiApiKey: event.target.value })}
            placeholder={settings.maskedKey || "sk-... 留空则使用后端已保存 Key"}
            type="password"
          />
        </label>
        <label className="settings-field">
          <span>模型名称</span>
          <input
            value={draft.modelName}
            onChange={(event) => onDraftChange({ ...draft, modelName: event.target.value })}
            placeholder="例如: gpt-3.5-turbo (留空使用系统默认)"
          />
        </label>
        <div className="settings-actions">
          <ActionButton variant="primary" type="submit" disabled={isSaving}>
            {isSaving ? "保存中..." : "保存设置"}
          </ActionButton>
          <ActionButton onClick={onTestConnection} disabled={isTesting}>
            {isTesting ? "测试中..." : "测试连接"}
          </ActionButton>
        </div>
        {feedbackTone !== "idle" && <p className={`connection-result ${feedbackTone}`}>{feedback}</p>}
      </div>
    </form>
  );
}
