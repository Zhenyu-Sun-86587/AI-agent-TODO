import { useEffect, useState } from "react";
import { buildDateRange, mapApiTask } from "../api/mappers";
import { fetchTasksPage } from "../api/tasks";
import type { CalendarView } from "../app/types/common";
import { formatDue } from "../features/tasks/components/TaskDisplay";
import type { Task } from "../features/tasks/types";
import { dateFromToday, formatLocalDate } from "../lib/date";
import PageHeading from "./PageHeading";

export default function CalendarPage({
  isApiMode,
  onApiError,
  onOpenTask,
  taskVersion,
  tasks,
  token,
}: {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onOpenTask: (task: Task) => void;
  taskVersion: number;
  tasks: Task[];
  token: string;
}) {
  const [view] = useState<CalendarView>("7");
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([]);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const currentDate = new Date();
  const dayOfWeek = currentDate.getDay() === 0 ? 7 : currentDate.getDay();
  const daysToMonday = dayOfWeek - 1;
  const daysInWeek = 7;
  const weekDays = Array.from({ length: daysInWeek }, (_, index) => dateFromToday(index - daysToMonday));
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startOfMonthOffset = 1 - currentDate.getDate();
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => dateFromToday(startOfMonthOffset + index));

  useEffect(() => {
    if (!isApiMode || !token) {
      setRemoteTasks([]);
      return;
    }

    let isCancelled = false;
    const params = new URLSearchParams({ page: "1", page_size: "100" });
    if (view === "overdue") {
      params.set("due_to", formatLocalDate(new Date(Date.now() - 86400000)));
    } else if (view !== "24h") {
      const ranges: Record<"7" | "14" | "30", [string, string]> = {
        "7": [weekDays[0], weekDays[6]],
        "14": [dateFromToday(-13), dateFromToday(0)],
        "30": [monthDays[0] || dateFromToday(0), monthDays[monthDays.length - 1] || dateFromToday(0)],
      };
      const [start, end] = ranges[view as "7" | "14" | "30"];
      const query = new URLSearchParams(buildDateRange(start, end));
      params.append("due_from", query.get("from") || "");
      params.append("due_to", query.get("to") || "");
    }

    setRemoteLoading(true);
    setRemoteError("");
    void fetchTasksPage(`/tasks?${params.toString()}`, token)
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
      isCancelled = true;
    };
  }, [isApiMode, onApiError, token, taskVersion, view, weekDays, monthDays]);

  const visibleTasks = isApiMode ? remoteTasks : tasks;

  return (
    <main className="page-content">
      <PageHeading title="日历" />
      {isRemoteLoading && <p className="table-state">正在加载日历任务...</p>}
      {remoteError && <p className="form-error">{remoteError}</p>}
      <section className="content-card">
        <div className="section-title">
          <div>
            <h2>任务日历</h2>
            <p>按日查看任务分布。</p>
          </div>
        </div>
        <div className="calendar-grid">
          {visibleTasks.slice(0, 12).map((task) => (
            <button key={task.id} className="calendar-task" type="button" onClick={() => onOpenTask(task)}>
              <strong>{task.title}</strong>
              <span>{formatDue(task)}</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
