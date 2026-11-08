import { useState } from 'react';
import { dayNumber } from '@kairos/core';
import { InboxIcon } from '../icons';
import type { ActivityKind } from '../data';
import { formatDay, localDate } from '../range';
import { CardEmpty, type WidgetProps } from './shared';

const FILTERS: { id: 'all' | ActivityKind; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'practice', label: 'Practice' }, { id: 'mock', label: 'Mocks' }, { id: 'mastery', label: 'Mastery' }, { id: 'upload', label: 'Uploads' },
];
const COUNT = { s: 4, m: 5, l: 10 } as const;

function lastUpdated(at: number | null, today: string): string {
  if (at === null) return 'No activity yet';
  const d = localDate(at);
  const diff = dayNumber(today) - dayNumber(d);
  return `Last activity ${diff <= 0 ? 'today' : diff === 1 ? 'yesterday' : formatDay(d, false)}`;
}

export function Activity({ size, ctx }: WidgetProps) {
  const [f, setF] = useState<'all' | ActivityKind>('all');
  const all = ctx.data.activity;
  if (!all.length) return <CardEmpty title="Nothing here yet" to="/practice" cta="Start practising" icon={<InboxIcon />}>Practice sessions, mocks and mastery changes will be listed here.</CardEmpty>;
  const shown = all.filter((e) => f === 'all' || e.kind === f).slice(0, COUNT[size]);
  const present = new Set(all.map((e) => e.kind));
  return (
    <div className="stack gap-s4">
      <div role="group" aria-label="Filter activity" className="flex flex-wrap gap-s2">
        {FILTERS.filter((x) => x.id === 'all' || present.has(x.id)).map((x) => (
          <button key={x.id} type="button" aria-pressed={f === x.id} onClick={() => setF(x.id)} className={`min-h-11 rounded-pill px-s4 text-small font-semibold ${f === x.id ? 'bg-primary-50 text-primary' : 'bg-surface text-slate hover:bg-surface-3'}`}>{x.label}</button>
        ))}
      </div>
      <ul className="stack gap-s3" aria-live="polite">
        {shown.map((e) => (
          <li key={e.id} className="flex items-start gap-s3">
            <span aria-hidden="true" className={`mt-s2 size-s2 shrink-0 rounded-pill ${e.tone === 'accent' ? 'bg-accent' : e.tone === 'primary' ? 'bg-primary' : 'bg-slate'}`} />
            <span className="stack min-w-0 gap-s1">
              <span className={`text-body ${e.tone === 'accent' ? 'text-accent-ink font-semibold' : ''}`}>{e.title}</span>
              <span className="text-small text-slate tabular">{[e.detail, formatDay(localDate(e.at), false)].filter(Boolean).join(' · ')}</span>
            </span>
          </li>
        ))}
        {!shown.length && <li className="text-small text-slate">Nothing of this kind in the window.</li>}
      </ul>
      <p className="text-caption text-slate">{lastUpdated(ctx.data.lastActivityAt, ctx.today)}</p>
    </div>
  );
}
