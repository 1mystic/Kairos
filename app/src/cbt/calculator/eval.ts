/**
 * Safe scientific-calculator expression evaluator (shunting-yard). No `eval`, no `Function`.
 * Grammar: numbers, + - * / ^ , parentheses, unary minus, constants pi and e,
 * functions sqrt, ln, log (base 10), exp, sin, cos, tan, abs. Postfix `%` is not supported.
 * Accepts the display glyphs × ÷ − π √ as aliases.
 */
export type AngleMode = 'deg' | 'rad';

type Tok =
  | { t: 'num'; v: number }
  | { t: 'op'; v: '+' | '-' | '*' | '/' | '^' | 'neg' }
  | { t: 'fn'; v: string }
  | { t: 'lp' }
  | { t: 'rp' };

const FUNCS = new Set(['sqrt', 'ln', 'log', 'exp', 'sin', 'cos', 'tan', 'abs']);
const PREC: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, neg: 3, '^': 4 };
const RIGHT = new Set(['^', 'neg']);

export class CalcError extends Error {}

function tokenize(src: string): Tok[] {
  const s = src.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi').replace(/√/g, 'sqrt').toLowerCase();
  const out: Tok[] = [];
  let i = 0;
  const prevIsValue = () => {
    const p = out[out.length - 1];
    return !!p && (p.t === 'num' || p.t === 'rp');
  };
  while (i < s.length) {
    const c = s[i]!;
    if (c === ' ') { i++; continue; }
    const num = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i));
    if (num && !(num[2] && /^[a-z(]/.test(s.slice(i + num[0].length)))) {
      if (prevIsValue()) out.push({ t: 'op', v: '*' });
      out.push({ t: 'num', v: Number(num[0]) });
      i += num[0].length;
      continue;
    }
    if (num) {
      // "2e" followed by letters means 2 * e..., take only the mantissa
      const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i))!;
      if (prevIsValue()) out.push({ t: 'op', v: '*' });
      out.push({ t: 'num', v: Number(m[0]) });
      i += m[0].length;
      continue;
    }
    const word = /^[a-z]+/.exec(s.slice(i));
    if (word) {
      const w = word[0];
      if (w === 'pi' || w === 'e') {
        if (prevIsValue()) out.push({ t: 'op', v: '*' });
        out.push({ t: 'num', v: w === 'pi' ? Math.PI : Math.E });
      } else if (FUNCS.has(w)) {
        if (prevIsValue()) out.push({ t: 'op', v: '*' });
        out.push({ t: 'fn', v: w });
      } else throw new CalcError(`Unknown name: ${w}`);
      i += w.length;
      continue;
    }
    if (c === '(') {
      if (prevIsValue()) out.push({ t: 'op', v: '*' });
      out.push({ t: 'lp' });
    } else if (c === ')') out.push({ t: 'rp' });
    else if (c === '+' || c === '-' || c === '*' || c === '/' || c === '^') {
      if ((c === '-' || c === '+') && !prevIsValue()) {
        if (c === '-') out.push({ t: 'op', v: 'neg' });
      } else out.push({ t: 'op', v: c });
    } else throw new CalcError(`Unexpected "${c}"`);
    i++;
  }
  return out;
}

function applyFn(name: string, x: number, mode: AngleMode): number {
  const a = mode === 'deg' ? (x * Math.PI) / 180 : x;
  switch (name) {
    case 'sqrt': return Math.sqrt(x);
    case 'ln': return Math.log(x);
    case 'log': return Math.log10(x);
    case 'exp': return Math.exp(x);
    case 'abs': return Math.abs(x);
    case 'sin': return mode === 'deg' && x % 180 === 0 ? 0 : Math.sin(a);
    case 'cos': return mode === 'deg' && (x - 90) % 180 === 0 ? 0 : Math.cos(a);
    case 'tan': return mode === 'deg' && x % 180 === 0 ? 0 : Math.tan(a);
    default: throw new CalcError(`Unknown function: ${name}`);
  }
}

/** Evaluates to a finite number or throws CalcError. */
export function evaluate(src: string, mode: AngleMode = 'deg'): number {
  const toks = tokenize(src);
  if (toks.length === 0) throw new CalcError('Empty expression');
  const outq: number[] = [];
  const ops: Tok[] = [];
  const reduce = (op: Tok) => {
    if (op.t === 'fn') {
      if (outq.length < 1) throw new CalcError('Missing argument');
      outq.push(applyFn(op.v, outq.pop()!, mode));
    } else if (op.t === 'op' && op.v === 'neg') {
      if (outq.length < 1) throw new CalcError('Missing operand');
      outq.push(-outq.pop()!);
    } else if (op.t === 'op') {
      if (outq.length < 2) throw new CalcError('Missing operand');
      const b = outq.pop()!;
      const a = outq.pop()!;
      outq.push(op.v === '+' ? a + b : op.v === '-' ? a - b : op.v === '*' ? a * b : op.v === '/' ? a / b : a ** b);
    }
  };
  for (const tk of toks) {
    if (tk.t === 'num') outq.push(tk.v);
    else if (tk.t === 'fn' || tk.t === 'lp') ops.push(tk);
    else if (tk.t === 'op') {
      for (;;) {
        const top = ops[ops.length - 1];
        if (!top || top.t === 'lp') break;
        const higher = top.t === 'fn' || PREC[top.v]! > PREC[tk.v]! || (PREC[top.v]! === PREC[tk.v]! && !RIGHT.has(tk.v));
        // a prefix operator never pops anything before it
        if (!higher || tk.v === 'neg') break;
        reduce(ops.pop()!);
      }
      ops.push(tk);
    } else {
      for (;;) {
        const top = ops.pop();
        if (!top) throw new CalcError('Unbalanced )');
        if (top.t === 'lp') break;
        reduce(top);
      }
      if (ops[ops.length - 1]?.t === 'fn') reduce(ops.pop()!);
    }
  }
  while (ops.length) {
    const top = ops.pop()!;
    if (top.t === 'lp') throw new CalcError('Unbalanced (');
    reduce(top);
  }
  if (outq.length !== 1) throw new CalcError('Invalid expression');
  const r = outq[0]!;
  if (!Number.isFinite(r)) throw new CalcError('Math error');
  return r;
}

/** Display text: up to 10 significant digits, no trailing zeros. */
export function formatResult(n: number): string {
  if (Object.is(n, -0)) return '0';
  const abs = Math.abs(n);
  if (abs !== 0 && (abs >= 1e12 || abs < 1e-9)) return n.toExponential(6).replace(/\.?0+e/, 'e');
  return String(Number(n.toPrecision(10)));
}
