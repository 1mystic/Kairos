// @vitest-environment node
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BankError,
  configureBank,
  createMemoryCache,
  getLatestVersion,
  getManifest,
  getMockPaper,
  getQuestionsByIds,
  getShard,
  sha256Hex,
} from './client';
import { deriveImgBase, imageUrl } from './config';

const sha = (b: Uint8Array | Buffer) => sha256Hex(b);
const q = (id: string, extra: object = {}) => ({
  id,
  type: 'SCQ',
  stem: `stem $x$ ${id}`,
  options: ['A', 'B'].map((key) => ({ key, text: key })),
  answer: { keys: ['A'] },
  tax: { subject: 'PHY', chapter: 'PHY.ROT' },
  ...extra,
});

interface Served {
  [path: string]: Uint8Array | string;
}
let served: Served;
let hits: string[];

async function makeBank() {
  const s1 = gzipSync(JSON.stringify([q('q_a'), q('q_b')]));
  const s2 = gzipSync(JSON.stringify([q('q_c')]));
  const mock = JSON.stringify({
    paperId: 'p1',
    blueprint: 'bp',
    title: 'T',
    slots: ['q_a'],
    questions: [q('q_a')],
  });
  const files = [
    { path: 'JEE/PHY/PHY.ROT.json.gz', sha256: await sha(s1), bytes: s1.length, kind: 'shard', exam: 'JEE', subject: 'PHY', chapter: 'PHY.ROT', count: 2 },
    { path: 'JEE/PHY/PHY.MOT.json.gz', sha256: await sha(s2), bytes: s2.length, kind: 'shard', exam: 'JEE', subject: 'PHY', chapter: 'PHY.MOT', count: 1 },
    { path: 'mocks/p1.json', sha256: await sha(Buffer.from(mock)), bytes: mock.length, kind: 'mock', paperId: 'p1' },
  ];
  served = {
    '/bank/latest.json': '{"version":3}',
    '/bank/v3/manifest.json': JSON.stringify({ version: 3, schema: 1, files }),
    '/bank/v3/JEE/PHY/PHY.ROT.json.gz': s1,
    '/bank/v3/JEE/PHY/PHY.MOT.json.gz': s2,
    '/bank/v3/mocks/p1.json': mock,
  };
}

beforeEach(async () => {
  hits = [];
  await makeBank();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      hits.push(url);
      const body = served[url];
      if (body === undefined) return new Response('nope', { status: 404 });
      return new Response(body as BodyInit);
    }),
  );
  configureBank({ cache: createMemoryCache(), base: '/bank' });
});

