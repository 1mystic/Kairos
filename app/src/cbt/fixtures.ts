/** Test-only helpers: load the real sample paper and answer-bearing practice shards from public/bank. */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { join } from 'node:path';
import { parseBlueprint, shardSchema, type Question } from '@kairos/core';
import { buildExamModel, type MockPaperLike } from './model';

const ROOT = join(__dirname, '../../public/bank/v1');

export function loadSampleModel(paperId = 'sample_jee_mini_v1') {
  const paper = JSON.parse(readFileSync(join(ROOT, 'mocks', `${paperId}.json`), 'utf8')) as MockPaperLike;
  const bp = parseBlueprint(JSON.parse(readFileSync(join(ROOT, 'blueprints', `${paper.blueprint}.json`), 'utf8')));
  return buildExamModel(paper, bp);
}

export function loadAnswerMap(exam: string): Map<string, Question> {
  const manifest = JSON.parse(readFileSync(join(ROOT, 'manifest.json'), 'utf8')) as { files: { kind: string; exam?: string; path: string }[] };
  const map = new Map<string, Question>();
  for (const f of manifest.files.filter((x) => x.kind === 'shard' && x.exam === exam)) {
    const raw = readFileSync(join(ROOT, f.path));
    const text = f.path.endsWith('.gz') ? gunzipSync(raw).toString('utf8') : raw.toString('utf8');
    for (const q of shardSchema.parse(JSON.parse(text))) map.set(q.id, q);
  }
  return map;
}
