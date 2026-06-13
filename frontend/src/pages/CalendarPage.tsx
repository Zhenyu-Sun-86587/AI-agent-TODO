import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { apiRangeIso, buildDateRange, mapApiTask } from "../api/mappers";
import { fetchTasksPage } from "../api/tasks";
import type { CalendarView } from "../app/types/common";
import { EmptyState, formatDue, PriorityBadge } from "../features/tasks/components/TaskDisplay";
import type { Task } from "../features/tasks/types";
import { dateFromToday, formatLocalDate, getMonthEnd, getMonthStart } from "../lib/date";
import PageHeading from "./PageHeading";

const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];
const calendarTaskRowLimit = 4;

function isToday(date: string) {
  return Boolean(date) && date === dateFromToday(0);
}

function isOverdue(task: Task) {
  return task.status !== "已完成" && Boolean(task.dueDate) && task.dueDate < dateFromToday(0);
}

function parseHour(time: string) {
  const hour = Number(time.split(":")[0]);
  return Number.isFinite(hour) ? hour : null;
}

function buildDateKeys(start: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return formatLocalDate(date);
  });
}

function getCalendarGridStart(date: Date) {
  const value = getMonthStart(date);
  value.setDate(value.getDate() - value.getDay());
  return value;
}

function buildCalendarDays(baseDate: Date) {
  const monthStart = getMonthStart(baseDate);
  const monthEnd = getMonthEnd(baseDate);
  const gridStart = getCalendarGridStart(baseDate);
  const leadingDays = monthStart.getDay();
  const trailingDays = 6 - monthEnd.getDay();
  const totalDays = Math.ceil((leadingDays + monthEnd.getDate() + trailingDays) / 7) * 7;

  return buildDateKeys(gridStart, totalDays).map((date) => ({
    date,
    isOutsideMonth: new Date(`${date}T00:00:00`).getMonth() !== baseDate.getMonth(),
  }));
}

function getDateRangeForView(view: CalendarView, days: Array<{ date: string }>) {
  if (view === "24h") {
    return { start: dateFromToday(0), end: dateFromToday(0) };
  }
  if (view === "week" || view === "month") {
    return { start: days[0]?.date || dateFromToday(0), end: days[days.length - 1]?.date || dateFromToday(0) };
  }
  return { start: dateFromToday(0), end: dateFromToday(0) };
}

function chunkCalendarWeeks(days: ReturnType<typeof buildCalendarDays>) {
  return Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => days.slice(index * 7, index * 7 + 7));
}

function getTaskTone(task: Task) {
  if (task.status === "已完成") {
    return "done";
  }
  if (task.priority === "高") {
    return "urgent";
  }
  if (task.priority === "中") {
    return "focus";
  }
  return "calm";
}

