import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { fetchMe } from "../../../api/auth";
import { mapApiTask } from "../../../api/mappers";
import { fetchSettings as fetchRemoteSettings } from "../../../api/settings";
import { fetchCategoryStats, fetchOverview, fetchPriorityStats, fetchTrendStats } from "../../../api/stats";
import { fetchTaskCategories, fetchTasksPage } from "../../../api/tasks";
import type { RemoteStatsState } from "../../../api/types";
import type { DemoSession } from "../../auth/types";
import type { ProfileState, SettingsState } from "../../settings/types";
import type { Task } from "../types";

export const emptyRemoteStats: RemoteStatsState = {
  overview: null,
  categories: [],
  priorities: [],
  trend: [],
};

export function useTaskRemoteSync({
  activeToken,
  handleApiError,
  session,
  setApiMessage,
  setApiState,
  setProfile,
  setSession,
  setSettings,
  setTasks,
  markTaskDataChanged,
}: {
  activeToken: string;
  handleApiError: (error: unknown) => string;
  session: DemoSession | null;
  setApiMessage: (message: string) => void;
  setApiState: (state: "local" | "loading" | "online" | "offline") => void;
  setProfile: Dispatch<SetStateAction<ProfileState>>;
  setSession: Dispatch<SetStateAction<DemoSession | null>>;
  setSettings: Dispatch<SetStateAction<SettingsState>>;
  setTasks: Dispatch<SetStateAction<Task[]>>;
  markTaskDataChanged: () => void;
}) {
  const [remoteStats, setRemoteStats] = useState<RemoteStatsState>(emptyRemoteStats);
  const [remoteCategories, setRemoteCategories] = useState<string[]>([]);

  const loadRemoteWorkspace = useCallback(async (token = activeToken) => {
    if (!token) {
      return;
    }

    setApiState("loading");
    setApiMessage("正在同步后端数据...");
    try {
      const [me, taskPage, categoryList, remoteSettings, overview, categoryStats, priorityStats, trendStats] = await Promise.all([
        fetchMe(token),
        fetchTasksPage({ page: 1, pageSize: 100, sortBy: "created_at", sortOrder: "desc" }, token),
        fetchTaskCategories(token),
        fetchRemoteSettings(token),
        fetchOverview(token),
        fetchCategoryStats(token),
        fetchPriorityStats(token),
        fetchTrendStats(token, 30),
      ]);

      setSession((currentSession) =>
        currentSession
          ? {
              ...currentSession,
              name: me.username,
              email: me.email,
            }
          : currentSession,
      );
      setProfile({ username: me.username, email: me.email });
      setTasks(taskPage.items.map((task) => mapApiTask(task)));
      setRemoteCategories(categoryList.map((item) => item.name).filter(Boolean));
      setSettings({
        openaiApiKey: "",
        modelName: remoteSettings.model_name,
        maskedKey: remoteSettings.openai_api_key_masked || undefined,
        hasOpenaiApiKey: remoteSettings.has_openai_api_key,
      });
      setRemoteStats({
        overview,
        categories: categoryStats,
        priorities: priorityStats,
        trend: trendStats,
      });
      markTaskDataChanged();
      setApiState("online");
      setApiMessage("已连接后端 API");
    } catch (error) {
      handleApiError(error);
    }
  }, [activeToken, handleApiError, markTaskDataChanged, setApiMessage, setApiState, setProfile, setSession, setSettings, setTasks]);

  useEffect(() => {
    if (session?.isApiSession) {
      void loadRemoteWorkspace(session.token);
    } else {
      setApiState("local");
      setApiMessage(session ? "本地演示模式" : "请选择登录或使用演示账号");
      setRemoteStats(emptyRemoteStats);
      setRemoteCategories([]);
      setProfile({
        username: session?.name || "Demo User",
        email: session?.email || "demo@taskpilot.dev",
      });
    }
  }, [loadRemoteWorkspace, session?.email, session?.isApiSession, session?.name, session?.token, setApiMessage, setApiState, setProfile]);

  return {
    loadRemoteWorkspace,
    remoteCategories,
    remoteStats,
  };
}
