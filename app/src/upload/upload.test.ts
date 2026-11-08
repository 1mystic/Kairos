import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkQuota, MAX_NEW_PER_DAY, type UserQuestion } from '@kairos/core';
import { REPLY, REPLY_TRUNCATED, chunk } from './fixtures';
import { dragRect, initialRect, outputSize, rectToPercent, imageIdOf } from './crop';
import { runPipeline } from './pipeline';
import { PROMPT_TEMPLATE, renderPrompt } from './prompt';
import { categorize, chipsFor, patchQuestion, summarize, summaryText, validateItem } from './review';
import { chaptersForExam } from './taxonomy';
import { LocalBankStore } from '../store/bankLocal';
import { CloudBankStore, SERVER_TIME, BATCH_MAX, type BankFsAdapter } from '../store/bankCloud';
import { createMemoryKv } from '../store/bankDb';
import { checkSaveQuota, deleteQuestionsAndOrphans, replaceImageTargets, resolveUserImages, userBankSource, usageOf } from '../store/bank';

const root = join(__dirname, '../../..');
const chapterIds = chaptersForExam('JEE_MAIN').map((c) => c.id);
const ctx = { exam: 'JEE_MAIN', chapterIds, existingIds: [] as string[], now: 1_700_000_000_000 };

describe('prompt', () => {
  it('app copy is in sync with prompts/extract_questions_v2.md', () => {
    const md = readFileSync(join(root, 'prompts/extract_questions_v2.md'), 'utf8').split('\n');
    const start = md.findIndex((l) => l.trim() === '```text');
    const end = md.findIndex((l, i) => i > start && l.trim() === '```');
    expect(PROMPT_TEMPLATE).toBe(md.slice(start + 1, end).join('\n') + '\n');
  });
  it('fills exam and chapter list', () => {
    const p = renderPrompt('NEET_UG');
    expect(p).toContain('exam: NEET UG');
    expect(p).not.toMatch(/\{\{(EXAM|CHAPTER_LIST)\}\}/);
    expect(p).toContain('BOT.');
    expect(p).toMatch(/PHY\.ROT — /);
  });
});

describe('pipeline', () => {
  it('parses a chatty reply into questions with issues', () => {
    const r = runPipeline([REPLY], ctx);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.questions).toHaveLength(5);
    const q2 = r.questions.find((q) => q.n === 2)!;
    expect(q2.pending_figures[0]!.page).toBe(1);
    expect(q2.pending_figures[0]!.bbox).toEqual([0.1, 0.3, 0.6, 0.55]);
  });
  it('gives a cut-off hint with line and column for truncated JSON', () => {
    const r = runPipeline([REPLY_TRUNCATED], ctx);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.problems[0]!.hint).toMatch(/continue/);
    expect(r.problems[0]!.line).toBeGreaterThan(1);
    expect(r.problems[0]!.col).toBeGreaterThan(0);
  });
  it('says what to do when no JSON is present', () => {
    const r = runPipeline(['hello there'], ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.problems[0]!.hint).toMatch(/whole reply/);
  });
  it('merges continued blocks and flags an incomplete reply', () => {
    const both = runPipeline([chunk(1, 3, 4), chunk(4, 5, null)], ctx);
    expect(both.ok && both.questions.length).toBe(5);
    const one = runPipeline([chunk(1, 3, 4)], ctx);
    expect(one.ok && one.notices.join(' ')).toMatch(/continue/);
  });
  it('skips duplicates already in the bank', () => {
    const first = runPipeline([REPLY], ctx);
    if (!first.ok) throw new Error('x');
    const again = runPipeline([REPLY], { ...ctx, existingIds: first.questions.map((q) => q.id) });
    expect(again.ok && again.questions).toHaveLength(0);
    expect(again.ok && again.skipped.some((i) => i.code === 'duplicate')).toBe(true);
  });
});

describe('review helpers', () => {
  const load = () => {
    const r = runPipeline([REPLY], ctx);
    if (!r.ok) throw new Error('x');
    return r.questions;
  };
  it('categorises and summarises', () => {
    const items = load().map((q) => ({ q, issues: validateItem(q, chapterIds) }));
    const s = summarize(items);
    expect(s).toMatchObject({ ready: 2, needsAnswer: 1, problem: 2, total: 5 });
    expect(summaryText(s)).toBe('2 ready · 1 needs an answer · 2 have a problem');
    expect(chipsFor(items[1]!.issues).some((c) => c.label === 'Figure missing' && c.level === 'error')).toBe(true);
  });
  it('re-validates after an edit (chapter fixed, answer added)', () => {
    const qs = load();
    const q4 = qs.find((q) => q.n === 4)!;
    expect(categorize(validateItem(q4, chapterIds))).toBe('problem');
    const fixed = patchQuestion(q4, { chapter: 'PHY.LOM' });
    expect(categorize(validateItem(fixed, chapterIds))).toBe('ready');
    const q3 = patchQuestion(qs.find((q) => q.n === 3)!, { answer: { value: 2 } });
    expect(q3.status).toBe('user_ok');
    const bad = patchQuestion(fixed, { stem: 'broken $\\frac{1$' });
    expect(validateItem(bad, chapterIds).some((i) => i.code === 'bad_math')).toBe(true);
  });
});

