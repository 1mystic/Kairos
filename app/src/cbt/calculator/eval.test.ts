import { describe, expect, it } from 'vitest';
import { CalcError, evaluate, formatResult } from './eval';

describe('calculator evaluate', () => {
  it('respects precedence and parentheses', () => {
    expect(evaluate('2+3*4')).toBe(14);
    expect(evaluate('(2+3)*4')).toBe(20);
    expect(evaluate('10-4-3')).toBe(3);
    expect(evaluate('100/10/5')).toBe(2);
  });
  it('power is right associative and binds tighter than unary minus', () => {
    expect(evaluate('2^3^2')).toBe(512);
    expect(evaluate('-2^2')).toBe(-4);
    expect(evaluate('2^-1')).toBe(0.5);
    expect(evaluate('2*-3')).toBe(-6);
  });
  it('accepts display glyphs', () => {
    expect(evaluate('6×7')).toBe(42);
    expect(evaluate('8÷2−1')).toBe(3);
    expect(evaluate('√(16)')).toBe(4);
  });
  it('functions and constants', () => {
    expect(evaluate('log(1000)')).toBeCloseTo(3);
    expect(evaluate('ln(e)')).toBeCloseTo(1);
    expect(evaluate('exp(0)')).toBe(1);
    expect(evaluate('sqrt(2)^2')).toBeCloseTo(2);
    expect(evaluate('pi')).toBeCloseTo(Math.PI);
    expect(evaluate('2pi')).toBeCloseTo(2 * Math.PI);
  });
  it('trig honours the angle mode', () => {
    expect(evaluate('sin(30)', 'deg')).toBeCloseTo(0.5);
    expect(evaluate('cos(90)', 'deg')).toBe(0);
    expect(evaluate('tan(45)', 'deg')).toBeCloseTo(1);
    expect(evaluate('sin(pi/2)', 'rad')).toBeCloseTo(1);
  });
  it('scientific notation and decimals', () => {
    expect(evaluate('1.5e2')).toBe(150);
    expect(evaluate('.5+.25')).toBe(0.75);
  });
  it('rejects bad input without evaluating code', () => {
    for (const bad of ['', '2+', '(2', '2)', 'alert(1)', '1/0', 'sqrt(-1)', 'ln(0)', '2$3'])
      expect(() => evaluate(bad)).toThrow(CalcError);
  });
});

describe('formatResult', () => {
  it('trims noise', () => {
    expect(formatResult(0.1 + 0.2)).toBe('0.3');
    expect(formatResult(14)).toBe('14');
    expect(formatResult(-0)).toBe('0');
    expect(formatResult(1 / 3)).toBe('0.3333333333');
  });
});
