// 本地存储 key 集中定义，避免不同 hook 和 service 写出互相不兼容的名称。
export const CHAT_CONVERSATIONS_STORAGE_KEY = "ai-agent-todo.ai-chat.conversations";
export const CHAT_ACTIVE_CONVERSATION_STORAGE_KEY = "ai-agent-todo.ai-chat.activeConversationId";
export const CHAT_SELECTED_MODEL_STORAGE_KEY = "ai-agent-todo.ai-chat.selectedModelId";
export const DEFAULT_CONVERSATION_TITLE = "新建 AI 对话";
export const CONVERSATION_TITLE_MAX_LENGTH = 22;
