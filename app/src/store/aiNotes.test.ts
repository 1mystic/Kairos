import { describe, expect, it, vi } from 'vitest';
import { SERVER_TIME } from './bankCloud';
import { FirestoreStore } from './FirestoreStore';
import { LocalStore } from './LocalStore';
import { createMemoryLocalDb } from './localDb';
import { inspectMigration, runMigration } from './migrate';
import { aiRefOf, stemSnippet } from './aiNotes';
import { AI_NOTE_MAX } from './types';
import { fakeFs } from './testUtils';

const NOW = Date.UTC(2026, 10, 8, 12);
const QID = 'u_abc123';

describe('AI notes: LocalStore', () => {
  it('round-trips a note, overwrites it, and deletes it', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    expect(await l.getAiNote(QID)).toBeNull();
    const before = Date.now();
    await l.putAiNote(QID, { text: 'Use the chain rule.', provider: 'gemini' });
    const n = await l.getAiNote(QID);
    expect(n).toMatchObject({ qid: QID, text: 'Use the chain rule.', provider: 'gemini' });
    expect(n!.updatedAt).toBeGreaterThanOrEqual(before);
    await l.putAiNote(QID, { text: 'Second try', provider: 'claude' });
    expect(await l.getAiNote(QID)).toMatchObject({ text: 'Second try', provider: 'claude' });
    await l.deleteAiNote(QID);
    expect(await l.getAiNote(QID)).toBeNull();
    expect(await l.listAiNotes()).toEqual([]);
  });

  it('trims the text before storing', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    await l.putAiNote(QID, { text: '  \n hello world \t ', provider: 'chatgpt' });
    expect((await l.getAiNote(QID))!.text).toBe('hello world');
  });

  it('clips text to AI_NOTE_MAX UTF-16 units', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    await l.putAiNote(QID, { text: 'x'.repeat(AI_NOTE_MAX + 500), provider: 'other' });
    expect((await l.getAiNote(QID))!.text).toHaveLength(AI_NOTE_MAX);
  });

  it('never exceeds AI_NOTE_MAX by length and never splits a surrogate pair', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    // emoji are 2 UTF-16 units each: the cut at 20000 falls between pairs, and at an odd offset it would split one
    await l.putAiNote(QID, { text: '\u{1F600}'.repeat(AI_NOTE_MAX), provider: 'other' });
    expect((await l.getAiNote(QID))!.text.length).toBe(AI_NOTE_MAX);
    await l.putAiNote(QID, { text: 'a' + '\u{1F600}'.repeat(AI_NOTE_MAX), provider: 'other' });
    const t = (await l.getAiNote(QID))!.text;
    expect(t.length).toBeLessThanOrEqual(AI_NOTE_MAX);
    expect(t.length).toBe(AI_NOTE_MAX - 1);
    const last = t.charCodeAt(t.length - 1);
    expect(last >= 0xd800 && last <= 0xdbff).toBe(false);
  });

  it('stores savedAt equal to the display time', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    await l.putAiNote(QID, { text: 'hi', provider: 'gemini' });
    const n = (await l.getAiNote(QID))!;
    expect(n.savedAt).toBe(n.updatedAt);
  });

  it('rejects empty and whitespace-only text without writing', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    await expect(l.putAiNote(QID, { text: '', provider: 'gemini' })).rejects.toThrow();
    await expect(l.putAiNote(QID, { text: ' \n\t ', provider: 'gemini' })).rejects.toThrow();
    expect(await l.getAiNote(QID)).toBeNull();
  });

  it('rejects an unknown provider', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    await expect(l.putAiNote(QID, { text: 'hi', provider: 'bing' as never })).rejects.toThrow();
  });

  it('throws on a bad question id for every method', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    for (const bad of ['', 'x_abc', 'u_', 'u_has space', 'u_' + 'a'.repeat(65), '../etc']) {
      await expect(l.getAiNote(bad)).rejects.toThrow();
      await expect(l.putAiNote(bad, { text: 'hi', provider: 'gemini' })).rejects.toThrow();
      await expect(l.deleteAiNote(bad)).rejects.toThrow();
    }
  });
});

