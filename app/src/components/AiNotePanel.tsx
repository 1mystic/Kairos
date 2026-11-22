import { useEffect, useState } from 'react';
import type { PublicQuestion, Question } from '@kairos/core';
import { PROVIDERS, providerLabel } from '../lib/askAi';
import { useStore } from '../store';
import { aiRefOf, normaliseAiRef } from '../store/aiNotes';
import { AI_NOTE_MAX, type AiNote, type AiNoteRef, type AiProvider } from '../store/types';
import { AskAiButton, lastProvider } from './AskAi';
import { NoteContent } from './NoteContent';
import { Button, Select, Skeleton, Textarea } from './ui';

const when = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * The student's own saved AI explanation for one question (users/{uid}/ai_notes/{qid}): shown under the solution.
 * Text is rendered as markdown + KaTeX through the same safe renderer as solutions (no raw HTML).
 * One store write per save or delete. Works for guests (local) and signed-in users alike.
 */
export function AiNotePanel({ qid, qref, autoEdit, onChange, onClose }: {
  qid: string;
  /** where the question lives (exam, chapter, stem snippet); saved with the note so the Saved page can find it again */
  qref?: AiNoteRef;
  /** open straight in the editor once the note has loaded (Saved page) */
  autoEdit?: boolean;
  /** called after a save (the note) or delete (null) */
  onChange?: (n: AiNote | null) => void;
  /** called when the editor is cancelled */
  onClose?: () => void;
}) {
  const store = useStore();
  const [note, setNote] = useState<AiNote | null | 'loading' | 'error'>('loading');
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [provider, setProvider] = useState<AiProvider>('chatgpt');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [confirming, setConfirming] = useState(false);
  const saved = note === 'error' || note === 'loading' ? null : note;

  useEffect(() => {
    let live = true;
    setNote('loading');
    setEditing(false);
    setConfirming(false);
    store.getAiNote(qid).then((n) => { if (!live) return; setNote(n); if (autoEdit && n) { setText(n.text); setProvider(n.provider); setEditing(true); } }, () => { if (live) setNote('error'); });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- autoEdit only matters when a note is first loaded
  }, [store, qid]);

  const begin = (n: AiNote | null) => {
    setText(n?.text ?? '');
    setProvider(n?.provider ?? lastProvider());
    setErr('');
    setEditing(true);
  };
  const paste = async () => {
    try {
      const t = await navigator.clipboard.readText();
      if (t) setText(t.slice(0, AI_NOTE_MAX + 1));
      else setErr('The clipboard is empty.');
    } catch { setErr('Could not read the clipboard. Paste with Ctrl+V into the box.'); }
  };
  const save = async () => {
    const t = text.trim();
    if (!t || t.length > AI_NOTE_MAX) return;
    setBusy(true);
    setErr('');
    try {
      // keep the reference of a note saved earlier when this call site does not know the question
      const keep = qref ?? (saved ? { exam: saved.exam, chapter: saved.chapter, stem: saved.stem } : undefined);
      const ref = normaliseAiRef(keep);
      if (Object.keys(ref).length) await store.putAiNote(qid, { text: t, provider }, ref);
      else await store.putAiNote(qid, { text: t, provider });
      const next: AiNote = { qid, text: t, provider, updatedAt: Date.now(), ...ref };
      setNote(next);
      setEditing(false);
      onChange?.(next);
    } catch { setErr('Could not save. Try again.'); } finally { setBusy(false); }
  };
  const remove = async () => {
    setBusy(true);
    setErr('');
    try { await store.deleteAiNote(qid); setNote(null); setConfirming(false); onChange?.(null); } catch { setErr('Could not delete. Try again.'); } finally { setBusy(false); }
  };

  if (note === 'loading') return <Skeleton className="h-s7 w-full" />;
  const over = text.length > AI_NOTE_MAX;

  return (
    <section aria-label="Your saved AI explanation" className="card" data-testid="ai-note">
      {note === 'error' && <p role="alert" className="text-small text-accent-ink">Could not load your saved AI explanation.</p>}

      {editing ? (
        <div className="stack-card">
          <label htmlFor={`ai-note-${qid}`} className="text-small font-semibold">Paste the AI answer</label>
          <Textarea id={`ai-note-${qid}`} rows={8} value={text} onChange={(e) => setText(e.target.value)} invalid={over} placeholder="Paste the explanation here. Markdown and $math$ work." />
          <div className="row-between">
            <Button size="sm" variant="secondary" onClick={() => void paste()}>Paste from clipboard</Button>
            <span className={`text-caption tabular ${over ? 'text-accent-ink' : 'text-slate'}`} aria-live="polite">{text.length} / {AI_NOTE_MAX}</span>
          </div>
          <Select aria-label="Which AI wrote it" value={provider} onChange={(e) => setProvider(e.target.value as AiProvider)}>
            {PROVIDERS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            <option value="other">Another AI</option>
          </Select>
          {err && <p role="alert" className="text-small text-accent-ink">{err}</p>}
          <div className="row-inline">
            <Button onClick={() => void save()} loading={busy} disabled={!text.trim() || over}>Save</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); onClose?.(); }} disabled={busy}>Cancel</Button>
          </div>
        </div>
      ) : saved ? (
        <div className="stack-card">
          <h3 className="text-h3">Your saved AI explanation</h3>
          <p className="text-small text-slate">From {providerLabel(saved.provider)} · {when(saved.updatedAt)}</p>
          <NoteContent markdown={saved.text} />
          <p className="text-caption text-slate">AI-generated and not checked by Kairos. It can be wrong: compare it with the official solution.</p>
          {err && <p role="alert" className="text-small text-accent-ink">{err}</p>}
          {confirming ? (
            <div className="row-inline" role="group" aria-label="Confirm delete">
              <span className="text-small">Delete this explanation?</span>
              <Button size="sm" variant="danger" onClick={() => void remove()} loading={busy}>Delete</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Keep it</Button>
            </div>
          ) : (
            <div className="row-inline">
              <Button size="sm" variant="secondary" onClick={() => begin(saved)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>Delete</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="stack-card">
          <p className="text-small text-slate">Got a good explanation from an AI? Save it here to revisit later.</p>
          <div><Button size="sm" variant="secondary" onClick={() => begin(null)}>Paste AI answer</Button></div>
        </div>
      )}
    </section>
  );
}

/** Ask AI + the saved explanation, for screens where the answer is already visible. Never mount this in a live exam. */
export function AiHelp({ question, given, exam }: { question: Question | PublicQuestion; given?: string; exam?: string }) {
  return (
    <div className="stack-card" data-testid="ai-help">
      <AskAiButton question={question} revealed given={given} exam={exam} />
      <AiNotePanel qid={question.id} qref={aiRefOf(question, exam)} />
    </div>
  );
}
