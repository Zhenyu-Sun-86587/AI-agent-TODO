# AI-agent-TODO 风格提取证据清单

采样方式：真实浏览器访问 `http://127.0.0.1:5173/`，使用桌面与移动视口观察。  
Computed style：`doc/frontend/evidence/computed-styles.json`。  
截图目录：`doc/frontend/evidence/screenshots/`。  
控制台结果：browser dev logs 中 error = 0，warning = 0。  
说明：本轮未修改前端源码，只覆盖 `doc/frontend` 下的证据和文档。

## 1. 截图证据

| 文件 | 页面 | 视口 | 说明 |
|---|---|---|---|
| `evidence/screenshots/dashboard-desktop.png` | Dashboard | 1440x900 | Dashboard、API 状态、AI 建议、今日任务空态 |
| `evidence/screenshots/dashboard-mobile.png` | Dashboard 移动端 | 390x844 | 顶部品牌栏、换行 Header、底部导航 |
| `evidence/screenshots/task-list-desktop.png` | 全部任务 | 1440x900 | 桌面任务表格、筛选、行操作 |
| `evidence/screenshots/task-list-mobile.png` | 全部任务移动端 | 390x844 | `.mobile-task-card` 卡片列表 |
| `evidence/screenshots/task-board-desktop.png` | 任务看板 | 1440x900 | 当前数据下可见待办/已完成列 |
| `evidence/screenshots/ai-recommendation.png` | AI 推荐 | 1440x900 | AI 建议、AI 分类优先级、AI 调用记录 |
| `evidence/screenshots/calendar-desktop.png` | 日历 | 1440x900 | 近 7/14/30 天、今日 24 小时、逾期入口 |
| `evidence/screenshots/calendar-mobile.png` | 日历移动端 | 390x844 | 日历单列日期卡片 |
| `evidence/screenshots/create-task-modal.png` | 新建任务弹窗 | 1440x900 | AI 生成 / 自定义创建 |
| `evidence/screenshots/edit-task-modal.png` | 编辑任务弹窗 | 1440x900 | 编辑任务表单 |
| `evidence/screenshots/delete-confirm-modal.png` | 删除确认弹窗 | 1440x900 | 删除确认和 danger 按钮 |
| `evidence/screenshots/task-detail-drawer.png` | 任务详情 Drawer | 1440x900 | 字段、子任务空态、AI 分析 |
| `evidence/screenshots/stats-page.png` | 数据统计 | 1440x900 | KPI、趋势、分布 |
| `evidence/screenshots/settings-page.png` | 设置 | 1440x900 | 个人资料、AI 配置、联调信息 |
| `evidence/screenshots/tags-page.png` | 标签管理 | 1440x900 | 标签云 |
| `evidence/screenshots/dark-mode.png` | 深色主题 | 1440x900 | `.minimal-shell-dark` |
| `evidence/screenshots/light-mode.png` | 浅色主题 | 1440x900 | `.minimal-shell-light` |
| `evidence/screenshots/responsive-1280x720.png` | Dashboard | 1280x720 | 窄桌面 |
| `evidence/screenshots/responsive-1024x768.png` | Dashboard | 1024x768 | 小桌面/平板横向 |
| `evidence/screenshots/responsive-768x1024.png` | Dashboard | 768x1024 | 平板竖向，移动布局 |
| `evidence/screenshots/responsive-375x667.png` | Dashboard | 375x667 | 小手机高度压力 |

## 2. Computed Style 证据

| 组件 | 选择器 | 样式项 | 结果 |
|---|---|---|---|
| 主壳 | `.minimal-shell` | 布局 | 桌面 grid，源码为 `240px minmax(0,1fr)` |
| 深色壳 | `.minimal-shell-dark` | 背景/文本 | `#09090b` / `#cbd5e1` |
| 浅色壳 | `.minimal-shell-light` | 背景/文本 | `#f5f7fb` / `#172033` |
| 页面内容 | `.minimal-page` | padding | 桌面 `24px 32px 32px`，移动 `18px 16px 28px` |
| Header | `.minimal-header` | 高度 | 64px |
| 搜索框 | `.minimal-search` | 尺寸 | 320px x 40px，999px 圆角 |
| 主按钮 | `.minimal-primary` | 尺寸 | 38px 高，`padding: 0 16px` |
| 移动底部导航 | `.minimal-mobile-nav` | 布局 | 390px 下 fixed bottom，8 个 tab 横向滚动 |
| 桌面表格 | `.desktop-table-wrapper` | 移动端 | 390px 下 `display: none` |
| 移动任务列表 | `.mobile-card-list` | 移动端 | 820px 以下 `display: grid` |
| 移动任务卡 | `.mobile-task-card` | 尺寸 | 390px 下约 316px 宽、165px 高、14px padding |
| 完成按钮 | `.task-check.checked` | 状态 | 28px，绿色实心圆 |
| Drawer | `.drawer` | 尺寸/动画 | 460px 宽，`drawerSlideIn 200ms` |
| 新建 Modal | `.create-modal` | 尺寸/动画 | 620px 宽，`modalSlideUp 160ms` |
| 删除 Modal | `.confirm-modal` | 尺寸 | 440px 宽，继承 create-modal |
| 日历网格 | `.calendar-grid` | 布局 | 桌面 7 列，移动单列 |
| 24 小时轴 | `.timeline-hour` | 布局 | `72px minmax(0,1fr)`，移动 `58px minmax(0,1fr)` |

