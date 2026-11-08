import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Question } from '@kairos/core';
import { ContentHtml, QuestionView } from './QuestionView';

const id = '0123456789abcdef';
const base = {
  id: 'q_1',
  stem: 'Find $x^2$ in ![a force diagram](img:' + id + ')',
  options: ['A', 'B', 'C', 'D'].map((key) => ({ key, text: `opt $${key}$` })),
  images: [{ id, w: 659, h: 300, alt: 'a force diagram', variants: [480, 659] }],
  tax: { subject: 'PHY' },
} as const;
const scq = { ...base, type: 'SCQ', answer: { keys: ['B'] }, solution: 'Because **reasons**' } as unknown as Question;

describe('QuestionView', () => {
  it('renders math and an image with srcset from real variants', () => {
    const { container } = render(<QuestionView question={scq} />);
    expect(container.querySelectorAll('.katex').length).toBeGreaterThan(4);
    const img = screen.getByAltText('a force diagram');
    expect(img).toHaveAttribute('srcset', '/img/' + id + '.w480.webp 480w, /img/' + id + '.w659.webp 659w');
    expect(img).toHaveAttribute('src', `/img/${id}.w659.webp`);
    expect(img).toHaveAttribute('sizes', '(max-width: 640px) 100vw, 640px');
    expect(img).toHaveAttribute('width', '659');
    expect(img).toHaveAttribute('height', '300');
    expect(img).toHaveAttribute('loading', 'lazy');
    expect(img).toHaveAttribute('decoding', 'async');
    expect(img.closest('figure')).toHaveClass('kc-fig');
  });

  it('caps the src at 960 wide', () => {
    const q = { ...scq, images: [{ ...base.images[0], w: 1400, variants: [480, 960, 1400] }] } as Question;
    render(<QuestionView question={q} />);
    expect(screen.getByAltText('a force diagram')).toHaveAttribute('src', `/img/${id}.w960.webp`);
  });

  it('SCQ: radios, selection callback', async () => {
    const onSelect = vi.fn();
    render(<QuestionView question={scq} onSelect={onSelect} selected={['A']} />);
    expect(screen.getAllByRole('radio')).toHaveLength(4);
    expect(screen.getAllByRole('radio')[0]).toBeChecked();
    await userEvent.click(screen.getAllByRole('radio')[2]!);
    expect(onSelect).toHaveBeenCalledWith(['C']);
  });

  it('MSQ: checkboxes toggle', async () => {
    const onSelect = vi.fn();
    render(<QuestionView question={{ ...scq, type: 'MSQ' } as Question} onSelect={onSelect} selected={['A']} />);
    const boxes = screen.getAllByRole('checkbox');
    await userEvent.click(boxes[1]!);
    expect(onSelect).toHaveBeenLastCalledWith(['A', 'B']);
    await userEvent.click(boxes[0]!);
    expect(onSelect).toHaveBeenLastCalledWith([]);
  });

  it('NVQ has no options; solution shows answer', () => {
    const nvq = { ...scq, type: 'NVQ', options: undefined, answer: { value: 2.5, tol: 0.1 } } as unknown as Question;
    render(<QuestionView question={nvq} showSolution />);
    expect(screen.queryByRole('radio')).toBeNull();
    expect(screen.getByText('2.5 (±0.1)')).toBeInTheDocument();
  });

  it('solution only when asked; review is read-only and marks the correct option', () => {
    const { rerender } = render(<QuestionView question={scq} />);
    expect(screen.queryByText('reasons')).toBeNull();
    rerender(<QuestionView question={scq} showSolution variant="review" onSelect={vi.fn()} />);
    expect(screen.getByText('reasons').tagName).toBe('STRONG');
    expect(screen.getByText('Correct')).toBeInTheDocument();
    expect(screen.getAllByRole('radio')[0]).toBeDisabled();
  });

  it('ContentHtml escapes raw HTML and renders unknown images as alt text', () => {
    const { container } = render(<ContentHtml markdown={`<b>x</b> ![lost](img:${id})`} />);
    expect(container.querySelector('b')).toBeNull();
    expect(container).toHaveTextContent('<b>x</b> lost');
  });
});
