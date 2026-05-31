# AI-agent-TODO 前后端 API 对接文档

## 1. 文档说明

本文档用于 **AI-agent-TODO 智能任务管理系统** 的前后端联调，覆盖 MVP 阶段需要实现的用户认证、任务管理、AI 任务解析、统计分析和 BYOK 设置接口。

前端技术栈建议为 React + Vite + TypeScript + Axios，后端技术栈建议为 FastAPI + Pydantic + SQLAlchemy。接口风格采用 RESTful API，数据格式统一使用 JSON。

## 2. 全局约定

### 2.1 基础地址

本地开发环境：

```text
服务地址：http://127.0.0.1:8000
API 前缀：/api
```

前端可通过环境变量配置：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

说明：

- 本文档接口路径均展示完整 API 路径，例如 `/api/tasks`。
- 如果前端 `baseURL` 已配置为 `http://127.0.0.1:8000/api`，请求时应使用 `/tasks`，避免拼成 `/api/api/tasks`。

### 2.2 请求头

除注册、登录接口外，其余接口默认需要携带 JWT Token。

```http
Content-Type: application/json
Authorization: Bearer <access_token>
```

### 2.3 时间格式

接口时间字段统一使用 ISO 8601 字符串。

```text
2026-06-01T15:00:00+08:00
```

约定：

- 后端入库建议统一转换为 UTC 时间。
- 前端展示时根据浏览器本地时区格式化。
- `due_time` 可为空，表示任务暂无截止时间。

### 2.4 枚举值

#### 任务优先级 `priority`

| 值 | 说明 | 前端展示建议 |
| --- | --- | --- |
| `low` | 低优先级 | 低 |
| `medium` | 中优先级 | 中 |
| `high` | 高优先级 | 高 |

#### 任务状态 `status`

| 值 | 说明 | 前端展示建议 |
| --- | --- | --- |
| `todo` | 未完成 | 待办 |
| `done` | 已完成 | 已完成 |

#### AI 调用状态 `ai_status`

| 值 | 说明 |
| --- | --- |
| `success` | 调用成功 |
| `failed` | 调用失败 |
| `mocked` | Mock 兜底结果 |

### 2.5 统一响应结构

除 `204 No Content` 删除响应外，所有业务接口建议返回统一结构，便于前端统一拦截处理。

