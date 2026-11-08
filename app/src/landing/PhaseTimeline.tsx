import { useReveal } from './useReveal';

// Illustrative proportions only; the real plan is built backwards from your exam date.
const PHASES = [
  { name: 'Build', w: 30, note: 'Learn chapters, first pass' },
  { name: 'Strengthen', w: 22, note: 'Weak topics, spaced review' },
  { name: 'Consolidate', w: 18, note: 'Mixed sets, mocks begin' },
  { name: 'Exam mode', w: 14, note: 'Timed, full-pattern papers' },
  { name: 'Final sprint', w: 12, note: 'Last 15 days: a full mock daily at exam time' },
  { name: 'Taper', w: 4, note: 'Last 2 days: light, rested' },
];

export function PhaseTimeline() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className="card ld-phases" data-shown={shown}>
      <p className="ld-cap">Your days, planned backwards from the exam. Illustrative.</p>
      <div className="ld-bar" aria-hidden="true">
        {PHASES.map((p, i) => (
          <span key={p.name} className="ld-seg" data-i={i} style={{ flexGrow: p.w, ['--i' as string]: i }} />
        ))}
        <span className="ld-now" />
      </div>
      <ol className="ld-phase-list">
        {PHASES.map((p, i) => (
          <li key={p.name} style={{ ['--i' as string]: i }}>
            <strong>{p.name}</strong>
            <span>{p.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
