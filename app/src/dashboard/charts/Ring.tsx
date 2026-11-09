import type { ReactNode } from 'react';

/** Progress ring. Track and arc use currentColor via Tailwind text-* classes (token colours). `value` is 0..1; null draws only the track. */
export function Ring({ value, size = 160, stroke = 14, label, children, tone = 'primary' }: { value: number | null; size?: number; stroke?: number; label: string; children?: ReactNode; tone?: 'primary' | 'accent' | 'good' | 'bad' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = value === null ? 0 : Math.max(0, Math.min(1, value));
  return (
    <div role="img" aria-label={label} className="dash-ring relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-3" />
        {frac > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`} className={tone === 'accent' ? 'stroke-accent' : tone === 'good' ? 'stroke-good' : tone === 'bad' ? 'stroke-bad' : 'stroke-primary'} />
        )}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
