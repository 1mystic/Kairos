import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;

const ALICE = 'alice';
const BOB = 'bob';
const EMAIL = 'alice@example.com';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-kairos',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext(ALICE, { email: EMAIL }).firestore();
const bob = () => env.authenticatedContext(BOB, { email: 'bob@example.com' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

const validProfile = (over: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  displayName: 'Alice',
  email: EMAIL,
  dob: '2007-04-12',
  isMinor: true,
  consent: { status: 'pending' },
  onboarded: false,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
  ...over,
});

async function seedProfile(uid = ALICE) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', uid), {
      schemaVersion: 1,
      displayName: 'Alice',
      email: EMAIL,
      dob: '2007-04-12',
      isMinor: true,
      consent: { status: 'pending' },
      onboarded: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  });
}

describe('users/{uid} create', () => {
  it('owner can create a valid profile', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE), validProfile()));
  });
  it('accepts consent not_required', async () => {
    await assertSucceeds(
      setDoc(
        doc(alice(), 'users', ALICE),
        validProfile({ isMinor: false, consent: { status: 'not_required' } }),
      ),
    );
  });
  it('rejects extra key', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), validProfile({ admin: true })));
  });
  it('rejects missing key', async () => {
    const p: Record<string, unknown> = validProfile();
    delete p.lang;
    delete p.dob;
    await assertFails(setDoc(doc(alice(), 'users', ALICE), p));
  });
  it('rejects bad dob', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), validProfile({ dob: '12/04/2007' })));
  });
  it("rejects consent 'granted'", async () => {
    await assertFails(
      setDoc(doc(alice(), 'users', ALICE), validProfile({ consent: { status: 'granted' } })),
    );
  });
  it('rejects extra consent key', async () => {
    await assertFails(
      setDoc(
        doc(alice(), 'users', ALICE),
        validProfile({ consent: { status: 'pending', by: 'x' } }),
      ),
    );
  });
  it('rejects wrong createdAt', async () => {
    await assertFails(
      setDoc(doc(alice(), 'users', ALICE), validProfile({ createdAt: new Date('2020-01-01') })),
    );
  });
  it('rejects email mismatch', async () => {
    await assertFails(
      setDoc(doc(alice(), 'users', ALICE), validProfile({ email: 'other@example.com' })),
    );
  });
  it('rejects onboarded true on create', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), validProfile({ onboarded: true })));
  });
  it('rejects empty and overlong displayName', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE), validProfile({ displayName: '' })));
    await assertFails(
      setDoc(doc(alice(), 'users', ALICE), validProfile({ displayName: 'x'.repeat(81) })),
    );
  });
  it("rejects writing another user's doc", async () => {
    await assertFails(setDoc(doc(bob(), 'users', ALICE), validProfile()));
  });
});

describe('users/{uid} read/update/delete', () => {
  it('owner reads, others cannot', async () => {
    await seedProfile();
    await assertSucceeds(getDoc(doc(alice(), 'users', ALICE)));
    await assertFails(getDoc(doc(bob(), 'users', ALICE)));
  });
  it('allowed fields update ok', async () => {
    await seedProfile();
    await assertSucceeds(
      updateDoc(doc(alice(), 'users', ALICE), {
        displayName: 'Alice B',
        onboarded: true,
        exam: 'JEE_MAIN',
        examDate: '2027-01-24',
        ambition: 'competitive',
        minutesPerWeekday: { mon: 60, tue: 60 },
        offDay: 6,
        chaptersDone: ['PHY.ROT.MOI'],
        lang: 'hi',
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it('null examDate and offDay ok', async () => {
    await seedProfile();
    await assertSucceeds(
      updateDoc(doc(alice(), 'users', ALICE), {
        examDate: null,
        offDay: null,
        updatedAt: serverTimestamp(),
      }),
    );
  });
  it.each([
    ['dob', { dob: '2000-01-01' }],
    ['isMinor', { isMinor: false }],
    ['consent', { consent: { status: 'not_required' } }],
    ['email', { email: 'x@y.z' }],
    ['createdAt', { createdAt: serverTimestamp() }],
    ['schemaVersion', { schemaVersion: 2 }],
  ])('rejects changing %s', async (_k, patch) => {
    await seedProfile();
    await assertFails(
      updateDoc(doc(alice(), 'users', ALICE), { ...patch, updatedAt: serverTimestamp() }),
    );
  });
  it('rejects stale updatedAt', async () => {
    await seedProfile();
    await assertFails(
      updateDoc(doc(alice(), 'users', ALICE), { displayName: 'Z', updatedAt: new Date('2020-01-01') }),
    );
  });
  it('rejects invalid values', async () => {
    await seedProfile();
    const ref = () => doc(alice(), 'users', ALICE);
    const t = serverTimestamp();
    await assertFails(updateDoc(ref(), { ambition: 'insane', updatedAt: t }));
    await assertFails(updateDoc(ref(), { lang: 'fr', updatedAt: t }));
    await assertFails(updateDoc(ref(), { offDay: 7, updatedAt: t }));
    await assertFails(updateDoc(ref(), { exam: 'x'.repeat(41), updatedAt: t }));
    await assertFails(updateDoc(ref(), { onboarded: 'yes', updatedAt: t }));
    await assertFails(
      updateDoc(ref(), { chaptersDone: Array.from({ length: 401 }, (_, i) => `c${i}`), updatedAt: t }),
    );
  });
  it("rejects updating another user's profile", async () => {
    await seedProfile();
    await assertFails(
      updateDoc(doc(bob(), 'users', ALICE), { displayName: 'Hax', updatedAt: serverTimestamp() }),
    );
  });
  it('rejects delete', async () => {
    await seedProfile();
    await assertFails(deleteDoc(doc(alice(), 'users', ALICE)));
  });
});

describe('unauthenticated', () => {
  it('is denied everywhere', async () => {
    await seedProfile();
    const db = anon();
    await assertFails(getDoc(doc(db, 'users', ALICE)));
    await assertFails(setDoc(doc(db, 'users', ALICE), validProfile()));
    await assertFails(getDoc(doc(db, 'users', ALICE, 'state', 'mastery')));
    await assertFails(setDoc(doc(db, 'users', ALICE, 'sessions', 's1'), { events: [] }));
    await assertFails(getDoc(doc(db, 'exam_calendar', 'x')));
    await assertFails(getDoc(doc(db, 'papers', 'x')));
    await assertFails(getDoc(doc(db, 'leaderboards', 'p', 'shards', '0')));
    await assertFails(setDoc(doc(db, 'uploads', 'u1'), { ownerUid: ALICE, status: 'pending' }));
    await assertFails(getDoc(doc(db, 'random', 'x')));
  });
});

describe('users/{uid} subcollections', () => {
  const paths: [string, string, string][] = [
    ['users', 'state', 'mastery'],
    ['users', 'state', 'pace'],
    ['users', 'pace_log', '2026-11-08'],
    ['users', 'sessions', 's1'],
    ['users', 'plans', '2026-11-08'],
    ['users', 'mocks', 'm1'],
    ['users', 'bank', 'q1'],
  ];
  it.each(paths)('%s/%s/%s owner-only', async (_u, sub, id) => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, sub, id), { x: 1 }));
    await assertSucceeds(getDoc(doc(alice(), 'users', ALICE, sub, id)));
    await assertFails(getDoc(doc(bob(), 'users', ALICE, sub, id)));
    await assertFails(setDoc(doc(bob(), 'users', ALICE, sub, id), { x: 2 }));
  });
  it('rejects unknown state doc', async () => {
    await assertFails(setDoc(doc(alice(), 'users', ALICE, 'state', 'other'), { x: 1 }));
  });
  it('caps session events at 2000', async () => {
    const ev = (n: number) => Array.from({ length: n }, (_, i) => ({ t: i }));
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, 'sessions', 's1'), { events: ev(2000) }));
    await assertFails(setDoc(doc(alice(), 'users', ALICE, 'sessions', 's2'), { events: ev(2001) }));
  });
});

