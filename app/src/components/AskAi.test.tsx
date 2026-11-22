import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Question } from '@kairos/core';
import { AskAiButton } from './AskAi';
import { buildAiPrompt } from '../lib/askAi';

const q = {
  id: 'q1', type: 'SCQ', stem: 'Find $v$.', options: [{ key: 'A', text: '1' }, { key: 'B', text: '2' }],
  answer: { keys: ['B'] }, solution: 'because', tax: { subject: 'PHY' },
} as unknown as Question;

const open = vi.fn();
const writeText = vi.fn<(text: string) => Promise<void>>(async () => undefined);

beforeEach(() => {
  localStorage.clear();
  open.mockClear();
  writeText.mockClear();
  vi.stubGlobal('open', open);
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

describe('AskAiButton', () => {
  it('main button opens the default provider (ChatGPT) and copies the prompt', async () => {
    render(<AskAiButton question={q} exam="JEE_MAIN" revealed given="A" />);
    await userEvent.click(screen.getByRole('button', { name: /^Ask AI/ }));
    const prompt = buildAiPrompt(q, { exam: 'JEE_MAIN', revealed: true, given: 'A' });
    expect(open).toHaveBeenCalledWith(`https://chatgpt.com/?q=${encodeURIComponent(prompt)}`, '_blank', 'noopener,noreferrer');
    expect(writeText).toHaveBeenCalledWith(prompt);
    expect(await screen.findByRole('status')).toHaveTextContent('Opened ChatGPT');
  });

  it('chevron menu: keyboard, pick Claude, remembered next time; no Gemini', async () => {
    const { unmount } = render(<AskAiButton question={q} revealed />);
    const chev = screen.getByRole('button', { name: 'Choose an AI' });
    expect(chev).toHaveAttribute('aria-expanded', 'false');
    chev.focus();
    await userEvent.keyboard('{ArrowDown}');
    expect(chev).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByRole('menuitemradio').map((b) => b.textContent)).toEqual(['ChatGPT', 'Google AI search', 'Claude', 'Perplexity']);
    expect(screen.queryByRole('menuitemradio', { name: /Gemini/ })).toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    await userEvent.click(chev);
    await userEvent.click(screen.getByRole('menuitemradio', { name: /Claude/ }));
    expect(open.mock.calls[0]![0]).toMatch(/^https:\/\/claude\.ai\/new\?q=/);
    expect(localStorage.getItem('kairos.askAi.provider')).toBe('claude');
    unmount();
    open.mockClear();
    render(<AskAiButton question={q} revealed />);
    await userEvent.click(screen.getByRole('button', { name: /^Ask AI/ }));
    expect(open.mock.calls[0]![0]).toMatch(/^https:\/\/claude\.ai\//);
  });

  it('Copy prompt copies without opening a tab; a stored gemini choice falls back to ChatGPT', async () => {
    localStorage.setItem('kairos.askAi.provider', 'gemini');
    render(<AskAiButton question={q} revealed />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose an AI' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Copy prompt/ }));
    expect(open).not.toHaveBeenCalled();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole('status')).toHaveTextContent('Prompt copied');
    expect(screen.getByRole('button', { name: /^Ask AI/ })).toHaveAccessibleName(/ChatGPT/);
  });

  it('closes on click-away', async () => {
    render(<AskAiButton question={q} />);
    await userEvent.click(screen.getByRole('button', { name: 'Choose an AI' }));
    await userEvent.click(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('does not put the answer in the prompt unless revealed', async () => {
    render(<AskAiButton question={q} />);
    await userEvent.click(screen.getByRole('button', { name: /^Ask AI/ }));
    expect(writeText.mock.calls[0]![0]).not.toContain('because');
  });
});
