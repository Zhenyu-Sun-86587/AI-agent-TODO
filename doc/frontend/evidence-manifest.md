# AI-agent-TODO 风格提取证据清单

采样方式：真实浏览器访问 `http://127.0.0.1:5174/`，使用桌面与移动视口观察。  
Computed style 文件：`frontend/evidence/computed-styles.json`。  
控制台结果：browser dev logs 中 error = 0，warning = 0。  
说明：本轮未修改前端源码，只生成证据和文档。

## 1. 截图证据

| 文件 | 页面 | 视口 | 说明 |
|---|---|---|---|
| `evidence/screenshots/dashboard-desktop.png` | Dashboard 首页 | 1440x900 | 深色后台壳、左侧导航、顶部工具栏、AI 建议和今日任务 |
| `evidence/screenshots/dashboard-mobile.png` | Dashboard 移动端 | 390x844 | 顶部品牌栏、换行 Header、底部横向 tab |
| `evidence/screenshots/task-list-desktop.png` | 全部任务 | 1440x900 | 筛选栏、任务表格、状态/优先级/操作列 |
| `evidence/screenshots/task-list-mobile.png` | 全部任务移动端 | 390x844 | 表格仍为 900px 宽，横向滚动 |
| `evidence/screenshots/task-board-desktop.png` | 任务看板 | 1440x900 | 待办/进行中/已完成三列 Kanban |
| `evidence/screenshots/ai-recommendation.png` | AI 推荐 | 1440x900 | AI 智能建议、分类优先级工具、AI 调用记录 |
| `evidence/screenshots/calendar-desktop.png` | 日历 | 1440x900 | 近 7/14/30 天、今日 24 小时、逾期入口 |
| `evidence/screenshots/calendar-mobile.png` | 日历移动端 | 390x844 | 日历变为单列日期卡片 |
| `evidence/screenshots/create-task-modal.png` | 新建任务弹窗 | 1440x900 | AI 生成 / 自定义创建分段控件和输入区 |
| `evidence/screenshots/task-detail-drawer.png` | 任务详情 Drawer | 1440x900 | 右侧详情抽屉、字段、子任务、AI 分析 |
| `evidence/screenshots/stats-page.png` | 数据统计 | 1440x900 | KPI 卡片、趋势图、分类/优先级分布 |
| `evidence/screenshots/settings-page.png` | 设置 | 1440x900 | 个人资料、AI 配置、联调信息 |
| `evidence/screenshots/tags-page.png` | 标签管理 | 1440x900 | 标签云和计数 |
| `evidence/screenshots/dark-mode.png` | 深色模式 | 1440x900 | 当前主应用深色状态 |
| `evidence/screenshots/responsive-1280x720.png` | Dashboard 响应式 | 1280x720 | 桌面窄高视口 |
| `evidence/screenshots/responsive-1024x768.png` | Dashboard 响应式 | 1024x768 | 平板横向/小桌面 |
| `evidence/screenshots/responsive-768x1024.png` | Dashboard 响应式 | 768x1024 | 平板竖向，移动布局生效 |
| `evidence/screenshots/responsive-375x667.png` | Dashboard 响应式 | 375x667 | 小手机高度压力测试 |

未生成独立截图：编辑任务弹窗、删除确认弹窗。原因：表格中存在入口按钮，但本轮浏览器观察未形成独立弹窗/确认框证据。

## 2. Computed Style 证据

| 组件 | 选择器 | 样式项 | 结果 |
|---|---|---|---|
| 主应用壳 | `.minimal-shell` | 布局 | 桌面 `display: grid`，源码为 `grid-template-columns: 240px minmax(0,1fr)` |
| 主内容 | `.minimal-page` | padding / overflow | 桌面 `24px 32px 32px`，`overflow: auto` |
| Sidebar item | `.minimal-nav-item.active` | 高度 / 颜色 / transition | 42px 高，`padding: 0 12px`，文字 `rgb(129,140,248)`，`background/color 0.16s` |
| Header | `.minimal-header` | 高度 / padding | 64px 高，`padding: 0 32px` |
| 搜索框 | `.minimal-search` | 尺寸 / 边框 | 320px 宽，40px 高，999px 圆角，深色背景 |
| 主按钮 | `.minimal-primary` | 尺寸 / padding | 38px 高，`padding: 0 16px`，紫色背景 |
| Dashboard 统计卡 | `.minimal-stat` | padding / border | 95px 高，16px padding，深色边框 |
| 内容卡片 | `.content-card.table-card` | padding / border | 20px padding，深色 shell 下边框 `rgba(255,255,255,0.06)` |
| 任务表格 | `.task-table` | 宽度 | 桌面约 1092px，移动端仍 900px 宽 |
| 状态 badge | `.status-badge` | 尺寸 / 颜色 | 24px 高，`padding: 0 8px`，主要靠文字色区分 |
| 优先级 badge | `.priority-badge` | 尺寸 / 颜色 | 24px 高，高优先级文字 `rgb(220,38,38)` |
| Kanban | `.kanban-board` | 布局 | 桌面三列，gap 16px；1180px 以下单列 |
| Kanban 卡 | `.kanban-card` | 尺寸 / padding | 14px padding，14px 圆角，深色边框 |
| 日历网格 | `.calendar-grid` | 布局 | 7 列桌面网格，移动端单列 |
| 24 小时轴 | `.timeline-hour` | 布局 | `72px minmax(0,1fr)`，58px 最小高度 |
| Drawer | `.drawer` | 位置 / 尺寸 | fixed 右侧，桌面实际 460px 宽，z-index 120 |
| 新建弹窗 | `.create-modal` | 尺寸 / padding | 620px 宽，22px padding，18px 圆角 |
| 移动底部导航 | `.minimal-mobile-nav` | 位置 / 尺寸 | fixed bottom，390px 下高 69px，z-index 80，8 个 tab 横向滚动 |

