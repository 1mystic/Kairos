# GATE DA question bank

Exam id `GATE_DA` (GATE Data Science and Artificial Intelligence, GATE 2027 syllabus, IIT Madras). Published shards: `app/public/bank/v3/GATE_DA/<subject>/<chapter>.json.gz`. Definition: `docs/13_GATE_DA.md`, `content/blueprints/gate_da_2027.json`, taxonomy subjects GA PRS LA CO PDS DBW ML AI.

## What is published in bank v3 vs held back

| Source | File | Questions | Status |
|---|---|---|---|
| Our authored, code-verified questions | `pipeline/bank_src/gate_da_authored.json` | 191 (123 NAT, 39 SCQ, 29 MSQ) | **published** |
| Open banks (MIT): MMLU 301, GSM8K 94, MATH-500 55 | `pipeline/bank_src/gate_da_openbank.json` | 450 (301 SCQ, 149 NVQ) | **published** |
| Official GATE DA 2024/2025/2026 papers + official keys | `pipeline/bank_src/gate_da_official.json` | 175 (90 SCQ, 41 MSQ, 44 NAT) | **EXTRACTED, HELD BACK pending permission** (`status: needs_review`, skipped by `pipeline.publish`); 20 more questions quarantined for figures in `pipeline/quarantine/gate_da_<year>.json` |

Why held back: the official GATE portal footer says "(c) 2027 Indian Institute of Technology Madras. All Rights Reserved." with no reuse grant (quoted in `licences.md`). To release them: get written permission, record it in `licences.md`, set `HOLD_PENDING_PERMISSION = False` in `pipeline/ingest/gate_convert.py`, run `python -m pipeline.ingest.gate_convert convert`, then publish a new version.

v3 totals: 1160 questions in the whole bank, of which 641 are served from `GATE_DA` shards (109 KB gz across 39 shards).

## Counts by chapter

| Chapter | Authored | Open banks | Official (held back) |
|---|---|---|---|
| AI.LOG | 5 | 70 | 7 |
| AI.SRCH | 7 | 0 | 4 |
| AI.UNC | 5 | 0 | 3 |
| CO.LIM | 7 | 3 | 7 |
| CO.OPT | 5 | 19 | 5 |
| CO.TAY | 4 | 2 | 1 |
| DBW.DW | 4 | 0 | 2 |
| DBW.ER | 2 | 0 | 1 |
| DBW.NF | 4 | 0 | 6 |
| DBW.REL | 9 | 0 | 11 |
| DBW.XFM | 2 | 0 | 1 |
| GA.ANAL | 9 | 0 | 7 |
| GA.QUANT | 14 | 150 | 10 |
| GA.SPAT | 3 | 0 | 1 |
| GA.VERB | 7 | 0 | 4 |
| LA.DEC | 2 | 0 | 2 |
| LA.EIG | 4 | 2 | 6 |
| LA.MAT | 5 | 1 | 2 |
| LA.PROJ | 4 | 0 | 4 |
| LA.SYS | 3 | 1 | 2 |
| LA.VS | 3 | 7 | 3 |
| ML.CLS | 8 | 4 | 10 |
| ML.CLU | 4 | 4 | 3 |
| ML.DR | 3 | 0 | 2 |
| ML.EVAL | 4 | 4 | 2 |
| ML.NN | 4 | 4 | 2 |
| ML.REG | 4 | 7 | 4 |
| PDS.ALG | 9 | 10 | 9 |
| PDS.DS | 8 | 9 | 8 |
| PDS.GRAPH | 5 | 5 | 3 |
| PDS.PY | 4 | 24 | 9 |
| PRS.CLT | 3 | 0 | 2 |
| PRS.CNT | 3 | 6 | 2 |
| PRS.CRV | 4 | 3 | 9 |
| PRS.DESC | 4 | 44 | 2 |
| PRS.DRV | 3 | 3 | 4 |
| PRS.INF | 3 | 14 | 0 |
| PRS.MOM | 5 | 2 | 9 |
| PRS.PROB | 5 | 52 | 6 |
| **Total** | **191** | **450** | **175** |

## Official papers (held back) and keys
Papers: `content/sources/gate_da/papers_manifest.json` (URL, pages, sha256, retrieved date). Keys transcribed mechanically into `content/sources/gate_da/keys/gate_da_<year>_key.json`. 2024 Q59 is MTA (no answer, `needs_review`). The 2025 and 2026 key files are titled "Answer Key" on the official archive page; they are treated as final (VERIFY).

