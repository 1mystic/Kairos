import { describe, expect, it } from 'vitest';
import {
  MAX_PROFILES, activeProfile, addProfile, canAddProfile, daysWords, emptyProfiles, normaliseProfile, packedFor, parseProfiles, profilesFromLegacy, profilesOf,
  remainingExams, removeProfile, serialiseProfiles, toProfileFields, updateProfile, withActive, type ExamProfiles,
} from './model';

const jee = { exam: 'JEE_MAIN', kind: 'calendar', session: 1, date: '2027-01-22' } as const;
const iat = { exam: 'IAT', kind: 'custom', date: '2027-06-01' } as const;
const dsa = { exam: 'DSA_INTERVIEW', kind: 'none', date: null } as const;
const two: ExamProfiles = { profiles: [jee, iat], active: 'JEE_MAIN' };

describe('normalise / parse / serialise', () => {
  it('accepts valid maps and rejects unknown exams, kinds and bad dates', () => {
    expect(normaliseProfile(jee)).toEqual(jee);
    expect(normaliseProfile({ exam: 'XYZ', kind: 'custom', date: '2027-01-01' })).toBeNull();
    expect(normaliseProfile({ exam: 'IAT', kind: 'weird' })).toBeNull();
    expect(normaliseProfile(null)).toBeNull();
    expect(normaliseProfile({ exam: 'IAT', kind: 'custom', date: '1/1/27' })).toEqual({ exam: 'IAT', kind: 'custom', date: null });
  });
  it('a none profile never carries a date; a calendar profile defaults to session 1', () => {
    expect(normaliseProfile({ exam: 'SYS_DESIGN', kind: 'none', date: '2027-01-01' })).toEqual({ exam: 'SYS_DESIGN', kind: 'none', date: null });
    expect(normaliseProfile({ exam: 'JEE_MAIN', kind: 'calendar', date: '2027-01-22' })).toMatchObject({ session: 1 });
  });
  it('parseProfiles drops junk and duplicates and caps at 7', () => {
    expect(parseProfiles('nope')).toEqual([]);
    expect(parseProfiles([jee, jee, { bad: true }, iat])).toEqual([jee, iat]);
    const all = ['JEE_MAIN', 'NEET_UG', 'IAT', 'GATE_DA', 'DSA_INTERVIEW', 'SYS_DESIGN', 'ML_SYS_DESIGN'].map((e) => ({ exam: e, kind: 'none' }));
    expect(parseProfiles(all)).toHaveLength(MAX_PROFILES);
  });
  it('serialise gives plain maps with null dates and no undefined', () => {
    const s = serialiseProfiles([jee, iat, dsa]);
    expect(s).toEqual([
      { exam: 'JEE_MAIN', kind: 'calendar', session: 1, date: '2027-01-22' },
      { exam: 'IAT', kind: 'custom', date: '2027-06-01' },
      { exam: 'DSA_INTERVIEW', kind: 'none', date: null },
    ]);
    expect(JSON.stringify(s)).not.toContain('undefined');
  });
});

describe('profilesFromLegacy', () => {
  it('single exam: session > 0 is calendar, 0 is custom', () => {
    expect(profilesFromLegacy('JEE_MAIN.1', '2027-01-22')).toEqual([{ exam: 'JEE_MAIN', kind: 'calendar', session: 1, date: '2027-01-22' }]);
    expect(profilesFromLegacy('IAT.0', '2027-06-01')).toEqual([{ exam: 'IAT', kind: 'custom', date: '2027-06-01' }]);
  });
  it('packed pair: the first uses examDate, later ones carry @date', () => {
    expect(profilesFromLegacy('JEE_MAIN.2+NEET_UG.1@2027-05-03', '2027-04-04')).toEqual([
      { exam: 'JEE_MAIN', kind: 'calendar', session: 2, date: '2027-04-04' },
      { exam: 'NEET_UG', kind: 'calendar', session: 1, date: '2027-05-03' },
    ]);
  });
  it('bare id, missing date, unknown exam, empty', () => {
    expect(profilesFromLegacy('GATE_DA', null)).toEqual([{ exam: 'GATE_DA', kind: 'none', date: null }]);
    expect(profilesFromLegacy('NOPE.1', '2027-01-01')).toEqual([]);
    expect(profilesFromLegacy('', null)).toEqual([]);
    expect(profilesFromLegacy(undefined, undefined)).toEqual([]);
  });
  it('the same exam twice keeps the first', () => {
    expect(profilesFromLegacy('JEE_MAIN.1+JEE_MAIN.2@2027-04-04', '2027-01-22')).toHaveLength(1);
  });
});