describe('crop math', () => {
  const bounds = { w: 1000, h: 1000 };
  const r = { x: 100, y: 100, w: 200, h: 200 };
  it('initialRect pads the bbox and stays inside the page', () => {
    const p = initialRect([0.1, 0.3, 0.6, 0.55], 1000, 2000);
    expect(p.x).toBe(80);
    expect(p.x + p.w).toBeLessThanOrEqual(1000);
    expect(p.y + p.h).toBeLessThanOrEqual(2000);
  });
  it('moves and clamps', () => {
    expect(dragRect(r, 'move', 50, -500, bounds)).toEqual({ x: 150, y: 0, w: 200, h: 200 });
    expect(dragRect(r, 'move', 5000, 0, bounds).x).toBe(800);
  });
  it('resizes from corners with a minimum size', () => {
    expect(dragRect(r, 'se', 100, 50, bounds)).toEqual({ x: 100, y: 100, w: 300, h: 250 });
    expect(dragRect(r, 'nw', 500, 500, bounds, 24)).toEqual({ x: 276, y: 276, w: 24, h: 24 });
    expect(dragRect(r, 'e', 5000, 0, bounds).w).toBe(900);
  });
  it('output size caps width at 960 and never upscales', () => {
    expect(outputSize({ w: 1920, h: 960 })).toEqual({ w: 960, h: 480 });
    expect(outputSize({ w: 300, h: 100 })).toEqual({ w: 300, h: 100 });
  });
  it('rectToPercent and imageIdOf', () => {
    expect(rectToPercent({ x: 100, y: 200, w: 500, h: 400 }, { w: 1000, h: 2000 })).toEqual({ left: '10%', top: '10%', width: '50%', height: '20%' });
    expect(imageIdOf(new Uint8Array([97, 98, 99]))).toBe('ba7816bf8f01cfea');
  });
});

const NOW = new Date(2026, 10, 8, 12).getTime();
const mkq = (id: string, over: Partial<UserQuestion> = {}): UserQuestion => ({
  id, type: 'SCQ', stem: 'stem ' + id, options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }], answer: { keys: ['A'] },
  solution: null, solution_source: 'user', tax: { subject: 'PHY', chapter: 'PHY.ROT' }, appearances: [], source: { kind: 'user' },
  images: [], status: 'user_ok', n: 1, confidence: 'high', exam: 'JEE_MAIN', created_at: NOW, pending_figures: [], ...over,
});
const IMG = '0123456789abcdef';
const withImg = (id: string) => mkq(id, { stem: `see ![fig](img:${IMG})`, images: [{ id: IMG, w: 10, h: 10, alt: 'fig', variants: [10] }] });

describe('LocalBankStore', () => {
  it('round-trips questions and media, counts usage, cleans orphans', async () => {
    const s = new LocalBankStore(createMemoryKv(), () => NOW);
    await s.save([withImg('u_000000000001'), mkq('u_000000000002')], [{ id: IMG, b64: 'QUJD', w: 10, h: 10 }]);
    expect((await s.listQuestions()).map((q) => q.id).sort()).toEqual(['u_000000000001', 'u_000000000002']);
    expect(await s.getMedia(IMG)).toBe('data:image/webp;base64,QUJD');
    expect(await s.getMedia('ffffffffffffffff')).toBeNull();
    expect(await s.usage()).toEqual({ questions: 2, images: 1, addedToday: 2 });
    await deleteQuestionsAndOrphans(s, ['u_000000000001']);
    expect(await s.getMedia(IMG)).toBeNull();
    expect((await s.usage()).questions).toBe(1);
  });
  it('rejects oversized images', async () => {
    const s = new LocalBankStore(createMemoryKv());
    await expect(s.putMedia(IMG, { b64: 'A'.repeat(120_001), w: 1, h: 1 })).rejects.toThrow(/too large/);
  });
});

function fakeFs() {
  const docs = new Map<string, Record<string, unknown>>();
  const batches: number[] = [];
  const adapter: BankFsAdapter = {
    async get(p) { return docs.get(p) ?? null; },
    async list(c) { return [...docs].filter(([k]) => k.startsWith(c + '/')).map(([k, data]) => ({ id: k.slice(c.length + 1), data })); },
    async batchSet(ops) { batches.push(ops.length); for (const o of ops) docs.set(o.path, o.data); },
    async delete(p) { docs.delete(p); },
  };
  return { adapter, docs, batches };
}

