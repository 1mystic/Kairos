import { useReveal } from './useReveal';

const R = 128;
const C = 2 * Math.PI * R;
const FILL = 0.74;

export function CountdownRing() {
  const [ref, shown] = useReveal<HTMLDivElement>(0.1);
  return (
    <div ref={ref} className="ld-ring" data-shown={shown} role="img" aria-label="Countdown ring: 97 days to JEE Main">
      <svg viewBox="0 0 320 320" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="ld-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#3A3FD9" />
            <stop offset="1" stopColor="#F5A524" />
          </linearGradient>
        </defs>
        <circle cx="160" cy="160" r={R} fill="none" stroke="var(--line)" strokeWidth="14" />
        <circle
          className="ld-ring-arc"
          cx="160"
          cy="160"
          r={R}
          fill="none"
          stroke="url(#ld-ring-grad)"
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={shown ? C * (1 - FILL) : C}
          transform="rotate(-90 160 160)"
        />
        <g className="ld-orbit">
          <circle className="ld-moment" cx="160" cy={160 - R} r="9" fill="#F5A524" />
        </g>
      </svg>
      <div className="ld-ring-text">
        <span className="ld-ring-num">97</span>
        <span className="ld-ring-label">days to JEE Main</span>
      </div>
    </div>
  );
}
