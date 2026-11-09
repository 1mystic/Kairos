import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Banner, Button, Card, Columns, IconButton, Input, Skeleton, SpanGrid, spanClass } from '../components/ui';
import { usePredictedScore } from '../diagnostic/usePredictedScore';
import './dashboard.css';
import { CardMenu } from './CardMenu';
import { Customize } from './Customize';
import { selectRangeData, selectReadiness } from './data';
import { CalendarIcon2, ChevronLeftIcon, ChevronRightIcon, SlidersIcon } from './icons';
import { packSpans, patchWidget, type Layout, type WidgetState } from './layout';
import { selectPlan } from './plan';
import {
  canGoNext, clampToToday, isYmd, PREVIOUS_WORD, RANGE_KINDS, RANGE_LABEL, rangeLabel, rangeTitle, setKind, shiftRange, todayYmd, type Range, type RangeKind,
} from './range';
import { metaOf, type WidgetId } from './registry';
import { makeSampleBundle } from './sample';
import type { DashboardBundle } from './types';
import { useDashboardData } from './useDashboardData';
import { useLayout } from './useLayout';
import { WIDGET_COMPONENTS, type WidgetCtx } from './widgets';

const EMPTY: DashboardBundle = { sessions: [], mocks: [], mastery: null, profile: null, paceLog: [], usage: null, band: null, workRemainingMin: null };

function useWide(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : false);
  const [m, setM] = useState(get);
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return m;
}

