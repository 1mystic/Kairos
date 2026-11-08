// Admin / config / stats rules. Uses its own projectId so clearFirestore() in this file
// cannot race with rules.test.ts when vitest runs files in parallel.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

const ALICE = 'alice';
const BOB = 'bob';
const ADMIN = 'root';
const DAY = '2026-11-08';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-kairos-admin',
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
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'admins', ADMIN), { role: 'admin' });
  });
});

const alice = () => env.authenticatedContext(ALICE, { email: 'alice@example.com' }).firestore();
const bob = () => env.authenticatedContext(BOB, { email: 'bob@example.com' }).firestore();
const admin = () => env.authenticatedContext(ADMIN, { email: 'root@example.com' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

async function seed(path: string[], data: Record<string, unknown>) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const [a, b, ...rest] = path;
    await setDoc(doc(ctx.firestore(), a!, b!, ...rest), data);
  });
}

describe('admins/{uid}', () => {
  it('user can get only their own admin doc', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'admins', ADMIN)));
    await assertSucceeds(getDoc(doc(alice(), 'admins', ALICE))); // missing doc: allowed, not found
    await assertFails(getDoc(doc(alice(), 'admins', ADMIN)));
    await assertFails(getDoc(doc(admin(), 'admins', ALICE)));
    await assertFails(getDoc(doc(anon(), 'admins', ADMIN)));
  });
  it('list is denied, even for admins', async () => {
    await assertFails(getDocs(collection(admin(), 'admins')));
    await assertFails(getDocs(collection(alice(), 'admins')));
  });
  it('no client can create, update or delete admin docs', async () => {
    await assertFails(setDoc(doc(alice(), 'admins', ALICE), { role: 'admin' }));
    await assertFails(setDoc(doc(admin(), 'admins', ALICE), { role: 'admin' }));
    await assertFails(setDoc(doc(admin(), 'admins', BOB), { role: 'admin' }));
    await assertFails(updateDoc(doc(admin(), 'admins', ADMIN), { role: 'x' }));
    await assertFails(deleteDoc(doc(admin(), 'admins', ADMIN)));
    await assertFails(setDoc(doc(anon(), 'admins', ALICE), { role: 'admin' }));
  });
  it('self-promotion does not grant admin powers', async () => {
    await assertFails(setDoc(doc(alice(), 'admins', ALICE), { role: 'admin' }));
    await assertFails(getDoc(doc(alice(), 'stats', DAY)));
  });
});

const calendar = (over: Record<string, unknown> = {}) => ({
  v: 1,
  entries: [
    {
      id: 'jee-main-2027-s1',
      exam: 'JEE_MAIN',
      session: 1,
      date: '2027-01-24',
      window: null,
      status: 'expected',
      source: null,
      last_checked: null,
    },
  ],
  updatedAt: serverTimestamp(),
  updatedBy: ADMIN,
  ...over,
});
const announcement = (over: Record<string, unknown> = {}) => ({
  active: true,
  title: 'Hello',
  body: 'Body text',
  link: null,
  tone: 'info',
  expiresAt: null,
  updatedAt: serverTimestamp(),
  updatedBy: ADMIN,
  ...over,
});
const roadmap = (over: Record<string, unknown> = {}) => ({
  v: 1,
  taperDays: 3,
  sprintDays: 14,
  workDaysPerBuffer: 7,
  mockMinCapacityMin: 120,
  phases: { build: 100, strengthen: 60, taper: 3 },
  updatedAt: serverTimestamp(),
  updatedBy: ADMIN,
  ...over,
});

const cfg = (id: string) => doc(admin(), 'config', id);

