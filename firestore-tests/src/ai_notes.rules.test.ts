import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, getDocs, collection, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';

/** users/{uid}/ai_notes/{qid}: owner-only pasted AI explanation, strict schema. */
let env: RulesTestEnvironment;
const ALICE = 'alice';
const QID = 'q_jee_main_2024_001';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-kairos-ai-notes',
    firestore: { rules: readFileSync(resolve(__dirname, '../../firestore.rules'), 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});
afterAll(async () => {
  await env.cleanup();
});
beforeEach(async () => {
  await env.clearFirestore();
});

const alice = () => env.authenticatedContext(ALICE, { email: 'alice@example.com' }).firestore();
const bob = () => env.authenticatedContext('bob', { email: 'bob@example.com' }).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const ref = (db = alice(), id = QID) => doc(db, 'users', ALICE, 'ai_notes', id);
const note = (over: Record<string, unknown> = {}) => ({ text: 'Use conservation of energy.', provider: 'gemini', updatedAt: serverTimestamp(), ...over });

async function seed() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'users', ALICE, 'ai_notes', QID), { text: 'old', provider: 'other', updatedAt: new Date() });
  });
}

describe('users/{uid}/ai_notes/{qid}', () => {
  it('owner can create, update, read, list and delete', async () => {
    await assertSucceeds(setDoc(ref(), note()));
    await assertSucceeds(updateDoc(ref(), { text: 'edited', provider: 'claude', updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(ref()));
    await assertSucceeds(getDocs(collection(alice(), 'users', ALICE, 'ai_notes')));
    await assertSucceeds(deleteDoc(ref()));
  });
  it('accepts user bank ids, all providers, and text at exactly 1 and 20000 chars', async () => {
    await assertSucceeds(setDoc(ref(alice(), 'u_0123456789ab'), note()));
    for (const p of ['gemini', 'chatgpt', 'google', 'claude', 'perplexity', 'other']) {
      await assertSucceeds(setDoc(ref(), note({ provider: p })));
    }
    await assertSucceeds(setDoc(ref(), note({ text: 'x' })));
    await assertSucceeds(setDoc(ref(), note({ text: 'x'.repeat(20000) })));
  });
  it('other users are denied everything', async () => {
    await seed();
    await assertFails(getDoc(ref(bob())));
    await assertFails(getDocs(collection(bob(), 'users', ALICE, 'ai_notes')));
    await assertFails(setDoc(ref(bob(), 'q_other'), note()));
    await assertFails(updateDoc(ref(bob()), { text: 'hax', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(ref(bob())));
  });
  it('unauthenticated is denied everything', async () => {
    await seed();
    await assertFails(getDoc(ref(anon())));
    await assertFails(setDoc(ref(anon(), 'q_other'), note()));
    await assertFails(updateDoc(ref(anon()), { text: 'hax', updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(ref(anon())));
  });
  it('rejects too-long and empty text', async () => {
    await assertFails(setDoc(ref(), note({ text: 'x'.repeat(20001) })));
    await assertFails(setDoc(ref(), note({ text: '' })));
    await seed();
    await assertFails(updateDoc(ref(), { text: 'x'.repeat(20001), updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref(), { text: '', updatedAt: serverTimestamp() }));
  });
  it('rejects bad or non-string provider and non-string text', async () => {
    await assertFails(setDoc(ref(), note({ provider: 'bard' })));
    await assertFails(setDoc(ref(), note({ provider: 5 })));
    await assertFails(setDoc(ref(), note({ text: 5 })));
    await seed();
    await assertFails(updateDoc(ref(), { provider: 'bard', updatedAt: serverTimestamp() }));
  });
  it('rejects extra and missing fields', async () => {
    await assertFails(setDoc(ref(), note({ extra: 1 })));
    await assertFails(setDoc(ref(), { provider: 'gemini', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref(), { text: 'hi', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref(), { text: 'hi', provider: 'gemini' }));
    await seed();
    await assertFails(updateDoc(ref(), { extra: 1, updatedAt: serverTimestamp() }));
  });
  it('rejects updatedAt that is not request.time', async () => {
    await assertFails(setDoc(ref(), note({ updatedAt: new Date('2020-01-01') })));
    await seed();
    await assertFails(updateDoc(ref(), { text: 'new', updatedAt: new Date('2020-01-01') }));
  });
  it('accepts an optional integer savedAt (client time) on create and update', async () => {
    await assertSucceeds(setDoc(ref(), note({ savedAt: Date.now() })));
    await assertSucceeds(setDoc(ref(), note({ savedAt: 1 })));
    await assertSucceeds(updateDoc(ref(), { text: 'edited', savedAt: Date.now(), updatedAt: serverTimestamp() }));
    await assertSucceeds(setDoc(ref(), note({ savedAt: Date.now() + 5 * 60000 })));
  });
  it('rejects a non-int, non-positive or far-future savedAt', async () => {
    await assertFails(setDoc(ref(), note({ savedAt: String(Date.now()) })));
    await assertFails(setDoc(ref(), note({ savedAt: Date.now() + 0.5 })));
    await assertFails(setDoc(ref(), note({ savedAt: 0 })));
    await assertFails(setDoc(ref(), note({ savedAt: -5 })));
    await assertFails(setDoc(ref(), note({ savedAt: Date.now() + 3600_000 })));
    await seed();
    await assertFails(updateDoc(ref(), { savedAt: Date.now() + 3600_000, updatedAt: serverTimestamp() }));
  });
  it('accepts the optional question reference (exam, chapter, stem) on create and update', async () => {
    await assertSucceeds(setDoc(ref(), note({ exam: 'JEE_MAIN', chapter: 'PHY.LOM', stem: 'A block slides down a rough incline.' })));
    await assertSucceeds(setDoc(ref(), note({ exam: 'x', chapter: 'c', stem: '' })));
    await assertSucceeds(setDoc(ref(), note({ exam: 'e'.repeat(20), chapter: 'c'.repeat(40), stem: 's'.repeat(300) })));
    await assertSucceeds(setDoc(ref(), note({ exam: 'IAT' })));
    await seed();
    await assertSucceeds(updateDoc(ref(), { text: 'edited', exam: 'NEET_UG', chapter: 'BIO.CELL', stem: 'Which organelle...', updatedAt: serverTimestamp() }));
  });
  it('rejects a too-long or empty exam, chapter or stem', async () => {
    await assertFails(setDoc(ref(), note({ exam: 'e'.repeat(21) })));
    await assertFails(setDoc(ref(), note({ exam: '' })));
    await assertFails(setDoc(ref(), note({ chapter: 'c'.repeat(41) })));
    await assertFails(setDoc(ref(), note({ chapter: '' })));
    await assertFails(setDoc(ref(), note({ stem: 's'.repeat(301) })));
    await seed();
    await assertFails(updateDoc(ref(), { stem: 's'.repeat(301), updatedAt: serverTimestamp() }));
  });
  it('rejects non-string exam, chapter or stem', async () => {
    await assertFails(setDoc(ref(), note({ exam: 5 })));
    await assertFails(setDoc(ref(), note({ chapter: ['PHY.LOM'] })));
    await assertFails(setDoc(ref(), note({ stem: { a: 1 } })));
    await assertFails(setDoc(ref(), note({ stem: null })));
    await seed();
    await assertFails(updateDoc(ref(), { chapter: 7, updatedAt: serverTimestamp() }));
  });
  it('rejects bad doc ids', async () => {
    for (const id of ['x_abc', 'q_', 'abc', 'q-abc', 'q_' + 'a'.repeat(65), 'Q_abc', 'q_ab.c']) {
      await assertFails(setDoc(ref(alice(), id), note()));
    }
    await assertSucceeds(setDoc(ref(alice(), 'q_' + 'a'.repeat(64)), note()));
  });
});