```json
{
  "code": 0,
  "message": "ok",
  "data": {},
  "request_id": "req_202606011500000001"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `code` | number | 是 | 业务状态码，`0` 表示成功 |
| `message` | string | 是 | 状态说明或错误提示 |
| `data` | object / array / null | 是 | 业务数据 |
| `request_id` | string | 否 | 请求追踪 ID，便于排查问题 |

### 2.6 分页响应结构

列表类接口统一使用以下结构：

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

分页参数约定：

| 参数 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `page` | number | `1` | 页码，从 1 开始 |
| `page_size` | number | `20` | 每页数量，建议最大不超过 100 |

### 2.7 HTTP 状态码

| 状态码 | 场景 |
| --- | --- |
| `200` | 请求成功 |
| `201` | 创建成功 |
| `204` | 删除成功且无返回内容 |
| `400` | 请求参数错误 |
| `401` | 未登录或 Token 无效 |
| `403` | 无权限访问 |
| `404` | 资源不存在 |
| `409` | 资源冲突，例如邮箱已注册 |
| `422` | 字段校验失败 |
| `500` | 服务端异常 |

### 2.8 业务错误码

| code | 说明 |
| --- | --- |
| `0` | 成功 |
| `1001` | 参数校验失败 |
| `1002` | 未认证或登录已过期 |
| `1003` | 无访问权限 |
| `1004` | 资源不存在 |
| `1005` | 资源冲突 |
| `2001` | 用户名或邮箱已存在 |
| `2002` | 用户名、邮箱或密码错误 |
| `3001` | 任务不存在 |
| `4001` | 未配置 OpenAI API Key |
| `4002` | OpenAI API Key 无效 |
| `4003` | AI 解析失败 |
| `5000` | 服务端内部错误 |

错误响应示例：

```json
{
  "code": 1001,
  "message": "title 不能为空",
  "data": {
    "field": "title"
  },
  "request_id": "req_202606011500000001"
}
```

## 3. 核心数据模型

### 3.1 User

```json
{
  "id": 1,
  "username": "alice",
  "email": "alice@example.com",
  "created_at": "2026-06-01T10:00:00+08:00",
  "updated_at": "2026-06-01T10:00:00+08:00"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 是 | 用户 ID |
| `username` | string | 是 | 用户名，建议 3-32 位 |
| `email` | string | 是 | 邮箱 |
| `created_at` | string | 是 | 创建时间 |
| `updated_at` | string | 是 | 更新时间 |

### 3.2 Task

```json
{
  "id": 101,
  "title": "完成软件工程报告",
  "description": "整理项目 API 文档与演示材料",
  "priority": "high",
  "category": "学习",
  "due_time": "2026-06-02T15:00:00+08:00",
  "status": "todo",
  "is_ai_created": true,
  "created_at": "2026-06-01T10:00:00+08:00",
  "updated_at": "2026-06-01T10:00:00+08:00"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | number | 是 | 任务 ID |
| `title` | string | 是 | 任务标题，建议 1-100 字 |
| `description` | string / null | 否 | 任务描述 |
| `priority` | string | 是 | 优先级：`low`、`medium`、`high` |
| `category` | string / null | 否 | 任务分类，例如学习、工作、生活 |
| `due_time` | string / null | 否 | 截止时间 |
| `status` | string | 是 | 状态：`todo`、`done` |
| `is_ai_created` | boolean | 是 | 是否由 AI 创建 |
| `created_at` | string | 是 | 创建时间 |
| `updated_at` | string | 是 | 更新时间 |

### 3.3 UserSetting

```json
{
  "openai_api_key_masked": "sk-****abcd",
  "has_openai_api_key": true,
  "model_name": "gpt-4o-mini",
  "created_at": "2026-06-01T10:00:00+08:00",
  "updated_at": "2026-06-01T10:00:00+08:00"
}
```

说明：

- 后端不应向前端返回完整 API Key。
- `openai_api_key_masked` 只用于展示脱敏结果。
- API Key 入库前建议加密保存，至少不能明文出现在日志中。

### 3.4 AiParsedTask

```json
{
  "title": "完成软件工程报告",
  "description": null,
  "priority": "high",
  "category": "学习",
  "due_time": "2026-06-02T15:00:00+08:00",
  "confidence": 0.92,
  "raw_due_text": "明天下午三点"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 是 | AI 提取出的任务标题 |
| `description` | string / null | 否 | AI 提取出的描述 |
| `priority` | string | 是 | 推荐优先级 |
| `category` | string / null | 否 | 推荐分类 |
| `due_time` | string / null | 否 | 解析后的截止时间 |
| `confidence` | number | 否 | AI 解析置信度，范围 0-1 |
| `raw_due_text` | string / null | 否 | 原始时间表达，便于前端展示确认 |

## 4. 用户认证接口

### 4.1 用户注册

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

字段说明：

| 字段 | 类型 | 必填 | 规则 |
| --- | --- | --- | --- |
| `username` | string | 是 | 3-32 位，建议只允许字母、数字、下划线 |
| `email` | string | 是 | 合法邮箱 |
| `password` | string | 是 | 至少 8 位 |

成功响应 `201`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {
      "id": 1,
      "username": "alice",
      "email": "alice@example.com",
      "created_at": "2026-06-01T10:00:00+08:00",
      "updated_at": "2026-06-01T10:00:00+08:00"
    },
    "access_token": "jwt_access_token",
    "token_type": "bearer",
    "expires_in": 7200
  }
}
```

可能错误：

| HTTP 状态码 | code | 说明 |
| --- | --- | --- |
| `409` | `2001` | 用户名或邮箱已存在 |
| `422` | `1001` | 参数校验失败 |

前端处理建议：

- 注册成功后直接保存 Token 并跳转任务列表页。
- 若邮箱已注册，引导用户进入登录页。

### 4.2 用户登录

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

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `account` | string | 是 | 用户名或邮箱 |
| `password` | string | 是 | 密码 |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "user": {
      "id": 1,
      "username": "alice",
      "email": "alice@example.com",
      "created_at": "2026-06-01T10:00:00+08:00",
      "updated_at": "2026-06-01T10:00:00+08:00"
    },
    "access_token": "jwt_access_token",
    "token_type": "bearer",
    "expires_in": 7200
  }
}
```

可能错误：

