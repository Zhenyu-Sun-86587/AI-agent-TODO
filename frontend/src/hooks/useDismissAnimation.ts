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
      timeoutRef.current = window.setTimeout(() => {
        afterClose();
      }, duration);
    },
    [duration, isClosing, onClose],
  );

  return { closeWithAnimation, isClosing };
}
