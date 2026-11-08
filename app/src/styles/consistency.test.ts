import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Design-system lint (see docs/10_DESIGN_SYSTEM.md). Fails on hex colours, borders, shadows, outlines,
 * arbitrary Tailwind values, off-scale spacing utilities and raw px/rem spacing or font sizes in CSS.
 * Exempt: tokens.css, src/cbt (NTA look), the landing CBT demo, tests.
 */
const SRC = join(__dirname, '..');
const EXEMPT = ['styles/tokens.css', 'cbt/', 'landing/PaletteDemo.tsx', 'landing/cbtDemo.css'];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const files = walk(SRC)
  .filter((f) => /\.(tsx|css)$/.test(f) && !/\.test\./.test(f))
  .map((f) => ({ rel: relative(SRC, f).replaceAll('\\', '/'), f }))
  .filter(({ rel }) => !EXEMPT.some((e) => rel.startsWith(e) || rel === e));

const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

function scan(name: string, test: (rel: string, src: string) => string[]) {
  it(name, () => {
    const bad = files.flatMap(({ rel, f }) => test(rel, strip(readFileSync(f, 'utf8'))).map((m) => `${rel}: ${m}`));
    expect(bad).toEqual([]);
  });
}
const all = (re: RegExp, s: string) => [...s.matchAll(re)].map((m) => m[0]);

describe('design system consistency', () => {
  it('scans a sensible set of files', () => expect(files.length).toBeGreaterThan(20));

  scan('no hex colours outside tokens.css', (_r, s) => all(/#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g, s));

  scan('no borders, shadows or gradients', (rel, s) => [
    ...all(/(?<![\w-])(?:border|divide)(?:-[\w/[\]]+)*(?![\w-])(?=[^'"`]*['"`])/g, rel.endsWith('.css') ? '' : s),
    ...all(/(?<![\w-])(?:shadow|drop-shadow)(?:-[\w/[\]]+)*(?![\w-])(?=[^'"`]*['"`])/g, rel.endsWith('.css') ? '' : s),
    ...all(/\bborder(?!-radius)[\w-]*\s*:(?!\s*(?:0|none)\b)/g, s),
    ...all(/box-shadow\s*:/g, s),
    ...all(/\b(?:linear|radial|conic)-gradient\(/g, s),
  ]);

  scan('no outlines or rings except the focus ring in index.css', (rel, s) => [
    ...all(/(?<![\w-])(?:ring|outline)(?:-[\w/[\]]+)*(?![\w-])(?=[^'"`]*['"`])/g, rel.endsWith('.css') ? '' : s),
    ...(rel === 'index.css' ? [] : all(/\boutline\s*:/g, s)),
  ]);

  scan('no arbitrary-value Tailwind classes', (rel, s) => (rel.endsWith('.css') ? [] : all(/(?<=['"`\s])!?(?:[a-z0-9]+:)*[a-z][\w-]*-\[[^\]\s]+\]/g, s)));

  scan('spacing utilities use the s1..s8 scale (no numeric p-4 / gap-3)', (rel, s) =>
    rel.endsWith('.css') ? [] : all(/(?<![\w-])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-x|space-y)-(?!0(?![\w.])|px(?![\w]))\d[\d.]*(?![\w-])/g, s));

  scan('no non-scale type utilities (use text-display/h1/h2/h3/body/small/caption)', (rel, s) =>
    rel.endsWith('.css') ? [] : all(/(?<![\w-])text-(?:xs|sm|base|lg|xl|[2-9]xl)(?![\w-])/g, s));

  scan('CSS spacing, gaps and font sizes come from tokens (no raw px/rem)', (rel, s) =>
    rel.endsWith('.css')
      ? all(/(?<![\w-])(?:margin|padding|gap|row-gap|column-gap|font-size)(?:-[a-z]+)*\s*:[^;{}]*?\b\d*\.?\d+(?:px|rem)\b[^;{}]*/g, s)
          .filter((d) => !/var\(--/.test(d) || /(?<![\w(-])\d*\.?\d+(?:px|rem)\b/.test(d.replace(/var\([^)]*\)/g, '').replace(/calc\([^)]*\)/g, (c) => c.replace(/\d*\.?\d+(?:px|rem)/g, ''))))
          .filter((d) => !/^(?:margin|padding|gap)[^:]*:\s*0\b/.test(d))
      : [],
  );
});
