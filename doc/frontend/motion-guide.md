# AI-agent-TODO 动效指南

采样来源：真实浏览器观察、computed style、`frontend/src/styles/demo.css`。这版已经有基础动效 token 和关键动画，不再是纯静态页面。

## 1. 当前动效概览

| 组件 | 状态 | 当前表现 | 时长 | 缓动 | 问题 |
|---|---|---|---|---|---|
| Sidebar item | hover / active | 背景、文字色变化 | 160ms | ease | 可用，active 还可更醒目 |
| 主按钮 | hover | 紫色变深 | 继承/局部 | ease | 两套按钮体系需统一 |
| Input | focus | 搜索框边框变紫 | 未完全统一 | 未完全统一 | 普通 input focus 不够一致 |
| TaskCard | hover | `.task-card:hover` 上移 1px、边框/阴影变化 | 160ms | ease | 桌面卡有效，移动卡仅 active |
| MobileTaskCard | active | 背景变 `surface-soft` | 未显式 | 默认 | 反馈简单 |
| Modal backdrop | open | `fadeIn` | 160ms | ease | close 动效未观察 |
| Modal | open | `modalSlideUp`，20px -> 0，scale .98 -> 1 | 160ms | cubic-bezier | 比上一版好，可加 exit |
| Drawer | open | `drawerSlideIn`，translateX 100% -> 0 | 200ms | cubic-bezier | close 动效未观察 |
| Theme toggle | click | `.minimal-shell-light/dark` 切换 | 视觉切换明显 | 未统一 | 已验证，可补颜色过渡 |
| Row menu | open / hover | 菜单绝对定位，option hover 背景变化 | 无显式入场 | 无 | 缺少菜单入场动画 |
| Toast | 出现/消失 | 未观察到 toast 组件 | 未观察 | 未观察 | 需要补全 |
| Kanban drag | drag hover | 未观察到拖拽态 | 未观察 | 未观察 | 当前更像点击看板 |

## 2. Button 动效

当前有 `.minimal-primary`、`.primary-button`、`.ghost-button`、`.danger-button`、`.icon-button`、行内 icon button、多端 `.task-check`。主按钮 hover 色变明确，danger button 使用浅红底红字。

建议：

| 状态 | 推荐表现 |
|---|---|
| hover | `background-color`、`border-color`、`color` 160ms |
| pressed | 轻微 `transform: translateY(0)` 或背景加深 |
| disabled | opacity 0.55，cursor not-allowed，保持文字可读 |
| danger hover | 红色边框/背景加深，不增加强烈阴影 |
| icon button | hover 增加可见底色，尤其在深色背景中 |

## 3. Input Focus 动效

搜索框 focus 已有紫色边框。普通 input/select/textarea 在 `.minimal-shell` 下有深色覆盖，但 focus ring 不统一。

推荐规范：

| 组件 | focus 建议 |
|---|---|
| 搜索框 | `border-color rgba(99,102,241,.7)` + `box-shadow 0 0 0 3px rgba(79,70,229,.16)` |
| 普通 input | 与搜索框一致 |
| textarea | focus 不改变高度，避免布局跳动 |
| select/dropdown | focus 与 hover 都给边框反馈 |

## 4. TaskCard Hover 动效

`.task-card:hover` 已有良好基础：

```css
transform: translateY(-1px);
border-color: var(--line-strong);
box-shadow: 0 12px 24px rgba(15, 23, 42, 0.08);
```

移动端 `.mobile-task-card:active` 只改变背景。建议把移动端按压反馈改为更明确但不晃动的状态：背景变深/变浅、边框变主色透明、不要 hover 上移。

## 5. Modal 动效

当前已有：

| 元素 | 动画 |
|---|---|
| `.modal-backdrop` | `fadeIn 160ms ease` |
| `.create-modal` | `modalSlideUp 160ms cubic-bezier(0.2,0.8,0.2,1)` |
| `.confirm-modal` | 继承 create-modal，宽 440px |

建议补充：

| 阶段 | 推荐 |
|---|---|
| close | opacity 1 -> 0，translateY 0 -> 8px，120ms |
| mobile sheet | translateY(100%) -> 0，220ms |
| focus trap | 打开后焦点落到标题/首个输入 |

## 6. Drawer 动效

当前 `.drawer` 有 `drawerSlideIn 200ms var(--ease-modal)`，从右侧滑入。视觉上比上一版自然。建议补充关闭动画和移动端全屏进入方式。

| 场景 | 推荐 |
|---|---|
| 桌面 open | 保持 200ms slide-in |
| 桌面 close | 140ms slide-out |
| 移动 open | full-screen 或 bottom sheet，220ms |
| 字段内容 | 不必复杂 stagger，保持工具效率 |

## 7. Dropdown 动效

当前 row menu 有定位和 hover，但没有入场动画。建议统一菜单：

| 状态 | 推荐表现 |
|---|---|
| open | opacity 0 -> 1，translateY(-4px) -> 0，140ms |
| option hover | 背景 `var(--surface-soft)` |
| danger option | 文本红色，hover 浅红底 |
| close | 100ms fade |

## 8. Dark Mode Toggle 动效

真实观察结果：`切换主题` 按钮可在 `.minimal-shell-light` 和 `.minimal-shell-dark` 之间切换；已保存 `light-mode.png` 与 `dark-mode.png` 证据。

建议：

| 动作 | 推荐 |
|---|---|
| icon | Sun/Moon 交替淡入，160ms |
| theme color | 只 transition `background-color/color/border-color`，避免布局属性动画 |
| persistence | 明确 localStorage 主题值，当前证据里 stored theme 不明显 |

## 9. 当前动效问题

1. 仍有多处 `transition: all`，应改成明确属性。
2. Modal/Drawer 有 enter，没有观察到 exit。
3. Row menu 没有 open 动画。
4. Toast 未观察到。
5. Kanban drag hover 未观察到。
6. 移动端卡片 active 反馈偏轻。

## 10. 推荐动效规范

| Token | 当前/推荐值 | 用途 |
|---|---|---|
| `--duration-fast` | `120ms` | close、press |
| `--duration-base` | `160ms` | hover、focus、modal |
| `--duration-drawer` | `200ms` | Drawer open |
| `--ease-quick` | `ease` | hover/focus |
| `--ease-modal` | `cubic-bezier(0.2,0.8,0.2,1)` | Modal/Drawer/Sheet |

建议写法：

```css
transition:
  background-color var(--duration-base) var(--ease-quick),
  border-color var(--duration-base) var(--ease-quick),
  color var(--duration-base) var(--ease-quick),
  transform var(--duration-base) var(--ease-modal),
  box-shadow var(--duration-base) var(--ease-quick);
```
