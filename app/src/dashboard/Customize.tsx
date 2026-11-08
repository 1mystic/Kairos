import { useEffect, useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { Button, CardGrid, IconButton, Select } from '../components/ui';
import { CloseIcon2, ChevronDownIcon2, ChevronUpIcon, GripIcon } from './icons';
import { applyPreset, moveWidget, patchWidget, PRESETS, type Layout, type WidgetState } from './layout';
import { metaOf, SIZE_LABEL, type OptionSpec, type OptionValue, type WidgetId, type WidgetMeta } from './registry';

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Index a pointer at `y` would drop onto, given the rows' rectangles (top-to-bottom). Pure, for drag reorder. */
export function indexAtY(rects: readonly { top: number; height: number }[], y: number): number {
  for (let i = 0; i < rects.length; i++) if (y < rects[i]!.top + rects[i]!.height / 2) return i;
  return Math.max(0, rects.length - 1);
}

function Switch({ checked, label, onChange }: { checked: boolean; label: string; onChange(v: boolean): void }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className="grid min-h-11 min-w-11 shrink-0 place-items-center">
      <span className={`flex h-s5 w-s7 items-center rounded-pill px-s1 transition-colors ${checked ? 'justify-end bg-primary' : 'justify-start bg-surface-3'}`}>
        <span className={`size-s4 rounded-pill ${checked ? 'bg-surface' : 'bg-slate'}`} />
      </span>
    </button>
  );
}

