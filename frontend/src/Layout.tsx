import { useEffect, useRef, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, LayoutDashboard, Moon, Plus, Search, Sparkles, Sun, Settings } from "lucide-react";

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
  userName: string;
}

export default function Layout({
  activePage,
  apiMessage,
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
  userName,
}: LayoutProps) {
  const statusLabel = apiState === "online" ? "API" : apiState === "loading" ? "同步中" : apiState === "offline" ? "离线" : "本地";
  const [openPanel, setOpenPanel] = useState<"notifications" | "mobileMore" | "user" | null>(null);
  const [isMobileMoreClosing, setMobileMoreClosing] = useState(false);
  const mobileMoreCloseTimer = useRef<number | null>(null);
  const sidebarUserRef = useRef<HTMLDivElement | null>(null);
  const mobilePrimaryItems = navItems.filter((item) => item.key === "dashboard" || item.key === "all");
  const mobileSecondaryItems = navItems.filter((item) => item.key === "ai" || item.key === "stats");
  const mobileMoreItems = navItems.filter((item) => !["dashboard", "all", "ai", "stats"].includes(item.key));

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
      setOpenPanel(null);
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [openPanel]);

  const closeMobileMore = () => {
    if (openPanel !== "mobileMore" || isMobileMoreClosing) {
      return;
    }
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
    <div className={`minimal-shell ${isDark ? "minimal-shell-dark" : "minimal-shell-light"}`}>
      <aside className="minimal-sidebar">
        <div className="minimal-brand">
          <span>
            <Sparkles size={16} />
          </span>
          <div>
            <strong>AI TODO</strong>
            <small>Workspace</small>
          </div>
        </div>

        <nav className="minimal-nav" aria-label="主导航">
          {navItems.map((item) => (
            <NavItem
              active={item.key === activePage}
              icon={item.icon}
              key={item.key}
              label={item.label}
              onClick={() => onNavigate(item.key)}
            />
          ))}
        </nav>

        <div className="minimal-sidebar-bottom">
          <div className="minimal-sidebar-user" ref={sidebarUserRef}>
            <button
              className="user-profile-btn"
              type="button"
              onClick={() => setOpenPanel((panel) => (panel === "user" ? null : "user"))}
              aria-expanded={openPanel === "user"}
            >
              <div className="sidebar-user-avatar">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="sidebar-user-copy">
                <span className="user-name-text">{userName}</span>
                <span>{statusLabel}</span>
              </div>
            </button>
            <button
              className="minimal-icon sidebar-settings-btn"
              type="button"
              onClick={onOpenSettings}
              aria-label="设置"
            >
              <Settings size={18} />
            </button>
            
            {openPanel === "user" && (
              <div className="minimal-popover user sidebar-user-menu" role="menu">
                <strong>{userName}</strong>
                <button type="button" onClick={() => { setOpenPanel(null); onOpenProfile?.(); }} role="menuitem">
                  个人资料
                </button>
                <button type="button" onClick={onLogout} role="menuitem">
                  退出登录
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="minimal-workspace">
        <header className="minimal-header">
          <label className="minimal-search">
            <Search size={16} />
            <input
              type="text"
              value={globalSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="搜索任务、标签或项目..."
            />
          </label>

          <div className="minimal-actions">
            <div className="minimal-action-wrap">
              <button
                className="minimal-icon"
                type="button"
                onClick={() => setOpenPanel((panel) => (panel === "notifications" ? null : "notifications"))}
                aria-expanded={openPanel === "notifications"}
                aria-label="通知"
              >
                <Bell size={18} />
              </button>
              {openPanel === "notifications" && (
                <div className="minimal-popover" role="status">
                  <strong>暂无新通知</strong>
                  <p>任务提醒和 AI 建议更新会显示在这里。</p>
                </div>
              )}
            </div>
            <button className="minimal-icon minimal-theme-toggle" type="button" onClick={onToggleTheme} aria-label="切换主题">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="minimal-primary" type="button" onClick={onCreateTask}>
              <Plus size={16} />
              新建任务
            </button>
            <div className="minimal-action-wrap minimal-mobile-more-wrap">
              <button
                className="minimal-icon minimal-mobile-more"
                type="button"
                onClick={toggleMobileMore}
                aria-expanded={openPanel === "mobileMore"}
                aria-label="更多页面"
              >
                <LayoutDashboard size={18} />
              </button>
              {openPanel === "mobileMore" && (
                <div className={`minimal-popover minimal-mobile-more-panel ${isMobileMoreClosing ? "closing" : ""}`} role="menu">
                  {mobileMoreItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => {
                          onNavigate(item.key);
                          closeMobileMore();
                        }}
                        role="menuitem"
                      >
                        <Icon size={15} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </header>

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

      <nav className="minimal-mobile-nav mobile-bottom-nav" aria-label="移动端导航">
        {mobilePrimaryItems.map((item) => (
          <NavItem
            active={item.key === activePage}
            icon={item.icon}
            key={item.key}
            label={item.label}
            onClick={() => onNavigate(item.key)}
          />
        ))}
        <button className="mobile-create-action" type="button" onClick={onCreateTask} aria-label="新建任务">
          <Plus size={20} />
          <span>新建</span>
        </button>
        {mobileSecondaryItems.map((item) => (
          <NavItem
            active={item.key === activePage}
            icon={item.icon}
            key={item.key}
            label={item.label}
            onClick={() => onNavigate(item.key)}
          />
        ))}
      </nav>
      <nav className="minimal-mobile-more-nav" aria-label="移动端更多页面">
        {mobileMoreItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={item.key === activePage ? "active" : ""} key={item.key} type="button" onClick={() => onNavigate(item.key)}>
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function NavItem({
  active = false,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button className={`minimal-nav-item ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <Icon size={18} />
      {label}
    </button>
  );
}
