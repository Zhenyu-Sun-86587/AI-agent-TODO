# AI-agent-TODO 当前前端风格指南

> 提取时间：2026-06-05T08:27:27.911Z。真实浏览器：Chrome/148.0.7778.216。入口：http://127.0.0.1:5173。证据文件：`doc/frontend/evidence/computed-styles.json`，截图目录：`doc/frontend/evidence/screenshots/`。
> 本次使用全新浏览器 Profile 点击“使用演示账号（本地）”进入主界面，页面状态显示“本地 / Demo User”。因此内容数据来自前端演示任务，视觉、布局、组件、动效结论来自真实 DOM、截图、computed style 和源码 CSS。

## 1. 总体视觉结论

当前前端是偏产品 Dashboard 的 Todo 工作台，而不是纯列表页：左侧固定导航、顶部搜索/操作区、Dashboard 卡片、任务表格、Kanban、日历、统计、标签、设置、Modal、Drawer 都已真实实现。整体已经比默认组件库更定制，使用 `minimal-*` 体系、浅/深色主题、移动端底部导航和 AI 视觉符号。

成熟度处于“功能完整、视觉仍偏朴素”的阶段。浅色模式主要由白色卡片、淡灰背景、靛蓝主色组成，卡片几乎无阴影，页面清爽但层次偏平；深色模式可用，但主体是 #09090b / #121214 的极暗方案，AI 产品感主要靠 Sparkles 图标、靛蓝/紫色渐变和 AI 文案支撑。当前最明显的问题是：AI 推荐页在本地演示模式下显示 AI 推荐空态，Dashboard 有 AI 推荐列表但 AI 页反而弱；多个组件统一使用 18px 大圆角和 999px 胶囊，风格统一但缺少精细层级；移动端顶部栏信息偏多，底部导航可用但不是原生 App 级交互。

页面实现状态：

| 模块 | 当前真实状态 | 证据 |
|---|---|---|
| Dashboard 首页 | 已实现，包含 Hero、今日完成率、4 个统计卡、AI 智能建议、今日任务 | `dashboard-desktop.png` |
| 今日任务页面 | 没有独立路由；作为 Dashboard 右侧“今日任务”模块实现 | `Dashboard.tsx`，`dashboard-desktop.png` |
| 全部任务页面 | 已实现；桌面表格 + 移动端 `.mobile-task-card` 卡片 | `task-list-desktop.png`、`task-list-mobile.png` |
| AI 推荐页面 | 已实现；含 AI 推荐卡片、AI 推荐分类/优先级工具、AI 日志；本地模式 AI 推荐列表为空态 | `ai-recommendation.png` |
| 任务看板页面 | 已实现 3 列 Kanban：待办 / 进行中 / 已完成 | `task-board-desktop.png` |
| 日历页面 | 已实现近 7 / 14 / 30 天、今日 24 小时、逾期视图 | `calendar-desktop.png`、`calendar-24h-desktop.png` |
| 数据统计页面 | 已实现统计卡、趋势柱图、分类分布、优先级分布 | `stats-page.png` |
| 标签管理页面 | 已实现标签云列表 | `tags-page.png` |
| 设置页面 | 已实现个人资料、AI 配置、联调信息 | `settings-page.png` |
| 新建任务弹窗 | 已实现，默认 AI 生成模式 | `create-task-modal.png` |
| 编辑任务弹窗 | 已实现，复用手动任务表单 | `edit-task-modal.png` |
| 任务详情 Drawer | 已实现，右侧 460px 抽屉，含 AI 分析 | `task-detail-drawer.png` |
| 删除确认弹窗 | 已实现 | `delete-confirm-modal.png` |
| 深色模式 | 已实现，通过 `.minimal-shell-dark` / `.minimal-shell-light` 切换 | `dark-mode.png`、`light-mode.png` |
| 移动端布局 | 已实现；900px 以下顶部压缩、底部导航，820px 以下任务表格切换为卡片 | `dashboard-mobile.png`、`task-list-mobile.png` |

