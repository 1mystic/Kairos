import { useEffect, useState } from 'react';
import { useManifest } from '../bank/hooks';
import { useStore, type MockDoc } from '../store';
import { Banner, Card, CardGrid, EmptyState, LinkButton, Page, PageHeader, Section, SkeletonCards } from '../components/ui';
import { defaultAttemptStore, type AttemptStore } from './attemptStore';
import { isPaperScore, readAnalysis } from './model';

const pretty = (id: string) => id.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

/** `/mocks`: available papers + your past attempts. */
export function MocksPage({ attempts }: { attempts?: AttemptStore } = {}) {
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
  const [open, setOpen] = useState<Set<string>>(new Set());
  useEffect(() => {
    let live = true;
    const st = attempts ?? defaultAttemptStore();
    const ids = (data?.manifest.files ?? []).filter((f) => f.kind === 'mock' && f.paperId).map((f) => f.paperId!);
    Promise.all(ids.map((id) => st.get(id).then((a) => (a && !a.state.submitted ? id : null), () => null))).then(
      (r) => live && setOpen(new Set(r.filter((x): x is string => !!x))),
      () => {},
    );
    return () => {
      live = false;
    };
  }, [data, attempts]);
  const papers = (data?.manifest.files ?? []).filter((f) => f.kind === 'mock' && f.paperId);

  return (
    <Page>
      <PageHeader title="Mock tests" subtitle="Full-screen practice on the same kind of screen you will use on exam day." />
      {open.size > 0 && (
        <Banner
          actions={<LinkButton to={`/exam/${[...open][0]}`}>Continue attempt</LinkButton>}
        >
          You have an unfinished attempt on {pretty([...open][0]!)}. The clock kept running, so pick it up when you are ready.
        </Banner>
      )}
      <Section title="Available papers">
        {loading ? (
          <SkeletonCards />
        ) : error ? (
          <EmptyState title="We could not load the paper list">Check your connection and try again.</EmptyState>
        ) : papers.length === 0 ? (
          <EmptyState title="No mock papers yet">New papers show up here as soon as they are published.</EmptyState>
        ) : (
          <CardGrid cols={3}>
            {papers.map((p) => (
              <Card key={p.paperId} footer={<LinkButton to={`/exam/${p.paperId}`} block>{open.has(p.paperId!) ? 'Continue attempt' : 'Start'}</LinkButton>}>
                <div className="stack-text">
                  <h3 className="card-title-clamp text-h3">{pretty(p.paperId!)}</h3>
                  <p className="text-small text-slate tabular">{p.count ?? '?'} questions</p>
                </div>
              </Card>
            ))}
          </CardGrid>
        )}
      </Section>
      <Section title="Your attempts">
        {past === undefined ? (
          <SkeletonCards />
        ) : past.length === 0 ? (
          <EmptyState title="No attempts yet">Your first mock will show up here with its score.</EmptyState>
        ) : (
          <CardGrid cols={3}>
            {past.map((m) => {
              const a = readAnalysis(m);
              return (
                <Card key={m.id} data-testid="attempt" footer={<LinkButton variant="secondary" to={`/exam/${m.paperId}/result/${m.id}`} block>View result</LinkButton>}>
                  <div className="stack-text">
                    <h3 className="card-title-clamp text-h3">{a?.title ?? pretty(m.paperId)}</h3>
                    <p className="text-small text-slate tabular">{m.submittedAt ? new Date(m.submittedAt).toLocaleDateString() : ''}</p>
                  </div>
                  <p className="text-h2 tabular">{isPaperScore(m.score) ? `${m.score.marks} / ${m.score.max}` : 'Result pending'}</p>
                </Card>
              );
            })}
          </CardGrid>
        )}
      </Section>
    </Page>
  );
}
