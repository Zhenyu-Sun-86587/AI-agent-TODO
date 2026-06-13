import type { CSSProperties } from "react";
import { priorityToApi } from "../../../api/mappers";
import type { Task } from "../types";
import { formatDue, PriorityBadge } from "./TaskDisplay";

export function KanbanTaskCard({
  index,
  onOpenTask,
  task,
}: {
  index: number;
  onOpenTask: (task: Task) => void;
  task: Task;
}) {
  return (
    <button
      className={`kanban-card priority-${priorityToApi(task.priority)} ${task.status === "已完成" ? "is-complete" : ""}`}
      key={task.id}
      style={{ "--stagger-index": index } as CSSProperties}
      type="button"
      onClick={() => onOpenTask(task)}
    >
      <div className="kanban-card-head"><strong>{task.title}</strong></div>
      <div className="kanban-card-body">
        <div className="kanban-info-row">
          <span className="kanban-info-label">Priority:</span>
          <PriorityBadge priority={task.priority} />
        </div>
        <div className="kanban-info-row">
          <span className="kanban-info-label">Category:</span>
          <span className="kanban-info-value">{task.category}</span>
        </div>
        <div className="kanban-info-row">
          <span className="kanban-info-label">Due Date:</span>
          <span className="kanban-info-value">{formatDue(task)}</span>
        </div>
      </div>
    </button>
  );
}
