import { Link } from 'react-router';
import { Card, EmptyState, LinkButton, Section } from '../../components/ui';
import { readAnalysis } from '../../cbt/model';
import type { MockDoc } from '../../store';
import { LineChart } from '../charts/LineChart';
import { pct } from '../charts/primitives';
import { marksText } from '../compute';

const when = (t?: number) => (t ? new Date(t).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '');

/** Mocks tab: score trend and one card per attempt, each linking to its full report. */
export function MocksTab({ mocks }: { mocks: MockDoc[] }) {
  const sorted = [...mocks].filter((m) => readAnalysis(m)).sort((a, b) => (a.submittedAt ?? 0) - (b.submittedAt ?? 0));
  if (sorted.length === 0) {
    return (
      <EmptyState title="No mock reports yet" action={<LinkButton to="/mocks">Take the sample mock</LinkButton>}>
        Your first full mock gives you a report: where the marks went, how your time and stamina held up, and what to fix first.
      </EmptyState>
    );
  }
  const share = (m: MockDoc) => {
    const s = m.score as { marks?: number; max?: number } | null;
    return s && typeof s.marks === 'number' && s.max ? Math.max(0, s.marks / s.max) : null;
  };
  const shares = sorted.map(share);
  const graded = shares.filter((x) => x !== null).length;
  return (
    <div className="stack gap-section">
      {graded >= 2 && (
        <Section title="Score trend">
          <Card>
            <LineChart
              points={shares.map((p, i) => ({ x: i, y: p }))}
              xDomain={[0, sorted.length - 1]} yDomain={[0, 1]}
              xTicks={sorted.map((_, i) => ({ v: i, label: `#${i + 1}` }))}
              yTicks={[0, 0.5, 1].map((v) => ({ v, label: pct(v) }))}
              summary={`Score as a share of the paper over ${sorted.length} mocks: ${shares.map((p) => pct(p)).join(', ')}.`}
              table={{ caption: 'Score by mock', head: ['Mock', 'Score'], rows: sorted.map((m, i) => [`#${i + 1} ${readAnalysis(m)!.title}`, pct(shares[i])]) }}
              endLabel={pct(shares[shares.length - 1])}
            />
          </Card>
        </Section>
      )}
      <Section title="Your attempts">
        <div className="grid-auto">
          {[...sorted].reverse().map((m) => {
            const a = readAnalysis(m)!;
            const s = m.score as { marks?: number; max?: number } | null;
            const attempted = a.counts.correct + a.counts.wrong + a.counts.partial;
            return (
              <Card key={m.id}>
                <div className="stack gap-base">
                  <div className="stack gap-s1">
                    <h3 className="text-h3">{a.title}</h3>
                    <p className="text-small text-slate">{when(m.submittedAt)}</p>
                  </div>
                  <p className="tabular text-h1">{s && typeof s.marks === 'number' ? `${marksText(s.marks)} / ${marksText(s.max ?? 0)}` : 'Result pending'}</p>
                  <p className="text-small text-slate">{attempted} of {a.questions.length} attempted · {a.counts.correct} right, {a.counts.wrong} wrong</p>
                  <Link to={`/analysis/mock/${m.id}`} className="inline-flex min-h-s7 items-center font-semibold text-primary">Open the full report</Link>
                </div>
              </Card>
            );
          })}
        </div>
      </Section>
    </div>
  );
}
