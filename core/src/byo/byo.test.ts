import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  bboxToPixels,
  checkDocSize,
  checkImageB64,
  checkQuota,
  clampBbox,
  convertUpload,
  docSizeBytes,
  extractJsonBlocks,
  findHtml,
  imageRefFromBlobMeta,
  lineCol,
  mergeBlocks,
  nextImageName,
  normalizeOptionKey,
  parseUpload,
  placeholderKs,
  questionId,
  resolveFigure,
  setChapter,
  sha256Hex,
  subjectOfChapter,
  utf8Bytes,
  validateUserQuestion,
  MAX_IMAGES,
  MAX_NEW_PER_DAY,
  MAX_QUESTIONS,
  type Issue,
  type IssueCode,
  type ParsedUpload,
  type UserQuestion,
} from './index';

const CH = ['PHY.ROT', 'PHY.KIN1D', 'CHE.MOLE', 'MAT.FUN'];
const NOW = 1_700_000_000_000;
const opts = { exam: 'JEE_MAIN', chapterIds: CH, now: NOW };

const baseQ = (over: Record<string, unknown> = {}) => ({
  n: 1,
  type: 'SCQ',
  passage_id: null,
  stem: 'Moment of inertia of a disc about its rim is $\\tfrac32 MR^2$ for which axis?',
  options: [
    { key: 'A', text: 'one' },
    { key: 'B', text: 'two' },
    { key: 'C', text: 'three' },
    { key: 'D', text: 'four' },
  ],
  answer: { keys: ['B'] },
  solution: null,
  chapter: 'PHY.ROT',
  figures: [],
  confidence: 'high',
  note: null,
  ...over,
});
const upload = (qs: unknown[], extra: Record<string, unknown> = {}) => ({
  prompt_version: 2,
  meta: { title: 'T', language: 'en', source: null, has_answer_key: true, has_solutions: false },
  passages: [],
  questions: qs,
  continue_from: null,
  ...extra,
});
function conv(qs: unknown[], extra: Record<string, unknown> = {}, o: Partial<Parameters<typeof convertUpload>[1]> = {}) {
  const r = parseUpload(upload(qs, extra));
  if (!r.ok) throw new Error(r.message);
  return convertUpload(r.upload, { ...opts, ...o });
}
const codes = (is: Issue[]): IssueCode[] => is.map((i) => i.code);

describe('sha256', () => {
  it('matches known vectors', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    expect(sha256Hex('a'.repeat(1000000))).toBe('cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0');
  });
  it('handles utf8, byte input and padding boundaries', () => {
    expect(sha256Hex('é€😀')).toBe(sha256Hex(utf8Bytes('é€😀')));
    expect(sha256Hex(new Uint8Array([97, 98, 99]))).toBe(sha256Hex('abc'));
    expect(utf8Bytes('é€😀').length).toBe(2 + 3 + 4);
    expect(utf8Bytes('\ud800x').length).toBe(4); // lone surrogate -> U+FFFD (3 bytes) + x
    expect(sha256Hex('a'.repeat(55))).toHaveLength(64);
    expect(sha256Hex('a'.repeat(56))).not.toBe(sha256Hex('a'.repeat(55)));
    expect(sha256Hex('a'.repeat(64))).toBe('ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb');
  });
});

