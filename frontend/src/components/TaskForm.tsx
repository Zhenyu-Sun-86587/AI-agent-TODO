import { useEffect, useState } from "react";

import type { Priority, Task, TaskCreatePayload } from "../api/types";
import { fromDateTimeInputValue, toDateTimeInputValue } from "../utils/format";

interface TaskFormProps {
  initial?: Task | null;
  submitting?: boolean;
  onSubmit: (payload: TaskCreatePayload) => Promise<void> | void;
  onCancel?: () => void;
}

const initialState = {
  title: "",
  description: "",
  priority: "medium" as Priority,
  category: "",
  due_time: "",
};

export function TaskForm({
  initial,
  submitting = false,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const [form, setForm] = useState(initialState);

  useEffect(() => {
    if (!initial) {
      setForm(initialState);
      return;
    }

    setForm({
      title: initial.title,
      description: initial.description ?? "",
      priority: initial.priority,
      category: initial.category ?? "",
      due_time: toDateTimeInputValue(initial.due_time),
    });
  }, [initial]);

  const updateField = (field: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  return (
    <form
      className="stack-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          title: form.title.trim(),
          description: form.description.trim() || null,
          priority: form.priority,
          category: form.category.trim() || null,
          due_time: fromDateTimeInputValue(form.due_time),
        });
      }}
    >
      <label>
        <span>任务标题</span>
        <input
          required
          maxLength={100}
          value={form.title}
          onChange={(event) => updateField("title", event.target.value)}
          placeholder="例如：完成软件工程报告"
        />
      </label>

      <label>
        <span>任务描述</span>
        <textarea
          rows={4}
          maxLength={2000}
          value={form.description}
          onChange={(event) => updateField("description", event.target.value)}
          placeholder="补充上下文、验收点或材料链接"
        />
      </label>

      <div className="form-grid">
        <label>
          <span>优先级</span>
          <select
            value={form.priority}
            onChange={(event) =>
              updateField("priority", event.target.value as Priority)
            }
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </label>
        <label>
          <span>分类</span>
          <input
            maxLength={50}
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
            placeholder="学习 / 工作 / 生活"
          />
        </label>
        <label>
          <span>截止时间</span>
          <input
            type="datetime-local"
            value={form.due_time}
            onChange={(event) => updateField("due_time", event.target.value)}
          />
        </label>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button className="ghost-button" type="button" onClick={onCancel}>
            取消
          </button>
        )}
        <button className="primary-button" type="submit" disabled={submitting}>
          {submitting ? "保存中" : initial ? "保存修改" : "创建任务"}
        </button>
      </div>
    </form>
  );
}
