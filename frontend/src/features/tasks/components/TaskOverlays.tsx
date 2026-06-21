import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { useAnimatedDismiss, useEscapeToClose } from "../../../hooks/useDismissAnimation";
import { ActionButton } from "../../../components/ui/primitives";
import { createEmptyTask, taskToInput } from "../utils/generation";
import { asErrorMessage } from "../../../api/errors";
import { localPartsFromIso, priorityFromApi } from "../../../api/mappers";
import type { ApiParsedTask } from "../../../api/types";
import type { NewTaskInput, Task } from "../types";
export { TaskDetailDrawer } from "./TaskDetail";
import { TaskEditor } from "./TaskEditor";

const OVERLAY_EXIT_MS = 180;

export function DeleteConfirmModal({ onCancel, onConfirm, task }: { onCancel: () => void; onConfirm: () => void; task: Task }) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onCancel, OVERLAY_EXIT_MS);
  useEscapeToClose(closeWithAnimation);

  return (
    <div className={`modal-backdrop ${isClosing ? "closing" : ""}`}>
      <div className={`create-modal confirm-modal ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Delete Task</p>
            <h2>确认删除任务？</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭确认">
            <X size={18} />
          </button>
        </div>
        <p className="drawer-description">删除后无法恢复。请确认是否删除以下任务：</p>
        <div className="confirm-target">
          <strong>{task.title}</strong>
          {task.description && <span>{task.description}</span>}
        </div>
        <div className="preview-actions">
          <ActionButton onClick={() => closeWithAnimation()}>取消</ActionButton>
          {/* 确认删除也走退场动画，避免数据更新时弹窗瞬间消失造成跳变。 */}
          <ActionButton variant="danger" onClick={() => closeWithAnimation(onConfirm)}>确认删除</ActionButton>
        </div>
      </div>
    </div>
  );
}

export function EditTaskModal({ categories, isApiMode, onClose, onUpdate, task }: { categories: string[]; isApiMode: boolean; onClose: () => void; onUpdate: (input: NewTaskInput) => void; task: Task }) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, OVERLAY_EXIT_MS);
  useEscapeToClose(closeWithAnimation);
  const [form, setForm] = useState<NewTaskInput>(() => taskToInput(task));

  const submitEdit = (input: NewTaskInput) => {
    if (input.title.trim()) {
      onUpdate(input);
    }
  };

  return (
    <div className={`modal-backdrop ${isClosing ? "closing" : ""}`}>
      <div className={`create-modal ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Edit Task</p>
            <h2>编辑任务</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭弹窗">
            <X size={18} />
          </button>
        </div>
        <TaskEditor categories={categories} form={form} isApiMode={isApiMode} onChange={setForm} onSubmit={submitEdit} submitLabel="保存修改" />
      </div>
    </div>
  );
}

export function CreateTaskModal({ categories, isApiMode, onClose, onCreate, onParseTask }: { categories: string[]; isApiMode: boolean; onClose: () => void; onCreate: (input: NewTaskInput) => void; onParseTask?: (text: string) => Promise<ApiParsedTask> }) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, OVERLAY_EXIT_MS);
  useEscapeToClose(closeWithAnimation);
  const [form, setForm] = useState<NewTaskInput>(() => createEmptyTask());
  const [aiInput, setAiInput] = useState("");
  const [aiParsing, setAiParsing] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState<ApiParsedTask | null>(null);

  const submitManual = (input: NewTaskInput) => {
    if (input.title.trim()) {
      if (aiResult) {
        onCreate({ ...input, isAiCreated: true, sourceText: aiInput, aiBackendMode: "backend" });
      } else {
        onCreate(input);
      }
    }
  };

  const handleAiParse = async () => {
    if (!aiInput.trim() || !onParseTask) return;
    // 本地演示模式：用表单内容作为来源，回退到纯手动流程。
    if (!isApiMode) {
      setForm((prev) => ({ ...prev, title: aiInput.trim(), isAiCreated: true, sourceText: aiInput, aiBackendMode: "frontend-fallback", aiReason: "本地演示模式，AI 解析功能需登录后端使用。" }));
      setAiResult(null);
      setAiInput("");
      return;
    }
    setAiParsing(true);
    setAiError("");
    try {
      const parsed = await onParseTask(aiInput.trim());
      setAiResult(parsed);
      const due = localPartsFromIso(parsed.due_time);
      setForm((prev) => ({
        ...prev,
        title: parsed.title,
        description: parsed.description || "",
        priority: priorityFromApi(parsed.priority),
        category: parsed.category || prev.category,
        dueDate: due.date || prev.dueDate,
        dueTime: due.time || prev.dueTime,
        isAiCreated: true,
        sourceText: aiInput.trim(),
        aiBackendMode: "backend",
        aiReason: parsed.raw_due_text ? `AI 识别到时间表达："${parsed.raw_due_text}"。` : "AI 已根据自然语言拆出任务字段。",
        confidence: parsed.confidence ?? undefined,
      }));
    } catch (error) {
      setAiError(asErrorMessage(error));
    } finally {
      setAiParsing(false);
    }
  };

  return (
    <div className={`modal-backdrop ${isClosing ? "closing" : ""}`}>
      <div className={`create-modal ${isClosing ? "closing" : ""}`}>
        <div className="drawer-header">
          <div>
            <p className="eyebrow">Create Task</p>
            <h2>新建任务</h2>
          </div>
          <button className="icon-button" type="button" onClick={() => closeWithAnimation()} aria-label="关闭弹窗">
            <X size={18} />
          </button>
        </div>
        {/* AI 自然语言解析区域 */}
        <div className="ai-parse-area">
          <label className="field-group">
            <span className="ai-parse-label"><Sparkles size={15} /> 用自然语言描述任务</span>
            <textarea
              value={aiInput}
              onChange={(event) => { setAiInput(event.target.value); setAiError(""); }}
              placeholder='例如："明天下午三点完成软件工程报告，很重要"'
              rows={2}
              disabled={aiParsing}
            />
          </label>
          <ActionButton variant="primary" onClick={handleAiParse} disabled={aiParsing || !aiInput.trim()}>
            {aiParsing ? "解析中..." : "AI 解析"}
          </ActionButton>
          {aiError && <p className="form-error">{aiError}</p>}
          {aiResult && <p className="ai-parse-success">AI 已解析：{aiResult.title}（置信度 {Math.round((aiResult.confidence ?? 0) * 100)}%）— 请检查下方字段后点击"创建任务"。</p>}
        </div>
        <TaskEditor categories={categories} form={form} isApiMode={isApiMode} onChange={setForm} onSubmit={submitManual} />
      </div>
    </div>
  );
}
