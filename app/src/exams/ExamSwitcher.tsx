import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { CalendarIcon, CheckIcon, ChevronDownIcon, SettingsIcon, TargetIcon } from '../components/icons';
import { planDate } from '../onboarding/profileModel';
import { examLabel } from '../plan/syllabus';
import { canAddProfile, daysWords } from './model';
import { useActiveExam } from './useActiveExam';

/**
 * "Preparing for: <exam>" in the app shell. No profile yet: nothing. One profile: a chip that links to /exams (no dropdown).
 * Several: a menu of profiles (with days to go or "no date"), then "Manage exams" and "Add an exam".
 * `sidebar` matches the nav items' width; `topbar` is the compact chip beside the theme toggle on phones.
 */
export function ExamSwitcher({ variant = 'sidebar' }: { variant?: 'sidebar' | 'topbar' }) {
  const { loading, profiles, state, active, setActive } = useActiveExam();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const today = planDate(new Date());

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const items = box.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]');
    const on = box.current?.querySelector<HTMLElement>('[aria-checked="true"]') ?? items?.[0];
    on?.focus();
  }, [open]);

  if (loading || profiles.length === 0 || !active) return null;
  const label = examLabel(active.exam);
  const sidebar = variant === 'sidebar';

  if (profiles.length === 1) {
    return (
      <Link to="/exams" className={sidebar ? 'nav-item' : 'btn btn-secondary max-w-40'} aria-label={`Preparing for ${label}. Manage exams`} data-testid="exam-switcher">
        <TargetIcon width={20} height={20} className="shrink-0" />
        <span className={sidebar ? 'nav-label min-w-0' : 'truncate'}><span className="block text-caption text-slate">Preparing for</span><span className="block truncate">{label}</span></span>
      </Link>
    );
  }

  const close = (refocus = true) => { setOpen(false); if (refocus) trigger.current?.focus(); };
  const pick = async (exam: string) => {
    setBusy(true);
    try { await setActive(exam); } finally { setBusy(false); close(); }
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    const items = [...(box.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    const go = (n: number) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus(); };
    if (e.key === 'ArrowDown') go(i + 1);
    else if (e.key === 'ArrowUp') go(i - 1);
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(items.length - 1);
  };

  return (
    <div className="relative min-w-0" ref={box} onKeyDown={onKey} data-testid="exam-switcher">
      <button
        ref={trigger}
        type="button"
        className={sidebar ? 'nav-item w-full' : 'btn btn-secondary max-w-40'}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={`Preparing for ${label}. Switch exam`}
        disabled={busy}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => { if (e.key === 'ArrowDown' && !open) { e.preventDefault(); setOpen(true); } }}
      >
        <TargetIcon width={20} height={20} className="shrink-0" />
        <span className={sidebar ? 'nav-label min-w-0 flex-1 text-left' : 'min-w-0 flex-1 truncate text-left'}>
          <span className="block text-caption text-slate">Preparing for</span>
          <span className="block truncate">{label}</span>
        </span>
        <ChevronDownIcon width={16} height={16} className="shrink-0" aria-hidden />
      </button>
      {open && (
        <div id={menuId} role="menu" aria-label="Your exams" className={`menu ${sidebar ? 'left-0 mt-s2' : 'right-0 mt-s2'}`}>
          {profiles.map((p) => (
            <button key={p.exam} type="button" role="menuitemradio" aria-checked={p.exam === state.active} className="menu-item" onClick={() => void pick(p.exam)}>
              <span className="min-w-0 flex-1"><span className="block truncate">{examLabel(p.exam)}</span><span className="block text-caption text-slate tabular">{daysWords(p, today)}</span></span>
              {p.exam === state.active && <CheckIcon width={20} height={20} className="shrink-0 text-primary" />}
            </button>
          ))}
          <Link role="menuitem" to="/exams" className="menu-item" onClick={() => close(false)}><SettingsIcon width={20} height={20} />Manage exams</Link>
          {canAddProfile(state) && <Link role="menuitem" to="/onboarding?add=1" className="menu-item" onClick={() => close(false)}><CalendarIcon width={20} height={20} />Add an exam</Link>}
        </div>
      )}
    </div>
  );
}
