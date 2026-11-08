import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import type { KairosEvent, Manifest, Question } from '@kairos/core';
import { createMemoryBuffer } from './buffer';
import { commitSession, finishSession } from './finish';
import { fakeStore, mkQ } from './fixtures.test-util';
import { PickerView } from './Picker';
import { buildQueue, bOf, isSelfCheck } from './queue';
import { SessionRunner } from './SessionRunner';
import { mergeSources } from './sources';
import { SummaryView } from './Summary';
import type { Taxonomy } from './taxonomy';
import { userBankSource } from '../store/bank';

const manifest = JSON.parse(readFileSync('public/bank/v1/manifest.json', 'utf8')) as Manifest;
const tax = JSON.parse(readFileSync('public/bank/v1/taxonomy.json', 'utf8')) as Taxonomy;

const mine = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  exam: 'JEE_MAIN',
  status: 'user_ok',
  pending_figures: [],
  tax: { subject: 'PHY', chapter: 'PHY.GRAV', topics: [] },
  ...over,
});
const own = (id: string, over: Record<string, unknown> = {}) =>
  mkQ(id, { source: { kind: 'user' }, difficulty: undefined, ...over });
const selfQ = (id: string) => own(id, { answer: undefined, options: undefined, solution: undefined, status: undefined });

describe('picker: My questions', () => {
  const render0 = (qs: ReturnType<typeof mine>[]) =>
    render(<MemoryRouter><PickerView tax={tax} manifest={manifest} myQuestions={qs as never} /></MemoryRouter>);

  it('is hidden with no questions', () => {
    render0([]);
    expect(screen.queryByRole('heading', { name: 'My questions' })).toBeNull();
  });

  it('counts per chapter and links to own-only sessions; self-check is opt-in', async () => {
    render0([mine('u_1'), mine('u_2'), mine('u_3', { status: 'needs_answer' }), mine('u_4', { exam: 'NEET_UG' }), mine('u_5', { dropped: true })]);
    expect(screen.getByRole('heading', { name: 'My questions' })).toBeInTheDocument();
    expect(screen.getByText('2 of your questions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /2 of your questions/ }).getAttribute('href')).toBe('/practice/JEE_MAIN/PHY.GRAV?size=10&mode=relaxed&my=only');
    await userEvent.click(screen.getByRole('checkbox', { name: /Include questions without answers/ }));
    expect(screen.getByText('3 of your questions')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /3 of your questions/ }).getAttribute('href')).toContain('selfcheck=1');
    expect(screen.getByRole('link', { name: 'Practise my questions' }).getAttribute('href')).toBe('/practice/JEE_MAIN/mixed?size=10&mode=relaxed&my=only&selfcheck=1');
  });
});

describe('merged queue', () => {
  it('merges bank and own sources, de-duplicated; self-check kept only on request', async () => {
    const bank = { id: 'bank', label: 'b', load: async () => [mkQ('q1'), mkQ('q2')] };
    const store = { listQuestions: async () => [mine('u_a', { ...own('u_a'), exam: 'JEE_MAIN', status: 'user_ok', pending_figures: [] }), mine('u_b', { ...selfQ('u_b'), exam: 'JEE_MAIN', status: 'needs_answer', pending_figures: [] })] };
    const load = (selfCheckOn: boolean) =>
      mergeSources('m', 'm', [bank, userBankSource(store as never, { includeSelfCheck: selfCheckOn, exam: 'JEE_MAIN' })]).load();
    const plain = await load(false);
    expect(plain.map((q) => q.id)).toEqual(['q1', 'q2', 'u_a']);
    const withSelf = await load(true);
    expect(withSelf.map((q) => q.id)).toContain('u_b');
    expect(buildQueue(withSelf, { size: 10, seed: 1 }).questions.map((q) => q.id)).not.toContain('u_b');
    const q = buildQueue(withSelf, { size: 10, seed: 1, selfCheck: true });
    expect(q.questions.map((x) => x.id)).toContain('u_b');
  });

  it('uses a neutral prior for uncalibrated own questions', () => {
    expect(bOf(own('u_x'))).toBe(0);
    expect(isSelfCheck(selfQ('u_y'))).toBe(true);
    expect(isSelfCheck(own('u_x'))).toBe(false);
  });
});

