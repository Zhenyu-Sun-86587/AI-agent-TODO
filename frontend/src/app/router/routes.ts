import type { PageKey } from "../types/common";

export const pagePaths: Record<PageKey, string> = {
  dashboard: "/",
  tasks: "/tasks",
  calendar: "/calendar",
  ai: "/ai",
  settings: "/settings",
};

export function isKnownPagePath(pathname: string) {
  return Object.values(pagePaths).includes(pathname);
}

export function getPageFromPath(pathname: string): PageKey {
  const matchedPage = (Object.entries(pagePaths).find(([, path]) => path === pathname)?.[0] || "dashboard") as PageKey;
  return matchedPage;
}

export function pushAppPath(page: PageKey) {
  if (typeof window === "undefined") {
    return;
  }

  const targetPath = pagePaths[page];
  if (window.location.pathname !== targetPath) {
    window.history.pushState(null, "", targetPath);
  }
}
