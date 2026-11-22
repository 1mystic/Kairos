import { MAX_IMAGES, MAX_IMAGE_B64_CHARS, MAX_NEW_PER_DAY, MAX_QUESTIONS, checkDocSize, type UserQuestion } from '@kairos/core';
import { parseProfiles, serialiseProfiles } from '../exams/model';
import { SERVER_TIME } from './bankCloud';
import { AI_NOTE_QID, clipUtf16, normaliseAiRef } from './aiNotes';
import { chunkOps } from './batching';
import { imageIdsOf, startOfLocalDay, toStoredQuestion, type BankStore } from './bank';
import type { FirestoreStore } from './FirestoreStore';
import { ONBOARDING_KEYS, type LocalStore } from './LocalStore';
import { AI_NOTE_MAX, isGuestProfile, type GuestProfile, type UserStore } from './types';

export const SESSION_CAP_DAYS = 60;
export const BATCH_MAX = 400;
/** AI notes can be up to AI_NOTE_MAX chars each: written in small batches to stay under the request size limit. */
export const AI_NOTE_BATCH = 50;
/** firestore.rules limits */
const MAX_EVENTS = 2000;
const MAX_TASKS = 200;
/** questions per upload round (media for the round goes with it; the cloud bank store splits at 400 ops) */
export const BANK_CHUNK = 100;
const DAY_MS = 86_400_000;

/** Optional extras: the guest and cloud question banks. Omit to migrate state docs only. */
export interface MigrationDeps {
  bank?: { local: BankStore; cloud: BankStore };
}

/**
 * copy: guest onboarding fields go to the (not yet onboarded) account profile.
 * kept-account: the account is already onboarded, its exam plan wins and the guest's plan/pace are not copied.
 * none: the guest has no onboarding fields.
 */
export type OnboardingOutcome = 'none' | 'copy' | 'kept-account';

export interface MigrationPlan {
  /** none: nothing local. upload: cloud is empty, safe to upload. ask: cloud has data, ask the user. */
  status: 'none' | 'upload' | 'ask';
  counts: { sessions: number; mocks: number; plans: number; paceLog: number; questions: number; aiNotes: number };
  /** sessions older than 60 days that will not be uploaded */
  skippedSessions: number;
  onboarding: OnboardingOutcome;
}

export interface MigrationResult {
  uploaded: number;
  skippedSessions: number;
  mode: 'new' | 'merge';
  onboarding: OnboardingOutcome;
  /** questions moved to the account this time */
  questionsMoved: number;
  /** questions that stayed on this device (account caps or the daily limit) */
  questionsLeft: number;
}

type Op = { key: string; path: string; data: Record<string, unknown> };
const clean = <T>(x: T): T => JSON.parse(JSON.stringify(x)) as T;

async function gather(local: LocalStore, cutoff: number) {
  const [allSessions, mocks, plans, paceLog, aiNotes] = await Promise.all([
    local.listSessions(), local.listMocks(), local.listPlans(), local.listPaceLog(), local.listAiNotes(),
  ]);
  const sessions = allSessions.filter((s) => s.startedAt >= cutoff);
  return { sessions, mocks, plans, paceLog, aiNotes, skippedSessions: allSessions.length - sessions.length };
}

