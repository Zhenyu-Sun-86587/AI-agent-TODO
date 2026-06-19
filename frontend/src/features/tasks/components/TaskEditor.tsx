import { useState, type FormEvent } from "react";
import {
  API_TASK_STATUS_OPTIONS,
  TASK_PRIORITY_OPTIONS,
  TASK_STATUS_OPTIONS,
  isTaskPriority,
  isTaskStatus,
} from "../constants";
import type { NewTaskInput } from "../types";

export function TaskEditor({
  categories,
  form,
  isApiMode,
  onChange,
  onSubmit,
  submitLabel = "创建任务",
}: {
  categories: string[];
  form: NewTaskInput;
  isApiMode: boolean;
  onChange: (form: NewTaskInput) => void;
  onSubmit: (form: NewTaskInput) => void;
  submitLabel?: string;
}) {
  const [validationError, setValidationError] = useState("");
  const statusChoices = isApiMode ? API_TASK_STATUS_OPTIONS : TASK_STATUS_OPTIONS;
  const safeStatus = statusChoices.includes(form.status) ? form.status : "待办";
  const categoryOptions = Array.from(new Set([form.category, ...categories].filter(Boolean)));
  const fieldPrefix = submitLabel === "保存修改" ? "edit-task" : "create-task";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) {
      setValidationError("请输入任务标题。");
      return;
    }
    setValidationError("");
    onSubmit({ ...form, status: safeStatus });
  };

  return (
    <form className="manual-task-form" onSubmit={submit}>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-title`}>任务标题</label>
        <input
          id={`${fieldPrefix}-title`}
          value={form.title}
          aria-invalid={Boolean(validationError)}
          aria-describedby={validationError ? `${fieldPrefix}-title-error` : undefined}
          onChange={(event) => {
            if (validationError) {
              setValidationError("");
            }
            onChange({ ...form, title: event.target.value });
          }}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-description`}>描述</label>
        <textarea
          id={`${fieldPrefix}-description`}
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          rows={3}
        />
      </div>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor={`${fieldPrefix}-status`}>状态</label>
          <select id={`${fieldPrefix}-status`} value={safeStatus} onChange={(event) => {
            const nextStatus = event.target.value;
            if (isTaskStatus(nextStatus)) {
              onChange({ ...form, status: nextStatus });
            }
          }}>
            {statusChoices.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor={`${fieldPrefix}-priority`}>优先级</label>
          <select id={`${fieldPrefix}-priority`} value={form.priority} onChange={(event) => {
            const nextPriority = event.target.value;
            if (isTaskPriority(nextPriority)) {
              onChange({ ...form, priority: nextPriority });
            }
          }}>
            {TASK_PRIORITY_OPTIONS.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="field-group">
          <label htmlFor={`${fieldPrefix}-category`}>分类</label>
          <select id={`${fieldPrefix}-category`} value={form.category} onChange={(event) => onChange({ ...form, category: event.target.value })}>
            {categoryOptions.map((item) => <option key={item}>{item}</option>)}
          </select>
        </div>
        <div className="field-group">
          <label htmlFor={`${fieldPrefix}-due-date`}>截止时间</label>
          <input
            id={`${fieldPrefix}-due-date`}
            type="date"
            value={form.dueDate}
            onInput={(event) => onChange({ ...form, dueDate: event.currentTarget.value })}
            onChange={(event) => onChange({ ...form, dueDate: event.target.value })}
          />
        </div>
      </div>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-due-time`}>截止时段</label>
        <input
          id={`${fieldPrefix}-due-time`}
          type="time"
          value={form.dueTime}
          onInput={(event) => onChange({ ...form, dueTime: event.currentTarget.value })}
          onChange={(event) => onChange({ ...form, dueTime: event.target.value })}
        />
      </div>
      <div className="field-group">
        <label htmlFor={`${fieldPrefix}-tags`}>标签</label>
        <input id={`${fieldPrefix}-tags`} value={form.tags} onChange={(event) => onChange({ ...form, tags: event.target.value })} />
      </div>
      {validationError && <p className="form-error" id={`${fieldPrefix}-title-error`} role="alert">{validationError}</p>}
      <button className="primary-button full" type="submit">{submitLabel}</button>
    </form>
  );
}
