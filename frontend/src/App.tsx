import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { CalendarDays, Home, ListTodo, Sparkles } from "lucide-react";
import { getPageFromPath, isKnownPagePath, pagePaths, pushAppPath } from "./app/router/routes";
import type { PageKey } from "./app/types/common";
import FloatingChat from "./components/ai-chat/FloatingChat";
import Layout from "./Layout";
import ToastViewport, { type ToastMessage, type ToastTone } from "./components/Toast";
import ProfileModal from "./components/settings/ProfileModal";
import SettingsModal from "./components/settings/SettingsModal";
import { useAuth } from "./features/auth/hooks/useAuth";
import { useDashboardData } from "./features/dashboard/hooks/useDashboardData";
import type { ProfileState } from "./features/settings/types";
import { useSettings } from "./features/settings/hooks/useSettings";
import { CreateTaskModal, DeleteConfirmModal, EditTaskModal, TaskDetailDrawer } from "./features/tasks/components/TaskOverlays";
import { useTasks } from "./features/tasks/hooks/useTasks";
import AuthPage from "./pages/AuthPage";
import WorkspacePageRenderer from "./pages/workspacePages";

const navItems: Array<{ key: PageKey; label: string; icon: LucideIcon }> = [
  { key: "dashboard", label: "仪表盘", icon: Home },
  { key: "tasks", label: "任务中心", icon: ListTodo },
  { key: "calendar", label: "日历", icon: CalendarDays },
  { key: "ai", label: "智能助手", icon: Sparkles },
];

type AuthTransitionPhase = "auth-to-app" | "app-to-auth" | null;

function getAuthTransitionDuration(duration: number) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return 0;
  }
  return duration;
}

function waitForTransition(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, getAuthTransitionDuration(duration));
  });
}

