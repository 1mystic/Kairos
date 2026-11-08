import type { PaceLogDoc, Profile } from '../store';
import type { DashboardInputs } from './data';

export interface BankUsageLike { questions: number; limit: number }
export interface PredictedBand { p25: number; p50: number; p75: number; max: number }

/** Everything the dashboard reads, loaded once. The sample dataset has the same shape. */
export interface DashboardBundle extends DashboardInputs {
  profile: Profile | null;
  paceLog: Array<PaceLogDoc & { date: string }>;
  usage: BankUsageLike | null;
  band: PredictedBand | null;
  /** estimated minutes of work still needed, when known (sample only for now) */
  workRemainingMin: number | null;
  sample?: boolean;
}
