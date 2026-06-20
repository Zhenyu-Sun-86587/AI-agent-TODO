import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { ActionButton, Surface, SurfaceHeader } from "../../../components/ui/primitives";
import { fetchAiLogs } from "../../../api/ai";
import { asErrorMessage } from "../../../api/errors";
import type { ApiAiLog } from "../../../api/types";
import type { Task, TaskFieldSuggestion } from "../../tasks/types";
import { EmptyState, Field, formatDue, PriorityBadge } from "../../tasks/components/TaskDisplay";
import { SelectField } from "../../tasks/components/TaskFilters";

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
  onOpenTask,
  onSuggestTaskFields,
  recommendedTasks,
  taskVersion,
  token,
}: {
  isApiMode: boolean;
  onApiError: (error: unknown) => string;
  onOpenTask: (task: Task) => void;
  onSuggestTaskFields: (title: string, description: string) => Promise<TaskFieldSuggestion>;
  recommendedTasks: Task[];
  taskVersion: number;
  token: string;
}) {
  return (
    <main className="page-content">
      <div className="page-heading"><div><h1>AI 推荐</h1></div></div>
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
