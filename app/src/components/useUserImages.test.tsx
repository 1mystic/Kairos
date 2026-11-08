import { render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Question } from '@kairos/core';
import { BankContext } from '../store/bankHooks';
import type { BankStore } from '../store/bank';
import { QuestionView } from './QuestionView';
import { clearUserImageCache, isUserQuestion, useUserImageMap } from './useUserImages';

const id = 'abcdef0123456789';
const URL1 = 'data:image/webp;base64,AAAA';
const uq = {
  id: 'u_1',
  type: 'SCQ',
  stem: `see ![fig](img:${id})`,
  options: [{ key: 'A', text: 'a' }, { key: 'B', text: 'b' }],
  answer: { keys: ['A'] },
  images: [{ id, w: 300, h: 200, alt: 'user fig', variants: [300] }],
  source: { kind: 'user' },
  tax: { subject: 'PHY' },
} as unknown as Question;

function wrap(getMedia: BankStore['getMedia']) {
  const store = { kind: 'local', getMedia } as unknown as BankStore;
  return ({ children }: { children: ReactNode }) => <BankContext.Provider value={{ store, isGuest: true }}>{children}</BankContext.Provider>;
}

beforeEach(() => clearUserImageCache());

describe('user images', () => {
  it('renders a user image from a data URL without srcset', async () => {
    const getMedia = vi.fn(async () => URL1);
    const { container } = render(<QuestionView question={uq} />, { wrapper: wrap(getMedia) });
    const img = await screen.findByAltText('user fig');
    expect(img).toHaveAttribute('src', URL1);
    expect(img).not.toHaveAttribute('srcset');
    expect(img).toHaveAttribute('width', '300');
    expect(img).toHaveAttribute('height', '200');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(container.querySelector('figure.kc-fig')).not.toBeNull();
  });

  it('missing media falls back to alt text, never a CDN url', async () => {
    const getMedia = vi.fn(async () => null);
    const { container } = render(<QuestionView question={uq} />, { wrapper: wrap(getMedia) });
    await waitFor(() => expect(getMedia).toHaveBeenCalled());
    expect(container.querySelector('img')).toBeNull();
    expect(container).toHaveTextContent('user fig');
  });

  it('explicit resolver and userImages override the store; unsafe urls are refused', () => {
    const { container, rerender } = render(<QuestionView question={uq} imageResolver={() => URL1} />);
    expect(container.querySelector('img')).toHaveAttribute('src', URL1);
    rerender(<QuestionView question={uq} userImages={{ [id]: 'javascript:alert(1)' }} />);
    expect(container.querySelector('img')).toBeNull();
  });

  it('bank questions never touch the store', () => {
    const getMedia = vi.fn(async () => URL1);
    const bankQ = { ...uq, id: 'q_9', source: { kind: 'official' } } as unknown as Question;
    expect(isUserQuestion(bankQ)).toBe(false);
    render(<QuestionView question={bankQ} />, { wrapper: wrap(getMedia) });
    expect(getMedia).not.toHaveBeenCalled();
  });

  it('hook caches across mounts', async () => {
    const getMedia = vi.fn(async () => URL1);
    const a = renderHook(() => useUserImageMap(uq), { wrapper: wrap(getMedia) });
    await waitFor(() => expect(a.result.current[id]).toBe(URL1));
    a.unmount();
    const b = renderHook(() => useUserImageMap(uq), { wrapper: wrap(getMedia) });
    await waitFor(() => expect(b.result.current[id]).toBe(URL1));
    expect(getMedia).toHaveBeenCalledTimes(1);
  });
});
