import { describe, expect, it } from 'vitest';
import { primaryExamId } from './taxonomy';

describe('primaryExamId', () => {
  it('reads the nearest exam from the packed profile string', () => {
    expect(primaryExamId('JEE_MAIN.1')).toBe('JEE_MAIN');
    expect(primaryExamId('GATE_DA.0')).toBe('GATE_DA');
    expect(primaryExamId('JEE_MAIN.2+NEET_UG.1@2027-05-03')).toBe('JEE_MAIN');
    expect(primaryExamId('IAT')).toBe('IAT');
  });
  it('is undefined for empty or unknown values', () => {
    expect(primaryExamId(undefined)).toBeUndefined();
    expect(primaryExamId('')).toBeUndefined();
    expect(primaryExamId('CAT.1')).toBeUndefined();
  });
});