/** The onboarding fields firestore.rules accept, validated, from a guest profile. Empty object when none. */
export function onboardingFields(p: GuestProfile | null): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (!p) return out;
  if (typeof p.exam === 'string' && p.exam.length > 0 && p.exam.length <= 40) out.exam = p.exam;
  if (p.examDate === null || (typeof p.examDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.examDate))) out.examDate = p.examDate;
  if (p.ambition === 'comfortable' || p.ambition === 'competitive' || p.ambition === 'top') out.ambition = p.ambition;
  if (p.minutesPerWeekday && typeof p.minutesPerWeekday === 'object' && !Array.isArray(p.minutesPerWeekday)) out.minutesPerWeekday = clean(p.minutesPerWeekday);
  if (p.offDay === null || (Number.isInteger(p.offDay) && p.offDay! >= 0 && p.offDay! <= 6)) out.offDay = p.offDay;
  if (Array.isArray(p.chaptersDone)) out.chaptersDone = p.chaptersDone.filter((c) => typeof c === 'string').slice(0, 400);
  if (p.lang === 'en' || p.lang === 'hi') out.lang = p.lang;
  if (typeof p.onboarded === 'boolean') out.onboarded = p.onboarded;
  // exam profiles (rules: profiles is a list of <= 7, activeExam a string of <= 20 chars)
  const profiles = parseProfiles(p.profiles);
  if (profiles.length > 0) {
    out.profiles = serialiseProfiles(profiles);
    if (typeof p.activeExam === 'string' && p.activeExam.length > 0 && p.activeExam.length <= 20) out.activeExam = p.activeExam;
  }
  return out;
}

async function guestOnboarding(local: LocalStore) {
  const p = await local.getProfile();
  const fields = isGuestProfile(p) ? onboardingFields(p) : {};
  return { fields, has: Object.keys(fields).length > 0 && ONBOARDING_KEYS.some((k) => k in fields) };
}

async function onboardingOutcome(local: LocalStore, cloud: FirestoreStore, meta: { migratedTo?: string }): Promise<OnboardingOutcome> {
  if (meta.migratedTo === cloud.uid) return 'none';
  const g = await guestOnboarding(local);
  if (!g.has) return 'none';
  const cp = await cloud.getProfile();
  return cp && (cp as { onboarded?: boolean }).onboarded === true ? 'kept-account' : 'copy';
}

export async function inspectMigration(local: LocalStore, cloud: FirestoreStore, now = Date.now(), deps: MigrationDeps = {}): Promise<MigrationPlan> {
  const meta = await local.getMeta();
  // after a finished run for this account, questions left on the device (caps) are not offered again
  const questions = deps.bank && meta.migratedTo !== cloud.uid ? (await deps.bank.local.listQuestions()).length : 0;
  const onboarding = await onboardingOutcome(local, cloud, meta);
  if (!(await local.hasData()) && questions === 0 && onboarding === 'none') {
    return { status: 'none', counts: { sessions: 0, mocks: 0, plans: 0, paceLog: 0, questions: 0, aiNotes: 0 }, skippedSessions: 0, onboarding: 'none' };
  }
  const g = await gather(local, now - SESSION_CAP_DAYS * DAY_MS);
  const status = (await cloud.hasData()) ? 'ask' : 'upload';
  return {
    status,
    counts: { sessions: g.sessions.length, mocks: g.mocks.length, plans: g.plans.length, paceLog: g.paceLog.length, questions, aiNotes: g.aiNotes.length },
    skippedSessions: g.skippedSessions,
    onboarding,
  };
}

/**
 * Move the guest bank to the account. Caps (core/byo quota): 2000 questions, 300 images, 300 new questions
 * per day (counted like the client does, by created_at). Most recent questions first; the rest stay local.
 * Media docs are create-only: CloudBankStore.save skips ids that already exist. Progress is recorded in
 * meta.migratedIds (`bank/<qid>`, `media/<id>`) after every round, local bank data is removed only for
 * what is confirmed uploaded (everything gone => clearAll).
 */
