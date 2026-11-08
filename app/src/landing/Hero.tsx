import { Link } from 'react-router';
import { CountdownRing } from './CountdownRing';

export function Hero({ onStartGuest }: { onStartGuest: () => void }) {
  return (
    <section className="ld-hero ld-wrap" aria-labelledby="ld-h1">
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
          <button type="button" className="ld-btn ld-btn-primary" onClick={onStartGuest}>
            Try it now — no sign-in
          </button>
          <Link to="/signup" className="ld-btn ld-btn-ghost">
            Create account
          </Link>
        </div>
        <p className="ld-note">Free. Your progress stays on your device until you choose to sign in.</p>
      </div>
      <div className="ld-hero-visual">
        <CountdownRing />
      </div>
    </section>
  );
}
