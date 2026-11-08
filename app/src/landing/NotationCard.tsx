import { useMemo } from 'react';
import { renderMath } from '@kairos/core';
import 'katex/dist/katex.min.css';

const ITEMS: [string, string][] = [
  ['Physics', '$$F = G\\,\\frac{m_1 m_2}{r^2}$$'],
  ['Chemistry', '$$\\ce{N2 + 3H2 <=> 2NH3}$$'],
  ['Maths', '$$\\int_0^{\\pi/2} \\sin^2 x \\, dx = \\frac{\\pi}{4}$$'],
];

export function NotationCard() {
  const html = useMemo(() => ITEMS.map(([, src]) => renderMath(src)), []);
  return (
    <div className="card ld-notation">
      {ITEMS.map(([label], i) => (
        <div key={label} className="ld-formula">
          <span className="ld-cap">{label}</span>
          <div dangerouslySetInnerHTML={{ __html: html[i] ?? '' }} />
        </div>
      ))}
    </div>
  );
}
