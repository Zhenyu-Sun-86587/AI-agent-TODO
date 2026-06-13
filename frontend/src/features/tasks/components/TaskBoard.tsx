import { useMemo, useState, type CSSProperties } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import type { Task, TaskPriority, TaskStatus } from "../types";
import { EmptyState } from "./TaskDisplay";
import { KanbanTaskCard } from "./TaskCard";

const statusOptions: TaskStatus[] = ["待办", "进行中", "已完成"];
const apiStatusOptions: TaskStatus[] = ["待办", "已完成"];
const priorityOptions: TaskPriority[] = ["高", "中", "低"];

export function TaskBoard({ categories, isApiMode, onCreateTask, onOpenTask, tasks }: { categories: string[]; isApiMode: boolean; onCreateTask: () => void; onOpenTask: (task: Task) => void; tasks: Task[]; }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<TaskPriority | "全部">("全部");
  const [category, setCategory] = useState("全部");
  const filteredTasks = useMemo(() => tasks.filter((task) => {
    const keyword = query.trim().toLowerCase();
    const matchesKeyword = !keyword || [task.title, task.description, task.category, task.tags.join(" ")].some((field) => field.toLowerCase().includes(keyword));
    const matchesPriority = priority === "全部" || task.priority === priority;
    const matchesCategory = category === "全部" || task.category === category;
    return matchesKeyword && matchesPriority && matchesCategory;
  }), [category, priority, query, tasks]);

  return (
    <main className="page-content">
      <div className="board-toolbar">
        <label className="filter-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务" /></label>
        <select value={priority} onChange={(event) => setPriority(event.target.value as TaskPriority | "全部")}><option value="全部">全部优先级</option>{priorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <select value={category} onChange={(event) => setCategory(event.target.value)}><option value="全部">全部分类</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        <button className="primary-button" type="button" onClick={onCreateTask}><Plus size={17} />新建任务</button>
      </div>
      <div className="kanban-board">
        {(isApiMode ? apiStatusOptions : statusOptions).map((status, index) => (
          <TaskColumn key={status} columnIndex={index} onOpenTask={onOpenTask} status={status} tasks={filteredTasks.filter((task) => task.status === status)} />
        ))}
      </div>
    </main>
  );
}

function TaskColumn({ columnIndex, onOpenTask, status, tasks }: { columnIndex: number; onOpenTask: (task: Task) => void; status: TaskStatus; tasks: Task[]; }) {
  return (
    <section className="task-column" style={{ "--stagger-index": columnIndex } as CSSProperties}>
      <header className="kanban-column-header">
        <div className="kanban-column-title"><h2>{status}</h2><span>({tasks.length})</span></div>
        <MoreHorizontal className="kanban-column-more" size={16} />
      </header>
      <div className="task-column-list">
        {tasks.length ? tasks.map((task, index) => (
          <KanbanTaskCard index={index} key={task.id} onOpenTask={onOpenTask} task={task} />
        )) : <EmptyState title="暂无任务" description="符合当前筛选条件的任务会出现在这里。" />}
      </div>
    </section>
  );
}
