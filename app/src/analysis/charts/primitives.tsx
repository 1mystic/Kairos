import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Width of the element in px (falls back to `fallback` where layout is unavailable, e.g. jsdom). */
export function useWidth<T extends HTMLElement>(fallback = 600): [React.RefObject<T | null>, number] {
  const ref = useRef<T | null>(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const read = () => {
      const x = Math.round(el.getBoundingClientRect().width);
      if (x > 0) setW(x);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

export interface TableData { caption: string; head: string[]; rows: (string | number)[][] }

/**
 * Accessible chart shell: the picture is `role="img"` with a one-sentence summary; the same numbers sit in a
 * visually hidden table next to it. No animation, so reduced-motion needs no special case.
 */
export function Chart({ summary, table, children, className = '' }: { summary: string; table: TableData; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div role="img" aria-label={summary}>{children}</div>
      <table className="sr-only">
        <caption>{table.caption}</caption>
        <thead><tr>{table.head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>
          {table.rows.map((r, i) => (
            <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export const pct = (x: number | null | undefined) => (x === null || x === undefined ? 'n/a' : `${Math.round(x * 100)}%`);
export const minutes = (ms: number) => `${Math.round(ms / 60_000)} min`;
export const clock = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`;
export const mmss = (ms: number) => `${Math.floor(ms / 60_000)}:${String(Math.round((ms % 60_000) / 1000)).padStart(2, '0')}`;
