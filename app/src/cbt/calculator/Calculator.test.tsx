import { describe, expect, it } from 'vitest';
import { pressCalc } from './Calculator';

describe('pressCalc', () => {
  it('appends keys, backspaces whole tokens, clears', () => {
    expect(pressCalc('2', '+')).toBe('2+');
    expect(pressCalc('2*sin(', 'BACKSPACE')).toBe('2*');
    expect(pressCalc('2*pi', 'BACKSPACE')).toBe('2*');
    expect(pressCalc('12', 'BACKSPACE')).toBe('1');
    expect(pressCalc('12+3', 'CLEAR')).toBe('');
  });
});
