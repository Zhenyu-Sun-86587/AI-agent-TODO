import type { ComponentProps } from "react";
import type { PageKey } from "../app/types/common";
import { AIPage } from "../features/ai/components/AiWorkspace";
import CalendarPage, { type CalendarPageProps } from "./CalendarPage";
import DashboardPage, { type DashboardPageProps } from "./DashboardPage";
import TasksPage, { type TasksPageProps } from "./TasksPage";

type AIPageProps = ComponentProps<typeof AIPage>;

export interface PageRendererProps
  extends DashboardPageProps,
    TasksPageProps,
    AIPageProps,
    CalendarPageProps {
  activePage: PageKey;
}

function buildPageProps(props: PageRendererProps) {
  const dashboard: DashboardPageProps = {
    onOpenTask: props.onOpenTask,
    onPageChange: props.onPageChange,
    onToggleComplete: props.onToggleComplete,
    recommendedTasks: props.recommendedTasks,
    tasks: props.tasks,
  };

  const tasks: TasksPageProps = {
    categories: props.categories,
    globalSearch: props.globalSearch,
    isApiMode: props.isApiMode,
    onApiError: props.onApiError,
    onCreateTask: props.onCreateTask,
    onDelete: props.onDelete,
    onEditTask: props.onEditTask,
    onOpenTask: props.onOpenTask,
    onUpdateTaskStatus: props.onUpdateTaskStatus,
    onToggleComplete: props.onToggleComplete,
    remoteStats: props.remoteStats,
    taskVersion: props.taskVersion,
    tasks: props.tasks,
    token: props.token,
  };

  const ai: AIPageProps = {
    isApiMode: props.isApiMode,
    onApiError: props.onApiError,
    onOpenTask: props.onOpenTask,
    onSuggestTaskFields: props.onSuggestTaskFields,
    recommendedTasks: props.recommendedTasks,
    taskVersion: props.taskVersion,
    token: props.token,
  };

  const calendar: CalendarPageProps = {
    isApiMode: props.isApiMode,
    onApiError: props.onApiError,
    onOpenTask: props.onOpenTask,
    taskVersion: props.taskVersion,
    tasks: props.tasks,
    token: props.token,
  };

  return { ai, calendar, dashboard, tasks };
}

export default function PageRenderer(props: PageRendererProps) {
  const pageProps = buildPageProps(props);

  if (props.activePage === "dashboard") {
    return <DashboardPage {...pageProps.dashboard} />;
  }

  if (props.activePage === "tasks") {
    return <TasksPage {...pageProps.tasks} />;
  }

  if (props.activePage === "ai") {
    return <AIPage {...pageProps.ai} />;
  }

  if (props.activePage === "calendar") {
    return <CalendarPage {...pageProps.calendar} />;
  }

  return <DashboardPage {...pageProps.dashboard} />;
}
