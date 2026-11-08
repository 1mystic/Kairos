import { useReveal } from './useReveal';

const PARTS = [
  { k: 'Carry', d: 'Small slips roll into tomorrow.', w: 40 },
  { k: 'Spread', d: 'Bigger gaps are shared across buffer days.', w: 45 },
  { k: 'Shed', d: 'Only if you choose it: low-weight chapters, with the marks cost shown.', w: 15 },
];

export function BacklogDemo() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.3);
  return (
    <div ref={ref} className="card ld-backlog" data-shown={shown}>
      <div className="ld-stack" aria-hidden="true">
        <span className="ld-pile">missed</span>
        {PARTS.map((p, i) => (
          <span key={p.k} className={`ld-chunk ld-chunk-${i}`} style={{ flexGrow: p.w, ['--i' as string]: i }} />
        ))}
      </div>
      <ul className="ld-parts">
        {PARTS.map((p) => (
          <li key={p.k}>
            <strong>{p.k}</strong> <span>{p.d}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
