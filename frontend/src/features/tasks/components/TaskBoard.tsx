import { useMemo, useState, type CSSProperties } from "react";
import { MoreHorizontal, Plus } from "lucide-react";
import { ActionButton, SearchField, Surface } from "../../../components/ui/primitives";
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
  // 看板不分页，只按当前搜索/优先级/分类先收窄，再分发到各状态列。
  const filteredTasks = useMemo(() => filterTasks(tasks, { category, priority, query }), [category, priority, query, tasks]);

  return (
    <main className="page-content">
      <div className="board-toolbar">
        <SearchField value={query} onChange={setQuery} placeholder="搜索任务" />
        <SelectField value={priority} onChange={(value) => { if (isTaskPriorityFilter(value)) setPriority(value); }}><option value={TASK_FILTER_ALL}>全部优先级</option>{TASK_PRIORITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <SelectField value={category} onChange={setCategory}><option value={TASK_FILTER_ALL}>全部分类</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</SelectField>
        <ActionButton className="create-task-button" variant="primary" onClick={onCreateTask} icon={<Plus size={17} />}><span className="create-task-button-label">新建任务</span></ActionButton>
      </div>
      <div className="kanban-board">
        {/* API 模式隐藏“进行中”列，保持看板列集合和后端状态枚举一致。 */}
        {(isApiMode ? API_TASK_STATUS_OPTIONS : TASK_STATUS_OPTIONS).map((status, index) => (
          <TaskColumn key={status} columnIndex={index} onOpenTask={onOpenTask} status={status} tasks={filteredTasks.filter((task) => task.status === status)} />
        ))}
      </div>
    </main>
  );
}

function TaskColumn({ columnIndex, onOpenTask, status, tasks }: { columnIndex: number; onOpenTask: (task: Task) => void; status: TaskStatus; tasks: Task[]; }) {
  return (
    <Surface as="section" className="task-column" variant="panel" padding="sm" interactive style={{ "--stagger-index": columnIndex } as CSSProperties}>
      <header className="kanban-column-header">
        <div className="kanban-column-title"><h2>{status}</h2><span>({tasks.length})</span></div>
        <MoreHorizontal className="kanban-column-more" size={16} />
      </header>
      <div className="task-column-list">
        {tasks.length ? tasks.map((task, index) => (
          <KanbanTaskCard index={index} key={task.id} onOpenTask={onOpenTask} task={task} />
        )) : <EmptyState title="暂无任务" description="符合当前筛选条件的任务会出现在这里。" />}
      </div>
    </Surface>
  );
}
