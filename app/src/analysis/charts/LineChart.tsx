import { Chart, useWidth, type TableData } from './primitives';

export interface LinePoint { x: number; y: number | null }
export interface Tick { v: number; label: string }

/** Single-series line chart drawn at real pixel width (so labels stay readable on phones). Gaps for null y. */
export function LineChart({
  points, xDomain, yDomain, xTicks, yTicks, summary, table, height = 180, markX, markLabel, endLabel, tone = 'primary',
}: {
  points: LinePoint[]; xDomain: [number, number]; yDomain: [number, number]; xTicks: Tick[]; yTicks: Tick[];
  summary: string; table: TableData; height?: number; markX?: number; markLabel?: string; endLabel?: string; tone?: 'primary' | 'accent';
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const padL = 40, padR = 12, padT = 12, padB = 28;
  const iw = Math.max(40, width - padL - padR);
  const ih = height - padT - padB;
  const X = (x: number) => padL + ((x - xDomain[0]) / (xDomain[1] - xDomain[0] || 1)) * iw;
  const Y = (y: number) => padT + (1 - (y - yDomain[0]) / (yDomain[1] - yDomain[0] || 1)) * ih;
  const segs: LinePoint[][] = [];
  let cur: LinePoint[] = [];
  for (const p of points) {
    if (p.y === null) { if (cur.length) segs.push(cur); cur = []; } else cur.push(p);
  }
  if (cur.length) segs.push(cur);
  const last = [...points].reverse().find((p) => p.y !== null);
  const stroke = tone === 'accent' ? 'stroke-accent' : 'stroke-primary';
  const fill = tone === 'accent' ? 'fill-accent' : 'fill-primary';
  return (
    <div ref={ref}>
      <Chart summary={summary} table={table}>
        <svg width={width} height={height} aria-hidden="true" className="block">
          {yTicks.map((t) => (
            <g key={t.v}>
              <line x1={padL} x2={padL + iw} y1={Y(t.v)} y2={Y(t.v)} className="stroke-surface-3" strokeWidth="1" />
              <text x={padL - 8} y={Y(t.v)} textAnchor="end" dominantBaseline="middle" className="fill-slate text-caption tabular">{t.label}</text>
            </g>
          ))}
          {xTicks.map((t) => (
            <text key={t.v} x={X(t.v)} y={height - 8} textAnchor="middle" className="fill-slate text-caption tabular">{t.label}</text>
          ))}
          {markX !== undefined && (
            <g>
              <line x1={X(markX)} x2={X(markX)} y1={padT} y2={padT + ih} className="stroke-accent" strokeWidth="2" strokeDasharray="4 4" />
              {markLabel && <text x={X(markX) - 6} y={padT + 10} textAnchor="end" className="fill-accent-ink text-caption">{markLabel}</text>}
            </g>
          )}
          {segs.map((s, i) => (
            <polyline key={i} fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" className={stroke} points={s.map((p) => `${X(p.x)},${Y(p.y!)}`).join(' ')} />
          ))}
          {points.filter((p) => p.y !== null).map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y!)} r="3.5" className={fill} />)}
          {last && endLabel && (
            <text x={Math.min(X(last.x), padL + iw - 4)} y={Y(last.y!) - 10} textAnchor="end" className="fill-ink text-caption font-semibold tabular">{endLabel}</text>
          )}
        </svg>
      </Chart>
    </div>
  );
}
