# AI-agent-TODO 风格提取证据清单

> 提取时间：2026-06-05T08:27:27.911Z。真实浏览器：Chrome/148.0.7778.216。方式：Chrome DevTools Protocol, headless Google Chrome, real DOM rendering and computed style extraction。本次覆盖位置：`doc/frontend/`。
> 注意：本次浏览器使用本地演示账号进入主界面，API 状态显示“本地”。Console 中只有 `/favicon.ico` 404 资源错误，没有业务脚本错误。

## 1. 截图证据

| 文件 | 页面 | 视口 | 说明 |
|---|---|---|---|
| evidence/screenshots/dashboard-desktop.png | / | 1440x900 | Dashboard 桌面首屏 |
| evidence/screenshots/task-list-desktop.png | /tasks | 1440x900 | 全部任务表格桌面首屏 |
| evidence/screenshots/ai-recommendation.png | /ai | 1440x900 | AI 推荐与 AI 字段建议页面 |
| evidence/screenshots/task-board-desktop.png | /board | 1440x900 | Kanban 看板桌面首屏 |
| evidence/screenshots/calendar-desktop.png | /calendar | 1440x900 | 日历默认近 7 天视图 |
| evidence/screenshots/stats-page.png | /stats | 1440x900 | 统计卡片与图表页面 |
| evidence/screenshots/tags-page.png | /tags | 1440x900 | 标签管理页面 |
| evidence/screenshots/settings-page.png | /settings | 1440x900 | 设置页面 |
| evidence/screenshots/calendar-24h-desktop.png | /calendar | 1440x900 | 点击“今日 24 小时”：成功 |
| evidence/screenshots/create-task-modal.png | /tasks | 1440x900 | 新建任务弹窗，默认 AI 生成模式 |
| evidence/screenshots/task-detail-drawer.png | /tasks | 1440x900 | 点击第一条任务后打开 Drawer |
| evidence/screenshots/edit-task-modal.png | /tasks | 1440x900 | 编辑任务弹窗 |
| evidence/screenshots/delete-confirm-modal.png | /tasks | 1440x900 | 删除确认弹窗 |
| evidence/screenshots/light-mode.png | / | 1440x900 | 浅色模式 Dashboard |
| evidence/screenshots/dark-mode.png | / | 1440x900 | 深色模式 Dashboard |
| evidence/screenshots/responsive-1440x900.png | / | 1440x900 | 响应式 1440x900 / |
| evidence/screenshots/responsive-1280x720.png | / | 1280x720 | 响应式 1280x720 / |
| evidence/screenshots/responsive-1024x768.png | / | 1024x768 | 响应式 1024x768 / |
| evidence/screenshots/responsive-768x1024.png | / | 768x1024 | 响应式 768x1024 / |
| evidence/screenshots/dashboard-mobile.png | / | 390x844 | 响应式 390x844 / |
| evidence/screenshots/task-list-mobile.png | /tasks | 390x844 | 响应式 390x844 /tasks |
| evidence/screenshots/calendar-mobile.png | /calendar | 390x844 | 响应式 390x844 /calendar |
| evidence/screenshots/responsive-375x667.png | / | 375x667 | 响应式 375x667 / |

## 2. Computed Style 证据

完整 JSON：`doc/frontend/evidence/computed-styles.json`。本次共抓取 290 条 selector 记录，其中 279 条存在于真实页面。

