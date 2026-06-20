import { useCallback, useState, type FormEvent, type KeyboardEvent, type MouseEvent } from "react";
import { ArrowRight, KeyRound, Mail, Sparkles, UserRound } from "lucide-react";
import { API_BASE_URL } from "../api/client";
import { asErrorMessage } from "../api/errors";
import { isBackendCompatibleEmail } from "../features/auth/utils/validation";
import { useAnimatedDismiss, useEscapeToClose } from "../hooks/useDismissAnimation";

export interface AuthPageProps {
  apiMessage: string;
  mode: "login" | "register";
  onDemoLogin: () => Promise<void>;
  onLogin: (account: string, password: string) => Promise<void>;
  onModeChange: (mode: "login" | "register") => void;
  onRegister: (username: string, email: string, password: string) => Promise<void>;
  transitionState?: "idle" | "leaving" | "returning";
}

export default function AuthPage({
  apiMessage,
  mode,
  onDemoLogin,
  onLogin,
  onModeChange,
  onRegister,
  transitionState = "idle",
}: AuthPageProps) {
  const [isPanelOpen, setPanelOpen] = useState(false);
  const [name, setName] = useState("Hikari");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("taskpilot1234");
  const [confirmPassword, setConfirmPassword] = useState("taskpilot1234");
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const completePanelClose = useCallback(() => {
    setPanelOpen(false);
  }, []);
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(completePanelClose, 260, isPanelOpen);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim();

    // 认证页在发请求前先做最基础校验，避免把明显无效输入提交到后端。
    if (!isBackendCompatibleEmail(normalizedEmail)) {
      setError("请输入有效邮箱，不能使用 .local 或 example.com 等保留域名。");
      return;
    }
    if (password.length < 6) {
      setError("密码至少需要 6 位。");
      return;
    }
    if (mode === "register" && !name.trim()) {
      setError("注册时需要填写用户名。");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    try {
      setSubmitting(true);
      if (mode === "register") {
        await onRegister(name.trim(), normalizedEmail, password);
      } else {
        await onLogin(normalizedEmail, password);
      }
    } catch (requestError) {
      setError(asErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const startDemo = async () => {
    setError("");
    try {
      setSubmitting(true);
      await onDemoLogin();
    } catch (requestError) {
      setError(asErrorMessage(requestError));
    } finally {
      setSubmitting(false);
    }
  };

  const openPanel = () => {
    if (isPanelOpen || isClosing) {
      return;
    }
    setPanelOpen(true);
  };

  const closePanel = useCallback(() => {
    if (!isPanelOpen || isClosing) {
      return;
    }
    closeWithAnimation();
  }, [closeWithAnimation, isClosing, isPanelOpen]);

  useEscapeToClose(closePanel);

  const handlePanelStageClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    closePanel();
  };

  const handleShellKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (transitionState !== "idle") {
      return;
    }
    if (isPanelOpen) {
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      // 登录封面支持键盘进入，保证首次进入页面时也有基本无障碍可用性。
      event.preventDefault();
      openPanel();
    }
  };

  return (
    <main
      aria-label={isPanelOpen ? "TaskPilot 登录注册面板" : "TaskPilot 登录封面，点击任意位置进入"}
      className={[
        "auth-shell",
        isPanelOpen ? "panel-open" : "",
        isClosing ? "panel-closing" : "",
        transitionState === "leaving" ? "auth-leaving" : "",
        transitionState === "returning" ? "auth-returning" : "",
      ].filter(Boolean).join(" ")}
      onClick={transitionState === "idle" ? openPanel : undefined}
      onKeyDown={handleShellKeyDown}
      tabIndex={isPanelOpen ? -1 : 0}
    >
      <div className="auth-backdrop-image" />
      <div className="auth-night-overlay" />
      <section aria-hidden={isPanelOpen} className="auth-cover-copy">
        <div className="auth-cover-badge auth-rise auth-rise-1">把想法变成可执行任务</div>
        <h1 className="auth-cover-title auth-rise auth-rise-2">TaskPilot</h1>
        <div className="auth-cover-lines auth-rise auth-rise-3">
          <p>这是一个面向个人使用的智能任务管理系统，</p>
          <p>支持手动创建、编辑、完成任务，也支持通过 AI 聊天快速生成待办。</p>
          <p>任务状态会自动实时更新。</p>
          <p>你可以随时查看进度、截止时间和完成情况。</p>
        </div>
        <p className="auth-cover-note auth-rise auth-rise-4">
          <span className="auth-pulse-text">点击页面任意位置，登录并进入任务工作台。</span>
        </p>
      </section>

      {isPanelOpen && (
        <div className={`auth-panel-stage ${isClosing ? "closing" : ""}`} onClick={handlePanelStageClick}>
          <section
            className={`auth-card auth-card-${mode} ${isClosing ? "closing" : ""}`}
            aria-label={mode === "login" ? "登录 TaskPilot" : "注册 TaskPilot"}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="auth-tabs" role="tablist" aria-label="选择登录或注册">
              <button
                aria-selected={mode === "login"}
                className={mode === "login" ? "active" : ""}
                role="tab"
                type="button"
                onClick={() => onModeChange("login")}
              >
                <KeyRound size={17} />
                登录
              </button>
              <button
                aria-selected={mode === "register"}
                className={mode === "register" ? "active" : ""}
                role="tab"
                type="button"
                onClick={() => onModeChange("register")}
              >
                <UserRound size={17} />
                注册
              </button>
            </div>
            <div className="auth-title">
              <p className="eyebrow">{mode === "login" ? "TASKPILOT ACCESS" : "CREATE WORKSPACE"}</p>
              <h2>{mode === "login" ? "登录任务工作台" : "创建任务账户"}</h2>
              <p>{mode === "login" ? "连接你的 TaskPilot 工作区，继续处理今天的待办与 AI 建议。" : "建立个人任务空间，用 AI 辅助整理待办、优先级和截止安排。"}</p>
            </div>
            <form className="auth-form" onSubmit={submit}>
              {mode === "register" && (
                <label>
                  <span className="auth-label-text"><UserRound size={16} />用户名</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入用户名" />
                </label>
              )}
              <label>
                <span className="auth-label-text"><Mail size={16} />邮箱</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@qq.com" />
              </label>
              <label>
                <span className="auth-label-text"><KeyRound size={16} />密码</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="至少 6 位"
                />
              </label>
              {mode === "register" && (
                <label>
                  <span className="auth-label-text"><KeyRound size={16} />确认密码</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="再次输入密码"
                  />
                </label>
              )}
              {error && <p className="form-error" role="alert">{error}</p>}
              {!error && apiMessage && <p className="api-message" role="status">{apiMessage}</p>}
              <button className="primary-button full" type="submit" disabled={isSubmitting}>
                <span>{isSubmitting ? "请求中..." : mode === "login" ? "登录并进入" : "注册并进入"}</span>
                <ArrowRight size={18} />
              </button>
              <button className="ghost-button full" type="button" onClick={startDemo} disabled={isSubmitting}>
                <Sparkles size={18} />
                <span>使用演示账号体验</span>
              </button>
            </form>
            <p className="auth-endpoint">默认连接 {API_BASE_URL}</p>
          </section>
        </div>
      )}
    </main>
  );
}
