import { useCallback, useEffect, useState } from 'react';
import { defaultLayout, loadLayout, saveLayout, type Layout } from './layout';

/** Layout state persisted to localStorage (`kairos-dashboard`). */
export function useLayout(): { layout: Layout; setLayout(next: Layout | ((l: Layout) => Layout)): void; reset(): void } {
  const [layout, set] = useState<Layout>(() => loadLayout());
  useEffect(() => saveLayout(layout), [layout]);
  const setLayout = useCallback((n: Layout | ((l: Layout) => Layout)) => set((l) => (typeof n === 'function' ? n(l) : n)), []);
  const reset = useCallback(() => set((l) => ({ ...defaultLayout(), range: l.range })), []);
  return { layout, setLayout, reset };
}
