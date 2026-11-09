import './auth-art.css';

// Decorative only (the parent aside is aria-hidden). Illustrative sample screens, flat, tokens only.
const R = 120;
const C = 2 * Math.PI * R;
const STRIP = [30, 22, 18, 14, 12, 4];
const OPTIONS = ['1/2', '1/3', '2/5'];

export function AuthArt() {
  return (
    <>
      <svg className="au-ring" viewBox="0 0 320 320" focusable="false">
        <defs>
          <linearGradient id="au-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--primary)' }} />
            <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
          </linearGradient>
        </defs>
        <circle cx="160" cy="160" r={R} fill="none" className="au-ring-track" strokeWidth="16" />
        <circle cx="160" cy="160" r={R} fill="none" stroke="url(#au-ring-grad)" strokeWidth="16" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * 0.3} transform="rotate(-90 160 160)" />
        <circle cx="160" cy={160 - R} r="10" fill="var(--accent)" />
      </svg>
      <div className="au-art">
        <div className="au-cards">
          <div className="au-card au-float">
            <p className="au-h"><strong>Physics</strong><span>Rotation</span></p>
            <p className="au-q">Rotational share of a rolling disc's kinetic energy?</p>
            <ul className="au-opts">
              {OPTIONS.map((o, i) => <li key={o} data-on={i === 1}><b>{'ABC'[i]}</b>{o}</li>)}
            </ul>
          </div>
          <div className="au-side">
            <span className="au-chip au-float au-float-b"><span className="au-dot" />Pace 0.92 · On track</span>
            <span className="au-chip au-float"><span className="au-dot au-dot-accent" />97 days to JEE Main</span>
          </div>
        </div>
        <div className="au-strip">
          {STRIP.map((w, i) => <span key={i} data-i={i} style={{ flexGrow: w }} />)}
        </div>
      </div>
    </>
  );
}
