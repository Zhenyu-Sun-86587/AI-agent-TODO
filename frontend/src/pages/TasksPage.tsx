import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, ListTodo, Sparkles } from "lucide-react";
import { buildDateRange, buildTaskListPath, mapApiTask } from "../api/mappers";
import { fetchCategoryStats, fetchOverview, fetchPriorityStats, fetchTrendStats } from "../api/stats";
import { fetchTasksPage } from "../api/tasks";
import type { ApiCategoryStats, ApiPriority, ApiPriorityStats, ApiStatsOverview } from "../api/types";
import { TaskBoard } from "../features/tasks/components/TaskBoard";
import { EmptyState } from "../features/tasks/components/TaskDisplay";
import { FilterBar, TaskTable } from "../features/tasks/components/TaskList";
import { dateFromToday, formatLocalDate, getMonthEnd, getMonthStart, getWeekStart } from "../lib/date";
import type { Task, TaskPriority, TaskStatus } from "../features/tasks/types";

const statusOptions: TaskStatus[] = ["待办", "进行中", "已完成"];
const apiStatusOptions: TaskStatus[] = ["待办", "已完成"];
const priorityOptions: TaskPriority[] = ["高", "中", "低"];

export interface TasksPageProps {
  categories: string[];
  globalSearch: string;
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onCreateTask: () => void;
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: number, status: TaskStatus) => void | Promise<void>;
  onToggleComplete: (taskId: number) => void;
  remoteStats: { overview: ApiStatsOverview | null; categories: ApiCategoryStats[]; priorities: ApiPriorityStats[]; trend: Array<{ date: string; created: number; done: number }> };
  taskVersion: number;
  token: string;
  tasks: Task[];
}

export default function TasksPage(props: TasksPageProps) {
  const [activeTab, setActiveTab] = useState<"all" | "today" | "board" | "stats">("all");
  return (
    <div className="unified-tasks-page fade-in-up">
      <div className="unified-tabs">
        <button className={activeTab === "all" ? "active" : ""} type="button" onClick={() => setActiveTab("all")}>全部任务</button>
        <button className={activeTab === "today" ? "active" : ""} type="button" onClick={() => setActiveTab("today")}>今日任务</button>
        <button className={activeTab === "board" ? "active" : ""} type="button" onClick={() => setActiveTab("board")}>任务看板</button>
        <button className={activeTab === "stats" ? "active" : ""} type="button" onClick={() => setActiveTab("stats")}>数据统计</button>
      </div>
      <div className="unified-content">
        {activeTab === "all" && (
          <AllTasksPage
            categories={props.categories}
            globalSearch={props.globalSearch}
            isApiMode={props.isApiMode}
            onApiError={props.onApiError}
            onDelete={props.onDelete}
            onEditTask={props.onEditTask}
            onOpenTask={props.onOpenTask}
            onUpdateTaskStatus={props.onUpdateTaskStatus}
            onToggleComplete={props.onToggleComplete}
            taskVersion={props.taskVersion}
            token={props.token}
            tasks={props.tasks}
          />
        )}
        {activeTab === "today" && (
          <TodayTasksPage
            onDelete={props.onDelete}
            onEditTask={props.onEditTask}
            onOpenTask={props.onOpenTask}
            onUpdateTaskStatus={props.onUpdateTaskStatus}
            onToggleComplete={props.onToggleComplete}
            tasks={props.tasks}
          />
        )}
        {activeTab === "board" && (
          <TaskBoard
            categories={props.categories}
            isApiMode={props.isApiMode}
            onCreateTask={props.onCreateTask}
            onOpenTask={props.onOpenTask}
            tasks={props.tasks}
          />
        )}
        {activeTab === "stats" && (
          <StatsPage
            isApiMode={props.isApiMode}
            onApiError={props.onApiError}
            remoteStats={props.remoteStats}
            taskVersion={props.taskVersion}
            tasks={props.tasks}
            token={props.token}
          />
        )}
      </div>
    </div>
  );
}

