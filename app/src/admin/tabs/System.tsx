import { Banner, Button, Card, CardGrid, Section, Skeleton, Stat } from '../../components/ui';
import { AlertIcon } from '../../components/icons';
import { useCachedQuery } from '../cache';
import { useAdminData, type BankInfo } from '../data';

const PROJECT = 'kairos-76a0d';
export const LINKS = [
  { label: 'Firestore data', href: `https://console.firebase.google.com/project/${PROJECT}/firestore` },
  { label: 'Usage and Spark quotas', href: `https://console.firebase.google.com/project/${PROJECT}/usage` },
  { label: 'Hosting', href: `https://console.firebase.google.com/project/${PROJECT}/hosting/sites` },
  { label: 'Authentication users', href: `https://console.firebase.google.com/project/${PROJECT}/authentication/users` },
];

/** Spark limits and what Kairos spends (docs/07_FREE_TIER.md, docs/12_ADMIN.md). */
export const QUOTA_ROWS: Array<[string, string, string]> = [
  ['Admin: open Overview', 'up to 90 reads', 'Cached 10 minutes; Refresh re-reads'],
  ['Admin: Users counts', 'up to 200 reads', 'Only when you press the button'],
  ['Admin: publish a config doc', '1 write', 'One setDoc'],
  ['Student: open the app', '1 read per config doc per 6 hours (3 docs)', 'Cached in the browser'],
  ['Student: day of practice', '1 write (counters) + 2 (first of the day: count + marker) + session writes', 'Counters are batched, at most one scheduled flush a day'],
];

export function SystemTab() {
  const data = useAdminData();
  const q = useCachedQuery<BankInfo>('bank-info', () => data.bankInfo());
  return (
    <div className="stack gap-section">
      <Section title="Question bank">
        {q.loading && !q.data ? <Skeleton className="h-s8 w-full" /> : q.data ? (
          <CardGrid cols={3}>
            <Card><Stat label="Bank version" value={q.data.version} /></Card>
            <Card><Stat label="Files" value={q.data.files} /></Card>
            <Card><Stat label="Questions" value={q.data.totals.questions ?? q.data.totals.total ?? 'n/a'} hint="from the manifest totals" /></Card>
          </CardGrid>
        ) : q.error ? <Banner tone="accent" role="alert" icon={<AlertIcon className="shrink-0" />}>The bank could not be read: {q.error}</Banner> : null}
      </Section>
      <Section title="Build">
        <Card><p className="text-slate">Mode: <strong>{import.meta.env.MODE}</strong>. Served from <strong>{typeof location === 'undefined' ? 'unknown' : location.host}</strong>. Firebase project <strong>{PROJECT}</strong> on the Spark plan (no billing).</p></Card>
      </Section>
      <Section title="Quick links">
        <CardGrid cols={2}>
          {LINKS.map((l) => (
            <Card key={l.href}>
              <div className="row-between"><span className="font-semibold">{l.label}</span><a className="btn btn-secondary btn-sm" href={l.href} target="_blank" rel="noopener noreferrer">Open</a></div>
            </Card>
          ))}
        </CardGrid>
      </Section>
      <Section title="Spark quota guidance">
        <Card>
          <div className="stack gap-base">
            <p className="text-slate">Daily limits: 50,000 reads, 20,000 writes, 20,000 deletes, 1 GiB stored, about 360 MB of Hosting transfer. Check the usage page above if anything feels slow.</p>
            <ul className="stack gap-tight">
              {QUOTA_ROWS.map(([what, cost, note]) => (
                <li key={what} className="stack-text"><span className="font-semibold">{what}</span><span className="text-small text-slate">{cost}. {note}.</span></li>
              ))}
            </ul>
            <p className="text-small text-slate">The list of admins is not shown here: Firestore does not allow listing them. Manage admins in the Firebase console.</p>
            <div><Button variant="secondary" size="sm" onClick={q.reload}>Refresh bank info</Button></div>
          </div>
        </Card>
      </Section>
    </div>
  );
}
