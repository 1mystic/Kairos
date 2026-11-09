import { describe, expect, it } from 'vitest';
import { cleanNumeric } from './SessionRunner';

describe('cleanNumeric', () => {
  it('keeps number characters', () => {
    expect(cleanNumeric('12.5')).toBe('12.5');
    expect(cleanNumeric('1e-3')).toBe('1e-3');
    expect(cleanNumeric('ab7c')).toBe('7');
  });
  it('turns typographic minus signs into a hyphen instead of dropping them', () => {
    expect(cleanNumeric('−2')).toBe('-2');
    expect(cleanNumeric('–2.5')).toBe('-2.5');
  });
});
