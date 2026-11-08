import { BEHAVIOUR_NAMES } from '../data';
import { HBar } from '../charts/HBar';
import { LinkButton } from '../../components/ui';
import { CardEmpty, type WidgetProps } from './shared';
import { TargetIcon2 } from '../icons';
import type { BehaviourLabel } from '@kairos/core';

export function Mistakes({ size, ctx }: WidgetProps) {
  const rows = (Object.entries(ctx.data.totals.labels) as [BehaviourLabel, number][]).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]).slice(0, size === 's' ? 3 : 5);
  if (!rows.length) return <CardEmpty title="No tagged mistakes here" to="/practice" cta="Open practice" icon={<TargetIcon2 />}>When you note why an answer went wrong, the patterns show up here.</CardEmpty>;
  return (
    <div className="stack gap-s4">
      <HBar ariaLabel="Questions by mistake type" rows={rows.map(([l, c]) => ({ key: l, label: BEHAVIOUR_NAMES[l], value: c, valueLabel: `${c} question${c === 1 ? '' : 's'}`, tone: l === 'concept_gap' ? 'accent' : 'primary' }))} />
      <div><LinkButton to="/practice" size="sm" variant="secondary">Practise a weak area</LinkButton></div>
    </div>
  );
}