async function migrateBank(bank: NonNullable<MigrationDeps['bank']>, done: Record<string, true>, saveDone: () => Promise<void>, now: number) {
  const localQs = await bank.local.listQuestions();
  if (localQs.length === 0) return { moved: 0, left: 0 };
  const cloudQs = await bank.cloud.listQuestions();
  const inCloud = new Set(cloudQs.map((q) => q.id));
  const cloudImgs = imageIdsOf(cloudQs);
  const t0 = startOfLocalDay(now);
  const addedToday = cloudQs.filter((q) => q.created_at >= t0).length;
  const slots = Math.max(0, Math.min(MAX_QUESTIONS - cloudQs.length, MAX_NEW_PER_DAY - addedToday));

  const pending = localQs.filter((q) => !inCloud.has(q.id)).sort((a, b) => b.created_at - a.created_at || b.n - a.n);
  const picked: UserQuestion[] = [];
  const pickedImgs = new Set<string>();
  const unsendable = new Set<string>();
  for (const q of pending) {
    if (picked.length >= slots) break;
    if (!checkDocSize(toStoredQuestion({ ...q, owner: 'x' })).ok) { unsendable.add(q.id); continue; }
    const fresh = (q.images ?? []).map((i) => i.id).filter((id) => !cloudImgs.has(id) && !pickedImgs.has(id));
    if (cloudImgs.size + pickedImgs.size + new Set(fresh).size > MAX_IMAGES) continue;
    picked.push(q);
    for (const id of fresh) pickedImgs.add(id);
  }

  const sent = new Set<string>();
  const sentImgs = new Set<string>();
  for (let i = 0; i < picked.length; i += BANK_CHUNK) {
    const chunk = picked.slice(i, i + BANK_CHUNK);
    const media: Array<{ id: string; b64: string; w: number; h: number }> = [];
    for (const id of imageIdsOf(chunk)) {
      if (cloudImgs.has(id) || sentImgs.has(id)) continue;
      const rec = await bank.local.getMediaRecord(id);
      if (rec && rec.b64.length > 0 && rec.b64.length <= MAX_IMAGE_B64_CHARS) media.push({ id, b64: rec.b64, w: rec.w, h: rec.h });
    }
    await bank.cloud.save(chunk, media);
    for (const q of chunk) { sent.add(q.id); done[`bank/${q.id}`] = true; }
    for (const m of media) { sentImgs.add(m.id); done[`media/${m.id}`] = true; }
    await saveDone();
  }

  // local cleanup only for what is in the cloud now
  const uploaded = new Set([...inCloud, ...sent]);
  const keep = localQs.filter((q) => !uploaded.has(q.id));
  if (keep.length === 0) await bank.local.clearAll();
  else {
    const keepImgs = imageIdsOf(keep);
    for (const q of localQs) if (uploaded.has(q.id)) await bank.local.deleteQuestion(q.id);
    for (const id of imageIdsOf(localQs)) if (!keepImgs.has(id)) await bank.local.deleteMedia(id);
  }
  return { moved: sent.size, left: keep.length };
}

/**
 * mode 'new': cloud is empty, upload everything incl. mastery/pace state.
 * mode 'merge': append sessions/mocks/plans/pace_log whose ids are not in the cloud; keep cloud state docs.
 * Onboarding fields: ONE saveProfile with the validated guest fields when the account is not onboarded;
 * when it already is, the account wins and the guest's plans and pace state are not copied.
 * Idempotent: ids uploaded are recorded locally (meta.migratedIds) after each batch, so a retry resumes.
 * On success the local data is cleared and the DB is marked migratedTo: uid.
 */
