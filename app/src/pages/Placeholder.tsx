import type { ReactNode } from 'react';
import { Link } from 'react-router';

/** "Coming soon" stand-in. Later agents replace the route element that uses this. */
export function Placeholder({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 px-4 py-8">
      <h1 className="text-2xl">{title}</h1>
      <div className="card space-y-2">
        <p className="font-semibold">Coming soon</p>
        <p className="text-slate">{children ?? 'We are still building this part. Thanks for your patience.'}</p>
      </div>
      <Link to="/" className="text-primary underline">Back to home</Link>
    </main>
  );
}
