# AI-agent-TODO 动效指南

采样来源：真实浏览器观察、computed style、`frontend/src/styles/demo.css`。当前页面没有大量显式动画，交互反馈主要由 hover 色、focus 边框、移动导航固定定位、Drawer/Modal 出现状态构成。

## 1. 当前动效概览

当前动效较少，整体偏静态后台工具。可观察到的 transition 主要包括：

| 组件 | 状态 | 当前表现 | 时长 | 缓动 | 问题 |
|---|---|---|---|---|---|
| Sidebar item | active / hover | 背景与文字色变化 | `160ms` | `ease` | 只有颜色反馈，层次略弱 |
| 主按钮 | hover | `#4f46e5` 到 `#4338ca` | 未显式，继承 `all` | 未显式 | 建议改成明确 `background-color 160ms ease` |
| 搜索框 | focus | 边框变 `rgba(99,102,241,0.7)` | 未显式，继承 `all` | 未显式 | 可加轻微 ring |
| 统计卡片 | hover | 背景 transition | `160ms` | 未完全统一 | hover 反馈不够明显 |
| 移动底部导航 | active | 背景淡紫、文字紫色 | `160ms` | `ease` | 8 个 tab 横滚，active 可以更强 |
| Modal | open | 直接出现遮罩和弹窗 | 未观察到入场动画 | 无 | 缺少 scale/fade |
| Drawer | open | 右侧 fixed drawer 直接出现 | 未观察到入场动画 | 无 | 缺少 slide-in |
| Dropdown | open | 未形成独立证据 | 未观察 | 未观察 | 需要补充 select/menu 打开态 |
| Toast | 出现/消失 | 未观察到 | 未观察 | 未观察 | 需要补充全局反馈系统 |
| Kanban drag | drag hover | 未观察到拖拽态 | 未观察 | 未观察 | 当前看板更像点击卡片，不像可拖拽 |

## 2. Button 动效

当前按钮类型包括：

| 类型 | 当前样式 | 当前动效 | 建议 |
|---|---|---|---|
| 主按钮 `.minimal-primary` | 38px 高，999px 圆角，紫色背景 | hover 变深紫 | 保留，增加 `transform: translateY(-1px)` 或轻微 shadow，时长 140-160ms |
| 图标按钮 `.minimal-icon` | 38px 圆形，透明背景 | hover 只变文字色 | 增加可见 hover 背景，避免深色背景上反馈太弱 |
| 行操作按钮 | 28px 方形，浅色边框变量 | 动效弱 | 统一到深色 token，hover 背景 `#18181b`，icon 色变亮 |
| 日历/范围按钮 | 38px 高，10px 圆角 | active 背景变主色浅色 | 深色模式下 active 背景需要使用深色紫透明，不要用浅色 token |
| 分段控件按钮 | 38px 高，active 有 surface 背景和 shadow | 无明显切换动效 | 增加 `background-color 160ms ease, color 160ms ease` |

推荐规范：

| 状态 | 推荐表现 |
|---|---|
| hover | 背景/边框/文字色 120-160ms，必要时 `translateY(-1px)` |
| active / pressed | `translateY(0)`，背景略深，shadow 收回 |
| disabled | opacity 0.55，可保留当前值，但 cursor 和 aria 状态要明确 |
| loading | 主按钮内 spinner 或 lucide loader，避免只禁用无反馈 |

## 3. Input Focus 动效

当前搜索框 focus 只改变边框色。普通 input/select/textarea 在深色 shell 下被覆盖为 `#18181b` 背景、`rgba(255,255,255,0.08)` 边框，但 focus 状态不够统一。

建议规范：

| 组件 | focus 建议 |
|---|---|
| 搜索框 | 边框 `rgba(99,102,241,0.7)`，外 ring `0 0 0 3px rgba(79,70,229,0.16)` |
| 普通 input | 同搜索框，transition `border-color 140ms ease, box-shadow 140ms ease` |
| textarea | focus 时保留高度，不产生布局抖动 |
| select | focus 样式与 input 一致，hover 增加边框亮度 |

## 4. TaskCard Hover 动效

当前 Dashboard 任务行、Kanban 卡、AI 推荐按钮都有轻量 hover，但不够系统。任务卡建议成为后续移动端主组件，所以 hover/press 要更明确。