describe('config: access', () => {
  it('anyone, including unauthenticated, can get the three docs', async () => {
    for (const id of ['exam_calendar', 'announcement', 'roadmap_defaults']) {
      await assertSucceeds(getDoc(doc(anon(), 'config', id)));
      await assertSucceeds(getDoc(doc(alice(), 'config', id)));
    }
  });
  it('other doc ids and list are denied', async () => {
    await seed(['config', 'other'], { x: 1 });
    await assertFails(getDoc(doc(anon(), 'config', 'other')));
    await assertFails(getDoc(doc(admin(), 'config', 'other')));
    await assertFails(getDocs(collection(anon(), 'config')));
    await assertFails(getDocs(collection(admin(), 'config')));
    await assertFails(setDoc(doc(admin(), 'config', 'other'), { x: 1 }));
  });
  it('admin can write all three', async () => {
    await assertSucceeds(setDoc(cfg('exam_calendar'), calendar()));
    await assertSucceeds(setDoc(cfg('announcement'), announcement()));
    await assertSucceeds(setDoc(cfg('roadmap_defaults'), roadmap()));
  });
  it('admin can update an existing doc', async () => {
    await assertSucceeds(setDoc(cfg('announcement'), announcement()));
    await assertSucceeds(setDoc(cfg('announcement'), announcement({ title: 'New' })));
  });
  it('non-admins and anonymous cannot write', async () => {
    await assertFails(setDoc(doc(alice(), 'config', 'announcement'), announcement({ updatedBy: ALICE })));
    await assertFails(setDoc(doc(anon(), 'config', 'announcement'), announcement()));
    await seed(['config', 'announcement'], { x: 1 });
    await assertFails(
      setDoc(doc(alice(), 'config', 'announcement'), announcement({ updatedBy: ALICE })),
    );
  });
  it('delete is denied even for admins', async () => {
    await seed(['config', 'announcement'], { x: 1 });
    await assertFails(deleteDoc(cfg('announcement')));
  });
  it('rejects wrong updatedBy and stale updatedAt', async () => {
    await assertFails(setDoc(cfg('announcement'), announcement({ updatedBy: ALICE })));
    await assertFails(setDoc(cfg('announcement'), announcement({ updatedAt: new Date('2020-01-01') })));
    await assertFails(setDoc(cfg('exam_calendar'), calendar({ updatedBy: 'x' })));
    await assertFails(setDoc(cfg('roadmap_defaults'), roadmap({ updatedAt: new Date() })));
  });
});

describe('config/exam_calendar validation', () => {
  it.each([
    ['extra key', { extra: 1 }],
    ['wrong v', { v: 2 }],
    ['entries not a list', { entries: 'x' }],
    ['entries too many', { entries: Array.from({ length: 41 }, (_, i) => ({ id: `e${i}` })) }],
  ])('rejects %s', async (_n, over) => {
    await assertFails(setDoc(cfg('exam_calendar'), calendar(over)));
  });
  it('accepts 40 entries and empty list', async () => {
    await assertSucceeds(
      setDoc(cfg('exam_calendar'), calendar({ entries: Array.from({ length: 40 }, (_, i) => ({ id: `e${i}` })) })),
    );
    await assertSucceeds(setDoc(cfg('exam_calendar'), calendar({ entries: [] })));
  });
  it('rejects missing key', async () => {
    const d: Record<string, unknown> = calendar();
    delete d.entries;
    await assertFails(setDoc(cfg('exam_calendar'), d));
  });
});

describe('config/announcement validation', () => {
  it('accepts link, expiresAt and important tone', async () => {
    await assertSucceeds(
      setDoc(
        cfg('announcement'),
        announcement({ link: 'https://example.com', tone: 'important', expiresAt: new Date('2027-01-01') }),
      ),
    );
  });
  it.each([
    ['extra key', { extra: 1 }],
    ['active wrong type', { active: 'yes' }],
    ['title wrong type', { title: 5 }],
    ['title oversize', { title: 'x'.repeat(81) }],
    ['body oversize', { body: 'x'.repeat(401) }],
    ['link oversize', { link: 'x'.repeat(301) }],
    ['link wrong type', { link: 5 }],
    ['bad tone', { tone: 'loud' }],
    ['expiresAt wrong type', { expiresAt: '2027-01-01' }],
  ])('rejects %s', async (_n, over) => {
    await assertFails(setDoc(cfg('announcement'), announcement(over)));
  });
  it('accepts max-length title and body', async () => {
    await assertSucceeds(
      setDoc(cfg('announcement'), announcement({ title: 'x'.repeat(80), body: 'y'.repeat(400) })),
    );
  });
});

describe('config/roadmap_defaults validation', () => {
  it('accepts empty phases and full phases', async () => {
    await assertSucceeds(setDoc(cfg('roadmap_defaults'), roadmap({ phases: {} })));
    await assertSucceeds(
      setDoc(
        cfg('roadmap_defaults'),
        roadmap({ phases: { build: 0, strengthen: 1, consolidate: 2, exam_mode: 3, final_sprint: 4, taper: 400 } }),
      ),
    );
  });
  it.each([
    ['extra key', { extra: 1 }],
    ['wrong v', { v: 2 }],
    ['taperDays high', { taperDays: 8 }],
    ['taperDays negative', { taperDays: -1 }],
    ['taperDays float', { taperDays: 1.5 }],
    ['sprintDays low', { sprintDays: 4 }],
    ['sprintDays high', { sprintDays: 31 }],
    ['workDaysPerBuffer low', { workDaysPerBuffer: 2 }],
    ['workDaysPerBuffer high', { workDaysPerBuffer: 15 }],
    ['mockMinCapacityMin low', { mockMinCapacityMin: 59 }],
    ['mockMinCapacityMin high', { mockMinCapacityMin: 301 }],
    ['phases not a map', { phases: [1] }],
    ['phases unknown key', { phases: { warmup: 1 } }],
    ['phases value too big', { phases: { build: 401 } }],
    ['phases wrong type', { phases: { build: '5' } }],
    ['phases negative', { phases: { taper: -1 } }],
    ['taperDays string', { taperDays: '3' }],
  ])('rejects %s', async (_n, over) => {
    await assertFails(setDoc(cfg('roadmap_defaults'), roadmap(over)));
  });
});

