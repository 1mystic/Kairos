import { CardGrid, TwoPane } from '../components/ui';
import { CalendarIcon, ClockIcon, PlanIcon, SettingsIcon, TargetIcon } from '../components/icons';
import { TodayCardDemo } from './TodayCardDemo';
import { useReveal } from './useReveal';

const STEPS = [
  { icon: CalendarIcon, title: 'Your exam date', body: 'Kairos counts the days back from it and splits them into phases.' },
  { icon: SettingsIcon, title: 'Your time and weak spots', body: 'Your daily capacity sets the ceiling. Attempts show where marks leak.' },
  { icon: PlanIcon, title: "Today's plan", body: 'Sized from the work left against the days left, with the reason shown.' },
];

const INPUTS = [
  { icon: CalendarIcon, title: 'Days left', body: 'The work left is spread over the days you actually have.' },
  { icon: TargetIcon, title: 'Weak topics', body: 'Topics where you lose marks get a bigger share of today.' },
  { icon: ClockIcon, title: 'What you are forgetting', body: 'Reviews return just before a topic would fade.' },
  { icon: PlanIcon, title: 'What you skipped', body: 'Missed work is carried, spread or, only if you choose, shed.' },
];

const PHASE_W = [30, 22, 18, 14, 12, 4];

const idx = (n: number) => ({ ['--i' as string]: n });

export function HowItDecides() {
  const [ref, shown] = useReveal<HTMLElement>(0.15);
  return (
    <section ref={ref} id="how" className="ld-section ld-alt ld-how" data-shown={shown} aria-labelledby="how-h">
      <div className="ld-wrap ld-how-stack">
        <div className="ld-head ld-head-center">
          <h2 id="how-h">How it decides</h2>
          <p>Every morning Kairos compares the work left with the time left, then sizes today. You see the reason, not just the list.</p>
        </div>

        <CardGrid as="ol" cols={3} className="ld-flow">
          {STEPS.map(({ icon: I, title, body }, i) => (
            <li key={title} className="card" style={idx(i)}>
              <span className="ld-step-row" aria-hidden="true">
                <span className="ld-step-n">{i + 1}</span>
                <span className="ld-step-line" data-last={i === STEPS.length - 1} />
                <span className="tile-icon"><I /></span>
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </li>
          ))}
        </CardGrid>

        <TwoPane align="stretch" className="ld-how-pane">
          <div className="ld-how-col ld-how-media">
            <TodayCardDemo />
          </div>
          <div className="ld-how-col">
            <div className="card ld-weighs" style={idx(3)}>
              <h3>What the planner weighs</h3>
              <ul className="ld-inputs">
                {INPUTS.map(({ icon: I, title, body }) => (
                  <li key={title}>
                    <span className="tile-icon"><I /></span>
                    <span><strong>{title}</strong><span className="ld-inputs-body">{body}</span></span>
                  </li>
                ))}
              </ul>
              <div className="ld-mb" aria-hidden="true">
                <p className="ld-cap">Phases, counted back from your date. Illustrative.</p>
                <div className="ld-mb-bar">
                  {PHASE_W.map((w, i) => <span key={i} className="ld-mb-seg" data-i={i} style={{ flexGrow: w, ...idx(i) }} />)}
                </div>
              </div>
            </div>
          </div>
        </TwoPane>
      </div>
    </section>
  );
}
