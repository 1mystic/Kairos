import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DIAG_TIME_BUDGET_S, type KairosEvent, type Question } from '@kairos/core';
import { QuestionView } from '../components/QuestionView';
import { ClockIcon } from '../components/icons';
import { Button, Card, Chip, Columns, Input, ProgressBar } from '../components/ui';
import { SessionRecorder, lastAnswer } from '../practice/recorder';
import type { DiagBuffer } from './diagnosticBuffer';
import { DIAG_ITEMS_PER_CHAPTER, gradeOne, nextItem, type DiagAnswer, type DiagBuffered } from './diagnosticCore';

export interface DiagFinish {
  events: KairosEvent[];
  answered: DiagAnswer[];
  activeMs: number;
  endedAt: number;
  /** the questions that were shown (answered, skipped or left open at the end) */
  questions: Question[];
}

export interface RunnerProps {
  bank: Question[];
  chapters: string[];
  base: { id: string; startedAt: number; exam: string };
  initial?: DiagBuffered | null;
  buffer: DiagBuffer;
  clock?: () => number;
  timeBudgetS?: number;
  perChapter?: number;
  /** called exactly once */
  onFinish(r: DiagFinish): void;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/**
 * Cold-start diagnostic (5.9): one question at a time, picked by max information. Exam-like: no
 * instant feedback, answer then Next. Pausing is allowed (this is not an exam). Progress is buffered
 * to IndexedDB after every answer so a refresh resumes at the same point; nothing is written to the
 * user's store until the end.
 */
export function DiagnosticRunner({ bank, chapters, base, initial, buffer, clock = Date.now, timeBudgetS = DIAG_TIME_BUDGET_S, perChapter = DIAG_ITEMS_PER_CHAPTER, onFinish }: RunnerProps) {
  const rec = useRef<SessionRecorder | null>(null);
  if (!rec.current) {
    rec.current = new SessionRecorder(clock, initial?.events ?? []);
    const last = rec.current.events[rec.current.events.length - 1];
    // a question that was open when the page went away: close its time span so away time is not counted
    if (last && last.a !== 'leave' && last.a !== 'submit') rec.current.leave(last.q);
  }
  const r = rec.current;

  const [answered, setAnswered] = useState<DiagAnswer[]>(initial?.answered ?? []);
  const [answer, setAnswer] = useState('');
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(initial?.activeMs ?? 0);
  const done = useRef(false);
  const visited = useRef<string | null>(null);
  const acc = useRef(initial?.activeMs ?? 0);
  const since = useRef<number | null>(null);
  const shown = useRef<Question[]>([]);

  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank]);
  const next = useMemo(() => nextItem({ chapters, bank, answered, activeMs: 0, timeBudgetS, perChapter }), [chapters, bank, answered, timeBudgetS, perChapter]);
  const q = next.done ? undefined : next.question;
  const isNumeric = q?.type === 'NVQ' || q?.type === 'INT';
  const selected = useMemo(() => (q && !isNumeric && answer ? answer.split(',') : []), [q, isNumeric, answer]);
  const target = useMemo(() => {
    const avail = new Set(bank.filter((x) => !!x.answer && x.status !== 'quarantined').map((x) => x.tax?.chapter));
    return Math.max(1, chapters.filter((c) => avail.has(c)).length * perChapter);
  }, [bank, chapters, perChapter]);

  const persist = useCallback(
    (a: DiagAnswer[]) => {
      buffer
        .save({ ...base, chapters, answered: a, events: r.events, activeMs: acc.current + (since.current === null ? 0 : clock() - since.current), updatedAt: clock() })
        .catch(() => {});
    },
    [buffer, base, chapters, r, clock],
  );

  const finish = useCallback(
    (open?: Question) => {
      if (done.current) return;
      done.current = true;
      if (open && !paused && visited.current === open.id) r.leave(open.id);
      const activeMs = acc.current + (since.current === null ? 0 : clock() - since.current);
      onFinish({ events: [...r.events], answered, activeMs, endedAt: Date.now(), questions: [...shown.current] });
    },
    [paused, r, clock, onFinish, answered],
  );

  // entering a question
  useEffect(() => {
    if (!q || visited.current === q.id) return;
    visited.current = q.id;
    if (!shown.current.some((x) => x.id === q.id)) shown.current.push(q);
    setAnswer(lastAnswer(r.events, q.id));
    r.visit(q.id);
    since.current = clock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  // answered questions are part of the shown list after a resume as well
  useEffect(() => {
    for (const a of answered) {
      const x = byId.get(a.qid);
      if (x && !shown.current.some((s) => s.id === x.id)) shown.current.unshift(x);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(() => setElapsed(acc.current + (since.current === null ? 0 : clock() - since.current)), 250);
    return () => clearInterval(t);
  }, [clock]);

  useEffect(() => {
    if (next.done) finish();
  }, [next, finish]);

  const timeUp = elapsed >= timeBudgetS * 1000;
  useEffect(() => {
    if (timeUp) finish(q);
  }, [timeUp, finish, q]);

  const stopClock = () => {
    if (since.current !== null) acc.current += clock() - since.current;
    since.current = null;
    setElapsed(acc.current);
  };

  const setValue = (v: string) => {
    if (!q || paused) return;
    setAnswer(v);
    if (v === '') r.clear(q.id);
    else r.select(q.id, v);
  };

  const advance = useCallback(
    (skip: boolean) => {
      if (!q || paused) return;
      const v = skip ? '' : answer.trim();
      if (v !== '') {
        r.save(q.id, v);
        r.submit(q.id);
      } else r.leave(q.id);
      stopClock();
      const a: DiagAnswer = { qid: q.id, value: v, correct: gradeOne(q, v), skipped: v === '' };
      const list = [...answered, a];
      persist(list);
      visited.current = null;
      setAnswer('');
      setAnswered(list);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, paused, answer, answered, persist],
  );

  const togglePause = () => {
    if (!q) return;
    if (!paused) {
      r.leave(q.id);
      stopClock();
    } else {
      r.visit(q.id);
      since.current = clock();
    }
    setPaused(!paused);
    persist(answered);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || paused || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text';
      if (e.key === 'Enter') {
        if (el?.tagName === 'BUTTON') return;
        e.preventDefault();
        if (answer.trim() !== '') advance(false);
        return;
      }
      if (typing || isNumeric) return;
      const i = Number(e.key) - 1;
      const opt = q.options?.[i];
      if (opt && i >= 0 && i < 4) {
        if (q.type === 'MSQ') {
          const cur = answer ? answer.split(',') : [];
          const nxt = cur.includes(opt.key) ? cur.filter((k) => k !== opt.key) : [...cur, opt.key];
          setValue([...nxt].sort().join(','));
        } else setValue(opt.key);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!q) return null;
  const left = timeBudgetS * 1000 - elapsed;
  const num = answered.length + 1;

  const timerCard = (
    <Card>
      <div className="stack-card">
        <span className="row-inline text-small text-slate">
          <ClockIcon width={16} height={16} />
          Time left
        </span>
        <span className="text-h1 tabular" data-testid="timer">{fmt(left)}</span>
        <Button variant="secondary" onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</Button>
      </div>
    </Card>
  );

  const side = (
    <div className="stack-grid" role="group" aria-label="Diagnostic progress">
      {timerCard}
      <Button variant="ghost" onClick={() => finish(q)}>Finish early</Button>
    </div>
  );

  return (
    <Columns ratio="main-side" sideFrom="lg" side={side}>
      <div className="stack-card">
        <div className="row-between">
          <Chip tone="primary">Question {num} of about {Math.max(target, num)}</Chip>
          <span className="row-inline text-small text-slate lg:hidden">
            <ClockIcon width={16} height={16} />
            <span className="tabular" data-testid="timer-compact">{fmt(left)}</span>
            <Button size="sm" variant="ghost" onClick={togglePause}>{paused ? 'Resume' : 'Pause'}</Button>
          </span>
        </div>
        <ProgressBar value={answered.length} max={Math.max(target, num)} label="Diagnostic progress" />

        {paused ? (
          <Card>
            <div className="stack-card items-center text-center">
              <h2 className="text-h2">Paused</h2>
              <p className="text-slate">Take your time. The question is hidden until you resume.</p>
              <Button onClick={togglePause}>Resume</Button>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="stack-card">
              <QuestionView question={q} selected={selected} onSelect={isNumeric ? undefined : (keys) => setValue([...keys].sort().join(','))} />
              {isNumeric && (
                <div className="stack-label">
                  <label htmlFor="diag-numeric" className="text-small font-semibold">Your answer</label>
                  <Input
                    id="diag-numeric"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={answer}
                    onChange={(e) => setValue(e.target.value.replace(/[^0-9eE+\-.]/g, ''))}
                    placeholder="Type a number"
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {!paused && (
          <div className="row-between">
            <Button variant="ghost" onClick={() => advance(true)}>Not sure, skip</Button>
            <Button onClick={() => advance(false)} disabled={answer.trim() === ''}>Next</Button>
          </div>
        )}
        <p className="hidden text-caption text-slate lg:block">Keys: 1 to 4 pick an option, Enter moves on. No answers are shown until the end.</p>
        <div className="lg:hidden">
          <Button variant="ghost" onClick={() => finish(q)}>Finish early</Button>
        </div>
      </div>
    </Columns>
  );
}
