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
