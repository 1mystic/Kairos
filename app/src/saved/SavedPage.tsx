import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import type { Question } from '@kairos/core';
import { getLatestVersion, getShard } from '../bank/client';
import { AiNotePanel } from '../components/AiNotePanel';
import { AlertIcon, BookmarkIcon } from '../components/icons';
import { NoteContent } from '../components/NoteContent';
import { QuestionView } from '../components/QuestionView';
import { Button, Card, CardGrid, Chip, EmptyState, Input, LinkButton, Page, PageHeader, Select, SkeletonCards, SkeletonRows, Tabs } from '../components/ui';
import { providerLabel } from '../lib/askAi';
import { examLabel } from '../plan/syllabus';
import { loadTaxonomy } from '../practice/taxonomy';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import { useStore } from '../store';
import { stemSnippet } from '../store/aiNotes';
import type { AiNote } from '../store/types';
import { examsIn, filterNotes, noteTitle, notePreview, type SortOrder } from './model';
import { getSavedNotes, invalidateSavedNotes } from './notesCache';
import { loadQIndex, needsRef, resolveRefs } from './qindex';
import './saved.css';

const when = (t: number) => new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const SORTS = [{ id: 'newest', label: 'Newest' }, { id: 'oldest', label: 'Oldest' }] as const;

interface ChapterInfo { name: string; subject: string }

/** The original question from its bank shard (needs exam + chapter on the note). */
function useQuestion(note: AiNote, chapters: Record<string, ChapterInfo> | null, on: boolean) {
  const [state, setState] = useState<{ q: Question | null; status: 'idle' | 'loading' | 'done' | 'failed' }>({ q: null, status: 'idle' });
  const subject = note.chapter ? chapters?.[note.chapter]?.subject : undefined;
  useEffect(() => {
    if (!on || !note.exam || !note.chapter || !subject) return;
    let live = true;
    setState((s) => ({ ...s, status: 'loading' }));
    getLatestVersion()
      .then((v) => getShard(v, note.exam!, subject, note.chapter!))
      .then(
        (qs) => { if (live) setState({ q: qs.find((x) => x.id === note.qid) ?? null, status: 'done' }); },
        () => { if (live) setState({ q: null, status: 'failed' }); },
      );
    return () => { live = false; };
  }, [on, note.exam, note.chapter, note.qid, subject]);
  return state;
}

interface CardProps {
  note: AiNote;
  chapters: Record<string, ChapterInfo> | null;
  onChanged: (n: AiNote) => void;
  onDeleted: (qid: string) => void;
}

