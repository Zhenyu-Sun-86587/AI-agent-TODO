import type { StatsRangeKey } from "../stats/taskStats";
import { SelectField, Surface, SurfaceHeader } from "../../../components/ui/primitives";

function createLinePath(points: Array<{ x: number; y: number }>) {
  return points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");
}

function createAreaPath(points: Array<{ x: number; y: number }>, baseline: number) {
  if (!points.length) return "";
  const line = createLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
}

function createSmoothTicks(maxValue: number, segments = 5) {
  const safeMax = Math.max(1, maxValue);
  const roughStep = safeMax / segments;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const normalized = roughStep / magnitude;
  // 使用 1/2/5 阶梯生成刻度，让小数据量和大数据量的坐标轴都保持可读。
  const step = normalized <= 1 ? magnitude : normalized <= 2 ? 2 * magnitude : normalized <= 5 ? 5 * magnitude : 10 * magnitude;
  const top = Math.max(step, Math.ceil(safeMax / step) * step);
  const ticks: number[] = [];
  for (let tick = top; tick >= 0; tick -= step) {
    ticks.push(tick);
  }
  return ticks[ticks.length - 1] === 0 ? ticks : [...ticks, 0];
}

export function TrendLineChart({
  title,
  subtitle,
  trend,
  selectValue,
  onSelectChange,
}: {
  title: string;
  subtitle: string;
  trend: Array<{ label: string; created: number; done: number }>;
  selectValue: StatsRangeKey;
  onSelectChange: (value: StatsRangeKey) => void;
}) {
  const width = 1000;
  const height = 220;
  const ticks = createSmoothTicks(Math.max(1, ...trend.map((item) => Math.max(item.created, item.done))));
  const maxValue = ticks[0] || 1;
  const xStep = trend.length > 1 ? width / (trend.length - 1) : width;
  const createdPoints = trend.map((item, index) => ({ x: index * xStep, y: (1 - item.created / maxValue) * height }));
  const donePoints = trend.map((item, index) => ({ x: index * xStep, y: (1 - item.done / maxValue) * height }));

  return (
    <div className="trend-chart-shell">
      <div className="trend-chart-header">
        <div className="trend-chart-copy">
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <SelectField className="trend-range-select" value={selectValue} onChange={(value) => onSelectChange(value as StatsRangeKey)} width="132px" ariaLabel="选择统计周期">
            <option value="currentWeek">本周</option>
            <option value="lastWeek">上周</option>
            <option value="currentMonth">本月</option>
            <option value="lastMonth">上月</option>
        </SelectField>
      </div>
      <div className="trend-chart-body" role="img" aria-label={title}>
        <div className="trend-y-axis" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} style={{ top: `${(1 - tick / maxValue) * 100}%` }}>{tick}</span>
          ))}
        </div>
        <svg className="trend-chart-svg" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="trendCreatedFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(115, 154, 255, 0.42)" />
              <stop offset="100%" stopColor="rgba(115, 154, 255, 0.02)" />
            </linearGradient>
            <linearGradient id="trendDoneFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(92, 211, 160, 0.32)" />
              <stop offset="100%" stopColor="rgba(92, 211, 160, 0.02)" />
            </linearGradient>
          </defs>
          {ticks.map((tick) => {
            const y = (1 - tick / maxValue) * height;
            return <line key={tick} className="chart-grid-line" x1={0} x2={width} y1={y} y2={y} />;
          })}
          <path d={createAreaPath(createdPoints, height)} fill="url(#trendCreatedFill)" />
          <path d={createAreaPath(donePoints, height)} fill="url(#trendDoneFill)" />
          <path className="chart-line line-created" d={createLinePath(createdPoints)} />
          <path className="chart-line line-done" d={createLinePath(donePoints)} />
          {createdPoints.map((point, index) => (
            <g key={trend[index].label}>
              <circle className="chart-point point-created" cx={point.x} cy={point.y} r="4.5" />
              <circle className="chart-point point-done" cx={donePoints[index].x} cy={donePoints[index].y} r="4.5" />
            </g>
          ))}
        </svg>
        <div className="trend-x-axis" aria-hidden="true">
          {trend.map((item) => <span key={item.label}>{item.label}</span>)}
        </div>
      </div>
      <div className="chart-legend">
        <span><i className="legend-dot created" />新增任务</span>
        <span><i className="legend-dot done" />完成任务</span>
      </div>
    </div>
  );
}

export function DistributionBarChart({
  title,
  subtitle,
  items,
  variant = "default",
}: {
  title: string;
  subtitle: string;
  items: Array<{ label: string; value: number; accentClass?: string }>;
  variant?: "default" | "category";
}) {
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  const ticks = createSmoothTicks(maxValue, 4);
  const axisTicks = ticks.slice().reverse();
  const axisMax = Math.max(1, axisTicks[axisTicks.length - 1] ?? maxValue);

  return (
    <Surface as="div" className={`distribution-card distribution-card-${variant}`}>
      <SurfaceHeader className="stats-section-title" title={title} description={subtitle} />
      <div className="distribution-chart">
        <div className="distribution-bars">
          <div className="distribution-grid">
            {axisTicks.slice(1).map((tick) => (
              <span key={tick} className="distribution-grid-line" style={{ left: `${(tick / axisMax) * 100}%` }} />
            ))}
          </div>
          {items.map((item) => (
            <div className="distribution-row" key={item.label}>
              <span className="distribution-label">{item.label}</span>
              <div className="distribution-bar-shell">
                <i className={`distribution-bar ${item.accentClass || ""}`} style={{ width: `${Math.max((item.value / axisMax) * 100, item.value > 0 ? 10 : 0)}%` }} />
              </div>
              <strong className="distribution-value">{item.value}</strong>
            </div>
          ))}
        </div>
        <div className="distribution-axis">
          <span />
          <div className="distribution-axis-track">
            {axisTicks.map((tick) => <span key={tick}>{tick}</span>)}
          </div>
          <span />
        </div>
      </div>
    </Surface>
  );
}
