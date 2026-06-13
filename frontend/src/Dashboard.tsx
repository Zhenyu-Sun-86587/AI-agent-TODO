import type { CSSProperties, ReactNode } from "react";
import { Check, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { OverviewCards } from "./features/dashboard/components/OverviewCards";
import { RecommendedTasks } from "./features/dashboard/components/RecommendedTasks";

export interface DashboardTask {
  id: number;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  dueDate: string;
  dueTime: string;
  aiReason: string;
}

export interface DashboardProps {
  aiPriorityCount: number;
  completedToday: number;
  onOpenTask: (task: DashboardTask) => void;
  onPageChange: () => void;
  onToggleComplete: (taskId: number) => void;
  overdueCount: number;
  recommendedTasks: DashboardTask[];
  todayTasks: DashboardTask[];
}

export default function Dashboard({
  aiPriorityCount,
  completedToday,
  onOpenTask,
  onPageChange,
  onToggleComplete,
  overdueCount,
  recommendedTasks,
  todayTasks,
}: DashboardProps) {
  const visibleTasks = todayTasks.slice(0, 5);
  const completionRate = todayTasks.length ? Math.round((completedToday / todayTasks.length) * 100) : 0;
  const openTodayTasks = todayTasks.length - completedToday;

  return (
    <main className="minimal-dashboard focus-space">
      <section className="focus-hero">
        <div className="focus-greeting">
          <h1>早上好，今天也要高效完成任务！</h1>
          <p>先处理今日截止与 AI 标记的重点任务，完成后得进入全部任务池。</p>
          <div className="focus-tags">
            <span className="focus-tag">{openTodayTasks} 个待处理</span>
            <span className="focus-tag">{recommendedTasks.length} 条 AI 建议</span>
            <span className="focus-tag">{overdueCount} 个逾期</span>
          </div>
        </div>
        <OverviewCards completionRate={completionRate} recommendedCount={recommendedTasks.length} />
      </section>

      <section className="minimal-grid">
        <RecommendedTasks onOpenTask={onOpenTask} tasks={recommendedTasks} />

        <article className="minimal-panel">
          <div className="minimal-panel-title split">
            <h2>今日任务</h2>
            <button type="button" onClick={onPageChange}>
              查看全部
            </button>
          </div>
          {visibleTasks.length ? (
            <div className="minimal-task-list">
              {visibleTasks.map((task, index) => {
                const isDone = task.status === "已完成";
                return (
                  <article
                    key={task.id}
                    className={`minimal-task-row ${isDone ? "is-complete" : ""} ${task.priority === "高" ? "is-high-priority" : ""}`}
                    style={{ "--stagger-index": index } as CSSProperties}
                    onClick={() => onOpenTask(task)}
                  >
                    <button
                      className={isDone ? "done" : ""}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleComplete(task.id);
                      }}
                      aria-label={isDone ? "恢复待办" : "标记完成"}
                    >
                      {isDone && <Check size={14} />}
                    </button>
                    <div>
                      <strong>{task.title}</strong>
                      <p>{task.description}</p>
                      <small>
                        <Clock3 size={13} />
                        {formatDue(task)}
                      </small>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 size={24} />}
              title="今天没有截止任务"
              description="可以用顶部的按钮新建一个任务。"
            />
          )}
        </article>
      </section>
    </main>
  );
}

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
