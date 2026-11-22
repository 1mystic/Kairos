import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import type { PublicQuestion, Question } from '@kairos/core';
import { aiTarget, buildAiPrompt, DEFAULT_PROVIDER, PROVIDERS, providerLabel, type PromptOptions } from '../lib/askAi';
import type { AiProvider } from '../store/types';
import { CheckIcon, ChevronDownIcon, SparkIcon } from './icons';

const KEY = 'kairos.askAi.provider';

type Known = Exclude<AiProvider, 'other'>;

export function lastProvider(): Known {
  try {
    const v = localStorage.getItem(KEY);
    if (PROVIDERS.some((p) => p.id === v)) return v as Known;
  } catch { /* storage blocked */ }
  return DEFAULT_PROVIDER;
}

/** Copies text; works without the async clipboard API (older browsers, insecure contexts). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the textarea route */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.className = 'sr-only';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    ta.remove();
    return ok;
  } catch { return false; }
}

export interface AskAiProps extends PromptOptions {
  question: Question | PublicQuestion;
  /** the student's own explanation is saved against this provider; called when they open one */
  onAsk?: (provider: Known) => void;
}

/**
 * Split button: "Ask AI" opens the last-used provider, the chevron lists the others. Click copies the full prompt
 * and opens the site in a new tab. Nothing is sent anywhere until the student clicks. Render it only where the
 * answer may be seen (after answering, in reviews), never in a live exam.
 */
export function AskAiButton({ question, onAsk, ...opts }: AskAiProps) {
  const [provider, setProvider] = useState<Known>(lastProvider);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    box.current?.querySelector<HTMLElement>('[aria-checked="true"]')?.focus();
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(''), 6000);
    return () => clearTimeout(t);
  }, [msg]);

  const ask = (id: Known) => {
    const prompt = buildAiPrompt(question, opts);
    const target = aiTarget(id, prompt, question, opts);
    // both inside the click handler so popup blockers allow the tab
    window.open(target.url, '_blank', 'noopener,noreferrer');
    void copyText(prompt).then((ok) => {
      const name = providerLabel(id);
      if (!ok) setMsg(`Opened ${name}. Copying failed, so copy the question by hand.`);
      else setMsg(target.clipboardOnly ? `Prompt copied. Paste it into ${name} if the box is empty.` : `Opened ${name} with your question. The prompt is also copied.`);
    });
    setProvider(id);
    try { localStorage.setItem(KEY, id); } catch { /* storage blocked */ }
    setOpen(false);
    onAsk?.(id);
  };

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); trigger.current?.focus(); return; }
    if (!open) return;
    const items = [...(box.current?.querySelectorAll<HTMLElement>('[role="menuitemradio"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
  };

  return (
    <div className="stack-label" data-testid="ask-ai">
      <div className="relative inline-flex" ref={box} onKeyDown={onKey}>
        <div className="row gap-s1">
          <button type="button" className="btn btn-secondary" onClick={() => ask(provider)} aria-label={`Ask AI, opens ${providerLabel(provider)}`}>
            <SparkIcon width={20} height={20} aria-hidden />
            Ask AI
          </button>
          <button
            ref={trigger}
            type="button"
            className="btn btn-secondary btn-icon"
            aria-label="Choose an AI"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            onClick={() => setOpen(!open)}
            onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}
          >
            <ChevronDownIcon width={16} height={16} aria-hidden />
          </button>
        </div>
        {open && (
          <div id={menuId} role="menu" aria-label="Ask an AI" className="menu left-0 top-full mt-s2">
            {PROVIDERS.map((p) => (
              <button key={p.id} type="button" role="menuitemradio" aria-checked={p.id === provider} className="menu-item" onClick={() => ask(p.id)}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{p.label}</span>
                  {!p.prefill && <span className="block text-caption text-slate">Paste the prompt</span>}
                </span>
                {p.id === provider && <CheckIcon width={20} height={20} className="shrink-0 text-primary" />}
              </button>
            ))}
          </div>
        )}
      </div>
      {msg && <p role="status" className="text-small text-slate">{msg}</p>}
    </div>
  );
}
