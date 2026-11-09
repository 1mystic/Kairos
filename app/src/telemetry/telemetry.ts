import { addCounts, isEmpty, localDay, normalize, shouldFlush, takeBatch, type Counts, type FlushReason } from './logic';

export const TELEMETRY_KEY = 'kairos-telemetry-v1';

/** The only Firestore surface telemetry touches (tests inject a fake). */
export interface StatsAdapter {
  /** does stats/{day}/seen/{uid} exist? (a signed-in user may read their own marker) */
  hasSeen(day: string, uid: string): Promise<boolean>;
  /** ONE batch: stats/{day} active +1 AND the seen marker. Kept apart from the other counters. */
  addActive(day: string, uid: string): Promise<void>;
  /** stats/{day} merge with increment() per counter */
  addCounts(day: string, counts: Counts): Promise<void>;
}

interface Saved {
  uid: string | null;
  pending: Record<string, Counts>;
  lastFlushDay: string | null;
  activeDay: string | null;
}
const fresh = (): Saved => ({ uid: null, pending: {}, lastFlushDay: null, activeDay: null });

export interface TelemetryDeps {
  adapter: StatsAdapter;
  storage: Pick<Storage, 'getItem' | 'setItem'> | null;
  now(): Date;
  /** null for guests / signed out */
  getUid(): string | null;
  isOnline(): boolean;
}

export class Telemetry {
  private s: Saved;
  private running: Promise<void> | null = null;
  constructor(private d: TelemetryDeps) {
    this.s = this.load();
  }

  private load(): Saved {
    try {
      const raw = this.d.storage?.getItem(TELEMETRY_KEY);
      if (raw) {
        const p = JSON.parse(raw) as Partial<Saved>;
        const pending: Record<string, Counts> = {};
        for (const [day, c] of Object.entries(p.pending ?? {})) {
          const n = normalize(c as Record<string, unknown>);
          if (!isEmpty(n)) pending[day] = n;
        }
        return { uid: p.uid ?? null, pending, lastFlushDay: p.lastFlushDay ?? null, activeDay: p.activeDay ?? null };
      }
    } catch {
      /* corrupt: start over */
    }
    return fresh();
  }
  private save(): void {
    try {
      this.d.storage?.setItem(TELEMETRY_KEY, JSON.stringify(this.s));
    } catch {
      /* private mode */
    }
  }

  /** Accumulate in memory + storage. Guests (no uid) are skipped entirely. Returns false when ignored. */
  bump(partial: Counts): boolean {
    if (!this.d.getUid()) return false;
    const add = normalize(partial);
    if (isEmpty(add)) return false;
    const day = localDay(this.d.now());
    this.s.pending[day] = addCounts(this.s.pending[day] ?? {}, add);
    this.save();
    return true;
  }

  pending(): Record<string, Counts> {
    return JSON.parse(JSON.stringify(this.s.pending)) as Record<string, Counts>;
  }
  hasPending(): boolean {
    return Object.keys(this.s.pending).length > 0;
  }

  flush(reason: FlushReason = 'timer'): Promise<void> {
    if (this.running) return this.running;
    this.running = this.run(reason).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async run(reason: FlushReason): Promise<void> {
    const uid = this.d.getUid();
    const today = localDay(this.d.now());
    if (uid && this.s.uid !== uid) {
      // a different account on this device: its daily bookkeeping starts fresh (pending totals are anonymous)
      this.s = { ...this.s, uid, lastFlushDay: null, activeDay: null };
    }
    const go = shouldFlush({ uid, online: this.d.isOnline(), hasPending: this.hasPending(), needsActive: this.s.activeDay !== today, lastFlushDay: this.s.lastFlushDay, today, reason });
    if (!go || !uid) return;
    let touched = false;

    if (this.s.activeDay !== today) {
      try {
        if (!(await this.d.adapter.hasSeen(today, uid))) await this.d.adapter.addActive(today, uid);
        this.s.activeDay = today;
        touched = true;
      } catch {
        /* offline or denied: try again next flush; other counters still go out */
      }
    }

    for (const day of Object.keys(this.s.pending).sort()) {
      const { send, rest } = takeBatch(this.s.pending[day] ?? {});
      if (isEmpty(send)) {
        delete this.s.pending[day];
        continue;
      }
      try {
        await this.d.adapter.addCounts(day, send);
      } catch {
        break; // keep everything pending, retry later
      }
      if (isEmpty(rest)) delete this.s.pending[day];
      else this.s.pending[day] = rest;
      touched = true;
    }
    if (touched) this.s.lastFlushDay = today;
    this.save();
  }
}
