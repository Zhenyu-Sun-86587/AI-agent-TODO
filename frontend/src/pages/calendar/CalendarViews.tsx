import type { CSSProperties, RefObject } from "react";
import type { Task } from "../../features/tasks/types";
import { EmptyState, formatDue, PriorityBadge } from "../../features/tasks/components/TaskDisplay";
import { dateFromToday } from "../../lib/date";
import {
  buildTaskBarsForWeek,
  getTaskTone,
  motionStyle,
  weekLabels,
  type CalendarDay,
  type CalendarWeekDay,
} from "./calendarUtils";

interface TimelineViewProps {
  currentHour: number;
  onOpenTask: (task: Task) => void;
  selectedDate: string;
  timelineRef: RefObject<HTMLDivElement | null>;
  tasksByHour: Map<number, Task[]>;
}

export function TimelineView({
  currentHour,
  onOpenTask,
  selectedDate,
  tasksByHour,
  timelineRef,
}: TimelineViewProps) {
  return (
    <section className="calendar-view-slot timeline-layout calendar-view-enter">
      <div className="today-timeline" ref={timelineRef}>
        {Array.from({ length: 24 }, (_, hour) => {
          const hourTasks = tasksByHour.get(hour) ?? [];
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
  );
}

export function OverdueTasksView({
  onOpenTask,
  tasks,
}: {
  onOpenTask: (task: Task) => void;
  tasks: Task[];
}) {
  return (
    <section className="calendar-view-slot content-card overdue-list calendar-view-enter">
      {tasks.length ? (
        tasks.map((task, index) => (
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
  );
}

export function WeekTasksView({
  onOpenTask,
  tasksByDate,
  weekDays,
}: {
  onOpenTask: (task: Task) => void;
  tasksByDate: Map<string, Task[]>;
  weekDays: CalendarWeekDay[];
}) {
  return (
    <section className="calendar-view-slot calendar-wrapper calendar-view-enter calendar-week-board" aria-label="本周任务">
      <div className="calendar-week-list">
        {weekDays.map((day, dayIndex) => {
          const dayTasks = tasksByDate.get(day.date) ?? [];
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
  );
}

export function MonthTasksView({
  calendarTasks,
  calendarWeeks,
  onOpenTask,
}: {
  calendarTasks: Task[];
  calendarWeeks: CalendarDay[][];
  onOpenTask: (task: Task) => void;
}) {
  return (
    <div className="calendar-view-slot calendar-wrapper calendar-view-enter">
      <div className="calendar-header-row" aria-hidden="true">
        {weekLabels.map((label) => (
          <span className="calendar-header-cell" key={label}>{label}</span>
        ))}
      </div>
      <div className="calendar-grid calendar-grid-month" style={{ "--calendar-week-count": calendarWeeks.length } as CSSProperties}>
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
  );
}
