import { describe, expect, it } from 'vitest';
import { createMemoryBuffer, isResumable, type BufferedSession } from './buffer';
import { SessionRecorder, isMarked, lastAnswer } from './recorder';

describe('recorder + buffer resume', () => {
  it('records docs/03 events and continues the clock after a resume', () => {
    let now = 1000;
    const clock = () => now;
    const r = new SessionRecorder(clock);
    r.visit('q1');
    now += 5000;
    r.select('q1', 'A');
    now += 1000;
    r.save('q1', 'A');
    r.submit('q1');
    r.mark('q1');
    expect(r.events.map((e) => [e.t, e.a, e.v, e.ctx])).toEqual([
      [0, 'visit', undefined, 'practice'], [5000, 'select', 'A', 'practice'], [6000, 'save', 'A', 'practice'],
      [6000, 'submit', undefined, 'practice'], [6000, 'mark', undefined, 'practice'],
    ]);
    // crash, one hour later: clock jumps, t does not
    now += 3_600_000;
    const resumed = new SessionRecorder(clock, r.events);
    resumed.visit('q2');
    expect(resumed.events.at(-1)!.t).toBe(6000);
    expect(lastAnswer(resumed.events, 'q1')).toBe('A');
    expect(isMarked(resumed.events, 'q1')).toBe(true);
  });

  it('buffers via an injected store and restores the same session', async () => {
    const buf = createMemoryBuffer();
    const events = new SessionRecorder(() => 0).events;
    const s: BufferedSession = {
      id: 's1', startedAt: 1, exam: 'JEE_MAIN', chapter: 'PHY.LOM', chapters: ['PHY.LOM'], mode: 'relaxed',
      size: 10, seed: 3, qids: ['a', 'b'], index: 1, events, reasons: { a: 'silly' }, checked: ['a'], updatedAt: 100,
    };
    await buf.save(s);
    const back = await buf.load();
    expect(back).toEqual(s);
    expect(isResumable(back, 200)).toBe(true);
    expect(isResumable(back, 100 + 13 * 3600_000)).toBe(false);
    await buf.clear();
    expect(await buf.load()).toBeNull();
  });
});
