import { Bell, LayoutDashboard, Moon, Plus, Search, Sun } from "lucide-react";
import type { LayoutPanel, MinimalNavItem } from "./types";

export default function Header({
  globalSearch,
  isDark,
  isMobileMoreClosing,
  mobileMoreItems,
  onCreateTask,
  onNavigate,
  onSearchChange,
  onToggleMobileMore,
  onToggleTheme,
  openPanel,
  closeMobileMore,
  setOpenPanel,
}: {
  globalSearch: string;
  isDark: boolean;
  isMobileMoreClosing: boolean;
  mobileMoreItems: MinimalNavItem[];
  onCreateTask: () => void;
  onNavigate: (page: MinimalNavItem["key"]) => void;
  onSearchChange: (value: string) => void;
  onToggleMobileMore: () => void;
  onToggleTheme: () => void;
  openPanel: LayoutPanel;
  closeMobileMore: () => void;
  setOpenPanel: (panel: LayoutPanel | ((panel: LayoutPanel) => LayoutPanel)) => void;
}) {
  return (
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
            // 通知面板和其它顶部浮层共享 openPanel 状态，保证同一时间只展开一个。
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
        <button className="minimal-primary create-task-button" type="button" onClick={onCreateTask}>
          <Plus size={16} />
          <span className="create-task-button-label">新建任务</span>
        </button>
        {mobileMoreItems.length ? (
          <div className="minimal-action-wrap minimal-mobile-more-wrap">
            <button
              className="minimal-icon minimal-mobile-more"
              type="button"
              onClick={onToggleMobileMore}
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
        ) : null}
      </div>
    </header>
  );
}
