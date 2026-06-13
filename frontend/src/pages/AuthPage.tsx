import { useState, type FormEvent } from "react";
import { Bot } from "lucide-react";
import { API_BASE_URL } from "../api/client";
import { asErrorMessage } from "../api/errors";
import { isBackendCompatibleEmail } from "../features/auth/utils/validation";

export interface AuthPageProps {
  apiMessage: string;
  mode: "login" | "register";
  onDemo: () => void;
  onLogin: (account: string, password: string) => Promise<void>;
  onModeChange: (mode: "login" | "register") => void;
  onRegister: (username: string, email: string, password: string) => Promise<void>;
}

export default function AuthPage({ apiMessage, mode, onDemo, onLogin, onModeChange, onRegister }: AuthPageProps) {
  const [name, setName] = useState("Hikari");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("aitodo1234");
  const [confirmPassword, setConfirmPassword] = useState("aitodo1234");
  const [error, setError] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const normalizedEmail = email.trim();

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

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel">
        <span className="brand-mark">
          <Bot size={24} />
        </span>
        <p className="eyebrow">AI TODO</p>
        <h1>把一段想法变成可执行的任务系统</h1>
        <p>默认连接 {API_BASE_URL}。如果后端未启动，可以使用演示账号进入本地模式。</p>
        <div className="auth-feature-list">
          <span>AI 任务助手</span>
          <span>任务表格筛选</span>
          <span>日历和统计</span>
        </div>
      </section>
      <section className="auth-card">
        <div className="auth-tabs">
          <button className={mode === "login" ? "active" : ""} type="button" onClick={() => onModeChange("login")}>
            登录
          </button>
          <button className={mode === "register" ? "active" : ""} type="button" onClick={() => onModeChange("register")}>
            注册
          </button>
        </div>
        <div className="auth-title">
          <p className="eyebrow">{mode === "login" ? "Welcome Back" : "Create Account"}</p>
          <h2>{mode === "login" ? "登录 AI TODO" : "注册 AI TODO"}</h2>
        </div>
        <form className="auth-form" onSubmit={submit}>
          {mode === "register" && (
            <label>
              用户名
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="请输入用户名" />
            </label>
          )}
          <label>
            邮箱
            <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@qq.com" />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="至少 6 位"
            />
          </label>
          {mode === "register" && (
            <label>
              确认密码
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="再次输入密码"
              />
            </label>
          )}
          {error && <p className="form-error">{error}</p>}
          {!error && apiMessage && <p className="api-message">{apiMessage}</p>}
          <button className="primary-button full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "请求中..." : mode === "login" ? "登录后端" : "注册并进入"}
          </button>
          <button className="ghost-button full" type="button" onClick={onDemo}>
            使用演示账号（本地）
          </button>
        </form>
      </section>
    </main>
  );
}
