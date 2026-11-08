import { beforeEach, describe, expect, it } from 'vitest';
import { applyPreset, defaultLayout, LAYOUT_KEY, loadLayout, moveWidget, normalizeLayout, packSpans, patchWidget, saveLayout } from './layout';
import { WIDGET_IDS } from './registry';

class Mem { m = new Map<string, string>(); getItem(k: string) { return this.m.get(k) ?? null; } setItem(k: string, v: string) { this.m.set(k, v); } }

describe('layout', () => {
  it('default has every widget once, v1, daily, seven visible', () => {
    const l = defaultLayout();
    expect(l.v).toBe(1);
    expect(l.range).toBe('daily');
    expect(l.widgets.map((w) => w.id).sort()).toEqual([...WIDGET_IDS].sort());
    expect(l.widgets.filter((w) => w.visible).map((w) => w.id)).toEqual(['plan', 'readiness', 'stats', 'trend', 'chapters', 'activity', 'tip']);
  });
  it('normalise drops unknown ids, repairs bad values, appends new widgets', () => {
    const l = normalizeLayout({ v: 1, range: 'week', widgets: [
      { id: 'nope', visible: true, size: 'm', options: {} },
      { id: 'trend', visible: false, size: 'xl', options: { metric: 'bogus' } },
      { id: 'trend', visible: true, size: 's', options: {} },
      { id: 'stats', visible: true, size: 'm', options: { tiles: ['questions', 'x', 'accuracy', 'time', 'streak', 'mocks'] } },
    ] });
    expect(l.range).toBe('week');
    expect(l.widgets.map((w) => w.id).slice(0, 2)).toEqual(['trend', 'stats']);
    expect(l.widgets).toHaveLength(WIDGET_IDS.length);
    expect(l.widgets[0]).toMatchObject({ visible: false, size: 'l', options: { metric: 'questions' } });
    expect(l.widgets[1]!.options.tiles).toEqual(['questions', 'accuracy', 'time', 'streak']);
  });
  it('normalise survives garbage', () => {
    for (const bad of [null, 5, 'x', [], { widgets: 'no' }, { range: 'year' }]) expect(normalizeLayout(bad).widgets).toHaveLength(WIDGET_IDS.length);
    expect(normalizeLayout({ range: 'year' }).range).toBe('daily');
  });
  it('presets', () => {
    const f = applyPreset(defaultLayout(), 'focus');
    expect(f.widgets.filter((w) => w.visible).map((w) => w.id)).toEqual(['plan', 'readiness', 'trend']);
    const m = applyPreset(defaultLayout(), 'minimal');
    expect(m.widgets.filter((w) => w.visible).map((w) => w.id)).toEqual(['plan', 'readiness']);
    expect(applyPreset(f, 'full').widgets.every((w) => w.visible)).toBe(true);
    expect(f.widgets).toHaveLength(WIDGET_IDS.length);
  });
  it('move and patch', () => {
    const l = moveWidget(defaultLayout(), 'tip', 0);
    expect(l.widgets[0]!.id).toBe('tip');
    expect(moveWidget(l, 'tip', -5)).toBe(l);
    expect(moveWidget(l, 'plan', 999).widgets.at(-1)!.id).toBe('plan');
    expect(patchWidget(l, 'tip', { size: 'm' }).widgets[0]!.size).toBe('m');
  });
  describe('persistence', () => {
    let mem: Mem;
    beforeEach(() => { mem = new Mem(); });
    it('round-trips under kairos-dashboard', () => {
      const l = patchWidget(defaultLayout(), 'trend', { visible: false });
      saveLayout(l, mem);
      expect(mem.m.has('kairos-dashboard')).toBe(true);
      expect(LAYOUT_KEY).toBe('kairos-dashboard');
      expect(loadLayout(mem)).toEqual(l);
    });
    it('falls back to default on corrupt JSON or throwing storage', () => {
      mem.setItem(LAYOUT_KEY, '{oops');
      expect(loadLayout(mem)).toEqual(defaultLayout());
      const bad = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('full'); } };
      expect(loadLayout(bad)).toEqual(defaultLayout());
      expect(() => saveLayout(defaultLayout(), bad)).not.toThrow();
    });
  });
  it('packSpans widens a lone half-width card', () => {
    expect(packSpans([6, 6, 12, 6])).toEqual([6, 6, 12, 12]);
    expect(packSpans([6, 12, 6, 6])).toEqual([12, 12, 6, 6]);
    expect(packSpans([6])).toEqual([12]);
  });
});
