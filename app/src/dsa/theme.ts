import { useEffect, useState } from 'react';
import { initialTheme, type Theme } from '../components/ThemeToggle';

export const DR_THEME_KEY = 'dr-theme';

export function currentTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === 'dark' || t === 'light' ? t : initialTheme();
}

/** Mirror the Kairos theme into DryRun's storage key (must run BEFORE the iframe gets its src). */
export function writeDryrunTheme(theme: Theme): void {
  try { localStorage.setItem(DR_THEME_KEY, theme); } catch { /* ignore */ }
}

/** Live Kairos theme: ThemeToggle sets `data-theme` on <html>, so observe that attribute. */
export function useKairosTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(currentTheme);
  useEffect(() => {
    const obs = new MutationObserver(() => setTheme(currentTheme()));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);
  return theme;
}

export type DryrunMessage = { type: 'dryrun:ready'; slug: string } | { type: 'dryrun:done'; slug: string; done: boolean };

/** Accept only same-origin messages from our own iframe window with a known shape. */
export function parseDryrunMessage(e: { origin: string; source: unknown; data: unknown }, frame: Window | null, origin = location.origin): DryrunMessage | null {
  if (e.origin !== origin || !frame || e.source !== frame) return null;
  const d = e.data as Record<string, unknown> | null;
  if (!d || typeof d !== 'object' || typeof d.slug !== 'string') return null;
  if (d.type === 'dryrun:ready') return { type: 'dryrun:ready', slug: d.slug };
  if (d.type === 'dryrun:done' && typeof d.done === 'boolean') return { type: 'dryrun:done', slug: d.slug, done: d.done };
  return null;
}