export async function runMigration(local: LocalStore, cloud: FirestoreStore, uid: string, mode: 'new' | 'merge', now = Date.now(), deps: MigrationDeps = {}): Promise<MigrationResult> {
  const g = await gather(local, now - SESSION_CAP_DAYS * DAY_MS);
  const meta = await local.getMeta();
  const done = meta.migratedIds;
  const saveDone = () => local.setMeta({ ...meta, migratedIds: done });
  const onboarding = await onboardingOutcome(local, cloud, meta);
  const ops: Op[] = [];
  const add = (coll: string, id: string, data: Record<string, unknown>) => {
    const d = clean(data);
    // firestore.rules cap sessions.events at 2000 and plans.tasks at 200: one oversize doc would fail the whole batch forever
    if (coll === 'sessions' && Array.isArray(d.events) && d.events.length > MAX_EVENTS) d.events = d.events.slice(0, MAX_EVENTS);
    if (coll === 'plans' && Array.isArray(d.tasks) && d.tasks.length > MAX_TASKS) d.tasks = d.tasks.slice(0, MAX_TASKS);
    ops.push({ key: `${coll}/${id}`, path: `${coll}/${id}`, data: d });
  };

  const existing = mode === 'merge'
    ? { sessions: await cloud.existingIds('sessions'), mocks: await cloud.existingIds('mocks'), plans: await cloud.existingIds('plans'), pace_log: await cloud.existingIds('pace_log'), ai_notes: await cloud.existingIds('ai_notes') }
    : null;
  const fresh = (coll: 'sessions' | 'mocks' | 'plans' | 'pace_log' | 'ai_notes', id: string) => !existing || !existing[coll].has(id);
  const keepAccountPlan = onboarding === 'kept-account';

  for (const s of g.sessions) if (fresh('sessions', s.id)) add('sessions', s.id, s);
  for (const m of g.mocks) if (fresh('mocks', m.id)) add('mocks', m.id, m);
  if (!keepAccountPlan) for (const p of g.plans) if (fresh('plans', p.date)) add('plans', p.date, p);
  for (const p of g.paceLog) if (fresh('pace_log', p.date)) add('pace_log', p.date, p);
  if (mode === 'new') {
    for (const d of ['mastery', 'pace', 'roadmap'] as const) {
      if ((d === 'pace' || d === 'roadmap') && keepAccountPlan) continue;
      const st = await local.getState(d);
      if (st) add('state', d, st);
    }
  }

  // onboarding: a single profile write, recorded so a retry does not repeat it
  if (onboarding === 'copy' && !done.profile) {
    await cloud.saveProfile((await guestOnboarding(local)).fields as Parameters<UserStore['saveProfile']>[0]);
    done.profile = true;
    await saveDone();
  }

  const todo = ops.filter((o) => !done[o.key]);
  for (const chunk of chunkOps(todo, BATCH_MAX)) {
    await cloud.batchWrite(chunk.map(({ path, data }) => ({ path, data })));
    for (const o of chunk) done[o.key] = true;
    await saveDone();
  }

  // AI notes: one doc per qid, updatedAt stamped by the server (SERVER_TIME placeholder, swapped by the adapter)
  const noteOps: Op[] = g.aiNotes
    .filter((n) => AI_NOTE_QID.test(n.qid) && fresh('ai_notes', n.qid))
    .flatMap((n) => {
      const text = clipUtf16(String(n.text ?? '').trim(), AI_NOTE_MAX);
      const data: Record<string, unknown> = { text, provider: n.provider, updatedAt: SERVER_TIME, ...normaliseAiRef(n) };
      if (typeof n.savedAt === 'number' && Number.isInteger(n.savedAt) && n.savedAt > 0) data.savedAt = Math.min(n.savedAt, Date.now());
      else if (Number.isInteger(n.updatedAt) && n.updatedAt > 0) data.savedAt = Math.min(n.updatedAt, Date.now());
      return text.length > 0 ? [{ key: `ai_notes/${n.qid}`, path: `ai_notes/${n.qid}`, data }] : [];
    });
  for (const chunk of chunkOps(noteOps.filter((o) => !done[o.key]), AI_NOTE_BATCH)) {
    await cloud.batchWrite(chunk.map(({ path, data }) => ({ path, data })));
    for (const o of chunk) done[o.key] = true;
    await saveDone();
  }

  const bank = deps.bank ? await migrateBank(deps.bank, done, saveDone, now) : { moved: 0, left: 0 };

  await local.setMeta({ migratedIds: done, migratedTo: uid });
  await local.clearData();
  if (onboarding !== 'none') await local.clearOnboardingFields();
  await local.setMeta({ migratedIds: {}, migratedTo: uid });
  return { uploaded: todo.length, skippedSessions: g.skippedSessions, mode, onboarding, questionsMoved: bank.moved, questionsLeft: bank.left };
}

export async function discardLocal(local: LocalStore, bank?: BankStore): Promise<void> {
  await local.clearData();
  await bank?.clearAll();
}
