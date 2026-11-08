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

  describe('layout rules (docs/10_DESIGN_SYSTEM.md, "Page anatomy and symmetry")', () => {
    const read = (rel: string) => strip(readFileSync(join(SRC, rel), 'utf8'));
    const ls = (dir: string) => walk(join(SRC, dir)).filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f)).map((f) => relative(SRC, f).replaceAll('\\', '/'));

    /** Page screens: each must be built from Page + PageHeader (or PageSkeleton) so top offset, title size and header gap cannot drift. */
    const PAGE_FILES = ['pages/Home.tsx', 'pages/Settings.tsx', 'pages/Legal.tsx', 'pages/Placeholder.tsx', 'upload/Wizard.tsx', 'upload/BankPage.tsx'];
    /** Files whose layout this ticket normalised. Feature agents' folders are conformed in a follow-up (see "For feature agents"). */
    const LAYOUT_FILES = [...ls('pages'), ...ls('auth'), ...ls('upload'), ...ls('landing'), ...ls('dashboard')];
    /** Spacing is fully semantic (stack-* / row-* / gap-tight|base|loose|section|grid) in these. */
    const SEMANTIC_ONLY = [...ls('pages'), ...ls('auth'), ...ls('upload').filter((f) => !/CropTool|UserQuestionPreview/.test(f))];

    const fail = (files: string[], test: (rel: string, src: string) => string[]) =>
      files.flatMap((rel) => test(rel, read(rel)).map((m) => `${rel}: ${m}`));

    it('every page screen uses Page and PageHeader (one anatomy)', () => {
      expect(fail(PAGE_FILES, (_r, s) => [/<Page\b/.test(s) ? '' : 'no <Page>', /<PageHeader\b/.test(s) ? '' : 'no <PageHeader>'].filter(Boolean))).toEqual([]);
    });

    it('pages do not invent their own padding or width (no className on <Page>)', () => {
      expect(fail(LAYOUT_FILES, (_r, s) => all(/<Page\b[^>]*className=/g, s))).toEqual([]);
    });

    it('h1 comes only from PageHeader / AuthShell (one title size and position)', () => {
      expect(fail(LAYOUT_FILES.filter((f) => !f.startsWith('landing/')), (_r, s) => all(/<h1\b/g, s))).toEqual([]);
    });

    it('card rows use CardGrid / SpanGrid / Columns, never raw grid-cols, col-span or flex-wrap', () => {
      expect(fail(LAYOUT_FILES, (_r, s) => all(/(?<![\w-])(?:[a-z0-9]+:)*(?:grid-cols-[\w-]+|col-span-[\w-]+|flex-wrap)(?![\w-])/g, s))).toEqual([]);
    });

    it('Card and Tile take no padding, margin or gap utilities (one padding per breakpoint)', () => {
      const bad = fail(LAYOUT_FILES, (_r, s) => all(/<(?:Card|Tile)\b[^>]*?className=(?:"[^"]*"|\{`[^`]*`\})/g, s).filter((t) => /(?<![\w-])-?(?:p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|space-y|space-x)-(?:s\d|\d|tight|base|loose|section|grid)(?![\w-])/.test(t)));
      expect(bad).toEqual([]);
    });

    it('layout files use only the semantic spacing set (stack-section / stack-grid / stack-card / stack-field / stack-label / stack-text / row-inline / row-actions / row-between / gap-tight|base|loose|section|grid)', () => {
      expect(fail(SEMANTIC_ONLY, (_r, s) => all(/(?<![\w-])(?:gap|gap-x|gap-y|space-x|space-y)-s\d(?![\w-])|(?<![\w-])p[xytblr]?-s\d(?![\w-])/g, s))).toEqual([]);
    });

    it('loading states use the Skeleton* helpers, not ad-hoc full-width bars', () => {
      expect(fail(LAYOUT_FILES.filter((f) => !f.startsWith('dashboard/') && !f.startsWith('landing/')), (_r, s) => all(/<Skeleton\s+className="[^"]*\bh-s\d[^"]*"/g, s))).toEqual([]);
    });

    it('sticky offsets come from --sticky-top, never --topbar-h', () => {
      const css = ['index.css', 'upload/upload.css', 'dashboard/dashboard.css', 'landing/landing.css'];
      expect(fail(css, (_r, s) => all(/position:\s*sticky[^}]*top:\s*[^;}]*topbar-h[^;}]*/g, s))).toEqual([]);
    });

    /** Interaction model: hover only inside @media (hover: hover); every raw <button> carries a shared interactive class; no native <select>. */
    const stripHover = (css: string) => {
      let out = css;
      for (let m = /@media\s*\(hover:\s*hover\)\s*\{/.exec(out); m; m = /@media\s*\(hover:\s*hover\)\s*\{/.exec(out)) {
        let depth = 1;
        let i = m.index + m[0].length;
        while (i < out.length && depth > 0) { if (out[i] === '{') depth++; else if (out[i] === '}') depth--; i++; }
        out = out.slice(0, m.index) + out.slice(i);
      }
      return out;
    };
    it('CSS :hover rules live inside @media (hover: hover) so touch never sticks', () => {
      const css = ['index.css', 'upload/upload.css', 'dashboard/dashboard.css', 'landing/landing.css'];
      expect(fail(css, (_r, s) => all(/[^{}]*:hover[^{]*\{/g, stripHover(s)))).toEqual([]);
    });

    const INTERACTIVE = /\b(?:btn|tab|nav-item|menu-item|pill-btn|check-row|text-link|tile|u-step|u-exam-opt|link-row|sel-trigger|brand)\b/;
    it('raw <button> elements use a shared interactive class (one hover/active/focus/disabled model)', () => {
      const ALLOW = ['dashboard/charts/', 'dashboard/Customize.tsx'];
      const bad = fail(LAYOUT_FILES.filter((f) => !ALLOW.some((a) => f.startsWith(a))), (_r, s) => all(/<button\b(?:=>|[^>])*>/g, s).filter((t) => !INTERACTIVE.test(t)));
      expect(bad).toEqual([]);
    });

    it('no native <select> in app code (use Select / SelectField); the exam runner is exempt', () => {
      const nonCbt = walk(SRC).filter((f) => /\.tsx$/.test(f) && !/\.test\./.test(f)).map((f) => relative(SRC, f).replaceAll('\\', '/')).filter((r) => !r.startsWith('cbt/') && r !== 'components/ui.tsx');
      expect(fail(nonCbt, (_r, s) => all(/<select\b/g, s))).toEqual([]);
    });

    it('ui.tsx exports the layout primitives pages rely on', () => {
      const ui = read('components/ui.tsx');
      for (const name of ['Page', 'PageHeader', 'Section', 'Card', 'CardGrid', 'SpanGrid', 'Columns', 'TwoColumnPage', 'ListRow', 'SettingRow', 'EmptyState', 'SkeletonCards', 'SkeletonRows', 'PageSkeleton', 'TwoPane', 'Brand', 'Select']) {
        expect(ui, name).toMatch(new RegExp(`export function ${name}\\b`));
      }
    });
  });
});