describe('CloudBankStore', () => {
  it('writes media docs with exactly the rule keys and one batch per save', async () => {
    const f = fakeFs();
    const s = new CloudBankStore('u1', f.adapter, createMemoryKv(), () => NOW);
    await s.save([withImg('u_000000000001')], [{ id: IMG, bytes: new Uint8Array([1, 2, 3]), w: 10, h: 10 }]);
    expect(f.batches).toEqual([2]);
    const m = f.docs.get(`users/u1/media/${IMG}`)!;
    expect(Object.keys(m).sort()).toEqual(['b64', 'createdAt', 'h', 'mime', 'w']);
    expect(m.createdAt).toBe(SERVER_TIME);
    expect(m.mime).toBe('image/webp');
    expect(f.docs.has('users/u1/bank/u_000000000001')).toBe(true);
    expect((f.docs.get('users/u1/bank/u_000000000001') as { owner: string }).owner).toBe('u1');
  });
  it('never rewrites an existing media doc (create-only rules)', async () => {
    const f = fakeFs();
    const s = new CloudBankStore('u1', f.adapter, createMemoryKv());
    await s.putMedia(IMG, { b64: 'QUJD', w: 1, h: 1 });
    await s.putMedia(IMG, { b64: 'QUJD', w: 1, h: 1 });
    expect(f.batches).toEqual([1]);
  });
  it('batches at most 400 ops', async () => {
    const f = fakeFs();
    const s = new CloudBankStore('u1', f.adapter, createMemoryKv());
    await s.putQuestions(Array.from({ length: 850 }, (_, i) => mkq('u_' + String(i).padStart(12, '0'))));
    expect(f.batches).toEqual([BATCH_MAX, BATCH_MAX, 50]);
  });
  it('reads media lazily and caches it', async () => {
    const f = fakeFs();
    f.docs.set(`users/u1/media/${IMG}`, { b64: 'QUJD', w: 1, h: 1, mime: 'image/webp', createdAt: 0 });
    const kv = createMemoryKv();
    const s = new CloudBankStore('u1', f.adapter, kv);
    expect(await s.getMedia(IMG)).toBe('data:image/webp;base64,QUJD');
    f.docs.clear();
    expect(await s.getMedia(IMG)).toBe('data:image/webp;base64,QUJD');
  });
  it('lists, deletes and refuses 50KB+ docs', async () => {
    const f = fakeFs();
    const s = new CloudBankStore('u1', f.adapter, createMemoryKv());
    await s.putQuestions([mkq('u_000000000001')]);
    expect(await s.listQuestions()).toHaveLength(1);
    await s.deleteQuestion('u_000000000001');
    expect(await s.listQuestions()).toHaveLength(0);
    await expect(s.putQuestions([mkq('u_000000000002', { stem: 'x'.repeat(60_000) })])).rejects.toThrow(/too long/);
  });
});

describe('quota', () => {
  it('blocks above the daily cap with remaining counts, and ignores ids already in the bank', async () => {
    const s = new LocalBankStore(createMemoryKv(), () => NOW);
    await s.putQuestions(Array.from({ length: MAX_NEW_PER_DAY - 1 }, (_, i) => mkq('u_' + String(i).padStart(12, '0'))));
    const two = [mkq('u_aaaaaaaaaaaa'), mkq('u_bbbbbbbbbbbb')];
    const r = await checkSaveQuota(s, two, 0, NOW);
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.reasons[0]!.code).toBe('daily_cap'); expect(r.remaining.today).toBe(1); }
    expect((await checkSaveQuota(s, [mkq('u_000000000000')], 0, NOW)).ok).toBe(true);
    expect(checkQuota({ existingQuestions: 2000, existingImages: 0, adding: { questions: 1 }, addedToday: 0 }).ok).toBe(false);
    expect(usageOf([mkq('u_x', { created_at: NOW - 2 * 86_400_000 })], NOW).addedToday).toBe(0);
  });
});

describe('resolveUserImages / userBankSource', () => {
  it('replaces img ids only when media exists', async () => {
    const s = new LocalBankStore(createMemoryKv());
    const q = withImg('u_000000000001');
    expect((await resolveUserImages(q, s)).stem).toBe(q.stem);
    await s.putMedia(IMG, { b64: 'QUJD', w: 10, h: 10 });
    expect((await resolveUserImages(q, s)).stem).toBe('see ![fig](data:image/webp;base64,QUJD)');
    expect(replaceImageTargets('![a](img:ffffffffffffffff)', new Map())).toBe('![a](img:ffffffffffffffff)');
  });
  it('source skips self-check unless asked and strips app fields', async () => {
    const s = new LocalBankStore(createMemoryKv());
    await s.putQuestions([mkq('u_000000000001'), mkq('u_000000000002', { answer: null, status: 'needs_answer' })]);
    const a = await userBankSource(s).load();
    expect(a.map((q) => q.id)).toEqual(['u_000000000001']);
    expect(a[0]).not.toHaveProperty('pending_figures');
    expect(userBankSource(s).id).toBe('my-bank');
    expect(await userBankSource(s, { includeSelfCheck: true }).load()).toHaveLength(2);
  });
});
