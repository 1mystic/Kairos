import { CheckIcon } from '../components/icons';
import { CountdownRing } from './CountdownRing';

// Illustrative sample, consistent with the Today card further down the page (20 + 12 + 14 = 46 items).
const TASKS: { name: string; mins: string; done: number }[] = [
  { name: 'Rotation', mins: '45 min', done: 1 },
  { name: 'Ionic Eq', mins: '40 min', done: 0.4 },
  { name: 'Mixed set', mins: '45 min', done: 0 },
];
const STATS: { label: string; value: string; sub: string; status?: boolean }[] = [
  { label: 'Pace', value: '0.92', sub: 'On track', status: true },
  { label: 'Accuracy', value: '74%', sub: 'Last 7 days' },
  { label: 'Next mock', value: 'Sat 9:00', sub: 'Full pattern' },
];

/** One product-preview panel: ring + today's plan on a two-cell grid, three equal stat tiles underneath. Decorative. */
export function HeroVisual() {
  return (
    <div className="ld-hv" aria-hidden="true">
      <div className="ld-hv-bar">
        <span className="ld-hv-dots"><i /><i /><i /></span>
        <span className="ld-hv-title">Today · JEE Main</span>
      </div>
      <div className="ld-hv-body">
        <div className="ld-hv-cell ld-hv-ringcell">
          <CountdownRing />
        </div>
        <div className="ld-hv-cell ld-hv-plan">
          <p className="ld-hv-h"><strong>Today's plan</strong><span>~2h 10m</span></p>
          <ul className="ld-hv-tasks">
            {TASKS.map((t) => (
              <li key={t.name} data-done={t.done === 1}>
                <span className="ld-hv-tick">{t.done === 1 && <CheckIcon />}</span>
                <span className="ld-hv-task">
                  <span className="ld-hv-row"><span>{t.name}</span><span className="ld-tab">{t.mins}</span></span>
                  <span className="ld-hv-prog"><span style={{ ['--p' as string]: t.done }} /></span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <ul className="ld-hv-stats">
        {STATS.map((s) => (
          <li key={s.label} className="ld-hv-cell">
            <span className="ld-hv-k">{s.label}</span>
            <strong className="ld-tab">{s.value}</strong>
            <span className="ld-hv-sub">{s.status && <i className="ld-dot" />}{s.sub}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
