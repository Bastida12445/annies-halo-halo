import { formatPhp } from "@/lib/money";

type SalesPoint = { bucket_start: string; sales_cents: number };

function axisLabel(cents: number) {
  const pesos = cents / 100;
  if (pesos >= 1_000_000) return `₱${(pesos / 1_000_000).toFixed(1)}m`;
  if (pesos >= 1_000) return `₱${Math.round(pesos / 1_000)}k`;
  return `₱${Math.round(pesos)}`;
}

function bucketLabel(value: string) {
  const date = new Date(`${value}T12:00:00+08:00`);
  return new Intl.DateTimeFormat("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
}

export function AdminSalesChart({ points, rangeLabel }: { points: SalesPoint[]; rangeLabel: string }) {
  const width = 820;
  const height = 246;
  const left = 64;
  const right = 806;
  const top = 18;
  const bottom = 194;
  const plotWidth = right - left;
  const plotHeight = bottom - top;
  const maxValue = Math.max(0, ...points.map((point) => point.sales_cents));
  const chartMax = maxValue > 0 ? maxValue * 1.15 : 100;
  const coordinates = points.map((point, index) => ({
    point,
    x: left + (points.length <= 1 ? plotWidth / 2 : (index / (points.length - 1)) * plotWidth),
    y: bottom - (point.sales_cents / chartMax) * plotHeight,
  }));
  const linePath = coordinates.map(({ x, y }, index) => `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = coordinates.length
    ? `${linePath} L${coordinates.at(-1)?.x.toFixed(1)},${bottom} L${coordinates[0].x.toFixed(1)},${bottom} Z`
    : "";
  const labels = new Set<number>();
  if (points.length) {
    for (let index = 0; index < Math.min(5, points.length); index += 1) {
      labels.add(Math.round(index * (points.length - 1) / (Math.min(5, points.length) - 1 || 1)));
    }
  }
  const hasPaidSales = maxValue > 0;

  return (
    <div className="admin-sales-chart-wrap">
      <p className="sr-only">{rangeLabel} paid sales by {points.length ? (points.length > 40 ? "month or week" : "date") : "date"}, measured in Philippine pesos.</p>
      <svg
        aria-label={`${rangeLabel} paid sales chart`}
        className="admin-sales-chart"
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="admin-sales-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#b85dc5" stopOpacity="0.38" />
            <stop offset="100%" stopColor="#b85dc5" stopOpacity="0.025" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = top + (tick / 4) * plotHeight;
          const cents = chartMax * (1 - tick / 4);
          return (
            <g key={tick}>
              <line className="admin-chart-grid-line" x1={left} x2={right} y1={y} y2={y} />
              <text className="admin-chart-axis-label" dominantBaseline="middle" textAnchor="end" x={left - 11} y={y}>{axisLabel(cents)}</text>
            </g>
          );
        })}
        {coordinates.length > 1 && <path className="admin-chart-area" d={areaPath} />}
        {coordinates.length > 1 && <path className="admin-chart-line" d={linePath} />}
        {coordinates.map(({ point, x, y }) => (
          <g key={point.bucket_start}>
            <circle className="admin-chart-dot" cx={x} cy={y} r="3.8">
              <title>{bucketLabel(point.bucket_start)} · {formatPhp(point.sales_cents)}</title>
            </circle>
          </g>
        ))}
        {[...labels].sort((a, b) => a - b).map((index) => {
          const coordinate = coordinates[index];
          if (!coordinate) return null;
          return <text className="admin-chart-date-label" dominantBaseline="hanging" key={coordinate.point.bucket_start} textAnchor={index === 0 ? "start" : index === coordinates.length - 1 ? "end" : "middle"} x={coordinate.x} y={bottom + 12}>{bucketLabel(coordinate.point.bucket_start)}</text>;
        })}
      </svg>
      {!hasPaidSales && <span className="admin-sales-zero-label">No paid sales recorded for this period</span>}
    </div>
  );
}