function buildTaskBarsForWeek(weekDays: ReturnType<typeof buildCalendarDays>, tasks: Task[]) {
  const dayIndexByDate = new Map(weekDays.map((day, index) => [day.date, index]));
  const usedRowsByDate = new Map<string, Set<number>>();

  return tasks
    .filter((task) => dayIndexByDate.has(task.dueDate))
    .sort((left, right) => `${left.dueDate} ${left.dueTime || "99:99"}`.localeCompare(`${right.dueDate} ${right.dueTime || "99:99"}`))
    .map((task) => {
      const usedRows = usedRowsByDate.get(task.dueDate) ?? new Set<number>();
      let row = 0;
      while (usedRows.has(row) && row < calendarTaskRowLimit) {
        row += 1;
      }
      usedRows.add(row);
      usedRowsByDate.set(task.dueDate, usedRows);

      return {
        task,
        column: (dayIndexByDate.get(task.dueDate) ?? 0) + 1,
        isOverflow: row >= calendarTaskRowLimit,
        row: Math.min(row, calendarTaskRowLimit - 1),
        tone: getTaskTone(task),
      };
    });
}

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
  const [view, setView] = useState<CalendarView>("week");
  const [baseDate, setBaseDate] = useState(() => new Date());
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([]);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const days = useMemo(() => buildCalendarDays(baseDate), [baseDate]);
  const dateRange = useMemo(() => getDateRangeForView(view, days), [days, view]);
  const calendarWeeks = useMemo(() => chunkCalendarWeeks(days), [days]);
  const calendarTasks = isApiMode ? remoteTasks : tasks;
  const todayTimedTasks = calendarTasks.filter((task) => isToday(task.dueDate) && Boolean(task.dueTime));
  const todayUntimedTasks = calendarTasks.filter((task) => isToday(task.dueDate) && !task.dueTime);
  const unscheduledTasks = tasks.filter((task) => !task.dueDate);
  const overdueTasks = calendarTasks.filter(isOverdue).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const currentHour = new Date().getHours();
  const calendarTitle = `${baseDate.getFullYear()}年${String(baseDate.getMonth() + 1).padStart(2, "0")}月`;

  function moveMonth(offset: number) {
    setBaseDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function jumpToToday() {
    setBaseDate(new Date());
  }

  useEffect(() => {
    if (!isApiMode || !token) {
      return;
    }

    let isCancelled = false;
    const params = new URLSearchParams({
      page: "1",
      page_size: "100",
      sort_by: "due_time",
      sort_order: "asc",
    });

    if (view === "overdue") {
      params.set("status", "todo");
      params.set("due_to", apiRangeIso(dateFromToday(-1), "23:59"));
    } else {
      const range = buildDateRange(dateRange.start, dateRange.end);
      params.set("due_from", range.from);
      params.set("due_to", range.to);
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
  }, [dateRange.end, dateRange.start, isApiMode, onApiError, taskVersion, token, view]);

  useEffect(() => {
    if (view !== "24h" || !timelineRef.current) {
      return;
    }

    const currentHourElement = timelineRef.current.querySelector<HTMLElement>("[data-current-hour='true']");
    currentHourElement?.scrollIntoView({ block: "center" });
  }, [view]);

  return (
    <main className="page-content">
      <section className="calendar-page-shell">
        <div className="calendar-main-panel">
          <div className="calendar-toolbar">
            <PageHeading title="日历视图" />
            <div className="calendar-month-actions" aria-label="月份切换">
              <button type="button" onClick={jumpToToday}>今天</button>
              <button type="button" onClick={() => moveMonth(-1)}>上个月</button>
              <button type="button" onClick={() => moveMonth(1)}>下个月</button>
            </div>
          </div>
          <div className="calendar-subtoolbar">
            <h2>{calendarTitle}</h2>
            <section className="calendar-controls" aria-label="日历视图">
              {[
                ["week", "7 天"],
                ["month", "30 天"],
                ["24h", "24 小时"],
                ["overdue", "逾期"],
              ].map(([key, label]) => (
                <button className={view === key ? "active" : ""} key={key} type="button" onClick={() => setView(key as CalendarView)}>
                  {label}
                </button>
              ))}
            </section>
          </div>
          {isRemoteLoading && <p className="table-state">正在同步当前日历范围...</p>}
          {remoteError && <p className="form-error">{remoteError}</p>}

          {view === "24h" ? (
            <section className="timeline-layout">
              <div className="today-timeline" ref={timelineRef}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourTasks = todayTimedTasks.filter((task) => parseHour(task.dueTime) === hour);
                  const isCurrentHour = hour === currentHour;
                  return (
                    <div className={`timeline-hour ${isCurrentHour ? "current" : ""}`} data-current-hour={isCurrentHour ? "true" : undefined} key={hour}>
                      <span className="timeline-hour-label">
                        <strong>{String(hour).padStart(2, "0")}:00</strong>
                        {isCurrentHour ? <em>当前时间</em> : null}
                      </span>
                      <div>
                        {hourTasks.map((task) => (
                          <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                            <strong>{task.title}</strong>
                            <small>{task.category}</small>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : view === "overdue" ? (
            <section className="content-card overdue-list">
              {overdueTasks.length ? (
                overdueTasks.map((task) => (
                  <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                    <div>
                      <strong>{task.title}</strong>
                      <span>{formatDue(task)}</span>
                    </div>
                    <PriorityBadge priority={task.priority} />
                  </button>
                ))
              ) : (
                <EmptyState title="没有逾期任务" description="当前所有未完成任务都还在截止时间内。" />
              )}
            </section>
          ) : (
            <div className="calendar-wrapper">
              <div className="calendar-header-row" aria-hidden="true">
                {weekLabels.map((label) => (
                  <span className="calendar-header-cell" key={label}>{label}</span>
                ))}
              </div>
              <div className={`calendar-grid calendar-grid-${view}`} style={{ "--calendar-week-count": calendarWeeks.length } as CSSProperties}>
                {calendarWeeks.map((weekDays, weekIndex) => {
                  const taskBars = buildTaskBarsForWeek(weekDays, calendarTasks);
                  return (
                    <section className="calendar-week-row" key={weekDays[0]?.date || weekIndex}>
                      {weekDays.map(({ date, isOutsideMonth }) => {
                        const dayNumber = new Date(`${date}T00:00:00`).getDate();
                        return (
                          <div
                            className={`calendar-day ${date === dateFromToday(0) ? "today" : ""} ${isOutsideMonth ? "outside-month" : ""}`}
                            key={date}
                          >
                            <div className="calendar-day-top">
                              <strong>{dayNumber}</strong>
                            </div>
                          </div>
                        );
                      })}
                      <div className="calendar-task-layer" aria-label="本周任务">
                        {taskBars.map(({ column, isOverflow, row, task, tone }) => (
                          <button
                            className={`calendar-task-bar calendar-task-bar-${tone} ${isOverflow ? "calendar-task-bar-overflow" : ""}`}
                            key={task.id}
                            style={{ "--task-column": column, "--task-row": row } as CSSProperties}
                            title={formatDue(task)}
                            type="button"
                            onClick={() => onOpenTask(task)}
                          >
                            <strong className="calendar-task-title">{task.title}</strong>
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        <aside className="calendar-pending-panel">
          <h2>{view === "24h" ? "今日未设时段 / 无截止日期任务" : "待排程任务 / 无截止日期任务"}</h2>
          <div className="calendar-pending-list">
            {view === "24h" ? (
              <>
                {todayUntimedTasks.length ? (
                  todayUntimedTasks.map((task) => (
                    <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                      {task.title}
                    </button>
                  ))
                ) : (
                  <EmptyState title="没有未设时段任务" description="带具体时间的今日任务会被放进左侧时间轴。" />
                )}
                {unscheduledTasks.length ? (
                  unscheduledTasks.map((task) => (
                    <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                      {task.title}
                    </button>
                  ))
                ) : null}
              </>
            ) : unscheduledTasks.length ? (
              unscheduledTasks.map((task) => (
                <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
                  {task.title}
                </button>
              ))
            ) : (
              <EmptyState title="没有待排程任务" description="无截止日期任务会显示在这里。" />
              )}
          </div>
        </aside>
      </section>
    </main>
  );
}