| 组件 | 选择器 | 样式项 | 结果 |
|---|---|---|---|
| Shell | .minimal-shell | layout / bg / font | desktop grid 240px + 1fr；浅色 bg rgb(245,247,251)，深色 bg rgb(9,9,11)；font Inter/system 16px/24px |
| Sidebar | .minimal-sidebar | size / bg | 240x900 desktop；浅色 #fff；移动端 390px 宽顶部品牌条 |
| Header | .minimal-header | size / padding | 1200x64 desktop；padding 0 32px；移动端 flex-wrap + padding 14px 16px |
| Header Search | .minimal-search | border / radius / focus | 320x40；border #e4e7ec；radius 999px；focus-within border rgba(99,102,241,.7) |
| Primary Button | .minimal-primary | bg / radius / hover | #4f46e5；radius 999px；hover #4338ca；shadow rgba(79,70,229,.22) 0 12px 28px |
| Dashboard Stat | .minimal-stat | size / padding / border | 268x95；padding 16px；border #e4e7ec；radius 18px |
| Content Card | .content-card.table-card | size / padding | 1136x638.5；padding 20px；radius 18px；shadow none |
| Task Table | .task-table | min width / row | min-width 900px；行高约 73.5px；hover #f8fafc |
| Mobile Task Card | .mobile-task-card | mobile size | 390x844 下 316x132；padding 14px；gap 12px；radius 14px |
| AI Card | .ai-card | bg / border | computed #fff + border #e4e7ec；源码定义低透明 primary/purple gradient |
| Kanban | .kanban-board / .task-column | columns / gap | desktop 3 列，gap 16px；列 radius 16px，padding 14px |
| Calendar | .calendar-grid / .timeline-hour | views | 7 天 grid；24h 视图 24 个 timeline-hour，单行 72px + 1fr |
| Stats | .stats-card / .trend-bars | chart | 卡片 272x112；trend-bars 260px 高，primary->purple CSS bars |
| Modal | .modal-backdrop / .create-modal | overlay / animation | backdrop rgba(15,23,42,.38)；modal 620px，radius 18px，modalSlideUp 160ms |
| Drawer | .drawer | size / animation | width 460px；padding 22px；drawerSlideIn 200ms；computed shadow none |
| Dropdown | .row-menu | size / animation | 124x118；radius 12px；shadow rgba(15,23,42,.08) 0 16px 34px；menuScaleIn 140ms |

## 3. CSS 文件证据

