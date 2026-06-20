import type { CSSProperties } from "react";
import { Check, CheckCircle2, Clock3 } from "lucide-react";
import { ActionButton, EmptyState, Surface, SurfaceHeader } from "../../components/ui/primitives";
import { formatDue } from "../tasks/components/TaskDisplay";
import type { Task } from "../tasks/types";
import { OverviewCards } from "./components/OverviewCards";
import { RecommendedTasks } from "./components/RecommendedTasks";

export interface DashboardProps {
  completedToday: number;
  onOpenTask: (task: Task) => void;
  onPageChange: () => void;
  onToggleComplete: (taskId: number) => void;
  overdueCount: number;
  recommendedTasks: Task[];
  todayTasks: Task[];
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

        <Surface as="article" variant="panel">
          <SurfaceHeader
            title="今日任务"
            action={<ActionButton size="sm" onClick={onPageChange}>查看全部</ActionButton>}
          />
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
        </Surface>
      </section>
    </main>
  );
}
