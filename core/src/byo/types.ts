import type { Question, ImageRef } from '../question';
import type { Bbox } from './schema';

export type UserQuestionStatus = 'user_ok' | 'needs_answer';

export type IssueCode =
  | 'needs_answer'
  | 'bad_math'
  | 'unknown_chapter'
  | 'figure_missing'
  | 'low_confidence'
  | 'duplicate'
  | 'answer_not_in_options'
  | 'bad_options'
  | 'html_not_allowed'
  /** extra to the spec list: schema/shape problems (bad bbox, answer kind mismatch, missing passage) */
  | 'invalid_schema';

export interface Issue {
  /** question id when it exists */
  qid?: string;
  /** printed question number (always set by convertUpload) */
  n?: number;
  severity: 'error' | 'warn';
  code: IssueCode;
  message: string;
  field?: string;
}

export interface PendingFigure {
  /** k in `{{fig:k}}` */
  k: number;
  where: string;
  page: number;
  bbox: Bbox;
  alt: string;
}

/** A question in the user's private bank (`users/{uid}/bank/{id}`). */
export type UserQuestion = Omit<Question, 'status' | 'source' | 'solution_source'> & {
  source: { kind: 'user' };
  solution_source: 'user';
  status: UserQuestionStatus;
  images: ImageRef[];
  /** printed number in the uploaded paper */
  n: number;
  confidence: 'high' | 'low';
  exam: string;
  created_at: number;
  owner?: string;
  /** figures still waiting for a crop; question is invalid until empty */
  pending_figures: PendingFigure[];
  dropped?: boolean;
};
