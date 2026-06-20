import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/demo.css";

// 开发环境保留 StrictMode，方便尽早暴露副作用和不安全状态更新问题。
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