/** Daily / Week / Month as a radio group (arrow keys move and select). */
function RangeControl({ value, onChange }: { value: RangeKind; onChange(k: RangeKind): void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const key = (e: KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const n = (i + d + RANGE_KINDS.length) % RANGE_KINDS.length;
    onChange(RANGE_KINDS[n]!);
    refs.current[n]?.focus();
  };
  return (
    <div role="radiogroup" aria-label="Date range" className="tabs">
      {RANGE_KINDS.map((k, i) => (
        <button key={k} ref={(el) => { refs.current[i] = el; }} type="button" role="radio" aria-checked={k === value} tabIndex={k === value ? 0 : -1} onClick={() => onChange(k)} onKeyDown={(e) => key(e, i)}
          className="tab">{RANGE_LABEL[k]}</button>
      ))}
    </div>
  );
}

function Frame({ w, ctx, className, onHide, onSize, onOptions }: { w: WidgetState; ctx: WidgetCtx; className: string; onHide(): void; onSize(s: WidgetState['size']): void; onOptions(): void }) {
  const meta = metaOf(w.id)!;
  const Body = WIDGET_COMPONENTS[w.id];
  const hid = `dash-${w.id}-h`;
  return (
    <div className={className} data-widget={w.id} data-size={w.size}>
      <Card as="section" tone={meta.tone === 'primary' ? 'primary' : 'default'} aria-labelledby={hid} className={`h-full ${meta.tone === 'accent' ? 'bg-accent-50' : ''}`}>
        <div className="stack-card h-full">
          <header className="row-between flex-nowrap">
            <h2 id={hid} className="text-h3">{meta.title}</h2>
            <CardMenu meta={meta} size={w.size} onHide={onHide} onSize={onSize} onOptions={onOptions} />
          </header>
          <Body size={w.size} options={w.options} ctx={ctx} />
        </div>
      </Card>
    </div>
  );
}

function Loading({ layout }: { layout: Layout }) {
  return (
    <SpanGrid aria-busy="true" aria-label="Loading your dashboard">
      {layout.widgets.filter((w) => w.visible).slice(0, 6).map((w) => (
        <div key={w.id} className={spanClass(w.size === 'l' || w.id === 'readiness' ? 12 : 6)}><Skeleton className="skeleton-card" /></div>
      ))}
    </SpanGrid>
  );
}

/** The Home dashboard. Mount inside Home; it needs a StoreProvider. `now` is for tests. */
export function Dashboard({ now = Date.now }: { now?: () => number }) {
  const { loading, bundle: loaded, error } = useDashboardData(now);
  const { layout, setLayout, reset } = useLayout();
  const today = useMemo(() => todayYmd(now()), [now]);
  const [end, setEnd] = useState(today);
  const [picker, setPicker] = useState(false);
  const [sample, setSample] = useState(false);
  const [custom, setCustom] = useState<{ focus: WidgetId | null } | null>(null);
  const wide = useWide('(min-width: 1280px)');

  const range: Range = clampToToday({ kind: layout.range, end }, today);
  // the predicted band is only computed (and the bank only fetched) when a card actually shows it
  const wantsBand = layout.widgets.some((w) => w.visible && ((w.id === 'readiness' && w.options.view === 'band') || (w.id === 'stats' && Array.isArray(w.options.tiles) && w.options.tiles.includes('band'))));
  const predicted = usePredictedScore({ enabled: wantsBand && !sample });
  const base0 = sample ? makeSampleBundle(today) : (loaded ?? EMPTY);
  const bundle = useMemo<DashboardBundle>(
    () => (!sample && predicted.band && predicted.max ? { ...base0, band: { p25: predicted.band.p25, p50: predicted.band.p50, p75: predicted.band.p75, max: predicted.max } } : base0),
    [base0, predicted.band, predicted.max, sample],
  );
  const data = useMemo(() => selectRangeData(bundle.sessions, bundle.mocks, bundle.mastery, range, { today, names: bundle.names, uploads: bundle.uploads }), [bundle, range.kind, range.end, today]); // eslint-disable-line react-hooks/exhaustive-deps
  const readiness = useMemo(() => selectReadiness(bundle.mastery), [bundle]);
  const plan = useMemo(() => selectPlan(bundle.profile, bundle.paceLog, today, { workRemainingMin: bundle.workRemainingMin }), [bundle, today]);
  const ctx: WidgetCtx = { range, today, data, readiness, plan, bundle };

  const visible = layout.widgets.filter((w) => w.visible && metaOf(w.id));
  const hide = (id: WidgetId) => setLayout((l) => patchWidget(l, id, { visible: false }));
  const setRange = (r: Range) => setEnd(r.end);

  const frames = (list: WidgetState[], spans: (6 | 12)[]) =>
    list.map((w, i) => (
      <Frame key={w.id} w={w} ctx={ctx} className={spanClass(spans[i]!)} onHide={() => hide(w.id)} onSize={(s) => setLayout((l) => patchWidget(l, w.id, { size: s }))} onOptions={() => setCustom({ focus: w.id })} />
    ));
  const base = (w: WidgetState, columns: boolean, zone: 'main' | 'side'): 6 | 12 => (columns ? (zone === 'main' && w.size === 's' ? 6 : 12) : w.size === 'l' ? 12 : 6);
  const main = visible.filter((w) => metaOf(w.id)!.zone === 'main');
  const side = visible.filter((w) => metaOf(w.id)!.zone === 'side');
  const columns = wide && main.length > 0 && side.length > 0;

  return (
    <section aria-label="Dashboard" className="stack-grid">
      <div className="row-between">
        <div className="row-actions">
        <RangeControl value={layout.range} onChange={(k) => setLayout((l) => ({ ...l, range: setKind({ kind: l.range, end }, k).kind }))} />
        <div className="row gap-s1">
          <IconButton label={`Previous ${PREVIOUS_WORD[range.kind].replace('previous ', '')}`} variant="ghost" onClick={() => setRange(shiftRange(range, -1, today))}><ChevronLeftIcon /></IconButton>
          <span className="min-w-40 text-center text-body font-semibold tabular" aria-live="polite" title={rangeTitle(range, today)}>{rangeLabel(range)}</span>
          <IconButton label={`Next ${PREVIOUS_WORD[range.kind].replace('previous ', '')}`} variant="ghost" disabled={!canGoNext(range, today)} onClick={() => setRange(shiftRange(range, 1, today))}><ChevronRightIcon /></IconButton>
          <IconButton label="Pick a date" variant="ghost" aria-expanded={picker} onClick={() => setPicker((p) => !p)}><CalendarIcon2 /></IconButton>
          {range.end !== today && <Button size="sm" variant="ghost" onClick={() => setEnd(today)}>Today</Button>}
        </div>
        </div>
        <div className="row-actions">
          <Button size="sm" variant="secondary" role="switch" aria-checked={sample} onClick={() => setSample((s) => !s)}>{sample ? 'Sample data: on' : 'Preview with sample data'}</Button>
          <Button size="sm" variant="secondary" onClick={() => setCustom({ focus: null })}><SlidersIcon size={18} />Customise</Button>
        </div>
      </div>
      {picker && (
        <div className="w-full max-w-form"><Input type="date" aria-label="Choose the last day of the range" value={range.end} max={today} onChange={(e) => { if (isYmd(e.target.value)) { setEnd(e.target.value > today ? today : e.target.value); setPicker(false); } }} /></div>
      )}
      {sample && <Banner tone="accent" role="status" actions={<Button size="sm" variant="secondary" onClick={() => setSample(false)}>Turn off</Button>}><strong>Sample data.</strong> These numbers are made up so you can see the layout. Your own data is untouched.</Banner>}
      {error && !sample && <Banner tone="accent" role="status">We could not load your data just now. The cards below are empty; try reloading.</Banner>}

      {loading && !sample ? <Loading layout={layout} /> : visible.length === 0 ? (
        <Card><div className="stack-card items-start"><p className="text-body">All cards are hidden.</p><Button size="sm" onClick={() => setCustom({ focus: null })}>Customise</Button></div></Card>
      ) : columns ? (
        <Columns ratio="main-side" sticky={false} side={frames(side, side.map(() => 12))}>
          <SpanGrid>{frames(main, packSpans(main.map((w) => base(w, true, 'main'))))}</SpanGrid>
        </Columns>
      ) : (
        <SpanGrid>{frames(visible, packSpans(visible.map((w) => base(w, false, metaOf(w.id)!.zone))))}</SpanGrid>
      )}

      {custom && <Customize layout={layout} onChange={setLayout} onReset={reset} onClose={() => setCustom(null)} focusId={custom.focus} />}
    </section>
  );
}
