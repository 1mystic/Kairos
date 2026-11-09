import type { MockDoc } from '../store';
import { Card, CardGrid, Chip, Section, Stat } from '../components/ui';
import { CheckIcon, CloseIcon } from '../components/icons';
import { formatClock, isPaperScore, readAnalysis } from './model';

const SUBJECT_NAME: Record<string, string> = { PHY: 'Physics', CHE: 'Chemistry', MAT: 'Mathematics', BOT: 'Botany', ZOO: 'Zoology', DA: 'Technical', GA: 'General Aptitude', PRS: 'Probability & Statistics', LA: 'Linear Algebra', CO: 'Calculus & Optimization', PDS: 'Programming', DBW: 'Database & Warehousing', ML: 'Machine Learning', AI: 'Artificial Intelligence' };

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
  const negMarks = a.questions.reduce((n, q) => n + (typeof q.marks === 'number' && q.marks < 0 ? q.marks : 0), 0);
  const attempted = a.counts.correct + a.counts.wrong + a.counts.partial;
  const name = (c: string) => SUBJECT_NAME[c] ?? c;
  return (
    <div className="stack-section" data-testid="mock-summary">
      <CardGrid cols={3}>
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
          {score && (
            <div className="row-inline">
              <Chip tone="good" icon={<CheckIcon width={14} height={14} />}>{a.counts.correct} right</Chip>
              <Chip tone="bad" icon={<CloseIcon width={14} height={14} />}>{a.counts.wrong} wrong</Chip>
              <Chip>{a.counts.blank} blank</Chip>
              {negMarks < 0 && <Chip tone="bad">{negMarks} negative marks</Chip>}
            </div>
          )}
        </Card>
      </CardGrid>

      {a.lostUnsaved > 0 && (
        <Card tone="primary" role="note">
          <p data-testid="lost-unsaved">
            You lost {a.lostUnsaved} {a.lostUnsaved === 1 ? 'answer' : 'answers'} by navigating without saving. On exam day, press Save &amp; Next before you move on, and the answer is kept.
          </p>
        </Card>
      )}

      {score && (
        <Section title="By subject and section">
          <CardGrid cols={3}>
            {Object.entries(a.subjectScores).map(([code, t]) => (
              <Card key={code}>
                <div className="stack-label">
                  <div className="row-between">
                    <h3 className="text-h3">{name(code)}</h3>
                    <span className="tabular text-h3">{t.marks} / {a.maxBySubject[code]}</span>
                  </div>
                  <p className="text-small text-slate">{t.correct} correct, {t.wrong} wrong, {t.blank} blank</p>
                  <ul className="stack-label text-small">
                    {Object.entries(a.sectionScores)
                      .filter(([k]) => k.startsWith(`${code}.`))
                      .map(([k, s]) => (
                        <li key={k} className="row-between">
                          <span>Section {k.split('.')[1]}</span>
                          <span className="tabular">{s.marks} / {a.maxBySection[k]}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              </Card>
            ))}
          </CardGrid>
        </Section>
      )}

      <Section title="Focus log" aside={<Chip>{a.focusLog.length} {a.focusLog.length === 1 ? 'entry' : 'entries'}</Chip>}>
        {a.focusLog.length === 0 ? (
          <p className="text-slate">You stayed on the exam screen the whole time.</p>
        ) : (
          <>
            <p className="text-slate">Times you left or came back to the exam tab. This is only for you, nothing is penalised.</p>
            <ul className="stack-label text-small">
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
