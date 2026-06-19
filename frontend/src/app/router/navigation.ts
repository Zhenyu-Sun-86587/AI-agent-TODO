import { CalendarDays, Home, ListTodo, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PageKey } from "../types/common";

export interface AppNavItem {
  key: PageKey;
  label: string;
  icon: LucideIcon;
}

export const navItems = [
  { key: "dashboard", label: "仪表盘", icon: Home },
  { key: "tasks", label: "任务中心", icon: ListTodo },
  { key: "calendar", label: "日历", icon: CalendarDays },
  { key: "ai", label: "智能助手", icon: Sparkles },
] satisfies AppNavItem[];

export const mobilePrimaryNavKeys: readonly PageKey[] = ["dashboard", "tasks"];
export const mobileSecondaryNavKeys: readonly PageKey[] = ["calendar", "ai"];
