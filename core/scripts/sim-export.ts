/**
 * Training data for the learned recall model (Phase C): the simulator's attempt table as one CSV.
 *   pnpm --filter @kairos/core sim:export -- --students 250 --seed 2026 --days 100 --policies random,weakest_first,planner --out ../pipeline/ml/data/sim_attempts.csv
 * Rows are ordered by (student chunk, student, policy, time). Columns: SIM_ATTEMPT_COLUMNS (core/src/sim/harness.ts).
 */
import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream, mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const args = new Map<string, string>();
const argv = process.argv.slice(2).filter((a) => a !== '--');
for (let i = 0; i < argv.length; i += 2) args.set(argv[i]!.replace(/^--/, ''), argv[i + 1]!);
const students = Number(args.get('students') ?? 250);
const seed = Number(args.get('seed') ?? 2026);
const days = Number(args.get('days') ?? 100);
const jobs = Number(args.get('jobs') ?? 4);
const chunk = Number(args.get('chunk') ?? 25);
const policies = args.get('policies') ?? 'random,weakest_first,planner';
const out = resolve(process.cwd(), args.get('out') ?? '../pipeline/ml/data/sim_attempts.csv');

const tmp = mkdtempSync(join(tmpdir(), 'kairos-export-'));
const tasks = [] as Array<{ first: number; n: number; csv: string }>;
for (let f = 0; f < students; f += chunk) tasks.push({ first: f, n: Math.min(chunk, students - f), csv: join(tmp, `a_${f}.csv`) });
let next = 0;
const runOne = (t: (typeof tasks)[number]): Promise<void> =>
  new Promise((ok, fail) => {
    const p = spawn(process.execPath, ['--import', 'tsx', join(here, 'sim-worker.ts'), '--seed', String(seed), '--first', String(t.first), '--n', String(t.n), '--days', String(days), '--policies', policies, '--out', join(tmp, `r_${t.first}.json`), '--attempts', t.csv], { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`worker ${t.first} exited ${code}`))));
  });
await Promise.all(Array.from({ length: jobs }, async () => {
  while (next < tasks.length) await runOne(tasks[next++]!);
}));
mkdirSync(dirname(out), { recursive: true });
const w = createWriteStream(out);
for (const t of tasks) {
  await new Promise<void>((ok, fail) => {
    const r = createReadStream(t.csv);
    r.on('error', fail);
    r.on('end', ok);
    r.pipe(w, { end: false });
  });
}
w.end();
console.log(`wrote ${out}`);
