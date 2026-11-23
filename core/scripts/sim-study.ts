/**
 * Reproducible policy study. Example (Phase A baselines):
 *   pnpm --filter @kairos/core sim:study -- --students 1000 --seeds 1,2,3,4,5 --days 100 --jobs 4 --out ../docs/results/sim_baselines.json
 * Runs every (seed, chunk) in a child process, merges, and writes mean + 95% stratified bootstrap CI per policy and
 * paired differences vs each `--baselines` policy.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeResults, summarizeStudy, type SimResult } from '../src/sim';

const here = dirname(fileURLToPath(import.meta.url));
const args = new Map<string, string>();
const argv = process.argv.slice(2).filter((a) => a !== '--');
for (let i = 0; i < argv.length; i += 2) args.set(argv[i]!.replace(/^--/, ''), argv[i + 1]!);
const students = Number(args.get('students') ?? 1000);
const seeds = (args.get('seeds') ?? '1,2,3,4,5').split(',').map(Number);
const days = Number(args.get('days') ?? 100);
const jobs = Number(args.get('jobs') ?? 4);
const chunk = Number(args.get('chunk') ?? 100);
const policies = args.get('policies') ?? 'random,fixed_round_robin,difficulty_only,weakest_first,chapter_order,planner';
const baselines = (args.get('baselines') ?? 'random').split(',');
const out = resolve(process.cwd(), args.get('out') ?? '../docs/results/sim_study.json');
const B = Number(args.get('boot') ?? 2000);

const tmp = mkdtempSync(join(tmpdir(), 'kairos-sim-'));
const tasks: Array<{ seed: number; first: number; n: number; file: string }> = [];
for (const seed of seeds) for (let f = 0; f < students; f += chunk) tasks.push({ seed, first: f, n: Math.min(chunk, students - f), file: join(tmp, `s${seed}_${f}.json`) });

const t0 = Date.now();
let next = 0;
let done = 0;
const runOne = (t: (typeof tasks)[number]): Promise<void> =>
  new Promise((ok, fail) => {
    const p = spawn(process.execPath, ['--import', 'tsx', join(here, 'sim-worker.ts'), '--seed', String(t.seed), '--first', String(t.first), '--n', String(t.n), '--days', String(days), '--policies', policies, '--out', t.file], { stdio: 'inherit' });
    p.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`worker ${t.seed}/${t.first} exited ${code}`))));
  });
async function lane(): Promise<void> {
  while (next < tasks.length) {
    const t = tasks[next++]!;
    await runOne(t);
    done++;
    process.stderr.write(`\r${done}/${tasks.length} chunks, ${Math.round((Date.now() - t0) / 1000)}s`);
  }
}
await Promise.all(Array.from({ length: jobs }, lane));
process.stderr.write('\n');

const bySeed = seeds.map((seed) => ({
  seed,
  result: mergeResults(tasks.filter((t) => t.seed === seed).sort((a, b) => a.first - b.first).map((t) => JSON.parse(readFileSync(t.file, 'utf8')) as SimResult)),
}));
const summary = summarizeStudy(bySeed, baselines, B);
const report = {
  generated: new Date().toISOString().slice(0, 10),
  command: `pnpm --filter @kairos/core sim:study -- ${process.argv.slice(2).filter((a) => a !== '--').join(' ')}`,
  config: { students, seeds, days, policies: policies.split(','), baselines, bootstrap: B, worldSeed: 'same as seed', schedule: 'weekday 180 min, Saturday 240, Sunday off', metrics: { gain: 'exam-day predicted score gain (marks, true ability)', retention: 'exam-weighted mean memory retention at exam day over practised topics', wastedMin: 'practice minutes on items with true P>0.9 or <0.2', aumc: 'mean over days of (expected score - start)', practiceMin: 'practice minutes done' } },
  runtimeSec: Math.round((Date.now() - t0) / 1000),
  ...summary,
};
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(report, null, 2) + '\n');
console.log(`wrote ${out}`);
