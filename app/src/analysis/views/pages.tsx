import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { EmptyState, LinkButton, Page, PageHeader, Tabs, SkeletonRows, PageSkeleton } from '../../components/ui';
import { readAnalysis } from '../../cbt/model';
import { useStore, type MockDoc } from '../../store';
import { useAnalysisData, type AnalysisData } from '../hooks';
import { MasteryTab } from './MasteryTab';
import { MistakesTab } from './MistakesTab';
import { MockReport } from './MockReport';
import { MocksTab } from './MocksTab';

const TABS = [
  { id: 'mastery', label: 'Mastery' },
  { id: 'mocks', label: 'Mocks' },
  { id: 'mistakes', label: 'Mistakes' },
] as const;
type TabId = (typeof TABS)[number]['id'];

/** Pure view over loaded data (tests render this directly). */
export function AnalysisView({ data, tab, onTab, now }: { data: AnalysisData; tab: TabId; onTab(t: TabId): void; now: number }) {
  return (
    <Page>
      <div className="stack-section">
        <PageHeader title="Analysis" subtitle="What you know, how your mocks went, and what to fix next." />
        <Tabs label="Analysis" tabs={TABS} value={tab} onChange={onTab} />
        {data.loading ? (
          <SkeletonRows count={2} />
        ) : tab === 'mastery' ? (
          <MasteryTab tax={data.taxonomy} mastery={data.mastery} sessions={data.sessions} exam={data.exam} now={now} />
        ) : tab === 'mocks' ? (
          <MocksTab mocks={data.mocks} />
        ) : (
          <MistakesTab mastery={data.mastery} tax={data.taxonomy} sessions={data.sessions} exam={data.exam} />
        )}
      </div>
    </Page>
  );
}

/** `/analysis?tab=mastery|mocks|mistakes` */
export function AnalysisPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'mastery') as TabId;
  const data = useAnalysisData();
  const now = useMemo(() => Date.now(), []);
  return <AnalysisView data={data} tab={tab} onTab={(t) => setParams({ tab: t }, { replace: true })} now={now} />;
}

/** `/analysis/mock/:mockId` */
export function MockReportPage() {
  const { mockId = '' } = useParams();
  const store = useStore();
  const [mock, setMock] = useState<MockDoc | null | undefined>();
  useEffect(() => {
    let live = true;
    store.listMocks().then((all) => live && setMock(all.find((m) => m.id === mockId) ?? null), () => live && setMock(null));
    return () => { live = false; };
  }, [store, mockId]);
  if (mock === undefined) return <PageSkeleton />;
  if (mock === null) {
    return (
      <Page>
        <EmptyState title="We could not find that attempt" action={<LinkButton to="/analysis?tab=mocks">See your mock reports</LinkButton>}>It may have been saved on another device.</EmptyState>
      </Page>
    );
  }
  const a = readAnalysis(mock);
  return (
    <Page>
      <div className="stack-section">
        <PageHeader
          title={a?.title ?? 'Mock report'}
          subtitle={mock.submittedAt ? new Date(mock.submittedAt).toLocaleString() : undefined}
          actions={<LinkButton variant="secondary" to="/analysis?tab=mocks">All reports</LinkButton>}
        />
        <MockReport mock={mock} />
      </div>
    </Page>
  );
}
