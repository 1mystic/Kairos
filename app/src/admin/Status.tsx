import type { ReactNode } from 'react';
import { AlertIcon, CheckIcon } from '../components/icons';

/** Publish result: green with a tick for success, red with an alert icon for failure (always with words). */
export function StatusBanner({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <aside role={ok ? 'status' : 'alert'} className={`banner ${ok ? 'banner-good' : 'banner-bad'}`}>
      {ok ? <CheckIcon className="shrink-0" /> : <AlertIcon className="shrink-0" />}
      <div className="min-w-0 flex-1 basis-48">{children}</div>
    </aside>
  );
}
