import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { testOpenAIKey as testRemoteOpenAIKey, updateSettings as updateRemoteSettings } from "../../../api/settings";
import { updateMe } from "../../../api/auth";
import { ApiError, asErrorMessage, isAiConfigError } from "../../../api/errors";
import type { DemoSession } from "../../auth/types";
import { isBackendCompatibleEmail } from "../../auth/utils/validation";
import type { ProfileState, SettingsState } from "../types";
import { readStoredJson, writeStoredJson } from "../../../lib/storage";

const THEME_STORAGE_KEY = "ai-agent-todo.theme";
const SETTINGS_STORAGE_KEY = "ai-agent-todo.settings";

const defaultSettings: SettingsState = {
  openaiApiKey: "",
  modelName: "gpt-4.1-mini",
};

function readStoredTheme() {
  return readStoredJson<unknown>(THEME_STORAGE_KEY, false) === true;
}

export function useSettings({
  activeToken,
  handleApiError,
  initialProfile,
  setApiMessage,
  setApiState,
  setSession,
}: {
  activeToken: string;
  handleApiError: (error: unknown) => string;
  initialProfile: ProfileState;
  setApiMessage: (message: string) => void;
  setApiState: (state: "local" | "loading" | "online" | "offline") => void;
  setSession: Dispatch<SetStateAction<DemoSession | null>>;
}) {
  const [profile, setProfile] = useState<ProfileState>(initialProfile);
  const [settings, setSettings] = useState<SettingsState>(() => readStoredJson<SettingsState>(SETTINGS_STORAGE_KEY, defaultSettings));
  const [isDark, setIsDark] = useState(() => readStoredTheme());

  useEffect(() => {
    writeStoredJson(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  useEffect(() => {
    writeStoredJson(THEME_STORAGE_KEY, isDark);
  }, [isDark]);

  const saveProfile = async (nextProfile: ProfileState) => {
    const username = nextProfile.username.trim();
    const email = nextProfile.email.trim();
    if (!username) {
      return "用户名不能为空。";
    }
    if (!isBackendCompatibleEmail(email)) {
      return "请输入有效邮箱，不能使用 .local 或 example.com 等保留域名。";
    }

    if (!activeToken) {
      setProfile({ username, email });
      setSession((currentSession) => currentSession ? { ...currentSession, name: username, email } : currentSession);
      return "已保存到本地演示资料。";
    }

    try {
      setApiState("loading");
      setApiMessage("正在保存 /users/me...");
      const user = await updateMe(activeToken, username, email);
      setProfile({ username: user.username, email: user.email });
      setSession((currentSession) => currentSession ? { ...currentSession, name: user.username, email: user.email } : currentSession);
      setApiState("online");
      setApiMessage("用户资料已同步后端");
      return "用户资料已保存到后端。";
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return handleApiError(error);
      }
      const message = asErrorMessage(error);
      setApiState("online");
      setApiMessage(message);
      return message;
    }
  };

  const saveSettings = async (nextSettings: SettingsState) => {
    if (!activeToken) {
      setSettings(nextSettings);
      return "已保存到本地演示设置。";
    }

    try {
      setApiState("loading");
      setApiMessage("正在保存 /settings...");
      const data = await updateRemoteSettings(activeToken, nextSettings.openaiApiKey, nextSettings.modelName);
      setSettings({
        openaiApiKey: "",
        modelName: data.model_name,
        maskedKey: data.openai_api_key_masked || undefined,
        hasOpenaiApiKey: data.has_openai_api_key,
      });
      setApiState("online");
      setApiMessage("设置已同步后端");
      return "设置已保存到后端。";
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        return handleApiError(error);
      }
      const message = asErrorMessage(error);
      setApiState("online");
      setApiMessage(message);
      return message;
    }
  };

  const testOpenAIKey = async (nextSettings: SettingsState) => {
    if (!activeToken) {
      return nextSettings.openaiApiKey.trim().length >= 8 || !nextSettings.openaiApiKey.trim()
        ? "本地演示测试通过；真实校验需要后端登录。"
        : "Key 长度过短，请检查输入。";
    }

    try {
      setApiState("loading");
      setApiMessage("正在调用 /settings/test-openai-key...");
      const data = await testRemoteOpenAIKey(activeToken, nextSettings.openaiApiKey, nextSettings.modelName);
      setApiState("online");
      setApiMessage(data.valid ? "OpenAI Key 测试通过" : "OpenAI Key 测试失败");
      return data.valid
        ? `测试通过${data.latency_ms ? `，耗时 ${data.latency_ms}ms` : ""}。`
        : "测试失败，请检查 Key 或模型权限。";
    } catch (error) {
      if (isAiConfigError(error)) {
        const message = asErrorMessage(error);
        setApiState("online");
        setApiMessage(message);
        return message;
      }
      if (error instanceof ApiError && error.status === 401) {
        return handleApiError(error);
      }
      const message = asErrorMessage(error);
      setApiState("online");
      setApiMessage(message);
      return message;
    }
  };

  return {
    isDark,
    profile,
    saveProfile,
    saveSettings,
    setIsDark,
    setProfile,
    setSettings,
    settings,
    testOpenAIKey,
  };
}