## 2. 色彩系统

| 用途 | 颜色值 | 出现场景 | 问题 |
|---|---|---|---|
| 页面背景 | #f5f7fb / rgb(245,247,251) | 浅色 `.minimal-shell-light` | 清爽，但大面积浅灰 + 白卡片层次偏弱 |
| 深色背景 | #09090b / rgb(9,9,11) | 深色 `.minimal-shell-dark` shell | 极暗，和浅色模式气质差异大 |
| 深色卡片 | #121214 / rgb(18,18,20) | 深色 stats/panel/card | 可读性尚可，但 AI 色彩没有被进一步强化 |
| 卡片背景 | #ffffff / rgb(255,255,255) | 统计卡、表格卡、AI 卡、Modal、Drawer | 使用非常广，层级主要靠边框而不是光影 |
| 弱背景 | #f8fafc / rgb(248,250,252) | hover、图表背景、确认目标、移动卡片 active | 和页面背景接近，弱反馈不够明显 |
| 主色 | #4f46e5 / rgb(79,70,229) | 主按钮、active nav、AI tag、日历 active | AI 产品识别主要依赖这个色，略单一 |
| 主色 hover | #4338ca / rgb(67,56,202) | `.minimal-primary:hover` | 只有颜色变化，无位移或光效 |
| 辅助紫 | #7c3aed | AI 渐变、趋势柱图 | 紫色只在局部出现，AI 视觉语言不够系统 |
| 文本主色 | #172033 / rgb(23,32,51) | 浅色主文案 | 可读性好 |
| 文本弱化 | #667085 / rgb(102,112,133) | 描述、meta、表单 label | 统一，但某些小字偏弱 |
| 边框 | #e4e7ec / rgb(228,231,236) | 卡片、输入、表格、标签 | 是主要分层手段，页面显得平 |
| focus 色 | rgba(99,102,241,.7) | `.minimal-search:focus-within` | 仅 Header 搜索明显，普通表单 focus ring 偏弱 |
| 成功状态 | #dcfce7 / #16a34a | 已完成 badge、checked checkbox | 清晰 |
| 警告状态 | #fef3c7 / #b45309 | 进行中 badge | 清晰 |
| 错误状态 | #fee2e2 / #dc2626 | 高优先级、危险按钮语义 | 高优先级和错误色共用，语义容易混淆 |
| 高优先级 | #fee2e2 / #dc2626 | `.priority-高` | 与错误色一致 |
| 中优先级 | #ffedd5 / #c2410c | `.priority-中` | 与警告接近 |
| 低优先级 | #dbeafe / #2563eb | `.priority-低` | 可识别 |
| AI 区域 | linear-gradient rgba(79,70,229,.08) + rgba(124,58,237,.06/.10/.12) | AI 卡、Drawer AI 分析、AI reason block | 有 AI 暗示，但整体仍像普通信息卡 |

## 3. 字体系统

| 类型 | 字体 | 字号 | 字重 | 行高 | 使用场景 |
|---|---|---|---|---|---|
| 全局正文 | Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, PingFang SC, Microsoft YaHei | 16px | 400 | 24px | shell/body computed style |
| Dashboard Hero 标题 | 同上 | 24px | 800 | 1.25 | `.minimal-hero h1` |
| 页面标题 | 同上 | clamp(28px, 3vw, 38px) | 默认继承/标题加粗 | 约 1.2 | `.page-heading h1` |
| Drawer / Modal 标题 | 同上 | 24px | 标题默认加粗 | 约 1.2 | `.drawer-header h2` |
| 统计数字 | 同上 | Dashboard 26px；旧 stats card 约 26px | 800/900 | 约 1.2 | `.minimal-stat strong`、`.stats-card` |
| 卡片标题 | 同上 | 16px 左右 | 800/900 | 24px | task/table/card strong |
| 正文 | 同上 | 16px | 400 | 24px | 卡片正文、表单正文 |
| 辅助文字 | 同上 | 13px-14px | 700-800 | 约 19.5px-21px | meta、说明、表头、label |
| 标签文字 | 同上 | 12px | 900 | 18px | priority/status/AI tag |
| 按钮文字 | 同上 | 14px | 800/900 | 21px | Header 主按钮、icon/user、segment |