| HTTP 状态码 | code | 说明 |
| --- | --- | --- |
| `401` | `2002` | 用户名、邮箱或密码错误 |
| `422` | `1001` | 参数校验失败 |

### 4.3 退出登录

```http
POST /api/auth/logout
```

认证：需要。

请求体：无。

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": null
}
```

说明：

- MVP 可只由前端清除本地 Token。
- 如后端实现 Token 黑名单，可在该接口中使当前 Token 失效。

### 4.4 获取当前用户信息

```http
GET /api/users/me
```

认证：需要。

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "created_at": "2026-06-01T10:00:00+08:00",
    "updated_at": "2026-06-01T10:00:00+08:00"
  }
}
```

### 4.5 修改当前用户信息

```http
PUT /api/users/me
```

认证：需要。

请求体：

```json
{
  "username": "alice_new",
  "email": "alice_new@example.com"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | string | 否 | 新用户名 |
| `email` | string | 否 | 新邮箱 |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 1,
    "username": "alice_new",
    "email": "alice_new@example.com",
    "created_at": "2026-06-01T10:00:00+08:00",
    "updated_at": "2026-06-01T10:20:00+08:00"
  }
}
```

## 5. 任务管理接口

### 5.1 创建任务

```http
POST /api/tasks
```

认证：需要。

请求体：

```json
{
  "title": "完成 API 文档",
  "description": "补充前后端接口字段和示例",
  "priority": "high",
  "category": "学习",
  "due_time": "2026-06-02T18:00:00+08:00"
}
```

字段说明：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `title` | string | 是 | 无 | 任务标题 |
| `description` | string | 否 | `null` | 任务描述 |
| `priority` | string | 否 | `medium` | 优先级 |
| `category` | string | 否 | `null` | 分类 |
| `due_time` | string | 否 | `null` | 截止时间 |

成功响应 `201`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 101,
    "title": "完成 API 文档",
    "description": "补充前后端接口字段和示例",
    "priority": "high",
    "category": "学习",
    "due_time": "2026-06-02T18:00:00+08:00",
    "status": "todo",
    "is_ai_created": false,
    "created_at": "2026-06-01T10:00:00+08:00",
    "updated_at": "2026-06-01T10:00:00+08:00"
  }
}
```

### 5.2 获取任务列表

```http
GET /api/tasks
```

认证：需要。

查询参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | `1` | 页码 |
| `page_size` | number | 否 | `20` | 每页数量 |
| `status` | string | 否 | 无 | `todo` 或 `done` |
| `priority` | string | 否 | 无 | `low`、`medium`、`high` |
| `category` | string | 否 | 无 | 分类名称 |
| `keyword` | string | 否 | 无 | 搜索标题和描述 |
| `due_from` | string | 否 | 无 | 截止时间起始 |
| `due_to` | string | 否 | 无 | 截止时间结束 |
| `sort_by` | string | 否 | `created_at` | `created_at`、`due_time`、`priority`、`updated_at` |
| `sort_order` | string | 否 | `desc` | `asc` 或 `desc` |

示例：

```http
GET /api/tasks?page=1&page_size=20&status=todo&priority=high&sort_by=due_time&sort_order=asc
```

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 101,
        "title": "完成 API 文档",
        "description": "补充前后端接口字段和示例",
        "priority": "high",
        "category": "学习",
        "due_time": "2026-06-02T18:00:00+08:00",
        "status": "todo",
        "is_ai_created": false,
        "created_at": "2026-06-01T10:00:00+08:00",
        "updated_at": "2026-06-01T10:00:00+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

前端处理建议：

- 任务列表页可在 URL query 中同步筛选条件，便于刷新保留状态。
- `keyword` 建议做 300ms 防抖后请求。
- `due_time` 为空的任务在按截止时间升序时建议放在列表末尾。

### 5.3 获取任务详情

```http
GET /api/tasks/{task_id}
```

认证：需要。

路径参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `task_id` | number | 是 | 任务 ID |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 101,
    "title": "完成 API 文档",
    "description": "补充前后端接口字段和示例",
    "priority": "high",
    "category": "学习",
    "due_time": "2026-06-02T18:00:00+08:00",
    "status": "todo",
    "is_ai_created": false,
    "created_at": "2026-06-01T10:00:00+08:00",
    "updated_at": "2026-06-01T10:00:00+08:00"
  }
}
```

可能错误：

| HTTP 状态码 | code | 说明 |
| --- | --- | --- |
| `404` | `3001` | 任务不存在或不属于当前用户 |

