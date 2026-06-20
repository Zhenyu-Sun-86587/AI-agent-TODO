import { type ReactNode } from "react";
import { FileText, Sparkles } from "lucide-react";
import { EmptyState as UiEmptyState } from "../../../components/ui/primitives";
import { taskPriorityClassName, taskStatusClassName } from "../../../lib/taskPresentation";
import type { Task, TaskPriority, TaskStatus } from "../types";

export function formatDue(task: Pick<Task, "dueDate" | "dueTime">) {
  if (!task.dueDate) {
    return "未设置";
  }

  return task.dueTime ? `${task.dueDate} ${task.dueTime}` : task.dueDate;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const displayPriority = priority === "高" ? "High" : priority === "低" ? "Low" : "Medium";
  return <span className={`priority-badge ${taskPriorityClassName(priority)}`}>{displayPriority}</span>;
}

export function StatusBadge({ status }: { status: TaskStatus }) {
  return <span className={`status-badge ${taskStatusClassName(status)}`}>{status}</span>;
}

export function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="drawer-field">
      <span>{label}</span>
      <strong>{children}</strong>
    </div>
  );
}

export function AITag({ children, confidence }: { children: ReactNode; confidence?: number }) {
  return (
    <span className="ai-brand-tag">
      <Sparkles size={12} />
      {children}
      {confidence ? <i>{Math.round(confidence * 100)}%</i> : null}
    </span>
  );
}

export function AIReasonBlock({ reason, source }: { reason: string; source?: string }) {
  return (
    <div className="ai-reason-block">
      <div className="ai-reason-header">
        <Sparkles size={16} />
        <strong>AI 智能分析</strong>
        {source ? <AITag>{source}</AITag> : null}
      </div>
      <p>{reason}</p>
    </div>
  );
}

export function EmptyState({ description, title }: { description: string; title: string }) {
  return <UiEmptyState icon={<FileText size={26} />} title={title} description={description} />;
}