function TodayTasksPage({
  onDelete,
  onEditTask,
  onOpenTask,
  onUpdateTaskStatus,
  onToggleComplete,
  tasks,
}: {
  onDelete: (taskId: number) => void;
  onEditTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
  onUpdateTaskStatus: (taskId: number, status: TaskStatus) => void | Promise<void>;
  onToggleComplete: (taskId: number) => void;
  tasks: Task[];
}) {
  const todayTasks = tasks.filter((task) => task.dueDate && task.dueDate === dateFromToday(0)).sort((left, right) => (left.dueTime || "23:59").localeCompare(right.dueTime || "23:59"));
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

function StatsCard({
  icon: Icon,
  index = 0,
  label,
  tone,
  value,
}: {
  icon: any;
  index?: number;
  label: string;
  tone: "blue" | "green" | "red" | "purple";
  value: number | string;
}) {
  return (
    <article className={`stats-card ${tone}`} style={{ "--stagger-index": index } as CSSProperties}>
      <span><Icon size={20} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function createLinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function createAreaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  if (!points.length) return "";
  const line = createLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

function createSmoothTicks(maxValue: number, segments = 5) {
  const safeMax = Math.max(1, maxValue);
  const roughStep = safeMax / segments;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / magnitude;
  const step = normalized <= 1 ? magnitude : normalized <= 2 ? 2 * magnitude : normalized <= 5 ? 5 * magnitude : 10 * magnitude;
  const top = Math.max(step, Math.ceil(safeMax / step) * step);
  return Array.from({ length: segments + 1 }, (_, index) => top - index * step);
}

type StatsRangeKey = "currentWeek" | "lastWeek" | "currentMonth" | "lastMonth";

function getStatsRangeConfig(range: StatsRangeKey) {
  const today = new Date();
  if (range === "currentWeek" || range === "lastWeek") {
    const weekStart = getWeekStart(today);
    const start = new Date(weekStart);
    start.setDate(start.getDate() + (range === "lastWeek" ? -7 : 0));
    const labels = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
    const days = labels.map((label, index) => ({ key: formatLocalDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)), label }));
    return {
      title: range === "lastWeek" ? "上周任务趋势" : "本周任务趋势",
      subtitle: range === "lastWeek" ? "按周一到周日查看上周任务变化" : "按周一到周日查看本周任务变化",
      apiDays: 7,
      startDate: days[0].key,
      endDate: days[days.length - 1].key,
      buckets: days,
    };
  }
  if (range === "currentMonth") {
    const monthStart = getMonthStart(today);
    const totalDays = today.getDate();
    const startDate = formatLocalDate(monthStart);
    const endDate = formatLocalDate(today);
    return {
      title: "本月任务趋势",
      subtitle: "按日期查看本月至今的任务变化",
      apiDays: totalDays,
      startDate,
      endDate,
      buckets: Array.from({ length: totalDays }, (_, index) => ({ key: formatLocalDate(new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() + index)), label: `${index + 1}日` })),
    };
  }
  const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const start = getMonthStart(lastMonthDate);
  const end = getMonthEnd(lastMonthDate);
  const totalDays = end.getDate();
  return {
    title: "上月任务趋势",
    subtitle: "按日期查看上月每日任务变化",
    apiDays: totalDays,
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    buckets: Array.from({ length: totalDays }, (_, index) => ({ key: formatLocalDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index)), label: `${index + 1}日` })),
  };
}

function isDateInRange(date: string, startDate: string, endDate: string) {
  return Boolean(date) && date >= startDate && date <= endDate;
}

function isOverdue(task: Task) {
  return task.status !== "已完成" && Boolean(task.dueDate) && task.dueDate < dateFromToday(0);
}

function buildLocalTrend(tasks: Task[], buckets: Array<{ key: string; label: string }>) {
  return buckets.map((bucket) => ({
    label: bucket.label,
    created: tasks.filter((task) => task.createdAt === bucket.key).length,
    done: tasks.filter((task) => task.completedAt === bucket.key || (task.status === "已完成" && task.dueDate === bucket.key)).length,
  }));
}

function buildLocalCategoryStats(tasks: Task[], startDate: string, endDate: string): ApiCategoryStats[] {
  const relevantTasks = tasks.filter((task) => !task.dueDate || isDateInRange(task.dueDate, startDate, endDate));
  const categoryMap = new Map<string, { done: number; todo: number; total: number }>();
  relevantTasks.forEach((task) => {
    const category = task.category || "未分类";
    const current = categoryMap.get(category) || { done: 0, todo: 0, total: 0 };
    current.total += 1;
    if (task.status === "已完成") {
      current.done += 1;
    } else {
      current.todo += 1;
    }
    categoryMap.set(category, current);
  });

  return Array.from(categoryMap.entries())
    .map(([category, stats]) => ({
      category,
      done: stats.done,
      todo: stats.todo,
      total: stats.total,
      completion_rate: stats.total ? stats.done / stats.total : 0,
    }))
    .sort((left, right) => right.total - left.total);
}

