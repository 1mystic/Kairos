import { describe, expect, it } from 'vitest';
import type { Question } from '@kairos/core';
import { aiTarget, aiTargetUrl, buildAiPrompt, PROVIDERS, LAUNCH_PROVIDERS } from './askAi';

const mk = (over: Record<string, unknown> = {}) => ({
  id: 'q1', type: 'SCQ', stem: 'A body of mass $m$ falls. Find $v$.',
  options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }],
  answer: { keys: ['B'] }, solution: 'Use $v=gt$ so B.',
  tax: { subject: 'PHY', chapter: 'PHY.LOM' }, ...over,
}) as unknown as Question;

describe('buildAiPrompt', () => {
  it('SCQ: exam, subject, stem, options, format, instructions', () => {
    const p = buildAiPrompt(mk(), { exam: 'JEE_MAIN' });
    expect(p).toContain('JEE');
    expect(p).toContain('PHY / PHY.LOM');
    expect(p).toContain('$m$');
    expect(p).toContain('(A) 1');
    expect(p).toContain('Single correct');
    expect(p).toContain('step by step');
    expect(p).toContain('common mistake');
  });
  it('MSQ and NVQ format instructions; NVQ has no options', () => {
    expect(buildAiPrompt(mk({ type: 'MSQ' }))).toContain('Multiple correct');
    const n = buildAiPrompt(mk({ type: 'NVQ' }));
    expect(n).toContain('Numerical value');
    expect(n).not.toContain('Options:');
  });
  it('hides answer and solution unless revealed', () => {
    const p = buildAiPrompt(mk(), { given: 'A' });
    expect(p).not.toContain('Correct answer');
    expect(p).not.toContain('Use $v=gt$');
    expect(p).not.toContain('My answer');
  });
  it('includes answer, solution and student answer when revealed', () => {
    const p = buildAiPrompt(mk(), { revealed: true, given: 'A' });
    expect(p).toContain('Correct answer (official key): B');
    expect(p).toContain('My answer: A');
    expect(p).toContain('Use $v=gt$ so B.');
  });
  it('numeric answer and unanswered', () => {
    const p = buildAiPrompt(mk({ type: 'NVQ', answer: { value: 4, tol: 0.1 } }), { revealed: true, given: '' });
    expect(p).toContain('4 (within 0.1)');
    expect(p).toContain('did not answer');
  });
});

describe('aiTargetUrl', () => {
  const prompt = 'What is $x^2$? & more';
  it('encodes the prompt per provider', () => {
    const e = encodeURIComponent(prompt);
    expect(aiTargetUrl('chatgpt', prompt)).toBe(`https://chatgpt.com/?q=${e}`);
    expect(aiTargetUrl('claude', prompt)).toBe(`https://claude.ai/new?q=${e}`);
    expect(aiTargetUrl('perplexity', prompt)).toBe(`https://www.perplexity.ai/search?q=${e}`);
    expect(aiTargetUrl('google', prompt)).toBe(`https://www.google.com/search?udm=50&q=${e}`);
  });
  it('gemini is clipboard-only with no prompt in the URL', () => {
    const t = aiTarget('gemini', prompt);
    expect(t).toEqual({ url: 'https://gemini.google.com/app', clipboardOnly: true, shortened: false });
    expect(PROVIDERS.find((p) => p.id === 'gemini')?.prefill).toBe(false);
    expect(PROVIDERS.map((p) => p.label)).toEqual(['Gemini', 'ChatGPT', 'Google AI search', 'Claude', 'Perplexity']);
    expect(LAUNCH_PROVIDERS.map((p) => p.id)).toEqual(['chatgpt', 'google', 'claude', 'perplexity']);
  });
  it('long prompts fall back to a short one under the limit', () => {
    const q = mk({ stem: 'x'.repeat(20000) });
    const full = buildAiPrompt(q, { revealed: true });
    const t = aiTarget('chatgpt', full, q, { revealed: true });
    expect(t.shortened).toBe(true);
    expect(t.clipboardOnly).toBe(true);
    expect(t.url.length).toBeLessThanOrEqual(7000);
    expect(decodeURIComponent(t.url.split('?q=')[1]!)).toContain('clipboard');
  });
});