### 5.4 更新任务

```http
PUT /api/tasks/{task_id}
```

认证：需要。

请求体：

```json
{
  "title": "完成 API 文档终稿",
  "description": "补充错误码、联调流程和 TypeScript 类型",
  "priority": "medium",
  "category": "项目",
  "due_time": "2026-06-03T12:00:00+08:00",
  "status": "todo"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string | 否 | 任务标题 |
| `description` | string / null | 否 | 任务描述，传 `null` 表示清空 |
| `priority` | string | 否 | 优先级 |
| `category` | string / null | 否 | 分类，传 `null` 表示清空 |
| `due_time` | string / null | 否 | 截止时间，传 `null` 表示清空 |
| `status` | string | 否 | 任务状态 |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 101,
    "title": "完成 API 文档终稿",
    "description": "补充错误码、联调流程和 TypeScript 类型",
    "priority": "medium",
    "category": "项目",
    "due_time": "2026-06-03T12:00:00+08:00",
    "status": "todo",
    "is_ai_created": false,
    "created_at": "2026-06-01T10:00:00+08:00",
    "updated_at": "2026-06-01T10:30:00+08:00"
  }
}
```

### 5.5 删除任务

```http
DELETE /api/tasks/{task_id}
```

认证：需要。

成功响应 `204`：无响应体。

说明：

- MVP 可采用物理删除。
- 如后续需要回收站，可改为软删除并保留 `deleted_at` 字段。

### 5.6 更新任务状态

```http
PATCH /api/tasks/{task_id}/status
```

认证：需要。

请求体：

```json
{
  "status": "done"
}
```

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "id": 101,
    "status": "done",
    "updated_at": "2026-06-01T10:40:00+08:00"
  }
}
```

前端处理建议：

- 任务列表中勾选完成状态时优先调用该接口，避免提交整条任务。
- 请求失败时回滚前端勾选状态并提示用户。

### 5.7 获取任务分类列表

```http
GET /api/tasks/categories
```

认证：需要。

说明：

- 该接口根据当前用户已有任务聚合分类。
- MVP 不需要单独维护分类表时，可用该接口支持筛选下拉框。
- FastAPI 注册路由时，应将 `/api/tasks/categories` 放在 `/api/tasks/{task_id}` 之前，避免被动态路由误匹配。

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "name": "学习",
      "task_count": 8
    },
    {
      "name": "工作",
      "task_count": 5
    }
  ]
}
```

## 6. AI 任务解析接口

### 6.1 解析自然语言任务

```http
POST /api/ai/parse-task
```

认证：需要。

请求体：

```json
{
  "text": "明天下午三点完成软件工程报告，很重要",
  "timezone": "Asia/Shanghai"
}
```

字段说明：

| 字段 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `text` | string | 是 | 无 | 用户输入的自然语言任务 |
| `timezone` | string | 否 | `Asia/Shanghai` | 用户时区，用于解析“明天”等相对时间 |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "parsed_task": {
      "title": "完成软件工程报告",
      "description": null,
      "priority": "high",
      "category": "学习",
      "due_time": "2026-06-02T15:00:00+08:00",
      "confidence": 0.92,
      "raw_due_text": "明天下午三点"
    },
    "ai_status": "success",
    "model_name": "gpt-4o-mini"
  }
}
```

可能错误：

| HTTP 状态码 | code | 说明 |
| --- | --- | --- |
| `400` | `4001` | 用户未配置 OpenAI API Key |
| `401` | `4002` | OpenAI API Key 无效 |
| `500` | `4003` | AI 解析失败 |

前端处理建议：

- 解析结果不要直接落库，建议先展示确认表单。
- `due_time` 为空时提示用户可手动补充截止时间。
- 当 `ai_status` 为 `mocked` 时，可以展示“AI 服务暂不可用，已使用示例解析结果”的轻提示。

### 6.2 解析并创建任务

```http
POST /api/ai/create-task
```

认证：需要。

请求体：

```json
{
  "text": "明天下午三点完成软件工程报告，很重要",
  "timezone": "Asia/Shanghai",
  "overrides": {
    "category": "课程",
    "priority": "high"
  }
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `text` | string | 是 | 用户输入的自然语言任务 |
| `timezone` | string | 否 | 用户时区 |
| `overrides` | object | 否 | 前端确认后覆盖 AI 结果的字段 |

`overrides` 支持字段：

```json
{
  "title": "完成软件工程报告",
  "description": "整理课程项目材料",
  "priority": "high",
  "category": "课程",
  "due_time": "2026-06-02T15:00:00+08:00"
}
```

成功响应 `201`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "task": {
      "id": 102,
      "title": "完成软件工程报告",
      "description": null,
      "priority": "high",
      "category": "课程",
      "due_time": "2026-06-02T15:00:00+08:00",
      "status": "todo",
      "is_ai_created": true,
      "created_at": "2026-06-01T10:50:00+08:00",
      "updated_at": "2026-06-01T10:50:00+08:00"
    },
    "parsed_task": {
      "title": "完成软件工程报告",
      "description": null,
      "priority": "high",
      "category": "学习",
      "due_time": "2026-06-02T15:00:00+08:00",
      "confidence": 0.92,
      "raw_due_text": "明天下午三点"
    },
    "ai_status": "success"
  }
}
```

说明：

- 如果前端希望“先确认再创建”，使用 `POST /api/ai/parse-task` + `POST /api/tasks`。
- 如果前端希望“一键 AI 创建”，使用本接口。

### 6.3 推荐分类与优先级

```http
POST /api/ai/suggest
```

认证：需要。

请求体：

```json
{
  "title": "准备项目答辩 PPT",
  "description": "整理演示流程和页面截图"
}
```

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "priority": "high",
    "category": "项目",
    "reason": "任务与项目交付相关，通常有明确截止时间和较高重要性"
  }
}
```

