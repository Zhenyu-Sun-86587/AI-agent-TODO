import type { CSSProperties } from "react";
import { taskPriorityClassName } from "../../../lib/taskPresentation";
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
      // 看板卡片通过优先级和完成态叠加 class，样式层据此渲染强调色与透明度。
      className={`kanban-card ${taskPriorityClassName(task.priority)} ${task.status === "已完成" ? "is-complete" : ""}`}
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
