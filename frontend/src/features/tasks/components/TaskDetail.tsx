import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAnimatedDismiss, useEscapeToClose } from "../../../hooks/useDismissAnimation";
import { ActionButton } from "../../../components/ui/primitives";
import type { Task, TaskDetailState } from "../types";
import { AIReasonBlock, AITag, Field, formatDue, PriorityBadge, StatusBadge } from "./TaskDisplay";

const OVERLAY_EXIT_MS = 180;

export interface TaskDetailDrawerProps {
  detailState: TaskDetailState;
  isApiMode: boolean;
  onClose: () => void;
  onDelete: (taskId: number) => void;
  onEdit: (task: Task) => void;
  onToggleComplete: (taskId: number) => void;
  task: Task | null;
}

export function TaskDetailDrawer({ detailState, isApiMode, onClose, onDelete, onEdit, onToggleComplete, task }: TaskDetailDrawerProps) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, OVERLAY_EXIT_MS, task?.id ?? null);
  useEscapeToClose(closeWithAnimation);
  const [isEntering, setIsEntering] = useState(true);

  useEffect(() => {
    setIsEntering(Boolean(task));
  }, [task?.id]);

  if (!task) {
    return null;
  }

  return (
    <>
      <button className={`drawer-backdrop ${isEntering ? "entering" : ""} ${isClosing ? "closing" : ""}`} type="button" onClick={() => closeWithAnimation()} aria-label="关闭任务详情遮罩" />
      <aside className={`drawer ${isEntering ? "entering" : ""} ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">任务详情</p>
            <h2>{task.title}</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭详情">
            <X size={18} />
          </button>
        </div>
        {detailState.isLoading && <p className="table-state">{`正在读取 /tasks/${task.id} ...`}</p>}
        {detailState.error && <p className="form-error">{detailState.error}</p>}
        <div className="drawer-fields">
          <Field label="状态"><StatusBadge status={task.status} /></Field>
          <Field label="优先级"><PriorityBadge priority={task.priority} /></Field>
          <Field label="截止时间">{formatDue(task)}</Field>
          {!isApiMode && <Field label="标签">{task.tags.join(" / ") || "未设置"}</Field>}
          <Field label="创建来源">{task.isAiCreated ? "AI 生成" : "自定义创建"}</Field>
        </div>
        <section className="task-description-card">
          <h3>任务描述</h3>
          <p className="drawer-description">{task.description || "暂无描述。"}</p>
        </section>
        <section className="ai-analysis">
          <div className="ai-analysis-heading">
            <Sparkles size={18} />
            <h3>AI 分析结果</h3>
            {task.isAiCreated && <AITag confidence={task.confidence}>AI 生成</AITag>}
          </div>
          <div className="ai-analysis-grid">
            <Field label="AI 自动分类">{task.aiCategory}</Field>
            <Field label="AI 推荐优先级">{task.priority}</Field>
            <Field label="AI 预计完成时间">{task.estimatedTime}</Field>
            <Field label="AI 解析置信度">{task.confidence ? `${Math.round(task.confidence * 100)}%` : "待确认"}</Field>
          </div>
          <AIReasonBlock reason={task.aiReason || "该任务建议安排在今天下午完成，因为它优先级较高，并且会影响后续开发进度。"} source={task.isAiCreated ? "任务生成" : "任务分析"} />
        </section>
        <div className="drawer-actions">
          <ActionButton onClick={() => onEdit(task)}>编辑任务</ActionButton>
          <ActionButton variant="primary" onClick={() => onToggleComplete(task.id)}>
            {task.status === "已完成" ? "恢复待办" : "标记完成"}
          </ActionButton>
          <ActionButton variant="danger" onClick={() => onDelete(task.id)}>删除任务</ActionButton>
        </div>
      </aside>
    </>
  );
}
