export type ApiPriorityCode = "low" | "medium" | "high";
export type ApiTaskStatusCode = "todo" | "done";
export type TaskPriorityLabel = "高" | "中" | "低";
export type TaskStatusLabel = "待办" | "进行中" | "已完成";

export type TaskPriorityClass = `priority-${ApiPriorityCode}`;
export type TaskStatusClass = "status-todo" | "status-in-progress" | "status-done";

const priorityByApi: Record<ApiPriorityCode, TaskPriorityLabel> = {
  high: "高",
  medium: "中",
  low: "低",
};

const apiByPriority: Record<TaskPriorityLabel, ApiPriorityCode> = {
  高: "high",
  中: "medium",
  低: "low",
};

const statusByApi: Record<ApiTaskStatusCode, TaskStatusLabel> = {
  todo: "待办",
  done: "已完成",
};

// 后端目前只有 todo/done，前端“进行中”在提交时归并为 todo。
const apiByStatus: Record<Extract<TaskStatusLabel, "待办" | "已完成">, ApiTaskStatusCode> = {
  待办: "todo",
  已完成: "done",
};

const statusClassByLabel: Record<TaskStatusLabel, TaskStatusClass> = {
  待办: "status-todo",
  进行中: "status-in-progress",
  已完成: "status-done",
};

const statusClassByApi: Record<ApiTaskStatusCode, TaskStatusClass> = {
  todo: "status-todo",
  done: "status-done",
};

export function priorityFromApiCode(priority: ApiPriorityCode): TaskPriorityLabel {
  return priorityByApi[priority];
}

export function priorityToApiCode(priority: TaskPriorityLabel): ApiPriorityCode {
  return apiByPriority[priority];
}

export function statusFromApiCode(status: ApiTaskStatusCode): TaskStatusLabel {
  return statusByApi[status];
}

export function statusToApiCode(status: TaskStatusLabel): ApiTaskStatusCode {
  return status === "已完成" ? apiByStatus["已完成"] : apiByStatus["待办"];
}

export function taskPriorityClassName(priority: TaskPriorityLabel | ApiPriorityCode): TaskPriorityClass {
  // className 使用 API code 作为稳定后缀，便于中文展示文案调整时不影响 CSS。
  const code = priority in priorityByApi ? priority : priorityToApiCode(priority as TaskPriorityLabel);
  return `priority-${code}` as TaskPriorityClass;
}

export function taskStatusClassName(status: TaskStatusLabel | ApiTaskStatusCode): TaskStatusClass {
  if (status in statusClassByApi) {
    return statusClassByApi[status as ApiTaskStatusCode];
  }
  return statusClassByLabel[status as TaskStatusLabel];
}
