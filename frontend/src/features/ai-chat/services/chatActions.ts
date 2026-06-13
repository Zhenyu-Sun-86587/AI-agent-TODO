import type { ChatTaskAction } from "../../../components/ai-chat/types";

const CREATE_TASK_PATTERNS = [
  /^(?:帮我|请|麻烦)?(?:创建|新增|添加|新建|生成)(?:一个|一条)?(?:待办|任务|todo|TODO)\s*[:：,，-]?\s*(.+)$/i,
  /^(?:把|将)?(.+?)(?:加入|添加到|记到|放进)(?:待办|任务|todo|TODO)(?:里|列表)?$/i,
  /^(?:帮我)?(?:记下|记录|安排)\s*[:：,，-]?\s*(.+)$/i,
];

const LIST_TASK_PATTERNS = [
  /^(?:查询|列出|显示)(?:一下|所有|全部|我的)?(?:待办|任务|todo|TODO)(?:列表)?\s*[:：,，-]?\s*(.*)$/i,
  /^(?:查看|给我看|看看)(?:一下)?(?:所有|全部|我的)?(?:待办|任务|todo|TODO)(?:列表)?\s*[:：,，-]?\s*(.*)$/i,
  /^(?:有哪些|有什么)(?:待办|任务|todo|TODO)\s*[:：,，-]?\s*(.*)$/i,
];

const SHOW_TASK_PATTERNS = [
  /^(?:查看|打开|详情|任务详情)(?:任务|待办)?\s*[:：,，-]?\s*(.+)$/i,
  /^(?:看看|给我看)(?:任务|待办)?\s*[:：,，-]?\s*(.+?)(?:的)?(?:详情)?$/i,
];

const UPDATE_TASK_PATTERNS = [
  /^(?:修改|更新|编辑|改)(?:任务|待办)?\s*[:：,，-]?\s*(.+?)\s+((?:标题|名称|优先级|分类|类别|描述|说明|备注|截止时间|截止|状态).+)$/i,
  /^(?:修改|更新|编辑|改)(?:任务|待办)?\s*[:：,，-]?\s*(.+?)(?:\s*(?:为|成|改为|更新为|设为|设置为)\s*)(.+)$/i,
  /^(?:把|将)(.+?)(?:任务|待办)?\s*(?:改为|更新为|设为|设置为)\s*(.+)$/i,
];

const DELETE_TASK_PATTERNS = [
  /^(?:删除|移除|删掉|去掉|取消)(?:任务|待办)?\s*[:：,，-]?\s*(.+)$/i,
  /^(?:把|将)(.+?)(?:从)?(?:任务|待办|todo|TODO)(?:里|列表)?(?:删除|移除|删掉|去掉)$/i,
];

const COMPLETE_TASK_PATTERNS = [
  /^(?:完成|标记完成|设为完成|把|将)(?:任务|待办)?\s*[:：,，-]?\s*(.+?)(?:\s*(?:标记为|设为|改为)?\s*(?:完成|已完成))?$/i,
  /^(.+?)(?:任务|待办)?\s*(?:完成了|已完成)$/i,
];

const REOPEN_TASK_PATTERNS = [
  /^(?:恢复|重新打开|取消完成|标记未完成|设为待办)(?:任务|待办)?\s*[:：,，-]?\s*(.+)$/i,
  /^(?:把|将)(.+?)(?:任务|待办)?\s*(?:恢复为|改为|设为|标记为)\s*(?:待办|未完成)$/i,
];

const HELP_PATTERNS = [
  /^(?:help|帮助|使用帮助|操作帮助|任务帮助|指令帮助)$/i,
  /^(?:怎么用|如何使用|使用教程|操作教程|教程)$/i,
  /^(?:你能做什么|你可以做什么|能做什么|支持什么|有哪些功能)$/i,
  /^(?:怎么|如何)(?:用)?(?:AI|ai)?(?:操作|管理)?(?:任务|待办)$/i,
];