describe('extractJsonBlocks', () => {
  it('extracts a fenced block from a chatty reply', () => {
    const t = 'Sure! Here you go:\n\n```json\n{"a": 1, "b": [1,2]}\n```\n\nLet me know if you need more.';
    const r = extractJsonBlocks(t);
    expect(r.errors).toEqual([]);
    expect(r.blocks).toHaveLength(1);
    expect(r.blocks[0]!.value).toEqual({ a: 1, b: [1, 2] });
    expect(r.blocks[0]!.repairs).toEqual([]);
    expect(r.blocks[0]!.line).toBe(4);
  });
  it('handles multiple blocks, JSON fence casing, ~~~ fences and ignores other languages', () => {
    const t = '```JSON\n{"n":1}\n```\ntext\n```python\nprint({"x":1})\n```\n~~~json\n{"n":2}\n~~~\n```\n{"n":3}\n```';
    const r = extractJsonBlocks(t);
    expect(r.blocks.map((b) => (b.value as { n: number }).n)).toEqual([1, 2, 3]);
  });
  it('accepts a bare JSON object with prose around it', () => {
    const r = extractJsonBlocks('Here: {"a": {"b": "x}y"}, "c": 2} thanks {"d": 4}');
    expect(r.blocks.map((b) => b.value)).toEqual([{ a: { b: 'x}y' }, c: 2 }, { d: 4 }]);
  });
  it('repairs smart quotes and trailing commas', () => {
    const r = extractJsonBlocks('```json\n{\u201cstem\u201d: \u201cwhat\u2019s \u2018x\u2019?\u201d, "list": [1, 2,], }\n```');
    expect(r.errors).toEqual([]);
    expect(r.blocks[0]!.value).toEqual({ stem: 'what\u2019s \u2018x\u2019?', list: [1, 2] });
    expect(r.blocks[0]!.repairs).toEqual(expect.arrayContaining(['smart quotes', 'trailing comma']));
  });
  it('keeps commas inside strings', () => {
    const r = extractJsonBlocks('{"a": "x,]", "b": "y,}"}');
    expect(r.blocks[0]!.value).toEqual({ a: 'x,]', b: 'y,}' });
  });
  it('repairs raw newlines/tabs and unescaped LaTeX backslashes', () => {
    const t = '```json\n{"s": "line1\nline2\t 5 $\\frac{1}{2}$ \\vec{a} \\text{m} \\beta \\right) \\underbrace{x} \\neq \\nabla"}\n```';
    const r = extractJsonBlocks(t);
    expect(r.errors).toEqual([]);
    const s = (r.blocks[0]!.value as { s: string }).s;
    expect(s).toContain('line1\nline2\t 5');
    for (const frag of ['\\frac{1}{2}', '\\vec{a}', '\\text{m}', '\\beta', '\\right)', '\\underbrace', '\\neq', '\\nabla'])
      expect(s).toContain(frag);
    expect(r.blocks[0]!.repairs).toEqual(
      expect.arrayContaining(['raw newline in string', 'raw tab in string', 'unescaped backslash', 'LaTeX backslashes eaten by JSON escapes']),
    );
  });
  it('fixes control chars nested in arrays/objects, keeping real newlines', () => {
    const r = extractJsonBlocks('{"o": [{"t": "\\theta \\rho\\nThe end \\nu"}], "k": 5, "z": null}');
    const t = (r.blocks[0]!.value as { o: { t: string }[] }).o[0]!.t;
    expect(t).toBe('\\theta \\rho\nThe end \\nu');
  });
  it('keeps valid escapes and \\uXXXX, drops CR', () => {
    const r = extractJsonBlocks('{"a": "\\u00e9\\"q\\"\\/\\\\", "b": "x\r\ny"}');
    expect(r.blocks[0]!.value).toEqual({ a: 'é"q"/\\', b: 'x\ny' });
  });
  it('reports line/col for invalid JSON', () => {
    const t = 'intro\n```json\n{\n  "a": 1\n  "b": 2\n}\n```';
    const r = extractJsonBlocks(t);
    expect(r.blocks).toEqual([]);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]!.line).toBe(5);
    expect(r.errors[0]!.message).toMatch(/line 5, col \d+/);
  });
  it('reports truncated replies (unclosed fence / unexpected end)', () => {
    const r = extractJsonBlocks('```json\n{"questions": [{"n": 1,');
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]!.line).toBeGreaterThanOrEqual(2);
    const r2 = extractJsonBlocks('{"a": [1, 2');
    expect(r2.errors).toHaveLength(1);
  });
  it('reports when nothing is found', () => {
    const r = extractJsonBlocks('no json here at all');
    expect(r.blocks).toEqual([]);
    expect(r.errors[0]!.message).toMatch(/No JSON found/);
    expect(extractJsonBlocks('```json\n\n```').errors).toHaveLength(1);
  });
  it('strips BOM and lineCol clamps', () => {
    expect(extractJsonBlocks('\uFEFF{"a":1}').blocks[0]!.value).toEqual({ a: 1 });
    expect(lineCol('a\nbc', 3)).toEqual({ line: 2, col: 2 });
    expect(lineCol('ab', 99)).toEqual({ line: 1, col: 100 });
  });
  it('handles a dangling backslash at the very end', () => {
    expect(extractJsonBlocks('{"a": "x\\').errors).toHaveLength(1);
  });
  it('a bare reply with an unbalanced object still yields an error', () => {
    expect(extractJsonBlocks('prefix { "a": "b" ').errors).toHaveLength(1);
  });
});

describe('mergeBlocks', () => {
  const blk = (ns: number[], cf: number | null = null, extra: Record<string, unknown> = {}) => ({
    meta: { title: 'm' },
    questions: ns.map((n) => ({ n })),
    continue_from: cf,
    ...extra,
  });
  it('joins continue_from chunks', () => {
    const r = mergeBlocks([blk([1, 2, 3], 4), blk([4, 5], null)]);
    expect(r.merged.questions.map((q) => q.n)).toEqual([1, 2, 3, 4, 5]);
    expect(r.gaps).toEqual([]);
    expect(r.duplicates).toEqual([]);
    expect(r.incomplete).toBeNull();
    expect(r.warnings).toEqual([]);
    expect(r.merged.meta).toEqual({ title: 'm' });
  });
  it('reports duplicates (first copy kept) and gaps', () => {
    const r = mergeBlocks([blk([1, 2, 3], 4), blk([3, 4, 7], null)]);
    expect(r.duplicates).toEqual([3]);
    expect(r.gaps).toEqual([5, 6]);
    expect(r.merged.questions.map((q) => q.n)).toEqual([1, 2, 3, 4, 7]);
    expect(r.warnings.join(' ')).toMatch(/duplicate/);
  });
  it('reports gap between chunk and continuation', () => {
    const r = mergeBlocks([blk([1, 2], 3), blk([6, 7])]);
    expect(r.gaps).toEqual([3, 4, 5]);
    expect(r.warnings.join(' ')).toMatch(/starts at 6/);
  });
  it('flags incomplete last chunk and merges passages with conflicts', () => {
    const r = mergeBlocks([
      blk([1], 2, { passages: [{ id: 'P1', text: 'a' }] }),
      blk([2], 3, { passages: [{ id: 'P1', text: 'b' }, { id: 'P2', text: 'c' }] }),
    ]);
    expect(r.incomplete).toBe(3);
    expect(r.passageConflicts).toEqual(['P1']);
    expect(r.merged.passages).toEqual([{ id: 'P1', text: 'a' }, { id: 'P2', text: 'c' }]);
    expect(r.merged.continue_from).toBe(3);
    expect(r.warnings.join(' ')).toMatch(/continue/);
  });
  it('handles empty input and empty continuation chunk', () => {
    const r = mergeBlocks([]);
    expect(r.merged.questions).toEqual([]);
    expect(r.merged.meta).toBeUndefined();
    const r2 = mergeBlocks([blk([1], 2), blk([])]);
    expect(r2.gaps).toEqual([]);
  });
});

