export function OverviewCards({
  completionRate,
  recommendedCount,
}: {
  completionRate: number;
  recommendedCount: number;
}) {
  return (
    <div className="focus-metrics">
      <div className="metric-item">
        <span>完成度</span>
        <strong>{completionRate}<small>%</small></strong>
      </div>
      <div className="metric-item">
        <span>AI 建议</span>
        <strong>{recommendedCount}</strong>
      </div>
    </div>
  );
}