## How to extend
- Official papers: add `pipeline/gate_da/papers/y<year>.py` (hand-structured `Q(...)` list + `QUARANTINE`), add the year to `YEARS` in `pipeline/ingest/gate_convert.py`, run `python -m pipeline.ingest.gate_convert keys` (needs the raw PDFs/key text in `pipeline/gate_da/raw/`, gitignored) then `convert`.
- Open banks: add a loader and `SOURCES` entry in `pipeline/ingest/gate_openbank.py` after reading the licence; record it in `licences.md` and `attribution/`. Syllabus rules: `pipeline/tag/gate_da_rules.py`.
- Authored: add `scq()/msq()/nat()` items in `pipeline/gate_da/authored/<group>.py` (answers computed by code with an independent second check next to each item); `python -m pipeline.gate_da.verify.run`, then `python -m pipeline.gate_da.build_authored`.
- Publish: `python -m pipeline.publish --version N` (never `--force`).

## Licence table
| Source | Licence | In bank |
|---|---|---|
| Authored questions | original work of the project | yes |
| MMLU (hendrycks/test) | MIT | yes |
| MATH-500 (openai/prm800k, from hendrycks/math) | MIT | yes |
| GSM8K (openai/grade-school-math) | MIT | yes |
| Official GATE papers/keys | "All Rights Reserved" notice, no grant | held back |
| DS-AI-GATE/dsai-gate | Unlicense (index only; mirrors the official PDFs) | no content used |
| practicepaper.in, GeeksforGeeks, gatexaiml.in | all rights reserved / personal use | excluded |

## Known gaps
- Figure/graph questions (20 of 195 official questions) are quarantined, and the authored bank is text-only (no figure items, no spatial figure items beyond coordinate puzzles).
- Authored: chapters with fewer than 8 items (e.g. PRS.CLT 3, CO.TAY 4, LA.DEC 2, DBW.ER 2, DBW.XFM 2) are below the 8-12 target; NAT items dominate (123 of 191).
- Open-bank items use dataset gold answers (not independently re-verified) and keyword-based syllabus mapping; expect some mild mis-tagging and several easy items (GSM8K, high-school MMLU). Items from MMLU labelled GA.QUANT are school-level.
- HMM / MDP / EM / SVM duality are NOT in the GATE DA 2027 syllabus and are not covered.
- `python -m pipeline.stats --md` only reports the JEE/NEET/IAT served counts (stats.py is not GATE-aware), so `content/sources/bank_stats.md` was not regenerated.
- Tests written but not run: `pipeline/tests/test_gate_convert.py`, `test_gate_openbank.py`, `test_gate_authored.py`.

## Owner-supplied question bank (W11)

`pipeline/bank_src/gate_da_qbank.json`: **1,203 questions** converted from the owner's GATE DA 2027 workbooks (1,206 records; 3 quarantined as duplicates). `source.kind = authored`, license "Provided by the project owner (owner confirms rights)", solutions in house, `status: verified` (the owner confirms rights; the answer keys and worked solutions are the workbook author's, audited in `content/sources/gate_da/qbank/QUALITY.md`: 0 mismatches in 700+ independent recomputations). Source archive, attribution and the figure PNGs: `content/sources/gate_da/qbank/`. Converter: `python -m pipeline.ingest.gate_qbank` (deterministic; maps in `pipeline/gate_da/qbank/`: `section_map.json` 124 workbook sections, `chapter_overrides.json` 120 per-question chapters for the Mock Sets, `xref.py` self-containment fixes, `figures.json` alt texts, `id_map.json` source id to question id). Twenty figures are processed to webp in `app/public/img`; **publishing needs their PNG sources in the `--img-src` directory** (`pipeline.publish` takes a single directory; copy `content/sources/gate_da/qbank/figures/*.png` next to the fixture images).

Types: 705 NVQ, 314 SCQ, 184 MSQ. Marks (workbook): 770 one-mark, 433 two-mark. Difficulty: 302 E, 728 M, 173 H. Subjects: PRS 192, AI 172, PDS 165, ML 165, LA 160, DBW 159, CO 150, GA 40.

Quarantined (`pipeline/quarantine/gate_qbank_rejected.json`): 3, all `duplicate` (Q7.02 equals an authored question; Q30.12 = Q8.21 and Q30.15 = Q9.02 inside the workbook, aliased in `id_map.json`). No `cross_ref`, `latex`, `table` or `answer` rejects: 32 cross-references were fixed by inlining the referenced text, and shared data (tables, graphs, trees) is attached only to the questions that use it.

