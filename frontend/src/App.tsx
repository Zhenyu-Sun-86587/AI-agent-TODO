import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";

import { Shell } from "./components/Shell";
import { useAuth } from "./context/AuthContext";
import { AuthPage } from "./pages/AuthPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatsPage } from "./pages/StatsPage";
import { TasksPage } from "./pages/TasksPage";

export function App() {
  const { token, loading } = useAuth();
  usePressFeedback();

  if (loading) {
    return (
      <div className="boot-screen">
        <div className="loading-glyph" />
        <span>载入中</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/tasks" replace /> : <AuthPage />}
      />
      <Route
        element={token ? <Shell /> : <Navigate to="/login" replace />}
      >
        <Route path="/tasks" element={<TasksPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/" element={<Navigate to="/tasks" replace />} />
      </Route>
      <Route path="*" element={<Navigate to={token ? "/tasks" : "/login"} replace />} />
    </Routes>
  );
}

function usePressFeedback() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const pressable = target.closest(
        "button, .side-nav a, .status-toggle",
      );
      if (!(pressable instanceof HTMLElement)) {
        return;
      }

      pressable.classList.remove("is-pressing");
      window.requestAnimationFrame(() => {
        pressable.classList.add("is-pressing");
        window.setTimeout(() => pressable.classList.remove("is-pressing"), 420);
      });
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () => document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);
}
