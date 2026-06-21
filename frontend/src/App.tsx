import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPageFromPath, isKnownPagePath, pagePaths, pushAppPath } from "./app/router/routes";
import type { PageKey } from "./app/types/common";
import AuthGate from "./components/layout/AuthGate";
import WorkspaceShell from "./components/layout/WorkspaceShell";
import { useToastQueue } from "./components/layout/useToastQueue";
import { useAuth } from "./features/auth/hooks/useAuth";
import { useDashboardData } from "./features/dashboard/hooks/useDashboardData";
import type { ProfileState } from "./features/settings/types";
import { useSettings } from "./features/settings/hooks/useSettings";
import { CreateTaskModal, DeleteConfirmModal, EditTaskModal, TaskDetailDrawer } from "./features/tasks/components/TaskOverlays";
import { useTasks } from "./features/tasks/hooks/useTasks";
import WorkspacePageRenderer from "./pages/workspacePages";

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
  const [globalSearch, setGlobalSearch] = useState("");
  const [authTransitionPhase, setAuthTransitionPhase] = useState<AuthTransitionPhase>(null);
  const resetTaskSelectionRef = useRef<() => void>(() => undefined);
  const setProfileRef = useRef<(profile: ProfileState) => void>(() => undefined);
  const { dismissToast, showToast, toasts } = useToastQueue();

  const navigateTo = useCallback((pageKey: PageKey) => {
    // activePage 与 history 同步更新，popstate 再负责浏览器前进后退的反向同步。
    setActivePage(pageKey);
    pushAppPath(pageKey);
  }, []);

  const handleAuthenticated = useCallback((nextSession: { name: string; email: string }) => {
    // 登录完成后立即刷新设置页资料草稿，避免仍显示演示用户信息。
    setProfileRef.current({ username: nextSession.name, email: nextSession.email });
    navigateTo("dashboard");
  }, [navigateTo]);

  const handleBeforeAuthenticated = useCallback(async () => {
    // 认证页先播放离场阶段，再挂载工作区，减少登录态切换时的布局闪动。
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
    loginWithDemoApi,
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
    parseAiTaskText,
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

  // 仪表盘派生数据只依赖当前任务集合和远端分类，避免页面组件重复聚合。
  const { recommendedTasks, visibleCategories } = useDashboardData({
    isApiMode: Boolean(activeToken),
    remoteCategories,
    tasks,
  });

  const handleChatTaskChanged = useCallback(async () => {
    if (activeToken) {
      // AI 聊天工具调用可能创建/更新任务，统一通过工作区加载函数刷新远端状态。
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
        // 未知路径归一到 dashboard，避免工作区在无效 activePage 下渲染空白。
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

    // 退出也走过渡状态，期间拒绝重复点击，最后再清理会话。
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
      onCreateTask={createTask}
      onDelete={requestDeleteTask}
      onEditTask={setEditingTask}
      onOpenTask={openTaskDetails}
      onPageChange={navigateTo}
      onParseTask={parseAiTaskText}
      onSuggestTaskFields={suggestTaskFields}
      onUpdateTaskStatus={updateTaskStatus}
      onToggleComplete={toggleComplete}
      recommendedTasks={recommendedTasks}
      remoteStats={remoteStats}
      taskVersion={taskVersion}
      token={activeToken}
      tasks={tasks}
    />
  );

  return (
    <AuthGate
      apiMessage={apiMessage}
      isAuthenticated={Boolean(session)}
      mode={authMode}
      onDemoLogin={loginWithDemoApi}
      onLogin={loginWithApi}
      onModeChange={setAuthMode}
      onRegister={registerWithApi}
      transitionState={authTransitionPhase === "auth-to-app" ? "leaving" : authTransitionPhase === "app-to-auth" ? "returning" : "idle"}
    >
      {session ? (
        <WorkspaceShell
          activePage={activePage}
          apiMessage={apiMessage}
          apiState={apiState}
          dismissToast={dismissToast}
          globalSearch={globalSearch}
          isDark={isDark}
          onCreateTask={() => setCreateOpen(true)}
          onLogout={handleLogout}
          onNavigate={navigateTo}
          onSaveProfile={saveProfile}
          onSaveSettings={saveSettings}
          onSearchChange={setGlobalSearch}
          onTaskChanged={handleChatTaskChanged}
          onTestOpenAIKey={testOpenAIKey}
          onToggleTheme={() => setIsDark((value) => !value)}
          profile={profile}
          settings={settings}
          toasts={toasts}
          token={activeToken}
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
              onParseTask={parseAiTaskText}
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
        </WorkspaceShell>
      ) : null}
    </AuthGate>
  );
}