const ev = (t: number, q: string, a: KairosEvent['a'], v?: string): KairosEvent => ({ t, q, a, ctx: 'practice', ...(v ? { v } : {}) });

describe('finishSession with self-check', () => {
  const qs: Question[] = [mkQ('q1'), selfQ('u_s')];
  const events = [ev(0, 'q1', 'visit'), ev(5000, 'q1', 'save', 'B'), ev(5000, 'q1', 'submit'), ev(5000, 'u_s', 'visit'), ev(9000, 'u_s', 'save', 'self:wrong'), ev(9000, 'u_s', 'submit')];

  it('never feeds self-check into summary, attempts or mastery', () => {
    const withSelf = finishSession({ events, questions: qs, reasons: {}, mastery: null, now: 1e6 });
    const without = finishSession({ events: events.slice(0, 3), questions: [qs[0]!], reasons: {}, mastery: null, now: 1e6 });
    expect(withSelf.summary).toEqual(without.summary);
    expect(withSelf.mastery).toEqual(without.mastery);
    expect(withSelf.attempts.map((a) => a.q)).toEqual(['q1']);
    expect(withSelf.selfChecked).toEqual({ n: 1, right: 0 });
  });

  it('a self-check-only session leaves mastery untouched and still writes once each', async () => {
    const { store, calls, sessions, states } = fakeStore();
    await commitSession(store, { id: 's', startedAt: 0, endedAt: 9, exam: 'JEE_MAIN', chapter: 'PHY.LOM', chapters: ['PHY.LOM'], mode: 'relaxed', my: 'only', selfCheck: true }, { events: events.slice(3), questions: [qs[1]!], reasons: {} });
    expect(calls).toEqual({ addSession: 1, putState: 1 });
    expect(states.mastery).toEqual({});
    expect(sessions[0]!.summary).toMatchObject({ n: 0, selfChecked: 1, selfRight: 0, fromMine: 1 });
    expect(sessions[0]).toMatchObject({ my: 'only', selfCheck: true, events: events.slice(3) });
  });

  it('summary labels questions from your uploads and the self-check tally', async () => {
    const { store, sessions } = fakeStore();
    await commitSession(store, { id: 's', startedAt: 0, endedAt: 9, exam: 'JEE_MAIN', chapter: 'mixed', chapters: [], mode: 'relaxed', my: 'only', selfCheck: true }, { events, questions: qs, reasons: {} });
    render(<MemoryRouter><SummaryView session={sessions[0]!} questions={qs} /></MemoryRouter>);
    expect(screen.getByText('From your questions')).toBeInTheDocument();
    expect(screen.getByText(/Self-checked: 0 of 1 marked right/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Practice this chapter again' }).getAttribute('href')).toBe('/practice/JEE_MAIN/mixed?chapters=&my=only&selfcheck=1');
  });
});

describe('self-check flow in the runner', () => {
  const base = { id: 's1', startedAt: 0, exam: 'JEE_MAIN', chapter: 'mixed', chapters: [], mode: 'relaxed' as const, size: 2, seed: 1 };
  it('reveal solution, grade yourself, no Check button, one write each', async () => {
    const qs = [own('u_s', { answer: undefined, solution: 'worked solution' })];
    const { store, calls, states } = fakeStore();
    const buffer = createMemoryBuffer();
    const onFinish = vi.fn(async (r) => {
      await commitSession(store, { ...base, endedAt: 9 }, { events: r.events, questions: qs, reasons: r.reasons });
    });
    const user = userEvent.setup();
    render(<SessionRunner questions={qs} base={base} buffer={buffer} onFinish={onFinish} />);
    expect(screen.queryByRole('button', { name: 'Check' })).toBeNull();
    expect(screen.queryByText('worked solution')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reveal solution' }));
    expect(screen.getByText('worked solution')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'I got it right' }));
    expect(await screen.findByText(/Marked as right/)).toBeInTheDocument();
    expect(buffer.value!.checked).toEqual(['u_s']);
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1));
    expect(calls).toEqual({ addSession: 1, putState: 1 });
    expect(states.mastery).toEqual({});
    expect(onFinish.mock.calls[0]![0].events.find((e: KairosEvent) => e.a === 'save').v).toBe('self:right');
  });
});
