import { z } from 'zod';
import { publicQuestionSchema, questionSchema, type PublicQuestion } from './question';

/** Schemas of the published static bank (see pipeline/publish.py). */

export const latestSchema = z.object({ version: z.number().int().positive() });

export const manifestFileSchema = z
  .object({
    path: z.string(),
    sha256: z.string(),
    bytes: z.number(),
    kind: z.string(),
    exam: z.string().optional(),
    subject: z.string().optional(),
    chapter: z.string().optional(),
    count: z.number().optional(),
    paperId: z.string().optional(),
  })
  .loose();
export type ManifestFile = z.infer<typeof manifestFileSchema>;

export const manifestSchema = z
  .object({
    version: z.number().int(),
    schema: z.number().optional(),
    totals: z.record(z.string(), z.number()).optional(),
    files: z.array(manifestFileSchema),
    images: z.array(manifestFileSchema).optional(),
    /** optional qid -> chapter id index (not emitted by pipeline yet) */
    qindex: z.record(z.string(), z.string()).optional(),
  })
  .loose();
export type Manifest = z.infer<typeof manifestSchema>;

/** A practice shard: array of full questions (answers + solutions included). */
export const shardSchema = z.array(questionSchema);

/** Mock paper: answers/solutions are absent from the file (and dropped if present). */
export const mockPaperSchema = z
  .object({
    paperId: z.string(),
    blueprint: z.string(),
    title: z.string(),
    mini: z.boolean().optional(),
    slots: z.array(z.string()),
    questions: z.array(publicQuestionSchema),
  })
  .loose();
export type MockPaper = Omit<z.infer<typeof mockPaperSchema>, 'questions'> & {
  questions: PublicQuestion[];
};
