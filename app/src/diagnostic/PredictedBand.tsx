import { useState } from 'react';
import { InfoIcon } from '../components/icons';
import { Chip, IconButton, LinkButton, Modal, SkeletonCards } from '../components/ui';
import { usePredictedScore, type PredictedScore } from './usePredictedScore';

/** "168–196 · target 180 · based on 214 questions" */
export function bandLine(p: PredictedScore): string {
  if (!p.band) return '';
  const parts = [`${Math.round(p.band.p25)}–${Math.round(p.band.p75)}`];
  if (p.target !== undefined) parts.push(`target ${p.target}`);
  if (p.attempts) parts.push(`based on ${p.attempts} questions`);
  return parts.join(' · ');
}

const pct = (v: number, max: number) => `${Math.max(0, Math.min(100, (v / max) * 100))}%`;

/** Flat range bar: P25-P75 as a tint block, median as a marker, target as a saffron tick. */
export function RangeBar({ p25, p50, p75, max, target }: { p25: number; p50: number; p75: number; max: number; target?: number }) {
  const lo = Math.max(0, p25);
  return (
    <div
      role="img"
      aria-label={`Likely range ${Math.round(p25)} to ${Math.round(p75)} out of ${max}, median ${Math.round(p50)}${target !== undefined ? `, target ${target}` : ''}`}
      className="relative h-s5 w-full rounded-pill bg-surface-3"
    >
      <span className="absolute inset-y-0 rounded-pill bg-primary-50" style={{ left: pct(lo, max), width: pct(Math.max(0, p75 - lo), max) }} />
      <span className="absolute inset-y-0 w-s1 rounded-pill bg-primary" style={{ left: pct(p50, max) }} />
      {target !== undefined && <span className="absolute -inset-y-s1 w-s1 rounded-pill bg-accent" style={{ left: pct(target, max) }} />}
    </div>
  );
}

function Explain({ p, onClose }: { p: PredictedScore; onClose(): void }) {
  return (
    <Modal title="How this is worked out" onClose={onClose}>
      <div className="stack-card text-small">
        <p>
          We build 500 practice papers in the real exam's format, answer each one the way your current ability suggests, and mark them with the real
          scheme, including negative marks. The bar shows the middle half of those results (25th to 75th percentile). The line inside is the median.
        </p>
        <p>
          It is a range, not a promise: a few good or bad days, and chapters you have not practised, can move it. It tightens as you practise
          more.{p.confidence === 'rough' ? ' Right now it is a rough estimate.' : ''}
        </p>
        <p>Your target line comes from the ambition you chose (comfortable, competitive or top), as a share of the maximum marks.</p>
        <p>Computed on this device once a day. Nothing is sent anywhere.</p>
      </div>
    </Modal>
  );
}

/** Presentational part, so tests and storybook-style callers can pass a state directly. */
export function PredictedBandView({ p }: { p: PredictedScore }) {
  const [open, setOpen] = useState(false);
  if (p.loading) return <SkeletonCards count={1} cols={1} />;
  if (!p.band || p.max === undefined) {
    return (
      <div className="card" data-testid="predicted-empty">
        <span className="text-small font-semibold">Predicted score</span>
        <p className="text-small text-slate">
          Not enough data yet. After about 40 practice questions across 10 or more topics, a likely score range shows up here.
        </p>
        <div className="row-inline">
          <LinkButton to="/diagnostic" size="sm" variant="secondary">Find your starting point</LinkButton>
        </div>
      </div>
    );
  }
  return (
    <div className="card" data-testid="predicted-band">
      <div className="row-between">
        <span className="row-inline text-small font-semibold">
          Predicted score
          {p.confidence === 'rough' && <Chip tone="accent">Rough estimate</Chip>}
        </span>
        <IconButton label="How this is computed" variant="ghost" onClick={() => setOpen(true)}>
          <InfoIcon />
        </IconButton>
      </div>
      <RangeBar p25={p.band.p25} p50={p.band.p50} p75={p.band.p75} max={p.max} target={p.target} />
      <p className="text-small text-slate tabular">{bandLine(p)}</p>
      {open && <Explain p={p} onClose={() => setOpen(false)} />}
    </div>
  );
}

/** Compact predicted-score band for Home, dashboard and plan. */
export function PredictedBand() {
  return <PredictedBandView p={usePredictedScore()} />;
}
