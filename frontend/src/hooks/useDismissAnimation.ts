import { useCallback, useEffect, useRef, useState } from "react";

export function useEscapeToClose(onClose: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);
}

export function useAnimatedDismiss(onClose: () => void, duration: number, resetKey?: unknown) {
  const [isClosing, setClosing] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // resetKey 变化通常代表弹层内容切换，需要取消上一轮关闭动画和定时器。
    setClosing(false);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [resetKey]);

  useEffect(
    () => () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    },
    [],
  );

  const closeWithAnimation = useCallback(
    (afterClose = onClose) => {
      if (isClosing) {
        return;
      }
      setClosing(true);
      // 等 CSS 动画结束后再真正关闭，避免元素提前卸载导致过渡失效。
      timeoutRef.current = window.setTimeout(() => {
        afterClose();
      }, duration);
    },
    [duration, isClosing, onClose],
  );

  return { closeWithAnimation, isClosing };
}
