import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { PaceStatus } from '@kairos/core';
import { AlertIcon, CheckIcon, ClockIcon, SparkIcon } from '../../components/icons';
import { Button, Card, Chip, LinkButton, ProgressBar, Skeleton } from '../../components/ui';
import { STATUS_WORDS, fmtMin } from '../../plan/format';
import type { CardModel } from './todayModel';
import { useTodayCard } from './useTodayCard';
import './today.css';

const PACE_ICON = { ahead: SparkIcon, on_track: CheckIcon, slightly_behind: ClockIcon, behind: AlertIcon } as const;

/** Same shape as the loaded card (header, 4 stat cells, topic cells), so nothing jumps when the plan arrives. */
function CardSkeleton() {
  return (
    <Card tone="primary" className="today-hero" as="section" aria-busy="true" aria-label="Today's session" data-testid="today-card-loading">
      <div className="stack-grid">
        <div className="today-head">
          <div className="stack-label">
            <Skeleton className="h-s4 w-32" />
            <Skeleton className="h-s7 w-96 max-w-full" />
            <Skeleton className="h-s5 w-64 max-w-full" />
          </div>
          <div className="today-actions"><Skeleton className="h-s8 w-full" /><Skeleton className="h-s8 w-full" /></div>
        </div>
        <div className="today-stats" data-cells="4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="today-cell today-skel" />)}
        </div>
        <div className="today-topics" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="today-cell today-skel" />)}
        </div>
      </div>
    </Card>
  );
}

function StatCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="today-cell today-stat">
      <span className="text-caption font-semibold">{label}</span>
      <span className="text-h3 tabular today-stat-value">{children}</span>
    </div>
  );
}

function PaceValue({ status }: { status: PaceStatus }) {
  const I = PACE_ICON[status];
  return <><I width={20} height={20} aria-hidden="true" />{STATUS_WORDS[status].label}</>;
}

/** Presentational: renders one CardModel. Exported so tests can feed it models directly. */
export function TodaySessionCardView({ model, onRetry }: { model: CardModel; onRetry?(): void }) {
  if (model.variant === 'loading') return <CardSkeleton />;
  const { primary, secondary, stats, exam } = model;
  const action = (c: typeof primary, variant: 'primary' | 'secondary') =>
    c.to ? (
      <LinkButton to={c.to} variant={variant} size="md" block>{c.label}</LinkButton>
    ) : (
      <Button variant={variant} size="md" block onClick={onRetry}>{c.label}</Button>
    );
  const cells = (stats ? 2 : 0) + (exam ? 1 : 0) + (exam?.status ? 1 : 0);
  const more = model.moreTopics ?? 0;
  const topicCells = model.chips.length + (more > 0 ? 1 : 0);
  return (
    <Card tone="primary" className="today-hero" as="section" aria-labelledby="today-session-h" data-testid="today-session-card" data-variant={model.variant}>
      <div className="stack-grid">
        <div className="today-head">
          <div className="stack-label">
            <div className="row-inline">
              <span className="text-small font-semibold">Today's session</span>
              {model.doneChip && <Chip tone="good" icon={<CheckIcon width={16} height={16} />}>Today's session done</Chip>}
            </div>
            <h2 id="today-session-h" className="text-h2">{model.headline}</h2>
            {model.reason && <p className="text-body">{model.reason}</p>}
          </div>
          <div className="today-actions">
            {action(primary, 'primary')}
            {secondary && action(secondary, 'secondary')}
            {model.planLink && <LinkButton to="/plan" variant="secondary" size="md" block>See full plan</LinkButton>}
          </div>
        </div>
        {model.progress && (
          <div className="stack-text">
            <ProgressBar label="Today's session progress" value={model.progress.done} max={Math.max(1, model.progress.total)} />
            <span className="text-small tabular">{model.progress.done} of {model.progress.total} questions done</span>
          </div>
        )}
        {cells > 0 && (
          <div className="today-stats" data-cells={cells}>
            {stats && <StatCell label="Questions">{stats.questions}</StatCell>}
            {stats && <StatCell label="Time">about {fmtMin(stats.minutes)}</StatCell>}
            {exam && <StatCell label={`Days to ${exam.label}`}>{exam.daysLeft}</StatCell>}
            {exam?.status && <StatCell label="Pace"><PaceValue status={exam.status} /></StatCell>}
          </div>
        )}
        {topicCells > 0 && (
          <ul className="today-topics" aria-label="Focus for today" data-xl3={topicCells % 3 === 0 ? 'true' : undefined}>
            {model.chips.map((c) => (
              <li key={`${c.label}-${c.reason}`} className="today-cell today-topic">
                <span className="truncate" title={c.label}>{c.label}</span>
                <span className="today-tag">{c.reason}</span>
              </li>
            ))}
            {more > 0 && (
              <li className="today-cell today-topic today-more">
                <Link to="/plan" className="text-link">+{more} more</Link>
              </li>
            )}
          </ul>
        )}
      </div>
    </Card>
  );
}

/** Pinned above the customisable dashboard on Home. Not a removable widget. */
export function TodaySessionCard() {
  const { model, retry } = useTodayCard();
  return <TodaySessionCardView model={model} onRetry={retry} />;
}
