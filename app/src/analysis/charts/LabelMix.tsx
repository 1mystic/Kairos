import type { LabelWeek } from '../compute';
import { Chart } from './primitives';

const SEGS = [
  { id: 'careless', label: 'Careless', cls: 'bg-accent' },
  { id: 'conceptGap', label: 'Concept gap', cls: 'bg-primary' },
  { id: 'timeSink', label: 'Time sink', cls: 'bg-slate' },
] as const;

/** Weekly stacked bars of mistake types. Each segment shows its count; the legend names every tone. */
export function LabelMix({ weeks }: { weeks: LabelWeek[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.careless + w.conceptGap + w.timeSink));
  const label = (w: LabelWeek) => new Date(w.from).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const total = (w: LabelWeek) => w.careless + w.conceptGap + w.timeSink;
  return (
    <div className="stack gap-base">
      <ul className="flex flex-wrap gap-x-s4 gap-y-s1 text-small">
        {SEGS.map((s) => <li key={s.id} className="inline-flex items-center gap-s2"><span className={`size-s3 rounded-pill ${s.cls}`} aria-hidden="true" />{s.label}</li>)}
      </ul>
      <Chart
        summary={`Mistakes per week by type, last ${weeks.length} weeks. ${weeks.map((w) => `week of ${label(w)}: ${total(w)}`).join(', ')}.`}
        table={{ caption: 'Mistakes per week', head: ['Week of', 'Careless', 'Concept gap', 'Time sink'], rows: weeks.map((w) => [label(w), w.careless, w.conceptGap, w.timeSink]) }}
      >
        <ul className="stack gap-s2">
          {weeks.map((w) => (
            <li key={w.from} className="flex items-center gap-s3">
              <span className="w-s8 shrink-0 text-caption tabular text-slate">{label(w)}</span>
              <span className="flex h-s5 min-w-0 flex-1 gap-s1" aria-hidden="true">
                {SEGS.map((s) => (w[s.id] > 0 ? (
                  <span key={s.id} className={`grid min-w-s4 place-items-center rounded-btn text-caption font-semibold tabular ${s.cls} ${s.id === 'careless' ? 'text-ink' : 'text-surface'}`} style={{ flexGrow: w[s.id] / max, flexBasis: 0 }}>{w[s.id]}</span>
                ) : null))}
              </span>
              <span className="w-s6 shrink-0 text-right text-small tabular">{total(w)}</span>
            </li>
          ))}
        </ul>
      </Chart>
    </div>
  );
}
