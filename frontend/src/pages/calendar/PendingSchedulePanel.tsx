import { Surface } from "../../components/ui/primitives";
import { EmptyState, PriorityBadge } from "../../features/tasks/components/TaskDisplay";
import type { Task } from "../../features/tasks/types";
import { motionStyle } from "./calendarUtils";

export function PendingSchedulePanel({
  onOpenTask,
  tasks,
}: {
  onOpenTask: (task: Task) => void;
  tasks: Task[];
}) {
  return (
    <Surface as="aside" className="calendar-pending-panel">
      <h2>待排程任务</h2>
      <div className="calendar-pending-list">
        {tasks.length ? (
          tasks.map((task, index) => (
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
    </Surface>
  );
}
