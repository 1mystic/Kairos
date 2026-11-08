import { LinkButton } from '../../components/ui';
import { MockIcon } from '../../components/icons';
import { formatDay, localDate } from '../range';
import { CardEmpty, type WidgetProps } from './shared';

export function NextMock({ ctx }: WidgetProps) {
  const last = [...ctx.bundle.mocks].filter((m) => m.submittedAt).sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0))[0];
  const sc = last?.score as { marks?: number; max?: number } | null | undefined;
  const planned = ctx.plan?.nextMock;
  if (!planned && !last) return <CardEmpty title="Try a short mock" to="/exam/sample_jee_mini_v1" cta="Take the sample mock" icon={<MockIcon />}>A timed paper on the real exam screen is the best way to see where you are.</CardEmpty>;
  return (
    <div className="stack items-start gap-s3">
      {planned ? <p className="text-body">Next mock planned for <span className="font-semibold">{formatDay(planned, false)}</span>.</p> : <p className="text-body">Ready for another one?</p>}
      {last && <p className="text-small text-slate">Last mock: {sc && typeof sc.marks === 'number' ? `${sc.marks}/${sc.max}` : 'result pending'} on {formatDay(localDate(last.submittedAt!), false)}.</p>}
      <LinkButton to="/exam/sample_jee_mini_v1" size="sm" variant="secondary">Take the sample mock</LinkButton>
    </div>
  );
}
