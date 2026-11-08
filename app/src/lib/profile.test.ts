import { ageOn, buildNewProfile } from './profile';

const base = { displayName: ' Asha ', email: 'a@b.co' };

describe('buildNewProfile', () => {
  it('is a minor the day before the 18th birthday', () => {
    const p = buildNewProfile({ ...base, dob: '2008-11-09' }, '2026-11-08');
    expect(p.isMinor).toBe(true);
    expect(p.consent.status).toBe('pending');
  });
  it('is an adult on the 18th birthday', () => {
    const p = buildNewProfile({ ...base, dob: '2008-11-08' }, '2026-11-08');
    expect(p.isMinor).toBe(false);
    expect(p.consent.status).toBe('not_required');
  });
  it('produces the exact schema', () => {
    const p = buildNewProfile({ ...base, dob: '2000-01-01' }, '2026-11-08');
    expect(p).toEqual({
      schemaVersion: 1, displayName: 'Asha', email: 'a@b.co', dob: '2000-01-01',
      isMinor: false, consent: { status: 'not_required' }, onboarded: false,
    });
  });
  it('rejects bad input', () => {
    expect(() => buildNewProfile({ ...base, dob: '2030-01-01' }, '2026-11-08')).toThrow();
    expect(() => buildNewProfile({ ...base, dob: '2001-02-30' }, '2026-11-08')).toThrow();
    expect(() => buildNewProfile({ ...base, displayName: '  ', dob: '2001-01-01' }, '2026-11-08')).toThrow();
    expect(() => buildNewProfile({ ...base, displayName: 'x'.repeat(81), dob: '2001-01-01' }, '2026-11-08')).toThrow();
  });
  it('handles leap-day birthdays', () => {
    expect(ageOn('2008-02-29', '2026-02-28')).toBe(17);
    expect(ageOn('2008-02-29', '2026-03-01')).toBe(18);
  });
});
