# 当前前端真实状态总结

这份文档用于给后续 AI 继续美化 / 重构前端时阅读。结论来自真实浏览器观察、截图、computed style 和 `frontend/src/styles/demo.css`，不是凭空推测。

相关文件：

- `doc/frontend/evidence/computed-styles.json`
- `doc/frontend/evidence/screenshots/`
- `doc/frontend/style-guide.md`
- `doc/frontend/motion-guide.md`
- `doc/frontend/evidence-manifest.md`

## 给后续 AI 的提示词

你现在要继续美化 AI-agent-TODO 的前端。请先阅读 `doc/frontend/current-ui-context.md`、`style-guide.md`、`motion-guide.md`、`evidence-manifest.md` 和 `evidence/computed-styles.json`，理解当前页面真实样子，再做修改方案或代码实现。不要把它当成空白项目。

当前前端已经是一个 AI TODO 工具型 Dashboard：桌面端有 Sidebar + Header + 页面内容区，移动端有底部 tab 和移动任务卡。请保留业务入口，不要做成营销 landing page。

后续改动要特别注意：

1. 现在文档正式位置是 `doc/frontend/`，后续覆盖这里，不要再写回 `frontend/` 根目录。
2. 当前移动端任务列表已经是 `.mobile-task-card`，不要再按“移动端表格横滚”去设计。
3. 主题切换已经存在 `.minimal-shell-light` / `.minimal-shell-dark`，后续要同时验证两套主题。
4. 编辑任务弹窗、删除确认弹窗、任务详情 Drawer 都已实现，后续需要继续美化，而不是从零假设。
5. 当前 API 数据偏少且包含安全测试文本，视觉判断要区分“数据状态”与“组件能力”。

## 当前页面真实风格

主体验是深色 / 浅色双主题的后台管理风格。深色主题背景 `#09090b`，卡片 `#121214` / `#18181b`；浅色主题背景 `#f5f7fb`，卡片 `#ffffff`。主色是紫色 `#4f46e5`，AI 区域使用紫色透明背景、AI tag、AI reason block。

整体已经比较成熟，尤其是移动任务卡、编辑/删除弹窗、Drawer 入场动画、AI 分析区都比早期更完整。当前不足主要在设计 token 双轨、AI 组件尚未完全统一、移动底部导航入口太多、少数据状态下页面显空。

## 当前布局结构

桌面端：

- `.minimal-shell` 使用 `240px minmax(0,1fr)` 两列布局。
- 左侧 `.minimal-sidebar` 固定 240px。
- 右侧 `.minimal-header` 高 64px。
- `.minimal-page` padding 为 `24px 32px 32px`。
- Dashboard 最大宽度约 1120px。

移动端：

- 900px 以下 `.minimal-shell` 变 block。
- Sidebar 收成顶部品牌栏，桌面 nav 隐藏。
- `.minimal-mobile-nav` fixed bottom，8 个 tab 横向滚动。
- Header 换行，搜索占满第二行，主题按钮保留。
- 820px 以下任务桌面表格隐藏，`.mobile-card-list` 显示。
- 390px 下 `.mobile-task-card` 约 316px 宽、165px 高。

## 当前组件样式

Sidebar：
深色背景，42px 菜单项，active 为淡紫背景和紫色文字。移动端变底部 tab。

Header：
64px 高，包含搜索、新建任务、通知、主题切换、API 状态、用户、退出。移动端会换行。

TaskTable：
桌面保留 900px min-width 表格，字段完整。移动端 wrapper 隐藏。

MobileTaskCard：
卡片 14px padding、14px 圆角、12px gap，包含标题、描述、状态、优先级、分类、截止时间、完成圆形按钮和更多操作。当前是 app 端任务阅读的主要方向。

AI 推荐：
AI 内容真实存在，包括推荐原因、自动分类、预计时间、置信度、调用日志。AI reason block 和 AI brand tag 已经建立雏形。

任务看板：
CSS 支持三列；当前 API 数据下只可见待办/已完成。卡片有 AI 分类和任务 meta。

日历：
有近 7 天、近 14 天、近 30 天、今日 24 小时、逾期入口。7 天视图为桌面 7 列日历，移动端单列。24 小时轴已有 `.timeline-hour`。

数据统计：
KPI、趋势图、分类分布、优先级分布都存在。少数据状态下需要更好的空态和说明。

新建 / 编辑 Modal：
使用 `.create-modal`，桌面 620px，新建任务含 AI 生成 / 自定义创建。编辑任务沿用相似结构。

删除确认 Modal：
`.confirm-modal` 440px，标题 “确认删除任务？”，有目标任务摘要、取消、确认删除。Danger 按钮是浅红底红字。

Drawer：
右侧 460px fixed，包含字段、子任务空态、AI 分析和操作按钮。已有 200ms slide-in 动画。

## 当前主要视觉问题

1. light/dark 覆盖规则较多，设计 token 需要重新收敛。
2. AI 组件有雏形，但没有形成统一的组件 API 和状态规范。
3. Dashboard 在今日任务为 0 时显空，需要更好的空态。
4. 当前看板随数据少列显示，布局需要处理“缺列/空列”的一致体验。
5. 移动底部导航 8 个入口过多，app 端建议收敛。
6. 部分操作按钮仅图标，发现性和可点击区域仍可提升。

## 当前主要交互问题

1. Modal 和 Drawer 有 open 动效，但 close 动效未观察到。
2. Row menu 有 hover，没有入场动画。
3. Toast 未观察到。
4. Kanban drag hover 未观察到。
5. 主题切换可用，但 localStorage 持久化证据不明显，需要继续确认。
6. 移动任务卡点击打开详情，更多操作入口存在，但菜单移动端体验还需验证。

## 当前响应式问题

| 尺寸 | 当前布局 | 问题 |
|---|---|---|
| 1440x900 | 桌面两列完整 | 可继续精修 |
| 1280x720 | 桌面结构可用 | 高度略紧 |
| 1024x768 | 小桌面可用 | 内容密度偏高 |
| 768x1024 | 移动布局生效 | 底部 tab 入口多 |
| 390x844 | Dashboard 可用 | Header 换行后首屏占高 |
| 390x844 | 全部任务卡片可用 | 卡片宽度可更贴合容器 |
| 375x667 | 小屏压力明显 | 需要降低首屏负担 |

## 后续修改重点

优先级最高：

1. 将 light/dark token 抽象成清晰变量，减少大段 `.minimal-shell-light` 覆盖。
2. 继续完善移动端 app 壳：底部 tab 收敛，更多入口分组，safe-area 统一。
3. 统一 AI 组件：AI tag、reason block、分类、预计时间、置信度、日志状态。
4. 给编辑/删除/详情/新建四个覆盖层补移动端专属样式和关闭动画。
5. 优化少数据和空状态：Dashboard、Kanban、Stats、Calendar 都需要更自然的空态。

可随后处理：

1. Toast / loading / error 状态。
2. Row menu 和 dropdown 动效。
3. Kanban drag hover。
4. 图表 tooltip、图例、坐标说明。
5. 安全测试文本的视觉换行和 overflow 策略。

## 修改时不要做的事

- 不要删除现有业务入口。
- 不要把首屏改成营销页面。
- 不要回退移动端任务列表为横向表格。
- 不要只美化 dark theme 而忘记 light theme。
- 不要把 AI 功能只做成紫色装饰；需要保留推荐原因、分类、预计时间、置信度等信息层级。
