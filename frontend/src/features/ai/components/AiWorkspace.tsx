import { useEffect, useState } from "react";
import { Bot, Sparkles } from "lucide-react";
import { ActionButton, Surface, SurfaceHeader } from "../../../components/ui/primitives";
import { fetchAiLogs } from "../../../api/ai";
import { asErrorMessage } from "../../../api/errors";
import { localPartsFromIso, priorityFromApi } from "../../../api/mappers";
import type { ApiAiLog, ApiParsedTask } from "../../../api/types";
import type { NewTaskInput, Task, TaskFieldSuggestion } from "../../tasks/types";
import { EmptyState, Field, formatDue, PriorityBadge } from "../../tasks/components/TaskDisplay";
import { SelectField } from "../../tasks/components/TaskFilters";
import { createEmptyTask } from "../../tasks/utils/generation";

export function AIAssistantCard({ onOpenTask, tasks }: { onOpenTask: (task: Task) => void; tasks: Task[] }) {
  return (
    <Surface className="ai-card" variant="accent">
      <SurfaceHeader
        className="ai-card-header"
        icon={<Sparkles size={22} />}
        title="AI 智能建议"
        description="根据截止时间、优先级和任务复杂度，AI 建议你优先完成以下任务。"
      />
      <div className="ai-recommend-list">
        {tasks.length ? tasks.map((task, index) => (
          <button className="ai-recommend-item" key={task.id} style={{ "--stagger-index": index } as React.CSSProperties} type="button" onClick={() => onOpenTask(task)}>
            <div>
              <strong>{task.title}</strong>
              <p>推荐原因：{task.aiReason}</p>
              <div className="ai-recommend-meta">
                <span>AI 分类：{task.aiCategory}</span>
                <span>预计：{task.estimatedTime}</span>
                <span>截止：{formatDue(task)}</span>
              </div>
            </div>
            <PriorityBadge priority={task.priority} />
          </button>
        )) : <EmptyState title="暂无 AI 推荐" description="所有任务都已完成，或者还没有可分析的待办任务。" />}
      </div>
    </Surface>
  );
}

export function AIPage({
  isApiMode,
  onApiError,
  onCreateTask,
  onOpenTask,
  onParseTask,
  onSuggestTaskFields,
  recommendedTasks,
  taskVersion,
  token,
}: {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onCreateTask?: (input: NewTaskInput) => void;
  onOpenTask: (task: Task) => void;
  onParseTask?: (text: string) => Promise<ApiParsedTask>;
  onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion>;
  recommendedTasks: Task[];
  taskVersion: number;
  token: string;
}) {
  return (
    <main className="page-content">
      <div className="page-heading"><div><h1>AI 推荐</h1></div></div>
      {(onParseTask && onCreateTask) && <AIParseTool isApiMode={isApiMode} onCreateTask={onCreateTask} onParseTask={onParseTask} />}
      <AIAssistantCard onOpenTask={onOpenTask} tasks={recommendedTasks} />
      <AISuggestTool onSuggestTaskFields={onSuggestTaskFields} />
      <AILogsPanel isApiMode={isApiMode} onApiError={onApiError} taskVersion={taskVersion} token={token} />
    </main>
  );
}

function formatAiLogOutput(output: unknown) {
  if (typeof output === "string") {
    // 后端日志可能把 JSON 存成字符串，也可能直接存对象；前端统一归一后再裁剪展示。
    try { return formatAiLogOutput(JSON.parse(output)); } catch { return output.slice(0, 120); }
  }
  if (!output || typeof output !== "object") return "无结构化输出";
  const record = output as Record<string, unknown>;
  const parsed = record.parsed_task as Record<string, unknown> | undefined;
  const task = record.task as Record<string, unknown> | undefined;
  const title = parsed?.title || task?.title || record.title;
  const category = parsed?.category || task?.category || record.category;
  const priority = parsed?.priority || task?.priority || record.priority;
  const reason = record.reason;
  if (title) return `${String(title)}${category ? ` / ${String(category)}` : ""}${priority ? ` / ${String(priority)}` : ""}`;
  if (reason) return `${category ? `${String(category)} / ` : ""}${priority ? `${String(priority)} / ` : ""}${String(reason)}`;
  return JSON.stringify(output).slice(0, 120);
}