function SavedCard({ note, chapters, onChanged, onDeleted }: CardProps) {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { q, status } = useQuestion(note, chapters, open && !editing);
  const chapterName = note.chapter ? chapters?.[note.chapter]?.name ?? note.chapter : '';
  const canLoad = !!(note.exam && note.chapter);
  const bodyId = `saved-body-${note.qid}`;

  const remove = async () => {
    setBusy(true);
    setErr('');
    try { await store.deleteAiNote(note.qid); invalidateSavedNotes(); onDeleted(note.qid); } catch { setErr('Could not delete. Try again.'); setBusy(false); }
  };

  return (
    <Card
      as="article"
      aria-label={noteTitle(note)}
      data-testid="saved-note"
      footer={
        confirming ? (
          <div className="row-actions" role="group" aria-label="Confirm delete">
            <span className="text-small">Delete this saved answer?</span>
            <Button size="sm" variant="danger" onClick={() => void remove()} loading={busy}>Delete</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>Keep it</Button>
          </div>
        ) : (
          <div className="row-actions">
            <Button size="sm" variant="secondary" aria-expanded={open} aria-controls={bodyId} onClick={() => { setOpen(!open); setEditing(false); }}>{open ? 'Hide answer' : 'Show answer'}</Button>
            <Button size="sm" variant="secondary" onClick={() => { setOpen(true); setEditing(true); }}>Edit</Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>Delete</Button>
            {note.exam && note.chapter && <LinkButton size="sm" variant="ghost" to={`/practice/${note.exam}/${note.chapter}`}>Practise this chapter</LinkButton>}
          </div>
        )
      }
    >
      <div className="stack-card">
        <div className="row-inline">
          {note.exam && <Chip tone="primary">{examLabel(note.exam)}</Chip>}
          {chapterName && <Chip>{chapterName}</Chip>}
        </div>
        <div className="stack-text">
          <h2 className="text-h3 saved-stem">{noteTitle(note)}</h2>
          <p className="text-small text-slate">From {providerLabel(note.provider)} · {when(note.updatedAt)}</p>
        </div>
        {err && <p role="alert" className="text-small text-accent-ink">{err}</p>}
        {!open && <p className="text-body saved-preview" data-testid="saved-preview">{notePreview(note.text)}</p>}
        {open && (
          <div id={bodyId} className="stack-card">
            {editing ? (
              <AiNotePanel
                qid={note.qid}
                autoEdit
                qref={{ exam: note.exam, chapter: note.chapter, stem: note.stem }}
                onChange={(n) => { if (n) { onChanged({ ...note, ...n }); setEditing(false); } else onDeleted(note.qid); }}
                onClose={() => setEditing(false)}
              />
            ) : (
              <>
                <div className="stack-label">
                  <h3 className="text-small font-semibold">Saved answer</h3>
                  <NoteContent markdown={note.text} />
                  <p className="text-caption text-slate">AI-generated and not checked by Kairos. It can be wrong: compare it with the official solution.</p>
                </div>
                {canLoad && (
                  <div className="stack-label">
                    <h3 className="text-small font-semibold">The question and official solution</h3>
                    {status === 'loading' && <SkeletonRows count={1} />}
                    {status === 'failed' && <p className="text-small text-slate">Could not load the original question. Check your connection and open it again.</p>}
                    {status === 'done' && !q && <p className="text-small text-slate">This question is no longer in the bank.</p>}
                    {q && <QuestionView question={q} variant="review" showSolution />}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/** /saved: every AI answer the student saved, to revise. Guests read from the device, signed-in users from Firestore, both via UserStore. */
export function SavedPage() {
  useDocumentTitle('Saved AI answers');
  const store = useStore();
  const [notes, setNotes] = useState<AiNote[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [chapters, setChapters] = useState<Record<string, ChapterInfo> | null>(null);
  const [topicsOf, setTopicsOf] = useState<Record<string, string[]>>({});
  const [query, setQuery] = useState('');
  const [params, setParams] = useSearchParams();
  const [exam, setExam] = useState(params.get('exam') ?? '');
  const [sort, setSort] = useState<SortOrder>('newest');
  const chapter = params.get('chapter') ?? '';

  const load = useCallback(() => {
    setNotes(null);
    setFailed(false);
    getSavedNotes(store, { fresh: true }).then(setNotes, () => setFailed(true));
  }, [store]);
  useEffect(load, [load]);

  // Old notes carry no exam/chapter: place them through the bank question index (in memory only, never written back)
  const unplaced = useMemo(() => (notes ? notes.filter(needsRef).length : 0), [notes]);
  useEffect(() => {
    if (!unplaced) return;
    let live = true;
    loadQIndex().then((idx) => { if (live) setNotes((cur) => (cur ? resolveRefs(cur, idx) : cur)); }, () => { /* offline: they stay as "Question q_..." */ });
    return () => { live = false; };
  }, [unplaced]);

  // chapter names and subjects (to find the shard); a failure only means ids are shown instead of names
  useEffect(() => {
    let live = true;
    loadTaxonomy().then((tax) => {
      if (!live) return;
      const m: Record<string, ChapterInfo> = {};
      const t: Record<string, string[]> = {};
      for (const s of tax.subjects) for (const c of s.chapters) { m[c.id] = { name: c.name, subject: s.id }; t[c.id] = c.topics.map((x) => x.name); }
      setChapters(m);
      setTopicsOf(t);
    }, () => { if (live) setChapters({}); });
    return () => { live = false; };
  }, []);

  // ... and give them a stem snippet from the question's shard (a few shards at a time)
  const needStem = useMemo(() => (notes && chapters ? notes.filter((n) => !n.stem && n.exam && n.chapter && chapters[n.chapter]).map((n) => n.qid).join(',') : ''), [notes, chapters]);
  useEffect(() => {
    if (!needStem || !notes || !chapters) return;
    let live = true;
    const want = new Set(needStem.split(','));
    const groups = new Map<string, AiNote[]>();
    for (const n of notes) if (want.has(n.qid)) groups.set(`${n.exam}/${n.chapter}`, [...(groups.get(`${n.exam}/${n.chapter}`) ?? []), n]);
    void (async () => {
      const queue = [...groups.values()];
      const worker = async () => {
        for (let g = queue.shift(); g && live; g = queue.shift()) {
          const first = g[0]!;
          try {
            const qs = await getShard(await getLatestVersion(), first.exam!, chapters[first.chapter!]!.subject, first.chapter!);
            const stems = new Map(qs.map((q) => [q.id, stemSnippet(q.stem)] as const));
            if (live) setNotes((cur) => (cur ?? []).map((n) => (!n.stem && want.has(n.qid) && n.exam === first.exam && n.chapter === first.chapter && stems.get(n.qid) ? { ...n, stem: stems.get(n.qid) } : n)));
          } catch { /* leave the title as "Question q_..." */ }
        }
      };
      await Promise.all([worker(), worker(), worker()]);
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- needStem encodes which notes still lack a stem
  }, [needStem, chapters]);

  const names = useMemo(() => Object.fromEntries(Object.entries(chapters ?? {}).map(([id, c]) => [id, c.name])), [chapters]);
  const shown = useMemo(() => (notes ? filterNotes(notes, { query, exam, chapter, sort, chapterNames: names, topicNames: topicsOf }) : []), [notes, query, exam, chapter, sort, names, topicsOf]);
  const exams = useMemo(() => (notes ? examsIn(notes) : []), [notes]);
  const filtering = query.trim() !== '' || exam !== '' || chapter !== '';
  const clearChapter = () => setParams((p) => { const n = new URLSearchParams(p); n.delete('chapter'); return n; }, { replace: true });

  return (
    <Page width="reading">
      <PageHeader title="Saved AI answers" subtitle="Explanations you pasted after Ask AI, to revise before the exam." />

      {failed ? (
        <EmptyState icon={AlertIcon} title="Could not load your saved answers" action={<Button onClick={load}>Try again</Button>}>
          Check your connection and try again.
        </EmptyState>
      ) : notes === null ? (
        <SkeletonCards count={3} cols={1} />
      ) : notes.length === 0 ? (
        <EmptyState icon={BookmarkIcon} title="No saved AI answers yet" action={<LinkButton to="/practice">Start practising</LinkButton>}>
          Answer a question, tap Ask AI under the solution, then paste the explanation you like. Everything you save shows up here.
        </EmptyState>
      ) : (
        <>
          <div className="row-between">
            <div className="saved-filter-search">
              <Input type="search" aria-label="Search saved answers" placeholder="Search questions and answers" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            {exams.length > 0 && (
              <div className="saved-filter-exam">
                <Select aria-label="Filter by exam" value={exam} onChange={(e) => setExam(e.target.value)}>
                  <option value="">All exams</option>
                  {exams.map((x) => <option key={x} value={x}>{examLabel(x)}</option>)}
                </Select>
              </div>
            )}
            <Tabs label="Sort order" tabs={SORTS} value={sort} onChange={(id) => setSort(id as SortOrder)} />
          </div>
          {chapter && (
            <div className="row-inline" data-testid="chapter-filter">
              <Chip tone="primary">Chapter: {names[chapter] ?? chapter}</Chip>
              <Button size="sm" variant="ghost" onClick={clearChapter} aria-label="Remove chapter filter">Remove filter</Button>
            </div>
          )}
          <p className="text-small text-slate" role="status">{shown.length} of {notes.length} saved {notes.length === 1 ? 'answer' : 'answers'}</p>
          {shown.length === 0 ? (
            <EmptyState icon={BookmarkIcon} title="No matches" action={filtering ? <Button variant="secondary" onClick={() => { setQuery(''); setExam(''); clearChapter(); }}>Clear filters</Button> : undefined}>
              Nothing saved matches that search.
            </EmptyState>
          ) : (
            <CardGrid cols={1}>
              {shown.map((n) => (
                <SavedCard
                  key={n.qid}
                  note={n}
                  chapters={chapters}
                  onChanged={(x) => setNotes((cur) => (cur ?? []).map((y) => (y.qid === x.qid ? x : y)))}
                  onDeleted={(qid) => setNotes((cur) => (cur ?? []).filter((y) => y.qid !== qid))}
                />
              ))}
            </CardGrid>
          )}
        </>
      )}
    </Page>
  );
}