NAT answers: 390 integers (tol 0), 280 decimals (tol = half a unit of the last decimal, or of the stem's "round to d decimals"), 46 ranges (kept as `range`, 45 with an en dash and 1 written "to"); 24 keys use the Unicode minus sign.

Counts by chapter:

| Chapter | Questions | SCQ | MSQ | NVQ | 1 mark | 2 marks |
|---|---|---|---|---|---|---|
| AI.LOG | 43 | 18 | 13 | 12 | 36 | 7 |
| AI.SRCH | 85 | 37 | 12 | 36 | 61 | 24 |
| AI.UNC | 44 | 11 | 7 | 26 | 30 | 14 |
| CO.LIM | 88 | 12 | 11 | 65 | 48 | 40 |
| CO.OPT | 46 | 5 | 6 | 35 | 26 | 20 |
| CO.TAY | 16 | 2 | 1 | 13 | 9 | 7 |
| DBW.DW | 12 | 3 | 4 | 5 | 10 | 2 |
| DBW.ER | 9 | 4 | 3 | 2 | 7 | 2 |
| DBW.NF | 58 | 19 | 12 | 27 | 33 | 25 |
| DBW.REL | 69 | 22 | 8 | 39 | 43 | 26 |
| DBW.XFM | 11 | 1 | 2 | 8 | 10 | 1 |
| GA.ANAL | 10 | 6 | 1 | 3 | 7 | 3 |
| GA.QUANT | 12 | 7 | 1 | 4 | 8 | 4 |
| GA.SPAT | 8 | 2 | 0 | 6 | 8 | 0 |
| GA.VERB | 10 | 10 | 0 | 0 | 7 | 3 |
| LA.DEC | 27 | 3 | 5 | 19 | 15 | 12 |
| LA.EIG | 33 | 4 | 3 | 26 | 19 | 14 |
| LA.MAT | 33 | 5 | 9 | 19 | 17 | 16 |
| LA.PROJ | 31 | 4 | 5 | 22 | 21 | 10 |
| LA.SYS | 20 | 1 | 6 | 13 | 15 | 5 |
| LA.VS | 16 | 3 | 6 | 7 | 11 | 5 |
| ML.CLS | 52 | 13 | 7 | 32 | 39 | 13 |
| ML.CLU | 27 | 11 | 3 | 13 | 20 | 7 |
| ML.DR | 14 | 3 | 1 | 10 | 12 | 2 |
| ML.EVAL | 21 | 8 | 5 | 8 | 15 | 6 |
| ML.NN | 21 | 6 | 3 | 12 | 16 | 5 |
| ML.REG | 30 | 10 | 3 | 17 | 22 | 8 |
| PDS.ALG | 41 | 12 | 7 | 22 | 27 | 14 |
| PDS.DS | 42 | 14 | 5 | 23 | 29 | 13 |
| PDS.GRAPH | 40 | 7 | 9 | 24 | 26 | 14 |
| PDS.PY | 42 | 27 | 0 | 15 | 27 | 15 |
| PRS.CLT | 13 | 1 | 3 | 9 | 6 | 7 |
| PRS.CNT | 11 | 1 | 0 | 10 | 7 | 4 |
| PRS.CRV | 39 | 3 | 4 | 32 | 21 | 18 |
| PRS.DESC | 7 | 0 | 1 | 6 | 5 | 2 |
| PRS.DRV | 19 | 3 | 1 | 15 | 14 | 5 |
| PRS.INF | 34 | 7 | 5 | 22 | 15 | 19 |
| PRS.MOM | 36 | 3 | 5 | 28 | 11 | 25 |
| PRS.PROB | 33 | 6 | 7 | 20 | 17 | 16 |

Mock papers (mini, blueprint `gate_da_2027`): `pipeline/fixtures/papers/gate_da_mock_{a,b,c}.json`, built by `python -m pipeline.gate_da.qbank.build_mocks`. A: 48 questions (GA 5x1 + 3x2, technical 40), B: 46, C: 45; no question is shared between the papers. Technical items come from Mock Sets A/B/C (days 30-32), General Aptitude from Day 29. Because the app fills a mini paper by section order and question type only, every section is kept consistent with its marks: surplus 1-mark NAT of the Mock Sets (9, 11 and 12) are left out and 9, 9 and 10 one-mark MCQ/MSQ from Days 1-28 top up T1M-MCQ/T1M-MSQ (ids in the build output). Day 29 has only eight two-mark MCQ, so GA2 has 3, 3 and 2 questions. These questions also exist in the practice shards (answers visible there); real shared mocks need server grading later.
