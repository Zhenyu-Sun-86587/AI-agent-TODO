import {
  Bot,
  CalendarClock,
  Check,
  Circle,
  Pencil,
  Tag,
  Trash2,
} from "lucide-react";

import type { Task } from "../api/types";
import { formatDateTime, priorityText } from "../utils/format";

interface TaskCardProps {
  task: Task;
  onToggle: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
}

export function TaskCard({ task, onToggle, onEdit, onDelete }: TaskCardProps) {
  const done = task.status === "done";

  return (
    <article className={`task-card ${done ? "is-done" : ""}`}>
      <button
        className="status-toggle"
        type="button"
        onClick={() => onToggle(task)}
        aria-label={done ? "标记为待办" : "标记为已完成"}
        title={done ? "标记为待办" : "标记为已完成"}
      >
        {done ? <Check size={18} /> : <Circle size={18} />}
      </button>

      <div className="task-main">
        <div className="task-title-row">
          <h3>{task.title}</h3>
          <span className={`priority-chip priority-${task.priority}`}>
            {priorityText[task.priority]}
          </span>
        </div>
        {task.description && <p>{task.description}</p>}
        <div className="task-meta">
          <span>
            <CalendarClock size={15} />
            {formatDateTime(task.due_time)}
          </span>
          <span>
            <Tag size={15} />
            {task.category ?? "未分类"}
          </span>
          {task.is_ai_created && (
            <span>
              <Bot size={15} />
              AI
            </span>
          )}
        </div>
      </div>

      <div className="task-actions">
        <button
          className="icon-button"
          type="button"
          onClick={() => onEdit(task)}
          aria-label="编辑"
          title="编辑"
        >
          <Pencil size={17} />
        </button>
        <button
          className="icon-button danger"
          type="button"
          onClick={() => onDelete(task)}
          aria-label="删除"
          title="删除"
        >
          <Trash2 size={17} />
        </button>
      </div>
    </article>
  );
}
