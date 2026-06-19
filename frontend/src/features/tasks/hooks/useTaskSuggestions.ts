import { useCallback } from "react";
import { suggestTask } from "../../../api/ai";
import { asErrorMessage, isAiConfigError } from "../../../api/errors";
import { priorityFromApi } from "../../../api/mappers";
import type { TaskFieldSuggestion } from "../types";
import { generateTaskFromPrompt } from "../utils/generation";

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
      const suggestion = generateTaskFromPrompt(`${title}\n${description}`);
      return {
        priority: suggestion.priority,
        category: suggestion.category,
        reason: suggestion.aiReason || "本地规则已根据关键词推荐分类与优先级。",
        source: "前端规则兜底",
      };
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
        const suggestion = generateTaskFromPrompt(`${title}\n${description}`);
        setApiState("online");
        setApiMessage(asErrorMessage(error));
        return {
          priority: suggestion.priority,
          category: suggestion.category,
          reason: "后端 AI Key 未配置，已使用前端规则推荐分类与优先级。",
          source: "前端规则兜底",
        };
      }
      handleApiError(error);
      throw error;
    }
  }, [activeToken, handleApiError, setApiMessage, setApiState]);

  return {
    suggestTaskFields,
  };
}