问题：字体家族统一，中文显示稳定；但字号层级偏少，很多内容都落在 14/16px，Dashboard/表格/设置页的信息层级区别主要靠布局而不是字体。CSS 中存在 `page-heading h1 clamp`，违反“不要按 viewport 缩放字号”的后续重构约束，后续建议改成断点固定字号。

## 4. 间距系统

| 场景 | 当前值 | 是否统一 | 问题 |
|---|---|---|---|
| Shell 布局 | 240px sidebar + 1fr | 统一 | 1024px 仍保留 240px sidebar，内容宽度变紧 |
| Header 高度 | 64px desktop；移动端 auto + 14px 16px padding | 基本统一 | 移动端 action 信息偏多 |
| 页面主内容 padding | desktop 24px 32px 32px；mobile 18px 16px 28px | 统一 | 移动端首屏内容较长 |
| Dashboard 容器 | max-width 1120px，gap 32px，mobile gap 22px | 统一 | 桌面留白舒适，移动端卡片纵向较长 |
| 卡片 padding | 统计 16/18px；内容卡 20px；Panel 24px；Modal/Drawer 22px | 接近统一 | 18/20/22/24 同时存在，节奏略碎 |
| 卡片 gap | 12/14/16/18/24/32px | 部分统一 | 需要明确 4/8/12/16/24/32 规则 |
| 表单项间距 | label/field gap 7px，form gap 14px，form-grid gap 12px | 统一 | 可保留 |
| 按钮内边距 | 主按钮 0 16px，日历 tab 0 12px，row button 32px square | 统一 | 主按钮过度胶囊化 |
| 任务卡片间距 | TaskCard gap 12px，mobile card gap 12px，Kanban card gap 8px | 基本统一 | Kanban 信息密度略高 |
| 看板列间距 | 16px | 统一 | 小屏 1180px 以下变单列，视觉高度很长 |

## 5. 布局系统

Desktop：`.minimal-shell` 为 grid，computed 为 `240px 1200px`；Sidebar 240px，Header 位于右侧 workspace 顶部，高 64px；主内容 `.minimal-page` 在 1440x900 下为 1200x836，overflow auto。

Tablet / mobile：`@media (max-width: 900px)` 后 shell 改 block，Sidebar 变顶部品牌条，`.minimal-nav` 隐藏，`.minimal-mobile-nav` 固定底部 5 等分。`@media (max-width: 820px)` 后任务表格 wrapper display none，`.mobile-card-list` display grid；390x844 下任务移动卡片 computed 为 316x132px，页面无横向溢出。

日历：默认 7 天为 7 列 grid；点击“今日 24 小时”后变 `.timeline-layout`，左侧 24 个 `.timeline-hour`，右侧 320px 未排期面板。Stats：桌面 `.stats-grid` 4/6 卡片，`.stats-panels` 为大图表 + 右侧分布列，1180px 以下单列。

## 6. 组件风格

### Sidebar

- Desktop 宽度 240px，浅色背景 #fff，深色透明承接 #09090b shell。
- 菜单项高 42px，图标来自 lucide，图标 + 文案横向排列，gap 12px，字号 14px。
- Active 浅色：#eef2ff 背景 + #4f46e5 文字，font-weight 800，radius 10px。深色：rgba(79,70,229,.12) + #818cf8。
- Hover 浅色：#f8fafc + #172033；深色：rgba(255,255,255,.05) + #e2e8f0。
- 没有可见分组标题；移动端隐藏 nav，仅保留品牌条 + 底部导航。
- 视觉统一，但 active/hover 反馈较轻，缺少当前页面更强的定位标记。

