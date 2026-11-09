import { useRef, useState } from 'react';
import { CalcError, evaluate, formatResult, type AngleMode } from './eval';

/** Pure key handling so it can be unit tested. Returns the next expression text. */
export function pressCalc(expr: string, key: string): string {
  switch (key) {
    case 'BACKSPACE': return expr.replace(/(sqrt\(|sin\(|cos\(|tan\(|ln\(|log\(|exp\(|pi|.)$/, '');
    case 'CLEAR': return '';
    default: return expr + key;
  }
}

const ROWS: { label: string; key: string; aria?: string }[][] = [
  [{ label: 'sin', key: 'sin(' }, { label: 'cos', key: 'cos(' }, { label: 'tan', key: 'tan(' }, { label: 'π', key: 'pi' }, { label: 'e', key: 'e' }],
  [{ label: 'ln', key: 'ln(' }, { label: 'log', key: 'log(' }, { label: 'eˣ', key: 'exp(', aria: 'e to the x' }, { label: '√', key: 'sqrt(', aria: 'square root' }, { label: 'x²', key: '^2', aria: 'square' }],
  [{ label: '(', key: '(' }, { label: ')', key: ')' }, { label: 'xʸ', key: '^', aria: 'power' }, { label: '÷', key: '/', aria: 'divide' }, { label: '⌫', key: 'BACKSPACE', aria: 'Backspace' }],
  [{ label: '7', key: '7' }, { label: '8', key: '8' }, { label: '9', key: '9' }, { label: '×', key: '*', aria: 'times' }, { label: 'C', key: 'CLEAR', aria: 'Clear' }],
  [{ label: '4', key: '4' }, { label: '5', key: '5' }, { label: '6', key: '6' }, { label: '−', key: '-', aria: 'minus' }, { label: 'Ans', key: 'ANS', aria: 'Previous answer' }],
  [{ label: '1', key: '1' }, { label: '2', key: '2' }, { label: '3', key: '3' }, { label: '+', key: '+', aria: 'plus' }, { label: '=', key: '=', aria: 'Equals' }],
  [{ label: '0', key: '0' }, { label: '.', key: '.' }],
];

/** Flat on-screen scientific calculator. A plain panel, not a modal: the paper stays visible. */
export function Calculator({ onClose }: { onClose(): void }) {
  const [expr, setExpr] = useState('');
  const [result, setResult] = useState('');
  const [mode, setMode] = useState<AngleMode>('deg');
  const [err, setErr] = useState(false);
  const last = useRef<string>('');

  const run = () => {
    if (!expr.trim()) return;
    try {
      const out = formatResult(evaluate(expr, mode));
      last.current = out;
      setResult(out);
      setErr(false);
    } catch (e) {
      setResult(e instanceof CalcError ? e.message : 'Error');
      setErr(true);
    }
  };
  const press = (k: string) => {
    if (k === '=') return run();
    if (k === 'ANS') return last.current && setExpr((x) => x + last.current);
    setErr(false);
    setExpr((x) => pressCalc(x, k));
  };

  return (
    <div className="cbt-calc" role="dialog" aria-label="Scientific calculator">
      <div className="cbt-calc-head">
        <b>Calculator</b>
        <div className="cbt-calc-modes" role="group" aria-label="Angle mode">
          {(['deg', 'rad'] as const).map((m) => (
            <button key={m} type="button" className={`cbt-calc-mode${mode === m ? ' on' : ''}`} aria-pressed={mode === m} onClick={() => setMode(m)}>
              {m === 'deg' ? 'Deg' : 'Rad'}
            </button>
          ))}
        </div>
        <button type="button" className="cbt-btn" onClick={onClose}>Close</button>
      </div>
      <input
        className="cbt-calc-field"
        aria-label="Calculator expression"
        value={expr}
        autoComplete="off"
        spellCheck={false}
        onChange={(e) => { setErr(false); setExpr(e.target.value); }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); run(); }
          else if (e.key === 'Escape') { e.preventDefault(); onClose(); }
        }}
      />
      <output className={`cbt-calc-result${err ? ' err' : ''}`} aria-live="polite">{result || '0'}</output>
      <div className="cbt-calc-grid">
        {ROWS.flat().map((b) => (
          <button key={b.key + b.label} type="button" className="cbt-key cbt-calc-key" aria-label={b.aria} onClick={() => press(b.key)}>
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
