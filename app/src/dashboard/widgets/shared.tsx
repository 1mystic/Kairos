import { useId, useState, type ReactNode } from 'react';
import { Chip, LinkButton } from '../../components/ui';
import { deltaWords, type Delta, type RangeData, type Readiness } from '../data';
import { ArrowDownIcon, ArrowUpIcon, InfoIcon2, MinusIcon } from '../icons';
import type { PlanInfo } from '../plan';
import { PREVIOUS_WORD, type Range } from '../range';
import type { OptionValue, Size } from '../registry';
import type { DashboardBundle } from '../types';

export interface WidgetCtx {
  range: Range;
  today: string;
  data: RangeData;
  readiness: Readiness | null;
  plan: PlanInfo | null;
  bundle: DashboardBundle;
}
export interface WidgetProps { size: Size; options: Record<string, OptionValue>; ctx: WidgetCtx }

/** Up arrow + indigo for gains, down arrow + saffron tint for drops, always with words. */
export function DeltaChip({ delta, range }: { delta: Delta | null; range: Range }) {
  if (!delta) return null;
  const tone = delta.dir === 'down' ? 'accent' : delta.dir === 'up' ? 'primary' : 'neutral';
  const Icon = delta.dir === 'down' ? ArrowDownIcon : delta.dir === 'up' ? ArrowUpIcon : MinusIcon;
  return (
    <Chip tone={tone} icon={<Icon size={14} />}>
      {deltaWords(delta)}
      <span className="sr-only"> from the {PREVIOUS_WORD[range.kind]}</span>
    </Chip>
  );
}

/** Small "i" button that reveals a tinted note below it (no floating layer, so it never clips or traps focus). */
export function InfoNote({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div className="stack gap-s2">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)} className="text-link row-inline min-h-11 w-fit text-small">
        <InfoIcon2 size={18} />{label}
      </button>
      {open && <div id={id} role="note" className="rounded-btn bg-surface p-s4 text-small text-slate">{children}</div>}
    </div>
  );
}

/** Friendly empty state: one sentence, one action. */
export function CardEmpty({ title, children, to, cta, icon }: { title: string; children: ReactNode; to: string; cta: string; icon?: ReactNode }) {
  return (
    <div className="stack items-start gap-s4">
      {icon && <span className="tile-icon !mb-0">{icon}</span>}
      <div className="stack gap-s1">
        <p className="text-body font-semibold">{title}</p>
        <p className="text-small text-slate">{children}</p>
      </div>
      <LinkButton to={to} variant="secondary" size="sm">{cta}</LinkButton>
    </div>
  );
}
