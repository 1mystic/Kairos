import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { Landing } from './Landing';

function setup(reduced: boolean) {
  vi.stubGlobal(
    'matchMedia',
    (q: string) => ({ matches: reduced && q.includes('reduce'), media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, dispatchEvent: () => false }),
  );
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() { return []; }
    },
  );
  window.matchMedia = globalThis.matchMedia;
}

const renderIt = (fn = vi.fn()) => {
  render(<MemoryRouter><Landing onStartGuest={fn} /></MemoryRouter>);
  return fn;
};

describe('Landing', () => {
  beforeEach(() => setup(false));

  it('renders headline and CTAs; guest CTA fires', () => {
    const fn = renderIt();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/right question/i);
    expect(screen.getAllByRole('link', { name: 'Sign in' })[0]).toHaveAttribute('href', '/signin');
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute('href', '/signup');
    fireEvent.click(screen.getAllByRole('button', { name: /try it now/i })[0]!);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(screen.getAllByRole('link', { name: 'Create account' }).length).toBeGreaterThan(0);
  });

  it('renders real notation and the palette summary', () => {
    renderIt();
    expect(document.querySelector('.ld-formula .katex')).toBeTruthy();
    expect(screen.getByRole('img', { name: /question palette demo/i })).toBeInTheDocument();
  });

  it('starts hidden without reduced motion', () => {
    renderIt();
    expect(document.querySelector('.ld-today')).toHaveAttribute('data-shown', 'false');
  });

  it('shows final states with reduced motion', () => {
    setup(true);
    renderIt();
    expect(document.querySelector('.ld-today')).toHaveAttribute('data-shown', 'true');
    expect(document.querySelector('.ld-phases')).toHaveAttribute('data-shown', 'true');
    expect(document.querySelector('.ld-ring')).toHaveAttribute('data-shown', 'true');
  });
});
