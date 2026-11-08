import type { MockDoc } from '../store';
import { Card, Chip, Section, Stat } from '../components/ui';
import { formatClock, isPaperScore, readAnalysis } from './model';

const GRID = 'grid gap-s4 grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))]';
const SUBJECT_NAME: Record<string, string> = { PHY: 'Physics', CHE: 'Chemistry', MAT: 'Mathematics', BOT: 'Botany', ZOO: 'Zoology' };

/**
 * Stable contract: `mock` is the stored MockDoc (see README.md for `analysis`). This component
 * renders from the doc alone, so analysis tabs can be mounted next to it with the same prop.
 */
export function MockResultSummary({ mock }: { mock: MockDoc }) {
  const a = readAnalysis(mock);
  const score = isPaperScore(mock.score) ? mock.score : null;
  if (!a) {
    return (
      <Card>
        <p className="text-slate">This attempt has no summary to show.</p>
      </Card>
    );
  }
  const attempted = a.counts.correct + a.counts.wrong + a.counts.partial;
  const name = (c: string) => SUBJECT_NAME[c] ?? c;
  return (
    <div className="stack gap-section" data-testid="mock-summary">
      <div className={GRID}>
        <Card tone="primary">
          {score ? (
            <Stat label="Score" value={<span data-testid="score">{score.marks} / {score.max}</span>} hint={a.submitReason === 'auto' ? 'Submitted when time ran out' : 'Submitted by you'} />
          ) : (
            <Stat label="Score" value={<span data-testid="score">Result pending</span>} hint="Marking for this paper is not available on this device yet. We will show your score as soon as it is." />
          )}
        </Card>
        <Card>
          <Stat label="Time used" value={formatClock(a.usedMs)} hint={`of ${formatClock(a.durationMs)}`} />
        </Card>
        <Card>
          <Stat label="Attempted" value={`${attempted} / ${a.questions.length}`} hint={score ? `${a.counts.correct} correct, ${a.counts.wrong} wrong, ${a.counts.blank} blank` : `${a.counts.answered + a.counts.answered_marked} answered`} />
        </Card>
      </div>

      {a.lostUnsaved > 0 && (
        <Card tone="primary" role="note">
          <p data-testid="lost-unsaved">
            You lost {a.lostUnsaved} {a.lostUnsaved === 1 ? 'answer' : 'answers'} by navigating without saving. On exam day, press Save &amp; Next before you move on, and the answer is kept.
          </p>
        </Card>
      )}

      {score && (
        <Section title="By subject and section">
          <div className={GRID}>
            {Object.entries(a.subjectScores).map(([code, t]) => (
              <Card key={code}>
                <div className="stack gap-tight">
                  <div className="flex items-baseline justify-between gap-s4">
                    <h3 className="text-h3">{name(code)}</h3>
                    <span className="tabular text-h3">{t.marks} / {a.maxBySubject[code]}</span>
                  </div>
                  <p className="text-small text-slate">{t.correct} correct, {t.wrong} wrong, {t.blank} blank</p>
                  <ul className="stack gap-tight text-small">
                    {Object.entries(a.sectionScores)
                      .filter(([k]) => k.startsWith(`${code}.`))
                      .map(([k, s]) => (
                        <li key={k} className="flex justify-between gap-s4">
                          <span>Section {k.split('.')[1]}</span>
                          <span className="tabular">{s.marks} / {a.maxBySection[k]}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </Section>
      )}

      <Section title="Focus log" aside={<Chip>{a.focusLog.length} {a.focusLog.length === 1 ? 'entry' : 'entries'}</Chip>}>
        {a.focusLog.length === 0 ? (
          <p className="text-slate">You stayed on the exam screen the whole time.</p>
        ) : (
          <>
            <p className="text-slate">Times you left or came back to the exam tab. This is only for you, nothing is penalised.</p>
            <ul className="stack gap-tight text-small">
              {a.focusLog.map((f, i) => (
                <li key={i} className="tabular">{formatClock(f.t)}: {f.type === 'leave' ? 'left the exam tab' : 'came back'}</li>
              ))}
            </ul>
          </>
        )}
      </Section>
    </div>
  );
}
