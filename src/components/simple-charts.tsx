/** Lightweight SVG charts — no paid analytics SaaS. */

export type ChartPoint = { label: string; value: number };

export function TrendLineChart({
  points,
  height = 200,
}: {
  points: ChartPoint[];
  height?: number;
}) {
  if (!points.length) {
    return <p className="empty">No data yet.</p>;
  }

  const width = 640;
  const padX = 36;
  const padY = 24;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2;
  const max = Math.max(1, ...points.map((p) => p.value));
  const coords = points.map((p, i) => {
    const x =
      padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = padY + innerH - (p.value / max) * innerH;
    return { x, y, ...p };
  });
  const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const area = `${line} L ${coords[coords.length - 1].x} ${padY + innerH} L ${coords[0].x} ${padY + innerH} Z`;

  return (
    <div className="chart-wrap">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Trend chart"
      >
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f766e" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0f766e" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((t) => {
          const y = padY + innerH * (1 - t);
          return (
            <line
              key={t}
              x1={padX}
              x2={width - padX}
              y1={y}
              y2={y}
              className="chart-grid"
            />
          );
        })}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} className="chart-line" fill="none" />
        {coords.map((c) => (
          <g key={c.label}>
            <circle cx={c.x} cy={c.y} r={4} className="chart-dot" />
            <title>
              {c.label}: {c.value}
            </title>
          </g>
        ))}
        {coords.map((c, i) =>
          i === 0 || i === coords.length - 1 || coords.length <= 8 ? (
            <text
              key={`lbl-${c.label}`}
              x={c.x}
              y={height - 6}
              textAnchor="middle"
              className="chart-axis-label"
            >
              {shortLabel(c.label)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

export function VerticalBarChart({
  points,
  height = 220,
}: {
  points: ChartPoint[];
  height?: number;
}) {
  if (!points.length) {
    return <p className="empty">No data yet.</p>;
  }

  const width = 640;
  const padX = 28;
  const padY = 20;
  const innerW = width - padX * 2;
  const innerH = height - padY * 2 - 18;
  const max = Math.max(1, ...points.map((p) => p.value));
  const gap = 8;
  const barW = Math.min(48, (innerW - gap * (points.length - 1)) / points.length);

  return (
    <div className="chart-wrap">
      <svg
        className="chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Bar chart"
      >
        {points.map((p, i) => {
          const h = (p.value / max) * innerH;
          const x = padX + i * (barW + gap);
          const y = padY + innerH - h;
          return (
            <g key={p.label}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                rx={6}
                className="chart-bar"
              />
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                className="chart-value-label"
              >
                {p.value}
              </text>
              <text
                x={x + barW / 2}
                y={height - 4}
                textAnchor="middle"
                className="chart-axis-label"
              >
                {shortLabel(p.label, 10)}
              </text>
              <title>
                {p.label}: {p.value}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BreakdownBars({ points }: { points: ChartPoint[] }) {
  if (!points.length) return <p className="empty">No answers yet.</p>;
  const max = Math.max(1, ...points.map((p) => p.value));
  return (
    <ul className="analytics-bars">
      {points.map((p) => (
        <li key={p.label}>
          <span className="analytics-bars__label" title={p.label}>
            {p.label}
          </span>
          <span className="analytics-bars__track">
            <span
              className="analytics-bars__fill"
              style={{ width: `${(p.value / max) * 100}%` }}
            />
          </span>
          <span className="analytics-bars__count">{p.value}</span>
        </li>
      ))}
    </ul>
  );
}

function shortLabel(label: string, max = 8): string {
  if (label.length <= max) return label;
  // Prefer month-day style
  if (/^\d{4}-\d{2}-\d{2}$/.test(label)) return label.slice(5);
  return `${label.slice(0, max - 1)}…`;
}
