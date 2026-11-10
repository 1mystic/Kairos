# DSA content (DryRun)

Owner's own project https://github.com/1mystic/DryRun, embedded at `app/public/dryrun/` (see `ATTRIBUTION.md`, `app/public/dryrun/KAIROS_PATCHES.md`). 117 problems, 8 role tracks.

## Regenerate
```
python -m pipeline.dsa.build_catalog        # -> app/public/dsa/catalog.json (metadata only, ~64 KB)
python -m pipeline.ingest.dsa_questions     # -> pipeline/bank_src/dsa_interview.json + content/sources/dsa/report.json
python -m pipeline.validate pipeline/bank_src/dsa_interview.json
python -m pipeline.dsa.verify               # just run every embedded test for both variants
```
Needs `node` (data loading via `pipeline/dsa/dump.cjs`, js tests via `_jsrun.cjs`). The pattern -> chapter map lives in `pipeline/dsa/chapters.py` (and must cover every problem: the build fails otherwise). Taxonomy subject `ALG` (19 chapters) is in `content/taxonomy/taxonomy.json`; add a chapter there when adding one to the map.

## Sync with upstream DryRun
1. Clone upstream; copy `index.html css js assets` over `app/public/dryrun/` (not `tools/`, `dist/`, `.git`).
2. Re-apply the patches listed in `KAIROS_PATCHES.md` (index.html bootstrap script, css append, js/app.js `kx`/theme/message code and the two `kx(...)` calls).
3. Map any new slug in `pipeline/dsa/chapters.py`, then run the commands above; update the commit hash in ATTRIBUTION.md and KAIROS_PATCHES.md.

## Question kinds (id = `q_dsa<CamelSlug><Kind>`; schema forbids `_`/`-` after `q_`)
time (optimized time), space (optimized space), brute (beginner time), pattern (which pattern), dryrun (predict the output of a test call; NVQ for numbers, SCQ otherwise).
Every problem's embedded test passes for both variants (117/117 b, 117/117 o); all questions are `verified`. Dry-run answers are recomputed by running the code (twice, must be deterministic and equal `exp`); distractors come from mutated-input runs, then perturbations. Complexity answers come from the record fields. Heuristic loop-depth warnings (not errors): `shuffle-an-array [b]`, `top-k-frequent-elements [o]` (look fine on inspection: bucket sort / randomised, not bugs).

## Counts (547 questions)
By kind: pattern 117, space 115, brute 110, time 109, dryrun 96 (84 SCQ + 12 NVQ).
By chapter: ARR 45, BACK 18, BIT 20, BSEARCH 28, DESIGN 61, DP 59, GRAPH 39, GREEDY 14, HEAP 14, JS 61, LL 24, MATH 20, SLIDE 15, STACK 40, STR 14, TREE 30, TRIE 12, TWOP 24, UF 9.

## Skipped items (see `report.json` -> `skipped`)
- complexity answers that are not clean `O(...)` strings or are constants (`O(32)`, `O(26)`, `O(300)`, `batch-bound`, `optimal throughput`, `n fn calls`, composite "add / median" answers): 17 items.
- dry-run: randomised/timer/async tests, outputs or tests too large, and 5 whose code contains `<...>` or `$` that the markdown sanitiser rejects (`3sum`, `find-peak-element`, `longest-increasing-path-in-a-matrix`, `median-of-two-sorted-arrays`, `design-add-and-search-words-data-structure`): 21 items.
- Test failures: none.