### Header

- Desktop 高 64px，padding 0 32px，透明背景。
- 搜索框 320x40，radius 999px，浅色 #fff + #e4e7ec；focus-within 变 rgba(99,102,241,.7)。
- 新建任务按钮 111x38，radius 999px，#4f46e5，font 14/800，box-shadow rgba(79,70,229,.22) 0 12px 28px。
- 通知、主题、退出 icon button 为 38x38 圆形；移动端普通 icon 隐藏，主题按钮保留。
- 用户按钮 124.95x38，胶囊形，包含 user icon + Demo User；移动端 max-width 104px。
- 当前 Header 信息完整，但在 390px 下 actions 仍多，容易拥挤。

### TaskCard

- Dashboard 使用 `.minimal-task-row`，桌面 498x104，grid 30px + 1fr，padding 13px，radius 14px。
- 旧通用 `.task-card` 仍存在：grid 34px + 1fr，padding 14px，hover translateY(-1px) + shadow。
- 全部任务移动端使用 `.mobile-task-card`，390x844 下 316x132px，padding 14px，gap 12px，radius 14px。
- 显示字段：标题、描述、状态、优先级、分类、截止时间，AI 创建任务显示 AI tiny tag。
- Checkbox 为 28x28 圆形，未完成 border #cbd5e1，已完成 #16a34a 填充。
- 已完成标题会加 `task-title-done`，但视觉强度需要后续复核。

### TaskTable

- `.task-table` min-width 900px，table-layout fixed；桌面 wrapper 1092x486.5，边框包裹 radius 14px。
- 表头 13px / 900 / muted；td padding 13px 12px；行高约 73.5px。
- 行 hover：#f8fafc，无 shadow/位移。
- 行操作按钮 32x32，radius 9px，更多菜单 `.row-menu` 124x118，shadow var(--shadow)，menuScaleIn 140ms。
- 820px 以下桌面表格隐藏，移动卡片显示。这一点当前已经合理，不再是横向滚动表格。

### TaskBoard

- 桌面 `.kanban-board` 3 列 repeat(3, 1fr)，gap 16px。
- 列 `.task-column` 368px 宽，padding 14px，radius 16px，浅色 computed 背景为白色，源码意图是 surface-soft 与 surface 混合。
- 卡片 `.kanban-card` 338x120.5，padding 14px，gap 8px，radius 14px。
- 空列有 dashed empty state；当前演示数据 3 列都有任务。
- 未实现拖拽交互状态，Kanban 只是状态分组视图。

### AIAssistantCard

- Dashboard AI 面板有 radial overlay，推荐行包含“AI 推荐” tiny tag、推荐原因、优先级、截止时间。
- AI 推荐页 `.ai-card` computed 背景为白色，但源码定义有靛蓝/紫色低透明渐变；本地模式下推荐列表为空态，导致 AI 页产品感弱。
- AI 推荐分类/优先级工具存在：标题、描述 textarea、推荐结果，说明本地演示使用前端规则兜底，后端登录调用 /ai/suggest。
- Drawer 内 AI 分析较完整：自动分类、推荐优先级、预计时间、置信度、AI reason block。
- 主要问题：AI 能力分散在 Dashboard、AI 页、Drawer、Create Modal，缺少统一的 AI 视觉中心和自然语言入口主优先级。

### CreateTaskModal

- Backdrop fixed，全屏 rgba(15,23,42,.38)，padding 18px，fadeIn 160ms。
- Modal 620px 宽，max-height calc(100vh - 36px)，padding 22px，gap 14px，radius 18px，modalSlideUp 160ms。
- 默认 AI 生成模式：Segment 2 列，AI prompt textarea min-height 110px，AI empty preview 14px padding。
- 编辑弹窗复用 `.create-modal`，高度 712px，手动表单 grid 576px。
- 移动端 Modal 贴底，width 100%，radius 18px 18px 12px 12px。

