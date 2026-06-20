import type { LucideIcon } from "lucide-react";

export default function NavItem({
  active = false,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    // 导航项保持无状态，激活态完全由上层路由/页面状态驱动。
    <button className={`minimal-nav-item ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <Icon size={18} />
      {label}
    </button>
  );
}
