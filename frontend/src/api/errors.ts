export class ApiError extends Error {
  status: number;
  code?: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export function asErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "请求失败，请稍后再试。";
}

export function isAiConfigError(error: unknown) {
  return error instanceof ApiError && (error.code === 4001 || error.code === 4002 || error.message.includes("OpenAI API Key"));
}
