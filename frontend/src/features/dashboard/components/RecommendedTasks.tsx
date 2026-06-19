import type { CSSProperties, ReactNode } from "react";
import { Clock3, FileText, Sparkles } from "lucide-react";
import { formatDue, PriorityBadge } from "../../tasks/components/TaskDisplay";
import type { Task } from "../../tasks/types";

function EmptyState({
  description,
  icon,
  title,
}: {
  description: string;
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="minimal-empty">
      <span>{icon}</span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export function RecommendedTasks({
  onOpenTask,
  tasks,
}: {
  onOpenTask: (task: Task) => void;
  tasks: Task[];
}) {
  return (
    <article className="minimal-panel minimal-ai-panel">
      <div className="minimal-panel-title">
        <Sparkles size={20} />
        <h2>AI 智能建议</h2>
      </div>
      {tasks.length ? (
        <div className="minimal-recommend-list">
          {tasks.map((task, index) => (
            <button
              className="minimal-recommend-item"
              key={task.id}
              style={{ "--stagger-index": index } as CSSProperties}
              type="button"
              onClick={() => onOpenTask(task)}
            >
              <div>
                <div className="minimal-ai-title-line">
                  <strong>{task.title}</strong>
                  <span className="ai-tiny-tag">AI 推荐</span>
                </div>
                <p>智能分析：{task.aiReason}</p>
              </div>
              <PriorityBadge priority={task.priority} />
              <small>
                <Clock3 size={12} />
                {formatDue(task)}
              </small>
            </button>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText size={24} />}
          title="暂无 AI 推荐"
          description="所有任务都已完成，或者还没有可分析的待办任务。"
        />
      )}
    </article>
  );
}
