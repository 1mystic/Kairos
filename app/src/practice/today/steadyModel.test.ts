import { describe, expect, it } from 'vitest';
import { cardModel, type CardInput } from './todayModel';
import type { Suggestion } from './suggestSession';

const base: CardInput = {
  loading: false, planKind: 'steady', plan: null, names: {}, mockLink: null, daysLeft: null, examLabel: 'DSA Interview', status: null, buffered: null, suggestion: null, hasExam: true,
};
const sugg = (questions: number): Suggestion => ({ tasks: [], focus: [{ chapter: 'ARR', name: 'Arrays', reason: 'weak' as never }], questions, estMin: 40, summary: 'Suggested from your practice so far', source: 'mastery', explain: [] });

describe('Today card for a no-date (steady practice) profile', () => {
  it('loads, then offers a suggested session', () => {
    expect(cardModel(base).variant).toBe('loading');
    const m = cardModel({ ...base, suggestion: sugg(20), suggestionReady: true });
    expect(m.variant).toBe('suggest');
    expect(m.primary.to).toBe('/practice/today');
    expect(m.exam).toBeNull();
    expect(m.planLink).toBe(false);
  });
  it('shows a calm "coming soon" state while the track has no questions', () => {
    const m = cardModel({ ...base, suggestion: sugg(0), suggestionReady: true });
    expect(m.variant).toBe('rest');
    expect(m.headline).toMatch(/coming soon/);
    expect(cardModel({ ...base, suggestion: null, suggestionReady: true }).headline).toMatch(/coming soon/);
  });
});
