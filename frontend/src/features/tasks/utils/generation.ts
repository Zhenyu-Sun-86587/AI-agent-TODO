import type { NewTaskInput, Task, TaskPriority } from "../types";
import { dateFromToday } from "../../../lib/date";

function addDays(baseDate: string, days: number) {
  const [year, month, day] = baseDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return date.toISOString().slice(0, 10);
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword.toLowerCase()));
}

export function normalizeTaskInput(input: NewTaskInput): NewTaskInput {
  const category = input.category.trim() || "未分类";
  return {
    ...input,
    title: input.title.trim(),
    description: input.description.trim(),
    category,
    tags: input.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
      .join(", "),
    aiReason: input.aiReason?.trim(),
    estimatedTime: input.estimatedTime?.trim(),
    aiCategory: input.aiCategory?.trim() || category,
    sourceText: input.sourceText?.trim(),
  };
}

export function pickGeneratedPriority(text: string): TaskPriority {
  if (includesAny(text, ["紧急", "截止", "今天", "明天", "演示", "答辩", "测试", "阻塞", "发布", "上线"])) {
    return "高";
  }
  if (includesAny(text, ["整理", "优化", "联调", "文档", "接口", "复盘"])) {
    return "中";
  }
  return "低";
}

export function pickGeneratedCategory(text: string) {
  if (includesAny(text, ["接口", "api", "联调", "后端"])) {
    return "后端联调";
  }
  if (includesAny(text, ["文档", "说明", "报告", "脚本"])) {
    return "文档";
  }
  if (includesAny(text, ["测试", "验收", "bug", "修复"])) {
    return "测试";
  }
  if (includesAny(text, ["统计", "数据", "图表", "趋势"])) {
    return "数据统计";
  }
  if (includesAny(text, ["移动端", "app", "webview", "响应式"])) {
    return "响应式";
  }
  if (includesAny(text, ["页面", "ui", "react", "前端", "表格", "看板", "首页"])) {
    return "前端开发";
  }
  if (includesAny(text, ["演示", "答辩", "汇报"])) {
    return "演示";
  }
  return "前端开发";
}

function createGeneratedTitle(prompt: string, category: string) {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  const firstSentence = normalized.split(/[。；;,.，\n]/)[0]?.trim();
  if (firstSentence && firstSentence.length <= 22) {
    return firstSentence;
  }
  const prefixMap: Record<string, string> = {
    前端开发: "完成前端任务规划",
    后端联调: "整理接口联调任务",
    文档: "整理项目文档任务",
    测试: "验证任务测试流程",
    数据统计: "完善数据统计模块",
    响应式: "完成移动端适配任务",
    演示: "准备项目演示任务",
  };
  return prefixMap[category] || "完成 AI 生成任务";
}

export function pickGeneratedDueTime(text: string) {
  if (includesAny(text, ["上午", "早上", "早晨"])) {
    return "10:00";
  }
  if (includesAny(text, ["晚上", "夜间"])) {
    return "20:00";
  }
  if (includesAny(text, ["中午"])) {
    return "12:00";
  }
  if (includesAny(text, ["下午", "午后"])) {
    return "15:00";
  }
  return "14:00";
}

