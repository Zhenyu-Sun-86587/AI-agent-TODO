import { useEffect, useMemo, useRef, useState } from "react";
import type { CalendarView } from "../app/types/common";
import type { Task } from "../features/tasks/types";
import { dateFromToday, formatLocalDate } from "../lib/date";
import { CalendarToolbar } from "./calendar/CalendarToolbar";
import { MonthTasksView, OverdueTasksView, TimelineView, WeekTasksView } from "./calendar/CalendarViews";
import { PendingSchedulePanel } from "./calendar/PendingSchedulePanel";
import {
  buildCalendarDays,
  buildTimelineTasksByHour,
  buildWeekDays,
  buildWeekTasksByDate,
  chunkCalendarWeeks,
  formatDateTitle,
  formatWeekRangeTitle,
  getDateRangeForView,
  getSelectedDate,
  isDateInRange,
  isOverdue,
  motionStyle,
  sortByPriorityThenDue,
} from "./calendar/calendarUtils";
import { useCalendarTasks } from "./calendar/useCalendarTasks";

const calendarViews: Array<{ key: CalendarView; label: string }> = [
  { key: "week", label: "7 天" },
  { key: "month", label: "30 天" },
  { key: "24h", label: "24 小时" },
  { key: "overdue", label: "逾期" },
];

export interface CalendarPageProps {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onOpenTask: (task: Task) => void;
  taskVersion: number;
  tasks: Task[];
  token: string;
}

export default function CalendarPage({
  isApiMode,
  onApiError,
  onOpenTask,
  taskVersion,
  tasks,
  token,
}: CalendarPageProps) {
  const [view, setView] = useState<CalendarView>("week");
  const [baseDate, setBaseDate] = useState(() => new Date());
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => buildCalendarDays(baseDate), [baseDate]);
  const weekDays = useMemo(() => buildWeekDays(baseDate), [baseDate]);
  const dateRange = useMemo(() => getDateRangeForView(view, baseDate, days, weekDays), [baseDate, days, view, weekDays]);
  const calendarWeeks = useMemo(() => chunkCalendarWeeks(days), [days]);
  const { calendarTasks, isRemoteLoading, remoteError } = useCalendarTasks({
    dateRange,
    isApiMode,
    onApiError,
    taskVersion,
    tasks,
    token,
    view,
  });
  const weekTasksByDate = useMemo(() => buildWeekTasksByDate(weekDays, calendarTasks), [calendarTasks, weekDays]);
  const selectedDate = useMemo(() => getSelectedDate(baseDate), [baseDate]);
  const timelineTasksByHour = useMemo(() => buildTimelineTasksByHour(selectedDate, calendarTasks), [calendarTasks, selectedDate]);
  const overdueTasks = useMemo(
    () => calendarTasks.filter(isOverdue).sort((left, right) => left.dueDate.localeCompare(right.dueDate)),
    [calendarTasks],
  );
  const pendingScheduleTasks = useMemo(
    () =>
      calendarTasks
        .filter((task) => {
          if (!task.dueDate || task.dueTime || task.status === "已完成") {
            return false;
          }
          if (view === "overdue") {
            return isOverdue(task);
          }
          return isDateInRange(task.dueDate, dateRange.start, dateRange.end);
        })
        .sort(sortByPriorityThenDue),
    [calendarTasks, dateRange.end, dateRange.start, view],
  );
  const currentHour = new Date().getHours();
  const calendarMotionKey = `${view}-${formatLocalDate(baseDate)}`;
  const calendarTitle = view === "week"
    ? formatWeekRangeTitle(weekDays)
    : view === "24h"
      ? formatDateTitle(baseDate)
      : `${baseDate.getFullYear()}年${String(baseDate.getMonth() + 1).padStart(2, "0")}月`;

  function moveMonth(offset: number) {
    setBaseDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function moveWeek(offset: number) {
    setBaseDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + offset * 7);
      return next;
    });
  }

  function moveDay(offset: number) {
    setBaseDate((current) => {
      const next = new Date(current);
      next.setDate(current.getDate() + offset);
      return next;
    });
  }

  function jumpToToday() {
    setBaseDate(new Date());
  }

  useEffect(() => {
    if (view !== "24h" || selectedDate !== dateFromToday(0) || !timelineRef.current) {
      return;
    }

    const currentHourElement = timelineRef.current.querySelector<HTMLElement>("[data-current-hour='true']");
    currentHourElement?.scrollIntoView({ block: "center" });
  }, [selectedDate, view]);

  return (
    <main className="page-content">
      <section className="calendar-page-shell">
        <div className="calendar-main-panel">
          <CalendarToolbar
            onJumpToToday={jumpToToday}
            onMoveDay={moveDay}
            onMoveMonth={moveMonth}
            onMoveWeek={moveWeek}
            view={view}
          />
          <div className="calendar-subtoolbar">
            <h2>{calendarTitle}</h2>
            <section className="calendar-controls" aria-label="日历视图">
              {calendarViews.map(({ key, label }, index) => (
                <button className={view === key ? "active" : ""} key={key} style={motionStyle(index)} type="button" onClick={() => setView(key)}>
                  {label}
                </button>
              ))}
            </section>
          </div>
          {isRemoteLoading && <p className="table-state">正在同步当前日历范围...</p>}
          {remoteError && <p className="form-error">{remoteError}</p>}

          <div key={calendarMotionKey}>
            {view === "24h" ? (
              <TimelineView
                currentHour={currentHour}
                onOpenTask={onOpenTask}
                selectedDate={selectedDate}
                tasksByHour={timelineTasksByHour}
                timelineRef={timelineRef}
              />
            ) : view === "overdue" ? (
              <OverdueTasksView onOpenTask={onOpenTask} tasks={overdueTasks} />
            ) : view === "week" ? (
              <WeekTasksView onOpenTask={onOpenTask} tasksByDate={weekTasksByDate} weekDays={weekDays} />
            ) : (
              <MonthTasksView calendarTasks={calendarTasks} calendarWeeks={calendarWeeks} onOpenTask={onOpenTask} />
            )}
          </div>
        </div>
        <PendingSchedulePanel onOpenTask={onOpenTask} tasks={pendingScheduleTasks} />
      </section>
    </main>
  );
}