function OptionControl({ spec, value, onChange }: { spec: OptionSpec; value: OptionValue; onChange(v: OptionValue): void }) {
  const id = useId();
  if (spec.kind === 'select') {
    return (
      <div className="stack gap-s1">
        <label htmlFor={id} className="text-small font-semibold">{spec.label}</label>
        <Select id={id} value={value as string} onChange={(e) => onChange(e.target.value)}>{spec.choices.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</Select>
      </div>
    );
  }
  const sel = value as string[];
  return (
    <fieldset className="stack gap-s1">
      <legend className="text-small font-semibold">{spec.label}</legend>
      <CardGrid cols={2} gap="tight">
        {spec.choices.map((c) => {
          const on = sel.includes(c.value);
          const full = !on && sel.length >= (spec.max ?? Infinity);
          return (
            <label key={c.value} className={`check-row ${full ? 'text-slate' : ''}`}>
              <input type="checkbox" checked={on} disabled={full || (on && sel.length === 1)} onChange={() => onChange(on ? sel.filter((x) => x !== c.value) : [...sel, c.value])} />
              {c.label}
            </label>
          );
        })}
      </CardGrid>
    </fieldset>
  );
}

/** Customise: side panel from 1024px, bottom sheet below. Focus is trapped, Esc closes, reorder works by buttons (announced) or drag. */
export function Customize({ layout, onChange, onReset, onClose, focusId }: { layout: Layout; onChange(l: Layout): void; onReset(): void; onClose(): void; focusId?: WidgetId | null }) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const rows = useRef(new Map<string, HTMLLIElement>());
  const [say, setSay] = useState('');
  const [drag, setDrag] = useState<{ id: WidgetId; over: number } | null>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const target = focusId ? rows.current.get(focusId)?.querySelector<HTMLElement>('select,input,button[role=switch]') : null;
    (target ?? panel.current?.querySelector<HTMLElement>(FOCUSABLE) ?? panel.current)?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = overflow; prev?.focus?.(); };
  }, [focusId]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onClose(); return; }
    if (e.key !== 'Tab' || !panel.current) return;
    const items = [...panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = items[0]; const last = items[items.length - 1];
    if (!first || !last) return;
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const move = (id: WidgetId, to: number) => {
    const next = moveWidget(layout, id, to);
    if (next === layout) return;
    onChange(next);
    const pos = next.widgets.findIndex((w) => w.id === id) + 1;
    setSay(`Moved ${metaOf(id)?.title} to position ${pos} of ${next.widgets.length}`);
    // keep focus on the button that was used (the row re-renders in a new place)
    requestAnimationFrame(() => rows.current.get(id)?.querySelector<HTMLElement>('[data-move]')?.focus());
  };

  const dragStart = (e: PointerEvent, id: WidgetId) => { e.currentTarget.setPointerCapture?.(e.pointerId); setDrag({ id, over: layout.widgets.findIndex((w) => w.id === id) }); };
  const dragMove = (e: PointerEvent) => {
    if (!drag) return;
    const rects = layout.widgets.map((w) => rows.current.get(w.id)?.getBoundingClientRect() ?? { top: 0, height: 0 });
    setDrag({ ...drag, over: indexAtY(rects, e.clientY) });
  };
  const dragEnd = () => { if (drag) move(drag.id, drag.over); setDrag(null); };

  const row = (w: WidgetState, i: number) => {
    const meta = metaOf(w.id) as WidgetMeta;
    return (
      <li key={w.id} ref={(el) => { if (el) rows.current.set(w.id, el); else rows.current.delete(w.id); }} aria-label={meta.title} className={`stack gap-s3 rounded-btn p-s3 ${drag?.id === w.id ? 'drow-drag' : 'bg-surface-2'}`}>
        <div className="flex items-center gap-s2">
          <span
            role="presentation" onPointerDown={(e) => dragStart(e, w.id)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={() => setDrag(null)}
            className="grid min-h-11 min-w-11 shrink-0 cursor-grab touch-none place-items-center rounded-btn text-slate" title="Drag to reorder"
          ><GripIcon /></span>
          <div className="stack min-w-0 flex-1 gap-s1"><span className="text-body font-semibold">{meta.title}</span><span className="text-caption text-slate">{meta.description}</span></div>
          <IconButton data-move label={`Move ${meta.title} up`} variant="ghost" disabled={i === 0} onClick={() => move(w.id, i - 1)}><ChevronUpIcon /></IconButton>
          <IconButton data-move label={`Move ${meta.title} down`} variant="ghost" disabled={i === layout.widgets.length - 1} onClick={() => move(w.id, i + 1)}><ChevronDownIcon2 /></IconButton>
          <Switch checked={w.visible} label={`Show ${meta.title}`} onChange={(v) => onChange(patchWidget(layout, w.id, { visible: v }))} />
        </div>
        {(meta.sizes.length > 1 || meta.options.length > 0) && (
          <div className="stack gap-s3 pl-s2">
            {meta.sizes.length > 1 && (
              <div role="radiogroup" aria-label={`${meta.title} size`} className="row gap-s2">
                <span className="text-small font-semibold">Size</span>
                {meta.sizes.map((s) => (
                  <button key={s} type="button" role="radio" aria-checked={w.size === s} aria-label={`${SIZE_LABEL[s]} ${meta.title}`} onClick={() => onChange(patchWidget(layout, w.id, { size: s }))} className="pill-btn">{s.toUpperCase()}</button>
                ))}
              </div>
            )}
            {meta.options.map((o) => (
              <OptionControl key={o.key} spec={o} value={w.options[o.key] ?? o.default} onChange={(v) => onChange(patchWidget(layout, w.id, { options: { ...w.options, [o.key]: v } }))} />
            ))}
          </div>
        )}
      </li>
    );
  };

  return (
    <div className="dpanel-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="dpanel stack-grid" onKeyDown={onKey}>
        <div className="flex items-start justify-between gap-s3">
          <h2 id={titleId} className="text-h2">Customise dashboard</h2>
          <IconButton label="Close customise" variant="ghost" onClick={onClose}><CloseIcon2 /></IconButton>
        </div>
        <div className="stack gap-s3">
          <p className="text-small font-semibold">Presets</p>
          <div className="row-inline">
            {PRESETS.map((p) => <Button key={p.id} size="sm" variant="secondary" onClick={() => { onChange(applyPreset(layout, p.id)); setSay(`${p.label} layout applied`); }}>{p.label}</Button>)}
            <Button size="sm" variant="ghost" onClick={() => { onReset(); setSay('Layout reset to default'); }}>Reset to default</Button>
          </div>
          <p className="text-caption text-slate">Focus: readiness, plan, trend. Minimal: readiness and today&rsquo;s plan. Full: every card.</p>
        </div>
        <ul className="stack gap-s2" aria-label="Cards">{layout.widgets.map(row)}</ul>
        <p role="status" aria-live="polite" className="sr-only">{say}</p>
      </div>
    </div>
  );
}