| 文件 | 相关内容 | 说明 |
|---|---|---|
| frontend/src/styles/demo.css:1 | :root { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:50 | .minimal-shell { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:736 | .minimal-shell-light { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:61 | .minimal-sidebar { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:163 | .minimal-header { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:112 | .minimal-mobile-nav { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:692 | .minimal-shell .task-table-row, | 源码样式/组件证据 |
| frontend/src/styles/demo.css:827 | .minimal-shell-light .mobile-task-card, | 源码样式/组件证据 |
| frontend/src/styles/demo.css:2165 | .kanban-board { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:2349 | .calendar-controls, | 源码样式/组件证据 |
| frontend/src/styles/demo.css:691 | .minimal-shell .timeline-hour, | 源码样式/组件证据 |
| frontend/src/styles/demo.css:646 | .minimal-shell .drawer-header h2 { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:666 | .minimal-shell .create-modal { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:2899 | .confirm-modal { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:2850 | .ai-reason-block { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:2922 | @keyframes fadeIn { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:2931 | @keyframes modalSlideUp { | 源码样式/组件证据 |
| frontend/src/styles/demo.css:2942 | @keyframes drawerSlideIn { | 源码样式/组件证据 |
| frontend/src/Layout.tsx:48 | <div className={`minimal-shell ${isDark ? "minimal-shell-dark" : "minimal-shell-light"}`}> | 源码样式/组件证据 |
| frontend/src/Layout.tsx:142 | <nav className="minimal-mobile-nav mobile-bottom-nav" aria-label="移动端导航"> | 源码样式/组件证据 |
| frontend/src/App.tsx:45 | type CalendarView = "7" \| "14" \| "30" \| "24h" \| "overdue"; | 源码样式/组件证据 |
| frontend/src/App.tsx:1684 | <TaskDetailDrawer | 源码样式/组件证据 |
| frontend/src/App.tsx:1694 | <CreateTaskModal | 源码样式/组件证据 |
| frontend/src/App.tsx:1703 | <EditTaskModal | 源码样式/组件证据 |
| frontend/src/App.tsx:1712 | <DeleteConfirmModal | 源码样式/组件证据 |
| frontend/src/App.tsx:2626 | <article className="mobile-task-card" key={task.id} onClick={() => onOpenTask(task)}> | 源码样式/组件证据 |
| frontend/src/styles/demo.css:907 | @media (max-width: 900px) | minimal shell 移动端改 block，顶部品牌条 + 底部导航 |
| frontend/src/styles/demo.css:3201 | .desktop-table-wrapper { display: none; } | 820px 以下桌面表格隐藏 |
| frontend/src/styles/demo.css:3205 | .mobile-card-list { display: grid; } | 820px 以下移动任务卡片显示 |
| frontend/src/styles/demo.css:3231 | .drawer { width: 100vw; } | 小屏 Drawer 全宽 |
| frontend/src/styles/demo.css:3240 | .create-modal { width: 100%; } | 小屏 Modal 贴底全宽 |

## 4. 交互证据

| 组件 | 操作 | 观察结果 |
|---|---|---|
| CreateTaskModal | click 新建任务 | 打开 .modal-backdrop 和 .create-modal，默认 AI 生成分段 active |
| TaskDetailDrawer | click first task row | 右侧 .drawer 打开，展示字段、子任务和 AI 分析结果 |
| EditTaskModal | click Drawer 编辑任务 | 打开编辑任务 .create-modal，复用 ManualTaskForm |
| DeleteConfirmModal | click Drawer 删除任务 | 打开确认删除弹窗，包含危险按钮和目标任务摘要 |
| Row dropdown | click 更多操作 | 打开 .row-menu，menuScaleIn 动画，含查看/编辑/删除 |
| Button | hover .minimal-primary | 主按钮 hover 后背景从 rgb(79,70,229) 变为 rgb(67,56,202)，无位移；CSS 仅声明 background: #4338ca。 |
| Input | focus .filter-search input | focus 后 outline 仍为默认 none/auto，主要依赖边框和背景；缺少强 focus ring |
| Task row | hover table row | 表格行 hover 背景变为 rgb(248,250,252)，无阴影和位移。 |
| Sidebar item | hover inactive nav | 侧边栏非 active 项 hover 背景变为 rgb(248,250,252)，文字色变为 rgb(23,32,51)。 |
| Task checkbox | click .task-check | 任务状态切换，按钮会追加/移除 .checked，已完成时绿色填充并显示 Check icon |
| Dark mode toggle | set localStorage theme true and reload | minimal-shell minimal-shell-light -> minimal-shell minimal-shell-dark |

## 5. 响应式证据

| 尺寸 | 页面 | 观察结果 |
|---|---|---|
| 1440x900 | / | 桌面：Sidebar 240px，底部导航 none；未检测到页面级横向溢出；当前页面未出现移动任务卡片 |
| 1280x720 | / | 桌面：Sidebar 240px，底部导航 none；未检测到页面级横向溢出；当前页面未出现移动任务卡片 |
| 1024x768 | / | 移动/窄屏：Sidebar 顶部条 240px，底部导航 none -px；未检测到页面级横向溢出；当前页面未出现移动任务卡片 |
| 768x1024 | / | 移动/窄屏：Sidebar 顶部条 768px，底部导航 grid 68px；未检测到页面级横向溢出；当前页面未出现移动任务卡片 |
| 390x844 | / | 移动/窄屏：Sidebar 顶部条 390px，底部导航 grid 68px；未检测到页面级横向溢出；当前页面未出现移动任务卡片 |
| 390x844 | /tasks | 移动/窄屏：Sidebar 顶部条 390px，底部导航 grid 68px；未检测到页面级横向溢出；任务移动卡片 316x132px，desktop table wrapper=none |
| 390x844 | /calendar | 移动/窄屏：Sidebar 顶部条 390px，底部导航 grid 68px；未检测到页面级横向溢出；当前页面未出现移动任务卡片 |
| 375x667 | / | 移动/窄屏：Sidebar 顶部条 375px，底部导航 grid 68px；未检测到页面级横向溢出；当前页面未出现移动任务卡片 |

## 6. 控制台证据

| 类型 | 结果 |
|---|---|
| Console errors | 1 条：`http://127.0.0.1:5173/favicon.ico` 404 |
| Console warnings | 0 条 |
| 业务脚本异常 | 未记录到 |
