// SettingsState 对应前端设置弹窗草稿，不要求与后端 DTO 完全一一对应。
export interface SettingsState {
  openaiApiKey: string;
  modelName: string;
  maskedKey?: string;
  hasOpenaiApiKey?: boolean;
}

export interface ProfileState {
  username: string;
  email: string;
}
