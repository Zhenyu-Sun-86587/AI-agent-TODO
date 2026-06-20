import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CalendarDays, CheckCircle2, Clock3, ListTodo } from "lucide-react";
import { Surface } from "../../../components/ui/primitives";
import { buildDateRange } from "../../../api/mappers";
import { fetchCategoryStats, fetchOverview, fetchPriorityStats, fetchTrendStats } from "../../../api/stats";
import type { ApiCategoryStats, ApiPriorityStats, ApiStatsOverview } from "../../../api/types";
import { dateFromToday } from "../../../lib/date";
import { EmptyState } from "../components/TaskDisplay";
import { StatsCard } from "../components/StatsCard";
import { DistributionBarChart, TrendLineChart } from "../components/StatsCharts";
import {
  buildLocalCategoryStats,
  buildLocalPriorityStats,
  buildLocalTrend,
  getStatsRangeConfig,
  isOverdue,
  priorityLabel,
  type StatsRangeKey,
} from "../stats/taskStats";
import type { Task } from "../types";

export interface StatsPageProps {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  remoteStats: {
    overview: ApiStatsOverview | null;
    categories: ApiCategoryStats[];
    priorities: ApiPriorityStats[];
    trend: Array<{ date: string; created: number; done: number }>;
  };
  taskVersion: number;
  token: string;
  tasks: Task[];
}

export function StatsPage({
  isApiMode,
  onApiError,
  remoteStats,
  taskVersion,
  token,
  tasks,
}: StatsPageProps) {
  const [range, setRange] = useState<StatsRangeKey>("currentWeek");
  const [overview, setOverview] = useState<ApiStatsOverview | null>(remoteStats.overview);
  const [categoryStats, setCategoryStats] = useState<ApiCategoryStats[]>(remoteStats.categories);
  const [priorityStats, setPriorityStats] = useState<ApiPriorityStats[]>(remoteStats.priorities);
  const [trend, setTrend] = useState<Array<{ label: string; created: number; done: number }>>([]);
  const [remoteError, setRemoteError] = useState("");
  const [isRemoteLoading, setRemoteLoading] = useState(false);
  const rangeConfig = useMemo(() => getStatsRangeConfig(range), [range]);
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
      .catch((error) => {
        if (!isCancelled) setRemoteError(onApiError(error));
      })
      .finally(() => {
        if (!isCancelled) setRemoteLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [isApiMode, onApiError, rangeConfig.apiDays, rangeConfig.endDate, rangeConfig.startDate, taskVersion, token]);

  return (
    <main className="page-content stats-page-content">
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
        <Surface><EmptyState title="暂无统计数据" description="创建任务后，这里会显示完成率、分布和趋势。" /></Surface>
      ) : (
        <section className="stats-panels">
          <Surface as="div" className="chart-card">
            <TrendLineChart
              title={rangeConfig.title}
              subtitle={rangeConfig.subtitle}
              trend={visibleTrend}
              selectValue={range}
              onSelectChange={setRange}
            />
          </Surface>
          <div className="stats-distribution-row">
            <DistributionBarChart
              title="分类分布"
              subtitle="不同任务类型的数量占比"
              variant="category"
              items={visibleCategoryStats.slice(0, 4).map((item, index) => ({ label: item.category, value: item.total, accentClass: `bar-cat-${index % 5}` }))}
            />
            <DistributionBarChart
              title="优先级分布"
              subtitle="高、中、低优先级任务数量"
              items={visiblePriorityStats.map((item) => ({ label: priorityLabel(item.priority), value: item.total, accentClass: `bar-${item.priority}` }))}
            />
          </div>
        </section>
      )}
    </main>
  );
}
