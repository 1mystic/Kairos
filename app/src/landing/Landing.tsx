import { Link } from 'react-router';
import { Hero } from './Hero';
import { TodayCardDemo } from './TodayCardDemo';
import { PhaseTimeline } from './PhaseTimeline';
import { PaletteDemo } from './PaletteDemo';
import { NotationCard } from './NotationCard';
import { BacklogDemo } from './BacklogDemo';
import { useReveal } from './useReveal';
import './landing.css';

// Patterns mirror content/blueprints/*.json (jee_main_2026_p1, neet_ug_2027, iat_2026).
const EXAMS = [
  { name: 'JEE Main', pattern: 'Physics, Chemistry, Maths. 20 MCQs + 5 numerical each. 180 minutes.' },
  { name: 'NEET UG', pattern: 'Physics, Chemistry, Botany, Zoology. 45 questions each. CBT from 2027. 180 minutes.' },
  { name: 'IAT', pattern: 'Biology, Chemistry, Maths, Physics. 15 questions each. 180 minutes.' },
];

function Section({ id, title, intro, children, alt }: { id: string; title: string; intro: string; children: React.ReactNode; alt?: boolean }) {
  const [ref, shown] = useReveal<HTMLElement>(0.15);
  return (
    <section ref={ref} className={`ld-section${alt ? ' ld-alt' : ''}`} data-shown={shown} aria-labelledby={id}>
      <div className="ld-wrap">
        <div className="ld-head">
          <h2 id={id}>{title}</h2>
          <p>{intro}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

export function Landing({ onStartGuest }: { onStartGuest: () => void }) {
  return (
    <div className="ld">
      <header className="ld-header">
        <div className="ld-wrap ld-header-in">
          <Link to="/" className="ld-logo" aria-label="Kairos home">
            <svg viewBox="0 0 64 64" width="32" height="32" aria-hidden="true">
              <rect width="64" height="64" rx="14" fill="#3A3FD9" />
              <path d="M20 14v36" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
              <path d="M46 14 L30 32 L46 50" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="30" cy="32" r="4.5" fill="#F5A524" />
            </svg>
            <span>Kairos</span>
          </Link>
          <nav className="ld-nav" aria-label="Account">
            <Link to="/signin" className="ld-link">Sign in</Link>
            <Link to="/signup" className="ld-btn ld-btn-primary ld-btn-sm">Start free</Link>
          </nav>
        </div>
      </header>

      <main>
        <Hero onStartGuest={onStartGuest} />

        <Section id="ld-decides" title="How it decides" intro="Every morning Kairos compares the work left with the time left, then sizes today. You see the reason, not just the list.">
          <div className="ld-two">
            <TodayCardDemo />
            <PhaseTimeline />
          </div>
        </Section>

        <Section id="ld-cbt" alt title="A real exam screen" intro="Practise on an exam-style CBT screen, so the palette, the timer and the flow feel familiar on the day.">
          <PaletteDemo />
        </Section>

        <Section id="ld-notation" title="Real notation" intro="Chemistry, diagrams, complex notation — rendered crisply, works offline.">
          <NotationCard />
        </Section>

        <Section id="ld-backlog" alt title="Honest backlog" intro="You will miss days. That's normal. Kairos carries, spreads, sheds — never piles.">
          <BacklogDemo />
        </Section>

        <Section id="ld-exams" title="Exams" intro="Built from each exam's published pattern, not a one-size paper.">
          <ul className="ld-exams">
            {EXAMS.map((e) => (
              <li key={e.name} className="ld-card">
                <h3>{e.name}</h3>
                <p>{e.pattern}</p>
              </li>
            ))}
          </ul>
        </Section>

        <Section id="ld-private" alt title="Free and private" intro="Start without signing in. Your progress stays on your device. Sign in later and it syncs across devices. Under 18? Parents or guardians are kept in the loop.">
          <p className="ld-tip">Tip: roz thoda, but roz. A steady 2 hours beats one 9-hour Sunday.</p>
        </Section>

        <section className="ld-final ld-wrap" aria-labelledby="ld-final-h">
          <h2 id="ld-final-h">Know your date. We'll handle the days.</h2>
          <div className="ld-cta-row ld-center">
            <button type="button" className="ld-btn ld-btn-primary" onClick={onStartGuest}>
              Try it now — no sign-in
            </button>
            <Link to="/signup" className="ld-btn ld-btn-ghost">Create account</Link>
          </div>
        </section>
      </main>

      <footer className="ld-footer">
        <div className="ld-wrap ld-footer-in">
          <span>© Kairos</span>
          <nav aria-label="Footer">
            <Link to="/signin" className="ld-link">Sign in</Link>
            <a href="#" className="ld-link">Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
