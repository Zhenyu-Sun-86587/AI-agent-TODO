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

### 环境要求

| 工具 | 版本 | 说明 |
|------|------|------|
| Python | 3.10+ | 推荐使用 conda 管理环境 |
| Node.js | 18+ | 前端构建与开发 |
| npm | 9+ | 随 Node.js 安装 |

### 1. 启动后端

```bash
cd backend
```

**安装依赖：**

```bash
# === 方式 A：使用 venv（通用） ===
python -m venv .venv

# Windows
.venv\Scripts\python -m pip install -r requirements.txt

# macOS / Linux
.venv/bin/python -m pip install -r requirements.txt

# === 方式 B：使用 conda（推荐 Windows 用户） ===
conda create -n ai-todo python=3.12
conda activate ai-todo
pip install -r requirements.txt
```

**配置环境变量：**

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

> `.env.example` 默认已开启 `AI_MOCK_MODE=true`，无需配置 OpenAI Key 即可体验 AI 功能（Mock 模式使用前端规则兜底）。

**初始化数据库：**

```bash
# Windows (venv)
.venv\Scripts\alembic upgrade head

# macOS / Linux (venv)
.venv/bin/alembic upgrade head

# conda 环境（直接使用）
alembic upgrade head
```

**启动服务：**

```bash
# Windows (venv)
.venv\Scripts\uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --reload-exclude "*.db"

# macOS / Linux (venv)
.venv/bin/uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --reload-exclude "*.db"

# conda 环境
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --reload-exclude "*.db"
```

> 💡 `--reload-exclude "*.db"` 可避免 SQLite 文件变化触发不必要的热重载。

启动成功后可访问：

```text
Swagger UI : http://127.0.0.1:8000/docs
Health     : http://127.0.0.1:8000/health
API Health : http://127.0.0.1:8000/api/health
```

### 2. 启动前端

```bash
cd frontend
npm install
npm run dev
```

默认访问地址：

```text
http://127.0.0.1:5173
```

> 前端接口地址在 `frontend/.env.development` 中配置，默认指向 `http://127.0.0.1:8000/api`。

### 3. 运行测试

```bash
# 后端测试（venv — Windows）
cd backend && .venv\Scripts\python -m pytest -q

# 后端测试（venv — macOS / Linux）
cd backend && .venv/bin/python -m pytest -q

# 后端测试（conda）
cd backend && python -m pytest -q

# 前端 E2E 测试
cd frontend && npm run test:e2e
```

## 💡 使用指南

### 快速体验（推荐）

1. 打开 `http://127.0.0.1:5173`
2. 点击 **"使用演示账号（本地）"** 或通过后端 Demo 登录
3. 系统自动加载 **8 个示例任务**，涵盖不同优先级、分类和状态
4. 可以直接浏览 Dashboard、编辑任务、查看统计、体验 AI 功能

### 登录方式

| 方式 | 说明 |
|------|------|
| 演示账号 | 点击即用，自动含示例数据，适合快速体验 |
| 注册登录 | 创建个人账号，数据持久化，适合长期使用 |

### AI 辅助功能

- **自然语言解析**：输入"明天下午三点完成报告" → AI 自动拆分为结构化任务
- **智能推荐**：编辑任务时 AI 建议优先级和分类
- **AI 聊天**：通过右下角浮窗进行对话式任务操作
- **Mock 兜底**：未配置 API Key 时自动使用前端规则，保障功能可用

> 详细使用方式可参考 [使用文档](使用文档.md)。

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
