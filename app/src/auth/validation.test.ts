import { safeReturnPath, validateDob } from './validation';

describe('safeReturnPath', () => {
  it('accepts in-app paths', () => {
    expect(safeReturnPath('/practice/jee/kinematics')).toBe('/practice/jee/kinematics');
    expect(safeReturnPath('/')).toBe('/');
  });
  it('rejects external, protocol-relative, auth and non-string values', () => {
    for (const v of ['https://evil.test', '//evil.test', '/signin', '/signup/x', '/complete-profile', 'practice', undefined, 3]) {
      expect(safeReturnPath(v)).toBeNull();
    }
  });
});

describe('validateDob', () => {
  it('rejects future dates and impossible dates', () => {
    const today = new Date(2026, 10, 9);
    expect(validateDob('2026-11-10', today)).toBeTruthy();
    expect(validateDob('2026-02-30', today)).toBeTruthy();
    expect(validateDob('2008-11-09', today)).toBeUndefined();
  });
});
