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