function buildLocalPriorityStats(tasks: Task[], startDate: string, endDate: string): ApiPriorityStats[] {
  const relevantTasks = tasks.filter((task) => !task.dueDate || isDateInRange(task.dueDate, startDate, endDate));
  return priorityOptions.map((priority) => {
    const priorityTasks = relevantTasks.filter((task) => task.priority === priority);
    const apiPriority: ApiPriority = priority === "高" ? "high" : priority === "低" ? "low" : "medium";
    return {
      priority: apiPriority,
      done: priorityTasks.filter((task) => task.status === "已完成").length,
      todo: priorityTasks.filter((task) => task.status !== "已完成").length,
      total: priorityTasks.length,
    };
  }).filter((item) => item.total > 0);
}

function priorityLabel(priority: ApiPriorityStats["priority"]) {
  return priority === "high" ? "高" : priority === "low" ? "低" : "中";
}

function TrendLineChart({
  title,
  subtitle,
  trend,
  selectValue,
  onSelectChange,
}: {
  title: string;
  subtitle: string;
  trend: Array<{ label: string; created: number; done: number }>;
  selectValue: StatsRangeKey;
  onSelectChange: (value: StatsRangeKey) => void;
}) {
  const width = 960;
  const height = 282;
  const padding = { top: 14, right: 18, bottom: 44, left: 38 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;
  const ticks = createSmoothTicks(Math.max(1, ...trend.map((item) => Math.max(item.created, item.done))));
  const maxValue = ticks[0] || 1;
  const xStep = trend.length > 1 ? chartWidth / (trend.length - 1) : chartWidth;
  const createdPoints = trend.map((item, index) => ({ x: padding.left + index * xStep, y: padding.top + (1 - item.created / maxValue) * chartHeight }));
  const donePoints = trend.map((item, index) => ({ x: padding.left + index * xStep, y: padding.top + (1 - item.done / maxValue) * chartHeight }));
  const baseline = padding.top + chartHeight;
  return (
    <div className="trend-chart-shell">
      <div className="trend-chart-header">
        <div className="trend-chart-copy">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <label className="trend-range-select">
          <select value={selectValue} onChange={(event) => onSelectChange(event.target.value as StatsRangeKey)} aria-label="选择统计周期">
            <option value="currentWeek">本周</option>
            <option value="lastWeek">上周</option>
            <option value="currentMonth">本月</option>
            <option value="lastMonth">上月</option>
          </select>
        </label>
      </div>
      <svg className="trend-chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={title}>
        <defs>
          <linearGradient id="trendCreatedFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(115, 154, 255, 0.42)" />
            <stop offset="100%" stopColor="rgba(115, 154, 255, 0.02)" />
          </linearGradient>
          <linearGradient id="trendDoneFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(92, 211, 160, 0.32)" />
            <stop offset="100%" stopColor="rgba(92, 211, 160, 0.02)" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => {
          const y = padding.top + (1 - tick / maxValue) * chartHeight;
          return (
            <g key={tick}>
              <line className="chart-grid-line" x1={padding.left} x2={width - padding.right} y1={y} y2={y} />
              <text className="chart-axis-label" x={padding.left - 10} y={y + 4} textAnchor="end">{tick}</text>
            </g>
          );
        })}
        <path d={createAreaPath(createdPoints, baseline)} fill="url(#trendCreatedFill)" />
        <path d={createAreaPath(donePoints, baseline)} fill="url(#trendDoneFill)" />
        <path className="chart-line line-created" d={createLinePath(createdPoints)} />
        <path className="chart-line line-done" d={createLinePath(donePoints)} />
        {createdPoints.map((point, index) => (
          <g key={trend[index].label}>
            <circle className="chart-point point-created" cx={point.x} cy={point.y} r="4.5" />
            <circle className="chart-point point-done" cx={donePoints[index].x} cy={donePoints[index].y} r="4.5" />
            <text className="chart-axis-label" x={point.x} y={height - 22} textAnchor="middle">{trend[index].label}</text>
          </g>
        ))}
      </svg>
      <div className="chart-legend">
        <span><i className="legend-dot created" />新增任务</span>
        <span><i className="legend-dot done" />完成任务</span>
      </div>
    </div>
  );
}