describe('profilesOf', () => {
  it('derives from the legacy fields without profiles', () => {
    const s = profilesOf({ exam: 'JEE_MAIN.1', examDate: '2027-01-22' });
    expect(s.active).toBe('JEE_MAIN');
    expect(s.profiles).toHaveLength(1);
  });
  it('profiles win, and an unknown activeExam falls back to the first', () => {
    const s = profilesOf({ exam: 'JEE_MAIN.1', examDate: '2027-01-22', profiles: [iat, dsa], activeExam: 'ZZZ' });
    expect(s.profiles.map((p) => p.exam)).toEqual(['IAT', 'DSA_INTERVIEW']);
    expect(s.active).toBe('IAT');
    expect(profilesOf({ profiles: [iat, dsa], activeExam: 'DSA_INTERVIEW' }).active).toBe('DSA_INTERVIEW');
  });
  it('null / empty give no profiles and no active exam', () => {
    expect(profilesOf(null)).toEqual(emptyProfiles());
    expect(profilesOf({})).toEqual({ profiles: [], active: null });
  });
});

describe('operations', () => {
  it('withActive switches only to an existing profile', () => {
    expect(withActive(two, 'IAT').active).toBe('IAT');
    expect(withActive(two, 'NEET_UG')).toBe(two);
    expect(activeProfile(withActive(two, 'IAT'))).toEqual(iat);
  });
  it('addProfile appends, replaces the same exam, activates the first, respects the limit', () => {
    expect(addProfile(emptyProfiles(), dsa)).toEqual({ profiles: [dsa], active: 'DSA_INTERVIEW' });
    expect(addProfile(two, dsa).profiles).toHaveLength(3);
    expect(addProfile(two, dsa).active).toBe('JEE_MAIN');
    expect(addProfile(two, dsa, { activate: true }).active).toBe('DSA_INTERVIEW');
    expect(addProfile(two, { ...iat, date: '2027-07-01' }).profiles[1]!.date).toBe('2027-07-01');
    let full = emptyProfiles();
    for (const e of ['JEE_MAIN', 'NEET_UG', 'IAT', 'GATE_DA', 'DSA_INTERVIEW', 'SYS_DESIGN', 'ML_SYS_DESIGN']) full = addProfile(full, { exam: e, kind: 'none', date: null });
    expect(canAddProfile(full)).toBe(false);
    expect(addProfile(full, { exam: 'JEE_MAIN', kind: 'none', date: null }).profiles).toHaveLength(7);
  });
  it('removeProfile keeps at least one and moves the active exam when needed', () => {
    expect(removeProfile(two, 'IAT')).toEqual({ profiles: [jee], active: 'JEE_MAIN' });
    expect(removeProfile(two, 'JEE_MAIN')).toEqual({ profiles: [iat], active: 'IAT' });
    const one = removeProfile(two, 'IAT');
    expect(removeProfile(one, 'JEE_MAIN')).toBe(one);
    expect(removeProfile(two, 'NEET_UG')).toBe(two);
  });
  it('updateProfile changes the sitting, never the exam id', () => {
    const s = updateProfile(two, 'JEE_MAIN', { kind: 'custom', date: '2027-02-01' });
    expect(s.profiles[0]).toEqual({ exam: 'JEE_MAIN', kind: 'custom', date: '2027-02-01' });
    expect(updateProfile(two, 'NEET_UG', { date: '2027-01-01' })).toBe(two);
    expect(updateProfile(two, 'IAT', { kind: 'none' }).profiles[1]).toEqual({ exam: 'IAT', kind: 'none', date: null });
  });
  it('remainingExams lists the exams not chosen yet', () => {
    expect(remainingExams(two, ['JEE_MAIN', 'IAT', 'SYS_DESIGN'])).toEqual(['SYS_DESIGN']);
  });
});

describe('writing', () => {
  it('packedFor gives the legacy strings of one profile', () => {
    expect(packedFor(jee)).toEqual({ exam: 'JEE_MAIN.1', examDate: '2027-01-22' });
    expect(packedFor(iat)).toEqual({ exam: 'IAT.0', examDate: '2027-06-01' });
    expect(packedFor(dsa)).toEqual({ exam: 'DSA_INTERVIEW.0', examDate: null });
  });
  it('toProfileFields: profiles + activeExam + packed fields of the ACTIVE profile', () => {
    const f = toProfileFields({ profiles: [jee, iat, dsa], active: 'IAT' })!;
    expect(f.activeExam).toBe('IAT');
    expect(f.exam).toBe('IAT.0');
    expect(f.examDate).toBe('2027-06-01');
    expect(f.profiles).toHaveLength(3);
    expect(f.activeExam.length).toBeLessThanOrEqual(20);
    expect(f.exam.length).toBeLessThanOrEqual(40);
    expect(toProfileFields(emptyProfiles())).toBeNull();
  });
  it('daysWords', () => {
    expect(daysWords(jee, '2027-01-12')).toBe('10 days to go');
    expect(daysWords(jee, '2027-01-21')).toBe('1 day to go');
    expect(daysWords(jee, '2027-01-22')).toBe('Today');
    expect(daysWords(jee, '2027-02-01')).toBe('Date has passed');
    expect(daysWords(dsa, '2027-01-01')).toBe('No date yet');
  });
});
