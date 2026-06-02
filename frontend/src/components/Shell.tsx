import {
  BarChart3,
  ListTodo,
  LogOut,
  PanelLeft,
  Plus,
  Settings,
  Sparkles,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const titles: Record<string, string> = {
  "/tasks": "任务工作台",
  "/stats": "统计分析",
  "/settings": "个人设置",
};

export function Shell() {
  const { user, isDemo, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="app-shell">
      <aside className="side-rail glass-panel">
        <div className="brand-mark" aria-label="AI-agent-TODO">
          <div className="brand-icon">
            <Sparkles size={20} />
          </div>
          <div>
            <strong>AI-agent</strong>
            <span>TODO</span>
          </div>
        </div>

        <nav className="side-nav" aria-label="主导航">
          <NavLink to="/tasks">
            <ListTodo size={19} />
            任务
          </NavLink>
          <NavLink to="/stats">
            <BarChart3 size={19} />
            统计
          </NavLink>
          <NavLink to="/settings">
            <Settings size={19} />
            设置
          </NavLink>
        </nav>

        <div className="side-footer">
          <div className="user-pill">
            <span>{user?.username.slice(0, 1).toUpperCase() ?? "U"}</span>
            <div>
              <strong>{user?.username ?? "用户"}</strong>
              {isDemo && <small>演示模式</small>}
            </div>
          </div>
          <button
            className="icon-button"
            type="button"
            onClick={() => void logout()}
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="top-bar">
          <div className="top-title">
            <PanelLeft size={20} aria-hidden="true" />
            <div>
              <span>{new Intl.DateTimeFormat("zh-CN", { dateStyle: "full" }).format(new Date())}</span>
              <h1>{titles[location.pathname] ?? "任务工作台"}</h1>
            </div>
          </div>
          <button
            className="primary-button compact"
            type="button"
            onClick={() => navigate("/tasks?new=1")}
          >
            <Plus size={18} />
            新任务
          </button>
        </header>

        <div className="route-scene" key={location.pathname}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
