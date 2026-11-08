import { defaultOptions, metaOf, REGISTRY, type OptionSpec, type OptionValue, type Size, type WidgetId } from './registry';
import { RANGE_KINDS, type RangeKind } from './range';

export const LAYOUT_KEY = 'kairos-dashboard';

export interface WidgetState { id: WidgetId; visible: boolean; size: Size; options: Record<string, OptionValue> }
export interface Layout { v: 1; range: RangeKind; widgets: WidgetState[] }

export function defaultLayout(): Layout {
  return { v: 1, range: 'daily', widgets: REGISTRY.map((m) => ({ id: m.id, visible: m.defaultVisible, size: m.defaultSize, options: defaultOptions(m) })) };
}

function cleanOption(spec: OptionSpec, v: unknown): OptionValue {
  const allowed = new Set(spec.choices.map((c) => c.value));
  if (spec.kind === 'select') return typeof v === 'string' && allowed.has(v) ? v : (spec.default as string);
  if (!Array.isArray(v)) return [...(spec.default as string[])];
  const out = [...new Set(v.filter((x): x is string => typeof x === 'string' && allowed.has(x)))].slice(0, spec.max ?? v.length);
  return out.length ? out : [...(spec.default as string[])];
}

/** Accepts anything (old, partial or corrupt JSON). Drops unknown ids and duplicates, repairs values, appends widgets that are new. */
export function normalizeLayout(input: unknown): Layout {
  const base = defaultLayout();
  if (!input || typeof input !== 'object') return base;
  const raw = input as { range?: unknown; widgets?: unknown };
  const range = RANGE_KINDS.includes(raw.range as RangeKind) ? (raw.range as RangeKind) : base.range;
  const seen = new Set<string>();
  const widgets: WidgetState[] = [];
  for (const w of Array.isArray(raw.widgets) ? raw.widgets : []) {
    const o = (w ?? {}) as Partial<WidgetState> & { options?: Record<string, unknown> };
    const meta = typeof o.id === 'string' ? metaOf(o.id) : undefined;
    if (!meta || seen.has(meta.id)) continue;
    seen.add(meta.id);
    const opts = o.options && typeof o.options === 'object' ? o.options : {};
    widgets.push({
      id: meta.id,
      visible: typeof o.visible === 'boolean' ? o.visible : meta.defaultVisible,
      size: meta.sizes.includes(o.size as Size) ? (o.size as Size) : meta.defaultSize,
      options: Object.fromEntries(meta.options.map((s) => [s.key, cleanOption(s, opts[s.key])])),
    });
  }
  for (const w of base.widgets) if (!seen.has(w.id)) widgets.push(w);
  return { v: 1, range, widgets };
}

export type PresetId = 'focus' | 'full' | 'minimal';
export const PRESETS: readonly { id: PresetId; label: string; description: string; show: readonly WidgetId[] }[] = [
  { id: 'focus', label: 'Focus', description: 'Readiness, plan and trend', show: ['plan', 'readiness', 'trend'] },
  { id: 'full', label: 'Full', description: 'Every card', show: REGISTRY.map((m) => m.id) },
  { id: 'minimal', label: 'Minimal', description: 'Readiness and today’s plan', show: ['plan', 'readiness'] },
];

/** Presets change visibility and put the shown cards first, keeping each card's size and options. */
export function applyPreset(layout: Layout, id: PresetId): Layout {
  const p = PRESETS.find((x) => x.id === id);
  if (!p) return layout;
  const order = id === 'full' ? defaultLayout().widgets.map((w) => w.id) : [...p.show, ...layout.widgets.map((w) => w.id).filter((w) => !p.show.includes(w))];
  const by = new Map(layout.widgets.map((w) => [w.id, w]));
  return { ...layout, widgets: order.map((wid) => ({ ...by.get(wid)!, visible: p.show.includes(wid) })) };
}

export function moveWidget(layout: Layout, id: WidgetId, to: number): Layout {
  const i = layout.widgets.findIndex((w) => w.id === id);
  if (i < 0) return layout;
  const t = Math.max(0, Math.min(layout.widgets.length - 1, to));
  if (t === i) return layout;
  const next = [...layout.widgets];
  const [item] = next.splice(i, 1);
  next.splice(t, 0, item!);
  return { ...layout, widgets: next };
}

export function patchWidget(layout: Layout, id: WidgetId, patch: Partial<Omit<WidgetState, 'id'>>): Layout {
  return { ...layout, widgets: layout.widgets.map((w) => (w.id === id ? { ...w, ...patch } : w)) };
}

export function loadLayout(storage: Pick<Storage, 'getItem'> | null = safeStorage()): Layout {
  try {
    const s = storage?.getItem(LAYOUT_KEY);
    return s ? normalizeLayout(JSON.parse(s)) : defaultLayout();
  } catch {
    return defaultLayout();
  }
}

export function saveLayout(layout: Layout, storage: Pick<Storage, 'setItem'> | null = safeStorage()): void {
  try {
    storage?.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* private mode / quota: the layout just will not persist */
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** Row packing for half-width cards: a half-width card left alone on its row is widened to the full row. */
export function packSpans(spans: readonly (6 | 12)[]): (6 | 12)[] {
  const out = [...spans];
  let i = 0;
  while (i < out.length) {
    if (out[i] === 12) { i++; continue; }
    if (out[i + 1] === 6) { i += 2; continue; }
    out[i] = 12;
    i++;
  }
  return out;
}
