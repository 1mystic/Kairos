import { useEffect, useState } from 'react';
import { useManifest } from '../bank/hooks';
import { useStore, type MockDoc } from '../store';
import { Card, EmptyState, LinkButton, Page, PageHeader, Section, Skeleton } from '../components/ui';
import { isPaperScore, readAnalysis } from './model';

const GRID = 'grid gap-s4 grid-cols-[repeat(auto-fill,minmax(min(100%,18rem),1fr))]';
const pretty = (id: string) => id.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** `/mocks`: available papers + your past attempts. */
export function MocksPage() {
  const { data, loading, error } = useManifest();
  const store = useStore();
  const [past, setPast] = useState<MockDoc[] | undefined>();
  useEffect(() => {
    let live = true;
    store.listMocks().then(
      (all) => live && setPast([...all].sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))),
      () => live && setPast([]),
    );
    return () => {
      live = false;
    };
  }, [store]);
  const papers = (data?.manifest.files ?? []).filter((f) => f.kind === 'mock' && f.paperId);

  return (
    <Page>
      <div className="stack gap-section">
        <PageHeader title="Mock tests" subtitle="Full-screen practice on the same kind of screen you will use on exam day." />
        <Section title="Available papers">
          {loading ? (
            <Skeleton className="h-s8 w-full" />
          ) : error ? (
            <p className="text-slate">We could not load the paper list. Check your connection and try again.</p>
          ) : papers.length === 0 ? (
            <EmptyState title="No mock papers yet">New papers show up here as soon as they are published.</EmptyState>
          ) : (
            <div className={GRID}>
              {papers.map((p) => (
                <Card key={p.paperId}>
                  <div className="stack gap-base">
                    <h3 className="text-h3">{pretty(p.paperId!)}</h3>
                    <p className="text-small text-slate">{p.count ?? '?'} questions</p>
                    <LinkButton to={`/exam/${p.paperId}`}>Start</LinkButton>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Section>
        <Section title="Your attempts">
          {past === undefined ? (
            <Skeleton className="h-s8 w-full" />
          ) : past.length === 0 ? (
            <EmptyState title="No attempts yet">Your first mock will show up here with its score.</EmptyState>
          ) : (
            <div className={GRID}>
              {past.map((m) => {
                const a = readAnalysis(m);
                return (
                  <Card key={m.id} data-testid="attempt">
                    <div className="stack gap-base">
                      <h3 className="text-h3">{a?.title ?? pretty(m.paperId)}</h3>
                      <p className="text-small text-slate">{m.submittedAt ? new Date(m.submittedAt).toLocaleDateString() : ''}</p>
                      <p className="text-h2 tabular">{isPaperScore(m.score) ? `${m.score.marks} / ${m.score.max}` : 'Result pending'}</p>
                      <LinkButton variant="secondary" to={`/exam/${m.paperId}/result/${m.id}`}>View result</LinkButton>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>
      </div>
    </Page>
  );
}
