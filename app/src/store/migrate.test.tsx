import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { UserQuestion } from '@kairos/core';
import { CloudBankStore, SERVER_TIME, type BankFsAdapter } from './bankCloud';
import { createMemoryKv } from './bankDb';
import { LocalBankStore } from './bankLocal';
import { FirestoreStore, DEFAULT_SESSION_LIMIT } from './FirestoreStore';
import { LocalStore } from './LocalStore';
import { createMemoryLocalDb } from './localDb';
import { MigrationDialog } from './MigrationDialog';
import { inspectMigration, runMigration } from './migrate';
import { fakeFs } from './testUtils';

const NOW = new Date(2026, 10, 8, 12).getTime();
const DAY = 86_400_000;
const hex = (i: number) => i.toString(16).padStart(16, '0');
const qid = (i: number) => `u_${String(i).padStart(12, '0')}`;
const mkq = (i: number, over: Partial<UserQuestion> = {}): UserQuestion => ({
  id: qid(i), type: 'SCQ', stem: 's' + i, options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], answer: { keys: ['A'] },
  solution: null, solution_source: 'user', tax: { subject: 'PHY', chapter: 'PHY.ROT' }, appearances: [], source: { kind: 'user' },
  images: [], status: 'user_ok', n: i, confidence: 'high', exam: 'JEE_MAIN', created_at: NOW - i, pending_figures: [], ...over,
}) as UserQuestion;
const withImg = (i: number, img: number) => mkq(i, { stem: `x ![f](img:${hex(img)})`, images: [{ id: hex(img), w: 10, h: 10, alt: 'f', variants: [10] }] });

function bankFs(docs = new Map<string, Record<string, unknown>>()) {
  const batches: Array<Array<{ path: string; data: Record<string, unknown> }>> = [];
  const st = { failAt: 0, n: 0 };
  const adapter: BankFsAdapter = {
    async get(p) { return docs.get(p) ?? null; },
    async list(c) { return [...docs].filter(([k]) => k.startsWith(c + '/')).map(([k, data]) => ({ id: k.slice(c.length + 1), data })); },
    async batchSet(ops) {
      st.n += 1;
      if (st.n === st.failAt) throw new Error('network');
      batches.push(ops);
      for (const o of ops) docs.set(o.path, o.data);
    },
    async delete(p) { docs.delete(p); },
  };
  return { adapter, docs, batches, st };
}

async function setup(opts: { cloudDocs?: Record<string, Record<string, unknown>>; bankDocs?: Map<string, Record<string, unknown>> } = {}) {
  const local = new LocalStore(createMemoryLocalDb());
  const kv = createMemoryKv();
  const localBank = new LocalBankStore(kv, () => NOW);
  const f = fakeFs(opts.cloudDocs ?? {});
  const cloud = new FirestoreStore('u1', f.adapter);
  const bf = bankFs(opts.bankDocs);
  const deps = () => ({ bank: { local: localBank, cloud: new CloudBankStore('u1', bf.adapter, createMemoryKv(), () => NOW) } });
  return { local, localBank, f, cloud, bf, deps };
}

const GUEST = {
  kind: 'guest' as const, displayName: 'G', createdAt: 1, exam: 'JEE_MAIN.2+NEET_UG.1@2027-05-03', examDate: '2027-01-20', ambition: 'top' as const,
  minutesPerWeekday: { '0': 60, '1': 90 }, offDay: 6, chaptersDone: ['PHY.ROT'], lang: 'hi' as const, onboarded: true,
};

