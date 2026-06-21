# AI-agent-TODO

一个基于 AI agent 的智能 TODO 管理软件。

## 📝 项目简介

AI-agent-TODO 对应当前仓库与后端历史名称，当前面向用户展示的产品名称为 `TaskPilot`。它是一个面向个人任务管理场景的智能任务应用，结合 AI 能力帮助用户更高效地创建、整理和追踪待办事项。

当前仓库中的项目已经完成前后端基础功能搭建并可本地运行：

- 仓库名、课程项目名、后端历史应用名仍使用 `AI-agent-TODO`
- 前端界面、用户文案、产品展示名统一使用 `TaskPilot`

通过 AI 的帮助，用户可以进行自然语言任务解析、任务字段推荐、AI 聊天式任务操作，并结合统计面板查看任务完成情况。

## ✨ 主要特性

- 🤖 **AI 智能辅助**：支持 AI 解析任务、字段推荐与聊天式任务操作
- 📋 **任务管理**：支持任务创建、编辑、删除、详情查看和完成状态切换
- 🏷️ **分类与筛选**：支持按分类、优先级、状态、关键词、截止时间筛选任务
- ⚡ **优先级管理**：支持低 / 中 / 高优先级设置与排序
- 📊 **数据统计**：支持任务总览、分类统计、优先级统计和趋势统计
- 🔐 **用户系统**：支持注册、登录、退出登录和演示账号登录
- 🧠 **AI 配置**：支持 OpenAI / DeepSeek 模型名配置和 API Key 测试
- 🌐 **Web 工作台**：提供桌面端和移动端适配的前端工作台界面

## 🚀 快速开始

> **说明**：本项目当前以本地开发环境为主，前端与后端分目录运行。

### 环境要求

- Python 3.10+
- Node.js 18+
- npm

### 1. 启动后端

后端代码位于 `backend/` 目录。

安装依赖并配置环境：

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
cp .env.example .env
```

初始化数据库：

```bash
.venv/bin/alembic upgrade head
```

启动 FastAPI 后端服务：

```bash
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

启动成功后可访问：

```text
Swagger: http://127.0.0.1:8000/docs
ReDoc: http://127.0.0.1:8000/redoc
Health: http://127.0.0.1:8000/health
API Health: http://127.0.0.1:8000/api/health
```

#### 💡 Windows 用户补充说明

如果你在 Windows 上开发，以下额外提示可能对你有帮助：

**使用 conda 环境（替代 venv）：**

```bash
# 创建并激活 conda 环境
conda create -n ai-todo python=3.12
conda activate ai-todo

# 安装依赖（在 backend/ 目录下）
pip install -r requirements.txt

# 后续直接使用，无需 .venv\Scripts\ 前缀
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --reload-exclude "*.db"
```

**如果使用 venv，Windows 上的路径差异：**

```bash
# Windows venv 的可执行文件在 Scripts 目录下
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\alembic upgrade head
.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --reload-exclude "*.db"

# 复制环境变量文件
copy .env.example .env
```

> 💡 `--reload-exclude "*.db"` 可避免 SQLite 数据库文件变化触发不必要的服务重载。
>
> `.env.example` 默认开启 `AI_MOCK_MODE=true`，无需配置 OpenAI API Key 即可体验 AI 功能。

### 2. 启动前端

前端代码位于 `frontend/` 目录。

安装依赖并启动：

```bash
cd frontend
npm install
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5173
```

当前前端开发环境接口地址位于 `frontend/.env.development`：

```text
VITE_API_BASE_URL=http://127.0.0.1:8000/api
```

### 3. 运行测试

后端测试：

```bash
cd backend
.venv/bin/python -m pytest -q
```

前端端到端测试：

```bash
cd frontend
npm run test:e2e
```

## 💡 使用指南

### 登录与进入系统

- 可以使用注册账号登录后端
- 也可以使用演示账号快速体验系统（首次登录自动填充 8 个示例任务）
- 登录后进入 `TaskPilot` 工作台

### AI 辅助功能

当前 AI 能力包括：

- 自动从自然语言中提取任务标题、分类、优先级和截止时间
- AI 解析后直接创建任务
- 为任务推荐分类和优先级
- 通过 AI 聊天浮窗执行任务相关操作

详细使用方式可参考：

- [使用文档](使用文档.md)

## 🛠️ 技术栈

- **后端框架**：FastAPI、SQLAlchemy、Alembic、Pydantic、pytest
- **前端框架**：React 19、TypeScript、Vite、Fetch API、Playwright
- **数据存储**：SQLite（本地开发），可扩展 PostgreSQL
- **AI 接入**：OpenAI SDK，支持 OpenAI 与 DeepSeek 兼容接口配置

## 📁 项目结构

### 当前结构

```text
AI-agent-TODO/
├── README.md                  # 项目说明文档
├── 使用文档.md                # AI 聊天与任务操作说明
├── doc/                       # 项目文档
│   ├── 项目初步设计.md         # 早期方案书 / 课程资料
│   ├── 开发文档与计划.md       # 早期开发计划 / 课程资料
│   ├── 前后端API接口文档.md    # 当前前后端接口文档
│   ├── 前端实现文档.md         # 当前前端实现说明
│   └── 后端实现文档.md         # 当前后端实现说明
├── backend/                   # FastAPI 后端
│   ├── app/
│   ├── alembic/
│   ├── tests/
│   ├── requirements.txt
│   └── .env.example
└── frontend/                  # React + Vite 前端
    ├── src/
    ├── public/
    ├── tests/
    ├── package.json
    └── vite.config.ts
```

### 说明

- `AI-agent-TODO` 是仓库与后端历史名称
- `TaskPilot` 是当前前端界面展示名称
- `doc/项目初步设计.md` 和 `doc/开发文档与计划.md` 作为课程过程资料保留，不完全代表当前实现

### 命名约定

- 对用户展示的产品名称：统一使用 `TaskPilot`
- 对仓库、课程项目、后端历史配置的引用：使用 `AI-agent-TODO`
- 如果文档同时提到两者，优先表述为“`AI-agent-TODO` 仓库 / `TaskPilot` 产品”

## 📚 开发文档

- [项目初步设计](doc/项目初步设计.md)：课程立项与早期设计方案。
- [4 人团队开发文档与计划](doc/开发文档与计划.md)：课程阶段计划、分工与历史开发安排。
- [前后端 API 对接文档](doc/前后端API接口文档.md)：当前接口、请求响应、错误码与联调约定。
- [前端实现文档](doc/前端实现文档.md)：当前前端页面结构、模块划分与样式组织说明。
- [后端实现文档](doc/后端实现文档.md)：当前后端目录、配置、服务与测试说明。
- [使用文档](使用文档.md)：AI 聊天操作任务的使用方法。

## 🤝 贡献指南

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建您的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交您的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个Pull Request

### 开发规范

- 遵循PEP 8代码规范
- 编写清晰的提交信息
- 添加必要的测试用例
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证。详见 [LICENSE](LICENSE) 文件。

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 提交Issue：[GitHub Issues](https://github.com/Zhenyu-Sun-86587/AI-agent-TODO/issues)
- 项目维护者：Zhenyu-Sun-86587

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

⭐ 如果这个项目对您有帮助，请给我们一个Star！
