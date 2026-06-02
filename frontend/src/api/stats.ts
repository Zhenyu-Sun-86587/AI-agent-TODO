import { getStoredToken, request } from "./client";
import {
  getDemoCategoryStats,
  getDemoOverview,
  getDemoPriorityStats,
  getDemoTrendStats,
  isDemoToken,
} from "./demo";
import type {
  CategoryStats,
  PriorityStats,
  StatsOverview,
  TrendStats,
} from "./types";

export function getOverview(): Promise<StatsOverview> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(getDemoOverview());
  }
  return request<StatsOverview>({
    url: "/stats/overview",
    method: "GET",
  });
}

export function getCategoryStats(): Promise<CategoryStats[]> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(getDemoCategoryStats());
  }
  return request<CategoryStats[]>({
    url: "/stats/category",
    method: "GET",
  });
}

export function getPriorityStats(): Promise<PriorityStats[]> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(getDemoPriorityStats());
  }
  return request<PriorityStats[]>({
    url: "/stats/priority",
    method: "GET",
  });
}

export function getTrendStats(days = 7): Promise<TrendStats[]> {
  if (isDemoToken(getStoredToken())) {
    return Promise.resolve(getDemoTrendStats(days));
  }
  return request<TrendStats[]>({
    url: "/stats/trend",
    method: "GET",
    params: { days },
  });
}
