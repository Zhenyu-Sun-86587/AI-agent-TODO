export type ChatAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

// ChatMessage 的 status 只用于前端发送态展示，不直接映射后端消息状态机。
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
  modelId?: string;
  createdAt: string;
  status?: "sending" | "sent" | "error";
};

export type ModelProvider = "openai" | "deepseek";

export type ChatModel = {
  id: string;
  provider: ModelProvider;
  label: string;
  description?: string;
  supportsFiles?: boolean;
  supportsReasoning?: boolean;
};

export type ChatModelGroup = {
  label: string;
  provider: ModelProvider;
  models: ChatModel[];
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ChatSendOptions = {
  followUpMode: boolean;
};
