import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Hero } from './Hero';
import { HowItDecides } from './HowItDecides';
import { PhaseTimeline } from './PhaseTimeline';
import { PaletteDemo } from './PaletteDemo';
import { NotationCard } from './NotationCard';
import { BacklogDemo } from './BacklogDemo';
import { useReveal } from './useReveal';
import { Banner, Button, CardGrid, LinkButton, LogoMark, TwoPane } from '../components/ui';
import { CalendarIcon, ChevronDownIcon, LockIcon, SparkIcon, UserIcon } from '../components/icons';
import './landing.css';

// Patterns mirror content/blueprints/*.json (jee_main_2026_p1, neet_ug_2027, iat_2026).
const EXAMS = [
  { name: 'JEE Main', pattern: 'Physics, Chemistry, Maths. 20 MCQs + 5 numerical each. 180 minutes.' },
  { name: 'NEET UG', pattern: 'Physics, Chemistry, Botany, Zoology. 45 questions each. CBT from 2027. 180 minutes.' },
  { name: 'IAT', pattern: 'Biology, Chemistry, Maths, Physics. 15 questions each. 180 minutes.' },
];

const PROMISES = [
  { icon: SparkIcon, title: 'Free to use', body: 'Start practising right away. No card, no trial clock.' },
  { icon: LockIcon, title: 'Private by default', body: 'Without an account your progress stays on your device. Sign in later and it syncs across devices.' },
  { icon: UserIcon, title: 'Parents in the loop', body: 'Under 18? A parent or guardian is asked to confirm, and your attempt data is used only for your own learning.' },
];

const FAQ = [
  { q: 'Is Kairos free?', a: 'Yes. Kairos is free to use today, including practice, mocks and your daily plan.' },
  { q: 'Do I need an account?', a: 'No. Use it as a guest and your progress is saved on your device only. When you sign in, we offer to add that progress to your account. We never force it.' },
  { q: 'What happens to my data, and what if I am under 18?', a: 'We ask for your date of birth at sign-up. If you are under 18, a parent or guardian is asked to confirm consent. Your attempts are used only to help you learn, and you can export or clear your data from Settings.' },
  { q: 'Which exams are covered?', a: 'JEE Main, NEET UG and IAT. Papers follow each exam\'s published pattern: sections, question types and marking come from the pattern, not a one-size paper.' },
  { q: 'Does it work offline?', a: 'Once loaded, practice works offline: questions are cached on your device and your progress is kept locally. Syncing to your account waits until you are back online.' },
  { q: 'How does the plan work?', a: 'You tell Kairos your exam date and how much time you have each day. It counts back from the date, sizes today from the work left against the days left, and shows you why. It never goes above your daily time without asking, and missed work is carried, spread or, only if you choose, shed.' },
];

function Block({ id, title, intro, children, tone, flip }: { id: string; title: string; intro: string; children: ReactNode; tone?: 'alt'; flip?: boolean }) {
  const [ref, shown] = useReveal<HTMLElement>(0.15);
  return (
    <section ref={ref} id={id} className={`ld-section${tone === 'alt' ? ' ld-alt' : ''}`} data-shown={shown} aria-labelledby={`${id}-h`}>
      <div className="ld-wrap">
        <TwoPane reverse={flip} className="ld-twopane">
          <div className="ld-head">
            <h2 id={`${id}-h`}>{title}</h2>
            <p>{intro}</p>
          </div>
          <div className="ld-visual">{children}</div>
        </TwoPane>
      </div>
    </section>
  );
}