describe('mocks', () => {
  it("blocks gradedBy 'server' from client", async () => {
    const ref = doc(alice(), 'users', ALICE, 'mocks', 'm1');
    await assertFails(setDoc(ref, { paperId: 'p', gradedBy: 'server', score: 300 }));
    await assertSucceeds(setDoc(ref, { paperId: 'p', score: 100 }));
    await assertFails(updateDoc(ref, { gradedBy: 'server' }));
  });
  it('server-graded mock cannot be modified by client', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'users', ALICE, 'mocks', 'm2'), {
        paperId: 'p',
        gradedBy: 'server',
        score: 200,
      });
    });
    await assertFails(updateDoc(doc(alice(), 'users', ALICE, 'mocks', 'm2'), { score: 999 }));
  });
});

describe('shared collections', () => {
  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, 'exam_calendar', 'jee-2027-s1'), { exam: 'JEE' });
      await setDoc(doc(db, 'papers', 'p1'), { title: 'Mock 1' });
      await setDoc(doc(db, 'leaderboards', 'p1', 'shards', '0'), { h: [0] });
    });
  });
  it('exam_calendar/papers/leaderboards readable when signed in, never writable', async () => {
    for (const p of [
      ['exam_calendar', 'jee-2027-s1'],
      ['papers', 'p1'],
      ['leaderboards', 'p1', 'shards', '0'],
    ] as [string, ...string[]][]) {
      await assertSucceeds(getDoc(doc(alice(), ...p)));
      await assertFails(getDoc(doc(anon(), ...p)));
      await assertFails(setDoc(doc(alice(), ...p), { hax: 1 }));
      await assertFails(deleteDoc(doc(alice(), ...p)));
    }
  });
  it('new exam_calendar docs cannot be created by clients', async () => {
    await assertFails(setDoc(doc(alice(), 'exam_calendar', 'new'), { exam: 'X' }));
  });
});

describe('uploads', () => {
  const up = (over: Record<string, unknown> = {}) => ({
    ownerUid: ALICE,
    status: 'pending',
    payload: { q: 'text' },
    ...over,
  });
  it('owner can create pending upload and read it', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'uploads', 'u1'), up()));
    await assertSucceeds(getDoc(doc(alice(), 'uploads', 'u1')));
    await assertFails(getDoc(doc(bob(), 'uploads', 'u1')));
  });
  it('rejects wrong ownerUid', async () => {
    await assertFails(setDoc(doc(alice(), 'uploads', 'u1'), up({ ownerUid: BOB })));
  });
  it('rejects non-pending status', async () => {
    await assertFails(setDoc(doc(alice(), 'uploads', 'u1'), up({ status: 'approved' })));
  });
  it('rejects oversized payload', async () => {
    await assertFails(
      setDoc(doc(alice(), 'uploads', 'u1'), up({ payload: 'x'.repeat(20001) })),
    );
  });
  it('rejects update and delete', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'uploads', 'u1'), up()));
    await assertFails(updateDoc(doc(alice(), 'uploads', 'u1'), { status: 'approved' }));
    await assertFails(deleteDoc(doc(alice(), 'uploads', 'u1')));
  });
});
