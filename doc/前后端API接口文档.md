# AI-agent-TODO 前后端 API 对接文档

## 1. 文档说明

本文档描述当前本地代码已经实现的前后端接口约定，用于联调 `AI-agent-TODO` 后端与 `TaskPilot` 前端。

命名约定：

- `TaskPilot`：当前用户可见产品名
- `AI-agent-TODO`：仓库名、课程项目名、后端历史名称

项目当前形态：

- 后端：FastAPI + Pydantic + SQLAlchemy
- 前端：React + Vite + TypeScript + Fetch API 封装
- 鉴权：JWT Bearer Token
- 响应协议：统一 envelope

本文档以当前本地代码为准，不再使用早期“建议实现”的口径。

## 2. 全局约定

### 2.1 基础地址

本地开发环境：

```text
服务地址：http://127.0.0.1:8000
API 前缀：/api
```

前端默认环境变量：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

当前前端在 [frontend/src/api/client.ts](/Users/fiwoouo/Desktop/软工实验/AI-agent-TODO/frontend/src/api/client.ts:1) 中统一封装请求，因此：

- 文档示例展示完整接口路径，如 `/api/tasks`
- 前端调用时通常传业务路径，如 `/tasks`、`/auth/login`

### 2.2 请求头

除注册、登录、演示登录外，其余接口都需要 Bearer Token：

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

### 2.3 时间格式

时间字段使用 ISO 8601 字符串，例如：

```text
2026-06-20T15:00:00+08:00
```

约定：

- `due_time` 可为空
- 列表筛选中的 `due_from`、`due_to` 使用相同格式
- 统计接口的 `from`、`to` 也使用 ISO 8601

### 2.4 枚举值

#### 任务优先级 `priority`

| 值 | 说明 |
| --- | --- |
| `low` | 低优先级 |
| `medium` | 中优先级 |
| `high` | 高优先级 |

#### 任务状态 `status`

| 值 | 说明 |
| --- | --- |
| `todo` | 待办 |
| `done` | 已完成 |

#### AI 调用状态 `ai_status`

| 值 | 说明 |
| --- | --- |
| `success` | 模型调用成功 |
| `failed` | 调用失败 |
| `mocked` | 使用 Mock / 启发式兜底结果 |

### 2.5 统一响应结构

