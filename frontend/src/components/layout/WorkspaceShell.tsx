import { useState, type ReactNode } from "react";
import FloatingChat from "../ai-chat/FloatingChat";
import ToastViewport, { type ToastMessage } from "../Toast";
import ProfileModal from "../settings/ProfileModal";
import SettingsModal from "../settings/SettingsModal";
import type { PageKey } from "../../app/types/common";
import type { ProfileState, SettingsState } from "../../features/settings/types";
import { navItems } from "../../app/router/navigation";
import Layout from "./Layout";
import type { LayoutProps } from "./types";

interface WorkspaceShellProps {
  activePage: PageKey;
  apiMessage: string;
  apiState: LayoutProps["apiState"];
  children: ReactNode;
  dismissToast: (id: number) => void;
  globalSearch: string;
  isDark: boolean;
  onCreateTask: () => void;
  onLogout: () => void;
  onNavigate: (page: PageKey) => void;
  onSaveProfile: (profile: ProfileState) => Promise<string | void>;
  onSaveSettings: (settings: SettingsState) => Promise<string | void>;
  onSearchChange: (value: string) => void;
  onTaskChanged: () => Promise<void>;
  onTestOpenAIKey: (settings: SettingsState) => Promise<string>;
  onToggleTheme: () => void;
  profile: ProfileState;
  settings: SettingsState;
  toasts: ToastMessage[];
  token: string;
  transitionState?: LayoutProps["transitionState"];
  userName: string;
}

export default function WorkspaceShell({
  activePage,
  apiMessage,
  apiState,
  children,
  dismissToast,
  globalSearch,
  isDark,
  onCreateTask,
  onLogout,
  onNavigate,
  onSaveProfile,
  onSaveSettings,
  onSearchChange,
  onTaskChanged,
  onTestOpenAIKey,
  onToggleTheme,
  profile,
  settings,
  toasts,
  token,
  transitionState = "idle",
  userName,
}: WorkspaceShellProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const handleLogout = () => {
    setIsSettingsOpen(false);
    setIsProfileOpen(false);
    onLogout();
  };

  return (
    <Layout
      activePage={activePage}
      apiMessage={apiMessage}
      apiState={apiState}
      globalSearch={globalSearch}
      isDark={isDark}
      navItems={navItems}
      onCreateTask={onCreateTask}
      onLogout={handleLogout}
      onNavigate={onNavigate}
      onOpenProfile={() => setIsProfileOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      onSearchChange={onSearchChange}
      onToggleTheme={onToggleTheme}
      transitionState={transitionState}
      userName={userName}
    >
      {children}
      {isSettingsOpen && (
        <SettingsModal
          isDark={isDark}
          onClose={() => setIsSettingsOpen(false)}
          onSave={onSaveSettings}
          onTest={onTestOpenAIKey}
          onToggleTheme={onToggleTheme}
          settings={settings}
        />
      )}
      {isProfileOpen && (
        <ProfileModal
          onClose={() => setIsProfileOpen(false)}
          onSaveProfile={onSaveProfile}
          profile={profile}
        />
      )}
      <FloatingChat
        initialModelId={settings.modelName || "deepseek-v4-pro"}
        isBlocked={isSettingsOpen}
        onTaskChanged={onTaskChanged}
        token={token}
      />
      <ToastViewport items={toasts} onDismiss={dismissToast} />
    </Layout>
  );
}
