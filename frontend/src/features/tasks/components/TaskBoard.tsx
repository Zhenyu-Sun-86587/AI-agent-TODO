import { useMemo, useState, type CSSProperties } from "react";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import {
  API_TASK_STATUS_OPTIONS,
  TASK_FILTER_ALL,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  isTaskPriorityFilter,
  type TaskPriorityFilter,
} from "../constants";
import type { Task, TaskStatus } from "../types";
import { EmptyState } from "./TaskDisplay";
import { KanbanTaskCard } from "./TaskCard";
import { SelectField } from "./TaskFilters";
import { filterTasks } from "../utils/taskQuery";

export function TaskBoard({ categories, isApiMode, onCreateTask, onOpenTask, tasks }: { categories: string[]; isApiMode: boolean; onCreateTask: () => void; onOpenTask: (task: Task) => void; tasks: Task[]; }) {
  const [query, setQuery] = useState("");
  const [priority, setPriority] = useState<TaskPriorityFilter>(TASK_FILTER_ALL);
  const [category, setCategory] = useState(TASK_FILTER_ALL);
  const filteredTasks = useMemo(() => filterTasks(tasks, { category, priority, query }), [category, priority, query, tasks]);

  return (
    <main className="page-content">
      <div className="board-toolbar">
        <label className="filter-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索任务" /></label>
        <SelectField value={priority} onChange={(value) => { if (isTaskPriorityFilter(value)) setPriority(value); }}><option value={TASK_FILTER_ALL}>全部优先级</option>{TASK_PRIORITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <SelectField value={category} onChange={setCategory}><option value={TASK_FILTER_ALL}>全部分类</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <button className="primary-button create-task-button" type="button" onClick={onCreateTask}><Plus size={17} /><span className="create-task-button-label">新建任务</span></button>
      </div>
      <div className="kanban-board">
        {(isApiMode ? API_TASK_STATUS_OPTIONS : TASK_STATUS_OPTIONS).map((status, index) => (
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