export function generateTaskFromPrompt(prompt: string): NewTaskInput {
  const normalized = prompt.replace(/\s+/g, " ").trim();
  const text = normalized.toLowerCase();
  const priority = pickGeneratedPriority(text);
  const category = pickGeneratedCategory(text);
  const dueOffset = priority === "高" ? 1 : priority === "中" ? 2 : 4;
  const title = createGeneratedTitle(normalized, category);
  const baseTags = [category, "AI生成"];
  if (includesAny(text, ["react", "ui", "表格", "看板"])) {
    baseTags.push("React");
  }
  if (includesAny(text, ["接口", "api", "联调"])) {
    baseTags.push("API");
  }
  if (includesAny(text, ["演示", "答辩"])) {
    baseTags.push("演示");
  }

  return {
    title,
    description: normalized || "由 AI 根据输入内容生成的待办任务。",
    status: "待办",
    priority,
    category,
    dueDate: addDays(dateFromToday(0), dueOffset),
    dueTime: pickGeneratedDueTime(text),
    tags: Array.from(new Set(baseTags)).join(", "),
    aiReason:
      priority === "高"
        ? "输入内容包含紧急、截止、演示或测试信号，AI 建议优先处理。"
        : "AI 已根据任务类型和执行复杂度生成默认计划，可在创建前继续编辑。",
    estimatedTime: priority === "高" ? "2小时" : priority === "中" ? "1.5小时" : "1小时",
    aiCategory: category,
    isAiCreated: true,
    confidence: priority === "高" ? 0.9 : 0.78,
    rawDueText: priority === "高" ? "近期优先" : "默认规划",
    sourceText: normalized,
  };
}

export function taskTagsFromInput(input: NewTaskInput) {
  return Array.from(
    new Set(
      input.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
        .concat(input.isAiCreated ? ["AI生成"] : []),
    ),
  );
}

export function createTaskFromInput(input: NewTaskInput, id: number): Task {
  const normalizedInput = normalizeTaskInput(input);
  return {
    id,
    title: normalizedInput.title,
    description: normalizedInput.description,
    status: normalizedInput.status,
    priority: normalizedInput.priority,
    category: normalizedInput.category,
    dueDate: normalizedInput.dueDate,
    dueTime: normalizedInput.dueTime,
    createdAt: dateFromToday(0),
    completedAt: normalizedInput.status === "已完成" ? dateFromToday(0) : null,
    tags: taskTagsFromInput(normalizedInput),
    aiReason: normalizedInput.aiReason || "AI 将根据截止时间、优先级和任务上下文持续更新建议。",
    estimatedTime: normalizedInput.estimatedTime || (normalizedInput.priority === "高" ? "2小时" : "1小时"),
    aiCategory: normalizedInput.aiCategory || normalizedInput.category,
    isAiCreated: Boolean(normalizedInput.isAiCreated),
    confidence: normalizedInput.confidence,
    rawDueText: normalizedInput.rawDueText,
    sourceText: normalizedInput.sourceText,
  };
}

export function taskToInput(task: Task): NewTaskInput {
  return {
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    category: task.category,
    dueDate: task.dueDate,
    dueTime: task.dueTime,
    tags: task.tags.join(", "),
    aiReason: task.aiReason,
    estimatedTime: task.estimatedTime,
    aiCategory: task.aiCategory,
    isAiCreated: task.isAiCreated,
    confidence: task.confidence,
    rawDueText: task.rawDueText,
    sourceText: `${task.title}\n${task.description}`.trim(),
  };
}

export function mergeTaskInput(task: Task, input: NewTaskInput): Task {
  return {
    ...task,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    category: input.category,
    dueDate: input.dueDate,
    dueTime: input.dueTime,
    completedAt: input.status === "已完成" ? task.completedAt || dateFromToday(0) : null,
    tags: taskTagsFromInput(input),
    aiReason: input.aiReason || task.aiReason,
    estimatedTime: input.estimatedTime || (input.priority === "高" ? "2小时" : "1小时"),
    aiCategory: input.aiCategory || input.category,
    isAiCreated: input.isAiCreated ?? task.isAiCreated,
    confidence: input.confidence ?? task.confidence,
    rawDueText: input.rawDueText ?? task.rawDueText,
    sourceText: input.sourceText || `${input.title}\n${input.description}`.trim(),
  };
}

export function createEmptyTask(): NewTaskInput {
  return {
    title: "",
    description: "",
    status: "待办",
    priority: "中",
    category: "前端开发",
    dueDate: dateFromToday(3),
    dueTime: "15:00",
    tags: "React, UI设计",
  };
}
