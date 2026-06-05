import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Bell, LayoutDashboard, LogOut, Moon, Plus, Search, Sparkles, Sun, User } from "lucide-react";

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
  onSearchChange,
  onToggleTheme,
  userName,
}: LayoutProps) {
  const statusLabel = apiState === "online" ? "API" : apiState === "loading" ? "同步中" : apiState === "offline" ? "离线" : "本地";
  const [openPanel, setOpenPanel] = useState<"notifications" | "user" | null>(null);
  const mobilePrimaryItems = navItems.filter((item) => item.key === "dashboard" || item.key === "all");
  const mobileSecondaryItems = navItems.filter((item) => item.key === "ai" || item.key === "stats");
  const mobileMoreItems = navItems.filter((item) => !["dashboard", "all", "ai", "stats"].includes(item.key));

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
            <button className="minimal-primary" type="button" onClick={onCreateTask}>
              <Plus size={16} />
              新建任务
            </button>
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
            <div className="minimal-action-wrap minimal-mobile-more-wrap">
              <button
                className="minimal-icon minimal-mobile-more"
                type="button"
                onClick={() => setOpenPanel((panel) => (panel === "notifications" ? null : "notifications"))}
                aria-expanded={openPanel === "notifications"}
                aria-label="更多页面"
              >
                <LayoutDashboard size={18} />
              </button>
              {openPanel === "notifications" && (
                <div className="minimal-popover minimal-mobile-more-panel" role="menu">
                  {mobileMoreItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button key={item.key} type="button" onClick={() => onNavigate(item.key)} role="menuitem">
                        <Icon size={15} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button className="minimal-icon minimal-theme-toggle" type="button" onClick={onToggleTheme} aria-label="切换主题">
              {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <span className={`minimal-status ${apiState}`} title={apiMessage}>
              <i />
              {statusLabel}
            </span>
            <div className="minimal-action-wrap">
              <button
                className="minimal-user"
                type="button"
                onClick={() => setOpenPanel((panel) => (panel === "user" ? null : "user"))}
                aria-expanded={openPanel === "user"}
              >
                <User size={16} />
                <span>{userName}</span>
              </button>
              {openPanel === "user" && (
                <div className="minimal-popover user" role="menu">
                  <strong>{userName}</strong>
                  <button type="button" onClick={onLogout} role="menuitem">
                    退出登录
                  </button>
                </div>
              )}
            </div>
            <button className="minimal-icon" type="button" onClick={onLogout} aria-label="退出登录">
              <LogOut size={18} />
            </button>
          </div>
        </header>

        <div className="minimal-page">{children}</div>
      </main>

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
