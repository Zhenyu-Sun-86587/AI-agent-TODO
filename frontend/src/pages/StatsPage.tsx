import { BarChart3, CalendarDays, CircleGauge, Loader2, Target } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { getErrorMessage } from "../api/client";
import {
  getCategoryStats,
  getOverview,
  getPriorityStats,
  getTrendStats,
} from "../api/stats";
import type {
  CategoryStats,
  Priority,
  PriorityStats,
  StatsOverview,
  TrendStats,
} from "../api/types";
import { formatDate, percent, priorityText } from "../utils/format";

const priorityOrder: Priority[] = ["high", "medium", "low"];

export function StatsPage() {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [categoryStats, setCategoryStats] = useState<CategoryStats[]>([]);
  const [priorityStats, setPriorityStats] = useState<PriorityStats[]>([]);
  const [trendStats, setTrendStats] = useState<TrendStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      getOverview(),
      getCategoryStats(),
      getPriorityStats(),
      getTrendStats(7),
    ])
      .then(([nextOverview, nextCategory, nextPriority, nextTrend]) => {
        if (!alive) {
          return;
        }
        setOverview(nextOverview);
        setCategoryStats(nextCategory);
        setPriorityStats(nextPriority);
        setTrendStats(nextTrend);
      })
      .catch((err) => {
        if (alive) {
          setError(getErrorMessage(err));
        }
      })
      .finally(() => {
        if (alive) {
          setLoading(false);
        }
      });

    return () => {
      alive = false;
    };
  }, []);

  const maxTrend = useMemo(
    () =>
      Math.max(
        1,
        ...trendStats.flatMap((item) => [item.created, item.done]),
      ),
    [trendStats],
  );

  if (loading) {
    return (
      <div className="page-grid centered-page">
        <div className="loading-line glass-panel">
          <Loader2 className="spin" size={20} />
          载入统计
        </div>
      </div>
    );
  }

  return (
    <div className="page-grid stats-page">
      {error && <p className="form-error inline-error">{error}</p>}

      <section className="quick-stats wide">
        <div className="metric-card glass-panel">
          <CircleGauge size={22} />
          <span>完成率</span>
          <strong>{percent(overview?.completion_rate ?? 0)}</strong>
        </div>
        <div className="metric-card glass-panel">
          <Target size={22} />
          <span>待办任务</span>
          <strong>{overview?.todo_tasks ?? 0}</strong>
        </div>
        <div className="metric-card glass-panel">
          <CalendarDays size={22} />
          <span>今日截止</span>
          <strong>{overview?.today_due_tasks ?? 0}</strong>
        </div>
        <div className="metric-card glass-panel">
          <BarChart3 size={22} />
          <span>逾期任务</span>
          <strong>{overview?.overdue_tasks ?? 0}</strong>
        </div>
      </section>

      <section className="analytics-grid">
        <div className="analytics-panel glass-panel">
          <div className="panel-title-row">
            <div>
              <span className="eyebrow">Category</span>
              <h2>分类完成度</h2>
            </div>
          </div>
          <div className="bar-list">
            {categoryStats.map((item) => (
              <div className="bar-row" key={item.category}>
                <div className="bar-label">
                  <span>{item.category}</span>
                  <strong>{item.done}/{item.total}</strong>
                </div>
                <div className="bar-track">
                  <span style={{ width: percent(item.completion_rate) }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-panel glass-panel">
          <div className="panel-title-row">
            <div>
              <span className="eyebrow">Priority</span>
              <h2>优先级分布</h2>
            </div>
          </div>
          <div className="priority-stack">
            {priorityOrder.map((priority) => {
              const item = priorityStats.find((entry) => entry.priority === priority);
              const total = item?.total ?? 0;
              const allTotal = Math.max(
                1,
                priorityStats.reduce((sum, entry) => sum + entry.total, 0),
              );
              return (
                <div className={`priority-row priority-${priority}`} key={priority}>
                  <span>{priorityText[priority]}</span>
                  <div className="bar-track">
                    <span style={{ width: `${Math.round((total / allTotal) * 100)}%` }} />
                  </div>
                  <strong>{total}</strong>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="trend-panel glass-panel">
        <div className="panel-title-row">
          <div>
            <span className="eyebrow">Trend</span>
            <h2>近 7 日趋势</h2>
          </div>
        </div>
        <div className="trend-chart">
          {trendStats.map((item) => (
            <div className="trend-column" key={item.date}>
              <div className="trend-bars">
                <span
                  className="created"
                  style={{ height: `${Math.max(8, (item.created / maxTrend) * 120)}px` }}
                />
                <span
                  className="done"
                  style={{ height: `${Math.max(8, (item.done / maxTrend) * 120)}px` }}
                />
              </div>
              <small>{formatDate(item.date)}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
