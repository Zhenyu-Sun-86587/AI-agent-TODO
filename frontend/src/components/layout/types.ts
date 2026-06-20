import type { ReactNode } from "react";
import type { AppNavItem } from "../../app/router/navigation";
import type { PageKey } from "../../app/types/common";

// MinimalNavItem 直接复用路由层定义，避免布局和导航配置出现双份维护。
export type MinimalNavItem = AppNavItem;

export type LayoutPanel = "notifications" | "mobileMore" | "user" | null;

export interface LayoutProps {
  activePage: PageKey;
  apiMessage: string;
  apiState: "local" | "loading" | "online" | "offline";
  children: ReactNode;
  globalSearch: string;
  isDark: boolean;
  navItems: MinimalNavItem[];
  onCreateTask: () => void;
  onLogout: () => void;
  onNavigate: (page: PageKey) => void;
  onOpenProfile?: () => void;
  onOpenSettings: () => void;
  onSearchChange: (value: string) => void;
  onToggleTheme: () => void;
  transitionState?: "idle" | "entering" | "leaving";
  userName: string;
}
