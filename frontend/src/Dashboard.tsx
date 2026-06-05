import type { ReactNode } from "react";
import { AlertCircle, Calendar, Check, CheckCircle2, Clock3, FileText, Sparkles } from "lucide-react";

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
  completedToday: number;
  onOpenTask: (task: DashboardTask) => void;
  onPageChange: () => void;
  onToggleComplete: (taskId: number) => void;
  overdueCount: number;
  recommendedTasks: DashboardTask[];
  todayTasks: DashboardTask[];
}

export default function Dashboard({
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

  return (
    <main className="minimal-dashboard">
      <section className="minimal-hero">
        <div>
          <h1>早上好，今天也要高效完成任务！</h1>
          <p>AI 已根据截止时间、优先级和依赖关系，为你整理好今日重点。</p>
        </div>
        <div className="minimal-rate">
          <span>今日完成率</span>
          <strong>
            {completionRate}
            <small>%</small>
          </strong>
        </div>
      </section>

      <section className="minimal-stats" aria-label="今日概览">
        <StatCard icon={<Calendar size={20} />} label="今日任务" tone="blue" value={todayTasks.length} />
        <StatCard icon={<CheckCircle2 size={20} />} label="已完成" tone="green" value={completedToday} />
        <StatCard icon={<AlertCircle size={20} />} label="逾期任务" tone="red" value={overdueCount} />
        <StatCard icon={<Sparkles size={20} />} label="AI 推荐优先" tone="purple" value={recommendedTasks.length} />
      </section>

      <section className="minimal-grid">
        <article className="minimal-panel minimal-ai-panel">
          <div className="minimal-panel-title">
            <Sparkles size={20} />
            <h2>AI 智能建议</h2>
          </div>
          {recommendedTasks.length ? (
            <div className="minimal-recommend-list">
              {recommendedTasks.map((task) => (
                <button key={task.id} type="button" onClick={() => onOpenTask(task)}>
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

        <article className="minimal-panel">
          <div className="minimal-panel-title split">
            <h2>今日任务</h2>
            <button type="button" onClick={onPageChange}>
              查看全部
            </button>
          </div>
          {visibleTasks.length ? (
            <div className="minimal-task-list">
              {visibleTasks.map((task) => {
                const isDone = task.status === "已完成";
                return (
                  <article key={task.id} className="minimal-task-row" onClick={() => onOpenTask(task)}>
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

function StatCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode;
  label: string;
  tone: "blue" | "green" | "red" | "purple";
  value: number;
}) {
  return (
    <article className="minimal-stat">
      <span className={`minimal-stat-icon ${tone}`}>{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
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