describe('AI notes: FirestoreStore', () => {
  it('writes one doc at users/{uid}/ai_notes/{qid} with a server timestamp', async () => {
    const f = fakeFs();
    const c = new FirestoreStore('u1', f.adapter);
    const spy = vi.spyOn(f.adapter, 'set');
    await c.putAiNote('q_9', { text: '  Because of symmetry.  ', provider: 'perplexity' });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(f.docs.get('users/u1/ai_notes/q_9')).toEqual({ text: 'Because of symmetry.', provider: 'perplexity', updatedAt: SERVER_TIME, savedAt: expect.any(Number) });
  });

  it('reads back with updatedAt converted from a Timestamp to ms', async () => {
    const f = fakeFs({ 'users/u1/ai_notes/u_x1': { text: 'ok', provider: 'google', updatedAt: { toMillis: () => 1234 } } });
    const c = new FirestoreStore('u1', f.adapter);
    expect(await c.getAiNote('u_x1')).toEqual({ qid: 'u_x1', text: 'ok', provider: 'google', updatedAt: 1234 });
    expect(await c.getAiNote('u_missing')).toBeNull();
  });

  it('prefers the client savedAt over the server updatedAt, and lists notes for export', async () => {
    const f = fakeFs({
      'users/u1/ai_notes/u_x1': { text: 'ok', provider: 'google', updatedAt: { toMillis: () => 9000 }, savedAt: 1234 },
      'users/u1/ai_notes/q_x2': { text: 'two', provider: 'claude', updatedAt: { toMillis: () => 5000 } },
    });
    const c = new FirestoreStore('u1', f.adapter);
    expect((await c.getAiNote('u_x1'))!.updatedAt).toBe(1234);
    const all = await c.listAiNotes();
    expect(all.map((n) => [n.qid, n.updatedAt]).sort()).toEqual([['q_x2', 5000], ['u_x1', 1234]]);
  });

  it('deletes the doc and rejects bad ids', async () => {
    const f = fakeFs({ 'users/u1/ai_notes/u_x1': { text: 'ok', provider: 'google', updatedAt: 1 } });
    const c = new FirestoreStore('u1', f.adapter);
    await c.deleteAiNote('u_x1');
    expect(f.docs.has('users/u1/ai_notes/u_x1')).toBe(false);
    await expect(c.putAiNote('bad', { text: 'hi', provider: 'gemini' })).rejects.toThrow();
    await expect(c.getAiNote('u_' + 'a'.repeat(65))).rejects.toThrow();
  });
});

describe('AI notes: migration', () => {
  it('copies guest notes to the account and clears them from the device', async () => {
    const local = new LocalStore(createMemoryLocalDb());
    const f = fakeFs();
    const cloud = new FirestoreStore('u1', f.adapter);
    await local.putAiNote('u_aaa', { text: 'first', provider: 'gemini' });
    await local.putAiNote('q_bbb', { text: 'second', provider: 'claude' });
    const saved = { u_aaa: (await local.getAiNote('u_aaa'))!.savedAt, q_bbb: (await local.getAiNote('q_bbb'))!.savedAt };
    expect((await inspectMigration(local, cloud, NOW)).counts.aiNotes).toBe(2);
    await runMigration(local, cloud, 'u1', 'new', NOW);
    // the original save time travels with the note (savedAt), the server stamps updatedAt
    expect(f.docs.get('users/u1/ai_notes/u_aaa')).toEqual({ text: 'first', provider: 'gemini', updatedAt: SERVER_TIME, savedAt: saved.u_aaa });
    expect(f.docs.get('users/u1/ai_notes/q_bbb')).toEqual({ text: 'second', provider: 'claude', updatedAt: SERVER_TIME, savedAt: saved.q_bbb });
    expect(await local.getAiNote('u_aaa')).toBeNull();
    expect(await local.listAiNotes()).toEqual([]);
  });

  it('merge keeps the cloud copy when the account already has a note for the qid', async () => {
    const local = new LocalStore(createMemoryLocalDb());
    const f = fakeFs({ 'users/u1/ai_notes/u_aaa': { text: 'cloud', provider: 'chatgpt', updatedAt: 5 } });
    const cloud = new FirestoreStore('u1', f.adapter);
    await local.putAiNote('u_aaa', { text: 'device', provider: 'gemini' });
    await local.putAiNote('u_ccc', { text: 'new one', provider: 'gemini' });
    await runMigration(local, cloud, 'u1', 'merge', NOW);
    expect(f.docs.get('users/u1/ai_notes/u_aaa')).toEqual({ text: 'cloud', provider: 'chatgpt', updatedAt: 5 });
    expect(f.docs.get('users/u1/ai_notes/u_ccc')).toEqual({ text: 'new one', provider: 'gemini', updatedAt: SERVER_TIME, savedAt: expect.any(Number) });
  });
});