const stat = (over: Record<string, unknown> = {}) => ({ updatedAt: serverTimestamp(), ...over });
const statRef = (db: ReturnType<typeof alice>, day = DAY) => doc(db, 'stats', day);
const markerRef = (db: ReturnType<typeof alice>, uid: string, day = DAY) =>
  doc(db, 'stats', day, 'seen', uid);

async function seedStats(data: Record<string, unknown>, day = DAY) {
  await seed(['stats', day], { updatedAt: new Date(), ...data });
}

describe('stats create', () => {
  it('signed-in user can create with valid counters', async () => {
    await assertSucceeds(
      setDoc(statRef(alice()), stat({ sessions: 1, questions: 30, correct: 20, sessions_JEE_MAIN: 1 })),
    );
  });
  it('accepts increment() via merge on a missing doc', async () => {
    await assertSucceeds(
      setDoc(statRef(alice()), stat({ signups: increment(1), questions: increment(10) }), { merge: true }),
    );
  });
  it('rejects unauthenticated create', async () => {
    await assertFails(setDoc(statRef(anon()), stat({ sessions: 1 })));
  });
  it.each([
    ['unknown field', { sessions: 1, uid: 'alice' }],
    ['questions above cap', { questions: 501 }],
    ['correct above cap', { correct: 501 }],
    ['sessions above cap', { sessions: 51 }],
    ['negative', { sessions: -1 }],
    ['float', { sessions: 1.5 }],
    ['string', { sessions: '1' }],
    ['correct > questions', { questions: 5, correct: 6 }],
    ['active above 1', { active: 2 }],
  ])('rejects %s', async (_n, over) => {
    await assertFails(setDoc(statRef(alice()), stat(over)));
  });
  it('rejects wrong updatedAt', async () => {
    await assertFails(setDoc(statRef(alice()), { sessions: 1, updatedAt: new Date('2020-01-01') }));
    await assertFails(setDoc(statRef(alice()), { sessions: 1 }));
  });
  it('rejects bad day ids', async () => {
    await assertFails(setDoc(statRef(alice(), 'today'), stat({ sessions: 1 })));
    await assertFails(setDoc(statRef(alice(), '2026-1-8'), stat({ sessions: 1 })));
  });
});