除删除接口返回 `204 No Content` 外，其余成功响应统一为：

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "request_id": "req_xxx"
}
```

### 2.6 分页结构

列表类接口 `data` 内部统一使用：

```json
{
  "items": [],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total": 52,
    "total_pages": 3
  }
}
```

### 2.7 错误码

| code | 说明 |
| --- | --- |
| `1001` | 参数校验失败 |
| `1002` | 未认证或 Token 无效 |
| `1003` | 无权限访问 |
| `1004` | 资源不存在 |
| `1005` | 资源冲突 |
| `2001` | 用户名或邮箱已存在 |
| `2002` | 用户名、邮箱或密码错误 |
| `3001` | 任务不存在 |
| `4001` | 用户未配置 OpenAI API Key |
| `4002` | OpenAI API Key 无效或模型无权限 |
| `4003` | AI 请求失败 |
| `5000` | 服务端内部错误 |

说明：

- 当前后端对 `422` 会统一包装为 `code = 1001`
- 校验失败 `data.errors` 中会返回字段路径和错误信息

## 3. 核心数据模型

### 3.1 User

```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "created_at": "2026-06-20T10:00:00+08:00",
  "updated_at": "2026-06-20T10:00:00+08:00"
}
```

### 3.2 Task

```json
{
  "id": 101,
  "title": "完成 API 文档",
  "description": "补充接口字段",
  "priority": "high",
  "category": "学习",
  "due_time": "2026-06-21T18:00:00+08:00",
  "status": "todo",
  "is_ai_created": false,
  "created_at": "2026-06-20T10:00:00+08:00",
  "updated_at": "2026-06-20T10:00:00+08:00"
}
```

字段约束：

- `title`：1-100 字
- `description`：可空，最长 2000
- `category`：可空，最长 50

### 3.3 CategoryRead

```json
{
  "name": "项目",
  "task_count": 3
}
```

### 3.4 UserSettingRead

```json
{
  "openai_api_key_masked": "sk-****5678",
  "has_openai_api_key": true,
  "model_name": "deepseek-v4-pro",
  "created_at": "2026-06-20T10:00:00+08:00",
  "updated_at": "2026-06-20T10:00:00+08:00"
}
```

说明：

- 私有 Key 优先于环境变量 Key
- 返回给前端的 Key 永远是脱敏结果
- `has_openai_api_key` 为 true 代表用户私有 Key 或环境变量 Key 至少存在一个

### 3.5 AiParsedTask

```json
{
  "title": "完成软件工程报告",
  "description": null,
  "priority": "high",
  "category": "学习",
  "due_time": "2026-06-21T15:00:00+08:00",
  "confidence": 0.92,
  "raw_due_text": "明天下午三点"
}
```

### 3.6 AiChatResponse

```json
{
  "content": "我已经帮你创建任务。",
  "model_name": "deepseek-v4-pro",
  "agent_action": "create_task",
  "task_changed": true,
  "task": {
    "id": 123,
    "title": "完成软件工程报告",
    "description": null,
    "priority": "high",
    "category": "学习",
    "due_time": "2026-06-21T15:00:00+08:00",
    "status": "todo",
    "is_ai_created": true,
    "created_at": "2026-06-20T10:00:00+08:00",
    "updated_at": "2026-06-20T10:00:00+08:00"
  }
}
```

## 4. 用户认证接口

### 4.1 注册

```http
POST /api/auth/register
```

请求体：

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "12345678"
}
```

成功返回 `201`，`data` 结构：

```json
{
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "created_at": "2026-06-20T10:00:00+08:00",
    "updated_at": "2026-06-20T10:00:00+08:00"
  },
  "access_token": "jwt_token",
  "token_type": "bearer",
  "expires_in": 7200
}
```

### 4.2 登录

```http
POST /api/auth/login
```

请求体：

```json
{
  "account": "alice@example.com",
  "password": "12345678"
}
```

`account` 支持用户名或邮箱。

### 4.3 演示账号登录

```http
POST /api/auth/demo
```

说明：

- 不需要请求体
- 返回真实后端会话和 JWT
- Demo 账号当前固定邮箱为 `demo@aitodo.dev`
- 每次登录都会重置为当前默认模型，并清空 demo 私有 API Key

### 4.4 退出登录

```http
POST /api/auth/logout
```

当前后端返回成功 envelope，前端仍需要自行清理本地 Token。

### 4.5 获取当前用户

```http
GET /api/users/me
```

### 4.6 更新当前用户

```http
PUT /api/users/me
```

请求体示例：

```json
{
  "username": "alice_new",
  "email": "alice_new@example.com"
}
```

## 5. 任务接口

### 5.1 创建任务

```http
POST /api/tasks
```

请求体：

```json
{
  "title": "完成 API 文档",
  "description": "补充接口字段",
  "priority": "high",
  "category": "学习",
  "due_time": "2026-06-21T18:00:00+08:00"
}
```

最小可用请求体：

```json
{
  "title": "只填标题"
}
```

默认值：

- `priority = "medium"`
- `status = "todo"`
- `description = null`
- `category = null`
- `due_time = null`

### 5.2 获取任务列表

```http
GET /api/tasks
```

查询参数：

| 参数 | 说明 |
| --- | --- |
| `page` | 页码，默认 1 |
| `page_size` | 每页数量，默认 20，最大 100 |
| `status` | `todo` 或 `done` |
| `priority` | `low`、`medium`、`high` |
| `category` | 分类名 |
| `keyword` | 标题/描述关键词 |
| `due_from` | 截止时间起始 |
| `due_to` | 截止时间结束 |
| `sort_by` | `created_at`、`due_time`、`priority`、`updated_at` |
| `sort_order` | `asc` 或 `desc` |