export function App() {
  const [apiState, setApiState] = useState<"local" | "loading" | "online" | "offline">("local");
  const [apiMessage, setApiMessage] = useState("");
  const [activePage, setActivePage] = useState<PageKey>(() => getPageFromPath(window.location.pathname));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [authTransitionPhase, setAuthTransitionPhase] = useState<AuthTransitionPhase>(null);
  const toastIdRef = useRef(0);
  const resetTaskSelectionRef = useRef<() => void>(() => undefined);
  const setProfileRef = useRef<(profile: ProfileState) => void>(() => undefined);

  const dismissToast = useCallback((id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, tone: ToastTone = "info") => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((currentToasts) => {
      if (currentToasts.some((toast) => toast.title === title && toast.message === message && toast.tone === tone)) {
        return currentToasts;
      }

      return [...currentToasts.slice(-2), { id, message, title, tone }];
    });
  }, []);

  const navigateTo = useCallback((pageKey: PageKey) => {
    setActivePage(pageKey);
    pushAppPath(pageKey);
  }, []);

  const handleAuthenticated = useCallback((nextSession: { name: string; email: string }) => {
    setProfileRef.current({ username: nextSession.name, email: nextSession.email });
    navigateTo("dashboard");
  }, [navigateTo]);

  const handleBeforeAuthenticated = useCallback(async () => {
    setAuthTransitionPhase("auth-to-app");
    await waitForTransition(120);
  }, []);

  const handleSessionCleared = useCallback(() => {
    resetTaskSelectionRef.current();
  }, []);

  const {
    activeToken,
    authMode,
    handleApiError,
    loginWithApi,
    logout,
    registerWithApi,
    session,
    setAuthMode,
    setSession,
    useDemoSession,
  } = useAuth({
    onBeforeAuthenticated: handleBeforeAuthenticated,
    onAuthenticated: handleAuthenticated,
    onSessionCleared: handleSessionCleared,
    setApiMessage,
    setApiState,
    showToast,
  });

  const initialProfile = useMemo<ProfileState>(() => ({
    username: session?.name || "Demo User",
    email: session?.email || "demo@taskpilot.dev",
  }), [session?.email, session?.name]);

  const {
    isDark,
    profile,
    saveProfile,
    saveSettings,
    setIsDark,
    setProfile,
    setSettings,
    settings,
    testOpenAIKey,
  } = useSettings({
    activeToken,
    handleApiError,
    initialProfile,
    setApiMessage,
    setApiState,
    setSession,
  });

  setProfileRef.current = setProfile;

  const {
    createTask,
    deleteCandidate,
    deleteTask,
    editingTask,
    isCreateOpen,
    loadRemoteWorkspace,
    openTaskDetails,
    remoteCategories,
    remoteStats,
    requestDeleteTask,
    resetTaskSelection,
    selectedTask,
    setCreateOpen,
    setDeleteCandidate,
    setEditingTask,
    setSelectedTask,
    suggestTaskFields,
    taskDetailState,
    taskVersion,
    tasks,
    toggleComplete,
    updateTask,
    updateTaskStatus,
  } = useTasks({
    activeToken,
    handleApiError,
    session,
    setApiMessage,
    setApiState,
    setProfile,
    setSession,
    setSettings,
    showToast,
  });

  resetTaskSelectionRef.current = resetTaskSelection;

  const { recommendedTasks, visibleCategories } = useDashboardData({
    isApiMode: Boolean(activeToken),
    remoteCategories,
    tasks,
  });

  const handleChatTaskChanged = useCallback(async () => {
    if (activeToken) {
      await loadRemoteWorkspace(activeToken);
    }
  }, [activeToken, loadRemoteWorkspace]);

  useEffect(() => {
    const syncPageFromPath = () => {
      const pathname = window.location.pathname;
      if (pathname === "/login" || pathname === "/register") {
        setAuthMode(pathname === "/register" ? "register" : "login");
        return;
      }
      if (!isKnownPagePath(pathname)) {
        window.history.replaceState(null, "", pagePaths.dashboard);
        setActivePage("dashboard");
        return;
      }
      setActivePage(getPageFromPath(pathname));
    };

    syncPageFromPath();
    window.addEventListener("popstate", syncPageFromPath);
    return () => window.removeEventListener("popstate", syncPageFromPath);
  }, [setAuthMode]);

  useEffect(() => {
    if (authTransitionPhase !== "auth-to-app" || !session) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAuthTransitionPhase(null);
    }, getAuthTransitionDuration(220));
    return () => window.clearTimeout(timeoutId);
  }, [authTransitionPhase, session]);

  useEffect(() => {
    if (authTransitionPhase !== "app-to-auth" || session) {
      return undefined;
    }

    const timeoutId = window.setTimeout(() => {
      setAuthTransitionPhase(null);
    }, getAuthTransitionDuration(220));
    return () => window.clearTimeout(timeoutId);
  }, [authTransitionPhase, session]);

  const handleLogout = useCallback(async () => {
    if (authTransitionPhase) {
      return;
    }

    setIsSettingsOpen(false);
    setIsProfileOpen(false);
    setAuthTransitionPhase("app-to-auth");
    await waitForTransition(120);
    await logout();
  }, [authTransitionPhase, logout]);

  const page = (
    <WorkspacePageRenderer
      activePage={activePage}
      categories={visibleCategories}
      globalSearch={globalSearch}
      isApiMode={Boolean(activeToken)}
      onCreateTask={() => setCreateOpen(true)}
      onApiError={handleApiError}
      onDelete={requestDeleteTask}
      onEditTask={setEditingTask}
      onOpenTask={openTaskDetails}
      onPageChange={navigateTo}
      onSaveProfile={saveProfile}
      onSaveSettings={saveSettings}
      onSuggestTaskFields={suggestTaskFields}
      onTestOpenAIKey={testOpenAIKey}
      onUpdateTaskStatus={updateTaskStatus}
      onToggleComplete={toggleComplete}
      profile={profile}
      recommendedTasks={recommendedTasks}
      remoteStats={remoteStats}
      settings={settings}
      taskVersion={taskVersion}
      token={activeToken}
      tasks={tasks}
    />
  );

  if (!session) {
    return (
      <AuthPage
        apiMessage={apiMessage}
        transitionState={authTransitionPhase === "auth-to-app" ? "leaving" : authTransitionPhase === "app-to-auth" ? "returning" : "idle"}
        mode={authMode}
        onDemo={useDemoSession}
        onLogin={loginWithApi}
        onModeChange={setAuthMode}
        onRegister={registerWithApi}
      />
    );
  }

  return (
    <Layout
      activePage={activePage}
      apiMessage={apiMessage}
      apiState={apiState}
      globalSearch={globalSearch}
      isDark={isDark}
      navItems={navItems}
      onCreateTask={() => setCreateOpen(true)}
      onLogout={handleLogout}
      onNavigate={(pageKey) => navigateTo(pageKey as PageKey)}
      onOpenProfile={() => setIsProfileOpen(true)}
      onOpenSettings={() => {
        setIsSettingsOpen(true);
      }}
      onSearchChange={setGlobalSearch}
      onToggleTheme={() => setIsDark((value) => !value)}
      transitionState={authTransitionPhase === "auth-to-app" ? "entering" : authTransitionPhase === "app-to-auth" ? "leaving" : "idle"}
      userName={session.name}
    >
      {page}
      <TaskDetailDrawer
        detailState={taskDetailState}
        isApiMode={Boolean(activeToken)}
        onClose={() => setSelectedTask(null)}
        onDelete={requestDeleteTask}
        onEdit={setEditingTask}
        onToggleComplete={toggleComplete}
        task={selectedTask}
      />
      {isCreateOpen && (
        <CreateTaskModal
          categories={visibleCategories}
          isApiMode={Boolean(activeToken)}
          onClose={() => setCreateOpen(false)}
          onCreate={createTask}
        />
      )}
      {editingTask && (
        <EditTaskModal
          categories={visibleCategories}
          isApiMode={Boolean(activeToken)}
          onClose={() => setEditingTask(null)}
          onUpdate={(input) => updateTask(editingTask.id, input)}
          task={editingTask}
        />
      )}
      {deleteCandidate && (
        <DeleteConfirmModal
          onCancel={() => setDeleteCandidate(null)}
          onConfirm={() => {
            void deleteTask(deleteCandidate.id);
          }}
          task={deleteCandidate}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal
          isDark={isDark}
          onClose={() => setIsSettingsOpen(false)}
          onSave={saveSettings}
          onTest={testOpenAIKey}
          onToggleTheme={() => setIsDark((value) => !value)}
          settings={settings}
        />
      )}
      {isProfileOpen && (
        <ProfileModal
          onClose={() => setIsProfileOpen(false)}
          onSaveProfile={saveProfile}
          profile={profile}
        />
      )}
      <FloatingChat
        initialModelId={settings.modelName || "deepseek-v4-pro"}
        isBlocked={isSettingsOpen}
        onTaskChanged={handleChatTaskChanged}
        token={activeToken}
      />
      <ToastViewport items={toasts} onDismiss={dismissToast} />
    </Layout>
  );
}
