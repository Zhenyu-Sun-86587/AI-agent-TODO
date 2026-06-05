# 当前前端真实状态总结

## 当前页面真实风格

AI-agent-TODO 当前是一个已成型的 Todo Dashboard Web 应用。整体视觉是极简后台工作台风格：左侧 240px 导航、顶部搜索和操作、主内容卡片化。浅色模式是 #f5f7fb 背景 + 白色卡片 + #4f46e5 主色；深色模式是 #09090b shell + #121214 surface。组件不依赖 Tailwind class，主要通过 `frontend/src/styles/demo.css` 的自定义 CSS 实现。

当前已经具备 AI 产品元素：Sparkles 图标、AI 推荐文案、AI 标签、Create Modal 的自然语言生成入口、AI 推荐分类工具、Drawer AI 分析区。但 AI 页面本地演示状态下显示推荐空态，AI 视觉重心不足，整体仍有普通 Todo 管理工具感。

## 当前布局结构

- 根布局：`Layout.tsx` 中 `.minimal-shell minimal-shell-light/dark`。
- Desktop：CSS grid，240px Sidebar + workspace。Header 64px，主内容 `.minimal-page` padding 24px 32px 32px。
- Mobile：900px 以下 shell 改 block，Sidebar 变顶部品牌条，主导航隐藏，底部 `.minimal-mobile-nav` 固定 5 项：Dashboard、全部任务、新建、AI 推荐、数据统计。
- Tasks：desktop table，820px 以下隐藏 `.desktop-table-wrapper`，显示 `.mobile-card-list` 和 `.mobile-task-card`。
- Calendar：同一路由支持 7/14/30 天、24h、逾期；24h 是左侧时间轴 + 右侧未排期面板。
- Stats：desktop 为统计卡 + 大图表 + 右侧分布；1180px 以下单列。
- Overlay：Create/Edit/Delete 使用 `.modal-backdrop`；详情使用右侧 `.drawer`。

## 当前组件样式

Sidebar：白色/深色透明背景，42px nav item，active 使用 #eef2ff + #4f46e5，radius 10px。没有明显分组。

Header：搜索框 320x40 胶囊，主按钮 111x38 胶囊，icon button 38x38，用户按钮胶囊。移动端隐藏部分 icon，仅保留主题切换。

Dashboard：Hero 文字 + 完成率，4 个统计卡，两个 18px radius panel。AI panel 有 radial overlay 和 AI 推荐 tiny tag。

TaskTable：表格 min-width 900px，行高约 73.5px，表头 13px/900，行 hover #f8fafc。移动端不是表格横滚，而是 316px 宽任务卡片。

TaskBoard：3 列 Kanban，列 padding 14px/radius 16px，卡片 padding 14px/radius 14px。无拖拽。

Calendar：控制按钮 38px 高，active 用 primary-soft；7 天 grid，24h 为 24 个 timeline-hour。

AIAssistant：AI 推荐卡、AI suggest tool、AI logs panel 都存在。本地模式无真实 AI logs。

Modal：620px/440px 两种宽度，18px radius，backdrop rgba(15,23,42,.38)，动画 160ms。

Drawer：460px 右侧抽屉，padding 22px，动画 200ms；AI 分析区有 primary/purple gradient。

## 当前主要视觉问题

1. AI 页面在本地模式下 AI 推荐列表为空，产品特色没有 Dashboard 强。
2. 卡片几乎都 shadow none，层级主要靠 #e4e7ec 边框，页面偏平。
3. 圆角偏大且同质化，18px 卡片、14px 卡片、999px 胶囊到处出现。
4. 高优先级和错误语义共用红色，视觉语义可以拆分。
5. Header/Sidebar 是桌面后台范式，移动端 App 壳需要更“手机优先”的顶部/底部结构。
6. CSS 中旧 `.app-dashboard` 和新 `minimal-*` 并存，后续 AI 修改时容易误判。
7. favicon.ico 缺失导致浏览器记录 404。

## 当前主要交互问题

- 普通输入框 focus ring 不明显，只有 Header 搜索有 focus-within 边框变化。
- Modal/Drawer 只有入场动画，没有关闭动画。
- Drawer 无 backdrop，computed shadow 为 none，分层弱。
- Kanban 没有拖拽态，不应在后续文档里假设已有拖拽。
- Toast 未发现，创建/编辑/删除缺少全局反馈。
- Dark mode toggle 是直接切 class，没有颜色过渡。

## 当前响应式问题

- 390x844 和 375x667 未检测到页面级横向溢出。
- 390x844 全部任务页已正确使用 `.mobile-task-card`，卡片宽 316px，高约 132px。
- 768x1024 已进入移动壳：顶部品牌条 + 底部导航，但 Sidebar 占满顶部宽度，Dashboard 内容高度较长。
- 1024x768 仍保留 240px Sidebar，内容宽 784px，Dashboard 纵向变长。
- Calendar mobile 可用，但控制按钮横向滚动，日历内容很长。
- Modal mobile 贴底全宽，Drawer mobile 全宽，方向正确。

## 后续修改重点

1. 先重构 AI 视觉中心：AI 推荐页应该成为最强 AI 页面，而不是空态页面；统一 AI Assistant Card、AI reason、AI tag、AI input。
2. 移动 App 壳优先：减少 Header 行内信息，把搜索/用户/通知做成二级入口，底部导航保持主路径。
3. 建立视觉 token：surface 层级、radius 层级、shadow 层级、focus ring、status/priority 语义拆分。
4. 保持当前已验证的移动任务卡片实现，不要回到桌面表格横向滚动。
5. 为 Modal/Drawer/Dropdown/Toast 定义完整 enter/exit 规范。
6. 清理旧 CSS 或明确标记旧样式，避免后续 AI 修改错体系。