推荐规范：

| 状态 | 推荐表现 |
|---|---|
| hover | 背景从 `#18181b` 到 `#1f1f24`，边框从 `rgba(255,255,255,0.06)` 到 `rgba(129,140,248,0.32)` |
| press | 背景回落，scale `0.995` 或无 scale |
| selected | 左侧 3px 紫色条或顶部小点，不只靠文字 |
| completed | 文字弱化、标题加轻微删除线，保留可读性 |

## 5. Modal 动效

当前新建任务弹窗已具备结构：遮罩 `rgba(15,23,42,0.38)`，弹窗 620px、22px padding、18px 圆角。未观察到入场/退场动效。

推荐规范：

| 阶段 | 推荐值 |
|---|---|
| backdrop enter | opacity 0 -> 1，160ms ease |
| modal enter | opacity 0 -> 1，scale 0.98 -> 1，translateY(8px) -> 0，180ms cubic-bezier(0.2,0.8,0.2,1) |
| modal exit | opacity 1 -> 0，scale 1 -> 0.98，120ms ease |
| mobile sheet enter | translateY(100%) -> 0，220ms cubic-bezier(0.2,0.8,0.2,1) |

移动端弹窗应更像 bottom sheet：底部贴齐、顶部圆角、拖拽柄、固定底部操作栏、safe-area padding。

## 6. Drawer 动效

当前 Drawer 是右侧 fixed，宽 460px，z-index 120，直接出现。建议把它作为桌面详情抽屉和移动全屏详情页两个形态。

| 场景 | 推荐动效 |
|---|---|
| 桌面打开 | `translateX(24px)` + opacity 0 -> `translateX(0)` + opacity 1，200ms |
| 桌面关闭 | `translateX(12px)` + opacity 0，140ms |
| 移动打开 | 全屏 slide up 或 slide left，220ms |
| 字段卡片 | 打开后可 stagger 20ms，但不要过度装饰 |

## 7. Dropdown 动效

当前筛选主要是原生 select，没有可观察的自定义 Dropdown 展开态。若后续改为自定义菜单：

| 状态 | 推荐表现 |
|---|---|
| open | opacity 0 -> 1，translateY(-4px) -> 0，140ms |
| close | opacity 1 -> 0，100ms |
| option hover | 背景 `rgba(79,70,229,0.12)`，文字 `#e2e8f0` |
| selected | 勾选图标 + 紫色文字，不只靠背景 |

## 8. Dark Mode Toggle 动效

当前应用主界面已经是深色，存在 “切换主题” 图标按钮，但本轮没有记录到浅深切换后的完整主题状态。建议：

| 动作 | 推荐表现 |
|---|---|
| 点击切换 | icon 旋转/淡入 180ms，避免大面积闪烁 |
| theme apply | CSS variables 切换，颜色 transition 120ms，仅作用于颜色属性 |
| 本地存储 | 切换后保持刷新状态 |

## 9. 当前动效问题

1. 过多 `transition: all`，容易让宽高/布局属性也参与动画。
2. Modal 和 Drawer 没有明显入场动效，交互显得硬。
3. Toast、Dropdown、Kanban drag hover 未观察到，反馈系统不完整。
4. 行操作按钮和 badge 的 hover/active 反馈过轻。
5. 移动端底部导航可用，但横向滚动 tab 的 active 状态还可以更稳定。

## 10. 推荐动效规范

| Token | 值 | 用途 |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0.8, 0.2, 1)` | Modal/Drawer/Sheet |
| `--ease-quick` | `ease` | hover/focus |
| `--duration-fast` | `120ms` | close、press |
| `--duration-base` | `160ms` | hover、focus、active |
| `--duration-modal` | `180ms` | desktop modal |
| `--duration-drawer` | `200ms` | desktop drawer |
| `--duration-sheet` | `220ms` | mobile bottom sheet |

建议所有动效写成明确属性，例如：

```css
transition:
  background-color var(--duration-base) var(--ease-quick),
  border-color var(--duration-base) var(--ease-quick),
  color var(--duration-base) var(--ease-quick),
  transform var(--duration-base) var(--ease-standard);
```
