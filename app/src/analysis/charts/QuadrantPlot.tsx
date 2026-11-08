import type { QuadrantCell } from '../compute';
import { Chart, pct, useWidth } from './primitives';

/** Attempt rate (x) against accuracy (y), one labelled dot per subject, quadrants tinted and named. */
export function QuadrantPlot({ cells }: { cells: QuadrantCell[] }) {
  const [ref, width] = useWidth<HTMLDivElement>(480);
  const height = Math.min(340, Math.max(240, Math.round(width * 0.75)));
  const padL = 40, padR = 12, padT = 12, padB = 32;
  const iw = Math.max(80, width - padL - padR);
  const ih = height - padT - padB;
  const X = (v: number) => padL + v * iw;
  const Y = (v: number) => padT + (1 - v) * ih;
  const cx = X(0.6), cy = Y(0.6);
  const plotted = cells.filter((c) => c.accuracy !== null);
  const summary = `Attempt rate against accuracy by subject. ${cells.map((c) => `${c.label}: attempted ${pct(c.attemptRate)}, accuracy ${pct(c.accuracy)}`).join('. ')}.`;
  return (
    <div ref={ref}>
      <Chart summary={summary} table={{ caption: 'Attempt rate and accuracy by subject', head: ['Subject', 'Attempted', 'Accuracy'], rows: cells.map((c) => [c.label, pct(c.attemptRate), pct(c.accuracy)]) }}>
        <svg width={width} height={height} aria-hidden="true" className="block">
          <rect x={padL} y={padT} width={cx - padL} height={cy - padT} className="fill-surface-3" />
          <rect x={cx} y={padT} width={padL + iw - cx} height={cy - padT} className="fill-primary-50" />
          <rect x={padL} y={cy} width={cx - padL} height={padT + ih - cy} className="fill-accent-50" />
          <rect x={cx} y={cy} width={padL + iw - cx} height={padT + ih - cy} className="fill-surface-3" />
          <text x={padL + 6} y={padT + 16} className="fill-slate text-caption">Careful, attempts few</text>
          <text x={padL + iw - 6} y={padT + 16} textAnchor="end" className="fill-primary text-caption font-semibold">Working well</text>
          <text x={padL + 6} y={padT + ih - 8} className="fill-accent-ink text-caption font-semibold">Start here</text>
          <text x={padL + iw - 6} y={padT + ih - 8} textAnchor="end" className="fill-slate text-caption">Fast, but slips</text>
          {[0, 0.5, 1].map((v) => (
            <g key={v}>
              <text x={padL - 8} y={Y(v)} textAnchor="end" dominantBaseline="middle" className="fill-slate text-caption tabular">{Math.round(v * 100)}%</text>
              {v !== 0.5 && <text x={X(v)} y={height - 8} textAnchor={v === 0 ? 'start' : v === 1 ? 'end' : 'middle'} className="fill-slate text-caption tabular">{Math.round(v * 100)}%</text>}
            </g>
          ))}
          <text x={padL + iw / 2} y={height - 8} textAnchor="middle" className="fill-slate text-caption">share attempted</text>
          {plotted.map((c, idx) => {
            const px = X(c.attemptRate);
            const py = Y(c.accuracy!);
            const clash = plotted.slice(0, idx).some((o) => Math.abs(X(o.attemptRate) - px) < 110 && Math.abs(Y(o.accuracy!) - py) < 18);
            const right = px < padL + iw * 0.7;
            return (
              <g key={c.key}>
                <circle cx={px} cy={py} r="7" className="fill-primary" />
                <text x={right ? px + 12 : px - 12} y={clash ? py + 20 : py} textAnchor={right ? 'start' : 'end'} dominantBaseline="middle" className="fill-ink text-small font-semibold">{c.label}</text>
              </g>
            );
          })}
        </svg>
      </Chart>
    </div>
  );
}
