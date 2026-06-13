import { useRef, useState } from "react";

export function useChatPanelResize() {
  const [panelSize, setPanelSize] = useState({ width: 0, height: 0 });
  const isResizing = useRef(false);
  const resizeStart = useRef({ width: 0, height: 0, x: 0, y: 0 });

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>, direction: "top" | "left" | "both") => {
    isResizing.current = true;
    const parent = (event.target as HTMLElement).parentElement;
    if (!parent) {
      return;
    }

    resizeStart.current = {
      width: panelSize.width || parent.offsetWidth,
      height: panelSize.height || parent.offsetHeight,
      x: event.clientX,
      y: event.clientY,
    };
    document.body.style.userSelect = "none";

    const handleResizeMove = (moveEvent: PointerEvent) => {
      if (!isResizing.current) {
        return;
      }
      const deltaX = resizeStart.current.x - moveEvent.clientX;
      const deltaY = resizeStart.current.y - moveEvent.clientY;

      setPanelSize({
        width: direction === "top" ? resizeStart.current.width : Math.max(320, Math.min(1000, resizeStart.current.width + deltaX)),
        height: direction === "left" ? resizeStart.current.height : Math.max(400, Math.min(1200, resizeStart.current.height + deltaY)),
      });
    };

    const handleResizeEnd = () => {
      isResizing.current = false;
      document.body.style.userSelect = "";
      document.removeEventListener("pointermove", handleResizeMove);
      document.removeEventListener("pointerup", handleResizeEnd);
    };

    document.addEventListener("pointermove", handleResizeMove);
    document.addEventListener("pointerup", handleResizeEnd);
  };

  return {
    handleResizeStart,
    panelSize,
  };
}
