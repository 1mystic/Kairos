import { useEffect, useId, useRef, useState } from 'react';
import { IconButton } from '../components/ui';
import { MoreIcon } from './icons';
import { SIZE_LABEL, type Size, type WidgetMeta } from './registry';

/** The "..." menu on each card: hide, change size, card options. Esc / outside click closes; arrows move. */
export function CardMenu({ meta, size, onHide, onSize, onOptions }: { meta: WidgetMeta; size: Size; onHide(): void; onSize(s: Size): void; onOptions(): void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    root.current?.querySelector<HTMLElement>('[role^="menuitem"]')?.focus();
    const away = (e: PointerEvent) => { if (!root.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [open]);
  const close = () => { setOpen(false); root.current?.querySelector<HTMLElement>('button')?.focus(); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); return; }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...(root.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    e.preventDefault();
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
  };
  return (
    <div ref={root} className="relative -my-s2 -mr-s2" onKeyDown={onKey}>
      <IconButton label={`${meta.title} options`} variant="ghost" aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen((o) => !o)}><MoreIcon /></IconButton>
      {open && (
        <div id={id} role="menu" aria-label={`${meta.title} card`} className="menu right-0 top-full">
          <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); onHide(); }}>Hide card</button>
          {meta.sizes.length > 1 && (
            <div role="group" aria-label="Card size">
              {meta.sizes.map((s) => (
                <button key={s} type="button" role="menuitemradio" aria-checked={s === size} className="menu-item" onClick={() => { onSize(s); close(); }}>
                  <span className="w-s5 text-primary">{s === size ? '✓' : ''}</span>Size: {SIZE_LABEL[s]}
                </button>
              ))}
            </div>
          )}
          {meta.options.length > 0 && <button type="button" role="menuitem" className="menu-item" onClick={() => { setOpen(false); onOptions(); }}>Card options</button>}
        </div>
      )}
    </div>
  );
}