### 5.3 获取分类聚合

```http
GET /api/tasks/categories
```

成功返回：

```json
[
  { "name": "项目", "task_count": 1 },
  { "name": "学习", "task_count": 2 }
]
```

### 5.4 获取任务详情

```http
GET /api/tasks/{task_id}
```

### 5.5 更新任务

```http
PUT /api/tasks/{task_id}
```

请求体支持部分字段更新：

```json
{
  "title": "完成 API 文档终稿",
  "description": null,
  "category": null,
  "due_time": null,
  "priority": "medium",
  "status": "todo"
}
```

说明：

- `description`、`category`、`due_time` 显式传 `null` 会清空
- `title` 更新时仍要满足 1-100 字

### 5.6 删除任务

```http
DELETE /api/tasks/{task_id}
```

成功返回 `204 No Content`。

### 5.7 更新任务状态

```http
PATCH /api/tasks/{task_id}/status
```

请求体：

```json
{
  "status": "done"
}
```

返回值：

```json
{
  "id": 101,
  "status": "done",
  "updated_at": "2026-06-20T11:00:00+08:00"
}
```

## 6. AI 接口

### 6.1 解析任务

```http
POST /api/ai/parse-task
```

请求体：

```json
{
  "text": "明天下午三点完成软件工程报告，很重要",
  "timezone": "Asia/Shanghai"
}
```

返回：

```json
{
  "parsed_task": {
    "title": "完成软件工程报告",
    "description": null,
    "priority": "high",
    "category": "学习",
    "due_time": "2026-06-21T15:00:00+08:00",
    "confidence": 0.92,
    "raw_due_text": "明天下午三点"
  },
  "ai_status": "success",
  "model_name": "deepseek-v4-pro"
}
```

### 6.2 解析并创建任务

```http
POST /api/ai/create-task
```

请求体：

```json
{
  "text": "明天下午三点完成软件工程报告，很重要",
  "timezone": "Asia/Shanghai",
  "overrides": {
    "category": "课程"
  }
}
```

说明：

- 后端先做 AI 解析，再按 `overrides` 覆盖部分字段
- 创建出的任务会带 `is_ai_created = true`

### 6.3 字段推荐

```http
POST /api/ai/suggest
```

请求体：

```json
{
  "title": "准备项目答辩 PPT",
  "description": "整理演示流程"
}
```

返回：

```json
{
  "priority": "high",
  "category": "项目",
  "reason": "..."
}
```

### 6.4 AI 聊天 Agent

```http
POST /api/ai/chat
```

请求体：

```json
{
  "model_name": "deepseek-v4-pro",
  "messages": [
    { "role": "user", "content": "帮我创建一个明天下午交报告的任务" }
  ],
  "agent_mode": true,
  "follow_up_mode": false,
  "timezone": "Asia/Shanghai"
}
```

说明：

- `messages` 至少 1 条，最多 30 条
- `role` 只允许 `user`、`assistant`、`system`
- 前端当前默认发送 `agent_mode = true`
- `follow_up_mode = true` 时，信息不明确会优先追问而不是直接执行

返回字段：

| 字段 | 说明 |
| --- | --- |
| `content` | AI 返回给用户的文本 |
| `model_name` | 本次使用的模型 |
| `agent_action` | 执行的动作名，可为空 |
| `task_changed` | 是否改动了任务 |
| `task` | 若改动了任务，返回相关任务 |

### 6.5 AI 日志列表

```http
GET /api/ai/logs
```

查询参数：

| 参数 | 说明 |
| --- | --- |
| `page` | 默认 1 |
| `page_size` | 默认 20，最大 100 |
| `status` | 可选：`success`、`failed`、`mocked` |

