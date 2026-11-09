export interface HBarRow { key: string; label: string; value: number; valueLabel: string; tone?: 'primary' | 'accent' | 'bad' }

/** Flat horizontal bars: label + value above a thin track. Scale is the largest value unless `max` is given. */
export function HBar({ rows, max, ariaLabel }: { rows: readonly HBarRow[]; max?: number; ariaLabel: string }) {
  const top = max ?? Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul aria-label={ariaLabel} className="stack gap-base">
      {rows.map((r) => (
        <li key={r.key} className="stack gap-s1">
          <div className="flex items-baseline justify-between gap-s3 text-small">
            <span className="min-w-0 font-semibold">{r.label}</span>
            <span className="shrink-0 tabular text-slate">{r.valueLabel}</span>
          </div>
          <div className="h-s2 overflow-hidden rounded-pill bg-surface-3" aria-hidden="true">
            <div className={`dash-grow-x h-full w-full rounded-pill ${r.tone === 'accent' ? 'bg-accent' : r.tone === 'bad' ? 'bg-bad' : 'bg-primary'}`} style={{ transform: `scaleX(${Math.max(0, Math.min(1, r.value / top))})` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
