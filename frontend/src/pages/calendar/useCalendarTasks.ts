import { useEffect, useState } from "react";
import { apiRangeIso, buildDateRange, mapApiTask } from "../../api/mappers";
import { fetchTasksPage } from "../../api/tasks";
import type { CalendarView } from "../../app/types/common";
import type { Task } from "../../features/tasks/types";
import { dateFromToday } from "../../lib/date";
import type { CalendarDateRange } from "./calendarUtils";

interface UseCalendarTasksOptions {
  dateRange: CalendarDateRange;
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  taskVersion: number;
  tasks: Task[];
  token: string;
  view: CalendarView;
}

export function useCalendarTasks({
  dateRange,
  isApiMode,
  onApiError,
  taskVersion,
  tasks,
  token,
  view,
}: UseCalendarTasksOptions) {
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([]);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);

  useEffect(() => {
    if (!isApiMode || !token) {
      return;
    }

    // 远端日历每次只拉取当前视图窗口；逾期视图单独限制为今天之前的未完成任务。
    let isCancelled = false;
    const taskParams = {
      page: 1,
      pageSize: 100,
      sortBy: "due_time" as const,
      sortOrder: "asc" as const,
      status: undefined as "todo" | undefined,
      dueTo: undefined as string | undefined,
      dueFrom: undefined as string | undefined,
    };
    if (view === "overdue") {
      taskParams.status = "todo";
      taskParams.dueTo = apiRangeIso(dateFromToday(-1), "23:59");
    } else {
      const range = buildDateRange(dateRange.start, dateRange.end);
      taskParams.dueFrom = range.from;
      taskParams.dueTo = range.to;
    }

    setRemoteLoading(true);
    setRemoteError("");
    void fetchTasksPage(taskParams, token)
      .then((data) => {
        if (!isCancelled) {
          setRemoteTasks(data.items.map((item) => mapApiTask(item)));
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setRemoteError(onApiError(error));
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setRemoteLoading(false);
        }
      });
    return () => {
      // 日期或视图快速切换时忽略过期响应，避免旧范围任务覆盖新范围。
      isCancelled = true;
    };
  }, [dateRange.end, dateRange.start, isApiMode, onApiError, taskVersion, token, view]);

  return {
    calendarTasks: isApiMode ? remoteTasks : tasks,
    isRemoteLoading,
    remoteError,
  };
}
