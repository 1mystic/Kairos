import { useCallback, useEffect, useRef, useState } from 'react';
import type { PaletteState } from '@kairos/core';
import type { UserStore } from '../store';
import { ExamSession, InstructionsBody } from './ExamSession';
import type { AttemptStore } from './attemptStore';
import type { AnswerMap } from './loader';
import {
  buildMockDoc, expireAttempt, gradeAttempt, mockIdFor, newAttempt, resolveAttempt,
  type Attempt, type AttemptResolution, type ExamModel, type FocusEntry, type Lang,
} from './model';
import { enterFullscreen, exitFullscreen } from './fullscreen';
import './cbt.css';

export interface ExamFlowProps {
  model: ExamModel;
  loadAnswers(): Promise<AnswerMap | null>;
  attempts: AttemptStore;
  store: Pick<UserStore, 'putMock'>;
  candidateName: string;
  /** epoch ms. Default Date.now */
  clock?: () => number;
  /** called after the MockDoc is stored and the attempt cleared */
  onFinished(mockId: string): void;
  onNudge?(): void;
  /** fullscreen request on Start; default requests document fullscreen and ignores refusal */
  requestFullscreen?(): void;
}

type Phase =
  | { k: 'loading' }
  | { k: 'resume'; attempt: Attempt }
  | { k: 'instructions' }
  | { k: 'running'; attempt: Attempt }
  | { k: 'saving'; error?: string };

const defaultFullscreen = enterFullscreen;

export function ExamFlow(p: ExamFlowProps) {
  const { model, attempts, store } = p;
  const clock = p.clock ?? Date.now;
  const [phase, setPhase] = useState<Phase>({ k: 'loading' });
  const [lang, setLang] = useState<Lang>('en');
  const [read, setRead] = useState(false);
  const pending = useRef<{ attempt: Attempt; state: PaletteState; focusLog: FocusEntry[] } | null>(null);
  const done = useRef(false);

  const finish = useCallback(
    async (attempt: Attempt, state: PaletteState, focusLog: FocusEntry[]) => {
      exitFullscreen(); // leave full screen as soon as the exam ends, so the result page is a normal page
      setPhase({ k: 'saving' });
      pending.current = { attempt, state, focusLog };
      try {
        const answers = await p.loadAnswers();
        const usedMs = Math.min(model.durationMs, state.events[state.events.length - 1]?.t ?? 0);
        const score = gradeAttempt(model, state, answers);
        const id = mockIdFor(attempt.startedAtEpoch);
        const doc = buildMockDoc({ id, model, state, focusLog, score, answers, submittedAt: clock(), usedMs });
        await store.putMock(id, doc); // single write
        await attempts.delete(model.paperId);
        p.onNudge?.();
        exitFullscreen();
        p.onFinished(id);
      } catch (e) {
        setPhase({ k: 'saving', error: e instanceof Error ? e.message : 'Could not save your attempt.' });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, attempts, store, clock],
  );

  // never leave the student stuck in full screen if they navigate away mid-exam
  useEffect(() => () => exitFullscreen(), []);

  // decide where to start
  useEffect(() => {
    let live = true;
    void attempts.get(model.paperId).then((a) => {
      if (!live) return;
      const r: AttemptResolution = resolveAttempt(a, clock(), model.durationMs);
      if (!a || r === 'none') setPhase({ k: 'instructions' });
      else if (r === 'resume') setPhase({ k: 'resume', attempt: a });
      else {
        const closed = r === 'expired' ? expireAttempt(a, model.durationMs) : a;
        void attempts.put(closed).then(() => live && void finish(closed, closed.state, closed.focusLog));
      }
    });
    return () => {
      live = false;
    };
  }, [attempts, model, clock, finish]);

  const onSubmitted = useCallback(
    (state: PaletteState, focusLog: FocusEntry[]) => {
      if (done.current || phase.k !== 'running') return;
      done.current = true;
      void attempts.put({ ...phase.attempt, state, focusLog }).then(() => finish(phase.attempt, state, focusLog));
    },
    [phase, attempts, finish],
  );

  if (phase.k === 'loading') return <div className="cbt-root cbt-center" role="status">Loading your paper…</div>;

  if (phase.k === 'saving') {
    return (
      <div className="cbt-root cbt-center" role="status">
        {phase.error ? (
          <div className="cbt-card">
            <p>We could not save your attempt: {phase.error}</p>
            <p>Your answers are safe on this device.</p>
            <button type="button" className="cbt-btn cbt-btn-primary" onClick={() => pending.current && void finish(pending.current.attempt, pending.current.state, pending.current.focusLog)}>
              Try again
            </button>
          </div>
        ) : (
          'Submitting and marking your paper…'
        )}
      </div>
    );
  }

  if (phase.k === 'resume') {
    const a = phase.attempt;
    return (
      <div className="cbt-root cbt-center">
        <div className="cbt-card">
          <h1>{model.title}</h1>
          <p>You have an unfinished attempt. The clock kept running while you were away.</p>
          <button type="button" className="cbt-btn cbt-btn-primary" onClick={() => { (p.requestFullscreen ?? defaultFullscreen)(); setPhase({ k: 'running', attempt: a }); }}>
            Resume attempt
          </button>
        </div>
      </div>
    );
  }

  if (phase.k === 'instructions') {
    return (
      <div className="cbt-root cbt-instructions">
        <header className="cbt-header">
          <div className="cbt-header-id">
            <span className="cbt-avatar" aria-hidden="true" />
            <div>
              <div className="cbt-header-name">{p.candidateName}</div>
              <div className="cbt-header-exam">{model.title}</div>
            </div>
          </div>
          <label className="cbt-lang">
            <span className="cbt-sr">Language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
        </header>
        <main className="cbt-instr-main">
          <h1>Instructions</h1>
          <InstructionsBody model={model} />
          {lang === 'hi' && <p className="cbt-muted">Hindi question text is not available yet. Questions will show in English.</p>}
        </main>
        <footer className="cbt-actions cbt-start-bar">
          <label className="cbt-check">
            <input type="checkbox" checked={read} onChange={(e) => setRead(e.target.checked)} />
            <span>I have read and understood the instructions.</span>
          </label>
          <button
            type="button"
            className="cbt-btn cbt-btn-primary"
            disabled={!read}
            onClick={() => {
              (p.requestFullscreen ?? defaultFullscreen)();
              const a = newAttempt(model, clock(), lang);
              void attempts.put(a);
              setPhase({ k: 'running', attempt: a });
            }}
          >
            Start
          </button>
        </footer>
      </div>
    );
  }

  return (
    <ExamSession
      model={model}
      attempt={phase.attempt}
      candidateName={p.candidateName}
      clock={clock}
      attempts={attempts}
      onSubmitted={onSubmitted}
    />
  );
}
