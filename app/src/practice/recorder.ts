import type { KairosEvent } from '@kairos/core';

/**
 * In-memory event log for one practice session (docs/03 event schema, ctx 'practice').
 * `t` is ms since session start. After a resume the clock continues from the last event so
 * time spent away does not count towards the open question.
 */
export class SessionRecorder {
  readonly events: KairosEvent[];
  private base: number;

  constructor(
    private clock: () => number = Date.now,
    events: KairosEvent[] = [],
    private onChange?: (events: readonly KairosEvent[]) => void,
  ) {
    this.events = [...events];
    const last = this.events.length ? this.events[this.events.length - 1]!.t : 0;
    this.base = clock() - last;
  }

  /** ms since session start (continuous across resumes) */
  now(): number {
    return this.clock() - this.base;
  }

  private push(q: string, a: KairosEvent['a'], v?: string): void {
    const e: KairosEvent = { t: this.now(), q, a, ctx: 'practice' };
    if (v !== undefined) e.v = v;
    this.events.push(e);
    this.onChange?.(this.events);
  }

  visit(q: string) {
    this.push(q, 'visit');
  }
  select(q: string, v: string) {
    this.push(q, 'select', v);
  }
  clear(q: string) {
    this.push(q, 'clear');
  }
  save(q: string, v: string) {
    this.push(q, 'save', v);
  }
  mark(q: string) {
    this.push(q, 'mark');
  }
  unmark(q: string) {
    this.push(q, 'unmark');
  }
  leave(q: string) {
    this.push(q, 'leave');
  }
  submit(q: string) {
    this.push(q, 'submit');
  }
}

/** Current answer string for a question, derived from the event log (select/save set, clear resets). */
export function lastAnswer(events: readonly KairosEvent[], qid: string): string {
  let v = '';
  for (const e of events) {
    if (e.q !== qid) continue;
    if (e.a === 'select' || e.a === 'save') v = e.v ?? '';
    else if (e.a === 'clear') v = '';
  }
  return v;
}

export function isMarked(events: readonly KairosEvent[], qid: string): boolean {
  let m = false;
  for (const e of events) if (e.q === qid) m = e.a === 'mark' ? true : e.a === 'unmark' ? false : m;
  return m;
}