describe('schema coercion', () => {
  it('normalises option keys', () => {
    for (const [i, o] of [['1', 'A'], ['(b)', 'B'], ['c.', 'C'], ['D)', 'D'], [' 4 ', 'D'], ['(2)', 'B'], ['e', 'E'], ['27', '27'], ['', '']] as const)
      expect(normalizeOptionKey(i)).toBe(o);
    expect(normalizeOptionKey(undefined)).toBe('');
  });
  it('coerces options, answers, numbers and trims text', () => {
    const r = parseUpload(
      upload([
        baseQ({
          n: '3',
          type: ' scq ',
          stem: '  hello  ',
          options: [{ key: '(1)', text: ' a ' }, { key: '(2)', text: 5 }, { key: '3', text: 'c' }, { key: '4', text: 'd' }],
          answer: { keys: ['(2)'] },
        }),
        baseQ({ n: 4, type: 'NVQ', options: null, answer: { value: '2.5', tol: '0.01' } }),
        baseQ({ n: 5, type: 'MSQ', answer: { keys: 'a, c' } }),
        baseQ({ n: 6, type: 'INT', options: [], answer: 7 }),
        baseQ({ n: 7, answer: 'b' }),
        baseQ({ n: 8, options: { a: 'x', b: 'y' }, answer: null, chapter: undefined, confidence: ' LOW ', figures: undefined, note: '  ' }),
        baseQ({ n: 9, type: 'assert-reason', answer: { value: 1, tol: -2 } }),
      ]),
    );
    if (!r.ok) throw new Error('x');
    const q = r.upload.questions;
    expect(r.upload.rejected).toEqual([]);
    expect(q[0]).toMatchObject({ n: 3, type: 'SCQ', stem: 'hello', answer: { keys: ['B'] } });
    expect(q[0]!.options!.map((o) => [o.key, o.text])).toEqual([['A', 'a'], ['B', '5'], ['C', 'c'], ['D', 'd']]);
    expect(q[1]!.answer).toEqual({ value: 2.5, tol: 0.01 });
    expect(q[2]!.answer).toEqual({ keys: ['A', 'C'] });
    expect(q[3]).toMatchObject({ options: null, answer: { value: 7 } });
    expect(q[4]!.answer).toEqual({ keys: ['B'] });
    expect(q[5]).toMatchObject({ chapter: 'UNKNOWN', confidence: 'low', figures: [], note: null, answer: null });
    expect(q[5]!.options!.map((o) => o.key)).toEqual(['A', 'B']);
    expect(q[6]).toMatchObject({ type: 'ASSERT_REASON', answer: { value: 1, tol: 2 } });
  });
  it('is strict about bbox', () => {
    const fig = (bbox: unknown[], extra: Record<string, unknown> = {}) => ({ id: 1, where: 'stem', page: 1, bbox, alt: 'x', ...extra });
    const bad = [
      fig([0.1, 0.1, 1.2, 0.5]),
      fig([-0.1, 0.1, 0.5, 0.5]),
      fig([0.5, 0.1, 0.4, 0.5]),
      fig([0.1, 0.5, 0.4, 0.5]),
      fig([0.1, 0.1, 0.4]),
      fig([0.1, 0.1, 0.4, 0.5], { alt: '  ' }),
      fig([0.1, 0.1, 0.4, 0.5], { page: 0 }),
    ];
    const r = parseUpload(upload([...bad.map((f, i) => baseQ({ n: i + 1, stem: `s{{fig:1}} ${i}`, figures: [f] })), baseQ({ n: 20, figures: [fig(['0.1', '0.1', '0.4', '0.5'], { where: ' STEM ' })] })]));
    if (!r.ok) throw new Error('x');
    expect(r.upload.rejected).toHaveLength(bad.length);
    expect(r.upload.questions).toHaveLength(1);
    expect(r.upload.questions[0]!.figures[0]).toMatchObject({ bbox: [0.1, 0.1, 0.4, 0.5], where: 'stem' });
    expect(r.upload.rejected[0]).toMatchObject({ n: 1, index: 0 });
    expect(r.upload.rejected[0]!.message).toMatch(/bbox/);
  });
  it('rejects bad questions without failing the upload; handles odd envelopes', () => {
    const r = parseUpload(
      upload([baseQ({ n: 1, stem: '' }), baseQ({ n: 'x' }), null, baseQ({ n: '12', type: 'WAT' })], {
        meta: 5,
        passages: [{ id: 'P1', text: ' t ' }, { text: 'no id' }, 7],
        continue_from: '13',
        prompt_version: 'zz',
      }),
    );
    if (!r.ok) throw new Error('x');
    expect(r.upload.rejected.map((x) => x.n)).toEqual([1, null, null, 12]);
    expect(r.upload.passages).toEqual([{ id: 'P1', text: 't' }]);
    expect(r.upload.continue_from).toBe(13);
    expect(r.upload.prompt_version).toBeNull();
    expect(r.upload.meta).toEqual({ title: '', source: null });
    expect(parseUpload(null)).toMatchObject({ ok: false });
    expect(parseUpload([])).toMatchObject({ ok: false });
    expect(parseUpload({})).toMatchObject({ ok: false });
  });
  it('parses meta', () => {
    const r = parseUpload(
      upload([], { meta: { title: ' X ', language: 'fr', source: { exam: 'JEE Main', year: '2024', session: ' 2 ', paper: null } } }),
    );
    if (!r.ok) throw new Error('x');
    expect(r.upload.meta).toMatchObject({ title: 'X', source: { exam: 'JEE Main', year: 2024, session: '2' } });
    const r2 = parseUpload(upload([], { meta: { source: 'junk' }, prompt_version: 2 }));
    if (!r2.ok) throw new Error('x');
    expect(r2.upload.meta.source).toBeNull();
    expect(r2.upload.prompt_version).toBe(2);
  });
});

