import { CheckIcon } from '../components/icons';
import { CountdownRing } from './CountdownRing';

// Illustrative sample screens, consistent with the Today card further down the page (20 + 12 + 14 = 46 questions).
const TASKS: [string, boolean][] = [
  ['Rotation: 20 questions', true],
  ['Ionic Eq: 12 review cards', false],
  ['Mixed set: 14 questions', false],
];
const OPTIONS = ['1/2', '1/3', '2/5', '1/4'];
const PALETTE = ['done', 'done', 'done', 'marked', 'done', 'now', 'todo', 'todo'];

const idx = (n: number) => ({ ['--i' as string]: n });

export function HeroVisual() {
  return (
    <div className="ld-hv">
      <div className="ld-hv-ring" style={idx(0)}>
        <CountdownRing />
      </div>
      <div className="ld-hv-chip ld-hv-chip-a" style={idx(3)} aria-hidden="true">
        <span className="ld-hv-float">
          <span className="ld-dot" /> Pace 0.92 · On track
        </span>
      </div>
      <div className="ld-hv-chip ld-hv-chip-b" style={idx(4)} aria-hidden="true">
        <span className="ld-hv-float">
          <span className="ld-hv-pal">
            {PALETTE.map((s, i) => <i key={i} data-s={s} />)}
          </span>
          Q6 of 25
        </span>
      </div>
      <div className="ld-hv-plan" style={idx(1)} aria-hidden="true">
        <div className="ld-mini ld-hv-float">
          <p className="ld-mini-h"><strong>Today</strong><span>~2h 10m</span></p>
          <ul className="ld-mini-tasks">
            {TASKS.map(([t, done]) => (
              <li key={t} data-done={done}>
                <span className="ld-mini-tick">{done && <CheckIcon />}</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="ld-hv-q" style={idx(2)} aria-hidden="true">
        <div className="ld-mini ld-hv-float ld-hv-float-b">
          <p className="ld-mini-h"><strong>Physics</strong><span>Rotation</span></p>
          <p className="ld-mini-q">Rotational share of a rolling disc's kinetic energy?</p>
          <ul className="ld-mini-opts">
            {OPTIONS.map((o, i) => (
              <li key={o} data-on={i === 1}><b>{'ABCD'[i]}</b>{o}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
