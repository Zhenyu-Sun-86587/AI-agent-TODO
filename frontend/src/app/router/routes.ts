import type { PageKey } from "../types/common";

export const pagePaths: Record<PageKey, string> = {
  dashboard: "/",
  tasks: "/tasks",
  calendar: "/calendar",
  ai: "/ai",
};

export function isKnownPagePath(pathname: string) {
  return Object.values(pagePaths).includes(pathname);
}

export function getPageFromPath(pathname: string): PageKey {
  // 未知路由交给仪表盘兜底，避免刷新深链时出现空白页面。
  const matchedPage = (Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0] || "dashboard") as PageKey;
  return matchedPage;
}

export function pushAppPath(page: PageKey) {
  if (typeof window === "undefined") {
    return;
  }

  const targetPath = pagePaths[page];
  if (window.location.pathname !== targetPath) {
    // 这是轻量 SPA 跳转，只更新 history，不触发整页刷新。
    window.history.pushState(null, "", targetPath);
  }
}