function cleanupText(text: string) {
  return text
    .replace(/^["“”'`]+|["“”'`]+$/g, "")
    .replace(/[。；;]+$/g, "")
    .trim();
}

function matchFirst(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match;
    }
  }
  return null;
}

function pickTaskFilters(text: string) {
  const filters: Pick<Extract<ChatTaskAction, { kind: "list-tasks" }>, "category" | "priority" | "query" | "status"> = {};
  const normalized = cleanupText(text);

  if (/(已完成|完成的|done)/i.test(normalized)) {
    filters.status = "已完成";
  } else if (/(待办|未完成|todo)/i.test(normalized)) {
    filters.status = "待办";
  }

  if (/(高优先级|高\s*优先级|priority\s*high|high)/i.test(normalized)) {
    filters.priority = "高";
  } else if (/(低优先级|低\s*优先级|priority\s*low|low)/i.test(normalized)) {
    filters.priority = "低";
  } else if (/(中优先级|中\s*优先级|priority\s*medium|medium)/i.test(normalized)) {
    filters.priority = "中";
  }

  const categoryMatch = normalized.match(/(?:分类|类别)\s*(?:是|为|:|：)?\s*([\u4e00-\u9fa5A-Za-z0-9_-]+)/);
  if (categoryMatch?.[1]) {
    filters.category = categoryMatch[1];
  }

  const keyword = normalized
    .replace(/已完成|完成的|待办|未完成|高优先级|低优先级|中优先级|任务|列表|全部|所有/g, "")
    .replace(/分类\s*(?:是|为|:|：)?\s*[\u4e00-\u9fa5A-Za-z0-9_-]+/g, "")
    .trim();
  if (keyword) {
    filters.query = keyword;
  }

  return filters;
}

export function parseChatAction(input: string): ChatTaskAction | null {
  const normalized = input.trim();
  if (!normalized) {
    return null;
  }

  if (matchFirst(normalized, HELP_PATTERNS)) {
    return { kind: "help" };
  }

  const deleteMatch = matchFirst(normalized, DELETE_TASK_PATTERNS);
  const deleteTarget = cleanupText(deleteMatch?.[1] || "");
  if (deleteTarget) {
    return { kind: "delete-task", target: deleteTarget };
  }

  const reopenMatch = matchFirst(normalized, REOPEN_TASK_PATTERNS);
  const reopenTarget = cleanupText(reopenMatch?.[1] || "");
  if (reopenTarget) {
    return { kind: "set-task-status", status: "待办", target: reopenTarget };
  }

  const completeMatch = matchFirst(normalized, COMPLETE_TASK_PATTERNS);
  const completeTarget = cleanupText(completeMatch?.[1] || "");
  if (completeTarget && !/^(任务|待办|todo)$/i.test(completeTarget)) {
    return { kind: "set-task-status", status: "已完成", target: completeTarget };
  }

  const updateMatch = matchFirst(normalized, UPDATE_TASK_PATTERNS);
  const updateTarget = cleanupText(updateMatch?.[1] || "");
  const changesText = cleanupText(updateMatch?.[2] || "");
  if (updateTarget && changesText) {
    return { changesText, kind: "update-task", target: updateTarget };
  }

  const createMatch = matchFirst(normalized, CREATE_TASK_PATTERNS);
  const taskText = cleanupText(createMatch?.[1] || "");
  if (taskText) {
    return { kind: "create-task", text: taskText };
  }

  const showMatch = matchFirst(normalized, SHOW_TASK_PATTERNS);
  const showTarget = cleanupText(showMatch?.[1] || "");
  if (showTarget && !/(全部|所有|列表|有哪些|有什么)/.test(showTarget)) {
    return { kind: "show-task", target: showTarget };
  }

  const listMatch = matchFirst(normalized, LIST_TASK_PATTERNS);
  if (listMatch) {
    return {
      kind: "list-tasks",
      ...pickTaskFilters(listMatch[1] || ""),
    };
  }

  return null;
}
