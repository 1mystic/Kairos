import type { TimeMap } from '../compute';
import { marksText, subjectName } from '../compute';
import { Chart, clock, useWidth } from './primitives';

/** Small multiples: one row of 10-minute bars per subject (same scale), plus a row of net marks per bucket. */
export function TimeBars({ tm }: { tm: TimeMap }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = tm.buckets.length;
  const slot = width / n;
  const bw = Math.max(2, slot * 0.7);
  const maxMs = Math.max(1, ...tm.buckets.flatMap((b) => Object.values(b.bySubject)));
  const maxMarks = Math.max(1, ...tm.buckets.map((b) => Math.abs(b.marks)));
  const H = 44;
  const used = (s: string) => tm.buckets.reduce((a, b) => a + (b.bySubject[s] ?? 0), 0);
  const summary = `Time per 10 minutes of the paper. ${tm.subjects.map((s) => `${subjectName(s)} ${Math.round(used(s) / 60_000)} minutes`).join(', ')}.`;
  const ticks = tm.buckets.map((b, i) => ({ i, b })).filter(({ b }) => b.fromMin % 60 === 0);
  return (
    <div ref={ref} className="stack gap-base">
      <Chart
        summary={summary}
        table={{ caption: 'Minutes per subject in each 10-minute block', head: ['From', ...tm.subjects.map(subjectName), 'Net marks'], rows: tm.buckets.map((b) => [clock(b.fromMin), ...tm.subjects.map((s) => Math.round((b.bySubject[s] ?? 0) / 600) / 100), marksText(b.marks)]) }}
      >
        <div className="stack gap-s3">
          {tm.subjects.map((s) => (
            <div key={s} className="stack gap-s1">
              <p className="flex justify-between text-small"><span className="font-semibold">{subjectName(s)}</span><span className="tabular text-slate">{Math.round(used(s) / 60_000)} min</span></p>
              <svg width={width} height={H} aria-hidden="true" className="block">
                <rect x="0" y={H - 1} width={width} height="1" className="fill-surface-3" />
                {tm.buckets.map((b, i) => {
                  const h = ((b.bySubject[s] ?? 0) / maxMs) * (H - 4);
                  return h > 0 ? <rect key={i} x={i * slot + (slot - bw) / 2} y={H - 1 - h} width={bw} height={h} rx="2" className="fill-primary" /> : null;
                })}
              </svg>
            </div>
          ))}
          <div className="stack gap-s1">
            <p className="flex justify-between text-small"><span className="font-semibold">Net marks per block</span><span className="text-slate">indigo gained, saffron lost</span></p>
            <svg width={width} height={H + 8} aria-hidden="true" className="block">
              <rect x="0" y={(H + 8) / 2} width={width} height="1" className="fill-slate" />
              {tm.buckets.map((b, i) => {
                const h = (Math.abs(b.marks) / maxMarks) * ((H + 8) / 2 - 3);
                if (!h) return null;
                const up = b.marks > 0;
                return <rect key={i} x={i * slot + (slot - bw) / 2} y={up ? (H + 8) / 2 - h : (H + 8) / 2} width={bw} height={h} rx="2" className={up ? 'fill-primary' : 'fill-accent'} />;
              })}
            </svg>
          </div>
          <svg width={width} height="18" aria-hidden="true" className="block">
            {ticks.map(({ i, b }) => (
              <text key={i} x={Math.min(Math.max(i * slot, 10), width - 10)} y="13" textAnchor="middle" className="fill-slate text-caption tabular">{clock(b.fromMin)}</text>
            ))}
            <text x={width} y="13" textAnchor="end" className="fill-slate text-caption tabular">{clock(tm.buckets.at(-1)!.toMin)}</text>
          </svg>
        </div>
      </Chart>
    </div>
  );
}
