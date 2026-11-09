import type { Waterfall, WaterfallBar } from '../compute';
import { marksText } from '../compute';
import { Chart } from './primitives';

/** Horizontal waterfall: each loss bar hangs off the running total. Rows are buttons so a bar can be opened. */
export function WaterfallChart({ w, selected, onSelect }: { w: Waterfall; selected?: string | null; onSelect?: (b: WaterfallBar) => void }) {
  const scale = Math.max(w.max, w.potential, 1);
  let running = w.max;
  const rows = w.bars.map((b) => {
    let start = 0;
    let len = b.marks;
    if (b.kind === 'loss') {
      running -= b.marks;
      start = running;
    }
    if (b.id === 'potential') len = w.actual;
    return { b, start: Math.max(0, start), len: Math.max(0, len) };
  });
  const summary = `Marks waterfall. Maximum ${marksText(w.max)}, you scored ${marksText(w.actual)}. Marks lost: ${w.bars.filter((b) => b.kind === 'loss' && b.marks > 0).map((b) => `${b.label} ${marksText(b.marks)}`).join(', ')}. Potential score ${marksText(w.potential)}.`;
  return (
    <Chart
      summary={summary}
      table={{ caption: 'Marks lost, in order', head: ['Step', 'Marks', 'Questions'], rows: w.bars.map((b) => [b.label, marksText(b.marks), b.qids.length]) }}
    >
      <ul className="stack gap-s1">
        {rows.map(({ b, start, len }) => {
          const total = b.kind === 'total';
          const potential = b.id === 'potential';
          const clickable = !!onSelect && b.qids.length > 0;
          const inner = (
            <>
              <span className={`min-w-0 basis-full text-small sm:w-40 sm:shrink-0 sm:basis-auto ${total || potential ? 'font-semibold' : ''}`}>{b.label}</span>
              <span className="relative h-s4 min-w-0 flex-1 rounded-pill bg-surface-3" aria-hidden="true">
                <span
                  className={`absolute inset-y-0 rounded-pill ${b.kind === 'loss' ? (b.id === 'skippedEasy' ? 'bg-accent' : 'bg-bad') : b.id === 'actual' ? 'bg-good' : 'bg-primary'}`}
                  style={{ left: `${(start / scale) * 100}%`, width: `${(len / scale) * 100}%` }}
                />
                {potential && (
                  <span className="absolute inset-y-0 rounded-pill bg-primary-50" style={{ left: `${(w.actual / scale) * 100}%`, width: `${((w.potential - w.actual) / scale) * 100}%` }} />
                )}
              </span>
              <span className="tabular w-s7 shrink-0 text-right text-small font-semibold">
                {b.kind === 'loss' && b.marks > 0 ? '−' : potential && b.marks > w.actual ? '+' : ''}
                {potential ? `${marksText(b.marks)}` : marksText(b.marks)}
              </span>
            </>
          );
          const cls = 'flex min-h-s7 w-full flex-wrap items-center gap-x-s3 gap-y-s1 rounded-btn px-s2 py-s1 text-left sm:flex-nowrap';
          return (
            <li key={b.id}>
              {clickable ? (
                <button type="button" aria-pressed={selected === b.id} onClick={() => onSelect!(b)} className={`${cls} ${selected === b.id ? 'bg-primary-50' : 'hover:bg-surface-3'}`}>
                  {inner}
                </button>
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </Chart>
  );
}
