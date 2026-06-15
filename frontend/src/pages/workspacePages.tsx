import type { ApiCategoryStats, ApiPriorityStats, ApiStatsOverview } from "../api/types";
import type { PageKey } from "../app/types/common";
import { AIPage } from "../features/ai/components/AiWorkspace";
import type { Task, TaskFieldSuggestion, TaskStatus } from "../features/tasks/types";
import CalendarPage from "./CalendarPage";
import DashboardPage from "./DashboardPage";
import SettingsPage from "./SettingsPage";
import TasksPage from "./TasksPage";

export interface PageRendererProps {
  activePage: PageKey;
  categories: string[];
  globalSearch: string;
  isApiMode: boolean;
  onCreateTask: () => void;
  onApiError: (error: unknown) => string;
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onPageChange: (page: PageKey) => void;
  onSaveProfile: (profile: { username: string; email: string }) => Promise<string | void>;
  onSaveSettings: (settings: { openaiApiKey: string; modelName: string; maskedKey?: string; hasOpenaiApiKey?: boolean }) => Promise<string | void>;
  onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion>;
  onTestOpenAIKey: (settings: { openaiApiKey: string; modelName: string; maskedKey?: string; hasOpenaiApiKey?: boolean }) => Promise<string>;
  onUpdateTaskStatus: (taskId: number, status: TaskStatus) => void | Promise<void>;
  onToggleComplete: (taskId: number) => void;
  profile: { username: string; email: string };
  recommendedTasks: Task[];
  remoteStats: { overview: ApiStatsOverview | null; categories: ApiCategoryStats[]; priorities: ApiPriorityStats[]; trend: Array<{ date: string; created: number; done: number }> };
  settings: { openaiApiKey: string; modelName: string; maskedKey?: string; hasOpenaiApiKey?: boolean };
  taskVersion: number;
  token: string;
  tasks: Task[];
}

export default function PageRenderer(props: PageRendererProps) {
  if (props.activePage === "dashboard") {
    return (
      <DashboardPage
        onOpenTask={props.onOpenTask}
        onPageChange={props.onPageChange}
        onToggleComplete={props.onToggleComplete}
        recommendedTasks={props.recommendedTasks}
        tasks={props.tasks}
      />
    );
  }

  if (props.activePage === "tasks") {
    return (
      <TasksPage
        categories={props.categories}
        globalSearch={props.globalSearch}
        isApiMode={props.isApiMode}
        onApiError={props.onApiError}
        onCreateTask={props.onCreateTask}
        onDelete={props.onDelete}
        onEditTask={props.onEditTask}
        onOpenTask={props.onOpenTask}
        onUpdateTaskStatus={props.onUpdateTaskStatus}
        onToggleComplete={props.onToggleComplete}
        remoteStats={props.remoteStats}
        taskVersion={props.taskVersion}
        tasks={props.tasks}
        token={props.token}
      />
    );
  }

  if (props.activePage === "ai") {
    return (
      <AIPage
        isApiMode={props.isApiMode}
        onApiError={props.onApiError}
        onOpenTask={props.onOpenTask}
        onSuggestTaskFields={props.onSuggestTaskFields}
        recommendedTasks={props.recommendedTasks}
        taskVersion={props.taskVersion}
        token={props.token}
      />
    );
  }

  if (props.activePage === "calendar") {
    return (
      <CalendarPage
        isApiMode={props.isApiMode}
        onApiError={props.onApiError}
        onOpenTask={props.onOpenTask}
        taskVersion={props.taskVersion}
        tasks={props.tasks}
        token={props.token}
      />
    );
  }

  return <SettingsPage />;
}
