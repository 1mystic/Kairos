import { useEffect, useMemo, useState } from 'react';
import { parseBlueprint, type Blueprint, type Question } from '@kairos/core';
import { BANK_BASE } from '../bank/config';
import { getLatestVersion, getMockPaper, getQuestionsByIds } from '../bank/client';
import { buildExamModel, type ExamModel, type MockPaperLike } from './model';
import { getGeneratedStore, isGeneratedId } from '../diagnostic/generatedStore';

export type AnswerMap = ReadonlyMap<string, Question>;

export async function fetchBlueprint(version: number, id: string): Promise<Blueprint> {
  const res = await fetch(`${BANK_BASE}/v${version}/blueprints/${id}.json`);
  if (!res.ok) throw new Error(`blueprint ${id}: HTTP ${res.status}`);
  return parseBlueprint(await res.json());
}

/**
 * Answers for grading. Mock shards carry no answer keys, so for PYQ/sample papers (whose questions
 * are public static content) we fetch the same qids from the practice shards, which do. Real shared
 * mocks will be graded server side in phase 4: when the answers cannot be found this resolves to
 * null and the result page says "Result pending".
 */
export async function loadAnswers(version: number, model: ExamModel): Promise<AnswerMap | null> {
  try {
    const ids = model.slots.map((s) => s.qid);
    const found = await getQuestionsByIds(version, model.exam, ids);
    const map = new Map(found.filter((q) => !!q.answer).map((q) => [q.id, q]));
    return ids.every((id) => map.has(id)) ? map : null;
  } catch {
    return null;
  }
}

export interface ExamData {
  version: number;
  model: ExamModel;
  /** memoised; starts loading immediately so the paper works offline once cached */
  loadAnswers(): Promise<AnswerMap | null>;
}

export interface ExamDataState {
  data: ExamData | undefined;
  loading: boolean;
  error: Error | undefined;
}

/**
 * `gen_*` papers are generated on this device (W6a): paper, answer key and blueprint come from
 * IndexedDB `kairos-generated`, not the bank. The blueprint is stored with the paper (offline-safe);
 * older records without one fall back to the bank's copy.
 */
export async function loadGeneratedExamData(paperId: string): Promise<ExamData> {
  const rec = await getGeneratedStore().get(paperId);
  if (!rec) throw new Error('This generated paper is not on this device any more. Make a new one from Mocks.');
  const version = rec.blueprint ? 0 : await getLatestVersion();
  const blueprint = rec.blueprint ?? (await fetchBlueprint(version, rec.blueprintId));
  const model = buildExamModel(
    { paperId: rec.paperId, blueprint: rec.blueprintId, title: rec.title, slots: rec.paper.map((q) => q.id), questions: rec.paper },
    blueprint,
  );
  const map = new Map(rec.paper.map((q) => [q.id, { ...q, answer: rec.answers[q.id] ?? undefined } as unknown as Question]));
  return { version, model, loadAnswers: async () => (rec.paper.every((q) => rec.answers[q.id]) ? map : null) };
}

export function useExamData(paperId: string | null): ExamDataState {
  const [s, setS] = useState<{ id: string | null; data?: ExamData; error?: Error }>({ id: null });
  useEffect(() => {
    if (!paperId) return;
    let live = true;
    (async () => {
      if (isGeneratedId(paperId)) return loadGeneratedExamData(paperId);
      const version = await getLatestVersion();
      const paper = await (await getMockPaper(version, paperId)) as unknown as MockPaperLike;
      const blueprint = await fetchBlueprint(version, paper.blueprint);
      const model = buildExamModel(paper, blueprint);
      let p: Promise<AnswerMap | null> | undefined;
      const answers = () => (p ??= loadAnswers(version, model));
      void answers();
      return { version, model, loadAnswers: answers } satisfies ExamData;
    })().then(
      (data) => live && setS({ id: paperId, data }),
      (e: unknown) => live && setS({ id: paperId, error: e instanceof Error ? e : new Error(String(e)) }),
    );
    return () => {
      live = false;
    };
  }, [paperId]);
  return useMemo(() => {
    const settled = !!paperId && s.id === paperId;
    return { data: settled ? s.data : undefined, error: settled ? s.error : undefined, loading: !!paperId && !settled };
  }, [paperId, s]);
}