describe('bank client', () => {
  it('reads latest version network-first (no-store)', async () => {
    expect(await getLatestVersion()).toBe(3);
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]).toMatchObject({ cache: 'no-store' });
  });

  it('falls back to the last seen version offline, else throws', async () => {
    await getLatestVersion();
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('offline'));
    expect(await getLatestVersion()).toBe(3);
    configureBank({ cache: createMemoryCache() });
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('offline'));
    await expect(getLatestVersion()).rejects.toMatchObject({ code: 'network' });
  });

  it('loads and gunzips a shard, validates, and serves repeats from cache', async () => {
    const qs = await getShard(3, 'JEE', 'PHY', 'PHY.ROT');
    expect(qs.map((x) => x.id)).toEqual(['q_a', 'q_b']);
    const n = hits.length;
    expect(await getShard(3, 'JEE', 'PHY', 'PHY.ROT')).toHaveLength(2);
    expect(hits.length).toBe(n);
  });

  it('accepts an already-decompressed response (no gzip magic)', async () => {
    served['/bank/v3/JEE/PHY/PHY.ROT.json.gz'] = JSON.stringify([q('q_a')]);
    expect(await getShard(3, 'JEE', 'PHY', 'PHY.ROT')).toHaveLength(1);
  });

  it('throws on sha256 mismatch', async () => {
    served['/bank/v3/JEE/PHY/PHY.ROT.json.gz'] = gzipSync(JSON.stringify([q('q_evil')]));
    await expect(getShard(3, 'JEE', 'PHY', 'PHY.ROT')).rejects.toMatchObject({
      name: 'BankError',
      code: 'sha256',
    });
  });

  it('throws schema / http / missing errors', async () => {
    const bad = gzipSync(JSON.stringify([{ id: 'q_x', type: 'SCQ' }]));
    const m = JSON.parse(served['/bank/v3/manifest.json'] as string);
    m.files[0].sha256 = await sha(bad);
    served['/bank/v3/manifest.json'] = JSON.stringify(m);
    served['/bank/v3/JEE/PHY/PHY.ROT.json.gz'] = bad;
    await expect(getShard(3, 'JEE', 'PHY', 'PHY.ROT')).rejects.toMatchObject({ code: 'schema' });
    await expect(getShard(3, 'JEE', 'PHY', 'NOPE')).rejects.toMatchObject({ code: 'missing' });
    delete served['/bank/v3/JEE/PHY/PHY.MOT.json.gz'];
    await expect(getShard(3, 'JEE', 'PHY', 'PHY.MOT')).rejects.toMatchObject({ code: 'http' });
    await expect(getManifest(9)).rejects.toBeInstanceOf(BankError);
  });

  it('rejects images that violate the schema (declared/used mismatch)', async () => {
    const s = gzipSync(JSON.stringify([q('q_i', { stem: '![d](img:0123456789abcdef)' })]));
    const m = JSON.parse(served['/bank/v3/manifest.json'] as string);
    m.files[0].sha256 = await sha(s);
    served['/bank/v3/manifest.json'] = JSON.stringify(m);
    served['/bank/v3/JEE/PHY/PHY.ROT.json.gz'] = s;
    await expect(getShard(3, 'JEE', 'PHY', 'PHY.ROT')).rejects.toMatchObject({ code: 'schema' });
  });

  it('loads a mock paper with answers stripped', async () => {
    const p = await getMockPaper(3, 'p1');
    expect(p.slots).toEqual(['q_a']);
    expect(p.questions[0]).not.toHaveProperty('answer');
    await expect(getMockPaper(3, 'zz')).rejects.toMatchObject({ code: 'missing' });
  });

  it('getQuestionsByIds indexes all exam shards, keeps order, skips unknown', async () => {
    const r = await getQuestionsByIds(3, 'JEE', ['q_c', 'q_zz', 'q_a']);
    expect(r.map((x) => x.id)).toEqual(['q_c', 'q_a']);
  });

  it('getQuestionsByIds uses manifest.qindex to load only needed shards', async () => {
    const m = JSON.parse(served['/bank/v3/manifest.json'] as string);
    m.qindex = { q_a: 'PHY.ROT', q_c: 'PHY.MOT' };
    served['/bank/v3/manifest.json'] = JSON.stringify(m);
    configureBank({ cache: createMemoryCache() });
    const r = await getQuestionsByIds(3, 'JEE', ['q_a']);
    expect(r.map((x) => x.id)).toEqual(['q_a']);
    expect(hits.some((u) => u.includes('PHY.MOT'))).toBe(false);
  });

  it('purges old versions when latest changes', async () => {
    const cache = createMemoryCache();
    configureBank({ cache });
    await cache.put('2:old', 2, {});
    await cache.setLatest(2);
    await getLatestVersion();
    expect(cache.entries.has('2:old')).toBe(false);
  });

  it('works end to end against the real published bank', async () => {
    const root = new URL('../../public/bank/', import.meta.url);
    const read = (p: string) => readFileSync(new URL(p, root) as unknown as string) as unknown as Uint8Array;
    vi.stubGlobal('fetch', async (url: string) => {
      const rel = url.replace(/^\/bank\//, '');
      return new Response(read(rel) as BodyInit);
    });
    configureBank({ cache: createMemoryCache() });
    const v = await getLatestVersion();
    const m = await getManifest(v);
    const shards = m.files.filter((f) => f.kind === 'shard');
    expect(shards.length).toBeGreaterThan(0);
    let n = 0;
    for (const f of shards) n += (await getShard(v, f.exam!, f.subject!, f.chapter!)).length;
    expect(n).toBe(m.totals!.questions! as number > 0 ? n : 0);
    const mock = m.files.find((f) => f.kind === 'mock')!;
    expect((await getMockPaper(v, mock.paperId!)).questions.length).toBe(mock.count);
  });
});

describe('config', () => {
  it('derives the sibling img base', () => {
    expect(deriveImgBase('/bank')).toBe('/img');
    expect(deriveImgBase('https://cdn.x/p/bank/')).toBe('https://cdn.x/p/img');
    expect(imageUrl('abc', 480, '/img')).toBe('/img/abc.w480.webp');
  });
});
