import { ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import {
  TASK_FILTER_ALL,
  TASK_PRIORITY_OPTIONS,
  isTaskPriorityFilter,
  isTaskStatusFilter,
  type TaskPriorityFilter,
  type TaskStatusFilter,
} from "../constants";
import type { TaskStatus } from "../types";

export function SelectField({
  children,
  value,
  onChange,
}: {
  children: ReactNode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="filter-select">
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" size={18} />
    </label>
  );
}

export function FilterBar({
  categories,
  category,
  onCategoryChange,
  onPriorityChange,
  onQueryChange,
  onSortChange,
  onStatusChange,
  priority,
  query,
  sort,
  status,
  statusOptions,
}: {
  categories: string[];
  category: string;
  onCategoryChange: (value: string) => void;
  onPriorityChange: (value: TaskPriorityFilter) => void;
  onQueryChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onStatusChange: (value: TaskStatusFilter) => void;
  priority: TaskPriorityFilter;
  query: string;
  sort: string;
  status: TaskStatusFilter;
  statusOptions: readonly TaskStatus[];
}) {
  return (
    <section className="filter-bar">
      <label className="filter-search">
        <Search size={17} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索任务..." />
      </label>
      <SelectField value={status} onChange={(value) => { if (isTaskStatusFilter(value)) onStatusChange(value); }}>
        <option value={TASK_FILTER_ALL}>全部状态</option>
        {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
      </SelectField>
      <SelectField value={priority} onChange={(value) => { if (isTaskPriorityFilter(value)) onPriorityChange(value); }}>
        <option value={TASK_FILTER_ALL}>全部优先级</option>
        {TASK_PRIORITY_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
      </SelectField>
      <SelectField value={category} onChange={onCategoryChange}>
        <option value={TASK_FILTER_ALL}>全部分类</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </SelectField>
      <SelectField value={sort} onChange={onSortChange}>
        <option value="dueDate">按截止时间排序</option>
        <option value="priority">按优先级排序</option>
        <option value="createdAt">按创建时间排序</option>
      </SelectField>
    </section>
  );
}
