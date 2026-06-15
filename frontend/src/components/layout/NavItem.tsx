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
    <button className={`minimal-nav-item ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <Icon size={18} />
      {label}
    </button>
  );
}
