// DemoSession 同时服务本地演示模式和真实后端会话，isApiSession 用于区分后续同步策略。
export interface DemoSession {
  name: string;
  email: string;
  token: string;
  isApiSession: boolean;
}
