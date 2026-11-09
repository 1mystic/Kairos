import { Link } from 'react-router';
import { CheckIcon } from '../../components/icons';
import { Button, Card, Chip, LinkButton, ProgressBar, Skeleton, TwoPane } from '../../components/ui';
import { StatusChip } from '../../plan/PlanScreens';
import type { CardModel } from './todayModel';
import { useTodayCard } from './useTodayCard';
import './today.css';

/** Same shape as the loaded card, so nothing jumps when the plan arrives. */
function CardSkeleton() {
  return (
    <Card tone="primary" className="today-hero" as="section" aria-busy="true" aria-label="Today's session" data-testid="today-card-loading">
      <TwoPane ratio="main-side" align="center">
        <div className="stack gap-base">
          <Skeleton className="h-s4 w-32" />
          <Skeleton className="h-s7 w-96 max-w-full" />
          <Skeleton className="h-s5 w-64 max-w-full" />
          <Skeleton className="h-s5 w-96 max-w-full" />
        </div>
        <div className="stack gap-base">
          <Skeleton className="h-s8 w-full" />
        </div>
      </TwoPane>
    </Card>
  );
}

/** Presentational: renders one CardModel. Exported so tests can feed it models directly. */
export function TodaySessionCardView({ model, onRetry }: { model: CardModel; onRetry?(): void }) {
  if (model.variant === 'loading') return <CardSkeleton />;
  const { primary, secondary } = model;
  const action = (c: typeof primary, variant: 'primary' | 'secondary', size: 'lg' | 'md') =>
    c.to ? (
      <LinkButton to={c.to} variant={variant} size={size} block>{c.label}</LinkButton>
    ) : (
      <Button variant={variant} size={size} block onClick={onRetry}>{c.label}</Button>
    );
  return (
    <Card tone="primary" className="today-hero" as="section" aria-labelledby="today-session-h" data-testid="today-session-card" data-variant={model.variant}>
      <TwoPane ratio="main-side" align="center">
        <div className="stack gap-base">
          <div className="row-inline">
            <span className="text-small font-semibold text-slate">Today's session</span>
            {model.doneChip && <Chip tone="good" icon={<CheckIcon width={16} height={16} />}>Today's session done</Chip>}
          </div>
          <h2 id="today-session-h" className="text-h2">{model.headline}</h2>
          {model.reason && <p className="text-body">{model.reason}</p>}
          {model.progress && (
            <div className="stack gap-tight">
              <ProgressBar label="Today's session progress" value={model.progress.done} max={Math.max(1, model.progress.total)} />
              <span className="text-small text-slate tabular">{model.progress.done} of {model.progress.total} questions done</span>
            </div>
          )}
          {model.chips.length > 0 && (
            <ul className="row-inline" aria-label="Focus for today">
              {model.chips.map((c) => (
                <li key={`${c.label}-${c.reason}`} className="contents">
                  <Chip tone={c.reason === 'Weak' ? 'accent' : 'neutral'}>{c.label} · {c.reason}</Chip>
                </li>
              ))}
            </ul>
          )}
          {model.exam && (
            <div className="row-inline">
              <Chip>{model.exam.daysLeft} {model.exam.daysLeft === 1 ? 'day' : 'days'} to {model.exam.label}</Chip>
              {model.exam.status && <StatusChip status={model.exam.status} />}
            </div>
          )}
        </div>
        <div className="stack gap-base">
          {action(primary, 'primary', 'lg')}
          {secondary && action(secondary, 'secondary', 'md')}
          {model.planLink && <Link to="/plan" className="text-link justify-center">See full plan</Link>}
        </div>
      </TwoPane>
    </Card>
  );
}

/** Pinned above the customisable dashboard on Home. Not a removable widget. */
export function TodaySessionCard() {
  const { model, retry } = useTodayCard();
  return <TodaySessionCardView model={model} onRetry={retry} />;
}
