import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

/** Exam profiles (`profiles`, `activeExam`) on users/{uid}: update allow-list only, never at create. */
let env: RulesTestEnvironment;
const ALICE = 'alice';
const EMAIL = 'alice@example.com';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-kairos-profiles',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', ALICE), {
      schemaVersion: 1, displayName: 'Alice', email: EMAIL, dob: '2007-04-12', isMinor: true,
      consent: { status: 'pending' }, onboarded: true, exam: 'JEE_MAIN.1', examDate: '2027-01-22', createdAt: new Date(), updatedAt: new Date(),
    });
  });
});

const alice = () => env.authenticatedContext(ALICE, { email: EMAIL }).firestore();
const ref = () => doc(alice(), 'users', ALICE);
const t = () => serverTimestamp();
const prof = (exam: string, over: Record<string, unknown> = {}) => ({ exam, kind: 'calendar', session: 1, date: '2027-01-22', ...over });

describe('users/{uid} exam profiles', () => {
  it('accepts profiles + activeExam together with the packed legacy fields (one write)', async () => {
    await assertSucceeds(
      updateDoc(ref(), {
        profiles: [prof('JEE_MAIN'), { exam: 'DSA_INTERVIEW', kind: 'none', date: null }],
        activeExam: 'DSA_INTERVIEW',
        exam: 'DSA_INTERVIEW.0',
        examDate: null,
        updatedAt: t(),
      }),
    );
  });
  it('accepts exactly 7 profiles and rejects 8', async () => {
    const ids = ['JEE_MAIN', 'NEET_UG', 'IAT', 'GATE_DA', 'DSA_INTERVIEW', 'SYS_DESIGN', 'ML_SYS_DESIGN'];
    await assertSucceeds(updateDoc(ref(), { profiles: ids.map((e) => prof(e)), updatedAt: t() }));
    await assertFails(updateDoc(ref(), { profiles: [...ids, 'EXTRA'].map((e) => prof(e)), updatedAt: t() }));
  });
  it('accepts an empty profiles list', async () => {
    await assertSucceeds(updateDoc(ref(), { profiles: [], updatedAt: t() }));
  });
  it('rejects profiles that are not a list', async () => {
    await assertFails(updateDoc(ref(), { profiles: 'JEE_MAIN', updatedAt: t() }));
    await assertFails(updateDoc(ref(), { profiles: { exam: 'JEE_MAIN' }, updatedAt: t() }));
    await assertFails(updateDoc(ref(), { profiles: null, updatedAt: t() }));
  });
  it('activeExam must be a string of at most 20 characters', async () => {
    await assertSucceeds(updateDoc(ref(), { activeExam: 'ML_SYS_DESIGN', updatedAt: t() }));
    await assertSucceeds(updateDoc(ref(), { activeExam: 'x'.repeat(20), updatedAt: t() }));
    await assertFails(updateDoc(ref(), { activeExam: 'x'.repeat(21), updatedAt: t() }));
    await assertFails(updateDoc(ref(), { activeExam: 5, updatedAt: t() }));
    await assertFails(updateDoc(ref(), { activeExam: null, updatedAt: t() }));
  });
  it('still requires updatedAt == request.time', async () => {
    await assertFails(updateDoc(ref(), { activeExam: 'JEE_MAIN', updatedAt: new Date('2020-01-01') }));
  });
  it('still rejects fields outside the allow-list next to profiles', async () => {
    await assertFails(updateDoc(ref(), { profiles: [prof('JEE_MAIN')], isMinor: false, updatedAt: t() }));
    await assertFails(updateDoc(ref(), { activeExam: 'JEE_MAIN', admin: true, updatedAt: t() }));
  });
  it('cannot be written at create time', async () => {
    const base = {
      schemaVersion: 1, displayName: 'Bob', email: 'bob@example.com', dob: '2007-04-12', isMinor: true,
      consent: { status: 'pending' }, onboarded: false, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    const bob = env.authenticatedContext('bob', { email: 'bob@example.com' }).firestore();
    await assertFails(setDoc(doc(bob, 'users', 'bob'), { ...base, profiles: [prof('JEE_MAIN')] }));
    await assertFails(setDoc(doc(bob, 'users', 'bob'), { ...base, activeExam: 'JEE_MAIN' }));
    await assertSucceeds(setDoc(doc(bob, 'users', 'bob'), base));
  });
  it('other users cannot write them', async () => {
    const bob = env.authenticatedContext('bob', { email: 'bob@example.com' }).firestore();
    await assertFails(updateDoc(doc(bob, 'users', ALICE), { activeExam: 'JEE_MAIN', updatedAt: t() }));
  });
  it('plan docs keyed by exam are accepted (plans/{id} takes any id)', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, 'plans', 'DSA_INTERVIEW~2027-01-05'), { date: '2027-01-05', tasks: [] }));
  });
});
