# AI-agent-TODO 当前前端风格指南

采样时间：2026-06-05 14:29-14:34。  
采样方式：真实浏览器访问 `http://127.0.0.1:5173/`，使用桌面和移动视口截图、提取 computed style，并分析 `frontend/src/styles/demo.css`。  
证据位置：`doc/frontend/evidence/computed-styles.json` 与 `doc/frontend/evidence/screenshots/`。

## 1. 总体视觉结论

当前前端是产品级 Dashboard / 任务管理后台方向，不是普通 Todo List。页面包含左侧导航、顶部工具栏、Dashboard、全部任务、AI 推荐、任务看板、日历、数据统计、标签管理、设置、新建任务弹窗、编辑任务弹窗、任务详情 Drawer、删除确认弹窗和移动端底部导航。

这版相较上一轮更完整：移动端任务列表已经从横向表格转为 `.mobile-task-card` 卡片列表；主题切换已经可用，存在 `.minimal-shell-dark` 和 `.minimal-shell-light` 两套状态；Modal、Drawer、Backdrop 已有基础入场动画；AI 分析区新增了 `ai-brand-tag`、`ai-reason-block` 等更明确的 AI 视觉组件。

当前真实数据为 API 登录态，Header 显示 `API` 状态和用户 `CodexQA1780624107840`。任务数据偏少，表格和看板主要显示后端同步任务，其中包含用于安全测试的 `<script>alert("xss")</script>` 文本，页面将其作为文本展示，没有在浏览器控制台产生 error/warn。

## 2. 色彩系统

| 用途 | 颜色值 | 出现场景 | 问题 |
|---|---|---|---|
| 深色背景 | `#09090b` | `.minimal-shell-dark` | 专业、安静，适合后台 |
| 深色一级卡片 | `#121214` | Dashboard 卡片、Modal、Drawer | 统一性好，但大面积会偏平 |
| 深色二级卡片 | `#18181b` | 输入框、任务卡、内层字段 | 可作为嵌套 surface |
| 浅色背景 | `#f5f7fb` | `.minimal-shell-light` | light theme 已实现，但仍需全组件 QA |
| 浅色卡片 | `#ffffff` | light theme、移动任务卡 evidence | 移动任务卡在 light 状态下更清晰 |
| 主色 | `#4f46e5` | 主按钮、active、AI 标签 | 产品识别清楚 |
| 主色 hover | `#4338ca` | `.primary-button:hover`、`.minimal-primary:hover` | 可继续统一到 token |
| 辅助紫 | `#7c3aed` | AI 渐变、趋势图 | AI 感较强 |
| 主文本深色 | `#f8fafc` | 深色标题 | 对比足够 |
| 正文深色 | `#cbd5e1` | 深色正文 | 可读 |
| 弱化文本 | `#64748b` / `#94a3b8` | 描述、meta、空态 | 部分小字偏灰 |
| 深色边框 | `rgba(255,255,255,0.06)` | 卡片、导航、底部 tab | 对比低但统一 |
| 浅色边框 | `#e4e7ec` | light theme、移动卡片 | 清晰 |
| 成功 | `#16a34a` | 已完成、task-check checked | checkbox 状态清楚 |
| 警告/中优先级 | `#f97316` / `rgb(194,65,12)` | 中优先级、进行中 | 色彩语义需更清楚 |
| 错误/高优先级 | `#dc2626` | 高优先级、danger | 删除确认 danger 按钮可见 |
| AI 区域 | `rgba(79,70,229,.15)`、`#a5b4fc`、紫色渐变 | AI 标签、AI reason、AI 分析 | 已有产品特色，但需要组件化统一 |

## 3. 字体系统

