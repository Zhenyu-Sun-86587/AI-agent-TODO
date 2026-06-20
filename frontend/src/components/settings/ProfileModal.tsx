import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { asErrorMessage } from "../../api/errors";
import { ProfileSettings } from "../../features/settings/components/ProfileSettings";
import type { ProfileState } from "../../features/settings/types";
import { useAnimatedDismiss, useEscapeToClose } from "../../hooks/useDismissAnimation";

interface ProfileModalProps {
  onClose: () => void;
  onSaveProfile: (profile: ProfileState) => Promise<string | void>;
  overlayExitMs?: number;
  profile: ProfileState;
}

export default function ProfileModal({ onClose, onSaveProfile, overlayExitMs = 180, profile }: ProfileModalProps) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, overlayExitMs);
  useEscapeToClose(closeWithAnimation);

  const [profileDraft, setProfileDraft] = useState(profile);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<"idle" | "success" | "failed">("idle");
  const [isSavingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    // 外层资料刷新后同步重置草稿，避免弹窗继续编辑旧值。
    setProfileDraft(profile);
  }, [profile]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProfile(true);
    setFeedback("");
    try {
      // 当前接口返回字符串时可能既表示成功提示也表示校验失败信息，这里统一做前端语义归类。
      const message = await onSaveProfile(profileDraft);
      const isFailure = (message || "").includes("不能") || (message || "").includes("无效") || (message || "").includes("不能为空");
      setFeedback(message || "用户资料已保存。");
      setFeedbackTone(isFailure ? "failed" : "success");
    } catch (error) {
      setFeedback(asErrorMessage(error));
      setFeedbackTone("failed");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <div className={`modal-backdrop ${isClosing ? "closing" : ""}`}>
      <div className={`create-modal profile-modal ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Profile</p>
            <h2>个人资料</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭个人资料">
            <X size={18} />
          </button>
        </div>
        <div className="modal-content profile-modal-content">
          <ProfileSettings
            feedback={feedback}
            feedbackTone={feedbackTone}
            isSavingProfile={isSavingProfile}
            onChange={setProfileDraft}
            onSubmit={saveProfile}
            profileDraft={profileDraft}
          />
        </div>
      </div>
    </div>
  );
}
