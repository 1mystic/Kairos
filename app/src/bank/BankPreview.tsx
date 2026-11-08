import { useState } from 'react';
import { useManifest, useShard } from './hooks';
import { QuestionView } from '../components/QuestionView';
import { Banner, Card, Page, PageHeader, SelectField } from '../components/ui';

/** Dev tool: pick a manifest chapter and render all its questions (with solutions). */
export function BankPreview() {
  const m = useManifest();
  const [pick, setPick] = useState<string>('');
  const [exam, subject, chapter] = pick ? pick.split('|') : [null, null, null];
  const shard = useShard(exam ?? null, subject ?? null, chapter ?? null);

  const shards = (m.data?.manifest.files ?? []).filter((f) => f.kind === 'shard');

  return (
    <Page width="reading">
      <PageHeader title={`Bank preview${m.data ? ` · v${m.data.version}` : ''}`} />
      {m.loading && <p role="status" className="text-slate">Loading manifest…</p>}
      {m.error && <Banner tone="accent" role="alert">Could not load the bank: {m.error.message}</Banner>}
      {m.data && (
        <SelectField label="Chapter" value={pick} onChange={(e) => setPick(e.target.value)}>
          <option value="">Select a chapter…</option>
          {shards.map((f) => (
            <option key={f.path} value={`${f.exam}|${f.subject}|${f.chapter}`}>
              {f.exam} · {f.chapter} ({f.count ?? '?'})
            </option>
          ))}
        </SelectField>
      )}
      {shard.loading && <p role="status" className="text-slate">Loading questions…</p>}
      {shard.error && <Banner tone="accent" role="alert">Could not load shard: {shard.error.message}</Banner>}
      {shard.data?.questions.map((q, i) => (
        <Card key={q.id} as="section">
          <div className="stack gap-tight">
            <p className="text-caption text-slate">
              {i + 1}. {q.id} · {q.type}
            </p>
            <QuestionView question={q} variant="review" showSolution />
          </div>
        </Card>
      ))}
    </Page>
  );
}
