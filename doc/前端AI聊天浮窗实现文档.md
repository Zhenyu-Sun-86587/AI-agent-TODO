# 前端 AI 聊天浮窗实现文档

## 组件目录

聊天浮窗位于 `frontend/src/components/ai-chat/`：

- `FloatingChat.tsx`：浮窗容器、会话状态、localStorage 同步、发送流程。
- `ChatThread.tsx`：消息列表、空会话欢迎语、自动滚动。
- `ChatComposer.tsx`：输入框、文件 metadata 选择、模型选择、发送。
- `ConversationMenu.tsx`：会话列表、切换、删除。
- `types.ts`：Conversation / Message / Attachment / Model 类型。
- `storage.ts`：localStorage key、读取、写入、数据归一化。
- `models.ts`：模型配置与 GPT / DeepSeek 分组。
- `aiClient.ts`：后续真实接口接入点；当前返回 mock 回复。
- `FloatingChat.css`：浮窗专属样式，类名前缀为 `ai-chat-*`。

## 保留功能

- 聊天记录。
- 创建新对话。
- 文件选择和提交 metadata。
- 模型切换。
- 对话记录删除。

已移除旧浮窗中的任务解析、任务候选按钮、AI 推荐快捷入口、翻译/深度剖析/创建任务跟踪器入口、旧任务助手文案和旧 `.assistant-*` 叠加样式。

## localStorage key

- `ai-agent-todo.ai-chat.conversations`：保存 Conversation 数组。
- `ai-agent-todo.ai-chat.activeConversationId`：保存当前会话 ID。
- `ai-agent-todo.ai-chat.selectedModelId`：保存当前模型 ID。

如果没有任何会话，前端会自动创建一个标题为“新建 AI 对话”的空会话。刷新后会恢复最近会话、当前 active 会话和模型选择。

## 数据类型

```ts
type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
  modelId?: string;
  createdAt: string;
  status?: "sending" | "sent" | "error";
};

type ChatAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

type ChatModel = {
  id: string;
  provider: "openai" | "deepseek";
  label: string;
  description?: string;
  supportsFiles?: boolean;
  supportsReasoning?: boolean;
};
```

## 模型分组

GPT：

- `gpt-5.5`
- `gpt-5.4`
- `gpt-5.4-mini`

DeepSeek：

- `deepseek-v4-pro`
- `deepseek-v4-flash`

模型配置集中在 `models.ts`，方便后续维护。

## 真实接口接入点

所有发送逻辑统一走 `aiClient.ts`：

```ts
sendChatMessage(request)
```

`SendChatRequest` 包含：

- `conversationId`
- `model`
- `messages`
- `input`
- `attachments`

后续真实接口可以按 `model.provider` 路由：

- `openai` -> 后端 OpenAI 代理
- `deepseek` -> 后端 DeepSeek 代理

当前文件只保存 metadata，不做真实上传。API Key 不应放在前端组件或前端配置中，应由后端代理持有和调用。
