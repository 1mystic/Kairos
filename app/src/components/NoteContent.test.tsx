import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), render: vi.fn() }));
vi.mock('mermaid', () => ({ default: mermaid }));

import { hasMermaidFence, NoteContent } from './NoteContent';

const FENCE = 'Flow:\n```mermaid\ngraph TD\n  A-->B\n```\nDone $x^2$';

beforeEach(() => {
  vi.clearAllMocks();
  delete document.documentElement.dataset.theme;
  mermaid.render.mockResolvedValue({ svg: '<svg data-testid="diagram"><g></g></svg>' });
});

describe('hasMermaidFence', () => {
  it('detects a mermaid fence only', () => {
    expect(hasMermaidFence(FENCE)).toBe(true);
    expect(hasMermaidFence('```python\nx\n```')).toBe(false);
    expect(hasMermaidFence('talks about mermaid in prose')).toBe(false);
  });
});

describe('NoteContent', () => {
  it('renders plain markdown and math without touching mermaid', async () => {
    render(<NoteContent markdown={'Hello **world** $x^2$\n```python\nprint(1)\n```'} />);
    expect(screen.getByText('world')).toBeInTheDocument();
    expect(document.querySelector('.katex')).not.toBeNull();
    expect(document.querySelector('pre.kc-code[data-lang="python"]')).not.toBeNull();
    await new Promise((r) => setTimeout(r, 20));
    expect(mermaid.initialize).not.toHaveBeenCalled();
    expect(mermaid.render).not.toHaveBeenCalled();
  });

  it('replaces a mermaid fence with the rendered SVG, strict mode, light theme', async () => {
    render(<NoteContent markdown={FENCE} />);
    expect(await screen.findByTestId('diagram')).toBeInTheDocument();
    expect(mermaid.initialize).toHaveBeenCalledWith({ startOnLoad: false, securityLevel: 'strict', theme: 'default' });
    expect(mermaid.render).toHaveBeenCalledTimes(1);
    expect(mermaid.render.mock.calls[0]![1]).toBe('graph TD\n  A-->B');
    expect(document.querySelector('pre[data-lang="mermaid"]')).toBeNull();
    expect(document.querySelector('.kc-diagram')).not.toBeNull();
  });

  it('uses the dark mermaid theme when the app is dark', async () => {
    document.documentElement.dataset.theme = 'dark';
    render(<NoteContent markdown={FENCE} />);
    await screen.findByTestId('diagram');
    expect(mermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark', securityLevel: 'strict' }));
  });

  it('keeps the code block and says so when the diagram cannot be drawn', async () => {
    mermaid.render.mockRejectedValue(new Error('Parse error'));
    render(<NoteContent markdown={FENCE} />);
    expect(await screen.findByText('Diagram could not be drawn')).toBeInTheDocument();
    expect(document.querySelector('pre[data-lang="mermaid"]')).not.toBeNull();
    expect(screen.queryByTestId('diagram')).toBeNull();
  });

  it('never turns raw HTML in the note into elements', async () => {
    const { container } = render(<NoteContent markdown={'<img src=x onerror=alert(1)> <script>1</script>\n' + FENCE} />);
    await waitFor(() => expect(mermaid.render).toHaveBeenCalled());
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('script')).toBeNull();
  });
});