## 3. CSS 文件证据

| 文件 | 相关内容 | 说明 |
|---|---|---|
| `src/styles/demo.css:1-28` | `:root` token | 浅色全局变量、字体、基础行高 |
| `src/styles/demo.css:46-55` | `.minimal-shell` | 深色主壳和桌面两列布局 |
| `src/styles/demo.css:57-109` | Sidebar 与移动导航初始状态 | 桌面 Sidebar、移动导航默认隐藏 |
| `src/styles/demo.css:159-270` | Header、搜索、按钮、页面 padding | 顶部工具栏和主内容基础布局 |
| `src/styles/demo.css:570-670` | `.minimal-shell` 深色覆盖 | 将浅色通用组件覆盖成深色样式 |
| `src/styles/demo.css:672-804` | 900px/460px 响应式 | 移动端单列、底部导航、安全区、Header 换行 |
| `src/styles/demo.css:1680-1775` | 表单和任务表格 | 42px 控件、900px 最小表格、固定列宽 |
| `src/styles/demo.css:1872-2029` | Kanban 和日历 | 三列看板、7 列日历、日卡样式 |
| `src/styles/demo.css:2031-2167` | 24 小时轴和趋势图 | 时间轴、当前小时、小时柱状图 |
| `src/styles/demo.css:2335-2499` | Drawer 和新建任务 Modal | 右侧抽屉、遮罩、弹窗、分段控件 |
| `src/styles/demo.css:2583-2735` | 旧布局/通用页面响应式 | Kanban、统计、日历、弹窗移动端适配 |

## 4. 交互证据

| 组件 | 操作 | 观察结果 |
|---|---|---|
| Sidebar 导航 | 点击 Dashboard/任务/AI/看板/日历/统计/标签/设置 | 路由分别为 `/`、`/tasks`、`/ai`、`/board`、`/calendar`、`/stats`、`/tags`、`/settings` |
| 新建任务 | 点击 Header “新建任务” | 打开居中 Modal，含 AI 生成和自定义创建 tab |
| 任务详情 | 点击任务表格 “查看详情” | 打开右侧 Drawer，展示字段、子任务、AI 分析 |
| 日历范围 | 观察 `近 7 天 / 近 14 天 / 近 30 天 / 今日 24 小时 / 逾期` | 控件存在，active 样式为紫色浅底 |
| 移动导航 | 390x844 下观察 | `.minimal-mobile-nav` 固定底部，8 个 tab 横向滚动 |
| 控制台 | 读取 browser dev logs | error = 0，warning = 0 |

## 5. 响应式证据

| 尺寸 | 页面 | 观察结果 |
|---|---|---|
| 1440x900 | Dashboard/各主页面 | 左侧 240px Sidebar，右侧 Header + 内容区；布局完整 |
| 1280x720 | Dashboard | 桌面布局仍可用，高度略紧 |
| 1024x768 | Dashboard | 接近小桌面，内容仍保持桌面结构 |
| 768x1024 | Dashboard | 移动布局生效，Sidebar 变顶部品牌栏，底部 tab 出现 |
| 390x844 | Dashboard | Header 换行，搜索占满第二行，底部 tab 固定 |
| 390x844 | 全部任务 | 表格仍 900px 宽，需要横向滚动 |
| 390x844 | 日历 | 日历网格变单列日期卡片，高度约 1542px |
| 375x667 | Dashboard | 小屏高度压力明显，内容很长，底部导航保留 |

## 6. 页面实现情况

| 页面/模块 | 当前状态 |
|---|---|
| Dashboard 首页 | 已实现 |
| 今日任务页面 | 未观察到独立页面，Dashboard 中有今日任务模块 |
| 全部任务页面 | 已实现 |
| AI 推荐页面 | 已实现 |
| 任务看板页面 | 已实现 |
| 日历页面 | 已实现 |
| 数据统计页面 | 已实现 |
| 标签管理页面 | 已实现 |
| 设置页面 | 已实现 |
| 新建任务弹窗 | 已实现并截图 |
| 编辑任务弹窗或编辑区域 | 有按钮入口，但未观察到独立弹窗证据 |
| 任务详情 Drawer | 已实现并截图 |
| 删除确认弹窗 | 有按钮入口，但未观察到独立确认弹窗证据 |
| 深色模式页面 | 当前主应用即深色状态 |
| 移动端布局 | 已实现底部导航，但任务表格移动端不理想 |
