import { describe, it, expect } from 'vitest';
import {
  createPaletteState,
  paletteReducer as reduce,
  legendCounts,
  statuses,
  statusOf,
  isScored,
  toPaperResponses,
  normalizeResponse,
  type PaletteAction,
  type PaletteState,
} from './palette';

const ids = ['q0', 'q1', 'q2', 'q3'];
const A = { keys: ['A'] };
const B = { keys: ['B'] };
let t = 0;
type Act = PaletteAction extends infer U
  ? U extends unknown
    ? Omit<U, 'now'> & { now?: number }
    : never
  : never;
const run = (s: PaletteState, ...acts: Act[]) =>
  acts.reduce((st, a) => reduce(st, { ...a, now: a.now ?? ++t } as PaletteAction), s);
const fresh = () => createPaletteState(ids, 'mock', 0);

describe('palette reducer', () => {
  it('starts with q0 visited', () => {
    const s = fresh();
    expect(statuses(s)).toEqual(['not_answered', 'not_visited', 'not_visited', 'not_visited']);
    expect(s.events).toEqual([{ t: 0, q: 'q0', a: 'visit', ctx: 'mock' }]);
    expect(() => createPaletteState([])).toThrow();
    expect(createPaletteState(['x']).ctx).toBe('mock');
  });

  it('SELECT then SAVE_NEXT answers and moves on', () => {
    const s = run(fresh(), { type: 'SELECT', answer: A }, { type: 'SAVE_NEXT' });
    expect(s.current).toBe(1);
    expect(s.questions[0]!.savedAnswer).toEqual(A);
    expect(statusOf(s.questions[0]!)).toBe('answered');
    expect(statusOf(s.questions[1]!)).toBe('not_answered');
    expect(s.events.map((e) => e.a)).toEqual(['visit', 'select', 'save', 'leave', 'visit']);
    expect(s.events[1]).toMatchObject({ v: 'A', q: 'q0' });
  });

  it('palette click does NOT save the draft and counts it as lost', () => {
    let s = run(fresh(), { type: 'SELECT', answer: A }, { type: 'OPEN_QUESTION', index: 2 });
    expect(s.current).toBe(2);
    expect(s.questions[0]!.savedAnswer).toBeNull();
    expect(s.questions[0]!.draftAnswer).toBeNull();
    expect(statusOf(s.questions[0]!)).toBe('not_answered');
    expect(s.lostUnsaved).toBe(1);
    expect(statusOf(s.questions[2]!)).toBe('not_answered');
    expect(statusOf(s.questions[1]!)).toBe('not_visited');
    // returning shows nothing selected
    s = run(s, { type: 'OPEN_QUESTION', index: 0 });
    expect(s.questions[0]!.draftAnswer).toBeNull();
    expect(s.lostUnsaved).toBe(1);
  });

  it('palette click keeps previously saved answer; changed draft is lost', () => {
    let s = run(
      fresh(),
      { type: 'SELECT', answer: A },
      { type: 'SAVE_NEXT' },
      { type: 'OPEN_QUESTION', index: 0 },
    );
    expect(s.questions[0]!.draftAnswer).toEqual(A);
    s = run(s, { type: 'SELECT', answer: B }, { type: 'OPEN_QUESTION', index: 3 });
    expect(s.questions[0]!.savedAnswer).toEqual(A);
    expect(s.lostUnsaved).toBe(1);
    // unchanged draft is not a lost event
    s = run(s, { type: 'OPEN_QUESTION', index: 0 }, { type: 'OPEN_QUESTION', index: 1 });
    expect(s.lostUnsaved).toBe(1);
  });

  it('opening the same or invalid index is a no-op', () => {
    const s = fresh();
    expect(run(s, { type: 'OPEN_QUESTION', index: 9 })).toBe(s);
    expect(run(s, { type: 'OPEN_QUESTION', index: -1 })).toBe(s);
    expect(run(s, { type: 'OPEN_QUESTION', index: 0.5 })).toBe(s);
    const same = run(s, { type: 'OPEN_QUESTION', index: 0 });
    expect(same.events).toEqual(s.events);
  });

  it('SAVE_MARK_NEXT gives answered_marked, which is scored', () => {
    const s = run(fresh(), { type: 'SELECT', answer: A }, { type: 'SAVE_MARK_NEXT' });
    expect(statusOf(s.questions[0]!)).toBe('answered_marked');
    expect(isScored('answered_marked')).toBe(true);
    expect(toPaperResponses(s)[0]).toEqual({ answer: A, status: 'answered_marked' });
    expect(legendCounts(s).answered_marked).toBe(1);
    expect(s.events.map((e) => e.a)).toContain('mark');
  });

  it('SAVE_MARK_NEXT with nothing selected is marked (not scored)', () => {
    const s = run(fresh(), { type: 'SAVE_MARK_NEXT' });
    expect(statusOf(s.questions[0]!)).toBe('marked');
    expect(isScored('marked')).toBe(false);
    expect(isScored('not_answered')).toBe(false);
    expect(isScored('not_visited')).toBe(false);
    expect(isScored('answered')).toBe(true);
    expect(s.events.some((e) => e.a === 'save')).toBe(false);
  });

  it('MARK_NEXT marks without saving the draft', () => {
    let s = run(fresh(), { type: 'SELECT', answer: A }, { type: 'MARK_NEXT' });
    expect(statusOf(s.questions[0]!)).toBe('marked');
    expect(s.questions[0]!.savedAnswer).toBeNull();
    expect(s.lostUnsaved).toBe(1);
    expect(s.current).toBe(1);
    // mark on a saved answer keeps it saved => answered_marked
    s = run(
      s,
      { type: 'SELECT', answer: B },
      { type: 'SAVE_NEXT' },
      { type: 'OPEN_QUESTION', index: 1 },
      { type: 'MARK_NEXT' },
    );
    expect(statusOf(s.questions[1]!)).toBe('answered_marked');
    // marking twice emits one mark event
    s = run(s, { type: 'OPEN_QUESTION', index: 1 }, { type: 'MARK_NEXT' });
    expect(s.events.filter((e) => e.a === 'mark' && e.q === 'q1')).toHaveLength(1);
  });

  it('SAVE_NEXT on a marked question unmarks it', () => {
    let s = run(
      fresh(),
      { type: 'MARK_NEXT' },
      { type: 'BACK' },
      { type: 'SELECT', answer: A },
      { type: 'SAVE_NEXT' },
    );
    expect(statusOf(s.questions[0]!)).toBe('answered');
    expect(s.events.some((e) => e.a === 'unmark')).toBe(true);
    s = run(s, { type: 'OPEN_QUESTION', index: 0 });
    expect(s.questions[0]!.marked).toBe(false);
  });

  it('CLEAR_RESPONSE clears draft and saved, keeps mark', () => {
    let s = run(
      fresh(),
      { type: 'SELECT', answer: A },
      { type: 'SAVE_MARK_NEXT' },
      { type: 'BACK' },
    );
    expect(s.questions[0]!.draftAnswer).toEqual(A);
    s = run(s, { type: 'CLEAR_RESPONSE' });
    expect(s.questions[0]).toMatchObject({ savedAnswer: null, draftAnswer: null, marked: true });
    expect(statusOf(s.questions[0]!)).toBe('marked');
    expect(s.events.at(-1)).toMatchObject({ a: 'clear' });
  });

  it('SELECT with empty answer clears the draft; normalises responses', () => {
    const s = run(fresh(), { type: 'SELECT', answer: { keys: [] } });
    expect(s.questions[0]!.draftAnswer).toBeNull();
    expect(s.events.at(-1)!.v).toBeUndefined();
    expect(normalizeResponse({ value: ' ' })).toBeNull();
    expect(normalizeResponse({ value: '2.5' })).toEqual({ value: '2.5' });
    expect(normalizeResponse({ value: 3 })).toEqual({ value: 3 });
    expect(normalizeResponse({ keys: ['B', 'A'] })).toEqual({ keys: ['A', 'B'] });
    expect(normalizeResponse(null)).toBeNull();
  });

  it('numeric answers via SELECT', () => {
    const s = run(fresh(), { type: 'SELECT', answer: { value: '12.5' } }, { type: 'SAVE_NEXT' });
    expect(s.questions[0]!.savedAnswer).toEqual({ value: '12.5' });
    expect(s.events[2]).toMatchObject({ a: 'save', v: '12.5' });
  });

  it('NEXT / BACK navigate and clamp; they drop drafts', () => {
    let s = run(fresh(), { type: 'BACK' });
    expect(s.current).toBe(0);
    s = run(s, { type: 'SELECT', answer: A }, { type: 'NEXT' });
    expect(s.current).toBe(1);
    expect(s.lostUnsaved).toBe(1);
    s = run(s, { type: 'NEXT' }, { type: 'NEXT' }, { type: 'NEXT' });
    expect(s.current).toBe(3);
    s = run(s, { type: 'SELECT', answer: B }, { type: 'SAVE_NEXT' });
    expect(s.current).toBe(3);
    expect(s.questions[3]!.savedAnswer).toEqual(B);
    s = run(s, { type: 'BACK' });
    expect(s.current).toBe(2);
  });

  it('legendCounts adds up', () => {
    const s = run(
      fresh(),
      { type: 'SELECT', answer: A },
      { type: 'SAVE_NEXT' },
      { type: 'MARK_NEXT' },
      { type: 'SELECT', answer: B },
      { type: 'SAVE_MARK_NEXT' },
    );
    expect(legendCounts(s)).toEqual({
      not_visited: 0,
      not_answered: 1,
      answered: 1,
      marked: 1,
      answered_marked: 1,
    });
  });

  it('SUBMIT locks state and ignores further actions', () => {
    let s = run(fresh(), { type: 'SELECT', answer: A }, { type: 'SUBMIT', reason: 'auto' });
    expect(s.submitted).toBe(true);
    expect(s.submitReason).toBe('auto');
    expect(s.lostUnsaved).toBe(1);
    expect(s.events.at(-1)).toMatchObject({ a: 'submit', v: 'auto' });
    const locked = s;
    s = run(
      s,
      { type: 'SELECT', answer: B },
      { type: 'SAVE_NEXT' },
      { type: 'SUBMIT', reason: 'manual' },
    );
    expect(s).toBe(locked);
  });

  it('reducer is pure and events carry now', () => {
    const s0 = fresh();
    const snapshot = JSON.stringify(s0);
    const s1 = reduce(s0, { type: 'SELECT', answer: A, now: 5000 });
    expect(JSON.stringify(s0)).toBe(snapshot);
    expect(s1.events.at(-1)).toEqual({ t: 5000, q: 'q0', a: 'select', v: 'A', ctx: 'mock' });
  });
});
