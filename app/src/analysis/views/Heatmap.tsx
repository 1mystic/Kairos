import { useState } from 'react';
import { Link } from 'react-router';
import { Button, Card, CardGrid, Chip } from '../../components/ui';
import { AlertIcon } from '../../components/icons';
import { marksText, subjectName, type HeatCell, type MasteryBand } from '../compute';
import { Chart, pct } from '../charts/primitives';

const BAND_WORD: Record<MasteryBand, string> = { unknown: 'Not enough data', low: 'Needs work', mid: 'Steady', good: 'Good', strong: 'Strong' };
const BAND_BG: Record<MasteryBand, string> = {
  unknown: 'bg-surface text-ink', low: 'bg-accent-50 text-ink', mid: 'bg-surface-3 text-ink', good: 'bg-primary-50 text-ink', strong: 'bg-primary text-surface',
};
const CONFIDENCE_WORD = { none: 'No attempts yet', not_enough_data: 'Not enough data to say', rough: 'A rough estimate', confident: 'A confident estimate' } as const;

/** Chapter weight x mastery grid. Cells are buttons; the detail panel (not a hover tooltip) carries the numbers. */
export function Heatmap({ cells, exam, empty, saved }: { cells: HeatCell[]; exam: string; empty?: string; /** chapter id -> saved AI answers, shows a link to /saved */ saved?: Record<string, number> }) {
  const [sel, setSel] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  if (cells.length === 0) return <p className="text-slate">{empty ?? 'No chapters to show yet.'}</p>;
  const known = cells.filter((c) => c.band !== 'unknown');
  const hidden = all || known.length === 0 ? 0 : cells.length - known.length;
  const shown = hidden ? known : cells;
  const subjects = [...new Set(shown.map((c) => c.subject))];
  const flagged = cells.filter((c) => c.flagged);
  const picked = cells.find((c) => c.id === sel);
  const summary = `Chapter heatmap with ${cells.length} chapters. ${flagged.length} high-weight chapters need work${flagged.length ? `: ${flagged.slice(0, 5).map((c) => c.name).join(', ')}` : ''}.`;
  return (
    <div className="stack-grid">
      <Chart
        summary={summary}
        table={{ caption: 'Chapters by weight and mastery', head: ['Chapter', 'Subject', 'Weight', 'Mastery', 'Status'], rows: cells.map((c) => [c.name, subjectName(c.subject), pct(c.weight), pct(c.mastery), c.flagged ? `${BAND_WORD[c.band]}, focus` : BAND_WORD[c.band]]) }}
      >
        <span className="sr-only">Chapter grid, details below.</span>
      </Chart>
      <div className="stack-grid" role="group" aria-label="Chapter heatmap">
        {subjects.map((s) => (
          <div key={s} className="stack-label">
            <h3 className="text-h3">{subjectName(s)}</h3>
            <CardGrid as="ul" cols="auto" gap="tight">
              {shown.filter((c) => c.subject === s).map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    aria-pressed={sel === c.id}
                    onClick={() => setSel(sel === c.id ? null : c.id)}
                    className={`stack h-full min-h-s8 w-full gap-s1 rounded-btn p-s3 text-left ${BAND_BG[c.band]} ${sel === c.id ? 'opacity-80' : ''}`}
                  >
                    <span className="text-small font-semibold">{c.name}</span>
                    <span className="row-between text-caption">
                      <span className="tabular font-semibold">{c.mastery === null ? BAND_WORD.unknown : `${pct(c.mastery)} · ${BAND_WORD[c.band]}`}</span>
                      {c.flagged && <span className="inline-flex items-center gap-s1 rounded-pill bg-accent px-s2 font-semibold text-ink"><AlertIcon width={14} height={14} aria-hidden="true" />Focus</span>}
                    </span>
                  </button>
                </li>
              ))}
            </CardGrid>
          </div>
        ))}
      </div>
      {hidden > 0 && <div><Button variant="secondary" size="sm" onClick={() => setAll(true)}>Show {hidden} chapters with not enough data</Button></div>}
      <p className="text-small text-slate">Sorted by what would help most: how much of the exam a chapter covers, and how well you know it. Chapters marked Not enough data are not called weak: we have not seen enough of your answers yet.</p>
      {picked && (
        <Card tone="primary" role="region" aria-label={`${picked.name} details`}>
          <div className="stack-label">
            <div className="row-between">
              <h3 className="text-h3">{picked.name}</h3>
              <Chip tone={picked.flagged ? 'accent' : 'neutral'}>{picked.flagged ? 'High weight, needs work' : BAND_WORD[picked.band]}</Chip>
            </div>
            <p className="text-small">About {pct(picked.weight)} of the exam. {picked.mastery === null ? CONFIDENCE_WORD[picked.confidence] + '.' : `Mastery ${pct(picked.mastery)}. ${CONFIDENCE_WORD[picked.confidence]} from ${picked.n} answers.`}</p>
            {picked.evidence && <p className="text-small">In this paper: {picked.evidence.correct} right, {picked.evidence.wrong} wrong, {picked.evidence.blank} blank, {marksText(picked.evidence.marksLost)} marks lost.</p>}
            <div className="row-actions">
              <Link to={`/practice/${exam}/${picked.id}`} className="inline-flex min-h-s7 items-center font-semibold text-primary">Practise this chapter</Link>
              {!!saved?.[picked.id] && (
                <Link to={`/saved?chapter=${encodeURIComponent(picked.id)}`} className="inline-flex min-h-s7 items-center font-semibold text-primary">
                  {saved[picked.id]} saved {saved[picked.id] === 1 ? 'answer' : 'answers'}
                </Link>
              )}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
