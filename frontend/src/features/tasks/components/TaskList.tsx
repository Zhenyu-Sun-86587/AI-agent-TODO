import { useEffect, useState, type CSSProperties, type MouseEvent } from "react";
import { Check, MoreHorizontal } from "lucide-react";
import { TASK_STATUS_OPTIONS } from "../constants";
import type { Task, TaskStatus } from "../types";
import { EmptyState, formatDue, PriorityBadge, StatusBadge } from "./TaskDisplay";
import { statusActionLabel, toggleTaskActionLabel } from "../utils/taskState";
export { FilterBar } from "./TaskFilters";
export { statusActionLabel, toggleTaskActionLabel } from "../utils/taskState";

export function TaskTable({
  onDelete,
  onEditTask,
  onOpenTask,
  onUpdateTaskStatus,
  onToggleComplete,
  tasks,
}: {
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: number, status: TaskStatus) => void | Promise<void>;
  onToggleComplete: (taskId: number) => void;
  tasks: Task[];
}) {
  const [openMenuTaskId, setOpenMenuTaskId] = useState<number | null>(null);

  useEffect(() => {
    if (openMenuTaskId === null) return;
    // 行菜单打开后监听全局点击和窗口失焦，避免桌面表格与移动卡片的菜单悬挂在旧任务上。
    const closeMenu = () => setOpenMenuTaskId(null);
    window.addEventListener("click", closeMenu);
    window.addEventListener("blur", closeMenu);
    return () => {
      window.removeEventListener("click", closeMenu);
      window.removeEventListener("blur", closeMenu);
    };
  }, [openMenuTaskId]);

  if (!tasks.length) {
    return (
      <div className="responsive-task-container">
        <EmptyState title="没有匹配任务" description="调整搜索词或筛选条件后再试一次。" />
      </div>
    );
  }

  return (
    <div className="responsive-task-container">
      <div className="desktop-table-wrapper task-table-wrap">
        <table className="task-table">
          <thead><tr><th>任务</th><th>状态</th><th>优先级</th><th>分类</th><th>截止时间</th><th className="task-actions-header">操作</th></tr></thead>
          <tbody>
            {tasks.map((task, index) => (
              <tr className={`task-table-row ${task.status === "已完成" ? "is-complete" : ""} ${task.priority === "高" ? "is-high-priority" : ""}`} key={task.id} style={{ "--stagger-index": index } as CSSProperties} onClick={() => { setOpenMenuTaskId(null); onOpenTask(task); }}>
                <td><div className="table-title"><strong className={task.status === "已完成" ? "task-title-done" : ""}>{task.title}</strong>{task.description ? <span>{task.description}</span> : null}</div></td>
                <td><StatusBadge status={task.status} /></td>
                <td><PriorityBadge priority={task.priority} /></td>
                <td><span className="task-table-category">{task.category}</span></td>
                <td><span className="table-due">{formatDue(task)}</span></td>
                <td className="task-actions-cell"><TaskRowActions isOpen={openMenuTaskId === task.id} onChangeStatus={onUpdateTaskStatus} onToggleMenu={(event) => { event.stopPropagation(); setOpenMenuTaskId((currentTaskId) => (currentTaskId === task.id ? null : task.id)); }} task={task} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mobile-card-list">
        {tasks.map((task, index) => (
          <article className={`mobile-task-card ${task.status === "已完成" ? "is-complete" : ""} ${task.priority === "高" ? "is-high-priority" : ""}`} key={task.id} style={{ "--stagger-index": index } as CSSProperties} onClick={() => onOpenTask(task)}>
            <div className="mobile-task-card-header">
              <div className="mobile-task-title">
                <button className={`task-check ${task.status === "已完成" ? "checked" : ""}`} type="button" onClick={(event) => { event.stopPropagation(); onToggleComplete(task.id); }} aria-label={toggleTaskActionLabel(task.status)} title={toggleTaskActionLabel(task.status)}>{task.status === "已完成" && <Check size={14} />}</button>
                <strong className={task.status === "已完成" ? "task-title-done" : ""}>{task.title}</strong>
              </div>
              <button className="mobile-card-more" type="button" onClick={(event) => { event.stopPropagation(); setOpenMenuTaskId((currentTaskId) => (currentTaskId === task.id ? null : task.id)); }} aria-expanded={openMenuTaskId === task.id} aria-label="更多操作"><MoreHorizontal size={18} /></button>
            </div>
            {task.description && <p>{task.description}</p>}
            <div className="mobile-task-meta"><StatusBadge status={task.status} /><PriorityBadge priority={task.priority} /><span>{task.category}</span><span>{formatDue(task)}</span></div>
            {openMenuTaskId === task.id && (
              <div className="mobile-quick-actions" onClick={(event) => event.stopPropagation()}>
                {TASK_STATUS_OPTIONS.map((statusItem) => (
                  <button key={statusItem} className={task.status === statusItem ? "is-active" : ""} type="button" onClick={() => { setOpenMenuTaskId(null); void onUpdateTaskStatus(task.id, statusItem); }}>{statusActionLabel(statusItem)}</button>
                ))}
                <button type="button" onClick={() => onOpenTask(task)}>查看详情</button>
                <button type="button" onClick={() => onEditTask(task)}>编辑</button>
                <button className="danger" type="button" onClick={() => onDelete(task.id)}>删除</button>
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

function TaskRowActions({
  isOpen,
  onChangeStatus,
  onToggleMenu,
  task,
}: {
  isOpen: boolean;
  onChangeStatus: (taskId: number, status: TaskStatus) => void | Promise<void>;
  onToggleMenu: (event: MouseEvent<HTMLButtonElement>) => void;
  task: Task;
}) {
  return (
    <div className="row-actions task-actions">
      <button className={`row-menu-trigger ${isOpen ? "is-open" : ""}`} type="button" onClick={onToggleMenu} aria-expanded={isOpen} aria-haspopup="menu" aria-label="修改任务状态" title="修改任务状态"><MoreHorizontal size={16} /></button>
      {isOpen && (
        <div className="row-menu" role="menu" onClick={(event) => event.stopPropagation()}>
          {TASK_STATUS_OPTIONS.map((statusItem) => (
            <button key={statusItem} className={task.status === statusItem ? "is-active" : ""} type="button" role="menuitemradio" aria-checked={task.status === statusItem} onClick={() => void onChangeStatus(task.id, statusItem)}>
              <span className="row-menu-status"><StatusBadge status={statusItem} /></span>
              <span>{statusActionLabel(statusItem)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
