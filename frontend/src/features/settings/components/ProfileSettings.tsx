import { ActionButton, Surface } from "../../../components/ui/primitives";
import type { ProfileState } from "../types";

export function ProfileSettings({
  feedback,
  feedbackTone,
  isSavingProfile,
  onChange,
  onSubmit,
  profileDraft,
}: {
  feedback: string;
  feedbackTone: "idle" | "success" | "failed";
  isSavingProfile: boolean;
  onChange: (profile: ProfileState) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  profileDraft: ProfileState;
}) {
  return (
    <Surface as="form" className="settings-form" onSubmit={onSubmit}>
      <label className="settings-field">
        <span>用户名</span>
        <input
          value={profileDraft.username}
          onChange={(event) => onChange({ ...profileDraft, username: event.target.value })}
          placeholder="请输入用户名"
        />
      </label>
      <label className="settings-field">
        <span>邮箱</span>
        <input
          value={profileDraft.email}
          onChange={(event) => onChange({ ...profileDraft, email: event.target.value })}
          placeholder="you@qq.com"
        />
      </label>
      <div className="settings-actions">
        <ActionButton variant="primary" type="submit" disabled={isSavingProfile}>
          {isSavingProfile ? "保存中..." : "保存资料"}
        </ActionButton>
      </div>
      {feedbackTone !== "idle" && <p className={`connection-result ${feedbackTone}`}>{feedback}</p>}
    </Surface>
  );
}
