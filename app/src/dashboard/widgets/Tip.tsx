import { LinkButton } from '../../components/ui';
import { pickTip } from '../tips';
import type { WidgetProps } from './shared';

export function Tip({ ctx }: WidgetProps) {
  const t = pickTip(ctx.data.totals);
  return (
    <div className="stack items-start gap-s3">
      <p className="text-body font-semibold text-accent-ink">{t.title}</p>
      <p className="text-body">{t.body}</p>
      <LinkButton to={t.cta.to} variant="secondary" size="sm">{t.cta.label}</LinkButton>
    </div>
  );
}
