import { Sparkles } from "lucide-react";

export function EmptyState({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state glass-panel">
      <div className="empty-icon">
        <Sparkles size={28} />
      </div>
      <h3>{title}</h3>
      {action}
    </div>
  );
}
