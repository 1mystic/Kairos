import { useReveal } from './useReveal';

const LINES: [string, string][] = [
  ['Yesterday', '41/50 · Physics +3% · Organic needs attention'],
  ['Today', '46 questions · ~2h10m · Rotation (weak) · Ionic Eq (review) · mixed'],
  ['Next mock', 'Sat 9:00 · full JEE Main pattern'],
  ['Predicted', '168–196 (target 180)'],
];

export function TodayCardDemo() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className="card ld-today" data-shown={shown}>
      <div className="ld-today-head">
        <strong>97 days to JEE Main S1 (22 Jan)</strong>
        <span className="ld-badge">
          <span className="ld-dot" aria-hidden="true" /> On track
        </span>
      </div>
      <div className="ld-rho">
        <div className="ld-rho-row">
          <span>Pace ρ</span>
          <span className="ld-tab">0.92 · 6 buffer days left</span>
        </div>
        <div className="ld-meter" role="img" aria-label="Pace 0.92, on track">
          <div className="ld-meter-fill" />
          <span className="ld-meter-tick" aria-hidden="true" />
        </div>
      </div>
      <dl className="ld-lines">
        {LINES.map(([k, v], i) => (
          <div key={k} className="ld-line" style={{ ['--i' as string]: i }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
