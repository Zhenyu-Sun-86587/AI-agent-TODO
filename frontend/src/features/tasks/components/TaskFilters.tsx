import { Search } from "lucide-react";
import type { TaskPriority, TaskStatus } from "../types";

const priorityOptions: TaskPriority[] = ["高", "中", "低"];

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
  onPriorityChange: (value: TaskPriority | "全部") => void;
  onQueryChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onStatusChange: (value: TaskStatus | "全部") => void;
  priority: TaskPriority | "全部";
  query: string;
  sort: string;
  status: TaskStatus | "全部";
  statusOptions: TaskStatus[];
}) {
  return (
    <section className="filter-bar">
      <label className="filter-search">
        <Search size={17} />
        <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索任务..." />
      </label>
      <select value={status} onChange={(event) => onStatusChange(event.target.value as TaskStatus | "全部")}>
        <option value="全部">全部状态</option>
        {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={priority} onChange={(event) => onPriorityChange(event.target.value as TaskPriority | "全部")}>
        <option value="全部">全部优先级</option>
        {priorityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
        <option value="全部">全部分类</option>
        {categories.map((item) => <option key={item} value={item}>{item}</option>)}
      </select>
      <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
        <option value="dueDate">按截止时间排序</option>
        <option value="priority">按优先级排序</option>
        <option value="createdAt">按创建时间排序</option>
      </select>
    </section>
  );
}
