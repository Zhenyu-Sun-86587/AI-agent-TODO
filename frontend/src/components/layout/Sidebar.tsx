import { Sparkles, Settings } from "lucide-react";
import type { RefObject } from "react";
import type { MinimalNavItem } from "./types";
import NavItem from "./NavItem";

export default function Sidebar({
  activePage,
  navItems,
  onLogout,
  onNavigate,
  onOpenProfile,
  onOpenSettings,
  openPanel,
  setOpenPanel,
  statusLabel,
  userName,
  userRef,
}: {
  activePage: string;
  navItems: MinimalNavItem[];
  onLogout: () => void;
  onNavigate: (page: string) => void;
  onOpenProfile?: () => void;
  onOpenSettings: () => void;
  openPanel: "notifications" | "mobileMore" | "user" | null;
  setOpenPanel: (panel: "notifications" | "mobileMore" | "user" | null | ((panel: "notifications" | "mobileMore" | "user" | null) => "notifications" | "mobileMore" | "user" | null)) => void;
  statusLabel: string;
  userName: string;
  userRef: RefObject<HTMLDivElement | null>;
}) {
  return (
    <aside className="minimal-sidebar">
      <div className="minimal-brand">
        <span>
          <Sparkles size={16} />
        </span>
        <div>
          <strong>TaskPilot</strong>
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
        <div className="minimal-sidebar-user" ref={userRef}>
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
  );
}
