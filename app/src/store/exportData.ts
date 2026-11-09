import type { UserStore } from './types';

/** Everything the store holds, as a plain object (for the Settings JSON download). */
export async function exportStore(store: UserStore) {
  const [profile, mastery, pace, sessions, mocks, plans, paceLog] = await Promise.all([
    store.getProfile(), store.getState('mastery'), store.getState('pace'),
    store.listSessions({ limit: Number.POSITIVE_INFINITY }), store.listMocks(), store.listPlans(), store.listPaceLog({ all: true }),
  ]);
  return { app: 'kairos', exportedAt: new Date().toISOString(), storage: store.kind, profile, state: { mastery, pace }, sessions, mocks, plans, pace_log: paceLog };
}
