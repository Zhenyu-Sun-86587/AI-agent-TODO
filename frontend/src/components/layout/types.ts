import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export interface MinimalNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

export interface LayoutProps {
  activePage: string;
  apiMessage: string;
  apiState: "local" | "loading" | "online" | "offline";
  children: ReactNode;
  globalSearch: string;
  isDark: boolean;
  navItems: MinimalNavItem[];
  onCreateTask: () => void;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onOpenProfile?: () => void;
  onOpenSettings: () => void;
  onSearchChange: (value: string) => void;
  onToggleTheme: () => void;
  transitionState?: "idle" | "entering" | "leaving";
  userName: string;
}
