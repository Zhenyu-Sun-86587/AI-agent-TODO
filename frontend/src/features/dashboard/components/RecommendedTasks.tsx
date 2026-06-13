import type { CSSProperties, ReactNode } from "react";
import { Clock3, FileText, Sparkles } from "lucide-react";
import type { DashboardTask } from "../../../Dashboard";

function formatDue(task: Pick<DashboardTask, "dueDate" | "dueTime">) {
  if (!task.dueDate) {
    return "未设置";
  }
  return task.dueTime ? `${task.dueDate} ${task.dueTime}` : task.dueDate;
}

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
  onOpenTask: (task: DashboardTask) => void;
  tasks: DashboardTask[];
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
              <span className="minimal-recommend-priority">{task.priority}</span>
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
