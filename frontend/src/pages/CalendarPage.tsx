import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { apiRangeIso, buildDateRange, mapApiTask } from "../api/mappers";
import { fetchTasksPage } from "../api/tasks";
import type { CalendarView } from "../app/types/common";
import { EmptyState, formatDue, PriorityBadge } from "../features/tasks/components/TaskDisplay";
import type { Task } from "../features/tasks/types";
import { dateFromToday, formatLocalDate, getMonthEnd, getMonthStart, getWeekStart } from "../lib/date";
import PageHeading from "./PageHeading";

const weekLabels = ["日", "一", "二", "三", "四", "五", "六"];
const calendarTaskRowLimit = 4;
const priorityRank = { 高: 0, 中: 1, 低: 2 };

function isToday(date: string) {
  return Boolean(date) && date === dateFromToday(0);
}

function isOverdue(task: Task) {
  return task.status !== "已完成" && Boolean(task.dueDate) && task.dueDate < dateFromToday(0);
}

function isDateInRange(date: string, start: string, end: string) {
  return Boolean(date) && date >= start && date <= end;
}

function parseHour(time: string) {
  const hour = Number(time.split(":")[0]);
  return Number.isFinite(hour) ? hour : null;
}

function getSelectedDate(baseDate: Date) {
  return formatLocalDate(baseDate);
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

function buildWeekDays(baseDate: Date) {
  return buildDateKeys(getWeekStart(baseDate), 7).map((date) => {
    const value = new Date(`${date}T00:00:00`);
    return {
      date,
      dayNumber: value.getDate(),
      isToday: isToday(date),
      monthNumber: value.getMonth() + 1,
      weekday: weekLabels[value.getDay()],
    };
  });
}

function getDateRangeForView(view: CalendarView, baseDate: Date, monthDays: Array<{ date: string }>, weekDays: Array<{ date: string }>) {
  if (view === "24h") {
    const selectedDate = getSelectedDate(baseDate);
    return { start: selectedDate, end: selectedDate };
  }
  if (view === "week") {
    return { start: weekDays[0]?.date || dateFromToday(0), end: weekDays[weekDays.length - 1]?.date || dateFromToday(0) };
  }
  if (view === "month") {
    return { start: monthDays[0]?.date || dateFromToday(0), end: monthDays[monthDays.length - 1]?.date || dateFromToday(0) };
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

function buildWeekTasksByDate(weekDays: ReturnType<typeof buildWeekDays>, tasks: Task[]) {
  const tasksByDate = new Map(weekDays.map((day) => [day.date, [] as Task[]]));

  tasks
    .filter((task) => tasksByDate.has(task.dueDate))
    .sort((left, right) => {
      const leftTime = left.dueTime || "99:99";
      const rightTime = right.dueTime || "99:99";
      return `${left.dueDate} ${leftTime} ${left.title}`.localeCompare(`${right.dueDate} ${rightTime} ${right.title}`);
    })
    .forEach((task) => {
      tasksByDate.get(task.dueDate)?.push(task);
    });

  return tasksByDate;
}

function buildTimelineTasksByHour(selectedDate: string, tasks: Task[]) {
  const tasksByHour = new Map<number, Task[]>();

  tasks
    .filter((task) => task.dueDate === selectedDate && Boolean(task.dueTime))
    .sort((left, right) => `${left.dueTime || "99:99"} ${left.title}`.localeCompare(`${right.dueTime || "99:99"} ${right.title}`))
    .forEach((task) => {
      const hour = parseHour(task.dueTime);
      if (hour === null || hour < 0 || hour > 23) {
        return;
      }
      const hourTasks = tasksByHour.get(hour) ?? [];
      hourTasks.push(task);
      tasksByHour.set(hour, hourTasks);
    });

  return tasksByHour;
}

function sortByPriorityThenDue(left: Task, right: Task) {
  const priorityDiff = priorityRank[left.priority] - priorityRank[right.priority];
  if (priorityDiff !== 0) {
    return priorityDiff;
  }
  return `${left.dueDate} ${left.title}`.localeCompare(`${right.dueDate} ${right.title}`);
}

function formatWeekRangeTitle(weekDays: ReturnType<typeof buildWeekDays>) {
  const firstDay = weekDays[0];
  const lastDay = weekDays[weekDays.length - 1];
  if (!firstDay || !lastDay) {
    return "本周";
  }

  const first = new Date(`${firstDay.date}T00:00:00`);
  const last = new Date(`${lastDay.date}T00:00:00`);
  const firstMonth = String(first.getMonth() + 1).padStart(2, "0");
  const firstDate = String(first.getDate()).padStart(2, "0");
  const lastMonth = String(last.getMonth() + 1).padStart(2, "0");
  const lastDate = String(last.getDate()).padStart(2, "0");

  if (first.getFullYear() === last.getFullYear() && first.getMonth() === last.getMonth()) {
    return `${first.getFullYear()}年${firstMonth}月${firstDate}日 - ${lastDate}日`;
  }
  if (first.getFullYear() === last.getFullYear()) {
    return `${first.getFullYear()}年${firstMonth}月${firstDate}日 - ${lastMonth}月${lastDate}日`;
  }
  return `${first.getFullYear()}年${firstMonth}月${firstDate}日 - ${last.getFullYear()}年${lastMonth}月${lastDate}日`;
}

function formatDateTitle(date: Date) {
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, "0")}月${String(date.getDate()).padStart(2, "0")}日`;
}

function motionStyle(index: number, extra: Record<string, string | number> = {}) {
  return { "--stagger-index": index, ...extra } as CSSProperties;
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
  const weekDays = useMemo(() => buildWeekDays(baseDate), [baseDate]);
  const dateRange = useMemo(() => getDateRangeForView(view, baseDate, days, weekDays), [baseDate, days, view, weekDays]);
  const calendarWeeks = useMemo(() => chunkCalendarWeeks(days), [days]);
  const calendarTasks = isApiMode ? remoteTasks : tasks;
  const weekTasksByDate = useMemo(() => buildWeekTasksByDate(weekDays, calendarTasks), [calendarTasks, weekDays]);
  const selectedDate = useMemo(() => getSelectedDate(baseDate), [baseDate]);
  const timelineTasksByHour = useMemo(() => buildTimelineTasksByHour(selectedDate, calendarTasks), [calendarTasks, selectedDate]);
  const overdueTasks = calendarTasks.filter(isOverdue).sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  const pendingScheduleTasks = calendarTasks
    .filter((task) => {
      if (!task.dueDate || task.dueTime || task.status === "已完成") {
        return false;
      }
      if (view === "overdue") {
        return isOverdue(task);
      }
      return isDateInRange(task.dueDate, dateRange.start, dateRange.end);
    })
    .sort(sortByPriorityThenDue);
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
          <div className="calendar-toolbar">
            <PageHeading title="日历视图" />
            <div className="calendar-month-actions" aria-label={view === "week" ? "周切换" : view === "24h" ? "日期切换" : "月份切换"}>
              <button style={motionStyle(0)} type="button" onClick={jumpToToday}>今天</button>
              {view === "week" ? (
                <>
                  <button style={motionStyle(1)} type="button" onClick={() => moveWeek(-1)}>上一周</button>
                  <button style={motionStyle(2)} type="button" onClick={() => moveWeek(1)}>下一周</button>
                </>
              ) : view === "24h" ? (
                <>
                  <button style={motionStyle(1)} type="button" onClick={() => moveDay(-1)}>上一天</button>
                  <button style={motionStyle(2)} type="button" onClick={() => moveDay(1)}>下一天</button>
                </>
              ) : (
                <>
                  <button style={motionStyle(1)} type="button" onClick={() => moveMonth(-1)}>上个月</button>
                  <button style={motionStyle(2)} type="button" onClick={() => moveMonth(1)}>下个月</button>
                </>
              )}
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
              ].map(([key, label], index) => (
                <button className={view === key ? "active" : ""} key={key} style={motionStyle(index)} type="button" onClick={() => setView(key as CalendarView)}>
                  {label}
                </button>
              ))}
            </section>
          </div>
          {isRemoteLoading && <p className="table-state">正在同步当前日历范围...</p>}
          {remoteError && <p className="form-error">{remoteError}</p>}

          {view === "24h" ? (
            <section key={calendarMotionKey} className="calendar-view-slot timeline-layout calendar-view-enter">
              <div className="today-timeline" ref={timelineRef}>
                {Array.from({ length: 24 }, (_, hour) => {
                  const hourTasks = timelineTasksByHour.get(hour) ?? [];
                  const isCurrentHour = selectedDate === dateFromToday(0) && hour === currentHour;
                  return (
                    <div className={`timeline-hour ${isCurrentHour ? "current" : ""}`} data-current-hour={isCurrentHour ? "true" : undefined} key={hour} style={motionStyle(hour)}>
                      <span className="timeline-hour-label">
                        <strong>{String(hour).padStart(2, "0")}:00</strong>
                        {isCurrentHour ? <em>当前时间</em> : null}
                      </span>
                      <div>
                        {hourTasks.map((task, taskIndex) => (
                          <button className={`timeline-task timeline-task-${getTaskTone(task)}`} key={task.id} style={motionStyle(taskIndex)} title={formatDue(task)} type="button" onClick={() => onOpenTask(task)}>
                            <span className="timeline-task-meta">
                              <small>{task.dueTime}</small>
                              <PriorityBadge priority={task.priority} />
                            </span>
                            <strong>{task.title}</strong>
                            {task.description ? <span className="timeline-task-description">{task.description}</span> : null}
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
            <section key={calendarMotionKey} className="calendar-view-slot content-card overdue-list calendar-view-enter">
              {overdueTasks.length ? (
                overdueTasks.map((task, index) => (
                  <button key={task.id} style={motionStyle(index)} type="button" onClick={() => onOpenTask(task)}>
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
          ) : view === "week" ? (
            <section key={calendarMotionKey} className="calendar-view-slot calendar-wrapper calendar-view-enter calendar-week-board" aria-label="本周任务">
              <div className="calendar-week-list">
                {weekDays.map((day, dayIndex) => {
                  const dayTasks = weekTasksByDate.get(day.date) ?? [];
                  return (
                    <article className={`calendar-week-day ${day.isToday ? "today" : ""}`} key={day.date} style={motionStyle(dayIndex)}>
                      <header className="calendar-week-day-header">
                        <div className="calendar-week-day-label">
                          <span>周{day.weekday}</span>
                          <strong>{day.dayNumber}</strong>
                        </div>
                        <small>{day.monthNumber}月</small>
                      </header>
                      <div className="calendar-week-task-list">
                        {dayTasks.length ? (
                          dayTasks.map((task, taskIndex) => (
                            <button
                              className={`calendar-week-task calendar-week-task-${getTaskTone(task)}`}
                              key={task.id}
                              style={motionStyle(taskIndex)}
                              title={formatDue(task)}
                              type="button"
                              onClick={() => onOpenTask(task)}
                            >
                              <div className="calendar-week-task-copy">
                                <strong>
                                  <span className="calendar-week-task-dot" aria-hidden="true" />
                                  {task.title}
                                </strong>
                                <small>{task.dueTime ? `${task.dueTime} · ${task.category}` : task.category}</small>
                              </div>
                            </button>
                          ))
                        ) : (
                          <p className="calendar-week-empty">暂无截止任务</p>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ) : (
            <div key={calendarMotionKey} className="calendar-view-slot calendar-wrapper calendar-view-enter">
              <div className="calendar-header-row" aria-hidden="true">
                {weekLabels.map((label) => (
                  <span className="calendar-header-cell" key={label}>{label}</span>
                ))}
              </div>
              <div className={`calendar-grid calendar-grid-${view}`} style={{ "--calendar-week-count": calendarWeeks.length } as CSSProperties}>
                {calendarWeeks.map((weekDays, weekIndex) => {
                  const taskBars = buildTaskBarsForWeek(weekDays, calendarTasks);
                  return (
                    <section className="calendar-week-row" key={weekDays[0]?.date || weekIndex} style={motionStyle(weekIndex)}>
                      {weekDays.map(({ date, isOutsideMonth }, dayIndex) => {
                        const dayNumber = new Date(`${date}T00:00:00`).getDate();
                        return (
                          <div
                            className={`calendar-day ${date === dateFromToday(0) ? "today" : ""} ${isOutsideMonth ? "outside-month" : ""}`}
                            style={motionStyle(weekIndex * 7 + dayIndex)}
                            key={date}
                          >
                            <div className="calendar-day-top">
                              <strong>{dayNumber}</strong>
                            </div>
                          </div>
                        );
                      })}
                      <div className="calendar-task-layer" aria-label="本周任务">
                        {taskBars.map(({ column, isOverflow, row, task, tone }, taskIndex) => (
                          <button
                            className={`calendar-task-bar calendar-task-bar-${tone} ${isOverflow ? "calendar-task-bar-overflow" : ""}`}
                            key={task.id}
                            style={motionStyle(taskIndex, { "--task-column": column, "--task-row": row })}
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
          <h2>待排程任务</h2>
          <div className="calendar-pending-list">
            {pendingScheduleTasks.length ? (
              pendingScheduleTasks.map((task, index) => (
                <button key={task.id} style={motionStyle(index)} type="button" onClick={() => onOpenTask(task)}>
                  <span>
                    <strong>{task.title}</strong>
                    <small>{task.dueDate}</small>
                  </span>
                  <PriorityBadge priority={task.priority} />
                </button>
              ))
            ) : (
              <EmptyState title="没有未设时段任务" description="带具体时间的今日任务会被放进左侧时间轴。" />
            )}
          </div>
        </aside>
      </section>
    </main>
  );
}
