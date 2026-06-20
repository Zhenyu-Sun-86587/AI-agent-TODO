import { ChevronDown, Search } from "lucide-react";
import { createElement, type ButtonHTMLAttributes, type CSSProperties, type FormEventHandler, type HTMLAttributes, type ReactNode } from "react";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

type SurfaceElement = "article" | "aside" | "div" | "form" | "main" | "section";

export interface SurfaceProps extends Omit<HTMLAttributes<HTMLElement>, "onSubmit"> {
  as?: SurfaceElement;
  interactive?: boolean;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  padding?: "none" | "sm" | "md" | "lg";
  variant?: "default" | "accent" | "muted" | "panel";
}

export function Surface({
  as = "section",
  children,
  className,
  interactive = false,
  padding = "md",
  variant = "default",
  ...props
}: SurfaceProps) {
  // Surface 统一承载卡片/面板的边框、留白和交互态，减少各页面重复样式胶水代码。
  return createElement(
    as,
    {
      ...props,
      className: cx(
        "ui-surface",
        `ui-surface-${variant}`,
        `ui-surface-padding-${padding}`,
        interactive && "ui-surface-interactive",
        className,
      ),
    },
    children,
  );
}

export function SurfaceHeader({
  action,
  className,
  description,
  icon,
  title,
}: {
  action?: ReactNode;
  className?: string;
  description?: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cx("ui-surface-header", className)}>
      <div className="ui-surface-title-row">
        {icon ? <span className="ui-surface-icon">{icon}</span> : null}
        <div>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
      </div>
      {action ? <div className="ui-surface-action">{action}</div> : null}
    </div>
  );
}

export function EmptyState({
  className,
  description,
  icon,
  title,
}: {
  className?: string;
  description: ReactNode;
  icon?: ReactNode;
  title: ReactNode;
}) {
  return (
    <div className={cx("ui-empty-state", className)}>
      {icon ? <span className="ui-empty-icon">{icon}</span> : null}
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

export interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  fullWidth?: boolean;
  icon?: ReactNode;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "danger" | "icon" | "plain";
}

export function ActionButton({
  children,
  className,
  fullWidth = false,
  icon,
  size = "md",
  type = "button",
  variant = "secondary",
  ...props
}: ActionButtonProps) {
  return (
    <button
      {...props}
      className={cx(
        "ui-button",
        `ui-button-${variant}`,
        `ui-button-${size}`,
        fullWidth && "ui-button-full",
        className,
      )}
      type={type}
    >
      {icon}
      {children}
    </button>
  );
}

export function Toolbar({
  align = "start",
  children,
  className,
  ...props
}: {
  align?: "start" | "between" | "end";
  children: ReactNode;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("ui-toolbar", `ui-toolbar-${align}`, className)}>{children}</div>;
}

export function SearchField({
  className,
  onChange,
  placeholder,
  value,
}: {
  className?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  value: string;
}) {
  return (
    <label className={cx("ui-control ui-search-field", className)}>
      <Search size={17} />
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} />
    </label>
  );
}

export function SelectField({
  ariaLabel,
  children,
  className,
  onChange,
  value,
  width,
}: {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  onChange: (value: string) => void;
  value: string;
  width?: string;
}) {
  const style = width ? ({ "--ui-control-width": width } as CSSProperties) : undefined;
  return (
    <label className={cx("ui-control ui-select-field", className)} style={style}>
      {/* 自定义箭头样式依赖外层包裹 label，避免原生 select 在不同平台表现不一致。 */}
      <select value={value} aria-label={ariaLabel} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
      <ChevronDown aria-hidden="true" size={18} />
    </label>
  );
}

export function SegmentedControl<TValue extends string>({
  ariaLabel,
  className,
  items,
  onChange,
  value,
}: {
  ariaLabel: string;
  className?: string;
  items: Array<{ label: ReactNode; value: TValue }>;
  onChange: (value: TValue) => void;
  value: TValue;
}) {
  return (
    <div className={cx("ui-segmented-control", className)} role="group" aria-label={ariaLabel}>
      {items.map((item) => (
        <button
          className={item.value === value ? "active" : ""}
          key={item.value}
          type="button"
          aria-pressed={item.value === value}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
