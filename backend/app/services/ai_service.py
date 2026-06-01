import json
import re
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from openai import OpenAI, OpenAIError, AuthenticationError, PermissionDeniedError
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.errors import BusinessError, ErrorCode
from app.models.ai_call_log import AiCallLog
from app.models.task import Task
from app.models.user import User
from app.schemas.ai import AiParsedTask, AiSuggestResponse, CreateTaskByAiRequest, ParseTaskRequest
from app.schemas.task import AiStatus, Priority, TaskCreate, TaskStatus
from app.services.setting_service import SettingService
from app.utils.datetime import utc_now

PROMPT_PATH = Path(__file__).resolve().parents[1] / "prompts" / "parse_task.md"


class AiService:
    """AI Agent service for task parsing, suggestions, and call logging."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.setting_service = SettingService(db)

    def parse_task(self, user: User, payload: ParseTaskRequest) -> dict:
        model_name = self.setting_service.get_model_name(user)
        if settings.ai_mock_mode:
            parsed = self._mock_parse_task(payload.text, payload.timezone)
            self._write_log(user.id, payload.text, parsed.model_dump(mode="json"), AiStatus.mocked.value, model_name)
            return {
                "parsed_task": parsed,
                "ai_status": AiStatus.mocked.value,
                "model_name": model_name,
            }

        api_key = self.setting_service.require_openai_api_key(user)
        try:
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
        task_data = TaskCreate(
            title=parsed.title,
            description=parsed.description,
            priority=parsed.priority,
            category=parsed.category,
            due_time=parsed.due_time,
        )
        if payload.overrides:
            merged = task_data.model_dump()
            for key, value in payload.overrides.model_dump(exclude_unset=True).items():
                merged[key] = value
            task_data = TaskCreate(**merged)

        task = Task(
            user_id=user.id,
            title=task_data.title,
            description=task_data.description,
            priority=task_data.priority.value,
            category=task_data.category,
            due_time=task_data.due_time,
            status=TaskStatus.todo.value,
            is_ai_created=True,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
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
        total = query.count()
        items = (
            query.order_by(AiCallLog.created_at.desc(), AiCallLog.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )
        return items, total

    def _call_parse_model(self, api_key: str, model_name: str, payload: ParseTaskRequest) -> str:
        prompt = (
            PROMPT_PATH.read_text(encoding="utf-8")
            .replace("{timezone}", payload.timezone)
            .replace("{now}", self._now_for_timezone(payload.timezone).isoformat())
            .replace("{text}", payload.text)
        )
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": "你是严谨的任务解析 Agent，只输出合法 JSON。"},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("OpenAI returned empty content")
        return content

    def _call_suggest_model(
        self,
        api_key: str,
        model_name: str,
        title: str,
        description: Optional[str],
    ) -> str:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
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
        )
        content = response.choices[0].message.content
        if not content:
            raise ValueError("OpenAI returned empty content")
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
            cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
        data = json.loads(cleaned)
        if not isinstance(data, dict):
            raise ValueError("AI response is not a JSON object")
        return data

    def _mock_parse_task(self, text: str, timezone_name: str) -> AiParsedTask:
        due_time, raw_due_text = self._mock_due_time(text, timezone_name)
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

    def test_openai_key(self, api_key: str, model_name: str) -> dict:
        started_at = time.perf_counter()
        try:
            client = OpenAI(api_key=api_key)
            client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
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