function Centered({ id, title, intro, children, tone }: { id: string; title: string; intro: string; children: ReactNode; tone?: 'alt' }) {
  const [ref, shown] = useReveal<HTMLElement>(0.15);
  return (
    <section ref={ref} id={id} className={`ld-section${tone === 'alt' ? ' ld-alt' : ''}`} data-shown={shown} aria-labelledby={`${id}-h`}>
      <div className="ld-wrap">
        <div className="ld-head ld-head-center">
          <h2 id={`${id}-h`}>{title}</h2>
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
      <a href="#main" className="ld-skip">Skip to content</a>
      <header className="ld-header">
        <div className="ld-wrap ld-header-in">
          <Link to="/" className="ld-logo" aria-label="Kairos home">
            <LogoMark />
            <span>Kairos</span>
          </Link>
          <nav className="ld-anchors" aria-label="Sections">
            <a href="#how" className="ld-link">How it works</a>
            <a href="#exams" className="ld-link">Exams</a>
            <a href="#faq" className="ld-link">FAQ</a>
          </nav>
          <nav className="ld-nav" aria-label="Account">
            <Link to="/signin" className="ld-link">Sign in</Link>
            <LinkButton to="/signup" size="sm">Start free</LinkButton>
          </nav>
        </div>
      </header>

      <main id="main" className="ld-main">
        <Hero onStartGuest={onStartGuest} />

        <HowItDecides />

        <Block id="plan" flip title="Planned backwards from your date" intro="Your days are split into phases, from building chapters to a rested last two days. The plan is re-sized as you go, never crammed at the end.">
          <PhaseTimeline />
        </Block>

        <Block id="cbt" tone="alt" title="A real exam screen" intro="Practise on an exam-style CBT screen, so the palette, the timer and the flow feel familiar on the day.">
          <PaletteDemo />
        </Block>

        <Block id="notation" flip title="Real notation" intro="Chemistry, diagrams, complex notation: rendered crisply, and it works offline.">
          <NotationCard />
        </Block>

        <Block id="backlog" tone="alt" title="Honest backlog" intro="You will miss days. That is normal. Kairos carries, spreads, sheds, and never piles.">
          <BacklogDemo />
        </Block>

        <Centered id="exams" title="Exams" intro="Built from each exam's published pattern, not a one-size paper.">
          <CardGrid as="ul" cols={3}>
            {EXAMS.map((e) => (
              <li key={e.name} className="card">
                <h3>{e.name}</h3>
                <p>{e.pattern}</p>
              </li>
            ))}
          </CardGrid>
        </Centered>

        <Centered id="private" tone="alt" title="Free and private" intro="Start without signing in. Sign in later and your progress comes with you.">
          <CardGrid as="ul" cols={3}>
            {PROMISES.map(({ icon: I, title, body }) => (
              <li key={title} className="card">
                <span className="tile-icon"><I /></span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </CardGrid>
          <div className="ld-tip"><Banner tone="accent" icon={<CalendarIcon className="shrink-0" />}>Tip: roz thoda, but roz. A steady 2 hours beats one 9-hour Sunday.</Banner></div>
        </Centered>

        <Centered id="faq" title="Questions, answered" intro="Short and honest. If something is missing, it is probably not built yet.">
          <div className="ld-faq">
            {FAQ.map(({ q, a }) => (
              <details key={q} name="faq" className="ld-qa">
                <summary>
                  <span>{q}</span>
                  <ChevronDownIcon className="ld-chev" />
                </summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </Centered>

        <section className="ld-section ld-alt ld-final" aria-labelledby="ld-final-h">
          <div className="ld-wrap">
            <h2 id="ld-final-h">Know your date. We'll handle the days.</h2>
            <div className="ld-cta-row ld-center">
              <Button size="lg" onClick={onStartGuest}>Try it now, no sign-in</Button>
              <LinkButton to="/signup" variant="secondary" size="lg">Create account</LinkButton>
            </div>
          </div>
        </section>
      </main>

      <footer className="ld-footer">
        <div className="ld-wrap ld-footer-in">
          <div className="ld-foot-brand">
            <span className="ld-logo"><LogoMark /><span>Kairos</span></span>
            <p>The right question, at the right time.</p>
            <button type="button" className="ld-foot-try text-link" onClick={onStartGuest}>Try it now, no sign-in</button>
          </div>
          <nav aria-label="Product">
            <h2 className="ld-foot-h">Product</h2>
            <a href="#how" className="ld-link">How it works</a>
            <a href="#cbt" className="ld-link">Exam screen</a>
            <a href="#faq" className="ld-link">FAQ</a>
            <Link to="/signin" className="ld-link">Sign in</Link>
          </nav>
          <nav aria-label="Exams">
            <h2 className="ld-foot-h">Exams</h2>
            {EXAMS.map((e) => <a key={e.name} href="#exams" className="ld-link">{e.name}</a>)}
          </nav>
          <nav aria-label="Legal">
            <h2 className="ld-foot-h">Legal</h2>
            <Link to="/privacy" className="ld-link">Privacy</Link>
            <Link to="/terms" className="ld-link">Terms</Link>
            <Link to="/privacy#contact" className="ld-link">Contact</Link>
          </nav>
        </div>
        <div className="ld-wrap ld-copy">
          <span>© Kairos</span>
          <span>JEE Main · NEET UG · IAT</span>
        </div>
      </footer>
    </div>
  );
}
