import { Chip, LinkButton } from '../../components/ui';
import { Ring } from '../charts/Ring';
import { InfoNote, CardEmpty, DeltaChip, type WidgetProps } from './shared';
import { TargetIcon2 } from '../icons';

const WORDS = { not_enough_data: 'Not enough data yet', rough: 'Rough estimate', confident: 'Confident estimate' } as const;

/** Readiness: predicted score band when one is supplied, otherwise overall mastery % from the mastery doc. */
export function Readiness({ size, options, ctx }: WidgetProps) {
  const r = ctx.readiness;
  if (!r) {
    return (
      <CardEmpty title="Your readiness will show here" to="/practice" cta="Start practising" icon={<TargetIcon2 />}>
        A few practice sessions give us enough to estimate where you stand. No rush.
      </CardEmpty>
    );
  }
  const band = options.view === 'band' ? ctx.bundle.band : null;
  const bandMissing = options.view === 'band' && !band;
  const enough = r.label !== 'not_enough_data';
  const px = size === 'l' ? 200 : 168;
  return (
    <div className="stack gap-s5">
      <div className="row gap-loose">
        <Ring size={px} tone={band || !enough ? 'primary' : r.pct >= 65 ? 'good' : r.pct >= 40 ? 'accent' : 'bad'} value={band ? band.p50 / band.max : enough ? r.pct / 100 : null} label={band ? `Predicted score ${band.p25} to ${band.p75} out of ${band.max}` : enough ? `Mastery ${r.pct} percent` : 'Mastery: not enough data yet'}>
          {band ? (
            <div className="stack gap-s1"><span className="text-h1 font-bold tabular">{band.p50}</span><span className="text-caption text-slate">of {band.max}</span></div>
          ) : enough ? (
            <div className="stack gap-s1"><span className="text-display font-bold tabular">{r.pct}%</span><span className="text-caption text-slate">mastery</span></div>
          ) : (
            <span className="max-w-24 text-small font-semibold text-slate">Not enough data</span>
          )}
        </Ring>
        <div className="stack min-w-0 flex-1 gap-s3 basis-48">
          <div className="row gap-s2"><Chip tone={enough ? 'primary' : 'neutral'}>{WORDS[r.label]}</Chip><DeltaChip delta={ctx.data.deltas.accuracy} range={ctx.range} /></div>
          {band ? (
            <p className="text-body">Likely score range <span className="font-semibold tabular">{band.p25} to {band.p75}</span> out of {band.max}.</p>
          ) : (
            <p className="text-body">{enough ? `Overall mastery across ${r.topics} topic${r.topics === 1 ? '' : 's'} you have practised.` : 'We need a few more answers across your topics before showing a number.'}</p>
          )}
          {bandMissing && <p className="text-small text-slate">A predicted score band needs more practice data. Showing mastery for now.</p>}
          {ctx.data.deltas.accuracy && <p className="text-small text-slate">Accuracy change compares with the previous period.</p>}
          {size === 'l' && <div><LinkButton to="/practice" size="sm" variant="secondary">Practise a weak chapter</LinkButton></div>}
        </div>
      </div>
      <InfoNote label="How is this calculated?">
        Each practised topic has an ability estimate that moves with every answer. Mastery is the chance you would get a medium-difficulty question right, averaged across your topics, with less-practised topics pulled toward your average. We only show a number when the estimate is steady enough to be useful.
      </InfoNote>
    </div>
  );
}
