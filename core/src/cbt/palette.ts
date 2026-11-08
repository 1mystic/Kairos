import type { Response } from '../question';

export type PaletteStatus =
  'not_visited' | 'not_answered' | 'answered' | 'marked' | 'answered_marked';
export type EventAction =
  'visit' | 'select' | 'clear' | 'save' | 'mark' | 'unmark' | 'leave' | 'submit';
export type EventCtx = 'mock' | 'practice' | 'plan' | 'review';

/** docs/03 event schema. `t` = ms since session start. */
export interface KairosEvent {
  t: number;
  q: string;
  a: EventAction;
  v?: string;
  ctx: EventCtx;
}

export interface QuestionState {
  visited: boolean;
  savedAnswer: Response | null;
  draftAnswer: Response | null;
  marked: boolean;
}

export interface PaletteState {
  ids: string[];
  ctx: EventCtx;
  current: number;
  questions: QuestionState[];
  /** times an unsaved draft was discarded by navigating away without saving */
  lostUnsaved: number;
  submitted: boolean;
  submitReason: 'manual' | 'auto' | null;
  events: KairosEvent[];
}

export type PaletteAction =
  | { type: 'OPEN_QUESTION'; index: number; now: number }
  | { type: 'SELECT'; answer: Response | null; now: number }
  | { type: 'CLEAR_RESPONSE'; now: number }
  | { type: 'SAVE_NEXT'; now: number }
  | { type: 'SAVE_MARK_NEXT'; now: number }
  | { type: 'MARK_NEXT'; now: number }
  | { type: 'NEXT'; now: number }
  | { type: 'BACK'; now: number }
  | { type: 'SUBMIT'; reason: 'manual' | 'auto'; now: number };

function responseToString(r: Response | null): string | undefined {
  if (!r) return undefined;
  return 'keys' in r ? [...r.keys].sort().join(',') : String(r.value);
}

/** Normalised response: empty selections / empty text become null. */
export function normalizeResponse(r: Response | null): Response | null {
  if (!r) return null;
  if ('keys' in r) return r.keys.length ? { keys: [...r.keys].sort() } : null;
  if (typeof r.value === 'string' && r.value.trim() === '') return null;
  return { value: r.value };
}

function sameResponse(a: Response | null, b: Response | null): boolean {
  return responseToString(a) === responseToString(b);
}

export function createPaletteState(ids: string[], ctx: EventCtx = 'mock', now = 0): PaletteState {
  if (ids.length === 0) throw new Error('palette needs at least one question');
  const questions: QuestionState[] = ids.map(() => ({
    visited: false,
    savedAnswer: null,
    draftAnswer: null,
    marked: false,
  }));
  questions[0] = { ...questions[0]!, visited: true };
  return {
    ids,
    ctx,
    current: 0,
    questions,
    lostUnsaved: 0,
    submitted: false,
    submitReason: null,
    events: [{ t: now, q: ids[0]!, a: 'visit', ctx }],
  };
}

export function statusOf(q: QuestionState): PaletteStatus {
  if (!q.visited) return 'not_visited';
  const answered = q.savedAnswer !== null;
  if (answered && q.marked) return 'answered_marked';
  if (answered) return 'answered';
  if (q.marked) return 'marked';
  return 'not_answered';
}

export function statuses(state: PaletteState): PaletteStatus[] {
  return state.questions.map(statusOf);
}

export type LegendCounts = Record<PaletteStatus, number>;

export function legendCounts(state: PaletteState): LegendCounts {
  const c: LegendCounts = {
    not_visited: 0,
    not_answered: 0,
    answered: 0,
    marked: 0,
    answered_marked: 0,
  };
  for (const q of state.questions) c[statusOf(q)]++;
  return c;
}

/** Whether a status counts toward the score. */
export function isScored(status: PaletteStatus): boolean {
  return status === 'answered' || status === 'answered_marked';
}

/** Per-slot responses ready for `scorePaper`. */
export function toPaperResponses(
  state: PaletteState,
): { answer: Response | null; status: PaletteStatus }[] {
  return state.questions.map((q) => ({ answer: q.savedAnswer, status: statusOf(q) }));
}

