import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import MobileNav from "./MobileNav";
import Sidebar from "./Sidebar";
import { mobilePrimaryNavKeys, mobileSecondaryNavKeys } from "../../app/router/navigation";
import type { LayoutPanel, LayoutProps } from "./types";

export default function Layout({
  activePage,
  apiState,
  children,
  globalSearch,
  isDark,
  navItems,
  onCreateTask,
  onLogout,
  onNavigate,
  onOpenProfile,
  onOpenSettings,
  onSearchChange,
  onToggleTheme,
  transitionState = "idle",
  userName,
}: LayoutProps) {
  const statusLabel = apiState === "online" ? "API" : apiState === "loading" ? "同步中" : apiState === "offline" ? "离线" : "本地";
  const [openPanel, setOpenPanel] = useState<LayoutPanel>(null);
  const [isMobileMoreClosing, setMobileMoreClosing] = useState(false);
  const mobileMoreCloseTimer = useRef<number | null>(null);
  const sidebarUserRef = useRef<HTMLDivElement | null>(null);
  const mobilePrimaryItems = navItems.filter((item) => mobilePrimaryNavKeys.includes(item.key));
  const mobileSecondaryItems = navItems.filter((item) => mobileSecondaryNavKeys.includes(item.key));
  const mobilePinnedKeys = [...mobilePrimaryNavKeys, ...mobileSecondaryNavKeys];
  // 移动端主导航只固定常用入口，其余页面收进“更多”面板以控制底栏宽度。
  const mobileMoreItems = navItems.filter((item) => !mobilePinnedKeys.includes(item.key));

  useEffect(
    () => () => {
      if (mobileMoreCloseTimer.current !== null) {
        window.clearTimeout(mobileMoreCloseTimer.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (openPanel !== "user") {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (sidebarUserRef.current?.contains(event.target as Node)) {
        return;
      }
      // 用户菜单只监听侧栏外点击关闭，避免影响移动端更多菜单的独立关闭动画。
      setOpenPanel(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [openPanel]);

  const closeMobileMore = () => {
    if (openPanel !== "mobileMore" || isMobileMoreClosing) {
      return;
    }
    // 更多菜单关闭先保留挂载态，让 backdrop 和面板完成离场动画。
    setMobileMoreClosing(true);
    mobileMoreCloseTimer.current = window.setTimeout(() => {
      setOpenPanel(null);
      setMobileMoreClosing(false);
      mobileMoreCloseTimer.current = null;
    }, 160);
  };

  const toggleMobileMore = () => {
    if (openPanel === "mobileMore") {
      closeMobileMore();
      return;
    }
    if (mobileMoreCloseTimer.current !== null) {
      window.clearTimeout(mobileMoreCloseTimer.current);
      mobileMoreCloseTimer.current = null;
    }
    setMobileMoreClosing(false);
    setOpenPanel("mobileMore");
  };

  return (
    <div
      className={[
        "minimal-shell",
        isDark ? "minimal-shell-dark" : "minimal-shell-light",
        transitionState === "entering" ? "workspace-entering" : "",
        transitionState === "leaving" ? "workspace-leaving" : "",
      ].filter(Boolean).join(" ")}
    >
      <Sidebar
        activePage={activePage}
        navItems={navItems}
        onLogout={onLogout}
        onNavigate={onNavigate}
        onOpenProfile={onOpenProfile}
        onOpenSettings={onOpenSettings}
        openPanel={openPanel}
        setOpenPanel={setOpenPanel}
        statusLabel={statusLabel}
        userName={userName}
        userRef={sidebarUserRef}
      />

      <main className="minimal-workspace">
        <Header
          closeMobileMore={closeMobileMore}
          globalSearch={globalSearch}
          isDark={isDark}
          isMobileMoreClosing={isMobileMoreClosing}
          mobileMoreItems={mobileMoreItems}
          onCreateTask={onCreateTask}
          onNavigate={onNavigate}
          onSearchChange={onSearchChange}
          onToggleMobileMore={toggleMobileMore}
          onToggleTheme={onToggleTheme}
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
        />

        <div className="minimal-page">{children}</div>
      </main>

      {openPanel === "mobileMore" && (
        <button
          className={`minimal-mobile-menu-backdrop ${isMobileMoreClosing ? "closing" : ""}`}
          type="button"
          onClick={closeMobileMore}
          aria-label="关闭更多页面菜单"
        />
      )}

      <MobileNav
        activePage={activePage}
        mobileMoreItems={mobileMoreItems}
        mobilePrimaryItems={mobilePrimaryItems}
        mobileSecondaryItems={mobileSecondaryItems}
        onCreateTask={onCreateTask}
        onNavigate={onNavigate}
      />
    </div>
  );
}
