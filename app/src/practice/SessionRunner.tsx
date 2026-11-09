import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '@kairos/core';
import { QuestionView } from '../components/QuestionView';
import { CheckIcon, CloseIcon, ClockIcon } from '../components/icons';
import { Banner, Button, Card, Chip, Columns, Input, Modal, ProgressBar } from '../components/ui';
import { saveQuietly, type BufferedSession, type SessionBuffer } from './buffer';
import {
  REASON_CHIPS,
  SELF_RIGHT,
  SELF_WRONG,
  checkAnswer,
  correctAnswerText,
  isMine,
  valueToResponse,
} from './finish';
import { isSelfCheck } from './queue';
import { SessionRecorder, isMarked, lastAnswer } from './recorder';
import type { KairosEvent } from '@kairos/core';

export interface RunnerProps {
  questions: Question[];
  /** session identity + config (written to the buffer on every step) */
  base: Omit<BufferedSession, 'index' | 'events' | 'reasons' | 'checked' | 'qids' | 'updatedAt'>;
  /** resume from a buffered session */
  initial?: BufferedSession | null;
  buffer: SessionBuffer;
  clock?: () => number;
  /** called exactly once, when the student finishes or ends the session */
  onFinish(r: { events: KairosEvent[]; reasons: Record<string, string>; endedAt: number }): void;
  /** leave now and resume later: progress is already in the buffer */
  onLeave?(): void;
}

const fmt = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Keep only number characters; typographic minus signs (U+2212, en/em dash) become '-' so "−2" is not read as 2. */
export function cleanNumeric(raw: string): string {
  return raw.replace(/[\u2212\u2012\u2013\u2014]/g, '-').replace(/[^0-9eE+\-.]/g, '');
}

/** Per-question time limit in timed mode: twice the median, kept between 1 and 4 minutes. */
export function timeLimitMs(q: Question): number {
  const m = (q.difficulty?.median_time_s ?? 60) * 2000;
  return Math.min(240_000, Math.max(60_000, m));
}

