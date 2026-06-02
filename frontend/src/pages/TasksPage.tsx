import {
  Bot,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { createTaskByAi, parseTaskText } from "../api/ai";
import { getErrorMessage } from "../api/client";
import { getOverview } from "../api/stats";
import {
  createTask,
  deleteTask,
  listCategories,
  listTasks,
  updateTask,
  updateTaskStatus,
} from "../api/tasks";
import type {
  AiParsedTask,
  CategoryRead,
  Priority,
  StatsOverview,
  Task,
  TaskCreatePayload,
  TaskListParams,
  TaskStatus,
} from "../api/types";
import { EmptyState } from "../components/EmptyState";
import { Modal } from "../components/Modal";
import { TaskCard } from "../components/TaskCard";
import { TaskForm } from "../components/TaskForm";
import {
  formatDateTime,
  fromDateTimeInputValue,
  percent,
  priorityText,
  toDateTimeInputValue,
} from "../utils/format";

const defaultOverview: StatsOverview = {
  total_tasks: 0,
  done_tasks: 0,
  todo_tasks: 0,
  completion_rate: 0,
  overdue_tasks: 0,
  today_due_tasks: 0,
  ai_created_tasks: 0,
};

const defaultFilters: TaskListParams = {
  page: 1,
  page_size: 20,
  status: "",
  priority: "",
  sort_by: "created_at",
  sort_order: "desc",
};

export function TasksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<CategoryRead[]>([]);
  const [overview, setOverview] = useState<StatsOverview>(defaultOverview);
  const [filters, setFilters] = useState<TaskListParams>(() => ({
    ...defaultFilters,
    keyword: searchParams.get("keyword") ?? "",
  }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(searchParams.get("new") === "1");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [aiText, setAiText] = useState("明天下午三点完成软件工程报告，很重要");
  const [aiDraft, setAiDraft] = useState<AiParsedTask | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [taskData, categoryData, overviewData] = await Promise.all([
        listTasks(filters),
        listCategories(),
        getOverview(),
      ]);
      setTasks(taskData.items);
      setCategories(categoryData);
      setOverview(overviewData);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setCreateOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const categoryNames = useMemo(
    () => categories.map((category) => category.name),
    [categories],
  );

  const submitTask = async (payload: TaskCreatePayload) => {
    setSaving(true);
    try {
      await createTask(payload);
      setCreateOpen(false);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async (payload: TaskCreatePayload) => {
    if (!editingTask) {
      return;
    }
    setSaving(true);
    try {
      await updateTask(editingTask.id, payload);
      setEditingTask(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (task: Task) => {
    try {
      await updateTaskStatus(task.id, task.status === "done" ? "todo" : "done");
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (task: Task) => {
    if (!window.confirm(`删除「${task.title}」？`)) {
      return;
    }
    try {
      await deleteTask(task.id);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  const handleParse = async () => {
    if (!aiText.trim()) {
      return;
    }
    setAiLoading(true);
    setError("");
    try {
      setAiDraft(await parseTaskText(aiText.trim()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiCreate = async () => {
    if (!aiDraft) {
      return;
    }
    setAiLoading(true);
    try {
      await createTaskByAi(aiText.trim(), aiDraft);
      setAiDraft(null);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setAiLoading(false);
    }
  };

  const updateAiDraft = <K extends keyof AiParsedTask>(
    field: K,
    value: AiParsedTask[K],
  ) => {
    setAiDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  return (
    <div className="page-grid tasks-page">
      <section className="quick-stats">
        <div className="metric-card glass-panel">
          <span>完成率</span>
          <strong>{percent(overview.completion_rate)}</strong>
          <small>{overview.done_tasks} / {overview.total_tasks}</small>
        </div>
        <div className="metric-card glass-panel">
          <span>今日截止</span>
          <strong>{overview.today_due_tasks}</strong>
          <small>待办 {overview.todo_tasks}</small>
        </div>
        <div className="metric-card glass-panel">
          <span>AI 创建</span>
          <strong>{overview.ai_created_tasks}</strong>
          <small>高效录入</small>
        </div>
      </section>

      <section className="ai-composer glass-panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">AI Agent</span>
            <h2>自然语言创建</h2>
          </div>
          <Bot size={22} />
        </div>
        <textarea
          rows={4}
          value={aiText}
          onChange={(event) => setAiText(event.target.value)}
        />
        <div className="composer-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handleParse}
            disabled={aiLoading}
          >
            {aiLoading ? <Loader2 className="spin" size={17} /> : <Sparkles size={17} />}
            解析
          </button>
          {aiDraft && (
            <button
              className="primary-button"
              type="button"
              onClick={handleAiCreate}
              disabled={aiLoading}
            >
              <CheckCircle2 size={17} />
              确认创建
            </button>
          )}
        </div>

        {aiDraft && (
          <div className="ai-draft">
            <label>
              <span>标题</span>
              <input
                value={aiDraft.title}
                onChange={(event) => updateAiDraft("title", event.target.value)}
              />
            </label>
            <div className="form-grid compact-grid">
              <label>
                <span>优先级</span>
                <select
                  value={aiDraft.priority}
                  onChange={(event) =>
                    updateAiDraft("priority", event.target.value as Priority)
                  }
                >
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </label>
              <label>
                <span>分类</span>
                <input
                  value={aiDraft.category ?? ""}
                  onChange={(event) => updateAiDraft("category", event.target.value)}
                />
              </label>
              <label>
                <span>截止</span>
                <input
                  type="datetime-local"
                  value={toDateTimeInputValue(aiDraft.due_time)}
                  onChange={(event) =>
                    updateAiDraft(
                      "due_time",
                      fromDateTimeInputValue(event.target.value),
                    )
                  }
                />
              </label>
            </div>
            <div className="draft-meta">
              <span>{formatDateTime(aiDraft.due_time)}</span>
              {aiDraft.confidence && <span>置信度 {percent(aiDraft.confidence)}</span>}
            </div>
          </div>
        )}
      </section>

      <section className="task-board glass-panel">
        <div className="board-toolbar">
          <div className="search-box">
            <Search size={18} />
            <input
              value={filters.keyword ?? ""}
              placeholder="搜索任务、分类或描述"
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  keyword: event.target.value,
                  page: 1,
                }))
              }
            />
          </div>

          <div className="toolbar-controls">
            <div className="segmented-control compact-control" aria-label="任务状态">
              {(["", "todo", "done"] as Array<TaskStatus | "">).map((status) => (
                <button
                  key={status || "all"}
                  type="button"
                  className={filters.status === status ? "active" : ""}
                  onClick={() =>
                    setFilters((current) => ({ ...current, status, page: 1 }))
                  }
                >
                  {status === "" ? "全部" : status === "todo" ? "待办" : "完成"}
                </button>
              ))}
            </div>
            <select
              aria-label="优先级筛选"
              value={filters.priority}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  priority: event.target.value as Priority | "",
                  page: 1,
                }))
              }
            >
              <option value="">全部优先级</option>
              <option value="high">高优先级</option>
              <option value="medium">中优先级</option>
              <option value="low">低优先级</option>
            </select>
            <select
              aria-label="分类筛选"
              value={filters.category ?? ""}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  category: event.target.value,
                  page: 1,
                }))
              }
            >
              <option value="">全部分类</option>
              {categoryNames.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <button
              className="icon-button"
              type="button"
              title="按截止时间排序"
              aria-label="按截止时间排序"
              onClick={() =>
                setFilters((current) => ({
                  ...current,
                  sort_by: current.sort_by === "due_time" ? "created_at" : "due_time",
                  sort_order: "asc",
                }))
              }
            >
              <SlidersHorizontal size={18} />
            </button>
            <button
              className="primary-button compact"
              type="button"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={18} />
              新建
            </button>
          </div>
        </div>

        {error && <p className="form-error inline-error">{error}</p>}

        {loading ? (
          <div className="loading-line">
            <Loader2 className="spin" size={20} />
            载入任务
          </div>
        ) : tasks.length ? (
          <div className="task-list">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onToggle={handleToggle}
                onEdit={setEditingTask}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="没有符合条件的任务"
            action={
              <button
                className="primary-button compact"
                type="button"
                onClick={() => setCreateOpen(true)}
              >
                <Plus size={17} />
                创建任务
              </button>
            }
          />
        )}
      </section>

      <Modal title="创建任务" open={createOpen} onClose={() => setCreateOpen(false)}>
        <TaskForm
          submitting={saving}
          onSubmit={submitTask}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>

      <Modal title="编辑任务" open={Boolean(editingTask)} onClose={() => setEditingTask(null)}>
        <TaskForm
          initial={editingTask}
          submitting={saving}
          onSubmit={submitEdit}
          onCancel={() => setEditingTask(null)}
        />
      </Modal>
    </div>
  );
}
