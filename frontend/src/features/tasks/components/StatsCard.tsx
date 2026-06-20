import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { Surface } from "../../../components/ui/primitives";

type StatsCardTone = "blue" | "green" | "red" | "purple";

export function StatsCard({
  icon: Icon,
  index = 0,
  label,
  tone,
  value,
}: {
  icon: LucideIcon;
  index?: number;
  label: string;
  tone: StatsCardTone;
  value: number | string;
}) {
  return (
    <Surface as="article" className={`stats-card ${tone}`} padding="sm" interactive style={{ "--stagger-index": index } as CSSProperties}>
      <span><Icon size={20} /></span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
      </div>
    </Surface>
  );
}
