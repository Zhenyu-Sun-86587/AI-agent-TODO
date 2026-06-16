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

export type ModelProvider = "openai" | "deepseek";

export type ChatModel = {
  id: string;
  provider: ModelProvider;
  label: string;
  description?: string;
  supportsFiles?: boolean;
  supportsReasoning?: boolean;
};

export type ChatTaskAction =
  | {
      kind: "create-task";
      text: string;
    }
  | {
      kind: "help";
    }
  | {
      category?: string;
      kind: "list-tasks";
      priority?: string;
      query?: string;
      status?: string;
    }
  | {
      kind: "show-task";
      target: string;
    }
  | {
      changesText: string;
      kind: "update-task";
      target: string;
    }
  | {
      kind: "delete-task";
      target: string;
    }
  | {
      kind: "set-task-status";
      status: "待办" | "已完成";
      target: string;
    };

export type ChatFollowUpCandidate = {
  id: number;
  title: string;
};

export type ChatPendingFollowUp = {
  action: ChatTaskAction;
  candidates?: ChatFollowUpCandidate[];
  prompt: string;
};

export type Conversation = {
  id: string;
  title: string;
  messages: ChatMessage[];
  pendingFollowUp?: ChatPendingFollowUp;
  createdAt: string;
  updatedAt: string;
};

export type ChatTaskActionResult = {
  category?: string;
  dueDate?: string;
  dueTime?: string;
  priority?: string;
  title: string;
};

export type ChatActionResult = {
  content: string;
  followUp?: ChatPendingFollowUp;
  task?: ChatTaskActionResult;
};

export type ChatActionContext = {
  followUpMode: boolean;
};

export type ChatActionHandler = (action: ChatTaskAction, context: ChatActionContext) => Promise<ChatActionResult | null>;

export type ChatSendOptions = {
  followUpMode: boolean;
};
