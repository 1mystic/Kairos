import { DATA_STORES, LOCAL_STORES, type LocalDb, type LocalStoreName } from './localDb';
import type { GuestProfile, ListSessionsOpts, MockDoc, PaceLogDoc, PlanDoc, Profile, SessionDoc, StateDocName, UserStore } from './types';

export const ONBOARDING_KEYS = ['exam', 'examDate', 'ambition', 'minutesPerWeekday', 'offDay', 'chaptersDone', 'lang', 'onboarded', 'profiles', 'activeExam'] as const;

export interface LocalMeta {
  /** ids already uploaded, keyed "sessions/<id>" etc. Makes migration retries idempotent. */
  migratedIds: Record<string, true>;
  /** set once this device's data has been moved to this uid */
  migratedTo?: string;
}

/** Guest storage in IndexedDB (DB `kairos-guest`), with the same doc shapes as the Firestore paths. */
export class LocalStore implements UserStore {
  readonly kind = 'local' as const;
  constructor(readonly db: LocalDb) {}

  async getProfile(): Promise<Profile | null> {
    return ((await this.db.get('profile', 'me')) as Profile | undefined) ?? null;
  }
  async saveProfile(p: Parameters<UserStore['saveProfile']>[0]): Promise<void> {
    const cur = (await this.getProfile()) as GuestProfile | null;
    await this.db.put('profile', 'me', cur ? { ...cur, ...p } : p);
  }
  async getState(doc: StateDocName) {
    return ((await this.db.get('state', doc)) as Record<string, unknown> | undefined) ?? null;
  }
  async putState(doc: StateDocName, data: Record<string, unknown>) {
    await this.db.put('state', doc, data);
  }
  async addSession(s: SessionDoc) {
    await this.db.put('sessions', s.id, s);
  }
  async listSessions(opts: ListSessionsOpts = {}) {
    let all = (await this.db.getAll('sessions')).map((r) => r.value as SessionDoc);
    if (opts.since !== undefined) all = all.filter((s) => s.startedAt >= opts.since!);
    all.sort((a, b) => b.startedAt - a.startedAt);
    return opts.limit ? all.slice(0, opts.limit) : all;
  }
  async getSession(id: string) {
    return ((await this.db.get('sessions', id)) as SessionDoc | undefined) ?? null;
  }
  async putPlan(date: string, plan: PlanDoc) {
    await this.db.put('plans', date, plan);
  }
  async getPlan(date: string) {
    return ((await this.db.get('plans', date)) as PlanDoc | undefined) ?? null;
  }
  async listPlans() {
    return (await this.db.getAll('plans')).map((r) => ({ ...(r.value as PlanDoc), date: r.key }));
  }
  async putMock(id: string, m: MockDoc) {
    await this.db.put('mocks', id, { ...m, id });
  }
  /** always all of them (opts.limit is a cloud-billing concern) */
  async listMocks() {
    return (await this.db.getAll('mocks')).map((r) => r.value as MockDoc);
  }
  async putPaceLog(date: string, p: PaceLogDoc) {
    await this.db.put('pace_log', date, p);
  }
  async listPaceLog() {
    return (await this.db.getAll('pace_log')).map((r) => ({ ...(r.value as PaceLogDoc), date: r.key }));
  }

  // ----- local-only helpers (not part of UserStore) -----
  async getMeta(): Promise<LocalMeta> {
    return ((await this.db.get('meta', 'meta')) as LocalMeta | undefined) ?? { migratedIds: {} };
  }
  async setMeta(m: LocalMeta) {
    await this.db.put('meta', 'meta', m);
  }
  /** true when there is progress worth migrating (the guest profile alone does not count). */
  async hasData(): Promise<boolean> {
    for (const s of DATA_STORES) if ((await this.db.getAll(s)).length) return true;
    return false;
  }
  /** Delete the data collections and the migration bookkeeping. Keeps the guest profile. */
  async clearData(): Promise<void> {
    for (const s of DATA_STORES) await this.db.clear(s);
    await this.db.clear('meta');
  }
  /** Remove the onboarding fields from the guest profile once they were copied to an account. */
  async clearOnboardingFields(): Promise<void> {
    const cur = (await this.getProfile()) as Record<string, unknown> | null;
    if (!cur) return;
    for (const k of ONBOARDING_KEYS) delete cur[k];
    await this.db.put('profile', 'me', cur);
  }
  /** Delete everything, including the guest profile. */
  async clearAll(): Promise<void> {
    for (const s of LOCAL_STORES as readonly LocalStoreName[]) await this.db.clear(s);
  }
}
