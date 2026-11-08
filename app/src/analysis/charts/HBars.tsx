import { Chart } from './primitives';

export interface HBarRow { key: string; label: string; /** 0..1, null = no data */ value: number | null; text: string; tone?: 'primary' | 'accent' | 'slate' }

/** Labelled horizontal bars. Every bar carries its own text, so it reads in greyscale. */
export function HBars({ rows, summary, caption }: { rows: HBarRow[]; summary: string; caption: string }) {
  return (
    <Chart summary={summary} table={{ caption, head: ['Item', 'Value'], rows: rows.map((r) => [r.label, r.text]) }}>
      <ul className="stack gap-s3">
        {rows.map((r) => (
          <li key={r.key} className="stack gap-s1">
            <p className="flex flex-wrap items-baseline justify-between gap-s2 text-small"><span className="font-semibold">{r.label}</span><span className="tabular text-slate">{r.text}</span></p>
            <span className="block h-s3 rounded-pill bg-surface-3" aria-hidden="true">
              <span className={`block h-full rounded-pill ${r.tone === 'accent' ? 'bg-accent' : r.tone === 'slate' ? 'bg-slate' : 'bg-primary'}`} style={{ width: `${Math.max(r.value ? 2 : 0, (r.value ?? 0) * 100)}%` }} />
            </span>
          </li>
        ))}
      </ul>
    </Chart>
  );
}
