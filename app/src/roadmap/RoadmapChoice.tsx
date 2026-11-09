import type { ReactNode } from 'react';
import { CheckIcon } from '../components/icons';

export type RoadmapMode = 'default' | 'custom';

/** Two plain options: Kairos defaults (recommended) or the student's own roadmap. Used in onboarding and Settings. */
export function RoadmapChoice({ value, onChange, name = 'roadmap-mode', disabled }: { value: RoadmapMode; onChange(m: RoadmapMode): void; name?: string; disabled?: boolean }) {
  const opt = (m: RoadmapMode, title: ReactNode, body: string) => (
    <label key={m} className={`opt opt-live${value === m ? ' opt-on' : ''}`}>
      <input type="radio" name={name} checked={value === m} disabled={disabled} onChange={() => onChange(m)} className="sr-only" />
      <span className="stack min-w-0 flex-1 gap-s1">
        <span className="text-body font-semibold">{title}</span>
        <span className="text-small text-slate">{body}</span>
      </span>
      {value === m && <CheckIcon width={20} height={20} className="shrink-0 text-primary" />}
    </label>
  );
  return (
    <div role="radiogroup" aria-label="Roadmap" className="stack gap-tight">
      {opt('default', 'Default roadmap (recommended)', 'Follows the exam calendar and Kairos defaults.')}
      {opt('custom', 'Custom roadmap', "I'll set it: when the final sprint starts, buffer days, phase lengths.")}
    </div>
  );
}
