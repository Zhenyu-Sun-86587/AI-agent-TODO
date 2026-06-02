import type {
  AiParsedTask,
  CategoryRead,
  CategoryStats,
  CreateTaskByAiResponse,
  OpenAIKeyTestResponse,
  Priority,
  PriorityStats,
  StatsOverview,
  Task,
  TaskCreatePayload,
  TaskListParams,
  TaskListResponse,
  TaskStatus,
  TaskUpdatePayload,
  TrendStats,
  User,
  UserSetting,
  UserSettingUpdate,
} from "./types";

export const DEMO_TOKEN = "demo-access-token";

const TASKS_KEY = "ai-agent-todo-demo-tasks";
const SETTINGS_KEY = "ai-agent-todo-demo-settings";

const now = () => new Date().toISOString();

export const demoUser: User = {
  id: 1,
  username: "demo_user",
  email: "demo@example.com",
  created_at: now(),
  updated_at: now(),
};

export function isDemoToken(token: string | null): boolean {
  return token === DEMO_TOKEN;
}

export function ensureDemoData(): void {
  if (!localStorage.getItem(TASKS_KEY)) {
    localStorage.setItem(TASKS_KEY, JSON.stringify(seedTasks()));
  }

  if (!localStorage.getItem(SETTINGS_KEY)) {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        openai_api_key_masked: "sk-****demo",
        has_openai_api_key: true,
        model_name: "gpt-4o-mini",
        created_at: now(),
        updated_at: now(),
      } satisfies UserSetting),
    );
  }
}

