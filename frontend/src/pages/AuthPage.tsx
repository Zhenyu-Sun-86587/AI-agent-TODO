import { ArrowRight, Loader2, Lock, Mail, UserRound } from "lucide-react";
import { useState } from "react";

import { getErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "register";

export function AuthPage() {
  const { login, register, enterDemo } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [account, setAccount] = useState("alice@example.com");
  const [username, setUsername] = useState("alice");
  const [email, setEmail] = useState("alice@example.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await login({ account, password });
      } else {
        await register({ username, email, password });
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-panel glass-panel">
        <div className="auth-copy">
          <div className="brand-mark large">
            <div className="brand-icon">
              <Lock size={22} />
            </div>
            <div>
              <strong>AI-agent</strong>
              <span>TODO</span>
            </div>
          </div>
          <h1>把自然语言变成清晰任务</h1>
          <div className="auth-metrics">
            <span>AI 解析</span>
            <span>BYOK</span>
            <span>统计看板</span>
          </div>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="segmented-control" aria-label="登录或注册">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => setMode("login")}
            >
              登录
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => setMode("register")}
            >
              注册
            </button>
          </div>

          {mode === "register" && (
            <label className="field-with-icon">
              <span>用户名</span>
              <UserRound size={18} />
              <input
                required
                minLength={3}
                maxLength={32}
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </label>
          )}

          <label className="field-with-icon">
            <span>{mode === "login" ? "账号" : "邮箱"}</span>
            <Mail size={18} />
            <input
              required
              type={mode === "login" ? "text" : "email"}
              value={mode === "login" ? account : email}
              onChange={(event) =>
                mode === "login"
                  ? setAccount(event.target.value)
                  : setEmail(event.target.value)
              }
            />
          </label>

          <label className="field-with-icon">
            <span>密码</span>
            <Lock size={18} />
            <input
              required
              minLength={8}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <button className="primary-button full" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
            {mode === "login" ? "进入工作台" : "创建账号"}
          </button>
          <button className="ghost-button full" type="button" onClick={enterDemo}>
            体验演示
          </button>
        </form>
      </section>
    </main>
  );
}