describe('onboarding fields', () => {
  it('copies guest onboarding fields with ONE profile write when the account is not onboarded', async () => {
    const t = await setup({ cloudDocs: { 'users/u1': { displayName: 'A', onboarded: false } } });
    await t.local.saveProfile(GUEST);
    await t.local.putPlan('2026-11-08', { tasks: [] });
    const spy = vi.spyOn(t.f.adapter, 'updateProfile');
    expect((await inspectMigration(t.local, t.cloud, NOW, t.deps())).onboarding).toBe('copy');
    const r = await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    expect(spy).toHaveBeenCalledTimes(1);
    expect(t.f.docs.get('users/u1')).toMatchObject({ displayName: 'A', onboarded: true, exam: GUEST.exam, examDate: '2027-01-20', ambition: 'top', offDay: 6, lang: 'hi', chaptersDone: ['PHY.ROT'], minutesPerWeekday: { '0': 60, '1': 90 } });
    expect(t.f.docs.has('users/u1/plans/2026-11-08')).toBe(true);
    expect(r.onboarding).toBe('copy');
    // guest copy of the fields is gone, so the next sign-in does not offer them again
    expect(await t.local.getProfile()).not.toHaveProperty('exam');
    expect((await inspectMigration(t.local, t.cloud, NOW, t.deps())).status).toBe('none');
  });
  it('drops values the rules would reject (exam > 40 chars, bad date, bad enum) and caps chaptersDone at 400', async () => {
    const t = await setup({ cloudDocs: { 'users/u1': { displayName: 'A', onboarded: false } } });
    await t.local.saveProfile({ ...GUEST, exam: 'x'.repeat(41), examDate: '27/01/2027', ambition: 'wild' as never, lang: 'fr' as never, chaptersDone: Array.from({ length: 450 }, (_, i) => `c${i}`) });
    await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    const p = t.f.docs.get('users/u1')!;
    expect(p).not.toHaveProperty('exam');
    expect(p).not.toHaveProperty('examDate');
    expect(p).not.toHaveProperty('ambition');
    expect(p).not.toHaveProperty('lang');
    expect((p.chaptersDone as string[]).length).toBe(400);
  });
  it('account already onboarded: cloud wins, no profile write, guest plans and pace state are not copied', async () => {
    const t = await setup({ cloudDocs: { 'users/u1': { displayName: 'A', onboarded: true, exam: 'NEET_UG.1' }, 'users/u1/sessions/old': { id: 'old', startedAt: 1 } } });
    await t.local.saveProfile(GUEST);
    await t.local.putPlan('2026-11-08', { tasks: [] });
    await t.local.putState('pace', { anchor: 1 });
    await t.local.addSession({ id: 's1', startedAt: NOW });
    const spy = vi.spyOn(t.f.adapter, 'updateProfile');
    const plan = await inspectMigration(t.local, t.cloud, NOW, t.deps());
    expect(plan).toMatchObject({ status: 'ask', onboarding: 'kept-account' });
    const r = await runMigration(t.local, t.cloud, 'u1', 'merge', NOW, t.deps());
    expect(spy).not.toHaveBeenCalled();
    expect(t.f.docs.get('users/u1')).toEqual({ displayName: 'A', onboarded: true, exam: 'NEET_UG.1' });
    expect(t.f.docs.has('users/u1/plans/2026-11-08')).toBe(false);
    expect(t.f.docs.has('users/u1/sessions/s1')).toBe(true);
    expect(r.onboarding).toBe('kept-account');
  });
  it('a guest with only onboarding fields (no practice) still migrates them', async () => {
    const t = await setup({ cloudDocs: { 'users/u1': { displayName: 'A', onboarded: false } } });
    await t.local.saveProfile(GUEST);
    expect((await inspectMigration(t.local, t.cloud, NOW, t.deps())).status).toBe('upload');
    await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    expect(t.f.docs.get('users/u1')).toMatchObject({ onboarded: true });
  });
});

