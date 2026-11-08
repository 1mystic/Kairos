import { useEffect, useMemo, useState } from 'react';
import type { MasteryDoc, Question } from '@kairos/core';
import { getLatestVersion, getQuestionsByIds } from '../bank/client';
import { useExamData } from '../cbt/loader';
import { useStore, type MockDoc, type SessionDoc } from '../store';
import { loadTaxonomy, type Taxonomy } from '../practice/taxonomy';
import type { QMap } from './compute';

export interface AnalysisData {
  loading: boolean;
  sessions: SessionDoc[];
  mocks: MockDoc[];
  mastery: MasteryDoc | null;
  /** null while loading or when the bank is unreachable and nothing is cached */
  taxonomy: Taxonomy | null;
  exam: string | undefined;
}

/** Everything the analysis pages read, in one go. Each source fails soft (guest, offline). */
export function useAnalysisData(): AnalysisData {
  const store = useStore();
  const [s, setS] = useState<Omit<AnalysisData, 'loading'> & { done: boolean }>({ done: false, sessions: [], mocks: [], mastery: null, taxonomy: null, exam: undefined });
  useEffect(() => {
    let live = true;
    void Promise.all([
      store.listSessions({ limit: 100 }).catch(() => []),
      store.listMocks().catch(() => []),
      store.getState('mastery').catch(() => null),
      store.getProfile().catch(() => null),
      loadTaxonomy().catch(() => null),
    ]).then(([sessions, mocks, mastery, profile, taxonomy]) => {
      if (live) setS({ done: true, sessions, mocks, mastery: mastery as MasteryDoc | null, taxonomy, exam: (profile as { exam?: string } | null)?.exam });
    });
    return () => { live = false; };
  }, [store]);
  return { loading: !s.done, sessions: s.sessions, mocks: s.mocks, mastery: s.mastery, taxonomy: s.taxonomy, exam: s.exam };
}

/** Questions (with answers) behind practice sessions, from the cached bank. Resolves to an empty map offline. */
export function useSessionQuestions(sessions: SessionDoc[]): { questions: ReadonlyMap<string, Question>; loading: boolean } {
  const key = sessions.map((s) => s.id).join(',');
  const [state, setState] = useState<{ key: string; map: ReadonlyMap<string, Question> } | null>(null);
  useEffect(() => {
    if (!sessions.length) return;
    let live = true;
    void (async () => {
      const byExam = new Map<string, Set<string>>();
      for (const s of sessions) {
        const ids = (s.qids as string[] | undefined) ?? [];
        const exam = String(s.exam ?? 'JEE_MAIN');
        const set = byExam.get(exam) ?? byExam.set(exam, new Set()).get(exam)!;
        ids.forEach((i) => set.add(i));
      }
      const map = new Map<string, Question>();
      try {
        const v = await getLatestVersion();
        for (const [exam, ids] of byExam) for (const q of await getQuestionsByIds(v, exam, [...ids])) map.set(q.id, q);
      } catch { /* offline and not cached: examples are optional */ }
      if (live) setState({ key, map });
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` identifies `sessions`
  }, [key]);
  const empty = useMemo(() => new Map<string, Question>(), []);
  return { questions: state?.key === key ? state.map : empty, loading: sessions.length > 0 && state?.key !== key };
}

/** Questions of a mock paper: public items (difficulty, taxonomy), upgraded with answer keys when they load. */
export function useMockQuestions(mock: MockDoc | null | undefined): QMap | undefined {
  const exam = useExamData(mock ? mock.paperId : null);
  const [answers, setAnswers] = useState<QMap | null>(null);
  useEffect(() => {
    let live = true;
    void exam.data?.loadAnswers().then((m) => live && setAnswers(m));
    return () => { live = false; };
  }, [exam.data]);
  return useMemo(() => answers ?? (exam.data ? new Map(exam.data.model.questions.map((q) => [q.id, q])) : undefined), [answers, exam.data]);
}

export function chapterIndex(tax: Taxonomy | null): { names: Record<string, string>; subjects: Record<string, string> } {
  const names: Record<string, string> = {};
  const subjects: Record<string, string> = {};
  for (const s of tax?.subjects ?? []) for (const c of s.chapters) { names[c.id] = c.name; subjects[c.id] = s.id; }
  return { names, subjects };
}
