import { useState } from "react";
import type { ApiCategoryStats, ApiPriorityStats, ApiStatsOverview } from "../api/types";
import { TaskBoard } from "../features/tasks/components/TaskBoard";
import { AllTasksPage } from "../features/tasks/pages/AllTasksPage";
import { StatsPage } from "../features/tasks/pages/StatsPage";
import { TodayTasksPage } from "../features/tasks/pages/TodayTasksPage";
import type { Task, TaskStatus } from "../features/tasks/types";

type TasksTab = "all" | "today" | "board" | "stats";

const tabs: Array<{ key: TasksTab; label: string }> = [
  { key: "all", label: "全部任务" },
  { key: "today", label: "今日任务" },
  { key: "board", label: "任务看板" },
  { key: "stats", label: "数据统计" },
];

export interface TasksPageProps {
  categories: string[];
  globalSearch: string;
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onCreateTask: () => void;
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: number, status: TaskStatus) => void | Promise<void>;
  onToggleComplete: (taskId: number) => void;
  remoteStats: {
    overview: ApiStatsOverview | null;
    categories: ApiCategoryStats[];
    priorities: ApiPriorityStats[];
    trend: Array<{ date: string; created: number; done: number }>;
  };
  taskVersion: number;
  token: string;
  tasks: Task[];
}

export default function TasksPage(props: TasksPageProps) {
  const [activeTab, setActiveTab] = useState<TasksTab>("all");

  return (
    <div className="unified-tasks-page fade-in-up">
      <div className="unified-tabs">
        {tabs.map((tab) => (
          <button
            className={activeTab === tab.key ? "active" : ""}
            key={tab.key}
            type="button"
            // 任务页通过本地 tab 切换不同聚合视图，不为这些子视图单独维护路由。
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="unified-content">
        {activeTab === "all" && (
          <AllTasksPage
            categories={props.categories}
            globalSearch={props.globalSearch}
            isApiMode={props.isApiMode}
            onApiError={props.onApiError}
            onDelete={props.onDelete}
            onEditTask={props.onEditTask}
            onOpenTask={props.onOpenTask}
            onUpdateTaskStatus={props.onUpdateTaskStatus}
            onToggleComplete={props.onToggleComplete}
            taskVersion={props.taskVersion}
            token={props.token}
            tasks={props.tasks}
          />
        )}
        {activeTab === "today" && (
          <TodayTasksPage
            onDelete={props.onDelete}
            onEditTask={props.onEditTask}
            onOpenTask={props.onOpenTask}
            onUpdateTaskStatus={props.onUpdateTaskStatus}
            onToggleComplete={props.onToggleComplete}
            tasks={props.tasks}
          />
        )}
        {activeTab === "board" && (
          <TaskBoard
            categories={props.categories}
            isApiMode={props.isApiMode}
            onCreateTask={props.onCreateTask}
            onOpenTask={props.onOpenTask}
            tasks={props.tasks}
          />
        )}
        {activeTab === "stats" && (
          <StatsPage
            isApiMode={props.isApiMode}
            onApiError={props.onApiError}
            remoteStats={props.remoteStats}
            taskVersion={props.taskVersion}
            tasks={props.tasks}
            token={props.token}
          />
        )}
      </div>
    </div>
  );
}
