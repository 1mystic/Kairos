export interface Bar { key: string; label: string; value: number | null; /** spoken text, e.g. "Wed 8 Nov: 18 questions" */ aria: string }

/**
 * Bar chart in SVG. Geometry uses percentages, so it scales with the container without distorting rounded tops.
 * One colour (primary) with a saffron bar for the selected one. Bars are real buttons laid over the SVG for
 * keyboard and touch; a visually hidden table carries the data for screen readers.
 */
export function BarChart({ bars, selected, onSelect, summary, caption, height = 'h-40', every = 1 }: {
  bars: readonly Bar[]; selected: string | null; onSelect?: (key: string) => void; summary: string; caption: string; height?: string; every?: number;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value ?? 0));
  const n = bars.length;
  const slot = 100 / n;
  const w = slot * 0.62;
  return (
    <div className="stack gap-s2">
      <div role="img" aria-label={summary} className={`relative w-full ${height}`}>
        <svg width="100%" height="100%" aria-hidden="true" className="absolute inset-0 overflow-visible">
          <line x1="0" x2="100%" y1="100%" y2="100%" className="stroke-surface-3" strokeWidth="2" />
          {bars.map((b, i) => {
            const h = b.value === null ? 0 : Math.max(b.value > 0 ? 3 : 0, (b.value / max) * 92);
            return (
              <rect
                key={b.key} x={`${i * slot + (slot - w) / 2}%`} width={`${w}%`} y={`${100 - h}%`} height={`${h}%`} rx="4"
                className={`dash-grow-y ${b.key === selected ? 'fill-accent' : 'fill-primary'}`}
              />
            );
          })}
        </svg>
        {onSelect && (
          <div className="absolute inset-0 flex">
            {bars.map((b) => (
              <button key={b.key} type="button" aria-label={b.aria} aria-pressed={b.key === selected} onClick={() => onSelect(b.key)} className="h-full flex-1 rounded-btn" />
            ))}
          </div>
        )}
      </div>
      <div className="flex" aria-hidden="true">
        {bars.map((b, i) => (
          <span key={b.key} className="relative flex-1 text-center text-caption text-slate">
            {(n - 1 - i) % every === 0 ? <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{b.label}</span> : null}
            <span className="invisible">.</span>
          </span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead><tr><th scope="col">Day</th><th scope="col">Value</th></tr></thead>
        <tbody>
          {bars.map((b) => (<tr key={b.key}><th scope="row">{b.label}</th><td>{b.value === null ? 'No data' : b.value}</td></tr>))}
        </tbody>
      </table>
    </div>
  );
}
