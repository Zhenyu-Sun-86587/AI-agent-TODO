import { useCallback, useRef, useState } from "react";
import type { ToastMessage, ToastTone } from "../Toast";

export function useToastQueue() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastIdRef = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((currentToasts) => currentToasts.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((title: string, message?: string, tone: ToastTone = "info") => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;
    setToasts((currentToasts) => {
      // 相同内容的提示不重复堆叠，避免批量请求失败时刷屏。
      if (currentToasts.some((toast) => toast.title === title && toast.message === message && toast.tone === tone)) {
        return currentToasts;
      }

      return [...currentToasts.slice(-2), { id, message, title, tone }];
    });
  }, []);

  return { dismissToast, showToast, toasts };
}
