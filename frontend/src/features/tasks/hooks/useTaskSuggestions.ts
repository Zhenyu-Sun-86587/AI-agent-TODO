import { useCallback } from "react";
import { suggestTask } from "../../../api/ai";
import { asErrorMessage, isAiConfigError } from "../../../api/errors";
import { priorityFromApi } from "../../../api/mappers";
import type { TaskFieldSuggestion } from "../types";

export function useTaskSuggestions({
  activeToken,
  handleApiError,
  setApiMessage,
  setApiState,
}: {
  activeToken: string;
  handleApiError: (error: unknown) => string;
  setApiMessage: (message: string) => void;
  setApiState: (state: "local" | "loading" | "online" | "offline") => void;
}) {
  const suggestTaskFields = useCallback(async (title: string, description: string): Promise<TaskFieldSuggestion> => {
    if (!activeToken) {
      const message = "请先登录或使用演示账号后再调用 /ai/suggest。";
      setApiState("local");
      setApiMessage(message);
      throw new Error(message);
    }

    try {
      setApiState("loading");
      setApiMessage("正在调用 /ai/suggest...");
      const data = await suggestTask(title, description, activeToken);
      setApiState("online");
      setApiMessage("AI 字段建议已返回");
      return {
        priority: priorityFromApi(data.priority),
        category: data.category || "未分类",
        reason: data.reason || "后端 AI 已返回推荐结果。",
        source: "/ai/suggest",
      };
    } catch (error) {
      if (isAiConfigError(error)) {
        const message = asErrorMessage(error);
        setApiState("online");
        setApiMessage(message);
        throw error;
      }
      handleApiError(error);
      throw error;
    }
  }, [activeToken, handleApiError, setApiMessage, setApiState]);

  return {
    suggestTaskFields,
  };
}
