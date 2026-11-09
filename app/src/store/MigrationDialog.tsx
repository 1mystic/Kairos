import { useState } from 'react';
import type { MigrationState } from './StoreProvider';
import { Button, Modal, Notice } from '../components/ui';

/**
 * Esc, the X and a click outside all mean "Decide later" (onLater): nothing is uploaded or deleted and the
 * prompt returns next session. Only the explicit, confirmed "Discard local" deletes (onDiscard).
 */
export function MigrationDialog({ state, onAdd, onDiscard, onRetry, onClose, onLater }: {
  state: MigrationState; onAdd(): void; onDiscard(): void; onRetry(): void; onClose(): void; onLater(): void;
}) {
  const [confirm, setConfirm] = useState(false);
  const later = () => { setConfirm(false); onLater(); };
  if (state.phase === 'ask') {
    const { counts } = state.plan;
    const parts = [`${counts.sessions} sessions`, `${counts.mocks} mocks`, ...(counts.questions > 0 ? [`${counts.questions} uploaded questions`] : [])];
    return (
      <Modal title="Add this device's progress to your account?" onClose={later} dismissLabel="Decide later">
        <p className="text-slate">
          You practised on this device before signing in: {parts.join(', ')}.
          Adding them keeps your account as it is and only appends what is new.
        </p>
        {state.plan.onboarding === 'kept-account' && (
          <p className="text-small text-slate">Your account already has an exam plan, so the exam date and plan from this device will not replace it.</p>
        )}
        {state.plan.skippedSessions > 0 && <p className="text-small text-slate">To keep things light, we add sessions from the last 60 days only ({state.plan.skippedSessions} older ones will be left out).</p>}
        {confirm ? (
          <>
            <p role="alert" className="text-small text-slate">This deletes the progress saved on this device for good. Delete it?</p>
            <div className="stack gap-tight sm:flex-row-reverse">
              <Button variant="danger" onClick={onDiscard}>Yes, discard</Button>
              <Button variant="secondary" onClick={() => setConfirm(false)}>Keep it</Button>
            </div>
          </>
        ) : (
          <div className="stack gap-tight sm:flex-row-reverse">
            <Button onClick={onAdd}>Add</Button>
            <Button variant="secondary" onClick={later}>Decide later</Button>
            <Button variant="danger-ghost" onClick={() => setConfirm(true)}>Discard local</Button>
          </div>
        )}
      </Modal>
    );
  }
  if (state.phase === 'done') {
    const r = state.result;
    return (
      <Notice onClose={onClose}>
        Your progress from this device is now saved to your account.
        {r.questionsMoved > 0 && ` Moved ${r.questionsMoved} question${r.questionsMoved === 1 ? '' : 's'}.`}
        {r.questionsLeft > 0 && ` ${r.questionsLeft} question${r.questionsLeft === 1 ? '' : 's'} stayed on this device (your account limits or the daily upload limit).`}
        {r.onboarding === 'kept-account' && ' Your account\'s exam plan was kept.'}
        {r.skippedSessions > 0 && ` Sessions older than 60 days (${r.skippedSessions}) were not added.`}
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