describe('convertUpload', () => {
  it('builds a user question', () => {
    const { questions, issues } = conv([baseQ()], {
      meta: { title: 'T', source: { exam: 'JEE Main', year: 2023, session: '2', paper: null } },
    }, { uid: 'alice' });
    expect(issues).toEqual([]);
    const q = questions[0]!;
    expect(q.id).toMatch(/^u_[0-9a-f]{12}$/);
    expect(q).toMatchObject({
      source: { kind: 'user' },
      solution_source: 'user',
      status: 'user_ok',
      tax: { subject: 'PHY', chapter: 'PHY.ROT' },
      appearances: [{ exam: 'JEE Main', year: 2023, qno: 1, session: 2 }],
      exam: 'JEE_MAIN',
      created_at: NOW,
      owner: 'alice',
      images: [],
      pending_figures: [],
      n: 1,
    });
  });
  it('uses shift for non-numeric sessions and omits appearances without year', () => {
    const a = conv([baseQ()], { meta: { source: { exam: 'NEET', year: 2022, session: 'Shift 1' } } }).questions[0]!;
    expect(a.appearances).toEqual([{ exam: 'NEET', year: 2022, qno: 1, shift: 'Shift 1' }]);
    const b = conv([baseQ()], { meta: { source: { exam: 'NEET', year: 2022 } } }).questions[0]!;
    expect(b.appearances).toEqual([{ exam: 'NEET', year: 2022, qno: 1 }]);
    const c = conv([baseQ()], { meta: { source: { exam: 'NEET' } } }).questions[0]!;
    expect(c.appearances).toEqual([]);
  });
  it('ids are deterministic, whitespace-insensitive and content-sensitive', () => {
    const a = conv([baseQ()]).questions[0]!.id;
    expect(conv([baseQ()]).questions[0]!.id).toBe(a);
    expect(conv([baseQ({ stem: '  Moment of inertia   of a disc\nabout its rim is $\\tfrac32 MR^2$ for which axis? ' })]).questions[0]!.id).toBe(a);
    expect(conv([baseQ({ n: 9, chapter: 'MAT.FUN', answer: null })]).questions[0]!.id).toBe(a);
    expect(conv([baseQ({ stem: 'other' })]).questions[0]!.id).not.toBe(a);
    const changed = baseQ();
    changed.options[0]!.text = 'uno';
    expect(conv([changed]).questions[0]!.id).not.toBe(a);
    // formula: sha256(normalised stem + option texts)
    expect(questionId({ type: 'NVQ', stem: ' a  b ' })).toBe(questionId({ type: 'NVQ', stem: 'a b', options: null }));
    expect(questionId({ type: 'SCQ', stem: 'x', options: [{ text: 'a' }] })).toMatch(/^u_[0-9a-f]{12}$/);
  });
  it('PARA_CHILD gets its passage and hashes it', () => {
    const mk = (pid: string) => baseQ({ type: 'PARA_CHILD', passage_id: pid, stem: 'Which?' });
    const { questions, issues } = conv([mk('P1'), mk('P2')], {
      passages: [{ id: 'P1', text: 'Passage about $x$.' }, { id: 'P2', text: 'Another passage.' }],
    });
    expect(issues).toEqual([]);
    expect(questions).toHaveLength(2);
    expect(questions[0]).toMatchObject({ passage: 'Passage about $x$.', passage_id: 'P1' });
    expect(questions[0]!.id).not.toBe(questions[1]!.id);
  });
  it('PARA_CHILD with missing passage is an error; numeric PARA_CHILD works', () => {
    const r = conv([baseQ({ type: 'PARA_CHILD', passage_id: 'P9' }), baseQ({ n: 2, type: 'PARA_CHILD', passage_id: null, stem: 'z' })]);
    expect(r.issues.filter((i) => i.code === 'invalid_schema').map((i) => i.message)).toEqual([
      'Passage P9 not found.',
      'PARA_CHILD has no passage_id.',
    ]);
    const ok = conv([baseQ({ type: 'PARA_CHILD', passage_id: 'P1', options: null, answer: { value: 3 } })], {
      passages: [{ id: 'P1', text: 'p' }],
    });
    expect(ok.issues).toEqual([]);
  });
  it('needs_answer', () => {
    const r = conv([baseQ({ answer: null })]);
    expect(r.questions[0]!.status).toBe('needs_answer');
    expect(r.issues).toEqual([expect.objectContaining({ code: 'needs_answer', severity: 'warn', field: 'answer' })]);
  });
  it('dropped questions are excluded (or kept as needs_answer)', () => {
    const r = conv([baseQ({ answer: null, note: 'dropped' }), baseQ({ n: 2, stem: 'second', note: 'Bonus - all get marks' })]);
    expect(r.questions).toEqual([]);
    expect(r.issues.map((i) => i.n)).toEqual([1, 2]);
    expect(r.issues[0]).toMatchObject({ code: 'needs_answer', severity: 'warn' });
    const k = conv([baseQ({ answer: { keys: ['A'] }, note: 'dropped' })], {}, { keepDropped: true });
    expect(k.questions[0]).toMatchObject({ status: 'needs_answer', dropped: true, answer: null });
  });
  it('bad_math', () => {
    const r = conv([baseQ({ stem: 'Find $\\frac{1}{$ now', solution: 'ok $\\notacommand{x}$' })]);
    const bm = r.issues.filter((i) => i.code === 'bad_math');
    expect(bm.map((i) => i.field)).toEqual(['stem', 'solution']);
    expect(bm[0]).toMatchObject({ severity: 'error' });
    const opt = conv([baseQ({ options: [{ key: 'A', text: '$\\frac{$' }, { key: 'B', text: 'b' }] })]);
    expect(opt.issues.find((i) => i.code === 'bad_math')!.field).toBe('options.0');
  });
  it('unknown_chapter (UNKNOWN and not in list)', () => {
    const r = conv([baseQ({ chapter: 'UNKNOWN' }), baseQ({ n: 2, stem: 'b', chapter: 'PHY.NOPE' })]);
    expect(r.issues.filter((i) => i.code === 'unknown_chapter')).toHaveLength(2);
    expect(r.issues.find((i) => i.n === 2 && i.code === 'unknown_chapter')!.message).toMatch(/PHY\.NOPE/);
    expect(r.questions[0]!.tax).toEqual({ subject: 'UNK' });
    const fixed = setChapter(r.questions[0]!, 'CHE.MOLE');
    expect(fixed.tax).toEqual({ subject: 'CHE', chapter: 'CHE.MOLE' });
    expect(validateUserQuestion(fixed, { chapterIds: CH }).map((i) => i.code)).not.toContain('unknown_chapter');
  });
  it('subjectOfChapter', () => {
    expect(subjectOfChapter('BIO.CELL')).toBe('BIO');
    expect(subjectOfChapter('weird')).toBe('UNK');
    expect(subjectOfChapter('')).toBe('UNK');
  });
  it('figure_missing + resolveFigure', () => {
    const fig = { id: 1, where: 'stem', page: 2, bbox: [0.1, 0.2, 0.6, 0.7], alt: 'block on an incline' };
    const r = conv([
      baseQ({
        stem: 'See {{fig:1}} and again {{fig:1}}',
        options: [{ key: 'A', text: '{{fig:1}}' }, { key: 'B', text: 'b' }],
        solution: 'sol {{fig:1}}',
        figures: [fig],
      }),
    ]);
    const q = r.questions[0]!;
    expect(q.pending_figures).toEqual([{ k: 1, where: 'stem', page: 2, bbox: [0.1, 0.2, 0.6, 0.7], alt: 'block on an incline' }]);
    const fm = r.issues.filter((i) => i.code === 'figure_missing');
    expect(fm).toHaveLength(1);
    expect(fm[0]).toMatchObject({ severity: 'error', field: 'figures' });
    expect(placeholderKs(q)).toEqual([1]);

    const img = imageRefFromBlobMeta({ idHex: 'A'.repeat(16) + 'ff', w: 640, h: 480, alt: 'block [on] an\nincline' });
    const res = resolveFigure(q, 1, img);
    expect(res.stem).toBe(`See ![block on an incline](img:${'a'.repeat(16)}) and again ![block on an incline](img:${'a'.repeat(16)})`);
    expect(res.options![0]!.text).toBe(`![block on an incline](img:${'a'.repeat(16)})`);
    expect(res.solution).toContain('img:');
    expect(res.images).toEqual([img]);
    expect(res.pending_figures).toEqual([]);
    expect(res.id).toBe(q.id);
    expect(q.pending_figures).toHaveLength(1); // immutable
    expect(validateUserQuestion(res, { chapterIds: CH })).toEqual([]);
    expect(() => resolveFigure(res, 1, img)).toThrow(/no pending figure/);
  });
  it('resolveFigure with two figures sharing one image and null solution/options', () => {
    const f = (id: number) => ({ id, where: 'stem', page: 1, bbox: [0.1, 0.1, 0.5, 0.5], alt: `fig ${id}` });
    const q = conv([baseQ({ type: 'NVQ', options: null, answer: { value: 1 }, stem: 'a {{fig:1}} b {{fig:2}}', figures: [f(1), f(2)] })]).questions[0]!;
    const img = imageRefFromBlobMeta({ idHex: '1234567890abcdef', w: 100, h: 50, alt: 'same' });
    const r = resolveFigure(resolveFigure(q, 1, img), 2, img);
    expect(r.images).toHaveLength(1);
    expect(r.solution).toBeNull();
    expect(r.options).toBeUndefined();
    expect(validateUserQuestion(r, { chapterIds: CH })).toEqual([]);
  });
  it('placeholder without figure entry and figure without placeholder', () => {
    const r = conv([baseQ({ stem: 'x {{fig:2}}' }), baseQ({ n: 2, stem: 'y', figures: [{ id: 1, where: 'stem', page: 1, bbox: [0.1, 0.1, 0.5, 0.5], alt: 'a' }] })]);
    const msgs = r.issues.filter((i) => i.code === 'figure_missing');
    expect(msgs.map((i) => [i.n, i.severity])).toEqual([[1, 'error'], [2, 'warn']]);
    expect(r.questions[1]!.pending_figures).toEqual([]);
  });
  it('low_confidence', () => {
    const r = conv([baseQ({ confidence: 'low' })]);
    expect(r.issues).toEqual([expect.objectContaining({ code: 'low_confidence', severity: 'warn' })]);
  });
  it('duplicate within batch and against existing', () => {
    const first = conv([baseQ()]).questions[0]!;
    const r = conv([baseQ(), baseQ({ n: 2 }), baseQ({ n: 3, stem: 'unique' })], {}, { existingIds: [first.id] });
    expect(r.questions.map((q) => q.n)).toEqual([3]);
    expect(r.issues.filter((i) => i.code === 'duplicate')).toHaveLength(2);
    const b = conv([baseQ(), baseQ({ n: 2 })]);
    expect(b.questions).toHaveLength(1);
    expect(b.issues).toEqual([expect.objectContaining({ code: 'duplicate', n: 2, qid: first.id })]);
  });
  it('answer_not_in_options and answer shape', () => {
    const r = conv([
      baseQ({ answer: { keys: ['E'] } }),
      baseQ({ n: 2, stem: 'b', answer: { keys: ['A', 'B'] } }),
      baseQ({ n: 3, stem: 'c', answer: { value: 2 } }),
      baseQ({ n: 4, stem: 'd', type: 'NVQ', options: null, answer: { keys: ['A'] } }),
      baseQ({ n: 5, stem: 'e', type: 'INT', options: null, answer: { value: 2.5 } }),
      baseQ({ n: 6, stem: 'f', type: 'MSQ', answer: { keys: ['A', 'C'] } }),
    ]);
    const by = (n: number) => r.issues.filter((i) => i.n === n).map((i) => i.code);
    expect(by(1)).toEqual(['answer_not_in_options']);
    expect(by(2)).toEqual(['invalid_schema']);
    expect(by(3)).toEqual(['invalid_schema']);
    expect(by(4)).toEqual(['invalid_schema']);
    expect(by(5)).toEqual(['invalid_schema']);
    expect(by(6)).toEqual([]);
  });
  it('NVQ answer must be numeric', () => {
    const q = conv([baseQ({ type: 'NVQ', options: null, answer: { value: 1 } })]).questions[0]!;
    const bad = { ...q, answer: { value: Number.NaN } } as UserQuestion;
    expect(codes(validateUserQuestion(bad, { chapterIds: CH }))).toContain('invalid_schema');
  });
  it('rejects fields over the firestore.rules caps (stem/solution/passage 12000, options 10, figures 12)', () => {
    const q = conv([baseQ({})]).questions[0]!;
    expect(codes(validateUserQuestion({ ...q, stem: 'x'.repeat(12001) }, { chapterIds: CH }))).toContain('invalid_schema');
    expect(codes(validateUserQuestion({ ...q, stem: 'x'.repeat(12000) }, { chapterIds: CH }))).not.toContain('invalid_schema');
    const eleven = Array.from({ length: 11 }, (_x, i) => ({ key: String.fromCharCode(65 + i), text: `o${i}` }));
    expect(codes(validateUserQuestion({ ...q, options: eleven, answer: { keys: ['A'] } }, { chapterIds: CH }))).toContain('bad_options');
  });
  it('bad_options', () => {
    const r = conv([
      baseQ({ options: [{ key: 'A', text: 'only' }], answer: { keys: ['A'] } }),
      baseQ({ n: 2, stem: 'b', options: [{ key: 'A', text: 'x' }, { key: 'a', text: 'y' }], answer: { keys: ['A'] } }),
      baseQ({ n: 3, stem: 'c', options: [{ key: 'A', text: 'x' }, { key: 'B', text: '' }], answer: null }),
      baseQ({ n: 4, stem: 'd', type: 'NVQ', options: [{ key: 'A', text: 'x' }, { key: 'B', text: 'y' }], answer: { value: 1 } }),
      baseQ({ n: 5, stem: 'e', options: null, answer: null }),
    ]);
    const by = (n: number) => r.issues.filter((i) => i.n === n && i.code === 'bad_options');
    expect(by(1)).toHaveLength(1);
    expect(by(2)).toHaveLength(1);
    expect(by(3)).toHaveLength(1);
    expect(by(4)).toEqual([expect.objectContaining({ severity: 'warn' })]);
    expect(r.questions[3]!.options).toBeUndefined();
    expect(by(5)).toHaveLength(1);
  });
  it('html_not_allowed', () => {
    const r = conv([
      baseQ({ stem: 'a <b>bold</b> thing' }),
      baseQ({ n: 2, stem: 'img <img src=x onerror=1>' }),
      baseQ({ n: 3, stem: 'ext ![x](https://evil.test/a.png)' }),
      baseQ({ n: 4, stem: 'fine: $a<b$ and x < 5 and 3 > 2' }),
      baseQ({ n: 5, stem: 'comment <!-- hi -->' }),
    ]);
    const bad = r.issues.filter((i) => i.code === 'html_not_allowed').map((i) => i.n);
    expect(bad).toEqual([1, 2, 3, 5]);
    expect(findHtml('plain')).toBeNull();
    expect(findHtml('![ok](img:0123456789abcdef)')).toBeNull();
  });
  it('rejected questions become invalid_schema errors', () => {
    const r = conv([baseQ({ figures: [{ id: 1, where: 'stem', page: 1, bbox: [0.5, 0.5, 0.2, 0.2], alt: 'a' }] }), baseQ({ n: 2, stem: 'ok' })]);
    expect(r.questions).toHaveLength(1);
    expect(r.issues[0]).toMatchObject({ code: 'invalid_schema', severity: 'error', n: 1 });
    const r2 = conv([{ stem: '' }]);
    expect(r2.issues[0]!.message).toMatch(/#1/);
  });
  it('covers every issue code', () => {
    const all = new Set<IssueCode>();
    const fig = { id: 1, where: 'stem', page: 1, bbox: [0.1, 0.1, 0.5, 0.5], alt: 'a' };
    const r = conv([
      baseQ({ answer: null, confidence: 'low' }),
      baseQ({ n: 2, stem: 'x $\\frac{$', chapter: 'ZZZ' }),
      baseQ({ n: 3, stem: 'f {{fig:1}}', figures: [fig] }),
      baseQ({ n: 4, stem: 'h <i>x</i>', answer: { keys: ['Z'] }, options: [{ key: 'A', text: 'a' }] }),
      baseQ({ n: 5, stem: 'dup' }),
      baseQ({ n: 6, stem: 'dup' }),
      baseQ({ n: 7, type: 'NVQ', stem: 'k', options: null, answer: { keys: ['A'] } }),
    ]);
    for (const i of r.issues) all.add(i.code);
    expect([...all].sort()).toEqual(
      ['answer_not_in_options', 'bad_math', 'bad_options', 'duplicate', 'figure_missing', 'html_not_allowed', 'invalid_schema', 'low_confidence', 'needs_answer', 'unknown_chapter'].sort(),
    );
  });
});

describe('real fixtures', () => {
  const files = ['bio', 'che', 'mat', 'phy'];
  it.each(files)('pipeline fixture %s converts cleanly', (f) => {
    const raw = JSON.parse(readFileSync(new URL(`../../../pipeline/fixtures/questions/${f}.json`, import.meta.url), 'utf8')) as {
      id: string; type: string; stem: string; options?: unknown; answer: unknown; solution: string | null; tax: { chapter: string };
    }[];
    const chapters = [...new Set(raw.map((q) => q.tax.chapter))];
    const qs = raw
      .filter((q) => !/!\[/.test(q.stem + (q.solution ?? '')))
      .map((q, i) => ({ n: i + 1, type: q.type, stem: q.stem, options: q.options ?? null, answer: q.answer, solution: q.solution, chapter: q.tax.chapter }));
    const r = parseUpload(upload(qs));
    if (!r.ok) throw new Error('x');
    expect(r.upload.rejected).toEqual([]);
    const out = convertUpload(r.upload, { exam: 'JEE_MAIN', chapterIds: chapters, now: NOW });
    expect(out.issues.filter((i) => i.severity === 'error')).toEqual([]);
    expect(out.questions.length).toBe(qs.length);
    expect(new Set(out.questions.map((q) => q.id)).size).toBe(qs.length);
  });
});

describe('quota', () => {
  const base = { existingQuestions: 0, existingImages: 0, adding: { questions: 1 }, addedToday: 0 };
  it('ok within limits and at exact edges', () => {
    expect(checkQuota(base)).toEqual({ ok: true, remaining: { questions: 2000, images: 300, today: 300 } });
    expect(checkQuota({ ...base, adding: { questions: 300, images: 300 } }).ok).toBe(true);
    expect(checkQuota({ ...base, existingQuestions: 1700, adding: { questions: 300 } }).ok).toBe(true);
  });
  it('rejects over each cap with reasons', () => {
    const q = checkQuota({ ...base, existingQuestions: 1999, adding: { questions: 2 } });
    expect(q).toMatchObject({ ok: false, reasons: [{ code: 'max_questions', allowed: 1 }] });
    const i = checkQuota({ ...base, existingImages: 299, adding: { questions: 0, images: 2 } });
    expect(i).toMatchObject({ ok: false, reasons: [{ code: 'max_images', allowed: 1 }] });
    const d = checkQuota({ ...base, addedToday: 299, adding: { questions: 2 } });
    expect(d).toMatchObject({ ok: false, reasons: [{ code: 'daily_cap', allowed: 1 }] });
    const all = checkQuota({ existingQuestions: 2000, existingImages: 300, addedToday: 300, adding: { questions: 1, images: 1 } });
    expect(all.ok ? [] : all.reasons.map((r) => r.code)).toEqual(['max_questions', 'max_images', 'daily_cap']);
    expect(all.remaining).toEqual({ questions: 0, images: 0, today: 0 });
  });
  it('clamps negative remaining and exposes constants', () => {
    expect(checkQuota({ ...base, existingQuestions: 5000 }).remaining.questions).toBe(0);
    expect([MAX_QUESTIONS, MAX_IMAGES, MAX_NEW_PER_DAY]).toEqual([2000, 300, 300]);
  });
  it('doc size and image size', () => {
    expect(docSizeBytes({ a: 'é' })).toBe(JSON.stringify({ a: 'é' }).length + 1);
    expect(docSizeBytes(undefined)).toBe(0);
    expect(checkDocSize({ s: 'a'.repeat(49_980) })).toMatchObject({ ok: true });
    expect(checkDocSize({ s: 'a'.repeat(50_000) }).ok).toBe(false);
    expect(checkImageB64('a'.repeat(120000))).toBe(true);
    expect(checkImageB64('a'.repeat(120001))).toBe(false);
    expect(checkImageB64('')).toBe(false);
  });
});

describe('figures helpers', () => {
  it('clampBbox', () => {
    expect(clampBbox([-0.1, 0.2, 1.3, 0.8])).toEqual([0, 0.2, 1, 0.8]);
    expect(clampBbox([0.6, 0.9, 0.2, 0.1])).toEqual([0.2, 0.1, 0.6, 0.9]);
    expect(clampBbox([0.5, 0.5, 0.5, 0.5])).toEqual([0.5, 0.5, 0.51, 0.51]);
    expect(clampBbox([1, 1, 1, 1])).toEqual([0.99, 0.99, 1, 1]);
    expect(clampBbox([Number.NaN, 0, 0.5, 0.5])[0]).toBe(0);
  });
  it('bboxToPixels pads and clamps', () => {
    expect(bboxToPixels([0.1, 0.2, 0.5, 0.6], 1000, 2000, 0)).toEqual({ x: 100, y: 400, w: 400, h: 800 });
    const p = bboxToPixels([0.1, 0.2, 0.5, 0.6], 1000, 2000);
    expect(p).toEqual({ x: 80, y: 360, w: 440, h: 880 });
    expect(bboxToPixels([0, 0, 1, 1], 800, 600)).toEqual({ x: 0, y: 0, w: 800, h: 600 });
    const small = bboxToPixels([0.5, 0.5, 0.5001, 0.5001], 10, 10, 0);
    expect(small.w).toBeGreaterThanOrEqual(1);
  });
  it('nextImageName', () => {
    expect(nextImageName([])).toBe('fig-1');
    expect(nextImageName(['fig-1', 'fig-2', 'fig-4'])).toBe('fig-3');
    expect(nextImageName(new Set(['x-1']), 'x')).toBe('x-2');
  });
  it('imageRefFromBlobMeta', () => {
    const r = imageRefFromBlobMeta({ idHex: 'ABCDEF0123456789' + '00'.repeat(8), w: 960, h: 400, alt: ' a [b] ' });
    expect(r).toEqual({ id: 'abcdef0123456789', w: 960, h: 400, alt: 'a b', variants: [960] });
    expect(() => imageRefFromBlobMeta({ idHex: 'zz', w: 1, h: 1, alt: 'x' })).toThrow();
    expect(() => imageRefFromBlobMeta({ idHex: '0123456789abcdef', w: 1, h: 1, alt: '  ' })).toThrow();
  });
});

describe('misc', () => {
  it('ParsedUpload type is usable directly', () => {
    const up: ParsedUpload = { prompt_version: 2, meta: { title: '', source: null }, passages: [], questions: [], rejected: [], continue_from: null };
    expect(convertUpload(up, opts)).toEqual({ questions: [], issues: [] });
  });
});