describe('bank migration', () => {
  it('moves questions and media, clears the local bank and reports the count', async () => {
    const t = await setup();
    await t.localBank.save([withImg(1, 1), withImg(2, 1), mkq(3)], [{ id: hex(1), b64: 'QUJD', w: 10, h: 10 }]);
    expect((await inspectMigration(t.local, t.cloud, NOW, t.deps())).counts.questions).toBe(3);
    const r = await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    expect(r).toMatchObject({ questionsMoved: 3, questionsLeft: 0 });
    expect([...t.bf.docs.keys()].sort()).toEqual([`users/u1/bank/${qid(1)}`, `users/u1/bank/${qid(2)}`, `users/u1/bank/${qid(3)}`, `users/u1/media/${hex(1)}`].sort());
    expect(t.bf.docs.get(`users/u1/media/${hex(1)}`)!.createdAt).toBe(SERVER_TIME);
    expect(await t.localBank.listQuestions()).toHaveLength(0);
    expect(await t.localBank.getMediaRecord(hex(1))).toBeNull();
  });
  it('is create-only for media that already exists in the account', async () => {
    const existing = { b64: 'OLD', w: 1, h: 1, mime: 'image/webp', createdAt: 5 };
    const t = await setup({ bankDocs: new Map([[`users/u1/media/${hex(1)}`, existing]]) });
    await t.localBank.save([withImg(1, 1)], [{ id: hex(1), b64: 'QUJD', w: 10, h: 10 }]);
    await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    expect(t.bf.docs.get(`users/u1/media/${hex(1)}`)).toBe(existing);
    expect(t.bf.batches.flat().some((o) => o.path.includes('/media/'))).toBe(false);
    expect(t.bf.docs.has(`users/u1/bank/${qid(1)}`)).toBe(true);
  });
  it('daily cap: uploads the most recent 300 and keeps the rest on the device', async () => {
    const t = await setup();
    await t.localBank.putQuestions(Array.from({ length: 350 }, (_, i) => mkq(i + 1)));
    const r = await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    expect(r).toMatchObject({ questionsMoved: 300, questionsLeft: 50 });
    // most recent = highest created_at = lowest index
    expect(t.bf.docs.has(`users/u1/bank/${qid(1)}`)).toBe(true);
    expect(t.bf.docs.has(`users/u1/bank/${qid(350)}`)).toBe(false);
    const left = await t.localBank.listQuestions();
    expect(left).toHaveLength(50);
    expect(Math.min(...left.map((q) => q.n))).toBe(301);
  });
  it('account cap: 2000 questions in total (older uploads do not count against the daily cap)', async () => {
    const bankDocs = new Map<string, Record<string, unknown>>();
    for (let i = 0; i < 1995; i++) bankDocs.set(`users/u1/bank/${qid(5000 + i)}`, { ...mkq(5000 + i), created_at: NOW - 10 * DAY });
    const t = await setup({ bankDocs });
    await t.localBank.putQuestions(Array.from({ length: 20 }, (_, i) => mkq(i + 1)));
    const r = await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    expect(r).toMatchObject({ questionsMoved: 5, questionsLeft: 15 });
    expect(await t.localBank.listQuestions()).toHaveLength(15);
  });
  it('image cap: a question whose new images would pass 300 stays local', async () => {
    const bankDocs = new Map<string, Record<string, unknown>>();
    for (let i = 0; i < 299; i++) bankDocs.set(`users/u1/bank/${qid(5000 + i)}`, { ...withImg(5000 + i, 1000 + i), created_at: NOW - 10 * DAY });
    const t = await setup({ bankDocs });
    await t.localBank.save([withImg(1, 1), withImg(2, 2)], [{ id: hex(1), b64: 'A', w: 1, h: 1 }, { id: hex(2), b64: 'B', w: 1, h: 1 }]);
    const r = await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    expect(r).toMatchObject({ questionsMoved: 1, questionsLeft: 1 });
    expect((await t.localBank.listQuestions()).map((q) => q.id)).toEqual([qid(2)]);
    expect(await t.localBank.getMediaRecord(hex(2))).not.toBeNull();
    expect(await t.localBank.getMediaRecord(hex(1))).toBeNull();
  });
  it('retry after a mid-way failure resumes, keeps local data until done, no duplicates', async () => {
    const t = await setup();
    await t.localBank.putQuestions(Array.from({ length: 250 }, (_, i) => mkq(i + 1, { created_at: NOW - 2 * DAY - i })));
    t.bf.st.failAt = 2;
    await expect(runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps())).rejects.toThrow('network');
    expect(await t.localBank.listQuestions()).toHaveLength(250);
    expect(Object.keys((await t.local.getMeta()).migratedIds).filter((k) => k.startsWith('bank/'))).toHaveLength(100);
    expect(t.bf.docs.size).toBe(100);
    const r = await runMigration(t.local, t.cloud, 'u1', 'new', NOW, t.deps());
    expect(r.questionsMoved).toBe(150);
    expect(t.bf.docs.size).toBe(250);
    expect(await t.localBank.listQuestions()).toHaveLength(0);
  });
});

