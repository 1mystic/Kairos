import { describe, expect, it } from 'vitest';
import { ATTEMPT_COLUMNS, csvToRows, rowsToCsv, toAttemptRows, type RawAttempt } from './export';

const D = 86_400_000;
const T0 = Date.UTC(2026, 0, 10, 15, 30);
const mk = (o: Partial<RawAttempt> = {}): RawAttempt => ({ ts: T0, qid: 'q1', topic: 'kin', b: 0.12345, correct: true, timeMs: 1234.6, ...o });

describe('toAttemptRows', () => {
  it('empty input', () => {
    expect(toAttemptRows([])).toEqual([]);
    expect(rowsToCsv([])).toBe(ATTEMPT_COLUMNS.join(',') + '\n');
    expect(csvToRows(rowsToCsv([]))).toEqual([]);
  });
  it('rounds, clamps and maps flags', () => {
    const [r] = toAttemptRows([mk({ correct: false, hintUsed: true, timeMs: -5.2 }), ]);
    expect(r).toMatchObject({ day_idx: 0, difficulty_b: 0.123, correct: 0, hint_used: 1, time_ms: 0, prior_n_topic: 0, days_since_last_topic: -1 });
    expect(toAttemptRows([mk()])[0]?.time_ms).toBe(1235);
  });
  it('prior_n, days_since, day_idx; skipped dropped; unsorted input', () => {
    const raw = [
      mk({ ts: T0 + 3 * D, qid: 'c' }),
      mk({ ts: T0, qid: 'a' }),
      mk({ ts: T0 + D, qid: 'x', topic: 'opt', skipped: true }),
      mk({ ts: T0 + D, qid: 'b', topic: 'opt' }),
      mk({ ts: T0 + 3 * D, qid: 'd' }),
    ];
    const rows = toAttemptRows(raw);
    expect(rows.map((r) => r.qid)).toEqual(['a', 'b', 'c', 'd']);
    expect(rows.map((r) => r.day_idx)).toEqual([0, 1, 3, 3]);
    expect(rows.map((r) => r.prior_n_topic)).toEqual([0, 0, 1, 2]);
    expect(rows.map((r) => r.days_since_last_topic)).toEqual([-1, -1, 3, 0]);
  });
  it('explicit epoch and input not mutated', () => {
    const raw = [mk({ ts: T0 + D }), mk({ ts: T0 })];
    const copy = [...raw];
    const rows = toAttemptRows(raw, { epochMs: T0 - 2 * D });
    expect(rows.map((r) => r.day_idx)).toEqual([2, 3]);
    expect(raw).toEqual(copy);
  });
  it('stable for equal ts', () => {
    expect(toAttemptRows([mk({ qid: 'a' }), mk({ qid: 'b' })]).map((r) => r.qid)).toEqual(['a', 'b']);
  });
});

describe('csv', () => {
  const rows = toAttemptRows([
    mk({ qid: 'q,1', topic: 'say "hi"' }),
    mk({ ts: T0 + D, qid: 'line\nbreak', topic: 'say "hi"', correct: false }),
    mk({ ts: T0 + 2 * D, qid: 'plain', topic: 'cr\rx' }),
  ]);
  it('round-trips with escaping', () => {
    const csv = rowsToCsv(rows);
    expect(csv.split('\n')[0]).toBe(ATTEMPT_COLUMNS.join(','));
    expect(csv).toContain('"q,1"');
    expect(csv).toContain('"say ""hi"""');
    expect(csvToRows(csv)).toEqual(rows);
  });
  it('accepts CRLF and missing trailing newline', () => {
    const csv = rowsToCsv(rows.slice(2)).replace(/\n/g, '\r\n').trimEnd();
    expect(csvToRows(csv)).toEqual(rows.slice(2));
    const plain = 'day_idx,topic,qid,difficulty_b,correct,time_ms,hint_used,prior_n_topic,days_since_last_topic\r\n0,t,q,0.5,1,10,0,0,-1\r\n';
    expect(csvToRows(plain)).toHaveLength(1);
  });
  const H = ATTEMPT_COLUMNS.join(',');
  it('rejects malformed input', () => {
    expect(() => csvToRows('')).toThrow(/header/);
    expect(() => csvToRows('a,b\n1,2')).toThrow(/header/);
    expect(() => csvToRows(`${H}\n0,t,q`)).toThrow(/fields/);
    expect(() => csvToRows(`${H}\n0,t,q,x,1,1,0,0,-1`)).toThrow(/number/);
    expect(() => csvToRows(`${H}\n0,t,q,,1,1,0,0,-1`)).toThrow(/number/);
    expect(() => csvToRows(`${H}\n0,t,q,0.5,2,1,0,0,-1`)).toThrow(/0 or 1/);
    expect(() => csvToRows(`${H}\n0,"t,q,0.5,1,1,0,0,-1`)).toThrow(/unterminated/);
    expect(() => csvToRows(`${H}\n0,a"b,q,0.5,1,1,0,0,-1`)).toThrow(/stray/);
  });
});
