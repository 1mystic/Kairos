import { useMemo, useState } from 'react';
import type { Issue, UserQuestion } from '@kairos/core';
import { Banner, Button, Card, SelectField, Tabs } from '../components/ui';
import { AlertIcon, CheckIcon } from '../components/icons';
import { checkSaveQuota, imageIdsOf, type BankStore } from '../store/bank';
import type { CropToWebp } from './crop';
import type { PageImage } from './pages';
import { QuestionCard } from './QuestionCard';
import { categorize, summarize, summaryText } from './review';
import { chapterGroups } from './taxonomy';
import type { ReviewState } from './useReview';
import { useMediaUrls } from './UserQuestionPreview';
import { reportUpload } from '../telemetry';

export interface SaveOutcome {
  saved: number;
  selfCheck: number;
}

const PAGE = 20;
type Filter = 'all' | 'ready' | 'needs_answer' | 'problem';

export interface ReviewViewProps {
  review: ReviewState;
  store: BankStore;
  exam: string;
  pages: readonly PageImage[];
  cropToWebp: CropToWebp;
  skipped?: readonly Issue[];
  notices?: readonly string[];
  now?: () => number;
  onSaved(o: SaveOutcome): void;
  onBack(): void;
  onNeedPages(): void;
}

export function ReviewView({ review, store, exam, pages, cropToWebp, skipped = [], notices = [], now = Date.now, onSaved, onBack, onNeedPages }: ReviewViewProps) {
  const { items, selected } = review;
  const [filter, setFilter] = useState<Filter>('all');
  const [shown, setShown] = useState(PAGE);
  const [bulkChapter, setBulkChapter] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'bad' | 'primary'; text: string } | null>(null);

  const sum = useMemo(() => summarize(items), [items]);
  const visible = useMemo(() => items.filter((i) => filter === 'all' || categorize(i.issues) === filter), [items, filter]);
  const page = visible.slice(0, shown);

  const urls = useMediaUrls(page.map((i) => i.q), review.urls);

  const sel = items.filter((i) => selected.has(i.q.id));
  const blocked = sel.filter((i) => categorize(i.issues) === 'problem').length;
  const selfCheck = sel.filter((i) => categorize(i.issues) === 'needs_answer').length;

  const save = async () => {
    setMessage(null);
    const chosen = review.snapshot();
    const bad = chosen.filter((i) => i.issues.some((x) => x.severity === 'error')).length;
    if (bad > 0) {
      setMessage({ tone: 'bad', text: `${bad} selected question${bad === 1 ? ' still has' : 's still have'} a problem. Fix ${bad === 1 ? 'it' : 'them'} or untick ${bad === 1 ? 'it' : 'them'}, then save.` });
      return;
    }
    if (chosen.length === 0) {
      setMessage({ tone: 'bad', text: 'Tick the questions you want to keep first.' });
      return;
    }
    setSaving(true);
    try {
      const t = now();
      const qs: UserQuestion[] = chosen.map((i) => ({ ...i.q, created_at: t, status: i.q.answer == null ? 'needs_answer' : 'user_ok' }));
      const usedImgs = imageIdsOf(qs);
      const existing = imageIdsOf(await store.listQuestions());
      const fresh = [...usedImgs].filter((id) => !existing.has(id));
      const quota = await checkSaveQuota(store, qs, fresh.length, t);
      if (!quota.ok) {
        const r = quota.remaining;
        setMessage({
          tone: 'bad',
          text: `${quota.reasons.map((x) => x.message).join(' ')} Remaining: ${r.questions} questions, ${r.images} images, ${r.today} more today.`,
        });
        return;
      }
      const media = fresh.flatMap((id) => {
        const c = review.crops.get(id);
        return c ? [{ id, bytes: c.bytes, w: c.w, h: c.h }] : [];
      });
      await store.save(qs, media);
      try { reportUpload(qs.length); } catch { /* telemetry never blocks */ }
      onSaved({ saved: qs.length, selfCheck: qs.filter((q) => q.status === 'needs_answer').length });
    } catch (e) {
      setMessage({ tone: 'bad', text: e instanceof Error ? e.message : 'Saving failed. Your edits are still here, so try again.' });
    } finally {
      setSaving(false);
    }
  };

  const applyBulk = () => {
    if (bulkChapter && selected.size > 0) review.setChapterForSelected(bulkChapter);
  };

  return (
    <div className="stack-section">
      <div className="u-sumbar" role="region" aria-label="Review summary">
        <div className="stack-text">
          <p className="text-body font-semibold" data-testid="summary">{summaryText(sum)}</p>
          <p className="text-small text-slate">
            {selected.size} selected{selfCheck > 0 ? ` · ${selfCheck} saved as self-check only` : ''}
          </p>
        </div>
        <div className="row-actions">
          <Button variant="secondary" onClick={onBack}>Back to paste</Button>
          <Button onClick={() => void save()} loading={saving} disabled={selected.size === 0 || blocked > 0}>
            Save {selected.size || ''} to my bank
          </Button>
        </div>
      </div>

      {blocked > 0 && (
        <Banner tone="bad" icon={<AlertIcon className="shrink-0" />} role="alert">
          {blocked} selected question{blocked === 1 ? ' has' : 's have'} a problem. Fix {blocked === 1 ? 'it' : 'them'} or untick {blocked === 1 ? 'it' : 'them'} to save.
        </Banner>
      )}
      {message && <Banner tone={message.tone} role="alert">{message.text}</Banner>}
      {notices.length > 0 && <Banner role="note">{notices.join(' ')}</Banner>}
      {skipped.length > 0 && (
        <Banner role="note">
          {skipped.length} item{skipped.length === 1 ? ' was' : 's were'} left out: {skipped.slice(0, 3).map((s) => s.message).join(' ')}{skipped.length > 3 ? ' …' : ''}
        </Banner>
      )}

      <Card>
        <h2 className="text-h3">Bulk actions</h2>
        <div className="u-filters">
          <Button variant="secondary" onClick={review.selectOk}><CheckIcon width={20} height={20} />Accept all that are ok</Button>
          <Button variant="secondary" onClick={review.selectAll}>Select all</Button>
          <Button variant="secondary" onClick={review.clearSelection} disabled={selected.size === 0}>Clear selection</Button>
          <Button variant="secondary" onClick={review.dropSelected} disabled={selected.size === 0}>Drop selected</Button>
        </div>
        <div className="u-filters">
          <SelectField label="Set chapter for selected" value={bulkChapter} onChange={(e) => setBulkChapter(e.target.value)}>
            <option value="">Choose a chapter</option>
            {chapterGroups(exam).map((g) => (
              <optgroup key={g.subject} label={g.name}>
                {g.chapters.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </SelectField>
          <div><Button onClick={applyBulk} disabled={!bulkChapter || selected.size === 0}>Apply to {selected.size} selected</Button></div>
        </div>
      </Card>

      <Tabs<Filter>
        label="Filter questions"
        value={filter}
        onChange={(f) => { setFilter(f); setShown(PAGE); }}
        tabs={[
          { id: 'all', label: `All ${sum.total}` },
          { id: 'ready', label: `Ready ${sum.ready}` },
          { id: 'needs_answer', label: `No answer ${sum.needsAnswer}` },
          { id: 'problem', label: `Problems ${sum.problem}` },
        ]}
      />

      <div className="stack-grid">
        {page.map((it) => (
          <QuestionCard
            key={it.q.id}
            item={it}
            exam={exam}
            selected={selected.has(it.q.id)}
            urls={urls}
            pages={pages}
            cropToWebp={cropToWebp}
            onToggle={review.toggle}
            onEdit={review.edit}
            onCrop={review.applyCrop}
            onNeedPages={onNeedPages}
          />
        ))}
        {visible.length === 0 && <p className="text-slate">Nothing in this filter.</p>}
        {visible.length > shown && (
          <div className="row justify-center"><Button variant="secondary" onClick={() => setShown(shown + PAGE)}>Show {Math.min(PAGE, visible.length - shown)} more ({visible.length - shown} left)</Button></div>
        )}
      </div>
    </div>
  );
}