describe('FirestoreStore.listSessions query', () => {
  it('uses a recent-first query with the default limit of 60', async () => {
    const f = fakeFs();
    const c = new FirestoreStore('u1', f.adapter);
    for (let i = 0; i < 70; i++) await c.addSession({ id: `s${i}`, startedAt: NOW - i * 1000 });
    const out = await c.listSessions();
    expect(f.queries).toEqual([{ path: 'users/u1/sessions', field: 'startedAt', limit: DEFAULT_SESSION_LIMIT }]);
    expect(out).toHaveLength(60);
    expect(out[0]!.id).toBe('s0');
  });
  it('passes since and limit through and returns newest first', async () => {
    const f = fakeFs();
    const c = new FirestoreStore('u1', f.adapter);
    for (let i = 0; i < 10; i++) await c.addSession({ id: `s${i}`, startedAt: NOW - i * DAY });
    const out = await c.listSessions({ since: NOW - 5.5 * DAY, limit: 3 });
    expect(f.queries[0]).toEqual({ path: 'users/u1/sessions', field: 'startedAt', since: NOW - 5.5 * DAY, limit: 3 });
    expect(out.map((s) => s.id)).toEqual(['s0', 's1', 's2']);
    expect((await c.listSessions({ since: NOW - 5.5 * DAY, limit: 50 }))).toHaveLength(6);
  });
  it('LocalStore keeps its behaviour: no default limit', async () => {
    const l = new LocalStore(createMemoryLocalDb());
    for (let i = 0; i < 70; i++) await l.addSession({ id: `s${i}`, startedAt: NOW - i });
    expect(await l.listSessions()).toHaveLength(70);
  });
});

describe('MigrationDialog decide-later', () => {
  const state = { phase: 'ask' as const, plan: { status: 'ask' as const, counts: { sessions: 2, mocks: 1, plans: 0, paceLog: 0, questions: 4 }, skippedSessions: 0, onboarding: 'kept-account' as const } };
  const mount = () => {
    const h = { onAdd: vi.fn(), onDiscard: vi.fn(), onRetry: vi.fn(), onClose: vi.fn(), onLater: vi.fn() };
    render(<MigrationDialog state={state} {...h} />);
    return h;
  };
  it('Esc and the X mean decide later and delete nothing', async () => {
    const u = userEvent.setup();
    const h = mount();
    expect(screen.getByText(/exam date and plan from this device will not replace it/)).toBeInTheDocument();
    expect(screen.getByText(/4 uploaded questions/)).toBeInTheDocument();
    await u.keyboard('{Escape}');
    await u.click(screen.getAllByRole('button', { name: 'Decide later' })[0]!);
    expect(h.onLater).toHaveBeenCalledTimes(2);
    expect(h.onDiscard).not.toHaveBeenCalled();
    expect(h.onAdd).not.toHaveBeenCalled();
  });
  it('scrim click is decide later', async () => {
    const u = userEvent.setup();
    const h = mount();
    await u.pointer({ keys: '[MouseLeft]', target: document.querySelector('.scrim')! });
    expect(h.onLater).toHaveBeenCalled();
    expect(h.onDiscard).not.toHaveBeenCalled();
  });
  it('Discard local needs a confirm before deleting', async () => {
    const u = userEvent.setup();
    const h = mount();
    await u.click(screen.getByRole('button', { name: 'Discard local' }));
    expect(h.onDiscard).not.toHaveBeenCalled();
    await u.click(screen.getByRole('button', { name: 'Keep it' }));
    await u.click(screen.getByRole('button', { name: 'Discard local' }));
    await u.click(screen.getByRole('button', { name: 'Yes, discard' }));
    expect(h.onDiscard).toHaveBeenCalledTimes(1);
  });
});
