import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "../api/auth";
import { getStoredToken, setStoredToken } from "../api/client";
import { DEMO_TOKEN, demoUser, ensureDemoData, isDemoToken } from "../api/demo";
import type { LoginPayload, RegisterPayload, User } from "../api/types";

const USER_KEY = "ai-agent-todo-user";

interface AuthContextValue {
  token: string | null;
  user: User | null;
  loading: boolean;
  isDemo: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  enterDemo: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<User | null>(() => readStoredUser());
  const [loading, setLoading] = useState(Boolean(getStoredToken()));

  const persistSession = useCallback((nextToken: string, nextUser: User) => {
    setStoredToken(nextToken);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (isDemoToken(token)) {
      ensureDemoData();
      setUser(demoUser);
      localStorage.setItem(USER_KEY, JSON.stringify(demoUser));
      setLoading(false);
      return;
    }

    let alive = true;
    setLoading(true);
    getCurrentUser()
      .then((currentUser) => {
        if (!alive) {
          return;
        }
        setUser(currentUser);
        localStorage.setItem(USER_KEY, JSON.stringify(currentUser));
      })
      .catch(() => {
        if (!alive) {
          return;
        }
        setStoredToken(null);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, [token]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const data = await loginRequest(payload);
      persistSession(data.access_token, data.user);
    },
    [persistSession],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const data = await registerRequest(payload);
      persistSession(data.access_token, data.user);
    },
    [persistSession],
  );

  const enterDemo = useCallback(() => {
    ensureDemoData();
    persistSession(DEMO_TOKEN, demoUser);
  }, [persistSession]);

  const logout = useCallback(async () => {
    if (token && !isDemoToken(token)) {
      await logoutRequest().catch(() => undefined);
    }
    setStoredToken(null);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      loading,
      isDemo: isDemoToken(token),
      login,
      register,
      enterDemo,
      logout,
    }),
    [enterDemo, loading, login, logout, register, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

function readStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}
