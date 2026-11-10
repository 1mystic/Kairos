import { useState } from 'react';
import { Link } from 'react-router';
import { Banner, Button, Card, EmptyState, Page, PageHeader, PageSkeleton, StickySideNav, Tabs, TwoColumnPage, type SideNavItem } from '../components/ui';
import { toYmd } from '../lib/profile';
import { AnnouncementTab } from './tabs/Announcement';
import { ExamDates } from './tabs/ExamDates';
import { Overview } from './tabs/Overview';
import { RoadmapDefaultsTab } from './tabs/RoadmapDefaults';
import { SystemTab } from './tabs/System';
import { UsersTab } from './tabs/UsersTab';
import { useAdminStatus } from './useIsAdmin';

export const CONSOLE_URL = 'https://console.firebase.google.com/project/kairos-76a0d/firestore';
export const BECOME_ADMIN =
  'To become an admin: open the Firebase console → Firestore Database → Start collection `admins` → Document ID = (your UID above) → add any field (e.g. `role: owner`) → Save. Then reload this page.';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'dates', label: 'Exam dates' },
  { id: 'announcement', label: 'Announcement' },
  { id: 'roadmap', label: 'Roadmap defaults' },
  { id: 'users', label: 'Users' },
  { id: 'system', label: 'System' },
] as const;
type TabId = (typeof TABS)[number]['id'];
const NAV: SideNavItem[] = TABS.map((t) => ({ id: t.id, label: t.label }));

function NotAdmin({ uid }: { uid: string | null }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!uid) return;
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Page width="reading">
      <PageHeader title="Kairos admin" />
      <Card>
        {uid ? (
          <div className="stack gap-loose">
            <EmptyState title="This area is for Kairos admins">Your account is not an admin yet.</EmptyState>
            <div className="stack gap-tight">
              <span className="text-caption font-semibold uppercase tracking-wide text-slate">Your UID</span>
              <div className="row gap-base">
                <code className="tabular min-w-0 break-all" data-testid="uid">{uid}</code>
                <Button variant="secondary" size="sm" onClick={() => void copy()}>{copied ? 'Copied' : 'Copy'}</Button>
              </div>
            </div>
            <p>{BECOME_ADMIN}</p>
            <div><a className="btn btn-secondary" href={CONSOLE_URL} target="_blank" rel="noopener noreferrer">Open the Firebase console</a></div>
          </div>
        ) : (
          <EmptyState title="This area is for Kairos admins" action={<Link to="/signin" className="btn btn-primary">Sign in</Link>}>Sign in with your admin account to continue.</EmptyState>
        )}
      </Card>
    </Page>
  );
}

function Console({ uid }: { uid: string }) {
  const [tab, setTab] = useState<TabId>('overview');
  const today = toYmd(new Date());
  const year = new Date().getFullYear() + (new Date().getMonth() > 5 ? 1 : 0);
  return (
    <Page>
      <PageHeader title="Admin console" subtitle="App activity, exam dates and announcements. Aggregates only." />
      <TwoColumnPage nav={<StickySideNav label="Admin sections" items={NAV} active={tab} onSelect={(id) => setTab(id as TabId)} />}>
        <div className="stack gap-section min-w-0">
          <div className="lg:hidden"><Tabs label="Admin sections" tabs={TABS} value={tab} onChange={(id) => setTab(id as TabId)} /></div>
          <Banner role="note">Changes here reach every user. Guests are never counted.</Banner>
          {tab === 'overview' && <Overview today={today} />}
          {tab === 'dates' && <ExamDates uid={uid} year={year} />}
          {tab === 'announcement' && <AnnouncementTab uid={uid} />}
          {tab === 'roadmap' && <RoadmapDefaultsTab uid={uid} today={today} />}
          {tab === 'users' && <UsersTab />}
          {tab === 'system' && <SystemTab />}
        </div>
      </TwoColumnPage>
    </Page>
  );
}

/** /admin: gated by admins/{uid}. Everyone else gets a calm explanation. */
export function AdminPage() {
  const g = useAdminStatus();
  if (g.status === 'loading') return <PageSkeleton cards={3} />;
  if (g.status === 'admin') return <Console uid={g.uid} />;
  return <NotAdmin uid={g.status === 'not_admin' ? g.uid : null} />;
}
