import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

it('diagnostic UI files use no border, shadow, ring, outline or gradient utilities', () => {
  const bad = readdirSync(__dirname)
    .filter((f) => f.endsWith('.tsx') && !f.includes('.test.'))
    .flatMap((f) => [...readFileSync(join(__dirname, f), 'utf8').matchAll(/['"` ](?:border|divide|shadow|ring|outline|bg-gradient|from-|to-)[\w-]*/g)].map((m) => `${f}: ${m[0]}`));
  expect(bad).toEqual([]);
});
