import { Link } from 'react-router';
import { useAuth } from '../auth/AuthProvider';
import { Banner, Button, Page, PageHeader } from '../components/ui';
import { InfoIcon } from '../components/icons';
import { AnnouncementBanner } from '../config/AnnouncementBanner';
import { Dashboard } from '../dashboard';
import { useGuest } from '../store/StoreProvider';
import { useSignInNudge } from '../store/NudgeProvider';
import { TodaySessionCard } from '../practice/today/TodaySessionCard';

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
  return (
    <Page>
      <PageHeader title={`Hi${first ? `, ${first}` : ''}.`} subtitle="Here is where today stands." />
      <AnnouncementBanner />
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
