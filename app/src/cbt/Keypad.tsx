/** On-screen keypad for numeric (NVQ / INT) answers. Digits, `.`, `-`, backspace, clear. */

const ROWS = [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['0', '.', '-']] as const;

/** Applies one key press to the current text. Pure so it can be unit tested. */
export function applyKey(cur: string, key: string): string {
  switch (key) {
    case 'BACKSPACE':
      return cur.slice(0, -1);
    case 'CLEAR':
      return '';
    case '-':
      return cur.startsWith('-') ? cur.slice(1) : `-${cur}`;
    case '.':
      return cur.includes('.') ? cur : cur === '' || cur === '-' ? `${cur}0.` : `${cur}.`;
    default:
      return /^[0-9]$/.test(key) && cur.length < 16 ? cur + key : cur;
  }
}

export function Keypad({ value, onChange }: { value: string; onChange(next: string): void }) {
  const press = (k: string) => onChange(applyKey(value, k));
  return (
    <div className="cbt-keypad" role="group" aria-label="Answer keypad">
      <input
        className="cbt-keypad-field"
        aria-label="Your answer"
        value={value}
        readOnly
        inputMode="none"
        autoComplete="off"
        // physical keyboard is disabled inside the exam (Tab stays usable)
        onKeyDown={(e) => {
          if (e.key !== 'Tab') e.preventDefault();
        }}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      />
      <div className="cbt-keypad-grid">
        {ROWS.flat().map((k) => (
          <button key={k} type="button" className="cbt-key" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" className="cbt-key cbt-key-wide" onClick={() => press('BACKSPACE')} aria-label="Backspace">
          Backspace
        </button>
        <button type="button" className="cbt-key cbt-key-wide" onClick={() => press('CLEAR')}>
          Clear
        </button>
      </div>
    </div>
  );
}
