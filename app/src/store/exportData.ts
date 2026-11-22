import type { AiNote, UserStore } from './types';

/** AI notes: the cloud store and the guest store both list them, but it is not on the UserStore contract. */
async function listAiNotes(store: UserStore): Promise<AiNote[]> {
  const s = store as UserStore & { listAiNotes?: () => Promise<AiNote[]> };
  return s.listAiNotes ? s.listAiNotes() : [];
}

/** Everything the store holds, as a plain object (for the Settings JSON download). */
export async function exportStore(store: UserStore) {
  const [profile, mastery, pace, sessions, mocks, plans, paceLog, aiNotes] = await Promise.all([
    store.getProfile(), store.getState('mastery'), store.getState('pace'),
    store.listSessions({ limit: Number.POSITIVE_INFINITY }), store.listMocks({ limit: Number.POSITIVE_INFINITY }), store.listPlans(), store.listPaceLog({ all: true }), listAiNotes(store),
  ]);
  return { app: 'kairos', exportedAt: new Date().toISOString(), storage: store.kind, profile, state: { mastery, pace }, sessions, mocks, plans, pace_log: paceLog, ai_notes: aiNotes };
}
