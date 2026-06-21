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
  // 各页面只接收自己需要的 props，避免路由分发处把整个工作区状态透传下去。
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
    onCreateTask: "onCreateTask" in props ? props.onCreateTask as AIPageProps["onCreateTask"] : undefined,
    onOpenTask: props.onOpenTask,
    onParseTask: "onParseTask" in props ? props.onParseTask as AIPageProps["onParseTask"] : undefined,
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
