import type { ReactNode } from 'react';
import { createElement } from 'react';
import type { Delta } from './data';
import { ArrowUpIcon, BookIcon, CalendarIcon2, FlameIcon, InboxIcon, TargetIcon2, TimerIcon, TrophyIcon } from './icons';
import type { WidgetCtx } from './widgets/shared';

export interface StatTile { id: string; label: string; icon: ReactNode; value: string; sub?: string; delta?: Delta | null }

const dash = '–';
const mins = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);
const ic = (C: typeof BookIcon) => createElement(C, { size: 20 });

/** The stat catalogue. Each tile reads real data only; missing data shows an en dash and a short reason. */
export function statTile(id: string, c: WidgetCtx): StatTile | null {
  const { totals: t, deltas: d } = c.data;
  const days = c.data.range.kind === 'daily' ? 'today' : c.data.range.kind === 'week' ? 'this week' : 'in 30 days';
  switch (id) {
    case 'questions': return { id, label: 'Questions solved', icon: ic(BookIcon), value: String(t.questions), sub: `${t.correct} correct`, delta: d.questions };
    case 'accuracy': return { id, label: 'Accuracy', icon: ic(TargetIcon2), value: t.accuracy === null ? dash : `${t.accuracy}%`, sub: t.accuracy === null ? 'No answers yet' : undefined, delta: d.accuracy };
    case 'time': return { id, label: 'Study time', icon: ic(TimerIcon), value: t.minutes ? mins(t.minutes) : dash, delta: d.minutes };
    case 'streak': return { id, label: 'Active days', icon: ic(FlameIcon), value: String(t.activeDays), sub: c.data.streak ? `${c.data.streak}-day streak` : 'Streak restarts with one session', delta: d.activeDays };
    case 'mocks': return { id, label: 'Mocks taken', icon: ic(CalendarIcon2), value: String(t.mocks), delta: d.mocks };
    case 'bestMock': return { id, label: 'Best mock score', icon: ic(TrophyIcon), value: t.bestMock ? `${t.bestMock.marks}/${t.bestMock.max}` : dash, sub: t.bestMock ? days : 'No mock in this window' };
    case 'backlog': return { id, label: 'Backlog size', icon: ic(InboxIcon), value: c.plan?.backlog == null ? dash : String(c.plan.backlog), sub: c.plan?.backlog == null ? 'Appears once a plan is running' : 'tasks to catch up' };
    case 'buffer': return { id, label: 'Buffer days left', icon: ic(CalendarIcon2), value: c.plan?.buffersLeft == null ? dash : String(c.plan.buffersLeft), sub: c.plan?.buffersLeft == null ? 'Needs your exam date and time' : undefined };
    case 'weakest': return { id, label: 'Weakest chapter', icon: ic(TargetIcon2), value: c.data.weakest?.name ?? dash, sub: c.data.weakest ? undefined : 'Needs a few answers per chapter' };
    case 'band': { const b = c.bundle.band; return { id, label: 'Predicted band', icon: ic(ArrowUpIcon), value: b ? `${b.p25} to ${b.p75}` : dash, sub: b ? `out of ${b.max}` : 'Needs more practice data' }; }
    case 'silly': return { id, label: 'Silly-mistake rate', icon: ic(TargetIcon2), value: t.sillyRate === null ? dash : `${t.sillyRate}%`, sub: t.sillyRate === null ? 'No answers yet' : `${t.labels.silly_mistake ?? 0} of ${t.questions}` };
    case 'avgTime': return { id, label: 'Avg time per question', icon: ic(TimerIcon), value: t.avgSecPerQuestion === null ? dash : `${t.avgSecPerQuestion} s` };
    default: return null;
  }
}
