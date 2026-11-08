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
      updateDoc(doc(alice(), 'users', ALICE), {
        displayName: 'Z',
        updatedAt: new Date('2020-01-01'),
      }),
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
      updateDoc(ref(), {
        chaptersDone: Array.from({ length: 401 }, (_, i) => `c${i}`),
        updatedAt: t,
      }),
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
    ['users', 'bank', 'u_0123456789ab'],
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
    await assertSucceeds(
      setDoc(doc(alice(), 'users', ALICE, 'sessions', 's1'), { events: ev(2000) }),
    );
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
    await assertFails(setDoc(doc(alice(), 'uploads', 'u1'), up({ payload: 'x'.repeat(20001) })));
  });
  it('rejects update and delete', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'uploads', 'u1'), up()));
    await assertFails(updateDoc(doc(alice(), 'uploads', 'u1'), { status: 'approved' }));
    await assertFails(deleteDoc(doc(alice(), 'uploads', 'u1')));
  });
});

describe('users/{uid}/bank', () => {
  const bankDoc = (c: ReturnType<typeof alice>, id: string) => doc(c, 'users', ALICE, 'bank', id);
  const QID = 'u_0123456789ab';
  it('accepts valid ids and statuses', async () => {
    await assertSucceeds(setDoc(bankDoc(alice(), QID), { stem: 'x', status: 'user_ok' }));
    await assertSucceeds(setDoc(bankDoc(alice(), 'u_ffffffffffff'), { status: 'needs_answer' }));
    await assertSucceeds(setDoc(bankDoc(alice(), 'u_000000000000'), { stem: 'no status' }));
  });
  it('rejects bad id patterns', async () => {
    for (const id of ['q1', 'u_0123456789a', 'u_0123456789abc', 'u_0123456789AB', 'x_0123456789ab'])
      await assertFails(setDoc(bankDoc(alice(), id), { stem: 'x' }));
  });
  it('rejects bad status', async () => {
    await assertFails(setDoc(bankDoc(alice(), QID), { status: 'verified' }));
  });
  it('caps large fields so docs stay under 50KB', async () => {
    await assertSucceeds(setDoc(bankDoc(alice(), QID), { stem: 'a'.repeat(12000) }));
    await assertFails(setDoc(bankDoc(alice(), 'u_ffffffffffff'), { stem: 'a'.repeat(12001) }));
  });
  it('owner can update and delete, others cannot read or write', async () => {
    await assertSucceeds(setDoc(bankDoc(alice(), QID), { status: 'needs_answer' }));
    await assertSucceeds(updateDoc(bankDoc(alice(), QID), { status: 'user_ok' }));
    await assertFails(updateDoc(bankDoc(alice(), QID), { status: 'bogus' }));
    await assertFails(getDoc(bankDoc(bob(), QID)));
    await assertFails(deleteDoc(bankDoc(bob(), QID)));
    await assertSucceeds(deleteDoc(bankDoc(alice(), QID)));
  });
});

describe('users/{uid}/media', () => {
  const ID = '0123456789abcdef';
  const mdoc = (c: ReturnType<typeof alice>, id = ID, uid = ALICE) =>
    doc(c, 'users', uid, 'media', id);
  const img = (over: Record<string, unknown> = {}) => ({
    b64: 'AAAA',
    w: 960,
    h: 540,
    mime: 'image/webp',
    createdAt: serverTimestamp(),
    ...over,
  });
  it('owner creates a valid image and reads it', async () => {
    await assertSucceeds(setDoc(mdoc(alice()), img()));
    await assertSucceeds(getDoc(mdoc(alice())));
    await assertFails(getDoc(mdoc(bob())));
  });
  it('accepts b64 of exactly 120000 chars, rejects 120001', async () => {
    await assertSucceeds(setDoc(mdoc(alice()), img({ b64: 'a'.repeat(120000) })));
    await assertFails(setDoc(mdoc(alice(), 'fedcba9876543210'), img({ b64: 'a'.repeat(120001) })));
  });
  it('rejects bad ids', async () => {
    for (const id of ['abc', '0123456789ABCDEF', '0123456789abcde', '0123456789abcdef0'])
      await assertFails(setDoc(mdoc(alice(), id), img()));
  });
  it('rejects wrong mime, dims, createdAt, types and extra/missing fields', async () => {
    await assertFails(setDoc(mdoc(alice()), img({ mime: 'image/png' })));
    await assertFails(setDoc(mdoc(alice()), img({ w: 0 })));
    await assertFails(setDoc(mdoc(alice()), img({ w: 4001 })));
    await assertFails(setDoc(mdoc(alice()), img({ h: 0 })));
    await assertFails(setDoc(mdoc(alice()), img({ h: 4001 })));
    await assertFails(setDoc(mdoc(alice()), img({ w: 10.5 })));
    await assertFails(setDoc(mdoc(alice()), img({ b64: 5 })));
    await assertFails(setDoc(mdoc(alice()), img({ createdAt: new Date(0) })));
    await assertFails(setDoc(mdoc(alice()), img({ extra: 1 })));
    const m: Record<string, unknown> = img();
    delete m.h;
    await assertFails(setDoc(mdoc(alice()), m));
  });
  it("rejects writing into another user's media", async () => {
    await assertFails(setDoc(mdoc(bob(), ID, ALICE), img()));
  });
  it('update is denied, delete is allowed for owner only', async () => {
    await assertSucceeds(setDoc(mdoc(alice()), img()));
    await assertFails(updateDoc(mdoc(alice()), { w: 100 }));
    await assertFails(setDoc(mdoc(alice()), img({ b64: 'BBBB' })));
    await assertFails(deleteDoc(mdoc(bob())));
    await assertSucceeds(deleteDoc(mdoc(alice())));
  });
});
