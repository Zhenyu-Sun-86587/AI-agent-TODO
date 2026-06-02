import { CheckCircle2, KeyRound, Loader2, Save, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

import { getErrorMessage } from "../api/client";
import { getSettings, testOpenAIKey, updateSettings } from "../api/settings";
import type { UserSetting } from "../api/types";
import { useAuth } from "../context/AuthContext";
import { formatDateTime } from "../utils/format";

export function SettingsPage() {
  const { user, isDemo } = useAuth();
  const [setting, setSetting] = useState<UserSetting | null>(null);
  const [modelName, setModelName] = useState("gpt-4o-mini");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    getSettings()
      .then((data) => {
        if (!alive) {
          return;
        }
        setSetting(data);
        setModelName(data.model_name);
      })
      .catch((err) => {
        if (alive) {
          setError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        model_name: modelName,
        ...(apiKey.trim() ? { openai_api_key: apiKey.trim() } : {}),
      };
      const data = await updateSettings(payload);
      setSetting(data);
      setApiKey("");
      setMessage("设置已保存");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setError("");
    setMessage("");
    try {
      const data = await testOpenAIKey(apiKey.trim() || undefined, modelName);
      setMessage(
        data.valid
          ? `Key 可用，延迟 ${data.latency_ms ?? 0}ms`
          : "Key 测试未通过",
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-grid centered-page">
        <div className="loading-line glass-panel">
          <Loader2 className="spin" size={20} />
          载入设置
        </div>
      </div>
    );
  }

  return (
    <div className="page-grid settings-page">
      <section className="settings-card glass-panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">Account</span>
            <h2>账号信息</h2>
          </div>
          <UserRound size={22} />
        </div>
        <div className="profile-card">
          <span className="profile-avatar">{user?.username.slice(0, 1).toUpperCase()}</span>
          <div>
            <h3>{user?.username}</h3>
            <p>{user?.email}</p>
            {isDemo && <small>当前数据存储在浏览器本地</small>}
          </div>
        </div>
      </section>

      <section className="settings-card glass-panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">BYOK</span>
            <h2>OpenAI 配置</h2>
          </div>
          <KeyRound size={22} />
        </div>

        <form className="stack-form" onSubmit={handleSave}>
          <label>
            <span>模型名称</span>
            <input
              value={modelName}
              onChange={(event) => setModelName(event.target.value)}
              maxLength={100}
            />
          </label>
          <label>
            <span>OpenAI API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
              placeholder={setting?.openai_api_key_masked ?? "sk-..."}
            />
          </label>

          <div className="setting-status">
            <ShieldCheck size={18} />
            <span>
              {setting?.has_openai_api_key ? "已配置" : "未配置"}
              {setting?.updated_at && ` · ${formatDateTime(setting.updated_at)}`}
            </span>
          </div>

          {message && (
            <p className="success-message">
              <CheckCircle2 size={17} />
              {message}
            </p>
          )}
          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={handleTest}
              disabled={testing}
            >
              {testing ? <Loader2 className="spin" size={17} /> : <KeyRound size={17} />}
              测试 Key
            </button>
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />}
              保存设置
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