function DistributionBarChart({
  title,
  subtitle,
  items,
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; accentClass?: string }>;
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  const ticks = createSmoothTicks(maxValue, 4);
  return (
    <div className="content-card distribution-card">
      <div className="section-title stats-section-title">
        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>
      <div className="distribution-chart">
        <div className="distribution-grid">
          {ticks.slice(1).map((tick) => (
            <span key={tick} className="distribution-grid-line" style={{ left: `${(tick / ticks[0]) * 100}%` }} />
          ))}
        </div>
        {items.map((item) => (
          <div className="distribution-row" key={item.label}>
            <span className="distribution-label">{item.label}</span>
            <div className="distribution-bar-shell">
              <i className={`distribution-bar ${item.accentClass || ""}`} style={{ width: `${Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0)}%` }} />
            </div>
            <strong className="distribution-value">{item.value}</strong>
          </div>
        ))}
        <div className="distribution-axis">
          <span />
          <div className="distribution-axis-track">
            {ticks.slice().reverse().map((tick) => <span key={tick}>{tick}</span>)}
          </div>
          <span />
        </div>
      </div>
    </div>
  );
}

function AllTasksPage({
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
}: {
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
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TaskStatus | "全部">("全部");
  const [priority, setPriority] = useState<TaskPriority | "全部">("全部");
  const [category, setCategory] = useState("全部");
  const [sort, setSort] = useState("dueDate");
  const [page, setPage] = useState(1);
  const [remoteTasks, setRemoteTasks] = useState<Task[]>([]);
  const [remoteTotal, setRemoteTotal] = useState(0);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const pageSize = 6;
  const statusChoices = isApiMode ? apiStatusOptions : statusOptions;

  useEffect(() => setPage(1), [globalSearch]);
  useEffect(() => { if (isApiMode && status === "进行中") { setStatus("全部"); setPage(1); } }, [isApiMode, status]);
  useEffect(() => {
    if (!isApiMode || !token) return;
    let isCancelled = false;
    const keyword = `${globalSearch} ${query}`.trim();
    const remoteStatus = isApiMode && status === "进行中" ? "全部" : status;
    setRemoteLoading(true);
    setRemoteError("");
    void fetchTasksPage(buildTaskListPath({ category, keyword, page, pageSize, priority, sort, status: remoteStatus }), token)
      .then((data) => { if (!isCancelled) { setRemoteTasks(data.items.map((item) => mapApiTask(item))); setRemoteTotal(data.pagination.total); } })
      .catch((error) => { if (!isCancelled) { setRemoteError(onApiError(error)); } })
      .finally(() => { if (!isCancelled) setRemoteLoading(false); });
    return () => { isCancelled = true; };
  }, [category, globalSearch, isApiMode, page, priority, query, sort, status, taskVersion, token, onApiError]);

  const filteredTasks = useMemo(() => {
    const keyword = `${globalSearch} ${query}`.trim().toLowerCase();
    return tasks.filter((task) => {
      const matchesKeyword = !keyword || [task.title, task.description, task.category, task.tags.join(" ")].some((field) => field.toLowerCase().includes(keyword));
      const matchesStatus = status === "全部" || task.status === status;
      const matchesPriority = priority === "全部" || task.priority === priority;
      const matchesCategory = category === "全部" || task.category === category;
      return matchesKeyword && matchesStatus && matchesPriority && matchesCategory;
    }).sort((left, right) => {
      if (sort === "priority") {
        const rank: Record<TaskPriority, number> = { 高: 3, 中: 2, 低: 1 };
        return rank[right.priority] - rank[left.priority];
      }
      if (sort === "createdAt") return right.createdAt.localeCompare(left.createdAt);
      return (left.dueDate || "9999-12-31").localeCompare(right.dueDate || "9999-12-31");
    });
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
          onSortChange={(value) => { setSort(value); setPage(1); }}
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

function StatsPage({
  isApiMode,
  onApiError,
  remoteStats,
  taskVersion,
  token,
  tasks,
}: {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  remoteStats: { overview: ApiStatsOverview | null; categories: ApiCategoryStats[]; priorities: ApiPriorityStats[]; trend: Array<{ date: string; created: number; done: number }> };
  taskVersion: number;
  token: string;
  tasks: Task[];
}) {
  const [range, setRange] = useState<StatsRangeKey>("currentWeek");
  const [overview, setOverview] = useState<ApiStatsOverview | null>(remoteStats.overview);
  const [categoryStats, setCategoryStats] = useState<ApiCategoryStats[]>(remoteStats.categories);
  const [priorityStats, setPriorityStats] = useState<ApiPriorityStats[]>(remoteStats.priorities);
  const [trend, setTrend] = useState<Array<{ label: string; created: number; done: number }>>([]);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const rangeConfig = getStatsRangeConfig(range);
  const localTrend = useMemo(() => buildLocalTrend(tasks, rangeConfig.buckets), [rangeConfig.buckets, tasks]);
  const localCategoryStats = useMemo(
    () => buildLocalCategoryStats(tasks, rangeConfig.startDate, rangeConfig.endDate),
    [rangeConfig.endDate, rangeConfig.startDate, tasks],
  );
  const localPriorityStats = useMemo(
    () => buildLocalPriorityStats(tasks, rangeConfig.startDate, rangeConfig.endDate),
    [rangeConfig.endDate, rangeConfig.startDate, tasks],
  );
  const visibleTrend = isApiMode ? trend : localTrend;
  const visibleCategoryStats = isApiMode ? categoryStats : localCategoryStats;
  const visiblePriorityStats = isApiMode ? priorityStats : localPriorityStats;
  const totalTasks = overview?.total_tasks || tasks.length;
  const done = overview?.done_tasks || tasks.filter((task) => task.status === "已完成").length;
  const todo = overview?.todo_tasks || tasks.filter((task) => task.status !== "已完成").length;
  const overdueTotal = overview?.overdue_tasks || tasks.filter(isOverdue).length;
  const todayDue = overview?.today_due_tasks || tasks.filter((task) => task.dueDate === dateFromToday(0)).length;

  useEffect(() => {
    if (!isApiMode || !token) {
      setOverview(null);
      setTrend([]);
      setCategoryStats([]);
      setPriorityStats([]);
      return;
    }
    let isCancelled = false;
    const rangeQuery = new URLSearchParams(buildDateRange(rangeConfig.startDate, rangeConfig.endDate)).toString();
    setRemoteLoading(true);
    setRemoteError("");
    void Promise.all([
      fetchOverview(token, rangeQuery),
      fetchCategoryStats(token, rangeQuery),
      fetchPriorityStats(token, rangeQuery),
      fetchTrendStats(token, rangeConfig.apiDays),
    ])
      .then(([nextOverview, categories, priorities, nextTrend]) => {
        if (isCancelled) return;
        setOverview(nextOverview);
        setCategoryStats(categories);
        setPriorityStats(priorities);
        setTrend(nextTrend.map((item) => ({ label: item.date, created: item.created, done: item.done })));
      })
      .catch((error) => { if (!isCancelled) setRemoteError(onApiError(error)); })
      .finally(() => { if (!isCancelled) setRemoteLoading(false); });
    return () => { isCancelled = true; };
  }, [isApiMode, onApiError, range, rangeConfig.apiDays, rangeConfig.endDate, rangeConfig.startDate, taskVersion, token]);

  return (
    <main className="page-content">
      {isRemoteLoading && <p className="table-state">正在同步统计范围...</p>}
      {remoteError && <p className="form-error">{remoteError}</p>}
      <section className="stats-grid stats-grid-wide">
        <StatsCard icon={ListTodo} label="任务总数" value={totalTasks} tone="blue" />
        <StatsCard icon={CheckCircle2} label="已完成" value={done} tone="green" />
        <StatsCard icon={Clock3} label="待处理" value={todo} tone="purple" />
        <StatsCard icon={AlertCircle} label="逾期任务" value={overdueTotal} tone="red" />
        <StatsCard icon={CalendarDays} label="今日截止" value={todayDue} tone="blue" />
      </section>
      {!totalTasks ? (
        <section className="content-card"><EmptyState title="暂无统计数据" description="创建任务后，这里会显示完成率、分布和趋势。" /></section>
      ) : (
        <section className="stats-panels">
          <div className="content-card chart-card"><TrendLineChart title={rangeConfig.title} subtitle={rangeConfig.subtitle} trend={visibleTrend} selectValue={range} onSelectChange={setRange} /></div>
          <div className="stats-distribution-row">
            <DistributionBarChart title="分类分布" subtitle="不同任务类型的数量占比" items={visibleCategoryStats.map((item, index) => ({ label: item.category, value: item.total, accentClass: `bar-cat-${index % 5}` }))} />
            <DistributionBarChart title="优先级分布" subtitle="高、中、低优先级任务数量" items={visiblePriorityStats.map((item) => ({ label: priorityLabel(item.priority), value: item.total, accentClass: `bar-${item.priority}` }))} />
          </div>
        </section>
      )}
    </main>
  );
}
