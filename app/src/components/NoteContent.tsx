import { useEffect, useRef, useState } from 'react';
import './NoteContent.css';
import { ContentHtml } from './QuestionView';

/** True when the markdown has a fenced ```mermaid block (the only case that loads the mermaid chunk). */
export const hasMermaidFence = (md: string): boolean => /^ {0,3}```[ \t]*mermaid\b/im.test(md);

const currentTheme = (): 'dark' | 'light' => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

let seq = 0;

/**
 * An AI note rendered as safe markdown + KaTeX (same renderer as solutions) with ```mermaid fences drawn as diagrams.
 * mermaid is a lazy chunk, fetched only when a note contains a mermaid fence, and runs with securityLevel 'strict'
 * (its own sanitiser; no click handlers, no raw HTML). A diagram that fails to parse stays as a code block with a short note.
 */
export function NoteContent({ markdown, className = '' }: { markdown: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const diagrams = hasMermaidFence(markdown);
  const [theme, setTheme] = useState<'dark' | 'light'>(currentTheme);

  // follow the app theme while a diagram is on screen
  useEffect(() => {
    if (!diagrams || typeof MutationObserver === 'undefined') return;
    const mo = new MutationObserver(() => setTheme(currentTheme()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, [diagrams]);

  useEffect(() => {
    const root = box.current;
    if (!diagrams || !root) return;
    const blocks = [...root.querySelectorAll<HTMLElement>('pre.kc-code[data-lang="mermaid"]')];
    if (!blocks.length) return;
    let live = true;
    void (async () => {
      let mermaid: typeof import('mermaid').default;
      try {
        mermaid = (await import('mermaid')).default;
        mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: theme === 'dark' ? 'dark' : 'default' });
      } catch {
        return; // chunk could not load (offline): the code blocks stay as they are
      }
      for (const pre of blocks) {
        if (!live) return;
        const id = `kairos-mmd-${++seq}`;
        try {
          const { svg } = await mermaid.render(id, pre.textContent ?? '');
          if (!live || !pre.isConnected) return;
          const fig = document.createElement('div');
          fig.className = 'kc-diagram';
          fig.setAttribute('role', 'img');
          fig.setAttribute('aria-label', 'Diagram');
          fig.innerHTML = svg; // mermaid's sanitised SVG (securityLevel 'strict'); the only HTML injected here
          pre.replaceWith(fig);
        } catch {
          document.getElementById(`d${id}`)?.remove(); // mermaid leaves its scratch element behind on a parse error
          if (!live || !pre.isConnected) return;
          if (!(pre.previousElementSibling as HTMLElement | null)?.classList.contains('kc-diagram-err')) {
            const p = document.createElement('p');
            p.className = 'kc-diagram-err text-small text-slate';
            p.textContent = 'Diagram could not be drawn';
            pre.before(p);
          }
        }
      }
    })();
    return () => { live = false; };
  }, [markdown, diagrams, theme]);

  // key: a theme change re-injects the markup so the diagrams are drawn again in the new theme
  return (
    <div ref={box} className={`note-content ${className}`} data-testid="note-content">
      <ContentHtml key={diagrams ? theme : 'plain'} markdown={markdown} />
    </div>
  );
}
