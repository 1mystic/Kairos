import { useEffect, useState } from 'react';
import { prefersReducedMotion, useInView } from './useReveal';

const N = 30;
const STATES = ['nv', 'na', 'an', 'mk', 'am'] as const;
const LEGEND: [(typeof STATES)[number], string][] = [
  ['nv', 'Not visited'],
  ['na', 'Not answered'],
  ['an', 'Answered'],
  ['mk', 'Marked for review'],
  ['am', 'Answered & marked'],
];
const initial = () => Array.from({ length: N }, (_, i) => (i * 7 + (i % 4)) % 5);

export function PaletteDemo() {
  const [cells, setCells] = useState<number[]>(initial);
  const [ref, inView] = useInView<HTMLDivElement>();

  useEffect(() => {
    if (!inView || prefersReducedMotion()) return;
    let t = 0;
    const id = setInterval(() => {
      t++;
      setCells((c) => c.map((s, i) => (i === (t * 7) % N || i === (t * 11 + 3) % N ? (s + 1) % 5 : s)));
    }, 700);
    return () => clearInterval(id);
  }, [inView]);

  return (
    <div ref={ref} className="ld-cbt" style={{ fontFamily: 'var(--cbt-font)' }}>
      <div className="ld-cbt-head">Physics · Section A</div>
      <div
        className="ld-pal"
        role="img"
        aria-label="Question palette demo: 30 numbered questions cycling through five states: not visited, not answered, answered, marked for review, and answered and marked for review."
      >
        {cells.map((s, i) => (
          <span key={i} className={`ld-q ld-q-${STATES[s]}`} aria-hidden="true">
            {i + 1}
          </span>
        ))}
      </div>
      <ul className="ld-legend">
        {LEGEND.map(([k, label]) => (
          <li key={k}>
            <span className={`ld-q ld-q-${k} ld-q-sm`} aria-hidden="true" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
