import type { AiNote, UserStore } from './types';

/** AI notes, newest first (UserStore.listAiNotes). */
async function listAiNotes(store: UserStore): Promise<AiNote[]> {
  return store.listAiNotes();
}

/** Everything the store holds, as a plain object (for the Settings JSON download). */
export async function exportStore(store: UserStore) {
  const [profile, mastery, pace, sessions, mocks, plans, paceLog, aiNotes] = await Promise.all([
    store.getProfile(), store.getState('mastery'), store.getState('pace'),
    store.listSessions({ limit: Number.POSITIVE_INFINITY }), store.listMocks({ limit: Number.POSITIVE_INFINITY }), store.listPlans(), store.listPaceLog({ all: true }), listAiNotes(store),
  ]);
  return { app: 'kairos', exportedAt: new Date().toISOString(), storage: store.kind, profile, state: { mastery, pace }, sessions, mocks, plans, pace_log: paceLog, ai_notes: aiNotes };
}
