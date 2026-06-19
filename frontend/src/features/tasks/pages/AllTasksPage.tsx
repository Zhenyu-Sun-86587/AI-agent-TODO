import { useEffect, useMemo, useState } from "react";
import { mapApiTask } from "../../../api/mappers";
import { fetchTasksPage } from "../../../api/tasks";
import { priorityToApiCode, statusToApiCode } from "../../../lib/taskPresentation";
import {
  API_TASK_STATUS_OPTIONS,
  TASK_FILTER_ALL,
  TASK_STATUS_OPTIONS,
  type TaskPriorityFilter,
  type TaskStatusFilter,
} from "../constants";
import { FilterBar, TaskTable } from "../components/TaskList";
import type { Task, TaskStatus } from "../types";
import { filterAndSortTasks, normalizeTaskSortKey, type TaskSortKey } from "../utils/taskQuery";

export interface AllTasksPageProps {
  categories: string[];
  globalSearch: string;
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: number, status: TaskStatus) => void | Promise<void>;
  onToggleComplete: (taskId: number) => void;
  taskVersion: number;
  token: string;
  tasks: Task[];
}

export function AllTasksPage({
  categories,
  globalSearch,
  isApiMode,
  onApiError,
  onDelete,
  onEditTask,
  onOpenTask,
  onUpdateTaskStatus,
  onToggleComplete,
  taskVersion,
  token,
  tasks,
}: AllTasksPageProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatusFilter>(TASK_FILTER_ALL);
  const [priority, setPriority] = useState<TaskPriorityFilter>(TASK_FILTER_ALL);
  const [category, setCategory] = useState(TASK_FILTER_ALL);
  const [sort, setSort] = useState<TaskSortKey>("dueDate");
  const [page, setPage] = useState(1);
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([]);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const pageSize = 6;
  const statusChoices = isApiMode ? API_TASK_STATUS_OPTIONS : TASK_STATUS_OPTIONS;

  useEffect(() => setPage(1), [globalSearch]);

  useEffect(() => {
    if (isApiMode && status === "进行中") {
      setStatus(TASK_FILTER_ALL);
      setPage(1);
    }
  }, [isApiMode, status]);

  useEffect(() => {
    if (!isApiMode || !token) return;

    let isCancelled = false;
    const keyword = `${globalSearch} ${query}`.trim();
    const remoteStatus = isApiMode && status === "进行中" ? TASK_FILTER_ALL : status;
    setRemoteLoading(true);
    setRemoteError("");
    void fetchTasksPage({
      category: category === TASK_FILTER_ALL ? undefined : category,
      keyword: keyword || undefined,
      page,
      pageSize,
      priority: priority === TASK_FILTER_ALL ? undefined : priorityToApiCode(priority),
      sortBy: sort === "priority" ? "priority" : sort === "createdAt" ? "created_at" : "due_time",
      sortOrder: sort === "dueDate" ? "asc" : "desc",
      status: remoteStatus === TASK_FILTER_ALL ? undefined : statusToApiCode(remoteStatus),
    }, token)
      .then((data) => {
        if (!isCancelled) {
          setRemoteTasks(data.items.map((item) => mapApiTask(item)));
          setRemoteTotal(data.pagination.total);
        }
      })
      .catch((error) => {
        if (!isCancelled) {
          setRemoteError(onApiError(error));
        }
      })
      .finally(() => {
        if (!isCancelled) setRemoteLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [category, globalSearch, isApiMode, page, priority, query, sort, status, taskVersion, token, onApiError]);

  const filteredTasks = useMemo(() => {
    return filterAndSortTasks(tasks, { category, globalSearch, priority, query, status }, sort);
  }, [category, globalSearch, priority, query, sort, status, tasks]);

  const localPageCount = Math.max(1, Math.ceil(filteredTasks.length / pageSize));
  const remotePageCount = Math.max(1, Math.ceil(remoteTotal / pageSize));
  const pageCount = isApiMode ? remotePageCount : localPageCount;
  const currentPage = Math.min(page, pageCount);
  const visibleTasks = isApiMode ? remoteTasks : filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const totalTasks = isApiMode ? remoteTotal : filteredTasks.length;

  return (
    <main className="page-content">
      <div className="content-card table-card">
        <FilterBar
          categories={categories}
          category={category}
          onCategoryChange={(value) => { setCategory(value); setPage(1); }}
          onPriorityChange={(value) => { setPriority(value); setPage(1); }}
          onQueryChange={(value) => { setQuery(value); setPage(1); }}
          onSortChange={(value) => { setSort(normalizeTaskSortKey(value)); setPage(1); }}
          onStatusChange={(value) => { setStatus(value); setPage(1); }}
          priority={priority}
          query={query}
          sort={sort}
          status={status}
          statusOptions={statusChoices}
        />
        {isRemoteLoading && <p className="api-message">正在从后端加载任务...</p>}
        {remoteError && <p className="form-error">{remoteError}</p>}
        <TaskTable
          onDelete={onDelete}
          onEditTask={onEditTask}
          onOpenTask={onOpenTask}
          onUpdateTaskStatus={onUpdateTaskStatus}
          onToggleComplete={onToggleComplete}
          tasks={visibleTasks}
        />
        <footer className="table-footer">
          <span>共 {totalTasks} 条，第 {currentPage} / {pageCount} 页</span>
          <div>
            <button disabled={currentPage <= 1} type="button" onClick={() => setPage(currentPage - 1)}>上一页</button>
            <button disabled={currentPage >= pageCount} type="button" onClick={() => setPage(currentPage + 1)}>下一页</button>
          </div>
        </footer>
      </div>
    </main>
  );
}
