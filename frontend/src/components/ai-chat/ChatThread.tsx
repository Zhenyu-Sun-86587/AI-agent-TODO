import { useEffect, useRef } from "react";
import type { ChatMessage } from "./types";

function formatFileSize(size: number) {
  if (!size) {
    return "0 B";
  }
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export default function ChatThread({ isSending, messages }: { isSending: boolean; messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages, isSending]);

  if (!messages.length) {
    return (
      <div className="ai-chat-thread">
        <section className="ai-chat-empty">
          <h2>今天想聊点什么？</h2>
          <p>可以直接输入问题，也可以先选择文件 metadata 后一起提交。</p>
        </section>
        <div ref={bottomRef} />
      </div>
    );
  }

  return (
    <div className="ai-chat-thread" aria-live="polite">
      {messages.map((message) => (
        <article className={`ai-chat-message ${message.role}`} key={message.id}>
          <p>{message.content}</p>
          {message.attachments?.length ? (
            <div className="ai-chat-message-attachments">
              {message.attachments.map((attachment) => (
                <span key={attachment.id}>
                  {attachment.name}
                  <small>{formatFileSize(attachment.size)}</small>
                </span>
              ))}
            </div>
          ) : null}
          {message.status === "error" ? <small className="ai-chat-message-error">发送失败</small> : null}
        </article>
      ))}
      {isSending ? (
        <article className="ai-chat-message assistant pending">
          <p>正在思考...</p>
        </article>
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