## 3. CSS 文件证据

| 文件 | 相关内容 | 说明 |
|---|---|---|
| `frontend/src/styles/demo.css:1-31` | root token、动效 token | 色彩、字体、duration/ease |
| `frontend/src/styles/demo.css:50-59` | `.minimal-shell` | 桌面主壳 |
| `frontend/src/styles/demo.css:613-711` | 深色覆盖 | dark shell 的 card/input/text |
| `frontend/src/styles/demo.css:715-886` | `.minimal-shell-light` | light theme 覆盖 |
| `frontend/src/styles/demo.css:886-1019` | 900px 移动布局 | Header 换行、底部 nav |
| `frontend/src/styles/demo.css:1761-1800` | `.task-card` 与 `.task-check` | 任务卡 hover 与完成按钮 |
| `frontend/src/styles/demo.css:1940-1964` | 表格/移动列表切换基础 | desktop table、mobile-card-list |
| `frontend/src/styles/demo.css:2146-2195` | `.mobile-task-card` | 移动任务卡 |
| `frontend/src/styles/demo.css:2299-2455` | 日历和 24 小时轴 | 日期卡片、timeline |
| `frontend/src/styles/demo.css:2689-2865` | Drawer、Modal、删除确认、AI reason | 覆盖层和 AI 分析 |
| `frontend/src/styles/demo.css:2872-2899` | keyframes | fadeIn、modalSlideUp、drawerSlideIn |
| `frontend/src/App.tsx:2601` | `.mobile-card-list` 渲染 | 移动任务卡入口 |
| `frontend/src/Layout.tsx:105` | 主题切换按钮 | `minimal-theme-toggle` |

## 4. 交互证据

| 组件 | 操作 | 观察结果 |
|---|---|---|
| Sidebar | 打开各路由 | `/`、`/tasks`、`/ai`、`/board`、`/calendar`、`/stats`、`/tags`、`/settings` 均可打开 |
| 新建任务 | 点击 “新建任务” | 打开 create modal |
| 编辑任务 | 点击 “编辑任务” | 打开 edit modal |
| 删除任务 | 点击 “删除任务” | 打开 confirm modal，未执行确认删除 |
| 查看详情 | 点击 “查看详情” | 打开右侧 Drawer |
| 主题切换 | 点击 “切换主题” | `.minimal-shell-light` 与 `.minimal-shell-dark` 切换，已恢复采样前主题 |
| 移动任务 | 390x844 观察 | 桌面表格隐藏，移动任务卡显示 |
| 控制台 | 读取 dev logs | error = 0，warning = 0 |

## 5. 响应式证据

| 尺寸 | 页面 | 观察结果 |
|---|---|---|
| 1440x900 | 主页面 | 桌面两列布局完整 |
| 1280x720 | Dashboard | 桌面结构仍可用 |
| 1024x768 | Dashboard | 小桌面可用 |
| 768x1024 | Dashboard | 移动布局生效，底部导航出现 |
| 390x844 | Dashboard | Header 换行，底部 tab 固定 |
| 390x844 | 全部任务 | 显示 `.mobile-task-card`，表格隐藏 |
| 390x844 | 日历 | 日历变为单列，控件横向滚动 |
| 375x667 | Dashboard | 内容高度压力较明显 |

## 6. 页面实现情况

| 页面/模块 | 当前状态 |
|---|---|
| Dashboard 首页 | 已实现 |
| 今日任务页面 | 未观察到独立页面，Dashboard 中有今日任务模块 |
| 全部任务页面 | 已实现，桌面表格 + 移动卡片 |
| AI 推荐页面 | 已实现 |
| 任务看板页面 | 已实现，当前数据下少 “进行中” 可见列 |
| 日历页面 | 已实现 |
| 数据统计页面 | 已实现 |
| 标签管理页面 | 已实现 |
| 设置页面 | 已实现 |
| 新建任务弹窗 | 已实现并截图 |
| 编辑任务弹窗 | 已实现并截图 |
| 任务详情 Drawer | 已实现并截图 |
| 删除确认弹窗 | 已实现并截图 |
| 深色模式页面 | 已实现并截图 |
| 移动端布局 | 已实现底部导航与任务卡片 |
