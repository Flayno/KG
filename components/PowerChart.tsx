import { formatPower } from "@/lib/format";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";

// Dependency-free SVG line chart for power history.
export function PowerChart({
  points,
  height = 160,
  color = "var(--primary)",
  locale = DEFAULT_LOCALE,
}: {
  points: { date: string; value: number }[];
  height?: number;
  color?: string;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  if (points.length < 2) {
    return <div className="text-muted text-sm py-8 text-center">{t.character.notEnoughChartData}</div>;
  }
  const W = 600;
  const H = height;
  const pad = { top: 10, right: 8, bottom: 22, left: 42 };
  const innerW = W - pad.left - pad.right;
  const innerH = H - pad.top - pad.bottom;

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => pad.left + (i / (points.length - 1)) * innerW;
  const y = (v: number) => pad.top + innerH - ((v - min) / range) * innerH;

  const line = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");
  const area = `${pad.left},${pad.top + innerH} ${line} ${pad.left + innerW},${pad.top + innerH}`;

  const ticks = [max, min + range / 2, min];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={t.common.powerHistory}>
      {ticks.map((t, i) => {
        const yy = y(t);
        return (
          <g key={i}>
            <line x1={pad.left} x2={W - pad.right} y1={yy} y2={yy} stroke="var(--border)" strokeWidth="1" />
            <text x={pad.left - 6} y={yy + 4} textAnchor="end" fontSize="11" fill="var(--muted)">
              {formatPower(t)}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill={color} opacity="0.12" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="2.5" fill={color} />
      ))}
      {[0, points.length - 1].map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 6}
          textAnchor={i === 0 ? "start" : "end"}
          fontSize="11"
          fill="var(--muted)"
        >
          {points[i].date.slice(5)}
        </text>
      ))}
    </svg>
  );
}
