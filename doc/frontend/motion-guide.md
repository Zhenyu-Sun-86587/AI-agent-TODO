# AI-agent-TODO 动效指南

> 来源：真实浏览器交互、computed style、`frontend/src/styles/demo.css`。根 token：`--duration-fast: 120ms`，`--duration-base: 160ms`，`--ease-quick: ease`，`--ease-modal: cubic-bezier(0.2, 0.8, 0.2, 1)`。

## 1. 当前动效概览

当前动效较克制，主要是 hover 背景色、Modal/Drawer/Dropdown 入场动画。没有复杂页面转场，没有 toast 动效，没有 Kanban 拖拽动效。交互反馈可用但偏弱，适合后台工具，但不够“AI 产品级”。

| 组件 | 状态 | 当前表现 | 时长 | 缓动 | 问题 |
|---|---|---|---|---|---|
| 主按钮 | hover | 背景 #4f46e5 -> #4338ca，无位移 | 未单独定义，computed transition 基本为默认 | 默认 | 反馈只有颜色变化 |
| Icon button | hover | 深色文字变 #e2e8f0；浅色变 #172033 | 未单独定义 | 默认 | 无背景反馈或 focus ring |
| Sidebar item | hover | 背景变 #f8fafc / rgba(255,255,255,.05)，文字增强 | 160ms | ease | 可用但较轻 |
| Sidebar item | active | 静态高亮 #eef2ff + #4f46e5 | 无 | 无 | 缺少左侧指示条或动效 |
| Header 搜索 | focus-within | border-color rgba(99,102,241,.7) | 无显式时长 | 默认 | 只有 Header 搜索明显 |
| 普通输入框 | focus | outline none，主要无视觉变化 | 无 | 无 | 表单可访问性弱 |
| Task table row | hover | 背景变 #f8fafc | 未显式定义 | 默认 | 缺少 click affordance |
| TaskCard | hover | 旧 `.task-card` 上移 -1px + shadow | 160ms | ease | 当前表格/移动卡片没有同等质感 |
| Mobile task card | active | 背景变 surface-soft | 未显式定义 | 默认 | 只有按压态，无 hover/焦点 |
| Dropdown | open | menuScaleIn：opacity 0、scale(.95)、translateY(-4px) -> normal | 140ms | ease | 只做打开，无关闭动画 |
| Modal backdrop | open | fadeIn opacity 0 -> 1 | 160ms | ease | 关闭无出场动画 |
| Modal | open | modalSlideUp：translateY(20px) scale(.98) -> normal | 160ms | cubic-bezier(.2,.8,.2,1) | 动效合适，shadow 被主题覆盖后浮层层次弱 |
| Drawer | open | drawerSlideIn：translateX(100%) -> 0 | 200ms | cubic-bezier(.2,.8,.2,1) | 无 backdrop，shadow 当前 computed 为 none |
| Dark mode | toggle | shell class 在 light/dark 间切换 | 无专门转场 | 无 | 颜色切换偏硬 |
| Button disabled | disabled | cursor not-allowed，opacity .55 | 无 | 无 | 简单可用 |
| Toast | 出现/消失 | 未发现 toast 组件/样式 | 无 | 无 | 缺少全局操作反馈 |
| Kanban | drag hover | 未发现拖拽实现 | 无 | 无 | 看板只是分组视图 |

## 2. Button 动效

主按钮 `.minimal-primary:hover` 只改变背景色为 #4338ca。旧通用 `.primary-button:hover` 也存在，但当前 Header 使用 `.minimal-primary`。按钮 disabled 全局为 opacity .55 + cursor not-allowed。

建议：主按钮保留 120-160ms，增加轻微 shadow 强化或 border glow，避免大位移；危险按钮 hover 应有单独红色深浅变化。

## 3. Input Focus 动效

Header 搜索通过 `.minimal-search:focus-within` 改 border-color。表格筛选、设置、Modal 表单输入框设置了 outline none，但没有补充可见 focus ring。

建议：所有 input/select/textarea 统一添加 `box-shadow: 0 0 0 3px rgba(79,70,229,.12)`，时长 120ms；错误态添加红色 ring。

## 4. TaskCard Hover 动效

旧 `.task-card:hover` 有 transform、border-color、box-shadow，时长 160ms。当前真实任务表格 hover 只有 #f8fafc 背景，移动任务卡只有 active 背景。

建议：桌面表格行保持轻量背景即可；Dashboard 推荐卡和 Kanban 卡可以统一使用 1px 上移 + shadow；移动端只保留 active，不做 hover。

## 5. Modal 动效

`.modal-backdrop` 使用 fadeIn 160ms ease；`.create-modal` 使用 modalSlideUp 160ms modal ease。创建、编辑、删除确认都复用同一套入场。

建议：补充关闭动画或至少保证状态移除前可过渡；移动端贴底 Modal 可以改成 bottom sheet 动效 translateY(24px) -> 0。

## 6. Drawer 动效

Drawer 使用 right fixed，drawerSlideIn 200ms modal ease。当前无 backdrop，computed shadow 为 none，右侧抽屉与页面分层主要靠遮挡。

建议：恢复轻阴影或加右侧 overlay；移动端 Drawer 可改成全屏/底部 sheet 二选一，但要保持 200ms 以内。

## 7. Dropdown 动效

`.row-menu` 使用 menuScaleIn 140ms ease，transform-origin top right，打开反馈明确。通知/用户 popover 也有 minimal-popover 样式，但本次重点截图未单独截取。

建议：统一所有 popover/dropdown 使用同一 keyframe 和 shadow；增加 Esc/外部点击关闭后的可见反馈。

## 8. Dark Mode Toggle 动效

主题按钮点击后 `minimal-shell-light` / `minimal-shell-dark` 直接切换。没有全局颜色 transition，因此切换感偏硬。

建议：只对 background-color、color、border-color 加 120-160ms transition；不要对 layout 属性使用 transition all，避免性能和意外动画。

## 9. 当前动效问题

- 交互反馈偏弱，很多 clickable card/table row 没有足够 affordance。
- 普通输入 focus ring 缺失，是可访问性风险。
- Modal/Drawer 只有打开动效，没有关闭动效。
- Drawer shadow 在当前 computed style 下为 none，浮层层级不明显。
- Kanban 没有拖拽，也没有 drag hover 状态。
- Toast 未实现，创建/编辑/删除后的全局反馈弱。

## 10. 推荐动效规范

| 类型 | 建议时长 | 缓动 | 建议表现 |
|---|---|---|---|
| Button / tab hover | 120ms | ease | 颜色 + 轻 shadow，不做大位移 |
| Input focus | 120ms | ease | border + 3px focus ring |
| Card hover | 160ms | ease | translateY(-1px) + 轻 shadow，仅桌面 |
| Dropdown open | 120-140ms | ease | scale(.98) + translateY(-4px) + fade |
| Modal open | 160ms | cubic-bezier(.2,.8,.2,1) | fade backdrop + slide/scale content |
| Drawer open | 180-200ms | cubic-bezier(.2,.8,.2,1) | translateX / mobile translateY |
| Theme switch | 120-160ms | ease | color/background/border 过渡 |
| Toast | 160ms enter，120ms leave | ease | translateY + fade，自动消失 |
