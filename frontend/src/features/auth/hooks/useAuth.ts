import { useCallback, useEffect, useMemo, useState } from "react";
import { demoLogin, login, logout as logoutApi, register } from "../../../api/auth";
import { ApiError, asErrorMessage } from "../../../api/errors";
import { readStoredJson, writeStoredJson } from "../../../lib/storage";
import type { ToastTone } from "../../../components/Toast";
import type { DemoSession } from "../types";

const SESSION_STORAGE_KEY = "ai-agent-todo.session";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readStoredSession() {
  const storedSession = readStoredJson<unknown>(SESSION_STORAGE_KEY, null);
  if (!isRecord(storedSession) || typeof storedSession.name !== "string" || typeof storedSession.email !== "string") {
    return null;
  }
  if (storedSession.isApiSession !== true || typeof storedSession.token !== "string" || !storedSession.token) {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }

  return {
    name: storedSession.name,
    email: storedSession.email,
    token: storedSession.token,
    isApiSession: true,
  };
}

export function useAuth({
  onBeforeAuthenticated,
  onAuthenticated,
  onSessionCleared,
  setApiMessage,
  setApiState,
  showToast,
}: {
  onBeforeAuthenticated?: (session: DemoSession) => Promise<void> | void;
  onAuthenticated: (session: DemoSession) => void;
  onSessionCleared: () => void;
  setApiMessage: (message: string) => void;
  setApiState: (state: "local" | "loading" | "online" | "offline") => void;
  showToast: (title: string, message?: string, tone?: ToastTone) => void;
}) {
  const [session, setSession] = useState<DemoSession | null>(() => readStoredSession());
  const [authMode, setAuthMode] = useState<"login" | "register">(() =>
    window.location.pathname === "/register" ? "register" : "login",
  );

  const activeToken = useMemo(() => (session?.isApiSession ? session.token : ""), [session]);

  useEffect(() => {
    if (session) {
      writeStoredJson(SESSION_STORAGE_KEY, session);
    }
  }, [session]);

  const clearSession = useCallback(() => {
    setSession(null);
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    window.history.pushState(null, "", "/login");
    setAuthMode("login");
    onSessionCleared();
  }, [onSessionCleared]);

  const handleApiError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) {
      showToast("登录已过期", "请重新登录后继续操作。", "error");
      clearSession();
      return "登录已过期，请重新登录。";
    }

    const message = asErrorMessage(error);
    setApiState("offline");
    setApiMessage(message);
    showToast("请求失败", message, "error");
    return message;
  }, [clearSession, setApiMessage, setApiState, showToast]);

  const authenticate = useCallback(async (nextSession: DemoSession) => {
    await onBeforeAuthenticated?.(nextSession);
    setSession(nextSession);
    onAuthenticated(nextSession);
  }, [onAuthenticated, onBeforeAuthenticated]);

  const loginWithApi = useCallback(async (account: string, password: string) => {
    setApiState("loading");
    setApiMessage("正在登录后端...");
    try {
      const data = await login(account, password);
      await authenticate({
        name: data.user.username,
        email: data.user.email,
        token: data.access_token,
        isApiSession: true,
      });
    } catch (error) {
      setApiState("offline");
      setApiMessage(asErrorMessage(error));
      throw error;
    }
  }, [authenticate, setApiMessage, setApiState]);

  const registerWithApi = useCallback(async (username: string, email: string, password: string) => {
    setApiState("loading");
    setApiMessage("正在注册后端账号...");
    try {
      const data = await register(username, email, password);
      await authenticate({
        name: data.user.username,
        email: data.user.email,
        token: data.access_token,
        isApiSession: true,
      });
    } catch (error) {
      setApiState("offline");
      setApiMessage(asErrorMessage(error));
      throw error;
    }
  }, [authenticate, setApiMessage, setApiState]);

  const loginWithDemoApi = useCallback(async () => {
    setApiState("loading");
    setApiMessage("正在登录演示账号...");
    try {
      const data = await demoLogin();
      await authenticate({
        name: data.user.username,
        email: data.user.email,
        token: data.access_token,
        isApiSession: true,
      });
    } catch (error) {
      setApiState("offline");
      setApiMessage(asErrorMessage(error));
      throw error;
    }
  }, [authenticate, setApiMessage, setApiState]);

  const logout = useCallback(async () => {
    if (activeToken) {
      try {
        await logoutApi(activeToken);
      } catch (error) {
        setApiMessage(asErrorMessage(error));
      }
    }
    clearSession();
  }, [activeToken, clearSession, setApiMessage]);

  return {
    activeToken,
    authMode,
    handleApiError,
    loginWithApi,
    logout,
    registerWithApi,
    session,
    setAuthMode,
    setSession,
    loginWithDemoApi,
  };
}
