// PageKey 作为布局导航和路由切换的共享枚举，避免页面标识散落成硬编码字符串。
export type PageKey = "dashboard" | "tasks" | "calendar" | "ai";

// 日历视图类型会同时影响数据请求范围和具体渲染组件。
export type CalendarView = "week" | "month" | "24h" | "overdue";
