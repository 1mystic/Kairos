import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import { AlertIcon, CheckIcon } from '../components/icons';
import { Button, Card, Chip, EmptyState, Inline, LinkButton, Page, PageHeader, Skeleton, Stack } from '../components/ui';
import { useDocumentTitle } from '../shell/useDocumentTitle';
import type { Catalog } from './catalog';
import { useDone } from './done';
import { ALL_TRACK, dryrunUrl, leetcodeUrl, neighbours, saveLast, trackOf, trackRows } from './logic';
import { CatalogGate, DiffChip } from './parts';
import { parseDryrunMessage, useKairosTheme, writeDryrunTheme } from './theme';

export const READY_TIMEOUT_MS = 8000;

function Frame({ slug, title }: { slug: string; title: string }) {
  const theme = useKairosTheme();
  const { set } = useDone();
  const ref = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [failed, setFailed] = useState(false);

  // theme goes into DryRun's storage BEFORE the iframe gets a src, so it never flashes the wrong theme
  useEffect(() => {
    writeDryrunTheme(theme);
    setSrc(dryrunUrl(slug, true));
    if (typeof navigator !== 'undefined' && navigator.onLine === false) setFailed(true);
    // only the first theme matters here; later changes are posted below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // keep in sync after load
  useEffect(() => {
    writeDryrunTheme(theme);
    ref.current?.contentWindow?.postMessage({ type: 'kairos:theme', theme }, location.origin);
  }, [theme]);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      const m = parseDryrunMessage(e, ref.current?.contentWindow ?? null);
      if (!m || m.slug !== slug) return;
      if (m.type === 'dryrun:ready') {
        setReady(true);
        ref.current?.contentWindow?.postMessage({ type: 'kairos:theme', theme }, location.origin);
      } else {
        set(slug, m.done);
      }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [slug, theme, set]);

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), READY_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [slug]);

  const show = ready || timedOut;
  return (
    <Stack>
      <Inline>
        <Chip>Click the stage, then use ← → and space</Chip>
        <Chip>Scroll inside the trace</Chip>
      </Inline>
      {failed && (
        <EmptyState icon={AlertIcon} title="Could not load the trace" action={<a className="btn btn-primary" href={dryrunUrl(slug)} target="_blank" rel="noopener noreferrer">Open the trace in a new tab</a>}>
          You may be offline. The trace opens on its own page too.
        </EmptyState>
      )}
      {!show && !failed && <Skeleton className="skeleton-card" />}
      {src && !failed && (
        <iframe
          ref={ref}
          title={`${title}: animated trace`}
          src={src}
          loading="eager"
          sandbox="allow-scripts allow-same-origin allow-popups allow-downloads"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          frameBorder={0}
          className={show ? 'w-full' : 'sr-only'}
          style={{ display: 'block', minHeight: 'max(32rem, calc(100dvh - var(--sticky-top)))' }}
        />
      )}
    </Stack>
  );
}

export function ProblemView({ cat, slug, trackParam }: { cat: Catalog; slug: string; trackParam?: string | null }) {
  const { isDone, set } = useDone();
  const p = cat.problems[slug];
  const track = trackOf(cat, slug);
  const trackId = trackParam && (trackParam === ALL_TRACK || cat.tracks.some((t) => t.id === trackParam)) ? trackParam : (track?.id ?? ALL_TRACK);
  useDocumentTitle(p ? `${p.n}. ${p.t}` : 'Problem not found');
  useEffect(() => { if (p) saveLast(slug); }, [p, slug]);

  if (!p) {
    return (
      <Page width="reading">
        <PageHeader title="Problem not found" />
        <EmptyState title="We could not find that problem" action={<LinkButton to="/dsa">All DSA problems</LinkButton>}>
          The link may be old. Pick a problem from a track.
        </EmptyState>
      </Page>
    );
  }
  const rows = trackRows(cat, trackId)?.rows ?? [];
  const { prev, next } = neighbours(rows, slug);
  const solved = isDone(slug);
  const to = (s: string) => `/dsa/p/${s}?track=${trackId}`;

  return (
    <Page width="app">
      <PageHeader
        title={`${p.n}. ${p.t}`}
        subtitle={<Inline><DiffChip d={p.d} />{p.pat && <Chip>{p.pat}</Chip>}</Inline>}
        actions={
          <>
            <LinkButton to={`/dsa/t/${trackId}`} variant="secondary">Back to track</LinkButton>
            <a className="btn btn-secondary" href={leetcodeUrl(slug)} target="_blank" rel="noopener noreferrer">Open on LeetCode</a>
            <Button variant={solved ? 'success' : 'primary'} aria-pressed={solved} onClick={() => set(slug, !solved)}>
              {solved && <CheckIcon />}{solved ? 'Solved' : 'Mark solved'}
            </Button>
          </>
        }
      />
      <Card>
        <Stack gap="tight">
          {p.br && <p className="text-body"><span className="font-semibold">Brute force:</span> {p.br}{p.bt && ` (${p.bt} time${p.bs ? `, ${p.bs} space` : ''})`}</p>}
          <p className="text-body"><span className="font-semibold">Optimised:</span> {p.ot || '?'} time, {p.os || '?'} space</p>
          {p.trick && <p className="text-body"><span className="font-semibold">Memory trick:</span> {p.trick}</p>}
        </Stack>
      </Card>
      <Frame key={slug} slug={slug} title={p.t} />
      <div className="row-between">
        {prev ? <LinkButton to={to(prev.slug)} variant="secondary" aria-label={`Previous problem: ${prev.p.t}`}>Previous</LinkButton> : <span />}
        {next ? <LinkButton to={to(next.slug)} variant="secondary" aria-label={`Next problem: ${next.p.t}`}>Next</LinkButton> : <span />}
      </div>
    </Page>
  );
}

export function ProblemPage() {
  const { slug = '' } = useParams();
  const [sp] = useSearchParams();
  return <CatalogGate title="DSA problem">{(cat) => <ProblemView cat={cat} slug={slug} trackParam={sp.get('track')} />}</CatalogGate>;
}
