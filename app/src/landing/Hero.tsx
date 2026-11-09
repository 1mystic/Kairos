import { Button, LinkButton, TwoPane } from '../components/ui';
import { MockIcon, UserIcon } from '../components/icons';
import { HeroVisual } from './HeroVisual';

function OfflineGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01M4 4l16 16" />
    </svg>
  );
}

export function Hero({ onStartGuest }: { onStartGuest: () => void }) {
  return (
    <section className="ld-hero ld-wrap" aria-labelledby="ld-h1">
      <TwoPane>
      <div className="ld-hero-copy">
        <p className="ld-eyebrow">JEE Main · NEET UG · IAT</p>
        <h1 id="ld-h1">
          The right question, <span className="ld-hl">at the right time.</span>
        </h1>
        <p className="ld-lead">
          Tell Kairos your exam date. It counts back from it and gives you a plan you can actually keep, re-sized
          every day, never crammed at the end.
        </p>
        <div className="ld-cta-row">
          <Button size="lg" onClick={onStartGuest}>Try it now — no sign-in</Button>
          <LinkButton to="/signup" variant="secondary" size="lg">Create account</LinkButton>
        </div>
        <p className="ld-note">Free. Your progress stays on your device until you choose to sign in.</p>
        <ul className="ld-trust" aria-label="Highlights">
          <li><MockIcon width={20} height={20} />Real exam-style screen</li>
          <li><OfflineGlyph />Works offline</li>
          <li><UserIcon width={20} height={20} />No sign-in needed</li>
        </ul>
      </div>
      <div className="ld-hero-visual">
        <HeroVisual />
      </div>
      </TwoPane>
    </section>
  );
}
