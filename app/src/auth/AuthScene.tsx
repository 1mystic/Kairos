import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent } from 'react';
import { SAMPLE_QUESTIONS } from './art/questions';

const KEYS = ['A', 'B', 'C', 'D'];
const PHASES = ['Build', 'Strengthen', 'Consolidate', 'Exam mode', 'Final sprint', 'Taper'];
/** Phase widths (sum 100) and how much of each is done at "today" (about 58% through the plan). */
const WEIGHTS = [22, 20, 18, 16, 14, 10];
const FILLS = [1, 1, 0.89, 0, 0, 0];
const PACE = 0.92;
const TOTAL_Q = 25;

const Check = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
);
const Cross = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M6 6l12 12M18 6L6 18" /></svg>
);

const reduced = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function AuthScene() {
  const root = useRef<HTMLDivElement>(null);
  const pace = useRef<HTMLSpanElement>(null);
  const opts = useRef<(HTMLButtonElement | null)[]>([]);
  const [qi, setQi] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState(0);
  const [qNum, setQNum] = useState(6);
  const [pulse, setPulse] = useState(0);
  const [touched, setTouched] = useState(false);
  const q = SAMPLE_QUESTIONS[qi]!;

  // The aside is aria-hidden in AuthShell, which would hide the controls from assistive tech: lift it while the scene is mounted.
  useEffect(() => {
    const aside = root.current?.closest('aside');
    if (!aside) return;
    const prev = aside.getAttribute('aria-hidden');
    aside.removeAttribute('aria-hidden');
    return () => { if (prev !== null) aside.setAttribute('aria-hidden', prev); };
  }, []);

  // Pace counts 0.00 -> 0.92 once (skipped for reduced motion).
  useLayoutEffect(() => {
    const el = pace.current;
    if (!el || reduced()) return;
    let raf = 0;
    let start = 0;
    el.textContent = '0.00';
    const tick = (t: number) => {
      start ||= t;
      const p = Math.min(1, (t - start - 500) / 1400);
      if (p >= 0) el.textContent = (PACE * (1 - (1 - p) ** 3)).toFixed(2);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Pointer parallax: ring + decorative arcs shift a few px toward the pointer (hover devices only, transform via CSS vars).
  useEffect(() => {
    const panel = root.current?.closest<HTMLElement>('.auth-brand');
    if (!panel || reduced() || !window.matchMedia?.('(hover: hover) and (pointer: fine)').matches) return;
    let raf = 0;
    let nx = 0;
    let ny = 0;
    const apply = () => {
      raf = 0;
      panel.style.setProperty('--au-x', nx.toFixed(3));
      panel.style.setProperty('--au-y', ny.toFixed(3));
    };
    const queue = () => { raf ||= requestAnimationFrame(apply); };
    const move = (e: PointerEvent) => {
      const r = panel.getBoundingClientRect();
      nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      queue();
    };
    const leave = () => { nx = 0; ny = 0; queue(); };
    panel.addEventListener('pointermove', move);
    panel.addEventListener('pointerleave', leave);
    return () => {
      panel.removeEventListener('pointermove', move);
      panel.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(raf);
      panel.style.removeProperty('--au-x');
      panel.style.removeProperty('--au-y');
    };
  }, []);

  const choose = (i: number) => {
    if (pick !== null) return;
    setPick(i);
    setFocusIdx(i);
    setTouched(true);
    setQNum((n) => Math.min(TOTAL_Q, n + 1));
    setPulse((p) => p + 1);
  };
  const next = () => {
    setQi((i) => (i + 1) % SAMPLE_QUESTIONS.length);
    setPick(null);
    setFocusIdx(0);
    setTouched(true);
  };
  const onKey = (e: KeyboardEvent) => {
    const n = q.options.length;
    let to = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') to = (focusIdx + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = (focusIdx + n - 1) % n;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = n - 1;
    if (to < 0) return;
    e.preventDefault();
    setFocusIdx(to);
    opts.current[to]?.focus();
  };

  const ok = pick !== null && pick === q.answer;
  const pulseCls = pulse === 0 ? '' : pulse % 2 ? ' au-pulse-a' : ' au-pulse-b';

  return (
    <>
      <svg className="au-arc au-arc-a" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><circle cx="100" cy="100" r="90" fill="none" strokeWidth="10" /><circle cx="100" cy="100" r="62" fill="none" strokeWidth="4" /></svg>
      <svg className="au-arc au-arc-b" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><circle cx="100" cy="100" r="90" fill="none" strokeWidth="10" /></svg>

      <div className="au-scene" ref={root} data-idle={!touched}>
        <section className="au-cell au-card" aria-label="Sample question">
          <p className="au-h"><strong>{q.subject}</strong><span>{q.topic}</span></p>
          <p className="au-q">{q.text}</p>
          <div role="radiogroup" aria-label="Try a sample question" className="au-opts" onKeyDown={onKey}>
            {q.options.map((o, i) => {
              const right = pick !== null && i === q.answer;
              const wrong = pick === i && i !== q.answer;
              return (
                <button
                  key={`${qi}-${i}`}
                  ref={(el) => { opts.current[i] = el; }}
                  type="button"
                  role="radio"
                  aria-checked={pick === i}
                  tabIndex={focusIdx === i ? 0 : -1}
                  className={`check-row opt opt-live au-opt${right ? ' opt-right' : ''}${wrong ? ' opt-wrong' : ''}`}
                  data-i={i}
                  onClick={() => choose(i)}
                  onFocus={() => setFocusIdx(i)}
                >
                  <span className="opt-key" aria-hidden="true">{KEYS[i]}</span>
                  <span className="au-otext">{o}</span>
                  <span className="au-mark" aria-hidden="true">{wrong ? <Cross /> : <Check />}</span>
                </button>
              );
            })}
          </div>
          <div className="au-foot">
            <span role="status" aria-live="polite" className="au-result">
              {pick === null && <span className="au-hint">Pick an answer</span>}
              {ok && <span className="chip chip-good"><Check />Correct</span>}
              {pick !== null && !ok && <span className="chip chip-bad"><Cross />Not quite</span>}
            </span>
            <button type="button" className="text-link au-try" onClick={next}>Try another</button>
          </div>
        </section>

        <div className="au-cell au-ringcell">
          <div className="au-par">
            <div className={`au-pulsewrap${pulseCls}`}>
              <svg className="au-ringsvg" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
                <defs>
                  <linearGradient id="au-ring-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" style={{ stopColor: 'var(--primary)' }} />
                    <stop offset="1" style={{ stopColor: 'var(--accent)' }} />
                  </linearGradient>
                </defs>
                <circle className="au-track" cx="100" cy="100" r="80" fill="none" strokeWidth="12" />
                <circle className="au-arcline" cx="100" cy="100" r="80" fill="none" stroke="url(#au-ring-grad)" strokeWidth="12" strokeLinecap="round" pathLength="100" transform="rotate(-90 100 100)" />
                <g className="au-orbit"><circle cx="100" cy="20" r="8" fill="var(--accent)" /></g>
              </svg>
            </div>
          </div>
          <p className="au-ringtext"><strong>97</strong><span>days to JEE Main</span></p>
        </div>

        <div className="au-cell au-timeline">
          <div className="au-chips">
            <span className="chip chip-good"><span className="au-dot" />Pace <span ref={pace}>{PACE.toFixed(2)}</span> · On track</span>
            <span className={`chip chip-primary au-qchip${pulseCls}`}>Q{qNum} of {TOTAL_Q}</span>
          </div>
          <div className="au-bar" aria-hidden="true">
            {WEIGHTS.map((w, i) => (
              <span key={PHASES[i]} className="au-seg" style={{ flexGrow: w }}><i style={{ '--f': FILLS[i], '--k': i } as CSSProperties} /></span>
            ))}
            <span className="au-today"><b /></span>
          </div>
          <ul className="au-legend">
            {PHASES.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      </div>
    </>
  );
}
