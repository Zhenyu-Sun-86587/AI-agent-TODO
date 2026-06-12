export type ChatAttachment = {
  id: string;
  name: string;
  size: number;
  type: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  attachments?: ChatAttachment[];
  modelId?: string;
  createdAt: string;
  status?: "sending" | "sent" | "error";
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
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