### TaskDetailDrawer

- 右侧 fixed，width min(460px,100vw)，z-index 120，padding 22px，gap 18px，overflow auto，drawerSlideIn 200ms。
- Drawer fields 为 2 列，12px gap；移动端变 1 列，Drawer 宽 100vw。
- AI 分析区域有紫/靛蓝渐变，AI tag、AI reason block、字段网格齐全。
- 当前 computed style 中 Drawer shadow 为 none，是因为深浅主题覆盖清掉了 box-shadow；源码原本有 -16px 0 38px 阴影。视觉上抽屉和背景的分离度偏弱。

### StatsCard

- Dashboard minimal stat：268x95，padding 16px，radius 18px，图标 40px 圆形。
- Stats 页面 card：272x112，padding 18px，radius 18px，图标 44px。
- 图表用 CSS bars：`.trend-bars` 260px 高，bar 为 primary->purple gradient；没有真实 chart 库。
- 数据层级清楚，但图表专业感一般，缺少坐标/图例/hover tooltip。

## 7. 当前视觉问题

1. AI 推荐页在本地模式下主要展示空态，Dashboard 反而更像 AI 产品，信息重心不一致。
2. 视觉层级过度依赖边框，卡片 shadow 被主题覆盖为 none，页面偏平。
3. 圆角体系偏大且重复：14/16/18/999px 同时大量出现，缺少组件层级差异。
4. 主色几乎只有靛蓝，紫色只在 AI 局部渐变，AI 品牌语言不够成体系。
5. 普通 input focus ring 不明显，只有 Header 搜索有明显 focus-within。
6. Dashboard、Stats、Task 页面都是白卡片，页面之间差异主要来自内容而不是布局节奏。
7. 移动端能用，但 Header actions 和用户胶囊仍偏桌面化；WebView app 体验还需要进一步收敛。
8. favicon.ico 404，被真实浏览器记录为资源错误。
9. CSS 中仍保留旧 `.app-dashboard`、`.sidebar`、`.top-header` 等旧体系，可能增加后续维护歧义。

## 8. 可复用风格规则

- 保留 `minimal-shell-light/dark` 作为主题入口，后续新增组件必须优先使用当前 CSS variables。
- 页面结构保持：Sidebar 240px、Header 64px、`.minimal-page` desktop padding 24/32/32、mobile padding 18/16/28。
- 卡片建议统一为：内容卡 16px radius + 16/20px padding；表单/弹窗 18px radius + 22px padding；标签 999px。
- 状态色保留：done green、in-progress amber、todo indigo；但高优先级和错误色后续应拆分。
- 移动端任务列表必须继续使用 `.mobile-task-card`，不要回退到横向滚动表格。
- AI 元素统一使用 Sparkles + primary/purple gradient + reason block；避免每个页面重新定义一套 AI 卡样式。
- 交互时长以 120/160/200ms 为主，Modal/Drawer 使用 `--ease-modal`。

## 9. 后续美化方向

1. 先做 AI 产品化：把 Dashboard AI 推荐、AI 页建议工具、Create Modal 自然语言输入、Drawer AI 分析统一成一套 AI Assistant 组件体系。
2. 建立清晰视觉层级：恢复轻阴影或引入更明确的 surface 层级，区分页面背景、section、card、row、overlay。
3. 收敛圆角和间距 token：例如 card 12/14/16，modal 18，pill 999；避免同级组件混用。
4. 优化移动端 Web/App 壳体验：减少 Header actions，突出底部导航与新建按钮，保证 Drawer/Modal 贴底交互自然。
5. 强化日历/统计专业感：日历 7/14/30/24h 视图保留，增加选中日期、任务密度、图例和 tooltip。
6. 清理旧样式体系：确认 `.app-dashboard`、`.sidebar` 等是否还被使用，避免后续 AI 修改误改旧组件。
