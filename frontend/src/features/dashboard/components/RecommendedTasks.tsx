import type { CSSProperties } from "react";
import { Clock3, FileText, Sparkles } from "lucide-react";
import { EmptyState, Surface, SurfaceHeader } from "../../../components/ui/primitives";
import { formatDue, PriorityBadge } from "../../tasks/components/TaskDisplay";
import type { Task } from "../../tasks/types";

export function RecommendedTasks({
  onOpenTask,
  tasks,
}: {
  onOpenTask: (task: Task) => void;
  tasks: Task[];
}) {
  return (
    <Surface as="article" variant="panel">
      <SurfaceHeader icon={<Sparkles size={20} />} title="AI 智能建议" />
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
    </Surface>
  );
}
