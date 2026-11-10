import { Link } from 'react-router';
import { ArrowRightIcon } from '../components/icons';
import { Card, CardGrid, Chip, Inline, LinkButton, Page, PageHeader, ProgressBar, Section, Stack } from '../components/ui';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import type { Catalog } from './catalog';
import { useDone } from './done';
import { ALL_TRACK, DIFF_LABEL, diffCounts, doneCount, patternCounts, readLast, trackOf, trackRows, type Row } from './logic';
import { CatalogGate, DiffChip } from './parts';

const TOP_PATTERNS = 8;

export function DsaHubView({ cat, last }: { cat: Catalog; last?: string | null }) {
  const { done } = useDone();
  const all = trackRows(cat, ALL_TRACK)!.rows;
  const total = all.length;
  const solved = doneCount(all, done);
  const dc = diffCounts(all, done);
  const patterns = patternCounts(all).slice(0, TOP_PATTERNS);
  const lastP = last ? cat.problems[last] : undefined;
  const lastTrack = last ? trackOf(cat, last) : undefined;

  return (
    <Page width="app">
      <PageHeader
        title="DSA problems"
        subtitle="Animated walk-throughs of the classic interview problems: a brute force, the optimised version, and what changes between them."
        actions={<LinkButton to={`/dsa/t/${ALL_TRACK}`} variant="secondary">Browse all {total}</LinkButton>}
      />

      <Section title="Your progress">
        <Card>
          <Stack>
            <p className="text-h3">Solved {solved} of {total}</p>
            <ProgressBar value={solved} max={Math.max(total, 1)} label={`Solved ${solved} of ${total} problems`} />
            <Inline>
              {(['E', 'M', 'H'] as const).map((d) => (
                <Chip key={d} tone={d === 'E' ? 'good' : d === 'M' ? 'warn' : 'bad'}>{DIFF_LABEL[d]} {dc[d].done}/{dc[d].total}</Chip>
              ))}
            </Inline>
          </Stack>
        </Card>
      </Section>

      {lastP && last && (
        <Section title="Continue">
          <Card>
            <div className="row-between">
              <Stack gap="tight">
                <p className="text-body font-semibold">{lastP.n}. {lastP.t}</p>
                <Inline><DiffChip d={lastP.d} />{lastP.pat && <Chip>{lastP.pat}</Chip>}</Inline>
              </Stack>
              <LinkButton to={`/dsa/p/${last}${lastTrack ? `?track=${lastTrack.id}` : ''}`}>Continue</LinkButton>
            </div>
          </Card>
        </Section>
      )}

      <Section title="Role tracks">
        <CardGrid cols={4}>
          {cat.tracks.map((t) => {
            const rows: Row[] = t.ids.map((slug) => ({ slug, p: cat.problems[slug]! }));
            const n = doneCount(rows, done);
            return (
              <Card key={t.id} as="article" className="justify-between">
                  <Stack gap="tight">
                    <h3 className="text-h3">{t.name}</h3>
                    <p className="text-small text-slate">{t.focus}</p>
                    <p className="text-small">{t.ids.length} problems · {n} solved</p>
                    <ProgressBar value={n} max={Math.max(t.ids.length, 1)} label={`${t.name}: ${n} of ${t.ids.length} solved`} />
                  </Stack>
                  <LinkButton to={`/dsa/t/${t.id}`} variant="secondary" aria-label={`Open track: ${t.name}`}>Open track <ArrowRightIcon /></LinkButton>
              </Card>
            );
          })}
        </CardGrid>
      </Section>

      <Section title="Practise by pattern">
        <Inline>
          {patterns.map(({ pattern, count }) => (
            <Link key={pattern} to={`/dsa/t/${ALL_TRACK}?pattern=${encodeURIComponent(pattern)}`} className="pill-btn">{pattern} · {count}</Link>
          ))}
        </Inline>
      </Section>

      <Section title="Interview questions">
        <Card>
          <div className="row-between">
            <p className="text-body">Short DSA concept questions, scored and spaced like the rest of your practice.</p>
            <LinkButton to="/practice" variant="secondary">Practise DSA questions</LinkButton>
          </div>
        </Card>
      </Section>
    </Page>
  );
}

export function DsaHub() {
  useDocumentTitle('DSA problems');
  return <CatalogGate title="DSA problems">{(cat) => <DsaHubView cat={cat} last={readLast()} />}</CatalogGate>;
}