前端处理建议：

- 在普通任务创建表单中可提供“AI 推荐”按钮。
- 推荐结果应允许用户修改，不应强制覆盖用户已选择字段。

### 6.4 获取 AI 调用记录

```http
GET /api/ai/logs
```

认证：需要。

查询参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `page` | number | 否 | `1` | 页码 |
| `page_size` | number | 否 | `20` | 每页数量 |
| `status` | string | 否 | 无 | `success`、`failed`、`mocked` |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "items": [
      {
        "id": 1,
        "input_text": "明天下午三点完成软件工程报告，很重要",
        "output_json": {
          "title": "完成软件工程报告",
          "priority": "high",
          "category": "学习",
          "due_time": "2026-06-02T15:00:00+08:00"
        },
        "status": "success",
        "model_name": "gpt-4o-mini",
        "created_at": "2026-06-01T10:50:00+08:00"
      }
    ],
    "pagination": {
      "page": 1,
      "page_size": 20,
      "total": 1,
      "total_pages": 1
    }
  }
}
```

说明：

- MVP 可不在前端展示该页面，但建议后端保留接口便于调试。
- 日志中禁止记录完整 OpenAI API Key。

## 7. 统计分析接口

### 7.1 获取统计总览

```http
GET /api/stats/overview
```

认证：需要。

查询参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `from` | string | 否 | 统计开始时间 |
| `to` | string | 否 | 统计结束时间 |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "total_tasks": 20,
    "done_tasks": 8,
    "todo_tasks": 12,
    "completion_rate": 0.4,
    "overdue_tasks": 3,
    "today_due_tasks": 2,
    "ai_created_tasks": 5
  }
}
```

字段说明：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `total_tasks` | number | 任务总数 |
| `done_tasks` | number | 已完成任务数 |
| `todo_tasks` | number | 未完成任务数 |
| `completion_rate` | number | 完成率，范围 0-1 |
| `overdue_tasks` | number | 已逾期且未完成任务数 |
| `today_due_tasks` | number | 今日截止任务数 |
| `ai_created_tasks` | number | AI 创建任务数 |

### 7.2 获取分类统计

```http
GET /api/stats/category
```

认证：需要。

查询参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `from` | string | 否 | 统计开始时间 |
| `to` | string | 否 | 统计结束时间 |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "category": "学习",
      "total": 10,
      "done": 4,
      "todo": 6,
      "completion_rate": 0.4
    },
    {
      "category": "工作",
      "total": 6,
      "done": 3,
      "todo": 3,
      "completion_rate": 0.5
    }
  ]
}
```

说明：

- 未设置分类的任务可归类为 `未分类`。

### 7.3 获取优先级统计

```http
GET /api/stats/priority
```

认证：需要。

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "priority": "high",
      "total": 5,
      "done": 2,
      "todo": 3
    },
    {
      "priority": "medium",
      "total": 10,
      "done": 4,
      "todo": 6
    },
    {
      "priority": "low",
      "total": 5,
      "done": 2,
      "todo": 3
    }
  ]
}
```