describe('stats update', () => {
  it('valid increments pass', async () => {
    await seedStats({ sessions: 2, questions: 40, correct: 25 });
    await assertSucceeds(
      updateDoc(statRef(alice()), {
        sessions: 3,
        questions: 60,
        correct: 40,
        updatedAt: serverTimestamp(),
      }),
    );
    await assertSucceeds(
      updateDoc(statRef(bob()), { sessions: increment(1), mocks: increment(1), updatedAt: serverTimestamp() }),
    );
  });
  it('adding a new counter to an existing doc passes', async () => {
    await seedStats({ sessions: 2 });
    await assertSucceeds(updateDoc(statRef(alice()), { mocks: 1, updatedAt: serverTimestamp() }));
  });
  it('decrement and no-op are denied', async () => {
    await seedStats({ sessions: 5, questions: 100, correct: 50 });
    await assertFails(updateDoc(statRef(alice()), { sessions: 4, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(statRef(alice()), { sessions: increment(-1), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(statRef(alice()), { sessions: 0, updatedAt: serverTimestamp() }));
  });
  it('delta above cap is denied, at cap passes', async () => {
    await seedStats({ sessions: 5, questions: 100, correct: 50 });
    await assertFails(updateDoc(statRef(alice()), { sessions: 56, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(statRef(alice()), { questions: 601, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(statRef(alice()), { sessions: 55, questions: 600, updatedAt: serverTimestamp() }));
  });
  it('unknown field denied', async () => {
    await seedStats({ sessions: 5 });
    await assertFails(updateDoc(statRef(alice()), { sessions: 6, uid: 'alice', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(statRef(alice()), { hacked: 1, updatedAt: serverTimestamp() }));
  });
  it('correct > questions after the write is denied', async () => {
    await seedStats({ questions: 10, correct: 10 });
    await assertFails(updateDoc(statRef(alice()), { correct: 15, updatedAt: serverTimestamp() }));
    await assertSucceeds(
      updateDoc(statRef(alice()), { questions: 20, correct: 15, updatedAt: serverTimestamp() }),
    );
  });
  it('stale updatedAt denied', async () => {
    await seedStats({ sessions: 1 });
    await assertFails(updateDoc(statRef(alice()), { sessions: 2, updatedAt: new Date('2020-01-01') }));
  });
  it('unauthenticated update denied; delete denied for all', async () => {
    await seedStats({ sessions: 1 });
    await assertFails(updateDoc(statRef(anon()), { sessions: 2, updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(statRef(alice())));
    await assertFails(deleteDoc(statRef(admin())));
  });
});

describe('stats read', () => {
  it('admin reads, others cannot', async () => {
    await seedStats({ sessions: 1 });
    await assertSucceeds(getDoc(statRef(admin())));
    await assertSucceeds(getDocs(collection(admin(), 'stats')));
    await assertFails(getDoc(statRef(alice())));
    await assertFails(getDocs(collection(alice(), 'stats')));
    await assertFails(getDoc(statRef(anon())));
  });
});

describe('stats/{day}/seen dedupe', () => {
  const activeBatch = (db: ReturnType<typeof alice>, uid: string, markerUid = uid) => {
    const b = writeBatch(db);
    b.set(statRef(db), stat({ active: increment(1) }), { merge: true });
    b.set(markerRef(db, markerUid), { at: serverTimestamp() });
    return b.commit();
  };

  it('first active batch passes on a missing stats doc', async () => {
    await assertSucceeds(activeBatch(alice(), ALICE));
  });
  it('first active batch passes on an existing stats doc', async () => {
    await seedStats({ sessions: 3, active: 4 });
    await assertSucceeds(activeBatch(alice(), ALICE));
  });
  it('second increment by the same user the same day fails', async () => {
    await assertSucceeds(activeBatch(alice(), ALICE));
    await assertFails(activeBatch(alice(), ALICE));
    await assertFails(updateDoc(statRef(alice()), { active: increment(1), updatedAt: serverTimestamp() }));
  });
  it('different users can each increment once', async () => {
    await assertSucceeds(activeBatch(alice(), ALICE));
    await assertSucceeds(activeBatch(bob(), BOB));
  });
  it('same user can increment on another day', async () => {
    await assertSucceeds(activeBatch(alice(), ALICE));
    const b = writeBatch(alice());
    b.set(statRef(alice(), '2026-11-09'), stat({ active: increment(1) }), { merge: true });
    b.set(markerRef(alice(), ALICE, '2026-11-09'), { at: serverTimestamp() });
    await assertSucceeds(b.commit());
  });
  it('marker without increment is fine', async () => {
    await assertSucceeds(setDoc(markerRef(alice(), ALICE), { at: serverTimestamp() }));
  });
  it('increment without marker denied (create and update)', async () => {
    await assertFails(setDoc(statRef(alice()), stat({ active: 1 })));
    await seedStats({ active: 1 });
    await assertFails(updateDoc(statRef(alice()), { active: 2, updatedAt: serverTimestamp() }));
  });
  it("another uid's marker denied", async () => {
    await assertFails(setDoc(markerRef(alice(), BOB), { at: serverTimestamp() }));
    await assertFails(activeBatch(alice(), ALICE, BOB));
  });
  it('active delta above 1 denied even with marker', async () => {
    await seedStats({ active: 1 });
    const b = writeBatch(alice());
    b.update(statRef(alice()), { active: 3, updatedAt: serverTimestamp() });
    b.set(markerRef(alice(), ALICE), { at: serverTimestamp() });
    await assertFails(b.commit());
  });
  it('marker shape: extra field, stale at, unauthenticated denied', async () => {
    await assertFails(setDoc(markerRef(alice(), ALICE), { at: serverTimestamp(), uid: ALICE }));
    await assertFails(setDoc(markerRef(alice(), ALICE), { at: new Date('2020-01-01') }));
    await assertFails(setDoc(markerRef(anon(), ALICE), { at: serverTimestamp() }));
  });
  it('marker is immutable and undeletable', async () => {
    await assertSucceeds(setDoc(markerRef(alice(), ALICE), { at: serverTimestamp() }));
    await assertFails(updateDoc(markerRef(alice(), ALICE), { at: serverTimestamp() }));
    await assertFails(deleteDoc(markerRef(alice(), ALICE)));
    await assertFails(deleteDoc(markerRef(admin(), ALICE)));
  });
  it('markers: admin reads, owner gets own, others denied', async () => {
    await assertSucceeds(setDoc(markerRef(alice(), ALICE), { at: serverTimestamp() }));
    await assertSucceeds(getDoc(markerRef(admin(), ALICE)));
    await assertSucceeds(getDoc(markerRef(alice(), ALICE)));
    await assertFails(getDoc(markerRef(bob(), ALICE)));
    await assertFails(getDocs(collection(alice(), 'stats', DAY, 'seen')));
    await assertSucceeds(getDocs(collection(admin(), 'stats', DAY, 'seen')));
  });
});

describe('admin vs user data', () => {
  const profile = {
    schemaVersion: 1,
    displayName: 'Alice',
    email: 'alice@example.com',
    dob: '2007-04-12',
    isMinor: true,
    consent: { status: 'pending' },
    onboarded: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  beforeEach(async () => {
    await seed(['users', ALICE], profile);
    await seed(['users', BOB], { ...profile, displayName: 'Bob' });
    const subs: [string, string][] = [
      ['sessions', 's1'],
      ['mocks', 'm1'],
      ['plans', '2026-11-08'],
      ['pace_log', '2026-11-08'],
      ['bank', 'u_0123456789ab'],
      ['media', '0123456789abcdef'],
      ['state', 'mastery'],
      ['state', 'pace'],
      ['state', 'roadmap'],
    ];
    for (const [sub, id] of subs) await seed(['users', ALICE, sub, id], { x: 1 });
  });

  it('admin can get and list profiles', async () => {
    await assertSucceeds(getDoc(doc(admin(), 'users', ALICE)));
    await assertSucceeds(getDoc(doc(admin(), 'users', BOB)));
    await assertSucceeds(getDocs(collection(admin(), 'users')));
  });
  it('non-admin cannot list or get other profiles', async () => {
    await assertFails(getDocs(collection(alice(), 'users')));
    await assertFails(getDoc(doc(alice(), 'users', BOB)));
  });
  it.each([
    ['sessions', 's1'],
    ['mocks', 'm1'],
    ['plans', '2026-11-08'],
    ['pace_log', '2026-11-08'],
    ['bank', 'u_0123456789ab'],
    ['media', '0123456789abcdef'],
    ['state', 'mastery'],
    ['state', 'pace'],
    ['state', 'roadmap'],
  ])('admin cannot read users/alice/%s/%s', async (sub, id) => {
    await assertFails(getDoc(doc(admin(), 'users', ALICE, sub, id)));
    await assertFails(getDocs(collection(admin(), 'users', ALICE, sub)));
    await assertSucceeds(getDoc(doc(alice(), 'users', ALICE, sub, id)));
  });
  it('admin cannot write any user data', async () => {
    await assertFails(
      updateDoc(doc(admin(), 'users', ALICE), { displayName: 'Hax', updatedAt: serverTimestamp() }),
    );
    await assertFails(deleteDoc(doc(admin(), 'users', ALICE)));
    await assertFails(setDoc(doc(admin(), 'users', ALICE, 'state', 'mastery'), { x: 2 }));
    await assertFails(setDoc(doc(admin(), 'users', ALICE, 'sessions', 's2'), { events: [] }));
    await assertFails(setDoc(doc(admin(), 'users', ALICE, 'mocks', 'm2'), { score: 1 }));
    await assertFails(deleteDoc(doc(admin(), 'users', ALICE, 'sessions', 's1')));
  });
  it('state/roadmap is owner-only; other state ids still denied', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users', ALICE, 'state', 'roadmap'), { y: 1 }));
    await assertFails(setDoc(doc(bob(), 'users', ALICE, 'state', 'roadmap'), { y: 1 }));
    await assertFails(getDoc(doc(bob(), 'users', ALICE, 'state', 'roadmap')));
    await assertFails(getDoc(doc(anon(), 'users', ALICE, 'state', 'roadmap')));
    await assertFails(setDoc(doc(alice(), 'users', ALICE, 'state', 'other'), { y: 1 }));
    await assertFails(setDoc(doc(admin(), 'users', ALICE, 'state', 'other'), { y: 1 }));
  });
  it('unauthenticated cannot read profiles', async () => {
    await assertFails(getDoc(doc(anon(), 'users', ALICE)));
    await assertFails(getDocs(collection(anon(), 'users')));
  });
});
