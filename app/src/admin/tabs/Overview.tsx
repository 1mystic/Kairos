import { useMemo, useState } from 'react';
import { HBars } from '../../analysis/charts/HBars';
import { LineChart } from '../../analysis/charts/LineChart';
import { Banner, Button, Card, CardGrid, Section, Skeleton, Stat, Tabs } from '../../components/ui';
import { AlertIcon, InfoIcon } from '../../components/icons';
import { useCachedQuery } from '../cache';
import { useAdminData } from '../data';
import { accuracy, avgActive, buildInsights, EXAM_SESSION_FIELDS, fillDays, onboardedShare, rangeBounds, totals, type DayStats, type StatField } from '../insights';

const RANGES = [{ id: '7', label: '7 days' }, { id: '30', label: '30 days' }, { id: '90', label: '90 days' }] as const;
const pct = (x: number | null) => (x === null ? 'n/a' : `${Math.round(x * 100)}%`);
const num = (n: number) => n.toLocaleString('en-IN');

function Trend({ rows, field, title }: { rows: DayStats[]; field: StatField; title: string }) {
  const max = Math.max(1, ...rows.map((r) => r[field]));
  const n = rows.length;
  const step = Math.max(1, Math.floor(n / 4));
  const xTicks = rows.map((r, i) => ({ v: i, label: r.day.slice(5) })).filter((_, i) => i % step === 0 || i === n - 1).slice(-5);
  return (
    <Card>
      <div className="stack gap-base">
        <h3 className="text-h3">{title}</h3>
        <LineChart
          points={rows.map((r, i) => ({ x: i, y: r[field] }))}
          xDomain={[0, Math.max(1, n - 1)]}
          yDomain={[0, max]}
          xTicks={xTicks}
          yTicks={[0, Math.round(max / 2), max].map((v) => ({ v, label: String(v) }))}
          summary={`${title} per day over the last ${n} days. Highest day: ${max}.`}
          table={{ caption: `${title} per day`, head: ['Day', title], rows: rows.map((r) => [r.day, r[field]]) }}
        />
      </div>
    </Card>
  );
}

/** Aggregates only: one `stats/{day}` range query per range, cached for 10 minutes. */
export function Overview({ today }: { today: string }) {
  const data = useAdminData();
  const [range, setRange] = useState<'7' | '30' | '90'>('30');
  const days = Number(range);
  // insights compare the last 7 days with the 7 before, so the 7-day view still reads 14 days (<= 90 reads either way)
  const fetchDays = Math.max(days, 14);
  const [start, end] = rangeBounds(today, fetchDays);
  const q = useCachedQuery(`stats:${start}:${end}`, () => data.getStats(start, end));
  const rows = useMemo(() => (q.data ? fillDays(q.data, end, days) : []), [q.data, end, days]);
  const t = useMemo(() => totals(rows), [rows]);
  const insights = useMemo(() => buildInsights(fillDays(q.data ?? [], end, fetchDays)), [q.data, end, fetchDays]);
  const split = EXAM_SESSION_FIELDS.map((e) => ({ ...e, n: t[e.field] }));
  const splitTotal = split.reduce((a, e) => a + e.n, 0);

  return (
    <div className="stack gap-section">
      <Section
        title="Overview"
        aside={
          <div className="row-actions">
            <Tabs label="Range" tabs={RANGES} value={range} onChange={(id) => setRange(id as typeof range)} />
            <Button variant="secondary" size="sm" loading={q.loading} onClick={q.reload}>Refresh</Button>
          </div>
        }
      >
        <p className="text-small text-slate tabular">
          {q.data ? `Reads used: ${q.fromCache ? '0 (from this session\'s cache)' : q.data.length} of up to ${fetchDays}.` : `Uses up to ${fetchDays} reads.`} Guests are not counted (their data stays on their device) and counts are indicative.
        </p>
        {q.error && <Banner tone="accent" role="alert" icon={<AlertIcon className="shrink-0" />}>We could not read the stats: {q.error}</Banner>}
        {q.loading && !q.data ? (
          <Skeleton className="h-s8 w-full" />
        ) : (
          <CardGrid cols={4}>
            <Card><Stat label="Sign-ups" value={num(t.signups)} hint={`last ${days} days`} /></Card>
            <Card><Stat label="Active learners / day" value={avgActive(rows).toFixed(1)} hint="average" /></Card>
            <Card><Stat label="Sessions" value={num(t.sessions)} /></Card>
            <Card><Stat label="Questions answered" value={num(t.questions)} /></Card>
            <Card><Stat label="Overall accuracy" value={pct(accuracy(t))} hint="correct / answered" /></Card>
            <Card><Stat label="Mocks" value={num(t.mocks)} /></Card>
            <Card><Stat label="Diagnostics" value={num(t.diagnostics)} /></Card>
            <Card><Stat label="Uploads" value={num(t.uploads)} hint={`onboarded: ${pct(onboardedShare(t))} of sign-ups`} /></Card>
          </CardGrid>
        )}
      </Section>

      <Section title="Insights">
        <Card>
          <ul className="stack gap-tight">
            {insights.map((i) => <li key={i} className="row gap-tight"><InfoIcon width={16} height={16} className="shrink-0 text-primary" />{i}</li>)}
          </ul>
        </Card>
      </Section>

      <Section title="Trends">
        <CardGrid cols={2}>
          <Trend rows={rows} field="active" title="Active learners" />
          <Trend rows={rows} field="sessions" title="Sessions" />
          <Trend rows={rows} field="questions" title="Questions answered" />
          <Card>
            <div className="stack gap-base">
              <h3 className="text-h3">Sessions by exam</h3>
              <HBars
                summary={`Sessions by exam: ${split.map((e) => `${e.label} ${e.n}`).join(', ')}.`}
                caption="Sessions by exam"
                rows={split.map((e) => ({ key: e.field, label: e.label, value: splitTotal ? e.n / splitTotal : 0, text: `${num(e.n)} (${splitTotal ? Math.round((e.n / splitTotal) * 100) : 0}%)` }))}
              />
            </div>
          </Card>
        </CardGrid>
      </Section>
    </div>
  );
}
