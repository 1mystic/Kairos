import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Button, Card, CardGrid, Chip, Columns, EmptyState, Inline, Input, LinkButton, ListRow, Page, PageHeader, ProgressBar, Section, Select, Stack, Tabs } from '../components/ui';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import type { Catalog, Diff } from './catalog';
import { useDone } from './done';
import { complexity, diffCounts, doneCount, filterRows, nextUnsolved, patternCounts, trackRows, NO_FILTERS, type Filters, type Row } from './logic';
import { CatalogGate, DiffChip } from './parts';

const DIFF_TABS = [
  { id: 'all', label: 'All' },
  { id: 'E', label: 'Easy' },
  { id: 'M', label: 'Medium' },
  { id: 'H', label: 'Hard' },
] as const;

const WIDE = '(min-width: 1024px)';
function useWide(): boolean {
  const [wide, setWide] = useState(() => (typeof matchMedia === 'function' ? matchMedia(WIDE).matches : false));
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(WIDE);
    const on = () => setWide(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return wide;
}

function DoneBox({ row, done, set }: { row: Row; done: boolean; set(slug: string, v: boolean): void }) {
  return (
    <label className="check-row">
      <input type="checkbox" checked={done} onChange={(e) => set(row.slug, e.target.checked)} aria-label={`Mark ${row.p.t} solved`} />
    </label>
  );
}

function ProblemRow({ row, trackId, done, set }: { row: Row; trackId: string; done: boolean; set(slug: string, v: boolean): void }) {
  const { p, slug } = row;
  return (
    <li className="row gap-tight">
      <DoneBox row={row} done={done} set={set} />
      <Link to={`/dsa/p/${slug}?track=${trackId}`} className="link-row min-w-0 flex-1">
        <ListRow lead={<span className="text-small">{p.n}</span>} title={p.t} description={complexity(p)} className="flex-1">
          {p.pat && <Chip>{p.pat}</Chip>}
          <DiffChip d={p.d} />
        </ListRow>
      </Link>
    </li>
  );
}

function ProblemCard({ row, trackId, done, set }: { row: Row; trackId: string; done: boolean; set(slug: string, v: boolean): void }) {
  const { p, slug } = row;
  return (
    <Card as="article" className="justify-between">
      <Stack gap="tight">
        <p className="text-body font-semibold"><Link to={`/dsa/p/${slug}?track=${trackId}`} className="text-link">{p.n}. {p.t}</Link></p>
        <Inline><DiffChip d={p.d} />{p.pat && <Chip>{p.pat}</Chip>}</Inline>
        <p className="text-small text-slate">{complexity(p)}</p>
      </Stack>
      <label className="check-row">
        <input type="checkbox" checked={done} onChange={(e) => set(slug, e.target.checked)} aria-label={`Mark ${p.t} solved`} />
        <span className="text-small">Solved</span>
      </label>
    </Card>
  );
}

export function TrackView({ cat, trackId, wide }: { cat: Catalog; trackId: string; wide?: boolean }) {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const media = useWide();
  const isWide = wide ?? media;
  const { done, set } = useDone();
  const found = useMemo(() => trackRows(cat, trackId), [cat, trackId]);
  const [f, setF] = useState<Filters>(() => {
    const d = sp.get('diff');
    return { ...NO_FILTERS, pattern: sp.get('pattern') ?? '', query: sp.get('q') ?? '', diff: d === 'E' || d === 'M' || d === 'H' ? d : 'all' };
  });
  useDocumentTitle(found ? `${found.track.name}: DSA problems` : 'DSA track');

  if (!found) {
    return (
      <Page width="reading">
        <PageHeader title="Track not found" />
        <EmptyState title="We could not find that track" action={<LinkButton to="/dsa">All tracks</LinkButton>}>It may have been renamed. Pick a track from the DSA page.</EmptyState>
      </Page>
    );
  }
  const { track, rows } = found;
  const shown = filterRows(rows, f, done);
  const patterns = patternCounts(rows);
  const dc = diffCounts(rows, done);
  const solved = doneCount(rows, done);
  const next = nextUnsolved(rows, done);
  const patch = (x: Partial<Filters>) => setF((cur) => ({ ...cur, ...x }));

  const side = (
    <Card>
      <Stack>
        <h2 className="text-h2">Track overview</h2>
        <p className="text-body">Solved {solved} of {rows.length}</p>
        <ProgressBar value={solved} max={Math.max(rows.length, 1)} label={`${track.name}: ${solved} of ${rows.length} solved`} />
        <Inline>
          {(['E', 'M', 'H'] as const).map((d: Diff) => (
            <Chip key={d} tone={d === 'E' ? 'good' : d === 'M' ? 'warn' : 'bad'}>{DIFF_TABS.find((t) => t.id === d)!.label} {dc[d].done}/{dc[d].total}</Chip>
          ))}
        </Inline>
        <Stack gap="tight">
          <h3 className="text-small font-semibold">Patterns</h3>
          {patterns.slice(0, 6).map(({ pattern, count }) => (
            <div key={pattern} className="stack-label">
              <span className="text-caption">{pattern} · {count}</span>
              <ProgressBar value={count} max={patterns[0]?.count ?? 1} label={`${pattern}: ${count} problems`} />
            </div>
          ))}
        </Stack>
        <Button disabled={!next} onClick={() => next && nav(`/dsa/p/${next.slug}?track=${track.id}`)}>
          {next ? 'Start next unsolved' : 'All solved'}
        </Button>
      </Stack>
    </Card>
  );

  return (
    <Page width="app">
      <PageHeader
        title={track.name}
        subtitle={track.focus}
        actions={<LinkButton to="/dsa" variant="secondary">All tracks</LinkButton>}
      />
      <Columns ratio="main-side" side={side}>
        <Section title={`Problems (${shown.length})`}>
          <Card>
            <Stack>
              <Tabs label="Difficulty" tabs={DIFF_TABS} value={f.diff} onChange={(id) => patch({ diff: id })} />
              <CardGrid cols={3}>
                <Select triggerLabel="Pattern" value={f.pattern} onChange={(e) => patch({ pattern: e.target.value })}>
                  <option value="">All patterns</option>
                  {patterns.map((p) => <option key={p.pattern} value={p.pattern}>{p.pattern} ({p.count})</option>)}
                </Select>
                <Input type="search" aria-label="Search problems" placeholder="Search title, number or tag" value={f.query} onChange={(e) => patch({ query: e.target.value })} />
                <Button variant={f.hideDone ? 'primary' : 'secondary'} aria-pressed={f.hideDone} onClick={() => patch({ hideDone: !f.hideDone })}>Hide done</Button>
              </CardGrid>
            </Stack>
          </Card>
          {shown.length === 0 ? (
            <EmptyState title="Nothing matches" action={<Button variant="secondary" onClick={() => setF(NO_FILTERS)}>Clear filters</Button>}>
              Loosen a filter, or clear them all.
            </EmptyState>
          ) : isWide ? (
            <ul className="stack gap-tight" aria-label="Problems">
              {shown.map((r) => <ProblemRow key={r.slug} row={r} trackId={track.id} done={done.has(r.slug)} set={set} />)}
            </ul>
          ) : (
            <CardGrid cols={2}>
              {shown.map((r) => <ProblemCard key={r.slug} row={r} trackId={track.id} done={done.has(r.slug)} set={set} />)}
            </CardGrid>
          )}
        </Section>
      </Columns>
    </Page>
  );
}

export function TrackPage() {
  const { track = '' } = useParams();
  return <CatalogGate title="DSA track">{(cat) => <TrackView cat={cat} trackId={track} />}</CatalogGate>;
}