| 类型 | 字体 | 字号 | 字重 | 行高 | 使用场景 |
|---|---|---|---|---|---|
| 全局字体 | Inter + 系统中文字体 | 继承 | 继承 | `1.5` | 全局 |
| 页面标题 | 同上 | 24-32px 区间 | 800-900 | 紧凑 | 页面 H1、Drawer 标题 |
| 卡片标题 | 同上 | 16-18px | 800-900 | 约 1.4 | 卡片/模块标题 |
| 正文 | 同上 | 14px | 400-600 | 1.5 | 描述、表格正文 |
| 辅助文字 | 同上 | 12-13px | 700-900 | 1.4 | meta、标签、时间 |
| 按钮文字 | 同上 | 14px；移动底部 11px | 800-900 | 1 | 主按钮、导航 |
| Badge | 同上 | 12-13px | 800-900 | 24px 内居中 | 状态、优先级 |

问题：字重偏重的地方较多，按钮、表头、badge、meta 都偏 800+。后续可保留标题强度，降低表格和辅助信息字重，改善层级。

## 4. 间距系统

| 场景 | 当前值 | 是否统一 | 问题 |
|---|---|---|---|
| Sidebar 宽度 | `240px` | 统一 | 桌面稳定 |
| Header 高度 | `64px` | 统一 | 移动端换行后较高 |
| 页面 padding | 桌面 `24px 32px 32px`，移动 `18px 16px 28px` | 统一 | 移动端仍需考虑底部 tab 安全区 |
| Dashboard 最大宽度 | 约 `1120px` | 统一 | 宽屏阅读舒适 |
| 卡片 padding | 14/16/18/20/22/24px | 不完全统一 | 建议收敛到 16/20/24 |
| 表单控件高度 | `42px` | 统一 | 移动端可以保持 |
| 主按钮高度 | `38px` / 通用按钮 `40px` | 基本统一 | 两套按钮体系可合并 |
| Kanban gap | `16px` | 统一 | 1180px 以下转单列 |
| 移动任务卡 | 390px 下约 `316x165`，padding `14px`，gap `12px` | 新增合理 | 卡片宽度还可用满 100% |
| 日历日卡 | padding `14px`，min-height `220px` | 统一 | 14/30 天会偏长 |

## 5. 布局系统

桌面端：`.minimal-shell` 为 `240px minmax(0,1fr)` 两列布局，左侧 Sidebar，右侧 Header + `.minimal-page`。主要页面使用内容卡片和网格布局，Dashboard 居中宽度控制较好。

移动端：900px 以下 `.minimal-shell` 变为 block，Sidebar 收成顶部品牌栏，主导航隐藏，`.minimal-mobile-nav` 固定底部，8 个 tab 横向滚动。820px 以下全部任务页隐藏 `.desktop-table-wrapper`，显示 `.mobile-card-list`，这是目前 app 端最合理的变化。

## 6. 组件风格

### Sidebar

宽 240px，深色状态下与主背景一致，右侧边框 `rgba(255,255,255,.06)`。菜单项 42px 高，active 用淡紫背景和紫色文字。没有复杂分组，适合当前规模。移动端转为底部导航。

### Header

高度 64px，桌面右侧包含新建任务、通知、主题切换、API 状态、用户、退出。搜索框 320px 宽、40px 高、999px 圆角。移动端 Header 换行，主题按钮保留，其他图标会隐藏，用户 pill 截断。

### TaskCard

桌面任务仍主要通过表格和 Kanban 卡展示；移动端已使用 `.mobile-task-card`，卡片 14px padding、14px 圆角、12px gap，展示标题、描述、状态、优先级、分类、截止时间，并提供 `.task-check` 和更多操作按钮。已完成状态 checkbox 为绿色实心圆。

### TaskTable

桌面表格保留完整字段：任务名称、状态、优先级、分类、截止时间、创建时间、操作。`min-width: 900px` 适合桌面，但移动端已通过 wrapper 隐藏，避免横向滚动，这是合理方向。行操作按钮多，仍需提升命中区和菜单反馈。

### TaskBoard

