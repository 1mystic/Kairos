import { useState } from 'react';
import { AlertIcon, InfoIcon } from '../components/icons';
import { Banner, Button } from '../components/ui';
import { useAnnouncement, type Announcement } from './index';

export const DISMISS_KEY = 'kairos-announcement-dismissed';
const read = (): string => {
  try {
    return localStorage.getItem(DISMISS_KEY) ?? '';
  } catch {
    return '';
  }
};

/** Pure view, also used for the admin live preview. */
export function AnnouncementView({ a, onDismiss }: { a: Pick<Announcement, 'title' | 'body' | 'link' | 'tone'>; onDismiss?: () => void }) {
  const important = a.tone === 'important';
  return (
    <Banner
      tone={important ? 'accent' : 'primary'}
      role={important ? 'alert' : 'note'}
      icon={important ? <AlertIcon className="shrink-0" /> : <InfoIcon className="shrink-0 text-primary" />}
      actions={
        <>
          {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">Learn more</a>}
          {onDismiss && <Button size="sm" variant="ghost" onClick={onDismiss}>Dismiss</Button>}
        </>
      }
    >
      <strong className="block text-body">{a.title}</strong>
      {a.body}
    </Banner>
  );
}

/** Home banner: shown while active and not expired; dismissing hides it until the admin publishes a new version. */
export function AnnouncementBanner({ now }: { now?: number }) {
  const { live } = useAnnouncement(now);
  const [dismissed, setDismissed] = useState(read);
  if (!live || dismissed === String(live.updatedAt)) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(live.updatedAt));
    } catch {
      /* private mode */
    }
    setDismissed(String(live.updatedAt));
  };
  return <AnnouncementView a={live} onDismiss={dismiss} />;
}