### 7.4 获取近期趋势统计

```http
GET /api/stats/trend
```

认证：需要。

查询参数：

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `days` | number | 否 | `7` | 最近 N 天，建议取值 7、14、30 |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": [
    {
      "date": "2026-06-01",
      "created": 3,
      "done": 1
    },
    {
      "date": "2026-06-02",
      "created": 2,
      "done": 2
    }
  ]
}
```

前端处理建议：

- 统计总览用于卡片展示。
- 分类、优先级和趋势数据可用于图表。
- 图表为空时展示空状态，不要当作接口错误。

## 8. 设置与 BYOK 接口

### 8.1 获取用户设置

```http
GET /api/settings
```

认证：需要。

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "openai_api_key_masked": "sk-****abcd",
    "has_openai_api_key": true,
    "model_name": "gpt-4o-mini",
    "created_at": "2026-06-01T10:00:00+08:00",
    "updated_at": "2026-06-01T11:00:00+08:00"
  }
}
```

### 8.2 更新用户设置

```http
PUT /api/settings
```

认证：需要。

请求体：

```json
{
  "openai_api_key": "sk-user-provided-key",
  "model_name": "gpt-4o-mini"
}
```

字段说明：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `openai_api_key` | string / null | 否 | 用户 OpenAI API Key；传 `null` 表示删除已保存 Key |
| `model_name` | string | 否 | 默认模型名称 |

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "openai_api_key_masked": "sk-****abcd",
    "has_openai_api_key": true,
    "model_name": "gpt-4o-mini",
    "created_at": "2026-06-01T10:00:00+08:00",
    "updated_at": "2026-06-01T11:10:00+08:00"
  }
}
```

安全要求：

- 后端日志不能输出完整 `openai_api_key`。
- 返回给前端时必须脱敏。
- 建议后端保存前加密，密钥放在环境变量中。

### 8.3 测试 OpenAI API Key

```http
POST /api/settings/test-openai-key
```

认证：需要。

请求体：

```json
{
  "openai_api_key": "sk-user-provided-key",
  "model_name": "gpt-4o-mini"
}
```

说明：

- 如果请求体未传 `openai_api_key`，后端可测试当前用户已保存的 Key。
- 该接口只测试可用性，不保存 Key。

成功响应 `200`：

```json
{
  "code": 0,
  "message": "ok",
  "data": {
    "valid": true,
    "model_name": "gpt-4o-mini",
    "latency_ms": 850
  }
}
```

失败响应示例：

```json
{
  "code": 4002,
  "message": "OpenAI API Key 无效或无权限访问该模型",
  "data": {
    "valid": false
  }
}
```

前端处理建议：

- 用户输入 Key 后可先点击“测试连接”，成功后再保存。
- Key 输入框默认不回显完整值，只展示脱敏状态。

## 9. 前端联调建议

### 9.1 Axios 封装建议

前端建议统一封装请求实例：

```ts
import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("access_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
```

### 9.2 TypeScript 类型建议

```ts
export type Priority = "low" | "medium" | "high";
export type TaskStatus = "todo" | "done";
export type AiStatus = "success" | "failed" | "mocked";

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  request_id?: string;
}

