import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Banner, Button, Chip, LinkButton, Page, PageHeader } from '../components/ui';
import { InfoIcon } from '../components/icons';
import { AnnouncementBanner } from '../config/AnnouncementBanner';
import { Dashboard } from '../dashboard';
import { useGuest } from '../store/StoreProvider';
import { useSignInNudge } from '../store/NudgeProvider';
import { TodaySessionCard } from '../practice/today/TodaySessionCard';
import { useActiveExam } from '../exams/useActiveExam';
import { useOnboardingProfile } from '../onboarding/useOnboardingProfile';

const PROMPTED = 'kairos-setup-prompted';
const DISMISSED = 'kairos-setup-dismissed';
const flag = (store: Storage | undefined, k: string): boolean => { try { return store?.getItem(k) === '1'; } catch { return false; } };
const mark = (store: Storage | undefined, k: string) => { try { store?.setItem(k, '1'); } catch { /* private mode */ } };

/**
 * First visit before onboarding: a signed-in student is taken to the exam setup once per browser session (nothing works well without an exam);
 * a guest sees a dismissible banner instead, so trying the app stays free of walls.
 */
function SetupPrompt({ isGuest }: { isGuest: boolean }) {
  const nav = useNavigate();
  const { loading, onboarded } = useOnboardingProfile();
  const [gone, setGone] = useState(() => flag(typeof localStorage === 'undefined' ? undefined : localStorage, DISMISSED));
  const needs = !loading && !onboarded;
  useEffect(() => {
    if (!needs || isGuest || typeof sessionStorage === 'undefined' || flag(sessionStorage, PROMPTED)) return;
    mark(sessionStorage, PROMPTED);
    nav('/onboarding', { replace: true });
  }, [needs, isGuest, nav]);
  if (!needs || gone) return null;
  return (
    <Banner
      icon={<InfoIcon className="shrink-0 text-primary" />}
      actions={<><LinkButton to="/onboarding" size="sm">Set up your exams</LinkButton>{isGuest && <Button size="sm" variant="ghost" onClick={() => { mark(localStorage, DISMISSED); setGone(true); }}>Not now</Button>}</>}
    >
      Choose the exam or exams you are preparing for and Kairos plans each day for you.
    </Banner>
  );
}


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

export function Home() {
  const { profile } = useAuth();
  const { isGuest } = useGuest();
  const first = isGuest ? undefined : profile?.displayName.split(' ')[0];
  const { label, daysLeft, active } = useActiveExam();
  return (
    <Page>
      <PageHeader title={`Hi${first ? `, ${first}` : ''}.`} subtitle={<span className="row gap-tight">Here is where today stands.{label && <Chip tone="primary">{label}{active && active.kind !== 'none' && daysLeft !== null && daysLeft >= 0 ? ` · ${daysLeft} day${daysLeft === 1 ? '' : 's'} to go` : ''}</Chip>}</span>} />
      <AnnouncementBanner />
      <SetupPrompt isGuest={isGuest} />
      {isGuest && <GuestBanner />}
      {profile?.isMinor && profile.consent.status === 'pending' && (
        <Banner tone="accent" role="note">
          <strong className="block text-body">A note for parents and guardians</strong>
          Kairos only uses practice data to help the student learn, never for ads. A parent or guardian can ask us to see or delete it at any time: see the Privacy notice.
        </Banner>
      )}
      <TodaySessionCard />
      <Dashboard />
    </Page>
  );
}