describe('AI notes: question reference and listAiNotes', () => {
  const REF = { exam: 'JEE_MAIN', chapter: 'PHY.LOM', stem: 'A block slides down an incline.' };

  it('LocalStore saves the ref fields, lists newest first, and omits an empty ref', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    const now = vi.spyOn(Date, 'now');
    now.mockReturnValue(1000);
    await l.putAiNote('q_old', { text: 'old', provider: 'gemini' });
    now.mockReturnValue(3000);
    await l.putAiNote('q_new', { text: 'new', provider: 'claude' }, REF);
    now.mockReturnValue(2000);
    await l.putAiNote('q_mid', { text: 'mid', provider: 'chatgpt' }, { exam: 'NEET_UG', chapter: '', stem: '' });
    now.mockRestore();
    const all = await l.listAiNotes();
    expect(all.map((n) => n.qid)).toEqual(['q_new', 'q_mid', 'q_old']);
    expect(all[0]).toMatchObject(REF);
    expect(all[1]!.exam).toBe('NEET_UG');
    expect('chapter' in all[1]!).toBe(false);
    expect('exam' in all[2]!).toBe(false);
  });

  it('clips an over-long ref to the limits the rules enforce', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    await l.putAiNote('q_1', { text: 'x', provider: 'other' }, { exam: 'e'.repeat(50), chapter: 'c'.repeat(90), stem: 's'.repeat(900) });
    const n = (await l.getAiNote('q_1'))!;
    expect([n.exam!.length, n.chapter!.length, n.stem!.length]).toEqual([20, 40, 300]);
  });

  it('FirestoreStore writes the ref in the same single set, and lists newest first with the ref', async () => {
    const f = fakeFs({
      'users/u1/ai_notes/q_a': { text: 'a', provider: 'google', updatedAt: { toMillis: () => 100 } },
      'users/u1/ai_notes/q_b': { text: 'b', provider: 'claude', updatedAt: { toMillis: () => 5 }, savedAt: 900, ...REF },
    });
    const c = new FirestoreStore('u1', f.adapter);
    const spy = vi.spyOn(f.adapter, 'set');
    await c.putAiNote('q_c', { text: 'c', provider: 'gemini' }, REF);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(f.docs.get('users/u1/ai_notes/q_c')).toEqual({ text: 'c', provider: 'gemini', updatedAt: SERVER_TIME, savedAt: expect.any(Number), ...REF });
    const all = await c.listAiNotes();
    expect(all.map((n) => n.qid)[0]).toBe('q_c');
    expect(all.map((n) => n.qid).slice(1)).toEqual(['q_b', 'q_a']);
    expect(all.find((n) => n.qid === 'q_b')).toMatchObject(REF);
  });

  it('migration copies the ref fields to the account', async () => {
    const local = new LocalStore(createMemoryLocalDb());
    const f = fakeFs();
    const cloud = new FirestoreStore('u1', f.adapter);
    await local.putAiNote('q_bbb', { text: 'second', provider: 'claude' }, REF);
    await runMigration(local, cloud, 'u1', 'new', NOW);
    expect(f.docs.get('users/u1/ai_notes/q_bbb')).toMatchObject({ text: 'second', ...REF });
  });
});

describe('AI notes: ref helpers', () => {
  it('stemSnippet drops images and markdown marks and clips to 300', () => {
    expect(stemSnippet('A **block**  of mass\n$m$ ![fig](img:f1) slides')).toBe('A block of mass $m$ slides');
    expect(stemSnippet('x'.repeat(500))).toHaveLength(300);
    expect(stemSnippet(undefined)).toBe('');
  });
  it('aiRefOf takes the explicit exam, else the first appearance, and the taxonomy chapter', () => {
    const q = { stem: 'Find x', tax: { chapter: 'PHY.LOM' }, appearances: [{ exam: 'NEET_UG' }] };
    expect(aiRefOf(q, 'JEE_MAIN')).toEqual({ exam: 'JEE_MAIN', chapter: 'PHY.LOM', stem: 'Find x' });
    expect(aiRefOf(q)).toMatchObject({ exam: 'NEET_UG' });
    expect(aiRefOf({ stem: '' })).toEqual({});
  });
});
