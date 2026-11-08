import type { UserProfile } from '../lib/profile';

/**
 * Document shapes mirror docs/03_DATA_MODEL.md firestore paths. They are intentionally loose for
 * now: only the id/time fields the store needs are typed, and `summary` / `events` stay open until
 * the CBT and practice features settle their payloads. Extra fields round-trip untouched.
 */

/** users/{uid}/sessions/{sid}. One doc per session, written once at session end. */
export interface SessionDoc {
  id: string;
  /** epoch ms. Used for the 60-day migration cap and ordering. */
  startedAt: number;
  endedAt?: number;
  /** aggregate result of the session (free-form for now) */
  summary?: Record<string, unknown>;
  /** raw event list, <= 2000 (firestore.rules). Events look like {t,q,a,v,ctx} per docs/03. */
  events?: unknown[];
  [k: string]: unknown;
}

/** users/{uid}/mocks/{mid}. Never claims gradedBy:'server' from the client (firestore.rules). */
export interface MockDoc {
  id: string;
  paperId: string;
  submittedAt?: number;
  responses?: unknown;
  timeline?: unknown;
  score?: unknown;
  analysis?: unknown;
  [k: string]: unknown;
}

/** users/{uid}/plans/{date}. `date` is YYYY-MM-DD, `tasks` <= 200. */
export interface PlanDoc {
  date?: string;
  tasks?: unknown[];
  [k: string]: unknown;
}

/** users/{uid}/pace_log/{date}. */
export interface PaceLogDoc {
  date?: string;
  planned?: number;
  done?: number;
  [k: string]: unknown;
}

export interface GuestProfile {
  kind: 'guest';
  displayName: string;
  createdAt: number;
  /** Onboarding fields, same shapes as the cloud profile (firestore.rules). All optional for guests. */
  examDate?: string | null;
  exam?: string;
  ambition?: 'comfortable' | 'competitive' | 'top';
  minutesPerWeekday?: Record<string, number>;
  offDay?: number | null;
  chaptersDone?: string[];
  lang?: 'en' | 'hi';
  onboarded?: boolean;
}

export type Profile = UserProfile | GuestProfile;
export type StateDocName = 'mastery' | 'pace';

export interface ListSessionsOpts {
  /** only sessions with startedAt >= since (epoch ms) */
  since?: number;
  /** newest first, at most this many */
  limit?: number;
}

/** Everything feature code uses for per-user state. Never call Firestore or IndexedDB directly. */
export interface UserStore {
  kind: 'local' | 'cloud';
  getProfile(): Promise<Profile | null>;
  /** Guest: replaces the guest profile. Cloud: updates only the editable fields allowed by firestore.rules. */
  saveProfile(p: GuestProfile | Partial<Pick<UserProfile, 'displayName' | 'onboarded' | 'exam' | 'examDate' | 'ambition' | 'minutesPerWeekday' | 'offDay' | 'chaptersDone' | 'lang'>>): Promise<void>;
  getState(doc: StateDocName): Promise<Record<string, unknown> | null>;
  putState(doc: StateDocName, data: Record<string, unknown>): Promise<void>;
  addSession(s: SessionDoc): Promise<void>;
  listSessions(opts?: ListSessionsOpts): Promise<SessionDoc[]>;
  putPlan(date: string, plan: PlanDoc): Promise<void>;
  getPlan(date: string): Promise<PlanDoc | null>;
  listPlans(): Promise<Array<PlanDoc & { date: string }>>;
  putMock(id: string, m: MockDoc): Promise<void>;
  listMocks(): Promise<MockDoc[]>;
  putPaceLog(date: string, p: PaceLogDoc): Promise<void>;
  listPaceLog(): Promise<Array<PaceLogDoc & { date: string }>>;
}

export const isGuestProfile = (p: Profile | null | undefined): p is GuestProfile =>
  !!p && (p as GuestProfile).kind === 'guest';