## 7. 统计接口

### 7.1 总览

```http
GET /api/stats/overview
```

可选查询参数：

| 参数 | 说明 |
| --- | --- |
| `from` | 按 `created_at` 过滤开始时间 |
| `to` | 按 `created_at` 过滤结束时间 |

返回：

```json
{
  "total_tasks": 4,
  "done_tasks": 2,
  "todo_tasks": 2,
  "completion_rate": 0.5,
  "overdue_tasks": 1,
  "today_due_tasks": 1,
  "ai_created_tasks": 1
}
```

### 7.2 分类统计

```http
GET /api/stats/category
```

支持和 overview 相同的 `from`、`to` 过滤。

### 7.3 优先级统计

```http
GET /api/stats/priority
```

返回示例：

```json
[
  { "priority": "high", "total": 2, "done": 1, "todo": 1 },
  { "priority": "medium", "total": 1, "done": 1, "todo": 0 },
  { "priority": "low", "total": 1, "done": 0, "todo": 1 }
]
```

### 7.4 趋势统计

```http
GET /api/stats/trend?days=7
```

参数：

| 参数 | 说明 |
| --- | --- |
| `days` | 1-30，默认 7 |

返回：

```json
[
  { "date": "2026-06-14", "created": 0, "done": 0 },
  { "date": "2026-06-20", "created": 4, "done": 2 }
]
```

## 8. 设置接口

### 8.1 获取设置

```http
GET /api/settings
```

### 8.2 更新设置

```http
PUT /api/settings
```

请求体：

```json
{
  "openai_api_key": "sk-user-secret",
  "model_name": "deepseek-v4-pro"
}
```

说明：

- 若未提交 `openai_api_key` 字段，则不覆盖已保存 Key
- 若显式提交 `null` 或空字符串，表示清空已保存 Key
- `model_name` 最长 100 字符

### 8.3 测试 Key

```http
POST /api/settings/test-openai-key
```

请求体：

```json
{
  "openai_api_key": "sk-user-secret",
  "model_name": "deepseek-v4-pro"
}
```

说明：

- `openai_api_key` 可省略，后端会使用当前已保存 Key 或环境变量 Key
- 当前接口名称沿用 `test-openai-key`，但实际也可测试 DeepSeek 模型名

成功返回：

```json
{
  "valid": true,
  "model_name": "deepseek-v4-pro",
  "latency_ms": 850
}
```

## 9. 前端联调说明

当前前端不使用 Axios，而是在 [frontend/src/api/client.ts](/Users/fiwoouo/Desktop/软工实验/AI-agent-TODO/frontend/src/api/client.ts:1) 中用 Fetch API 封装：

- 自动拼接 `VITE_API_BASE_URL`
- 自动附加 `Content-Type: application/json`
- 若存在 token，则附加 `Authorization: Bearer ...`
- 自动解析统一 envelope
- 非 `code === 0` 或非 2xx 时抛出 `ApiError`

当前主要 API 模块：

- [frontend/src/api/auth.ts](/Users/fiwoouo/Desktop/软工实验/AI-agent-TODO/frontend/src/api/auth.ts:1)
- [frontend/src/api/tasks.ts](/Users/fiwoouo/Desktop/软工实验/AI-agent-TODO/frontend/src/api/tasks.ts:1)
- [frontend/src/api/stats.ts](/Users/fiwoouo/Desktop/软工实验/AI-agent-TODO/frontend/src/api/stats.ts:1)
- [frontend/src/api/settings.ts](/Users/fiwoouo/Desktop/软工实验/AI-agent-TODO/frontend/src/api/settings.ts:1)
- [frontend/src/api/ai.ts](/Users/fiwoouo/Desktop/软工实验/AI-agent-TODO/frontend/src/api/ai.ts:1)

联调时请优先参考这些文件中的真实路径和返回类型。
