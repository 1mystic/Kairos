import { useCallback, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { legendCounts, paletteReducer, statuses, type PaletteAction, type PaletteState, type PaletteStatus, type Response } from '@kairos/core';
import { ContentHtml } from '../components/QuestionView';
import { Keypad } from './Keypad';
import { Calculator } from './calculator/Calculator';
import { fmtMarks, typeName, sectionFullLabel, sectionTitle, subjectTitle, wantsCalculator, wrongText } from './labels';
import { formatClock, type Attempt, type ExamModel, type FocusEntry, type Lang } from './model';
import type { AttemptStore } from './attemptStore';
import { enterFullscreen, isFullscreen } from './fullscreen';
import './cbt.css';

type Act = PaletteAction extends infer A ? (A extends { now: number } ? Omit<A, 'now'> : never) : never;

export const STATUS_LABEL: Record<PaletteStatus, string> = {
  not_visited: 'Not Visited',
  not_answered: 'Not Answered',
  answered: 'Answered',
  marked: 'Marked for Review',
  answered_marked: 'Answered & Marked for Review (will be evaluated)',
};

export function PaletteButton({ n, status, current, onClick }: { n: number; status: PaletteStatus; current?: boolean; onClick?(): void }) {
  return (
    <button
      type="button"
      className={`cbt-pal cbt-pal-${status}${current ? ' cbt-pal-current' : ''}`}
      aria-label={`Question ${n}, ${STATUS_LABEL[status]}`}
      aria-current={current ? 'true' : undefined}
      onClick={onClick}
    >
      {n}
    </button>
  );
}

function Countdown({ startedAt, durationMs, clock, onExpire }: { startedAt: number; durationMs: number; clock(): number; onExpire(): void }) {
  const [left, setLeft] = useState(() => Math.max(0, durationMs - (clock() - startedAt)));
  const expire = useRef(onExpire);
  expire.current = onExpire;
  useEffect(() => {
    // always derived from the start timestamp, never by decrementing
    const tick = () => {
      const l = Math.max(0, durationMs - (clock() - startedAt));
      setLeft((prev) => (Math.ceil(prev / 1000) === Math.ceil(l / 1000) && l > 0 ? prev : l));
      if (l <= 0) expire.current();
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [startedAt, durationMs, clock]);
  return (
    <div className="cbt-timer" role="timer" aria-label="Time left">
      <span className="cbt-timer-label">Time Left</span>
      <span className="cbt-timer-value">{formatClock(left)}</span>
    </div>
  );
}

function CbtModal({ title, onClose, children, actions }: { title: string; onClose(): void; children: ReactNode; actions?: ReactNode }) {
  return (
    <div className="cbt-modal-back" role="presentation">
      <div className="cbt-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="cbt-modal-head">
          <h2>{title}</h2>
          <button type="button" className="cbt-btn" onClick={onClose}>Close</button>
        </div>
        <div className="cbt-modal-body">{children}</div>
        {actions && <div className="cbt-modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function InstructionsBody({ model }: { model: ExamModel }) {
  const secs = model.slots.reduce<Record<string, ExamModel['slots'][number]>>((a, s) => {
    a[`${s.subject}.${s.sectionId}`] ??= s;
    return a;
  }, {});
  return (
    <div className="cbt-instr">
      <h3>General instructions</h3>
      <ol>
        <li>The clock runs on your device and counts down from the moment you press Start. It does not pause, even if you refresh or lose your connection.</li>
        <li>When the time reaches 00:00 your paper is submitted automatically.</li>
        <li>The Question Palette on the right shows the state of every question:</li>
      </ol>
      <ul className="cbt-legend-list">
        {(Object.keys(STATUS_LABEL) as PaletteStatus[]).map((s) => (
          <li key={s}><PaletteButton n={0} status={s} /> {STATUS_LABEL[s]}</li>
        ))}
      </ul>
      <ol start={4}>
        <li>A question marked for review without an answer is not evaluated. If it also has an answer, the answer is evaluated.</li>
        <li>Choose an answer, then press <b>Save &amp; Next</b> to record it. Clicking a number in the palette does not save the selection you have just made.</li>
        <li>For numerical questions use the on-screen keypad. The physical keyboard is disabled.</li>
        <li>Switching tabs or windows is recorded and shown in your report. It is never penalised.</li>
      </ol>
      <h3>Marking scheme</h3>
      <table className="cbt-table">
        <thead><tr><th>Section</th><th>Type</th><th>Questions</th><th>Correct</th><th>Wrong</th><th>Unattempted</th></tr></thead>
        <tbody>
          {Object.entries(secs).map(([k, s]) => (
            <tr key={k}>
              <td>{sectionFullLabel(s.subject, s)}</td>
              <td>{typeName(s.type)}</td>
              <td>{model.slots.filter((x) => x.subject === s.subject && x.sectionId === s.sectionId).length}</td>
              <td>+{fmtMarks(s.marks.correct)}</td>
              <td>{wrongText(s.marks.wrong)}</td>
              <td>{s.marks.blank}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Total time: {Math.round(model.durationMs / 60000)} minutes.</p>
    </div>
  );
}

export interface ExamSessionProps {
  model: ExamModel;
  attempt: Attempt;
  candidateName: string;
  clock: () => number;
  attempts: AttemptStore;
  /** called once, when the reducer reports submitted */
  onSubmitted(state: PaletteState, focusLog: FocusEntry[]): void;
}

export function ExamSession({ model, attempt, candidateName, clock, attempts, onSubmitted }: ExamSessionProps) {
  const [state, dispatch] = useReducer(paletteReducer, attempt.state);
  const [focusLog, setFocusLog] = useState<FocusEntry[]>(attempt.focusLog);
  const [lang, setLang] = useState<Lang>(attempt.lang);
  const [modal, setModal] = useState<null | 'instructions' | 'paper' | 'submit'>(null);
  const [drawer, setDrawer] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);
  const hasCalc = wantsCalculator(model.blueprint);
  const startedAt = attempt.startedAtEpoch;

  const act = useCallback(
    (a: Act) => dispatch({ ...a, now: Math.min(model.durationMs, clock() - startedAt) } as PaletteAction),
    [clock, startedAt, model.durationMs],
  );

  // ---- persistence: debounced <=250ms, flushed when the page is hidden
  const snap = useRef<Attempt>(attempt);
  snap.current = { ...attempt, state, focusLog, lang, savedAtEpoch: clock() };
  const dirty = useRef(false);
  const flush = useCallback(() => {
    if (!dirty.current || snap.current.state.submitted) return; // submit is persisted by the flow
    dirty.current = false;
    void attempts.put({ ...snap.current, savedAtEpoch: clock() });
  }, [attempts, clock]);
  useEffect(() => {
    dirty.current = true;
    const id = setTimeout(flush, 200);
    return () => clearTimeout(id);
  }, [state, focusLog, lang, flush]);
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flush);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flush);
      flush();
    };
  }, [flush]);

  // ---- focus log (tab switches / blur): recorded, never punished
  useEffect(() => {
    let away = false;
    const mark = (type: FocusEntry['type']) => {
      if ((type === 'leave') === away) return;
      away = type === 'leave';
      setFocusLog((l) => [...l, { t: clock() - startedAt, type }]);
    };
    const vis = () => mark(document.visibilityState === 'hidden' ? 'leave' : 'visit');
    const blur = () => mark('leave');
    const focus = () => mark('visit');
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    return () => {
      document.removeEventListener('visibilitychange', vis);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
    };
  }, [clock, startedAt]);

  // ---- Esc out of full screen: keep the exam running, offer a way back in
  const [leftFs, setLeftFs] = useState(false);
  useEffect(() => {
    let was = isFullscreen();
    const onChange = () => {
      const now = isFullscreen();
      if (was && !now) setLeftFs(true);
      if (now) setLeftFs(false);
      was = now;
    };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
    };
  }, []);

  // ---- submit hand-off
  const handed = useRef(false);
  useEffect(() => {
    if (state.submitted && !handed.current) {
      handed.current = true;
      onSubmitted(state, focusLog);
    }
  }, [state, focusLog, onSubmitted]);

  const cur = state.current;
  const q = model.questions[cur]!;
  const slot = model.slots[cur]!;
  const qs = state.questions[cur]!;
  const st = useMemo(() => statuses(state), [state]);
  const counts = useMemo(() => legendCounts(state), [state]);
  const subjects = useMemo(() => [...new Set(model.slots.map((s) => s.subject))], [model]);
  const answeredN = counts.answered + counts.answered_marked;
  const draft = qs.draftAnswer;
  const selected = draft && 'keys' in draft ? draft.keys : [];
  const numeric = slot.type === 'NVQ' || slot.type === 'INT';
  const text = draft && 'value' in draft ? String(draft.value) : '';
  const multi = slot.type === 'MSQ';
  const secLabel = model.slots.filter((s) => s.subject === slot.subject && s.sectionId === slot.sectionId);
  const secNo = slot.sectionIndex + 1;

  const select = (keys: string[]) => act({ type: 'SELECT', answer: { keys } as Response });
  const toggle = (k: string) => select(multi ? (selected.includes(k) ? selected.filter((x) => x !== k) : [...selected, k]) : [k]);
  const goSubject = (code: string) => act({ type: 'OPEN_QUESTION', index: model.slots.findIndex((s) => s.subject === code) });

  const secTitleOf = (code: string, sec: string) => {
    const s = model.slots.find((x) => x.subject === code && x.sectionId === sec)!;
    return sectionTitle(code, s);
  };
  const paletteGrid = (code: string) =>
    [...new Set(model.slots.filter((s) => s.subject === code).map((s) => s.sectionId))].map((sec) => (
      <div key={sec} className="cbt-pal-sec">
        <div className="cbt-pal-sec-title">{secTitleOf(code, sec)}</div>
        <div className="cbt-pal-grid">
          {model.slots.map((s, i) =>
            s.subject === code && s.sectionId === sec ? (
              <PaletteButton key={s.qid} n={i + 1} status={st[i]!} current={i === cur} onClick={() => { act({ type: 'OPEN_QUESTION', index: i }); setDrawer(false); }} />
            ) : null,
          )}
        </div>
      </div>
    ));

  const palette = (
    <aside className={`cbt-side${drawer ? ' open' : ''}`} aria-label="Question palette">
      <div className="cbt-candidate">
        <span className="cbt-avatar" aria-hidden="true" />
        <span className="cbt-candidate-name">{candidateName}</span>
      </div>
      <ul className="cbt-legend" aria-label="Legend">
        {(['answered', 'not_answered', 'not_visited', 'marked', 'answered_marked'] as PaletteStatus[]).map((s) => (
          <li key={s}>
            <span className={`cbt-pal cbt-pal-${s} cbt-pal-legend`} data-testid={`legend-${s}`}>{counts[s]}</span>
            <span>{STATUS_LABEL[s].replace(' (will be evaluated)', '')}</span>
          </li>
        ))}
      </ul>
      <div className="cbt-pal-scroll">
        <div className="cbt-pal-subject">{subjectTitle(slot.subject)}</div>
        {paletteGrid(slot.subject)}
        {subjects.filter((c) => c !== slot.subject).map((c) => (
          <div key={c}>
            <div className="cbt-pal-subject">{subjectTitle(c)}</div>
            {paletteGrid(c)}
          </div>
        ))}
      </div>
      <div className="cbt-side-actions">
        <button type="button" className="cbt-btn" onClick={() => setModal('paper')}>Question Paper</button>
        <button type="button" className="cbt-btn" onClick={() => setModal('instructions')}>Instructions</button>
        <button type="button" className="cbt-btn cbt-drawer-close" onClick={() => setDrawer(false)}>Close palette</button>
      </div>
    </aside>
  );

  return (
    <div className="cbt-root" data-testid="exam-screen">
      {leftFs && (
        <div className="cbt-fs-banner" role="status">
          <span>You left full screen. You can go back in.</span>
          <button type="button" className="cbt-btn" onClick={enterFullscreen}>Go full screen</button>
          <button type="button" className="cbt-btn" onClick={() => setLeftFs(false)}>Dismiss</button>
        </div>
      )}
      <header className="cbt-header">
        <div className="cbt-header-id">
          <span className="cbt-avatar" aria-hidden="true" />
          <div>
            <div className="cbt-header-name">{candidateName}</div>
            <div className="cbt-header-exam">{model.title}</div>
          </div>
        </div>
        <div className="cbt-header-right">
          <label className="cbt-lang">
            <span className="cbt-sr">Language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value as Lang)} aria-label="Language">
              <option value="en">English</option>
              <option value="hi">Hindi</option>
            </select>
          </label>
          {hasCalc && (
            <button type="button" className="cbt-btn" aria-pressed={calcOpen} onClick={() => setCalcOpen((v) => !v)}>Calculator</button>
          )}
          <Countdown startedAt={startedAt} durationMs={model.durationMs} clock={clock} onExpire={() => act({ type: 'SUBMIT', reason: 'auto' })} />
        </div>
      </header>
      <nav className="cbt-tabs" role="tablist" aria-label="Subjects">
        {subjects.map((c) => (
          <button key={c} role="tab" aria-selected={c === slot.subject} className={`cbt-tab${c === slot.subject ? ' active' : ''}`} onClick={() => goSubject(c)}>
            {subjectTitle(c)}
          </button>
        ))}
      </nav>
      <div className="cbt-body">
        <main className="cbt-question" aria-label="Question">
          <div className="cbt-qhead">
            <div>
              <b>Question {cur + 1}</b> <span className="cbt-muted">· {sectionTitle(slot.subject, slot)} · {secNo} of {secLabel.length} · {typeName(slot.type)}</span>
            </div>
            <div className="cbt-marks">
              <span className="cbt-plus">+{fmtMarks(slot.marks.correct)}</span> <span className="cbt-minus">{fmtMarks(slot.marks.wrong)}</span>
              {slot.marks.wrong === 0 && slot.type !== 'SCQ' && <span className="cbt-muted"> · no negative marking</span>}
              {multi && <span className="cbt-muted"> · all-or-nothing</span>}
            </div>
          </div>
          <div className="cbt-qbody" key={q.id}>
            {q.passage ? <ContentHtml markdown={q.passage} images={q.images} className="cbt-passage" /> : null}
            <ContentHtml markdown={q.stem} images={q.images} className="cbt-stem" />
            {numeric ? (
              <Keypad value={text} onChange={(v) => act({ type: 'SELECT', answer: { value: v } })} />
            ) : (
              <div role={multi ? 'group' : 'radiogroup'} aria-label="Options" className="cbt-options">
                {(q.options ?? []).map((o) => (
                  <label key={o.key} className={`cbt-option${selected.includes(o.key) ? ' on' : ''}`}>
                    <input type={multi ? 'checkbox' : 'radio'} name={`opt-${q.id}`} checked={selected.includes(o.key)} onChange={() => toggle(o.key)} />
                    <span className="cbt-option-key">{o.key}</span>
                    <ContentHtml markdown={o.text} images={q.images} as="span" className="cbt-option-text" />
                  </label>
                ))}
              </div>
            )}
          </div>
        </main>
        {palette}
      </div>
      <footer className="cbt-actions">
        <div className="cbt-actions-main">
          <button type="button" className="cbt-btn cbt-btn-primary" onClick={() => act({ type: 'SAVE_NEXT' })}>Save &amp; Next</button>
          <button type="button" className="cbt-btn cbt-btn-review" onClick={() => act({ type: 'SAVE_MARK_NEXT' })}>Save &amp; Mark for Review</button>
          <button type="button" className="cbt-btn" onClick={() => act({ type: 'CLEAR_RESPONSE' })}>Clear Response</button>
          <button type="button" className="cbt-btn cbt-btn-review" onClick={() => act({ type: 'MARK_NEXT' })}>Mark for Review &amp; Next</button>
        </div>
        <div className="cbt-actions-nav">
          <button type="button" className="cbt-btn" onClick={() => act({ type: 'BACK' })} disabled={cur === 0}>Back</button>
          <button type="button" className="cbt-btn" onClick={() => act({ type: 'NEXT' })} disabled={cur === model.slots.length - 1}>Next</button>
          <button type="button" className="cbt-btn cbt-drawer-open" onClick={() => setDrawer(true)}>Palette ({answeredN} answered)</button>
          <button type="button" className="cbt-btn cbt-btn-submit" onClick={() => setModal('submit')}>Submit</button>
        </div>
      </footer>
      {hasCalc && calcOpen && <Calculator onClose={() => setCalcOpen(false)} />}
      {drawer && <button type="button" className="cbt-scrim" aria-label="Close palette" onClick={() => setDrawer(false)} />}

      {modal === 'instructions' && (
        <CbtModal title="Instructions" onClose={() => setModal(null)}>
          <InstructionsBody model={model} />
        </CbtModal>
      )}
      {modal === 'paper' && (
        <CbtModal title="Question Paper" onClose={() => setModal(null)}>
          <table className="cbt-table">
            <thead><tr><th>Subject</th><th>Section</th><th>Questions</th><th>Answered</th><th>Marked</th><th>Not visited</th></tr></thead>
            <tbody>
              {[...new Set(model.slots.map((s) => `${s.subject}.${s.sectionId}`))].map((k) => {
                const idx = model.slots.map((s, i) => (`${s.subject}.${s.sectionId}` === k ? i : -1)).filter((i) => i >= 0);
                const n = (f: (s: PaletteStatus) => boolean) => idx.filter((i) => f(st[i]!)).length;
                return (
                  <tr key={k}>
                    <td>{subjectTitle(k.split('.')[0]!)}</td><td>{secTitleOf(k.split('.')[0]!, k.split('.').slice(1).join('.'))}</td><td>{idx.length}</td>
                    <td>{n((s) => s === 'answered' || s === 'answered_marked')}</td>
                    <td>{n((s) => s === 'marked' || s === 'answered_marked')}</td>
                    <td>{n((s) => s === 'not_visited')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CbtModal>
      )}
      {modal === 'submit' && (
        <CbtModal
          title="Submit your paper?"
          onClose={() => setModal(null)}
          actions={
            <>
              <button type="button" className="cbt-btn" onClick={() => setModal(null)}>Go back to the paper</button>
              <button type="button" className="cbt-btn cbt-btn-submit" onClick={() => { setModal(null); act({ type: 'SUBMIT', reason: 'manual' }); }}>Yes, submit</button>
            </>
          }
        >
          <table className="cbt-table" aria-label="Summary">
            <tbody>
              <tr><th>Answered</th><td data-testid="sum-answered">{answeredN}</td></tr>
              <tr><th>Not answered</th><td data-testid="sum-not-answered">{counts.not_answered + counts.marked}</td></tr>
              <tr><th>Marked for review</th><td data-testid="sum-marked">{counts.marked + counts.answered_marked}</td></tr>
              <tr><th>Not visited</th><td data-testid="sum-not-visited">{counts.not_visited}</td></tr>
            </tbody>
          </table>
          <p>You cannot change anything after you submit.</p>
        </CbtModal>
      )}
    </div>
  );
}
