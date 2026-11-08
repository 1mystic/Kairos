import { useState } from 'react';
import { useManifest, useShard } from './hooks';
import { QuestionView } from '../components/QuestionView';

/** Dev tool: pick a manifest chapter and render all its questions (with solutions). */
export function BankPreview() {
  const m = useManifest();
  const [pick, setPick] = useState<string>('');
  const [exam, subject, chapter] = pick ? pick.split('|') : [null, null, null];
  const shard = useShard(exam ?? null, subject ?? null, chapter ?? null);

  const shards = (m.data?.manifest.files ?? []).filter((f) => f.kind === 'shard');

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      <h1 className="text-2xl">Bank preview{m.data ? ` · v${m.data.version}` : ''}</h1>
      {m.loading && <p role="status" className="text-slate">Loading manifest…</p>}
      {m.error && <p role="alert" className="text-ink">Could not load the bank: {m.error.message}</p>}
      {m.data && (
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Chapter</span>
          <select
            className="w-full rounded-btn border border-line bg-surface p-2 text-ink"
            value={pick}
            onChange={(e) => setPick(e.target.value)}
          >
            <option value="">Select a chapter…</option>
            {shards.map((f) => (
              <option key={f.path} value={`${f.exam}|${f.subject}|${f.chapter}`}>
                {f.exam} · {f.chapter} ({f.count ?? '?'})
              </option>
            ))}
          </select>
        </label>
      )}
      {shard.loading && <p role="status" className="text-slate">Loading questions…</p>}
      {shard.error && <p role="alert">Could not load shard: {shard.error.message}</p>}
      {shard.data?.questions.map((q, i) => (
        <section key={q.id} className="space-y-2 rounded-card border border-line bg-surface p-4">
          <p className="text-xs text-slate">
            {i + 1}. {q.id} · {q.type}
          </p>
          <QuestionView question={q} variant="review" showSolution />
        </section>
      ))}
    </main>
  );
}
