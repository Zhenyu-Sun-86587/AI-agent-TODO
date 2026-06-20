import { useState } from "react";
import { X } from "lucide-react";
import { useAnimatedDismiss, useEscapeToClose } from "../../../hooks/useDismissAnimation";
import { ActionButton } from "../../../components/ui/primitives";
import { createEmptyTask, taskToInput } from "../utils/generation";
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

export function CreateTaskModal({ categories, isApiMode, onClose, onCreate }: { categories: string[]; isApiMode: boolean; onClose: () => void; onCreate: (input: NewTaskInput) => void }) {
  const { closeWithAnimation, isClosing } = useAnimatedDismiss(onClose, OVERLAY_EXIT_MS);
  useEscapeToClose(closeWithAnimation);
  const [form, setForm] = useState<NewTaskInput>(() => createEmptyTask());

  const submitManual = (input: NewTaskInput) => {
    if (input.title.trim()) {
      onCreate(input);
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
        <TaskEditor categories={categories} form={form} isApiMode={isApiMode} onChange={setForm} onSubmit={submitManual} />
      </div>
    </div>
  );
}