function AILogsPanel({ isApiMode, onApiError, taskVersion, token }: { isApiMode: boolean; onApiError: (error: unknown) => string; taskVersion: number; token: string }) {
  const [status, setStatus] = useState<"全部" | ApiAiLog["status"]>("全部");
  const [page, setPage] = useState(1);
  const [logs, setLogs] = useState<ApiAiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [isLoading, setLoading] = useState(false);
  const pageSize = 5;

  useEffect(() => setPage(1), [status]);
  useEffect(() => {
    if (!isApiMode || !token) { setLogs([]); setTotal(0); return; }
    let isCancelled = false;
    const params = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
    if (status !== "全部") params.set("status", status);
    setLoading(true);
    setError("");
    void fetchAiLogs(`/ai/logs?${params.toString()}`, token)
      .then((data) => { if (!isCancelled) { setLogs(data.items); setTotal(data.pagination.total); } })
      .catch((requestError) => { if (!isCancelled) { setError(onApiError(requestError)); } })
      .finally(() => { if (!isCancelled) setLoading(false); });
    // 切换筛选、翻页或离开页面时忽略旧请求结果，避免日志列表闪回。
    return () => { isCancelled = true; };
  }, [isApiMode, onApiError, page, status, taskVersion, token]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <Surface className="ai-logs-panel">
      <SurfaceHeader
        title="AI 调用记录"
        description="来自 /ai/logs，用于确认解析、创建和推荐请求已由后端处理。"
        action={(
          <SelectField value={status} onChange={(value) => setStatus(value as typeof status)} width="168px">
            <option value="全部">全部状态</option><option value="success">success</option><option value="mocked">mocked</option><option value="failed">failed</option>
          </SelectField>
        )}
      />
      {!isApiMode ? <EmptyState title="本地演示模式无 AI 日志" description="登录后端账号后，这里会展示真实 /ai/logs 返回。" /> : isLoading ? <p className="table-state">正在读取 AI 日志...</p> : error ? <p className="form-error">{error}</p> : logs.length ? (
        <>
          <div className="ai-log-list">
            {logs.map((log) => (
              <article className="ai-log-row" key={log.id}>
                <span className={`ai-log-status ${log.status}`}>{log.status}</span>
                <div><strong>{log.input_text}</strong><p>{formatAiLogOutput(log.output_json)}</p></div>
                <small>{log.model_name || "mock"}<br />{new Date(log.created_at).toLocaleString()}</small>
              </article>
            ))}
          </div>
          <div className="pagination-row">
            <ActionButton onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1}>上一页</ActionButton>
            <span>第 {page} / {totalPages} 页</span>
            <ActionButton onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={page >= totalPages}>下一页</ActionButton>
          </div>
        </>
      ) : <EmptyState title="暂无 AI 调用记录" description="使用 AI 生成任务或获取字段建议后会出现记录。" />}
    </Surface>
  );
}

