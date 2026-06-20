import json
import re
import socket
import time
import urllib.parse
import urllib.request
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable, Optional, TypeVar
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from openai import APIConnectionError, OpenAI, OpenAIError, AuthenticationError, PermissionDeniedError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BusinessError, ErrorCode
from app.models.ai_call_log import AiCallLog
from app.models.user import User
from app.schemas.ai import AiChatMessage, AiChatResponse, AiParsedTask, AiSuggestResponse, CreateTaskByAiRequest, ParseTaskRequest
from app.schemas.task import AiStatus, Priority, TaskCreate, TaskRead, TaskStatus, TaskStatusUpdate, TaskUpdate
from app.services.setting_service import SettingService
from app.services.task_service import TaskService
from app.utils.datetime import utc_now

PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "parse_task.md"
DEEPSEEK_MODEL_PREFIX = "deepseek-"
DEEPSEEK_DNS_CACHE_TTL_SECONDS = 300
AGENT_ACTIONS = {
    "chat",
    "follow_up",
    "create_task",
    "list_tasks",
    "show_task",
    "update_task",
    "delete_task",
    "set_task_status",
}
_DEEPSEEK_DNS_CACHE: tuple[str, float] | None = None
T = TypeVar("T")


@contextmanager
def _override_hostname_resolution(hostname: str, ip_address: str):
    original_getaddrinfo = socket.getaddrinfo

    def patched_getaddrinfo(host, port, family=0, type=0, proto=0, flags=0):
        if host == hostname:
            # 仅替换目标模型域名解析，避免影响同进程内其他网络请求。
            return original_getaddrinfo(ip_address, port, family, type, proto, flags)
        return original_getaddrinfo(host, port, family, type, proto, flags)

    socket.getaddrinfo = patched_getaddrinfo
    try:
        yield
    finally:
        socket.getaddrinfo = original_getaddrinfo


