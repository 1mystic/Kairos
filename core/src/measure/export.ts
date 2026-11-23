/**
 * Flat, anonymous attempt table (docs/03_DATA_MODEL.md "attempt table").
 * Pure TS. No uid, no free text, no answers.
 */
export const ATTEMPT_COLUMNS = [
  'day_idx', 'topic', 'qid', 'difficulty_b', 'correct', 'time_ms', 'hint_used', 'prior_n_topic', 'days_since_last_topic',
] as const;

export interface AttemptRow {
  day_idx: number;
  topic: string;
  qid: string;
  difficulty_b: number;
  correct: 0 | 1;
  time_ms: number;
  hint_used: 0 | 1;
  prior_n_topic: number;
  days_since_last_topic: number;
}

/** one answered item, as the app or the sim knows it */
export interface RawAttempt {
  ts: number; // epoch ms
  qid: string;
  topic: string;
  b: number;
  correct: boolean;
  timeMs: number;
  hintUsed?: boolean;
  skipped?: boolean;
}

const DAY_MS = 86_400_000;

export function toAttemptRows(raw: readonly RawAttempt[], opts: { epochMs?: number } = {}): AttemptRow[] {
  const kept = raw.filter((r) => !r.skipped);
  const sorted = kept
    .map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.ts - b.r.ts || a.i - b.i)
    .map((x) => x.r);
  if (sorted.length === 0) return [];
  const epoch = opts.epochMs ?? Math.floor((sorted[0] as RawAttempt).ts / DAY_MS) * DAY_MS;
  const seen = new Map<string, { n: number; day: number }>();
  return sorted.map((r) => {
    const day = Math.floor((r.ts - epoch) / DAY_MS);
    const prev = seen.get(r.topic);
    seen.set(r.topic, { n: (prev?.n ?? 0) + 1, day });
    return {
      day_idx: day,
      topic: r.topic,
      qid: r.qid,
      difficulty_b: Math.round(r.b * 1000) / 1000,
      correct: r.correct ? 1 : 0,
      time_ms: Math.max(0, Math.round(r.timeMs)),
      hint_used: r.hintUsed ? 1 : 0,
      prior_n_topic: prev?.n ?? 0,
      days_since_last_topic: prev ? day - prev.day : -1,
    };
  });
}

function esc(s: string): string {
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function rowsToCsv(rows: readonly AttemptRow[]): string {
  const lines: string[] = [ATTEMPT_COLUMNS.join(',')];
  for (const r of rows) {
    lines.push([
      r.day_idx, esc(r.topic), esc(r.qid), r.difficulty_b, r.correct, r.time_ms, r.hint_used, r.prior_n_topic, r.days_since_last_topic,
    ].join(','));
  }
  return lines.join('\n') + '\n';
}

/** RFC-4180 record parser: returns records of fields. */
function parseRecords(csv: string): string[][] {
  const out: string[][] = [];
  let field = '';
  let rec: string[] = [];
  let inQ = false;
  let i = 0;
  while (i < csv.length) {
    const c = csv[i];
    if (inQ) {
      if (c === '"') {
        if (csv[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') {
      if (field !== '') throw new Error('csv: stray quote');
      inQ = true; i++;
    } else if (c === ',') {
      rec.push(field); field = ''; i++;
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && csv[i + 1] === '\n') i++;
      rec.push(field); field = ''; out.push(rec); rec = []; i++;
    } else {
      field += c; i++;
    }
  }
  if (inQ) throw new Error('csv: unterminated quote');
  if (field !== '' || rec.length > 0) { rec.push(field); out.push(rec); }
  return out;
}

function num(s: string, what: string): number {
  if (s.trim() === '' || !Number.isFinite(Number(s))) throw new Error(`csv: bad number in ${what}: "${s}"`);
  return Number(s);
}

function bit(s: string, what: string): 0 | 1 {
  if (s !== '0' && s !== '1') throw new Error(`csv: ${what} must be 0 or 1, got "${s}"`);
  return s === '1' ? 1 : 0;
}

export function csvToRows(csv: string): AttemptRow[] {
  const recs = parseRecords(csv);
  if (recs.length === 0 || (recs[0] as string[]).join(',') !== ATTEMPT_COLUMNS.join(',')) throw new Error('csv: bad header');
  return recs.slice(1).map((rec, i) => {
    const f = rec as string[];
    const g = (k: number): string => f[k] as string;
    if (f.length !== ATTEMPT_COLUMNS.length) throw new Error(`csv: row ${i + 1} has ${f.length} fields`);
    return {
      day_idx: num(g(0), 'day_idx'),
      topic: g(1),
      qid: g(2),
      difficulty_b: num(g(3), 'difficulty_b'),
      correct: bit(g(4), 'correct'),
      time_ms: num(g(5), 'time_ms'),
      hint_used: bit(g(6), 'hint_used'),
      prior_n_topic: num(g(7), 'prior_n_topic'),
      days_since_last_topic: num(g(8), 'days_since_last_topic'),
    };
  });
}
