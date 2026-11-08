import type { MigrationState } from './StoreProvider';
import { Button, Modal, Notice } from '../components/ui';

export function MigrationDialog({ state, onAdd, onDiscard, onRetry, onClose }: {
  state: MigrationState; onAdd(): void; onDiscard(): void; onRetry(): void; onClose(): void;
}) {
  if (state.phase === 'ask') {
    return (
      <Modal title="Add this device's progress to your account?" onClose={onDiscard} dismissLabel="Discard local">
        <p className="text-slate">
          You practised on this device before signing in: {state.plan.counts.sessions} sessions and {state.plan.counts.mocks} mocks.
          Adding them keeps your account as it is and only appends what is new.
        </p>
        {state.plan.skippedSessions > 0 && <p className="text-small text-slate">To keep things light, we add sessions from the last 60 days only ({state.plan.skippedSessions} older ones will be left out).</p>}
        <div className="stack gap-tight sm:flex-row-reverse">
          <Button onClick={onAdd}>Add</Button>
          <Button variant="secondary" onClick={onDiscard}>Discard local</Button>
        </div>
      </Modal>
    );
  }
  if (state.phase === 'done') {
    return (
      <Notice onClose={onClose}>
        Your progress from this device is now saved to your account.
        {state.result.skippedSessions > 0 && ` Sessions older than 60 days (${state.result.skippedSessions}) were not added.`}
      </Notice>
    );
  }
  if (state.phase === 'error') {
    return (
      <Notice onClose={onClose}>
        We could not move your progress just yet. It is still safe on this device.{' '}
        <button type="button" className="link" onClick={onRetry}>Try again</button>
      </Notice>
    );
  }
  return null;
}