CSS 支持三列 Kanban，但当前数据只有 “待办 / 已完成” 两列可见，没有进行中任务。列内卡片包含标题、描述、分类、时间、AI 分类。1180px 以下转单列。

### AIAssistantCard

AI 内容明显存在：Dashboard AI 智能建议、AI 推荐页、Drawer AI 分析、AI reason block、AI brand tag、AI 预计时间/置信度。视觉已开始像 AI 功能，但可继续统一图标、标签、解释卡片、置信度和调用日志。

### CreateTaskModal

桌面宽 620px，高约 517px，padding 22px，18px 圆角，Backdrop 为半透明深色。包含 `AI 生成 / 自定义创建` 分段控件和自然语言输入。移动端会底部对齐，适合继续做成 bottom sheet。

### EditTaskModal

已实现并截图。入口来自任务行 “编辑任务”，打开后标题为 “编辑任务”，沿用 create-modal 的结构和表单样式。应继续确认移动端字段长度、保存/取消按钮固定性。

### DeleteConfirmModal

已实现并截图。`.confirm-modal` 宽 `min(440px,100%)`，内容包括 “确认删除任务？”、说明、目标任务摘要、取消和确认删除按钮。危险按钮为浅红底红字，符合语义。

### TaskDetailDrawer

桌面右侧 fixed drawer，宽 460px，高 100vh，padding 22px，包含字段、子任务空态、AI 分析、底部操作。已有 `drawerSlideIn 200ms` 入场动画。移动端宽 100vw，但还可以优化成全屏详情页。

### StatsCard

统计页包含 KPI 卡、趋势图、分类分布、优先级分布。当前数据少，图表有演示感，但结构已完整。建议后续加 tooltip、空态、单位、坐标说明。

## 7. 当前视觉问题

| 问题 | 表现 | 影响 |
|---|---|---|
| 深浅主题体系仍有双轨 | `.minimal-shell-dark/light` 已有，但部分通用变量仍来自浅色 root | 维护成本高 |
| AI 组件仍分散 | AI 建议、AI 分析、AI reason 样式相近但未统一 API | 后续扩展容易不一致 |
| 数据少时页面略空 | Dashboard 今日任务 0、看板少列 | 需要更好的空态和引导 |
| 移动底部 tab 入口过多 | 8 个 tab 横向滚动 | app 端导航负担偏重 |
| 行操作菜单反馈不足 | 更多操作、编辑/删除按钮为小图标 | 可发现性一般 |
| 浅色移动卡片与深色壳并存时需复核 | computed evidence 中移动卡片 light 样式清晰，但 dark 状态也要验 | 主题一致性风险 |

## 8. 可复用风格规则

| 规则 | 建议 |
|---|---|
| 主背景 | dark `#09090b`，light `#f5f7fb` |
| 一级 surface | dark `#121214`，light `#ffffff` |
| 二级 surface | dark `#18181b`，light `#f8fafc` |
| 主色 | `#4f46e5`，hover `#4338ca` |
| AI surface | 紫色 8%-15% 透明背景 + 紫色边框 + AI tag |
| 圆角 | 卡片 14-16px，Modal 18px，按钮 10px/999px |
| 动效 | hover 160ms，Modal 160ms，Drawer 200ms |
| 移动任务 | 使用 `.mobile-card-list` + `.mobile-task-card`，不要回退到横向表格 |

## 9. 后续美化方向

1. 把 dark/light token 抽成明确设计变量，减少 `.minimal-shell-light` 大量覆盖规则。
2. 移动端底部导航收敛为 4-5 个高频 tab，其余放 “更多”。
3. 继续强化 AI 组件体系：AI 标签、解释原因、置信度、预计时间、调用日志统一。
4. 编辑弹窗和删除确认补充移动端视觉验证。
5. 数据少的 Dashboard、Kanban、统计页增加更精致的空态。
6. 给 row-menu、toast、dropdown、drag hover 做完整状态规范。
