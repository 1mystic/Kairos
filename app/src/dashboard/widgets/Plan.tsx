import { Chip, LinkButton } from '../../components/ui';
import { PlanIcon } from '../../components/icons';
import { Ring } from '../charts/Ring';
import { PACE_WORDS } from '../plan';
import { ArrowDownIcon, ArrowUpIcon, MinusIcon } from '../icons';
import { CardEmpty, type WidgetProps } from './shared';

export function Plan({ size, ctx }: WidgetProps) {
  const p = ctx.plan;
  if (!p) {
    return (
      <CardEmpty title="Set your exam date to get a plan" to="/onboarding" cta="Set exam date" icon={<PlanIcon />}>
        We count back from your exam day and plan what to practise, within the time you have.
      </CardEmpty>
    );
  }
  const pace = p.pace;
  const Icon = pace ? (pace.status === 'ahead' || pace.status === 'on_track' ? ArrowUpIcon : ArrowDownIcon) : MinusIcon;
  return (
    <div className="stack gap-s4">
      <div className="row gap-loose">
        <Ring size={size === 's' ? 112 : 144} stroke={12} value={Math.min(1, p.daysLeft / 180)} label={`${p.daysLeft} days to your exam`}>
          <div className="stack gap-s1"><span className="text-h1 font-bold tabular">{p.daysLeft}</span><span className="text-caption text-slate">days left</span></div>
        </Ring>
        <div className="stack min-w-0 flex-1 gap-s2 basis-40">
          <div className="row gap-s2"><Chip tone="primary">{p.phase} phase</Chip>{pace && <Chip tone={pace.status === 'ahead' || pace.status === 'on_track' ? 'primary' : 'accent'} icon={<Icon size={14} />}>{PACE_WORDS[pace.status]}</Chip>}</div>
          <p className="text-small text-slate">{pace ? pace.message : 'Pace needs a bit more practice data. For now: days left and phase.'}</p>
          {p.buffersLeft !== null && <p className="text-small"><span className="font-semibold tabular">{p.buffersLeft}</span> buffer days left</p>}
        </div>
      </div>
      <div><LinkButton to="/practice" size="sm">Today&rsquo;s plan</LinkButton></div>
    </div>
  );
}