class AiService:
    """AI Agent 服务，负责真实模型调用、Mock 兜底、任务执行和调用日志。"""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.setting_service = SettingService(db)

    def parse_task(self, user: User, payload: ParseTaskRequest) -> dict:
        model_name = self.setting_service.get_model_name(user)
        if settings.ai_mock_mode:
            # Mock 模式完全绕开外部模型，便于离线演示和测试保持稳定。
            parsed = self._mock_parse_task(payload.text, payload.timezone)
            self._write_log(user.id, payload.text, parsed.model_dump(mode="json"), AiStatus.mocked.value, model_name)
            return {
                "parsed_task": parsed,
                "ai_status": AiStatus.mocked.value,
                "model_name": model_name,
            }

        api_key = self.setting_service.require_openai_api_key(user)
        try:
            # 真实模型分支先让模型解析，再做本地 schema 和枚举兜底校验。
            content = self._call_parse_model(api_key, model_name, payload)
            parsed = self._validate_parsed_task(content, payload.text)
        except (AuthenticationError, PermissionDeniedError) as exc:
            self._write_log(user.id, payload.text, None, AiStatus.failed.value, model_name, str(exc))
            raise BusinessError(
                ErrorCode.OPENAI_KEY_INVALID,
                "OpenAI API Key 无效或无权限访问该模型",
                status_code=401,
                data={"valid": False},
            ) from exc
        except (OpenAIError, ValueError, ValidationError) as exc:
            # 非鉴权类失败降级到启发式解析，保证创建任务主流程仍可继续。
            parsed = self._mock_parse_task(payload.text, payload.timezone)
            self._write_log(
                user.id,
                payload.text,
                parsed.model_dump(mode="json"),
                AiStatus.mocked.value,
                model_name,
                str(exc),
            )
            return {
                "parsed_task": parsed,
                "ai_status": AiStatus.mocked.value,
                "model_name": model_name,
            }

        self._write_log(user.id, payload.text, parsed.model_dump(mode="json"), AiStatus.success.value, model_name)
        return {
            "parsed_task": parsed,
            "ai_status": AiStatus.success.value,
            "model_name": model_name,
        }

    def create_task_by_ai(self, user: User, payload: CreateTaskByAiRequest) -> dict:
        parse_result = self.parse_task(user, ParseTaskRequest(text=payload.text, timezone=payload.timezone))
        parsed: AiParsedTask = parse_result["parsed_task"]
        # 先把 AI 解析结果转成普通创建 payload，后续覆盖逻辑复用任务服务校验。
        task_data = TaskCreate(
            title=parsed.title,
            description=parsed.description,
            priority=parsed.priority,
            category=parsed.category,
            due_time=parsed.due_time,
        )
        if payload.overrides:
            # 用户显式覆盖优先于 AI 建议，用于前端确认页修正分类、优先级等字段。
            merged = task_data.model_dump()
            for key, value in payload.overrides.model_dump(exclude_unset=True).items():
                merged[key] = value
            task_data = TaskCreate(**merged)

        task = TaskService(self.db).create_task(user, task_data, is_ai_created=True)
        return {
            "task": task,
            "parsed_task": parsed,
            "ai_status": parse_result["ai_status"],
            "model_name": parse_result["model_name"],
        }

    def suggest_task_fields(self, user: User, title: str, description: Optional[str] = None) -> AiSuggestResponse:
        text = f"{title}\n{description or ''}".strip()
        model_name = self.setting_service.get_model_name(user)
        if settings.ai_mock_mode:
            # 字段推荐的 Mock 结果只依赖关键词，避免测试被模型输出波动影响。
            suggestion = self._heuristic_suggestion(text)
            self._write_log(user.id, text, suggestion.model_dump(mode="json"), AiStatus.mocked.value, model_name)
            return suggestion

        api_key = self.setting_service.require_openai_api_key(user)
        try:
            content = self._call_suggest_model(api_key, model_name, title, description)
            suggestion = self._validate_suggestion(content, text)
        except (AuthenticationError, PermissionDeniedError) as exc:
            self._write_log(user.id, text, None, AiStatus.failed.value, model_name, str(exc))
            raise BusinessError(
                ErrorCode.OPENAI_KEY_INVALID,
                "OpenAI API Key 无效或无权限访问该模型",
                status_code=401,
                data={"valid": False},
            ) from exc
        except (OpenAIError, ValueError, ValidationError) as exc:
            # 推荐失败不阻塞用户编辑任务，退回本地关键词规则并标记为 mocked。
            suggestion = self._heuristic_suggestion(text)
            self._write_log(
                user.id,
                text,
                suggestion.model_dump(mode="json"),
                AiStatus.mocked.value,
                model_name,
                str(exc),
            )
            return suggestion

        self._write_log(user.id, text, suggestion.model_dump(mode="json"), AiStatus.success.value, model_name)
        return suggestion

    def list_logs(
        self,
        user: User,
        page: int,
        page_size: int,
        log_status: Optional[str] = None,
    ) -> tuple[list[AiCallLog], int]:
        query = self.db.query(AiCallLog).filter(AiCallLog.user_id == user.id)
        if log_status:
            query = query.filter(AiCallLog.status == log_status)
        # total 是过滤后的日志总数，items 再按创建时间倒序分页。
        total = query.count()
        items = (
            query.order_by(AiCallLog.created_at.desc(), AiCallLog.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def chat(
        self,
        user: User,
        messages: list[AiChatMessage],
        model_name: Optional[str] = None,
        follow_up_mode: bool = False,
        agent_mode: bool = False,
        timezone_name: str = "Asia/Shanghai",
    ) -> AiChatResponse:
        resolved_model_name = model_name or self.setting_service.get_model_name(user)
        if agent_mode:
            # Agent 模式会读取任务列表并可能写库，普通聊天只透传模型响应。
            return self._agent_chat(user, messages, resolved_model_name, follow_up_mode, timezone_name)

        api_key = self.setting_service.require_openai_api_key(user)
        try:
            content = self._call_chat_model(api_key, resolved_model_name, messages)
        except (AuthenticationError, PermissionDeniedError) as exc:
            raise BusinessError(
                ErrorCode.OPENAI_KEY_INVALID,
                "OpenAI API Key 无效或无权限访问该模型",
                status_code=401,
                data={"valid": False},
            ) from exc
        except APIConnectionError as exc:
            raise BusinessError(
                ErrorCode.AI_PARSE_FAILED,
                "AI 服务连接失败，请检查网络或稍后重试",
                status_code=502,
            ) from exc
        except (OpenAIError, ValueError) as exc:
            raise BusinessError(
                ErrorCode.AI_PARSE_FAILED,
                "AI 聊天请求失败，请稍后重试",
                status_code=502,
            ) from exc

        return AiChatResponse(content=content, model_name=resolved_model_name)

    def _agent_chat(
        self,
        user: User,
        messages: list[AiChatMessage],
        model_name: str,
        follow_up_mode: bool,
        timezone_name: str,
    ) -> AiChatResponse:
        api_key = self.setting_service.require_openai_api_key(user)
        try:
            # Agent 先让模型产出结构化决策，再由后端白名单执行，避免模型直接操作数据库。
            content = self._call_agent_model(api_key, model_name, messages, user, follow_up_mode, timezone_name)
            decision = self._validate_agent_decision(content)
            response = self._execute_agent_decision(user, decision, model_name, follow_up_mode)
        except (AuthenticationError, PermissionDeniedError) as exc:
            raise BusinessError(
                ErrorCode.OPENAI_KEY_INVALID,
                "OpenAI API Key 无效或无权限访问该模型",
                status_code=401,
                data={"valid": False},
            ) from exc
        except APIConnectionError as exc:
            raise BusinessError(
                ErrorCode.AI_PARSE_FAILED,
                "AI 服务连接失败，请检查网络或稍后重试",
                status_code=502,
            ) from exc
        except (OpenAIError, ValueError, ValidationError) as exc:
            raise BusinessError(
                ErrorCode.AI_PARSE_FAILED,
                "AI Agent 决策失败，请稍后重试",
                status_code=502,
            ) from exc

        self._write_log(
            user.id,
            self._latest_user_text(messages),
            {
                # 日志记录决策和后端执行结果，方便排查模型判断和实际写库是否一致。
                "decision": decision,
                "response": {
                    "content": response.content,
                    "agent_action": response.agent_action,
                    "task_changed": response.task_changed,
                },
            },
            AiStatus.success.value,
            model_name,
        )
        return response

    def _call_chat_model(self, api_key: str, model_name: str, messages: list[AiChatMessage]) -> str:
        client = self._client_for_model(api_key, model_name)
        response = self._run_with_model_dns(
            model_name,
            lambda: client.chat.completions.create(
                model=model_name,
                messages=[message.model_dump() for message in messages],
                temperature=0.7,
            ),
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI provider returned empty content")
        return content

    def _call_agent_model(
        self,
        api_key: str,
        model_name: str,
        messages: list[AiChatMessage],
        user: User,
        follow_up_mode: bool,
        timezone_name: str,
    ) -> str:
        client = self._client_for_model(api_key, model_name)
        now = self._now_for_timezone(timezone_name)
        tasks, total = TaskService(self.db).list_tasks(user, page=1, page_size=80)
        # 只给模型当前用户的任务摘要和 ID 白名单，后端仍会再次校验任务归属。
        task_json = json.dumps([self._task_to_agent_dict(task) for task in tasks], ensure_ascii=False)
        system_prompt = (
            "你是 AI-agent-TODO 的后端任务 Agent。你必须先判断用户是在普通聊天，还是要操作任务，"
            "然后只返回一个合法 JSON 对象，不要输出 Markdown。\n"
            f"当前时间：{now.isoformat()}；时区：{timezone_name}；追问模式：{'开启' if follow_up_mode else '关闭'}。\n"
            f"当前用户任务共 {total} 条，下面最多列出 80 条，任务 ID 只能从这里选择：{task_json}\n"
            "返回 JSON schema："
            "{\"action\":\"chat|follow_up|create_task|list_tasks|show_task|update_task|delete_task|set_task_status\","
            "\"message\":\"给用户看的中文回复\","
            "\"uncertain_fields\":[\"due_time|priority|category|title|description|target_task|updates|status\"],"
            "\"task\":{\"title\":\"\",\"description\":null,\"priority\":\"low|medium|high\",\"category\":null,\"due_time\":null},"
            "\"target_task_id\":null,"
            "\"target_query\":null,"
            "\"filters\":{\"status\":null,\"priority\":null,\"category\":null,\"keyword\":null},"
            "\"updates\":{\"title\":null,\"description\":null,\"priority\":null,\"category\":null,\"due_time\":null,\"status\":null}}。\n"
            "规则：普通问答用 chat。创建任务用 create_task，并给出完整 task。查询列表用 list_tasks。"
            "查看、修改、删除、完成、恢复任务必须定位到唯一任务；能定位时填 target_task_id。"
            "完成任务填 action=set_task_status 且 updates.status=done；恢复任务填 status=todo。"
            "如果追问模式开启，且用户目标、创建内容、修改内容、任务匹配、截止时间、优先级、分类、状态等任何任务 JSON 字段不清楚，"
            "必须返回 follow_up，并把不确定字段写入 uncertain_fields，在 message 里一次性追问；不要用默认值硬填。"
            "如果追问模式关闭，可在安全范围内为创建任务使用合理默认值，但仍要避免编造截止时间。"
            "删除、修改、完成、恢复这类会改变数据的操作，如果不能唯一确定任务，即使追问模式关闭也返回 follow_up，不能猜。"
            "用户回复序号、'第一个'、更完整标题时，要结合前文 assistant 的候选列表和当前任务列表判断。"
            "不要编造任务 ID；due_time 使用 ISO 8601 字符串或 null。"
        )
        response = self._run_with_model_dns(
            model_name,
            lambda: client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    *[message.model_dump() for message in messages],
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            ),
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI provider returned empty content")
        return content

    def _validate_agent_decision(self, content: str) -> dict[str, Any]:
        data = self._json_loads(content)
        action = str(data.get("action") or "chat").strip().lower().replace("-", "_")
        # 未知 action 统一降级为 chat，避免模型输出新动作时误触发写操作。
        data["action"] = action if action in AGENT_ACTIONS else "chat"
        if not isinstance(data.get("message"), str):
            data["message"] = ""
        uncertain_fields = data.get("uncertain_fields")
        if isinstance(uncertain_fields, str):
            data["uncertain_fields"] = [uncertain_fields.strip()] if uncertain_fields.strip() else []
        elif isinstance(uncertain_fields, list):
            data["uncertain_fields"] = [str(field).strip() for field in uncertain_fields if str(field).strip()]
        else:
            data["uncertain_fields"] = []
        for key in ("task", "filters", "updates"):
            # 任务、过滤器、更新字段必须是对象，后续执行阶段只从这些字典里取值。
            if not isinstance(data.get(key), dict):
                data[key] = {}
        return data

    def _execute_agent_decision(self, user: User, decision: dict[str, Any], model_name: str, follow_up_mode: bool = False) -> AiChatResponse:
        action = decision["action"]
        message = str(decision.get("message") or "").strip()
        task_service = TaskService(self.db)

        if action == "chat":
            return AiChatResponse(content=message or "我在。", model_name=model_name, agent_action=action)

        if action == "follow_up":
            return AiChatResponse(content=message or "请再补充一点信息。", model_name=model_name, agent_action=action)

        uncertain_fields = self._agent_uncertain_fields(decision)
        if follow_up_mode and uncertain_fields:
            # 追问模式下任何关键字段不确定都不写库，让用户先补齐信息。
            return AiChatResponse(
                content=message or self._format_uncertain_fields_follow_up(uncertain_fields),
                model_name=model_name,
                agent_action="follow_up",
            )

        if action == "create_task":
            task_data = self._agent_task_create(decision.get("task") or {})
            if not task_data:
                # 创建任务至少需要可用标题；过泛的标题会被当成信息不足处理。
                return AiChatResponse(
                    content=message or "请补充要创建的任务内容。",
                    model_name=model_name,
                    agent_action="follow_up",
                )
            task = task_service.create_task(user, task_data, is_ai_created=True)
            return AiChatResponse(
                content=message or f"已创建任务：{task.title}",
                model_name=model_name,
                agent_action=action,
                task_changed=True,
                task=TaskRead.model_validate(task),
            )

        if action == "list_tasks":
            filters = decision.get("filters") or {}
            # 查询只接受后端可识别的筛选字段，忽略模型额外生成的复杂条件。
            items, total = task_service.list_tasks(
                user,
                page=1,
                page_size=20,
                status=self._agent_status(filters.get("status")),
                priority=self._agent_priority(filters.get("priority"), default=None),
                category=self._optional_short_text(filters.get("category"), 50),
                keyword=self._optional_short_text(filters.get("keyword"), 100),
            )
            return AiChatResponse(
                content=message or self._format_task_list(items, total),
                model_name=model_name,
                agent_action=action,
            )

        if action == "show_task":
            task, candidates = self._resolve_agent_task(user, decision)
            if not task:
                # 未定位到唯一任务时返回候选项，避免查看或后续修改落到错误任务。
                return AiChatResponse(
                    content=message or self._format_task_follow_up(candidates, "查看"),
                    model_name=model_name,
                    agent_action="follow_up",
                )
            return AiChatResponse(
                content=message or self._format_task_detail(task),
                model_name=model_name,
                agent_action=action,
                task=TaskRead.model_validate(task),
            )

        if action == "set_task_status":
            task, candidates = self._resolve_agent_task(user, decision)
            status = self._agent_status((decision.get("updates") or {}).get("status"))
            if not task or not status:
                # 状态更新同时要求唯一任务和合法状态，缺一项都进入追问。
                return AiChatResponse(
                    content=message or self._format_task_follow_up(candidates, "更新状态"),
                    model_name=model_name,
                    agent_action="follow_up",
                )
            updated = task_service.update_status(user, task.id, TaskStatusUpdate(status=status))
            return AiChatResponse(
                content=message or f"已将任务“{updated.title}”标记为{self._status_label(updated.status)}。",
                model_name=model_name,
                agent_action=action,
                task_changed=True,
                task=TaskRead.model_validate(updated),
            )

        if action == "update_task":
            task, candidates = self._resolve_agent_task(user, decision)
            update_data = self._agent_task_update(decision.get("updates") or {})
            if not task or not update_data:
                # update_data 为空表示模型没有给出可执行字段，不能提交空更新。
                return AiChatResponse(
                    content=message or self._format_task_follow_up(candidates, "修改"),
                    model_name=model_name,
                    agent_action="follow_up",
                )
            updated = task_service.update_task(user, task.id, TaskUpdate(**update_data))
            return AiChatResponse(
                content=message or f"已修改任务：{self._format_task_line(updated)}",
                model_name=model_name,
                agent_action=action,
                task_changed=True,
                task=TaskRead.model_validate(updated),
            )

        if action == "delete_task":
            task, candidates = self._resolve_agent_task(user, decision)
            if not task:
                # 删除是破坏性操作，必须定位到唯一任务后才执行。
                return AiChatResponse(
                    content=message or self._format_task_follow_up(candidates, "删除"),
                    model_name=model_name,
                    agent_action="follow_up",
                )
            title = task.title
            task_service.delete_task(user, task.id)
            return AiChatResponse(
                content=message or f"已删除任务：“{title}”。",
                model_name=model_name,
                agent_action=action,
                task_changed=True,
            )

        return AiChatResponse(content=message or "我还不能执行这个操作。", model_name=model_name, agent_action="chat")

    def _latest_user_text(self, messages: list[AiChatMessage]) -> str:
        for message in reversed(messages):
            if message.role == "user":
                return message.content
        return messages[-1].content if messages else ""

    def _task_to_agent_dict(self, task: Any) -> dict[str, Any]:
        return {
            "id": task.id,
            "title": task.title,
            "description": (task.description or "")[:300],
            "priority": task.priority,
            "category": task.category,
            "due_time": task.due_time.isoformat() if task.due_time else None,
            "status": task.status,
            "created_at": task.created_at.isoformat() if task.created_at else None,
            "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        }

    def _agent_task_create(self, data: dict[str, Any]) -> Optional[TaskCreate]:
        title = self._optional_short_text(data.get("title"), 100)
        if not title or title in {"弄一下", "处理一下", "搞一下", "任务", "待办", "事情", "这个", "那个"}:
            # 泛化占位标题无法代表明确任务，交回前端追问。
            return None
        return TaskCreate(
            title=title,
            description=self._optional_short_text(data.get("description"), 2000),
            priority=self._agent_priority(data.get("priority"), default=Priority.medium) or Priority.medium,
            category=self._optional_short_text(data.get("category"), 50) or "未分类",
            due_time=self._parse_agent_datetime(data.get("due_time")),
        )

    def _agent_task_update(self, data: dict[str, Any]) -> dict[str, Any]:
        update_data: dict[str, Any] = {}
        title = self._optional_short_text(data.get("title"), 100)
        if title:
            update_data["title"] = title
        if "description" in data:
            description = self._optional_short_text(data.get("description"), 2000)
            if description:
                # Agent 更新目前只采纳非空文本，避免模型把 null 当成“清空字段”误操作。
                update_data["description"] = description
        priority = self._agent_priority(data.get("priority"), default=None)
        if priority:
            update_data["priority"] = priority
        if "category" in data:
            category = self._optional_short_text(data.get("category"), 50)
            if category:
                update_data["category"] = category
        due_time = self._parse_agent_datetime(data.get("due_time"))
        if due_time:
            update_data["due_time"] = due_time
        status = self._agent_status(data.get("status"))
        if status:
            update_data["status"] = status
        return update_data

    def _agent_uncertain_fields(self, decision: dict[str, Any]) -> list[str]:
        fields = [str(field).strip() for field in decision.get("uncertain_fields", []) if str(field).strip()]
        action = decision.get("action")
        if action == "create_task":
            task_data = decision.get("task") or {}
            if task_data.get("due_time") and not self._parse_agent_datetime(task_data.get("due_time")):
                # 模型给了无法解析的截止时间时也视为不确定，避免静默丢失用户时间意图。
                fields.append("due_time")
        if action == "update_task":
            updates = decision.get("updates") or {}
            if updates.get("due_time") and not self._parse_agent_datetime(updates.get("due_time")):
                fields.append("due_time")
        normalized: list[str] = []
        for field in fields:
            # 统一中英文和别名字段，追问文案才能稳定映射成人类可读标签。
            canonical = field.lower().replace("-", "_").replace(".", "_")
            canonical = {
                "deadline": "due_time",
                "due": "due_time",
                "time": "due_time",
                "目标任务": "target_task",
                "修改内容": "updates",
            }.get(canonical, canonical)
            if canonical not in normalized:
                normalized.append(canonical)
        return normalized

    def _format_uncertain_fields_follow_up(self, fields: list[str]) -> str:
        labels = {
            "title": "任务标题",
            "description": "任务描述",
            "priority": "优先级",
            "category": "分类",
            "due_time": "截止时间",
            "target_task": "目标任务",
            "target_task_id": "目标任务",
            "target_query": "目标任务",
            "updates": "修改内容",
            "status": "任务状态",
        }
        readable = []
        for field in fields:
            label = labels.get(field, field)
            if label not in readable:
                readable.append(label)
        if not readable:
            return "我还不能确定任务信息，请再补充一下。"
        return f"我还不能确定{self._join_zh_list(readable)}，请补充后我再执行。"

    def _join_zh_list(self, items: list[str]) -> str:
        if len(items) <= 1:
            return items[0] if items else ""
        return "、".join(items[:-1]) + f"和{items[-1]}"

    def _resolve_agent_task(self, user: User, decision: dict[str, Any]) -> tuple[Any | None, list[Any]]:
        task_service = TaskService(self.db)
        target_id = decision.get("target_task_id")
        if target_id not in (None, ""):
            try:
                # 即使模型给出 ID，也通过 TaskService 校验当前用户是否拥有该任务。
                return task_service.get_task(user, int(target_id)), []
            except (BusinessError, TypeError, ValueError):
                return None, []

        query = self._optional_short_text(decision.get("target_query"), 100)
        if not query:
            return None, []

        # 没有 ID 时用关键词做候选匹配；只有唯一命中才允许自动执行。
        matches, _ = task_service.list_tasks(user, page=1, page_size=10, keyword=query)
        if len(matches) == 1:
            return matches[0], []
        return None, matches

    def _agent_priority(self, value: Any, default: Optional[Priority] = Priority.medium) -> Optional[Priority]:
        if value in (None, ""):
            return default
        try:
            return Priority(str(value).strip().lower())
        except ValueError:
            # 非法优先级回到调用方指定默认值，创建时默认 medium，过滤时可返回 None。
            return default

    def _agent_status(self, value: Any) -> Optional[TaskStatus]:
        if value in (None, ""):
            return None
        normalized = str(value).strip().lower()
        if normalized in {"done", "完成", "已完成", "complete", "completed"}:
            return TaskStatus.done
        if normalized in {"todo", "待办", "未完成", "open", "reopen"}:
            return TaskStatus.todo
        try:
            return TaskStatus(normalized)
        except ValueError:
            # 状态无法识别时不猜测，调用方会转入追问或忽略该条件。
            return None

    def _parse_agent_datetime(self, value: Any) -> Optional[datetime]:
        if isinstance(value, datetime):
            return value
        text = self._optional_short_text(value, 80)
        if not text:
            return None
        if text.endswith("Z"):
            text = f"{text[:-1]}+00:00"
        try:
            # Agent 提示词要求 ISO 8601，这里只解析标准格式，避免自然语言时间被误读。
            return datetime.fromisoformat(text)
        except ValueError:
            return None

    def _optional_short_text(self, value: Any, max_length: int) -> Optional[str]:
        if value is None:
            return None
        text = str(value).strip()
        if not text or text.lower() in {"null", "none", "undefined"}:
            return None
        return text[:max_length]

    def _format_task_list(self, tasks: list[Any], total: int) -> str:
        if not tasks:
            return "没有找到符合条件的任务。"
        lines = [self._format_task_line(task) for task in tasks]
        more = f"\n还有 {total - len(tasks)} 条未显示。" if total > len(tasks) else ""
        return f"找到 {total} 条任务：\n" + "\n".join(lines) + more

    def _format_task_follow_up(self, candidates: list[Any], action_label: str) -> str:
        if candidates:
            lines = "\n".join(f"{index}. {self._format_task_line(task)}" for index, task in enumerate(candidates[:6], start=1))
            return f"我找到了多个可能要{action_label}的任务，请回复序号或更完整的任务标题：\n{lines}"
        return f"请说明你要{action_label}哪个任务。"

    def _format_task_detail(self, task: Any) -> str:
        rows = [
            f"任务：{task.title}",
            f"状态：{self._status_label(task.status)}",
            f"优先级：{self._priority_label(task.priority)}",
            f"分类：{task.category or '未分类'}",
            f"截止时间：{task.due_time.isoformat() if task.due_time else '无'}",
        ]
        if task.description:
            rows.append(f"描述：{task.description}")
        return "\n".join(rows)

    def _format_task_line(self, task: Any) -> str:
        due = task.due_time.isoformat() if task.due_time else "无截止时间"
        return f"#{task.id} {task.title}（{self._status_label(task.status)}，{self._priority_label(task.priority)}，{task.category or '未分类'}，{due}）"

    def _priority_label(self, priority: Any) -> str:
        return {
            Priority.high.value: "高",
            Priority.medium.value: "中",
            Priority.low.value: "低",
        }.get(str(priority), str(priority))

    def _status_label(self, status: Any) -> str:
        return {
            TaskStatus.todo.value: "待办",
            TaskStatus.done.value: "已完成",
        }.get(str(status), str(status))

    def _call_parse_model(self, api_key: str, model_name: str, payload: ParseTaskRequest) -> str:
        prompt = (
            PROMPT_PATH.read_text(encoding="utf-8")
            .replace("{timezone}", payload.timezone)
            .replace("{now}", self._now_for_timezone(payload.timezone).isoformat())
            .replace("{text}", payload.text)
        )
        client = self._client_for_model(api_key, model_name)
        response = self._run_with_model_dns(
            model_name,
            lambda: client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "你是严谨的任务解析 Agent，只输出合法 JSON。"},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            ),
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI provider returned empty content")
        return content

    def _call_suggest_model(
        self,
        api_key: str,
        model_name: str,
        title: str,
        description: Optional[str],
    ) -> str:
        client = self._client_for_model(api_key, model_name)
        response = self._run_with_model_dns(
            model_name,
            lambda: client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "你是任务管理助手。请只返回 JSON，字段为 priority、category、reason；"
                            "priority 只能是 low、medium、high。"
                        ),
                    },
                    {"role": "user", "content": f"标题：{title}\n描述：{description or ''}"},
                ],
                temperature=0.1,
                response_format={"type": "json_object"},
            ),
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("AI provider returned empty content")
        return content

    def _validate_parsed_task(self, content: str, raw_text: str) -> AiParsedTask:
        data = self._json_loads(content)
        data["title"] = self._safe_title(data.get("title"), raw_text)
        data["priority"] = self._safe_priority(data.get("priority"))
        data["category"] = self._safe_category(data.get("category"))
        if not data.get("raw_due_text"):
            data["raw_due_text"] = None
        return AiParsedTask(**data)

    def _validate_suggestion(self, content: str, fallback_text: str) -> AiSuggestResponse:
        data = self._json_loads(content)
        data["priority"] = self._safe_priority(data.get("priority"))
        data["category"] = self._safe_category(data.get("category")) or self._heuristic_category(fallback_text)
        data["reason"] = data.get("reason") or "根据任务标题和描述自动推荐"
        return AiSuggestResponse(**data)

    def _json_loads(self, content: str) -> dict[str, Any]:
        cleaned = content.strip()
        if cleaned.startswith("```"):
            # 兼容模型偶尔包上 Markdown 代码块的情况，但最终仍要求 JSON 对象。
            cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
        data = json.loads(cleaned)
        if not isinstance(data, dict):
            raise ValueError("AI response is not a JSON object")
        return data

    def _mock_parse_task(self, text: str, timezone_name: str) -> AiParsedTask:
        due_time, raw_due_text = self._mock_due_time(text, timezone_name)
        # Mock 解析用固定置信度和关键词规则，覆盖离线演示的核心任务字段。
        return AiParsedTask(
            title=self._safe_title(self._strip_time_words(text), text),
            description=None,
            priority=self._heuristic_priority(text),
            category=self._heuristic_category(text),
            due_time=due_time,
            confidence=0.68,
            raw_due_text=raw_due_text,
        )

    def _heuristic_suggestion(self, text: str) -> AiSuggestResponse:
        return AiSuggestResponse(
            priority=self._heuristic_priority(text),
            category=self._heuristic_category(text),
            reason="AI Mock 模式或服务兜底：根据关键词推荐分类与优先级",
        )

    def _mock_due_time(self, text: str, timezone_name: str) -> tuple[Optional[datetime], Optional[str]]:
        now = self._now_for_timezone(timezone_name)
        target_date = None
        raw = None
        # Mock 只识别少量中文相对日期，超出范围保持 None，避免伪造截止时间。
        if "后天" in text:
            target_date = now.date() + timedelta(days=2)
            raw = "后天"
        elif "明天" in text:
            target_date = now.date() + timedelta(days=1)
            raw = "明天"
        elif "今天" in text:
            target_date = now.date()
            raw = "今天"

        if target_date is None:
            return None, None

        hour = 9
        minute = 0
        if "下午" in text or "晚上" in text:
            hour = 15
        elif "中午" in text:
            hour = 12
        elif "上午" in text or "早上" in text:
            hour = 9

        match = re.search(r"(\d{1,2})\s*[点:]\s*(\d{1,2})?", text)
        if match:
            # 处理“下午三点/15:30”这类简单时间，分钟和小时都做边界裁剪。
            hour = int(match.group(1))
            if ("下午" in text or "晚上" in text) and hour < 12:
                hour += 12
            minute = int(match.group(2) or 0)
            raw = f"{raw or ''}{match.group(0)}".strip()
        return datetime.combine(target_date, datetime.min.time(), tzinfo=now.tzinfo).replace(
            hour=min(hour, 23),
            minute=min(minute, 59),
        ), raw

    def _now_for_timezone(self, timezone_name: str) -> datetime:
        try:
            tz = ZoneInfo(timezone_name)
        except ZoneInfoNotFoundError:
            # 非法时区退回 UTC，保证模型提示和 Mock 时间计算仍能继续。
            tz = timezone.utc
        return utc_now().astimezone(tz)

    def _strip_time_words(self, text: str) -> str:
        result = re.sub(r"(今天|明天|后天|上午|下午|晚上|中午|早上|\d{1,2}\s*[点:]\s*\d{0,2})", "", text)
        result = re.sub(r"[,，。；;]\s*很重要", "", result)
        return result.strip(" ，,。") or text

    def _safe_title(self, value: Any, fallback: str) -> str:
        title = str(value or "").strip() or fallback.strip()
        return title[:100]

    def _safe_priority(self, value: Any) -> str:
        priority = str(value or "").lower()
        return priority if priority in {item.value for item in Priority} else Priority.medium.value

    def _safe_category(self, value: Any) -> Optional[str]:
        category = str(value or "").strip()
        return category[:50] or None

    def _heuristic_priority(self, text: str) -> Priority:
        if any(word in text for word in ["重要", "紧急", "马上", "尽快", "ddl", "截止", "答辩"]):
            return Priority.high
        if any(word in text for word in ["有空", "不急", " someday", "可以"]):
            return Priority.low
        return Priority.medium

    def _heuristic_category(self, text: str) -> str:
        mapping = {
            "学习": ["学习", "作业", "课程", "考试", "报告", "论文"],
            "工作": ["工作", "会议", "客户", "需求", "周报"],
            "项目": ["项目", "开发", "代码", "接口", "答辩", "PPT"],
            "生活": ["买", "取", "洗", "做饭", "健身", "体检"],
        }
        for category, keywords in mapping.items():
            if any(keyword.lower() in text.lower() for keyword in keywords):
                return category
        return "未分类"

    def _write_log(
        self,
        user_id: int,
        input_text: str,
        output_json: Optional[dict],
        status: str,
        model_name: Optional[str],
        error_message: Optional[str] = None,
    ) -> None:
        # 日志落库不保存完整异常栈，只保留截断后的错误消息用于排查状态和模型问题。
        log = AiCallLog(
            user_id=user_id,
            input_text=input_text,
            output_json=output_json,
            status=status,
            model_name=model_name,
            error_message=error_message[:2000] if error_message else None,
        )
        self.db.add(log)
        self.db.commit()

    def _client_for_model(self, api_key: str, model_name: str) -> OpenAI:
        return OpenAI(api_key=api_key, base_url=self._base_url_for_model(model_name))

    def _base_url_for_model(self, model_name: str) -> str:
        if model_name.lower().startswith(DEEPSEEK_MODEL_PREFIX):
            # DeepSeek 兼容 OpenAI SDK，但需要切换到独立 base_url。
            return settings.deepseek_base_url
        return settings.openai_base_url

    def _run_with_model_dns(self, model_name: str, callback: Callable[[], T]) -> T:
        if not model_name.lower().startswith(DEEPSEEK_MODEL_PREFIX):
            return callback()

        hostname = urllib.parse.urlparse(settings.deepseek_base_url).hostname
        if not hostname or not settings.deepseek_resolve_with_doh:
            return callback()

        ip_address = self._resolve_deepseek_ip(hostname)
        if not ip_address:
            # DoH 失败时回到系统 DNS，网络兜底不应阻断模型调用。
            return callback()

        with _override_hostname_resolution(hostname, ip_address):
            return callback()

    def _resolve_deepseek_ip(self, hostname: str) -> Optional[str]:
        if settings.deepseek_force_resolve_ip:
            # 手动指定 IP 优先级最高，方便部署环境绕过 DNS 污染或调试解析问题。
            return settings.deepseek_force_resolve_ip

        global _DEEPSEEK_DNS_CACHE
        now = time.monotonic()
        if _DEEPSEEK_DNS_CACHE and now - _DEEPSEEK_DNS_CACHE[1] < DEEPSEEK_DNS_CACHE_TTL_SECONDS:
            # 短 TTL 缓存减少每次请求前的 DoH 开销。
            return _DEEPSEEK_DNS_CACHE[0]

        query = urllib.parse.urlencode({"name": hostname, "type": "A"})
        request = urllib.request.Request(
            f"{settings.deepseek_doh_url}?{query}",
            headers={"Accept": "application/dns-json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=3) as response:
                data = json.loads(response.read().decode("utf-8"))
        except Exception:
            # DNS 辅助解析失败不暴露给业务层，由调用方继续使用系统 DNS。
            return None

        for answer in data.get("Answer", []):
            if answer.get("type") == 1 and isinstance(answer.get("data"), str):
                ip_address = answer["data"]
                _DEEPSEEK_DNS_CACHE = (ip_address, now)
                return ip_address
        return None

    def test_openai_key(self, api_key: str, model_name: str) -> dict:
        started_at = time.perf_counter()
        try:
            client = self._client_for_model(api_key, model_name)
            # 用最小 token 的 ping 验证 Key、模型权限和网络连通性，并返回粗略延迟。
            self._run_with_model_dns(
                model_name,
                lambda: client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": "ping"}],
                    max_tokens=1,
                ),
            )
        except (AuthenticationError, PermissionDeniedError) as exc:
            raise BusinessError(
                ErrorCode.OPENAI_KEY_INVALID,
                "OpenAI API Key 无效或无权限访问该模型",
                status_code=401,
                data={"valid": False},
            ) from exc
        except OpenAIError as exc:
            raise BusinessError(
                ErrorCode.OPENAI_KEY_INVALID,
                "OpenAI API Key 测试失败，请检查 Key、模型名称或网络",
                status_code=400,
                data={"valid": False},
            ) from exc
        return {
            "valid": True,
            "model_name": model_name,
            "latency_ms": int((time.perf_counter() - started_at) * 1000),
        }
