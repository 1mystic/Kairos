import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { matchRoutes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { practiceRoutes } from '../routes';

describe('route precedence', () => {
  it('/practice/today is its own route, not /practice/:exam/:chapter', () => {
    const m = matchRoutes(practiceRoutes, '/practice/today');
    expect(m?.at(-1)?.route.path).toBe('/practice/today');
    expect(practiceRoutes.findIndex((r) => r.path === '/practice/today')).toBeLessThan(practiceRoutes.findIndex((r) => r.path === '/practice/:exam/:chapter'));
  });
  it('chapter and summary routes still match', () => {
    expect(matchRoutes(practiceRoutes, '/practice/JEE_MAIN/PHY.LOM')?.at(-1)?.route.path).toBe('/practice/:exam/:chapter');
    expect(matchRoutes(practiceRoutes, '/practice/summary/s_1')?.at(-1)?.route.path).toBe('/practice/summary/:sessionId');
  });
});

describe('flat design rules in this folder', () => {
  const files = readdirSync(__dirname).filter((f) => /\.tsx?$/.test(f) && !/\.test\./.test(f));
  it.each(files)('%s has no border, shadow, ring, gradient or arbitrary-value utilities', (f) => {
    const src = readFileSync(join(__dirname, f), 'utf8');
    expect(src).not.toMatch(/(?<![\w-])(?:border|shadow|ring|outline|divide)(?:-[\w/[\]]+)*(?=[^'"`]*['"`])/);
    expect(src).not.toMatch(/-gradient\(|bg-gradient/);
    expect(src).not.toMatch(/(?<=['"`\s])[a-z][\w-]*-\[[^\]\s]+\]/);
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}(?![\w-])/);
  });
});
