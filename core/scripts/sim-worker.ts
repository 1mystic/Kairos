/**
 * One chunk of a simulation study: `tsx scripts/sim-worker.ts --seed S --first F --n N --days D --policies a,b --out f.json [--attempts f.csv]`.
 * World and students both depend on the seed. Writes a SimResult JSON (and optionally the attempt table CSV).
 */
import { createWriteStream, writeFileSync } from 'node:fs';
import { makeWorld, runSim, SIM_ATTEMPT_COLUMNS, type SimAttemptRow } from '../src/sim';
import { policyByName } from './policies';

const args = new Map<string, string>();
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 2) args.set(argv[i]!.replace(/^--/, ''), argv[i + 1]!);
const seed = Number(args.get('seed') ?? 1);
const first = Number(args.get('first') ?? 0);
const n = Number(args.get('n') ?? 10);
const days = Number(args.get('days') ?? 100);
const policies = (args.get('policies') ?? 'random,planner').split(',').map(policyByName);
const out = args.get('out')!;
const attemptsPath = args.get('attempts');

const csv = attemptsPath ? createWriteStream(attemptsPath) : undefined;
const fmt = (v: unknown): string => (typeof v === 'number' && !Number.isInteger(v) ? String(Math.round(v * 1e6) / 1e6) : String(v));
let buf: string[] = [];
const onAttempt = csv
  ? (r: SimAttemptRow): void => {
      buf.push(SIM_ATTEMPT_COLUMNS.map((c) => fmt(r[c])).join(','));
      if (buf.length >= 5000) {
        csv.write(buf.join('\n') + '\n');
        buf = [];
      }
    }
  : undefined;
if (csv && first === 0) csv.write(SIM_ATTEMPT_COLUMNS.join(',') + '\n');
const res = runSim({ students: n, firstStudent: first, days, seed, world: makeWorld({ seed }), policies, ...(onAttempt ? { onAttempt } : {}) });
writeFileSync(out, JSON.stringify(res));
if (csv) {
  if (buf.length) csv.write(buf.join('\n') + '\n');
  csv.end();
}
