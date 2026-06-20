export function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function dateFromToday(offsetDays: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offsetDays);
  return formatLocalDate(date);
}

export function getWeekStart(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  // 统计页按中国常用周一作为一周开始，周日折算为第 7 天。
  const dayOfWeek = value.getDay() === 0 ? 7 : value.getDay();
  value.setDate(value.getDate() - (dayOfWeek - 1));
  return value;
}

export function getMonthStart(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function getMonthEnd(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
