import { apiRequest } from "./client";
import type { ApiCategoryStats, ApiPriorityStats, ApiStatsOverview, ApiTrendStats } from "./types";

export function fetchOverview(token: string, rangeQuery = "") {
  // rangeQuery 由页面侧统一编码，这里只负责拼接，避免重复序列化日期范围。
  return apiRequest<ApiStatsOverview>(`/stats/overview${rangeQuery ? `?${rangeQuery}` : ""}`, { token });
}

export function fetchCategoryStats(token: string, rangeQuery = "") {
  return apiRequest<ApiCategoryStats[]>(`/stats/category${rangeQuery ? `?${rangeQuery}` : ""}`, { token });
}

export function fetchPriorityStats(token: string, rangeQuery = "") {
  return apiRequest<ApiPriorityStats[]>(`/stats/priority${rangeQuery ? `?${rangeQuery}` : ""}`, { token });
}

export function fetchTrendStats(token: string, days: number) {
  return apiRequest<ApiTrendStats[]>(`/stats/trend?days=${days}`, { token });
}