export interface Pagination {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface PageResult<T> {
  items: T[];
  pagination: Pagination;
}

export interface User {
  id: number;
  username: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: Priority;
  category: string | null;
  due_time: string | null;
  status: TaskStatus;
  is_ai_created: boolean;
  created_at: string;
  updated_at: string;
}

export interface AiParsedTask {
  title: string;
  description: string | null;
  priority: Priority;
  category: string | null;
  due_time: string | null;
  confidence?: number;
  raw_due_text?: string | null;
}
```

### 9.3 前后端联调顺序

建议按以下顺序联调，减少模块互相阻塞：

1. 注册、登录、获取当前用户。
2. 任务创建、任务列表、任务详情。
3. 任务编辑、删除、状态切换。
4. 分类列表和任务筛选排序。
5. 设置页读取和保存 BYOK。
6. AI 自然语言解析，先用 Mock，再接真实 OpenAI API。
7. 统计总览、分类统计、优先级统计、趋势统计。

### 9.4 Mock 数据建议

后端未完成时，前端可用以下任务样例：

```json
[
  {
    "id": 101,
    "title": "完成软件工程报告",
    "description": "整理项目文档",
    "priority": "high",
    "category": "学习",
    "due_time": "2026-06-02T15:00:00+08:00",
    "status": "todo",
    "is_ai_created": true,
    "created_at": "2026-06-01T10:00:00+08:00",
    "updated_at": "2026-06-01T10:00:00+08:00"
  },
  {
    "id": 102,
    "title": "购买生活用品",
    "description": null,
    "priority": "low",
    "category": "生活",
    "due_time": null,
    "status": "done",
    "is_ai_created": false,
    "created_at": "2026-06-01T09:00:00+08:00",
    "updated_at": "2026-06-01T12:00:00+08:00"
  }
]
```

## 10. 后端实现注意事项

### 10.1 数据隔离

所有需要认证的接口都必须基于当前登录用户查询数据，例如：

- `GET /api/tasks/{task_id}` 只能返回当前用户自己的任务。
- 删除、修改任务时必须同时校验 `task_id` 和 `user_id`。
- 统计接口只统计当前用户的数据。

### 10.2 密码与 Token

- 密码必须使用哈希算法保存，不能明文入库。
- JWT 中建议只保存 `sub`、`exp`、`iat` 等必要字段。
- Token 过期后前端应跳转登录页。

### 10.3 AI 解析兜底

AI 返回内容必须经过后端校验后再返回前端。建议兜底策略：

- `title` 为空时使用用户原始输入的前 100 字。
- `priority` 非法时设为 `medium`。
- `category` 为空时可设为 `未分类` 或 `null`。
- `due_time` 无法解析时设为 `null`，并保留 `raw_due_text`。

### 10.4 日志与隐私

禁止在日志、错误响应和 AI 调用记录中保存或返回以下敏感信息：

- 用户明文密码。
- 完整 OpenAI API Key。
- JWT Token。

## 11. MVP 接口清单

| 模块 | 方法 | 路径 | 认证 | 说明 |
| --- | --- | --- | --- | --- |
| 认证 | `POST` | `/api/auth/register` | 否 | 用户注册 |
| 认证 | `POST` | `/api/auth/login` | 否 | 用户登录 |
| 认证 | `POST` | `/api/auth/logout` | 是 | 退出登录 |
| 用户 | `GET` | `/api/users/me` | 是 | 获取当前用户 |
| 用户 | `PUT` | `/api/users/me` | 是 | 修改当前用户 |
| 任务 | `POST` | `/api/tasks` | 是 | 创建任务 |
| 任务 | `GET` | `/api/tasks` | 是 | 获取任务列表 |
| 任务 | `GET` | `/api/tasks/{task_id}` | 是 | 获取任务详情 |
| 任务 | `PUT` | `/api/tasks/{task_id}` | 是 | 更新任务 |
| 任务 | `DELETE` | `/api/tasks/{task_id}` | 是 | 删除任务 |
| 任务 | `PATCH` | `/api/tasks/{task_id}/status` | 是 | 更新任务状态 |
| 任务 | `GET` | `/api/tasks/categories` | 是 | 获取分类列表 |
| AI | `POST` | `/api/ai/parse-task` | 是 | 解析自然语言任务 |
| AI | `POST` | `/api/ai/create-task` | 是 | 解析并创建任务 |
| AI | `POST` | `/api/ai/suggest` | 是 | 推荐分类和优先级 |
| AI | `GET` | `/api/ai/logs` | 是 | 获取 AI 调用记录 |
| 统计 | `GET` | `/api/stats/overview` | 是 | 获取统计总览 |
| 统计 | `GET` | `/api/stats/category` | 是 | 获取分类统计 |
| 统计 | `GET` | `/api/stats/priority` | 是 | 获取优先级统计 |
| 统计 | `GET` | `/api/stats/trend` | 是 | 获取趋势统计 |
| 设置 | `GET` | `/api/settings` | 是 | 获取用户设置 |
| 设置 | `PUT` | `/api/settings` | 是 | 更新用户设置 |
| 设置 | `POST` | `/api/settings/test-openai-key` | 是 | 测试 OpenAI API Key |

## 12. 版本变更记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v0.1 | 2026-05-31 | 初始化 MVP 前后端 API 对接文档 |