function AISuggestTool({ onSuggestTaskFields }: { onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion> }) {
  const [title, setTitle] = useState("修复移动端弹窗遮挡问题");
  const [description, setDescription] = useState("检查 WebView 下底部导航和新建任务弹窗是否被安全区遮挡。");
  const [suggestion, setSuggestion] = useState<TaskFieldSuggestion | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestSuggestion = async () => {
    setLoading(true);
    setError("");
    try {
      setSuggestion(await onSuggestTaskFields(title, description));
    } catch (requestError) {
      setError(asErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Surface className="ai-suggest-tool">
      <SurfaceHeader
        title="AI 推荐分类和优先级"
        action={<ActionButton onClick={requestSuggestion} disabled={isLoading}>{isLoading ? "分析中" : "获取建议"}</ActionButton>}
      />
      <div className="ai-suggest-grid">
        <label>任务描述<textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={3} /></label>
        <div className="suggest-left-column">
          <label>任务标题<input value={title} onChange={(event) => setTitle(event.target.value)} /></label>
          <div className="suggest-result">
            <Field label="推荐优先级">{suggestion ? <PriorityBadge priority={suggestion.priority} /> : "待获取"}</Field>
            <Field label="推荐分类">{suggestion?.category || "待获取"}</Field>
            <Field label="建议来源">{suggestion?.source || "待获取"}</Field>
          </div>
        </div>
      </div>
      {suggestion && <p className="suggest-reason">{suggestion.reason}</p>}
      {error && <p className="form-error">{error}</p>}
    </Surface>
  );
}

function AIParseTool({ isApiMode, onCreateTask, onParseTask }: { isApiMode: boolean; onCreateTask: (input: NewTaskInput) => void; onParseTask: (text: string) => Promise<ApiParsedTask> }) {
  const [aiInput, setAiInput] = useState("");
  const [isParsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ApiParsedTask | null>(null);
  const [parseError, setParseError] = useState("");
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  const handleParse = async () => {
    if (!aiInput.trim()) return;
    setParsing(true);
    setParseError("");
    setParsed(null);
    setCreatedTaskId(null);
    try {
      if (!isApiMode) {
        setParsed({
          title: aiInput.trim().slice(0, 100),
          description: null,
          priority: "medium",
          category: null,
          due_time: null,
          confidence: 0,
          raw_due_text: null,
        });
        return;
      }
      const result = await onParseTask(aiInput.trim());
      setParsed(result);
    } catch (error) {
      setParseError(asErrorMessage(error));
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmCreate = () => {
    if (!parsed) return;
    const due = localPartsFromIso(parsed.due_time);
    onCreateTask({
      title: parsed.title,
      description: parsed.description || "",
      status: "待办",
      priority: priorityFromApi(parsed.priority),
      category: parsed.category || "未分类",
      dueDate: due.date,
      dueTime: due.time,
      tags: parsed.category ? `${parsed.category}, AI生成` : "AI生成",
      aiReason: parsed.raw_due_text ? `AI 识别到时间表达："${parsed.raw_due_text}"。` : "AI 已根据自然语言拆出任务字段。",
      isAiCreated: true,
      confidence: parsed.confidence ?? undefined,
      rawDueText: parsed.raw_due_text ?? undefined,
      sourceText: aiInput.trim(),
      aiBackendMode: isApiMode ? "backend" : "frontend-fallback",
    });
    setCreatedTaskId(parsed.title);
  };

  return (
    <Surface variant="accent">
      <SurfaceHeader
        icon={<Bot size={22} />}
        title="AI 解析创建任务"
        description="用自然语言描述你要做的事，AI 会自动拆分为结构化任务。"
      />
      <div className="ai-parse-area">
        <textarea
          value={aiInput}
          onChange={(event) => { setAiInput(event.target.value); setParseError(""); }}
          placeholder='例如："明天下午三点完成软件工程报告，很重要"'
          rows={3}
          disabled={isParsing}
        />
        <div className="ai-parse-actions">
          <ActionButton variant="primary" onClick={handleParse} disabled={isParsing || !aiInput.trim()}>
            {isParsing ? "解析中..." : "解析任务"}
          </ActionButton>
        </div>
        {parseError && <p className="form-error">{parseError}</p>}
        {parsed && !createdTaskId && (
          <div className="ai-parse-result">
            <div className="ai-parse-result-header">
              <Sparkles size={16} />
              <strong>AI 解析结果</strong>
              {parsed.confidence ? <span className="ai-confidence">置信度 {Math.round(parsed.confidence * 100)}%</span> : null}
            </div>
            <div className="ai-parse-fields">
              <Field label="标题">{parsed.title}</Field>
              <div className="form-grid">
                <Field label="优先级"><PriorityBadge priority={priorityFromApi(parsed.priority)} /></Field>
                <Field label="分类">{parsed.category || "未分类"}</Field>
              </div>
              <Field label="截止时间">{parsed.due_time ? new Date(parsed.due_time).toLocaleString() : "未识别"}</Field>
              {parsed.raw_due_text && <Field label="识别到的时间表达">{parsed.raw_due_text}</Field>}
            </div>
            <ActionButton variant="primary" fullWidth onClick={handleConfirmCreate}>确认创建任务</ActionButton>
          </div>
        )}
        {createdTaskId && (
          <div className="ai-parse-success">任务「{createdTaskId}」已创建成功！可在全部任务列表中查看。</div>
        )}
      </div>
    </Surface>
  );
}