// ---- reducer helpers (all pure; return new objects) ----

interface Draft {
  s: PaletteState;
  events: KairosEvent[];
}

function ev(d: Draft, now: number, a: EventAction, v?: string, qi = d.s.current) {
  const e: KairosEvent = { t: now, q: d.s.ids[qi]!, a, ctx: d.s.ctx };
  if (v !== undefined) e.v = v;
  d.events.push(e);
}

function patchQ(s: PaletteState, i: number, p: Partial<QuestionState>): PaletteState {
  const questions = s.questions.slice();
  questions[i] = { ...questions[i]!, ...p };
  return { ...s, questions };
}

/** Discard any unsaved draft on the current question, counting it as lost. */
function discardDraft(d: Draft) {
  const q = d.s.questions[d.s.current]!;
  if (q.draftAnswer !== null && !sameResponse(q.draftAnswer, q.savedAnswer)) {
    d.s = { ...d.s, lostUnsaved: d.s.lostUnsaved + 1 };
  }
  d.s = patchQ(d.s, d.s.current, { draftAnswer: q.savedAnswer });
}

function goTo(d: Draft, now: number, index: number) {
  const target = Math.min(Math.max(index, 0), d.s.ids.length - 1);
  if (target === d.s.current) return;
  ev(d, now, 'leave');
  d.s = patchQ({ ...d.s, current: target }, target, {
    visited: true,
    draftAnswer: d.s.questions[target]!.savedAnswer,
  });
  ev(d, now, 'visit');
}

function save(d: Draft, now: number) {
  const cur = d.s.questions[d.s.current]!;
  d.s = patchQ(d.s, d.s.current, { savedAnswer: cur.draftAnswer });
  if (cur.draftAnswer !== null) ev(d, now, 'save', responseToString(cur.draftAnswer));
}

function mark(d: Draft, now: number) {
  if (!d.s.questions[d.s.current]!.marked) {
    d.s = patchQ(d.s, d.s.current, { marked: true });
    ev(d, now, 'mark');
  }
}

export function paletteReducer(state: PaletteState, action: PaletteAction): PaletteState {
  if (state.submitted) return state;
  const d: Draft = { s: state, events: [] };
  const now = action.now;
  const cur = () => d.s.questions[d.s.current]!;

  switch (action.type) {
    case 'OPEN_QUESTION':
      if (!Number.isInteger(action.index) || action.index < 0 || action.index >= state.ids.length)
        return state;
      // palette click never saves the draft
      discardDraft(d);
      goTo(d, now, action.index);
      break;
    case 'SELECT': {
      const draft = normalizeResponse(action.answer);
      d.s = patchQ(d.s, d.s.current, { draftAnswer: draft });
      ev(d, now, 'select', responseToString(draft));
      break;
    }
    case 'CLEAR_RESPONSE':
      d.s = patchQ(d.s, d.s.current, { draftAnswer: null, savedAnswer: null });
      ev(d, now, 'clear');
      break;
    case 'SAVE_NEXT':
      save(d, now);
      // NTA: saving a question marked for review turns it into plain "answered"
      if (cur().marked) {
        d.s = patchQ(d.s, d.s.current, { marked: false });
        ev(d, now, 'unmark');
      }
      goTo(d, now, d.s.current + 1);
      break;
    case 'SAVE_MARK_NEXT':
      save(d, now);
      mark(d, now);
      goTo(d, now, d.s.current + 1);
      break;
    case 'MARK_NEXT':
      discardDraft(d);
      mark(d, now);
      goTo(d, now, d.s.current + 1);
      break;
    case 'NEXT':
      discardDraft(d);
      goTo(d, now, d.s.current + 1);
      break;
    case 'BACK':
      discardDraft(d);
      goTo(d, now, d.s.current - 1);
      break;
    case 'SUBMIT':
      discardDraft(d);
      ev(d, now, 'submit', action.reason);
      d.s = { ...d.s, submitted: true, submitReason: action.reason };
      break;
  }
  return { ...d.s, events: [...state.events, ...d.events] };
}
