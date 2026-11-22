import { describe, expect, it, vi } from 'vitest';
import { SERVER_TIME } from './bankCloud';
import { FirestoreStore } from './FirestoreStore';
import { LocalStore } from './LocalStore';
import { createMemoryLocalDb } from './localDb';
import { runMigration } from './migrate';
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

  it('clips text to AI_NOTE_MAX characters', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    await l.putAiNote(QID, { text: 'x'.repeat(AI_NOTE_MAX + 500), provider: 'other' });
    expect((await l.getAiNote(QID))!.text).toHaveLength(AI_NOTE_MAX);
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
    expect(f.docs.get('users/u1/ai_notes/q_9')).toEqual({ text: 'Because of symmetry.', provider: 'perplexity', updatedAt: SERVER_TIME });
  });

  it('reads back with updatedAt converted from a Timestamp to ms', async () => {
    const f = fakeFs({ 'users/u1/ai_notes/u_x1': { text: 'ok', provider: 'google', updatedAt: { toMillis: () => 1234 } } });
    const c = new FirestoreStore('u1', f.adapter);
    expect(await c.getAiNote('u_x1')).toEqual({ qid: 'u_x1', text: 'ok', provider: 'google', updatedAt: 1234 });
    expect(await c.getAiNote('u_missing')).toBeNull();
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
    await runMigration(local, cloud, 'u1', 'new', NOW);
    expect(f.docs.get('users/u1/ai_notes/u_aaa')).toEqual({ text: 'first', provider: 'gemini', updatedAt: SERVER_TIME });
    expect(f.docs.get('users/u1/ai_notes/q_bbb')).toEqual({ text: 'second', provider: 'claude', updatedAt: SERVER_TIME });
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
    expect(f.docs.get('users/u1/ai_notes/u_ccc')).toEqual({ text: 'new one', provider: 'gemini', updatedAt: SERVER_TIME });
  });
});
