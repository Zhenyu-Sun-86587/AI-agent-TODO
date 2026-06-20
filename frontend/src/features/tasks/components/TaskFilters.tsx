import { SearchField, SelectField as UiSelectField } from "../../../components/ui/primitives";
import {
  TASK_FILTER_ALL,
  TASK_PRIORITY_OPTIONS,
  isTaskPriorityFilter,
  isTaskStatusFilter,
  type TaskPriorityFilter,
  type TaskStatusFilter,
} from "../constants";
import type { TaskStatus } from "../types";

export const SelectField = UiSelectField;

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
      <SearchField value={query} onChange={onQueryChange} placeholder="搜索任务..." />
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