export function listDemoTasks(params: TaskListParams = {}): TaskListResponse {
  ensureDemoData();
  let items = readTasks();

  if (params.status) {
    items = items.filter((task) => task.status === params.status);
  }
  if (params.priority) {
    items = items.filter((task) => task.priority === params.priority);
  }
  if (params.category) {
    items = items.filter((task) => task.category === params.category);
  }
  if (params.keyword) {
    const keyword = params.keyword.trim().toLowerCase();
    items = items.filter((task) =>
      [task.title, task.description ?? "", task.category ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(keyword),
    );
  }

  items.sort((a, b) => compareTasks(a, b, params.sort_by ?? "created_at"));
  if ((params.sort_order ?? "desc") === "desc") {
    items.reverse();
  }

  const page = params.page ?? 1;
  const pageSize = params.page_size ?? 20;
  const total = items.length;
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);

  return {
    items: pageItems,
    pagination: {
      page,
      page_size: pageSize,
      total,
      total_pages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

export function listDemoCategories(): CategoryRead[] {
  const counts = readTasks().reduce<Record<string, number>>((acc, task) => {
    const category = task.category ?? "未分类";
    acc[category] = (acc[category] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(counts).map(([name, task_count]) => ({
    name,
    task_count,
  }));
}

export function createDemoTask(payload: TaskCreatePayload): Task {
  const tasks = readTasks();
  const task: Task = {
    id: nextTaskId(tasks),
    title: payload.title,
    description: payload.description ?? null,
    priority: payload.priority ?? "medium",
    category: payload.category || null,
    due_time: payload.due_time ?? null,
    status: "todo",
    is_ai_created: false,
    created_at: now(),
    updated_at: now(),
  };
  writeTasks([task, ...tasks]);
  return task;
}

export function updateDemoTask(id: number, payload: TaskUpdatePayload): Task {
  let updated: Task | null = null;
  const tasks = readTasks().map((task) => {
    if (task.id !== id) {
      return task;
    }

    updated = {
      ...task,
      ...payload,
      description:
        payload.description === undefined
          ? task.description
          : payload.description,
      category:
        payload.category === undefined ? task.category : payload.category,
      due_time:
        payload.due_time === undefined ? task.due_time : payload.due_time,
      updated_at: now(),
    };
    return updated;
  });

  if (!updated) {
    throw new Error("任务不存在");
  }

  writeTasks(tasks);
  return updated;
}

export function updateDemoTaskStatus(id: number, status: TaskStatus): Task {
  return updateDemoTask(id, { status });
}

export function deleteDemoTask(id: number): void {
  writeTasks(readTasks().filter((task) => task.id !== id));
}

export function parseDemoTask(text: string): AiParsedTask {
  const lowerText = text.toLowerCase();
  const priority: Priority =
    text.includes("重要") || lowerText.includes("urgent")
      ? "high"
      : text.includes("随便") || text.includes("不急")
        ? "low"
        : "medium";
  const category =
    text.includes("报告") || text.includes("作业")
      ? "学习"
      : text.includes("会议") || text.includes("需求")
        ? "工作"
        : text.includes("买") || text.includes("取")
          ? "生活"
          : "个人";
  const dueTime = inferDueTime(text);

  return {
    title: cleanDemoTitle(text) || "新任务",
    description: "由演示模式解析生成，可在确认前调整字段。",
    priority,
    category,
    due_time: dueTime,
    confidence: 0.88,
    raw_due_text: dueTime ? "自然语言时间" : null,
  };
}

export function createDemoTaskByAi(
  text: string,
  overrides?: Partial<AiParsedTask>,
): CreateTaskByAiResponse {
  const parsed = { ...parseDemoTask(text), ...overrides };
  const tasks = readTasks();
  const task: Task = {
    id: nextTaskId(tasks),
    title: parsed.title,
    description: parsed.description ?? null,
    priority: parsed.priority ?? "medium",
    category: parsed.category ?? null,
    due_time: parsed.due_time ?? null,
    status: "todo",
    is_ai_created: true,
    created_at: now(),
    updated_at: now(),
  };
  writeTasks([task, ...tasks]);
  return { parsed, task, ai_status: "mocked" };
}

export function getDemoOverview(): StatsOverview {
  const tasks = readTasks();
  const done = tasks.filter((task) => task.status === "done").length;
  const todo = tasks.length - done;
  const today = new Date().toDateString();
  const overdue = tasks.filter(
    (task) =>
      task.status === "todo" &&
      task.due_time &&
      new Date(task.due_time).getTime() < Date.now(),
  ).length;

  return {
    total_tasks: tasks.length,
    done_tasks: done,
    todo_tasks: todo,
    completion_rate: tasks.length ? done / tasks.length : 0,
    overdue_tasks: overdue,
    today_due_tasks: tasks.filter(
      (task) => task.due_time && new Date(task.due_time).toDateString() === today,
    ).length,
    ai_created_tasks: tasks.filter((task) => task.is_ai_created).length,
  };
}

export function getDemoCategoryStats(): CategoryStats[] {
  const groups = groupTasksBy((task) => task.category ?? "未分类");
  return Object.entries(groups).map(([category, tasks]) => {
    const done = tasks.filter((task) => task.status === "done").length;
    return {
      category,
      total: tasks.length,
      done,
      todo: tasks.length - done,
      completion_rate: tasks.length ? done / tasks.length : 0,
    };
  });
}

export function getDemoPriorityStats(): PriorityStats[] {
  const groups = groupTasksBy((task) => task.priority);
  return (["high", "medium", "low"] as Priority[]).map((priority) => {
    const tasks = groups[priority] ?? [];
    const done = tasks.filter((task) => task.status === "done").length;
    return {
      priority,
      total: tasks.length,
      done,
      todo: tasks.length - done,
    };
  });
}

export function getDemoTrendStats(days = 7): TrendStats[] {
  const tasks = readTasks();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      created: tasks.filter((task) => task.created_at.slice(0, 10) === key)
        .length,
      done: Math.max(
        0,
        tasks.filter((task) => task.status === "done").length - (days - index - 1),
      ),
    };
  });
}

export function getDemoSettings(): UserSetting {
  ensureDemoData();
  return JSON.parse(localStorage.getItem(SETTINGS_KEY)!) as UserSetting;
}

export function updateDemoSettings(payload: UserSettingUpdate): UserSetting {
  const current = getDemoSettings();
  const updated: UserSetting = {
    ...current,
    model_name: payload.model_name || current.model_name,
    has_openai_api_key:
      payload.openai_api_key !== undefined
        ? Boolean(payload.openai_api_key)
        : current.has_openai_api_key,
    openai_api_key_masked:
      payload.openai_api_key !== undefined && payload.openai_api_key
        ? maskKey(payload.openai_api_key)
        : current.openai_api_key_masked,
    updated_at: now(),
  };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  return updated;
}

export function testDemoOpenAIKey(): OpenAIKeyTestResponse {
  return {
    valid: true,
    model_name: getDemoSettings().model_name,
    latency_ms: 184,
  };
}

function readTasks(): Task[] {
  ensureDemoData();
  return JSON.parse(localStorage.getItem(TASKS_KEY) ?? "[]") as Task[];
}

function writeTasks(tasks: Task[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

function seedTasks(): Task[] {
  const base = new Date();
  const makeDate = (offset: number, hour: number) => {
    const date = new Date(base);
    date.setDate(base.getDate() + offset);
    date.setHours(hour, 0, 0, 0);
    return date.toISOString();
  };

  return [
    {
      id: 104,
      title: "完成软件工程报告",
      description: "整理 API 文档、演示流程与系统架构图",
      priority: "high",
      category: "学习",
      due_time: makeDate(1, 15),
      status: "todo",
      is_ai_created: true,
      created_at: makeDate(-1, 10),
      updated_at: makeDate(-1, 10),
    },
    {
      id: 103,
      title: "检查后端接口联调",
      description: "确认认证、任务列表、统计接口返回字段一致",
      priority: "high",
      category: "工作",
      due_time: makeDate(0, 18),
      status: "todo",
      is_ai_created: false,
      created_at: makeDate(-2, 16),
      updated_at: makeDate(-2, 16),
    },
    {
      id: 102,
      title: "准备周会问题清单",
      description: "记录 BYOK、Mock 模式、部署路径的待确认点",
      priority: "medium",
      category: "工作",
      due_time: makeDate(2, 9),
      status: "done",
      is_ai_created: false,
      created_at: makeDate(-4, 14),
      updated_at: makeDate(-1, 20),
    },
    {
      id: 101,
      title: "整理个人任务分类",
      description: "合并重复分类，保留学习、工作、生活、个人",
      priority: "low",
      category: "个人",
      due_time: null,
      status: "done",
      is_ai_created: true,
      created_at: makeDate(-6, 21),
      updated_at: makeDate(-3, 11),
    },
  ];
}

function nextTaskId(tasks: Task[]): number {
  return Math.max(100, ...tasks.map((task) => task.id)) + 1;
}

function compareTasks(
  a: Task,
  b: Task,
  sortBy: NonNullable<TaskListParams["sort_by"]>,
): number {
  if (sortBy === "priority") {
    return priorityWeight(a.priority) - priorityWeight(b.priority);
  }

  const first = a[sortBy] ? new Date(a[sortBy]!).getTime() : Number.MAX_SAFE_INTEGER;
  const second = b[sortBy] ? new Date(b[sortBy]!).getTime() : Number.MAX_SAFE_INTEGER;
  return first - second;
}

function priorityWeight(priority: Priority): number {
  return { low: 1, medium: 2, high: 3 }[priority];
}

function inferDueTime(text: string): string | null {
  const date = new Date();
  if (text.includes("明天")) {
    date.setDate(date.getDate() + 1);
  }
  if (text.includes("后天")) {
    date.setDate(date.getDate() + 2);
  }
  if (text.includes("下午")) {
    date.setHours(15, 0, 0, 0);
  } else if (text.includes("晚上")) {
    date.setHours(20, 0, 0, 0);
  } else if (text.includes("上午")) {
    date.setHours(10, 0, 0, 0);
  } else {
    date.setHours(18, 0, 0, 0);
  }

  return text.includes("明天") || text.includes("今天") || text.includes("后天")
    ? date.toISOString()
    : null;
}

function cleanDemoTitle(text: string): string {
  return text
    .replace(/(今天|明天|后天|上午|中午|下午|晚上|凌晨|早上)/g, "")
    .replace(/[一二三四五六七八九十\d]{1,2}点(半|钟)?/g, "")
    .replace(/(很重要|重要|不急|随便|紧急|urgent)/gi, "")
    .replace(/[，,。.!！?？]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 36);
}

function groupTasksBy(keyFn: (task: Task) => string): Record<string, Task[]> {
  return readTasks().reduce<Record<string, Task[]>>((acc, task) => {
    const key = keyFn(task);
    acc[key] = [...(acc[key] ?? []), task];
    return acc;
  }, {});
}

function maskKey(key: string): string {
  return `${key.slice(0, 3)}****${key.slice(-4)}`;
}
