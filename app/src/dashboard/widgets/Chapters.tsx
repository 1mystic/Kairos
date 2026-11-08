import { Link } from 'react-router';
import { ChevronRightIcon } from '../icons';
import { LinkButton } from '../../components/ui';
import { PracticeIcon } from '../../components/icons';
import { CardEmpty, type WidgetProps } from './shared';

const COUNT = { s: 3, m: 4, l: 5 } as const;

export function Chapters({ size, ctx }: WidgetProps) {
  const rows = ctx.data.chapters.slice(0, COUNT[size]);
  if (!rows.length) return <CardEmpty title="No practice in this window" to="/practice" cta="Open practice" icon={<PracticeIcon />}>Chapters you practise show up here with time and accuracy.</CardEmpty>;
  return (
    <div className="stack gap-s4">
      <ul className="stack gap-s2">
        {rows.map((c) => {
          const body = (
            <>
              <span className="stack min-w-0 flex-1 gap-s1">
                <span className="truncate text-body font-semibold">{c.name}</span>
                <span className="text-small text-slate tabular">{c.correct}/{c.n} correct{c.minutes ? ` · ${c.minutes} min` : ''}</span>
              </span>
              {c.accuracy !== null && <span className="shrink-0 text-body font-bold tabular">{c.accuracy}%</span>}
              {c.exam && <ChevronRightIcon className="shrink-0 text-primary" />}
            </>
          );
          return (
            <li key={c.id}>
              {c.exam ? (
                <Link to={`/practice/${c.exam}/${encodeURIComponent(c.id)}`} className="link-row">{body}</Link>
              ) : (
                <div className="link-row">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      <div><LinkButton to="/practice" size="sm" variant="secondary">Open practice</LinkButton></div>
    </div>
  );
}
