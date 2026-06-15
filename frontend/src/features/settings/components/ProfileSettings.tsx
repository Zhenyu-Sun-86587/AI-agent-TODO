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
    <form className="content-card settings-form" onSubmit={onSubmit}>
      <label>
        用户名
        <input
          value={profileDraft.username}
          onChange={(event) => onChange({ ...profileDraft, username: event.target.value })}
          placeholder="请输入用户名"
        />
      </label>
      <label>
        邮箱
        <input
          value={profileDraft.email}
          onChange={(event) => onChange({ ...profileDraft, email: event.target.value })}
          placeholder="you@qq.com"
        />
      </label>
      <div className="settings-actions">
        <button className="primary-button" type="submit" disabled={isSavingProfile}>
          {isSavingProfile ? "保存中..." : "保存资料"}
        </button>
      </div>
      {feedbackTone !== "idle" && <p className={`connection-result ${feedbackTone}`}>{feedback}</p>}
    </form>
  );
}
