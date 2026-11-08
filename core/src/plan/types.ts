/** Shared planner types. `plans/{date}.tasks` shape from docs/03 (items = question count; the app picks questions). */

export type TaskKind = 'practice' | 'review' | 'mock' | 'fsrs_due' | 'diagnostic' | 'light_review';
export type TaskStatus = 'todo' | 'done' | 'skipped';
export type Bucket = 'new' | 'weak' | 'review' | 'mixed';

export interface Task {
  id: string;
  kind: TaskKind;
  topic: string;
  chapter: string;
  subject: string;
  /** Number of questions. Items themselves are chosen by the app when the task starts. */
  items: number;
  est_min: number;
  priority: number;
  status: TaskStatus;
  /** Date the task was originally planned (set when carried over from the backlog). */
  carried_from?: string;
  bucket?: Bucket;
  /** Target success probability for the items the app picks. */
  target_p?: number;
  /** Mastery of the topic when the task was planned (used to shrink it if the topic improved elsewhere). */
  m_at_plan?: number;
  warmup?: true;
}
