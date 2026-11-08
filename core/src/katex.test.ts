import { describe, it, expect } from 'vitest';
import { checkMath, renderMath, splitMath, escapeHtml } from './katex';

describe('splitMath', () => {
  it('splits inline and display', () => {
    expect(splitMath('a $x$ b $$y$$ c')).toEqual([
      { kind: 'text', content: 'a ' },
      { kind: 'inline', content: 'x' },
      { kind: 'text', content: ' b ' },
      { kind: 'display', content: 'y' },
      { kind: 'text', content: ' c' },
    ]);
  });
  it('treats escaped dollars as text', () => {
    expect(splitMath('costs \\$5 and \\$6')).toEqual([
      { kind: 'text', content: 'costs $5 and $6' },
    ]);
  });
  it('treats unclosed / empty delimiters as literal', () => {
    expect(splitMath('a $ b')).toEqual([{ kind: 'text', content: 'a $ b' }]);
    expect(splitMath('$$')).toEqual([{ kind: 'text', content: '$$' }]);
    expect(splitMath('x $$ y')).toEqual([{ kind: 'text', content: 'x $$ y' }]);
  });
  it('does not end math at an escaped dollar', () => {
    expect(splitMath('$a \\$ b$')).toEqual([{ kind: 'inline', content: 'a \\$ b' }]);
  });
});

describe('checkMath', () => {
  it('passes valid math', () => {
    expect(checkMath('Find $\\frac{a}{b}$ and $$\\int_0^1 x\\,dx$$ costing \\$5')).toEqual({
      ok: true,
      errors: [],
    });
  });
  it('reports invalid math', () => {
    const r = checkMath('ok $x$ bad $\\frac{1$ and $\\notacommand$');
    expect(r.ok).toBe(false);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]!.segment).toBe('\\frac{1');
    expect(r.errors[0]!.message).toMatch(/KaTeX/);
  });
});

describe('renderMath', () => {
  it('escapes text and renders math', () => {
    const h = renderMath('<script>alert(1)</script> & $x^2$ "q" \'s\'');
    expect(h).not.toContain('<script>');
    expect(h).toContain('&lt;script&gt;');
    expect(h).toContain('&amp;');
    expect(h).toContain('katex');
  });
  it('renders display mode and tolerates bad math', () => {
    expect(renderMath('$$x$$')).toContain('katex-display');
    expect(() => renderMath('$\\frac{1$')).not.toThrow();
  });
  it('escapeHtml', () => {
    expect(escapeHtml('<&>"\'')).toBe('&lt;&amp;&gt;&quot;&#39;');
  });
});
