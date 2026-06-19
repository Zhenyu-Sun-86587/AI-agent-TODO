import { CalendarDays, CheckCircle2, Clock3, Sparkles } from "lucide-react";
import { StatsCard } from "../components/StatsCard";
import { TaskTable } from "../components/TaskList";
import type { Task, TaskStatus } from "../types";
import { getTodayTasks } from "../utils/taskQuery";

export interface TodayTasksPageProps {
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: number, status: TaskStatus) => void | Promise<void>;
  onToggleComplete: (taskId: number) => void;
  tasks: Task[];
}

export function TodayTasksPage({
  onDelete,
  onEditTask,
  onOpenTask,
  onUpdateTaskStatus,
  onToggleComplete,
  tasks,
}: TodayTasksPageProps) {
  const todayTasks = getTodayTasks(tasks);
  const done = todayTasks.filter((task) => task.status === "已完成").length;
  const remaining = todayTasks.length - done;
  const aiRecommended = todayTasks.filter((task) => task.status !== "已完成" && (task.isAiCreated || task.priority === "高")).length;

  return (
    <main className="page-content">
      <section className="stats-grid">
        <StatsCard icon={CalendarDays} label="今日任务" value={todayTasks.length} tone="blue" />
        <StatsCard icon={CheckCircle2} label="已完成" value={done} tone="green" />
        <StatsCard icon={Clock3} label="待处理" value={remaining} tone="purple" />
        <StatsCard icon={Sparkles} label="AI 重点" value={aiRecommended} tone="purple" />
      </section>
      <section className="content-card table-card">
        <div className="section-title">
          <div>
            <h2>今天的执行清单</h2>
            <p>按截止时段排列，点击任务可打开详情抽屉。</p>
          </div>
        </div>
        <TaskTable
          onDelete={onDelete}
          onEditTask={onEditTask}
          onOpenTask={onOpenTask}
          onUpdateTaskStatus={onUpdateTaskStatus}
          onToggleComplete={onToggleComplete}
          tasks={todayTasks}
        />
      </section>
    </main>
  );
}