export function SessionRunner({ questions, base, initial, buffer, clock = Date.now, onFinish, onLeave }: RunnerProps) {
  const [confirmEnd, setConfirmEnd] = useState(false);
  const timed = base.mode === 'timed';
  const rec = useRef<SessionRecorder | null>(null);
  rec.current ??= new SessionRecorder(clock, initial?.events ?? []);
  const r = rec.current;

  const [index, setIndex] = useState(initial?.index ?? 0);
  const [reasons, setReasons] = useState<Record<string, string>>(initial?.reasons ?? {});
  const [checked, setChecked] = useState<string[]>(initial?.checked ?? []);
  const [answer, setAnswer] = useState('');
  const [paused, setPaused] = useState(false);
  const [, force] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const done = useRef(false);
  const visited = useRef<string | null>(null);
  // time spent on the open question: accumulated before `since`, plus the running span
  const acc = useRef(0);
  const since = useRef<number | null>(null);

  const q = questions[index];
  const isChecked = !!q && checked.includes(q.id);
  const selfCheck = !!q && isSelfCheck(q);
  const [revealed, setRevealed] = useState(false);
  const verdict = q && isChecked && !selfCheck ? checkAnswer(q, answer === '' ? null : valueToResponse(q, answer)) : null;
  const isNumeric = q?.type === 'NVQ' || q?.type === 'INT';
  const selected = useMemo(() => (q && !isNumeric && answer ? answer.split(',') : []), [q, isNumeric, answer]);
  const flagged = q ? isMarked(r.events, q.id) : false;

  const persist = useCallback(
    (over: Partial<BufferedSession> = {}) => {
      saveQuietly(buffer, {
        ...base,
        qids: questions.map((x) => x.id),
        index,
        events: r.events,
        reasons,
        checked,
        updatedAt: clock(),
        ...over,
      });
    },
    [buffer, base, questions, index, reasons, checked, r, clock],
  );

  // entering a question: derive its answer, open its time span
  useEffect(() => {
    if (!q || visited.current === q.id) return;
    visited.current = q.id;
    setAnswer(lastAnswer(r.events, q.id));
    setRevealed(false);
    setTimedOut(false);
    acc.current = 0;
    if (!checked.includes(q.id)) {
      r.visit(q.id);
      since.current = clock();
    } else since.current = null;
    persist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  // ticking clock
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(acc.current + (since.current === null ? 0 : clock() - since.current));
    }, 250);
    return () => clearInterval(t);
  }, [clock]);

  const stopClock = () => {
    if (since.current !== null) acc.current += clock() - since.current;
    since.current = null;
    setElapsed(acc.current);
  };

  const finish = useCallback(() => {
    if (done.current) return;
    done.current = true;
    if (q && !checked.includes(q.id) && !paused) r.leave(q.id);
    onFinish({ events: [...r.events], reasons, endedAt: Date.now() });
  }, [q, checked, paused, r, reasons, onFinish]);

  const setValue = (v: string) => {
    if (!q || isChecked) return;
    setAnswer(v);
    if (v === '') r.clear(q.id);
    else r.select(q.id, v);
    persist();
    force((n) => n + 1);
  };

  const check = useCallback(
    (auto = false) => {
      if (!q || checked.includes(q.id) || paused) return;
      const v = answer.trim();
      if (v !== '') {
        r.save(q.id, v);
        r.submit(q.id);
      } else r.leave(q.id);
      stopClock();
      const nextChecked = [...checked, q.id];
      setChecked(nextChecked);
      let nextReasons = reasons;
      if (auto) {
        setTimedOut(true);
        // "ran out of time" only explains a miss: a typed answer that turned out right needs no reason
        const right = !selfCheck && v !== '' && checkAnswer(q, valueToResponse(q, v)) === 'correct';
        if (!right) {
          nextReasons = { ...reasons, [q.id]: 'time' };
          setReasons(nextReasons);
        }
      }
      persist({ checked: nextChecked, reasons: nextReasons });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [q, checked, paused, answer, reasons, persist],
  );

  /** self-check: log the student's own verdict; scoring and mastery ignore it (see finishSession) */
  const selfGrade = (right: boolean) => {
    if (!q || checked.includes(q.id) || paused) return;
    const v = right ? SELF_RIGHT : SELF_WRONG;
    r.save(q.id, v);
    r.submit(q.id);
    stopClock();
    setAnswer(v);
    const nextChecked = [...checked, q.id];
    setChecked(nextChecked);
    persist({ checked: nextChecked });
  };

  // timed mode: time is up
  useEffect(() => {
    if (timed && q && !selfCheck && !isChecked && !paused && elapsed >= timeLimitMs(q)) check(true);
  }, [timed, q, selfCheck, isChecked, paused, elapsed, check]);

  const goNext = useCallback(() => {
    if (!q) return;
    if (!checked.includes(q.id) && !paused) r.leave(q.id);
    if (index + 1 >= questions.length) {
      finish();
      return;
    }
    setIndex(index + 1);
    persist({ index: index + 1 });
  }, [q, checked, paused, r, index, questions.length, finish, persist]);

  const toggleFlag = () => {
    if (!q) return;
    if (flagged) r.unmark(q.id);
    else r.mark(q.id);
    persist();
    force((n) => n + 1);
  };

  const togglePause = () => {
    if (!q || isChecked || timed) return;
    if (!paused) {
      r.leave(q.id);
      stopClock();
    } else {
      r.visit(q.id);
      since.current = clock();
    }
    setPaused(!paused);
    persist();
  };

  const pickReason = (id: string) => {
    if (!q) return;
    (document.activeElement as HTMLElement | null)?.blur(); // so Enter moves on instead of re-pressing
    const next = { ...reasons, [q.id]: id };
    setReasons(next);
    persist({ reasons: next });
  };

  // keyboard: 1-4 select, Enter check / next
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!q || paused || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === 'INPUT' && (el as HTMLInputElement).type === 'text';
      if (e.key === 'Enter') {
        if (el?.tagName === 'BUTTON') return; // let the focused button act
        e.preventDefault();
        if (isChecked) goNext();
        else if (!selfCheck && answer.trim() !== '') check();
        return;
      }
      if (typing || isChecked || isNumeric || selfCheck) return;
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
  const limit = timeLimitMs(q);
  const shown = timed ? limit - elapsed : elapsed;
  const last = index + 1 >= questions.length;
  const answered = checked.length;

  const mine = isMine(q);
  const side = (
    <div className="stack-grid" role="group" aria-label="Session progress">
      <Card>
        <div className="stack-card">
          <span className="row-inline text-small text-slate">
            <ClockIcon width={16} height={16} />
            {timed ? 'Time left' : 'Time on this question'}
          </span>
          <span className="text-h1 tabular" aria-live="off" data-testid="timer">
            {fmt(shown)}
          </span>
          {!timed && (
            <Button variant="secondary" onClick={togglePause} disabled={isChecked}>
              {paused ? 'Resume' : 'Pause'}
            </Button>
          )}
          {timed && <span className="text-small text-slate">Timed mode: no pausing.</span>}
        </div>
      </Card>
      <Card>
        <div className="stack-card">
          <span className="text-small text-slate">Questions</span>
          <div className="row-inline">
            {questions.map((x, i) => (
              <span
                key={x.id}
                aria-label={`Question ${i + 1}${checked.includes(x.id) ? ', checked' : i === index ? ', current' : ''}`}
                className={`grid size-s6 place-items-center rounded-pill text-caption font-semibold tabular ${
                  i === index ? 'bg-primary text-surface' : checked.includes(x.id) ? 'bg-primary-50 text-primary' : 'bg-surface-3 text-slate'
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
        </div>
      </Card>
      <Button variant="ghost" onClick={() => setConfirmEnd(true)}>
        End session
      </Button>
    </div>
  );

  const endDialog = confirmEnd && (
    <Modal title="Save your progress and leave?" onClose={() => setConfirmEnd(false)} dismissLabel="Keep practising">
      <div className="stack-card">
        <p className="text-slate">Your answers so far are saved on this device. You can finish now and see your summary, or leave and pick this session up later.</p>
        <div className="stack-label">
          <Button onClick={() => { setConfirmEnd(false); finish(); }}>Finish and see summary</Button>
          {onLeave && <Button variant="secondary" onClick={onLeave}>Resume later</Button>}
          <Button variant="ghost" onClick={() => setConfirmEnd(false)}>Keep practising</Button>
        </div>
      </div>
    </Modal>
  );

  return (
    <>
      <Columns ratio="main-side" sideFrom="lg" side={side}>
        <div className="stack-card">
        <div className="row-between">
          <span className="row-inline">
            <Chip tone="primary">
              Question {index + 1} of {questions.length}
            </Chip>
            {mine && <Chip>{selfCheck ? 'Your question, self-check' : 'Your question'}</Chip>}
          </span>
          <span className="row-inline text-small text-slate lg:hidden">
            <ClockIcon width={16} height={16} />
            <span className="tabular" data-testid="timer-compact">
              {fmt(shown)}
            </span>
            {!timed && (
              <Button size="sm" variant="ghost" onClick={togglePause} disabled={isChecked}>
                {paused ? 'Resume' : 'Pause'}
              </Button>
            )}
          </span>
        </div>
        <ProgressBar value={answered} max={questions.length} label="Session progress" />

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
              <QuestionView
                question={q}
                selected={selected}
                onSelect={isChecked || isNumeric || selfCheck ? undefined : (keys) => setValue([...keys].sort().join(','))}
                showSolution={isChecked || revealed}
              />
              {selfCheck && revealed && !q.solution && (
                <p className="text-small text-slate">No solution saved for this question. Work it out and grade yourself honestly.</p>
              )}
              {isNumeric && !selfCheck && (
                <div className="stack-label">
                  <label htmlFor="numeric-answer" className="text-small font-semibold">
                    Your answer
                  </label>
                  <Input
                    id="numeric-answer"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    value={answer}
                    disabled={isChecked}
                    onChange={(e) => setValue(cleanNumeric(e.target.value))}
                    placeholder="Type a number"
                  />
                </div>
              )}
            </div>
          </Card>
        )}

        {isChecked && selfCheck && (
          <div data-testid="feedback">
            <Banner tone={answer === SELF_RIGHT ? 'good' : 'bad'} icon={answer === SELF_RIGHT ? <CheckIcon className="shrink-0" /> : <CloseIcon className="shrink-0" />} role="status">
              {answer === SELF_RIGHT ? 'Marked as right.' : 'Marked as wrong.'} Self-checked questions are logged but do not change your mastery.
            </Banner>
          </div>
        )}
        {isChecked && !selfCheck && (
          <div className="stack-card" data-testid="feedback">
            <Banner
              tone={verdict === 'correct' ? 'good' : 'bad'}
              icon={verdict === 'correct' ? <CheckIcon className="shrink-0" /> : <CloseIcon className="shrink-0" />}
              role="status"
            >
              {verdict === 'correct'
                ? 'Correct.'
                : timedOut
                  ? `Time is up. The answer is ${correctAnswerText(q)}.`
                  : verdict === 'blank'
                    ? `No answer given. The answer is ${correctAnswerText(q)}.`
                    : `Not quite. The answer is ${correctAnswerText(q)}.`}
            </Banner>
            {verdict !== 'correct' && (
              <div className="stack-label" role="group" aria-label="Why did this go wrong?">
                <span className="text-small text-slate">What happened? One tap, no pressure.</span>
                <div className="row-inline">
                  {REASON_CHIPS.map((c) => (
                    <Button
                      key={c.id}
                      size="sm"
                      variant={reasons[q.id] === c.id ? 'primary' : 'secondary'}
                      aria-pressed={reasons[q.id] === c.id}
                      onClick={() => pickReason(c.id)}
                    >
                      {c.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!paused && selfCheck && !isChecked && (
          <div className="stack-label" role="group" aria-label="Grade yourself">
            <span className="text-small text-slate">
              This question has no answer key, so you grade it. It will not change your mastery.
            </span>
            <div className="row-inline">
              <Button size="sm" variant="secondary" onClick={() => selfGrade(true)}>I got it right</Button>
              <Button size="sm" variant="secondary" onClick={() => selfGrade(false)}>I got it wrong</Button>
            </div>
          </div>
        )}
        {!paused && (
          <div className="row-between">
            <div className="row-inline">
              <Button variant="ghost" onClick={toggleFlag} aria-pressed={flagged}>
                {flagged ? 'Unflag' : 'Flag'}
              </Button>
              {!isChecked && (
                <Button variant="ghost" onClick={goNext}>
                  Skip
                </Button>
              )}
            </div>
            {isChecked ? (
              <Button onClick={goNext}>{last ? 'Finish' : 'Next'}</Button>
            ) : selfCheck ? (
              <Button variant="secondary" onClick={() => setRevealed(!revealed)} aria-pressed={revealed}>
                {revealed ? 'Hide solution' : 'Reveal solution'}
              </Button>
            ) : (
              <Button onClick={() => check()} disabled={answer.trim() === ''}>
                Check
              </Button>
            )}
          </div>
        )}
        <p className="hidden text-caption text-slate lg:block">Keys: 1 to 4 pick an option, Enter checks or moves on.</p>
        <div className="lg:hidden">
          <Button variant="ghost" onClick={() => setConfirmEnd(true)}>
            End session
          </Button>
        </div>
        </div>
      </Columns>
      {endDialog}
    </>
  );
}
