import { useState } from 'react';
import { MoonIcon, SunIcon } from './icons';

export type Theme = 'light' | 'dark';
const KEY = 'kairos-theme';

export function initialTheme(): Theme {
  const saved = localStorage.getItem(KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => (document.documentElement.dataset.theme as Theme) || initialTheme());
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  return (
    <button
      type="button"
      className="btn btn-secondary !min-w-11 !px-0"
      aria-label={`Switch to ${next} theme`}
      onClick={() => {
        localStorage.setItem(KEY, next);
        applyTheme(next);
        setTheme(next);
      }}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
