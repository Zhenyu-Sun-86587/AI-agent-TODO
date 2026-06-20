import { useEffect } from "react";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  message?: string;
  title: string;
  tone: ToastTone;
}

interface ToastViewportProps {
  items: ToastMessage[];
  onDismiss: (id: number) => void;
}

const toastIcons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

export default function ToastViewport({ items, onDismiss }: ToastViewportProps) {
  useEffect(() => {
    // 每条提示独立计时，允许用户在新提示出现时仍保留较早的反馈一小段时间。
    const timers = items.map((item) => window.setTimeout(() => onDismiss(item.id), 3200));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [items, onDismiss]);

  if (!items.length) {
    return null;
  }

  return (
    <section className="toast-viewport" aria-label="操作反馈">
      {items.map((item) => {
        const Icon = toastIcons[item.tone];
        return (
          <article className={`toast toast-${item.tone}`} key={item.id} role="status">
            <span className="toast-icon">
              <Icon size={18} />
            </span>
            <div>
              <strong>{item.title}</strong>
              {item.message ? <p>{item.message}</p> : null}
            </div>
            <button type="button" onClick={() => onDismiss(item.id)} aria-label="关闭提示">
              <X size={15} />
            </button>
          </article>
        );
      })}
    </section>
  );
}
