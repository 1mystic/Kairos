import type { Question } from '@kairos/core';
import type { SessionDoc, UserStore } from '../store';

export function mkQ(id: string, over: Record<string, unknown> = {}): Question {
  return {
    id,
    type: 'SCQ',
    stem: `stem ${id}`,
    options: ['A', 'B', 'C', 'D'].map((key) => ({ key, text: `opt ${key}` })),
    answer: { keys: ['B'] },
    solution: `solution ${id}`,
    tax: { subject: 'PHY', chapter: 'PHY.LOM', topics: [] },
    difficulty: { label: 'M', b: 0.1, p_correct: 0.5, median_time_s: 100 },
    ...over,
  } as unknown as Question;
}

/** In-memory UserStore stand-in that counts writes. */
export function fakeStore(over: Partial<UserStore> = {}) {
  const sessions: SessionDoc[] = [];
  const states: Record<string, Record<string, unknown>> = {};
  const calls = { addSession: 0, putState: 0 };
  const store = {
    kind: 'local',
    getState: async (d: string) => states[d] ?? null,
    putState: async (d: string, v: Record<string, unknown>) => {
      calls.putState++;
      states[d] = v;
    },
    addSession: async (s: SessionDoc) => {
      calls.addSession++;
      sessions.push(s);
    },
    listSessions: async () => [...sessions],
    getSession: async (id: string) => sessions.find((s) => s.id === id) ?? null,
    ...over,
  } as unknown as UserStore;
  return { store, sessions, states, calls };
}
