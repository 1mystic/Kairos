import { Link } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Banner, Button, Card, Chip, DashboardGrid, LinkButton, Page, PageHeader, ProgressBar, Tile } from '../components/ui';
import { CalendarIcon, ClockIcon, InfoIcon, TargetIcon } from '../components/icons';
import { useGuest } from '../store/StoreProvider';
import { useSignInNudge } from '../store/NudgeProvider';

function GuestBanner() {
  const { bannerVisible, dismissBanner } = useSignInNudge();
  if (!bannerVisible) return null;
  return (
    <Banner
      icon={<InfoIcon className="shrink-0 text-primary" />}
      actions={<><Link to="/signin" className="btn btn-primary btn-sm">Sign in</Link><Button size="sm" variant="ghost" onClick={dismissBanner}>Not now</Button></>}
    >
      Your progress is saved on this device only. Sign in to keep it safe.
    </Banner>
  );
}

const LINES: [string, string][] = [
  ['Yesterday', 'Nothing yet. Your first day starts here.'],
  ['Today', 'Your plan will appear once you tell us your exam date.'],
  ['Next mock', 'Scheduled after your plan is set.'],
  ['Predicted', 'Needs a few sessions to estimate.'],
];

const TILES = [
  { to: '/practice', title: 'Quick practice', body: 'A few questions, at your pace.', icon: TargetIcon },
  { to: '/exam/sample_jee_mini_v1', title: 'Sample mock (JEE mini)', body: 'A short timed paper to get the feel.', icon: ClockIcon },
  { to: '/onboarding', title: 'Set exam date', body: 'So we can plan backwards from it.', icon: CalendarIcon },
];

/** The hero. All numbers are placeholders until the planner lands. */
function TodayCard() {
  return (
    <Card tone="primary" as="section" aria-labelledby="today-h" className="dash-hero">
      <div className="stack gap-loose">
        <div className="flex flex-wrap items-center justify-between gap-s2">
          <h2 id="today-h" className="text-h3">Today</h2>
          <Chip tone="accent">Placeholder data</Chip>
        </div>
        <div className="grid items-end gap-s5 md:grid-cols-2">
          <div className="stack gap-s1">
            <span className="text-display font-bold tabular">97</span>
            <span className="text-body text-slate">days to your exam (sample)</span>
          </div>
          <div className="stack gap-base">
            <div><Chip tone="primary">On track</Chip></div>
            <div className="stack gap-tight">
              <div className="flex justify-between gap-s2 text-small text-slate"><span>Pace ρ</span><span className="tabular">0.92</span></div>
              <ProgressBar label="Pace 0.92" value={0.92} />
            </div>
          </div>
        </div>
        <dl className="stack gap-base tabular">
          {LINES.map(([k, v]) => (
            <div key={k} className="grid gap-s1 sm:grid-cols-4 sm:gap-s4">
              <dt className="text-small font-semibold text-slate">{k}</dt>
              <dd className="text-body sm:col-span-3">{v}</dd>
            </div>
          ))}
        </dl>
        <div><LinkButton to="/onboarding">Set your exam date</LinkButton></div>
      </div>
    </Card>
  );
}

export function Home() {
  const { profile } = useAuth();
  const { isGuest } = useGuest();
  const first = isGuest ? undefined : profile?.displayName.split(' ')[0];
  return (
    <Page>
      <PageHeader title={`Hi${first ? `, ${first}` : ''}.`} subtitle="Here is where today stands." />
      {isGuest && <GuestBanner />}
      {profile?.isMinor && profile.consent.status === 'pending' && (
        <Banner tone="accent" role="note">
          <strong className="block text-body">A note for parents and guardians</strong>
          Since you are under 18, we will soon ask a parent or guardian to confirm consent. There is nothing to do right now, and you can keep using Kairos.
        </Banner>
      )}
      <DashboardGrid>
        <TodayCard />
        {TILES.map(({ to, title, body, icon }) => (
          <div key={to} className="dash-third"><Tile to={to} title={title} body={body} icon={icon} /></div>
        ))}
      </DashboardGrid>
    </Page>
  );
}
