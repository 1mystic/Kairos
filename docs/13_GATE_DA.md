# 13. GATE DA (Data Science and Artificial Intelligence)

Status: bank and definition added (W8). Core support done (G1: items 5, 6 core part, 9 core part); app support is NOT done: see "What the app and core must change".
Sources: GATE 2027 Information Brochure (https://gate2027ib.iitm.ac.in/GATE2027-IB.pdf), official site https://gate2027.iitm.ac.in (question paper pattern, Download page), DA syllabus PDF https://gate2027.iitm.ac.in/static/doc/GATE2027_Syllabus/DA_GATE2027_Syllabus.pdf. Organising institute for GATE 2027: IIT Madras. Retrieved 2026-11-09. VERIFY again when the final 2027 paper structure is published.

## Exam pattern (official)
- Computer based test, English, 3 hours (180 min), 65 questions, 100 marks.
- DA is in the group of papers with: General Aptitude (GA) 15 marks + subject questions 85 marks (no separate Engineering Mathematics block).
- GA: 10 questions, 5 x 1 mark + 5 x 2 marks, all MCQ.
- Subject (DA) 55 questions: 25 x 1 mark + 30 x 2 marks, mixing MCQ, MSQ and NAT.
- Question types: MCQ (one correct of four), MSQ (one or more correct of four), NAT (numeric, typed with an on-screen keypad; graded against a range).
- Marking: 1-mark MCQ wrong -1/3; 2-mark MCQ wrong -2/3; no negative marking for MSQ or NAT; no partial marking in MSQ (all-or-nothing); no marks for unanswered.
- Sessions: forenoon 9:30-12:30 and afternoon 14:30-17:30 on 6, 7, 13, 14, 20 and 21 February 2027 (brochure); the DA date is not announced yet. The portal publishes one master DA paper per year (2024 session 1, 2025 session 5, 2026 session 8).
- A virtual scientific calculator is provided on screen; physical calculators are not allowed.

Per-type counts vary by year (from the official answer keys):

| Year | 1m MCQ | 1m MSQ | 1m NAT | 2m MCQ | 2m MSQ | 2m NAT |
|---|---|---|---|---|---|---|
| 2024 | 17 | 2 | 6 | 10 | 10 | 10 |
| 2025 | 13 | 7 | 5 | 12 | 11 | 7 |
| 2026 | 12 | 6 | 7 | 11 | 8 | 11 |

`content/blueprints/gate_da_2027.json` uses the 2026 counts.

## Syllabus (official 2027, DA) and taxonomy mapping
Subjects/chapters in `content/taxonomy/taxonomy.json`, exam flag `GATE_DA`, chapter `class` is a placeholder (12).

| Official section | Taxonomy subject | Chapters |
|---|---|---|
| General Aptitude: verbal, quantitative, analytical, spatial | GA | GA.VERB, GA.QUANT, GA.ANAL, GA.SPAT |
| 1 Probability and Statistics | PRS | CNT, PROB, DESC, DRV, CRV, MOM, CLT, INF |
| 2 Linear Algebra | LA | VS, MAT, SYS, EIG, PROJ, DEC |
| 3 Calculus and Optimization | CO | LIM, TAY, OPT |
| 4 Programming, Data Structures and Algorithms | PDS | PY, DS, ALG, GRAPH |
| 5 Database Management and Warehousing | DBW | ER, REL, NF, XFM, DW |
| 6 Machine Learning | ML | REG, CLS, EVAL, NN, CLU, DR |
| 7 AI | AI | SRCH, LOG, UNC |

Not in the syllabus (so not in the bank): HMM, MDP/reinforcement learning, EM/GMM, transactions, deep architectures beyond MLP/feed-forward.

## Question mapping in the pipeline
- MCQ -> `SCQ`; MSQ -> `MSQ` (answer.keys = all correct options); NAT -> `NVQ` with `answer.range = [lo, hi]` (GATE keys give ranges, e.g. "2 to 3", "0.34 to 0.36").
- Cancelled / marks-to-all (key "MTA"): `answer: null`, `status: needs_review`.
- Source kinds: `official` (held back pending permission), `dataset` (MIT open banks), `authored` (solutions included, `solution_source: in_house`).
- Published shards: `bank/v3/GATE_DA/<subject>/<chapter>.json.gz`; blueprint published as `blueprints/gate_da_2027.json`.

## What the app and core must change (not done here)
1. `app/src/practice/taxonomy.ts`: add `{ id: 'GATE_DA', label: 'GATE DA' }` to `EXAMS` (it currently lists JEE_MAIN, NEET_UG, IAT only). Chapters of subjects GA/PRS/LA/CO/PDS/DBW/ML/AI carry `exams.GATE_DA`; subject colours/labels for the eight new subject ids are needed.
2. Onboarding exam choice and exam calendar: `GATE_DA_2027` entry exists (window 6-21 Feb 2027, date unknown). Dates/labels and the exam picker need the new id; the daily-capacity/planner copy should not assume NCERT classes.
3. Dashboard and analysis labels, "exam" filters and predicted-score code that enumerate exams or subject ids (JEE/NEET/IAT assumptions) need GATE_DA.
4. Blueprint `ui_skin`: the blueprint reuses `nta_cbt_v1`. The real GATE interface is similar in behaviour; the UI spec must not use IIT/GATE logos or names.
5. **DONE in core (G1)** Generator gap (core/src/gen/select.ts matches `q.tax.subject === slot.subject`): the blueprint's technical section uses the virtual subject code `DA` (one section list across seven taxonomy subjects) with a loose `subject_map` field (`DA -> PRS, LA, CO, PDS, DBW, ML, AI`). The generator, quotas and diagnostics must resolve a blueprint subject through `subject_map` (like `iat_subject_map` in the taxonomy) or the DA slots will find no eligible questions. Real GATE does not fix per-subject counts inside the 55 technical questions, so this is the faithful structure; the alternative is seven subject entries with fixed sub-quotas.
6. **DONE in core (G1: blueprint stores -0.333333/-0.666667, `roundMarks` rounds totals to 2 d.p.; MSQ/NAT/decimal-string tests in core/src/gate.test.ts)** Scoring: blueprint `marks.wrong` may be any number (z.number()), so `-0.3333` / `-0.6667` validate and score; to avoid cumulative rounding (e.g. 99.9999) store `-1/3` and `-2/3` with higher precision (`-0.333333`, `-0.666667`) or round totals to 2 decimals in the results UI. MSQ is all-or-nothing in `core/src/scoring.ts` (matches GATE); NAT `range` answers are supported. NAT UI for decimals: the on-screen keypad needs `.` and `-` and typed decimal input; accepted range comparison uses the official range.
7. MSQ UI: checkbox options with "no negative marking, all-or-nothing" copy; the question palette must show answered/marked states for MSQ.
8. Virtual calculator: the real GATE interface provides an on-screen scientific calculator; the CBT UI spec (docs/04) has none, so GATE DA mock mode needs one (gap).
9. **Core DONE (G1: no A/B assumption in core; flattenSlots keeps file order); app still to check** Blueprint section ids (`GA1`, `T1M-MCQ`, ...) are new; any code assuming section ids `A`/`B` must be generalised. The 4-option MCQ rule means `SCQ` with 4 options for GATE; the open-bank MMLU items also have 4 options; none of the GATE items has 5 options.
10. KaTeX: authored items use `$...$`, fenced code blocks (python/sql) and markdown tables in stems; the question renderer must support tables and code fences.


## App gaps status (G2)
Done in /app: 1 exam lists and labels (practice, upload, onboarding, landing, admin calendar editor, analysis, mock screen; GATE_DA calendar entries are editable and publishable); 2 onboarding/plan use the bundled `window` start when no date; 3 dashboard/analysis labels; 4 blueprint reuses the NTA-style skin; 6 (UI part) fractional negatives shown as -1/3 and -2/3, no-negative text for MSQ/NAT; 7 MSQ checkboxes already existed, copy added; 8 virtual calculator (`app/src/cbt/calculator`, enabled by blueprint flag `calculator: true`, safe shunting-yard evaluator, no eval); 9 section ids rendered readably ("General Aptitude · 1 mark", "Technical · 2 marks · NAT"); 10 stems render fenced code and pipe tables (`app/src/components/mdBlocks.ts`). The NAT keypad already had digits, `.`, `-`, backspace, clear. Telemetry sends no `sessions_GATE_DA` (not in the rules' key list). Not verified by running (no tests/builds were run).

## Owner question bank and mini mocks (W11)
The owner supplied a 1,206-question GATE DA 2027 workbook (answer keys and worked solutions, Days 1-28 by subject, Day 29 aptitude, Days 30-32 full mock sets). `pipeline/ingest/gate_qbank.py` converts it to `pipeline/bank_src/gate_da_qbank.json` (1,203 questions, `source.kind = authored`, 20 figures); the converter, section-to-chapter map, audit (`content/sources/gate_da/qbank/QUALITY.md`) and attribution are described in `content/sources/gate_da/README.md`. Three mini mocks `gate_da_mock_a/b/c` use it. Two app gaps remain: (1) `buildExamModel` (app/src/cbt/model.ts) matches mini-paper questions with `tax.subject === subj.code`, so the blueprint subject `DA` matches nothing; it must use `resolveSubjects(blueprint, subj.code)` from core (as the generator does), otherwise only the GA questions of these mocks are shown; (2) the mini builder infers marks from section order and type only, which the mock files respect (see the README); publishing the bank needs the figure PNG sources in the `--img-src` directory.

## Full mocks (authored)
- `gate_da_mock_e` (GATE DA 2027 · Full Mock E): 65 original questions, `mini: false`, 100 marks, slots in blueprint section order (GA1 5, GA2 5, T1M-MCQ 12, T1M-MSQ 6, T1M-NAT 7, T2M-MCQ 11, T2M-MSQ 8, T2M-NAT 11). Source: `pipeline/gate_da/authored/mock_e.py` (keys `mocke_*`, listed in `MODULES` of `build_authored.py`); paper file `pipeline/fixtures/papers/gate_da_mock_e.json`. Technical split: PRS 13, LA 9, CO 4, PDS 8, DBW 6, ML 10, AI 5. Every numeric answer is recomputed by in-line asserts.

## Authored full mocks
- **Mock D** (`pipeline/fixtures/papers/gate_da_mock_d.json`, `mini: false`): 65 original questions, 100 marks, the 2026 per-type counts of the blueprint, slots in blueprint section order (GA1, GA2, T1M-MCQ, T1M-MSQ, T1M-NAT, T2M-MCQ, T2M-MSQ, T2M-NAT). Items live in `pipeline/gate_da/authored/mock_d.py` (keys `mockd_*`, every numeric answer recomputed by in-line asserts; module registered in `MODULES` of `build_authored.py`). Technical split: PRS 12, LA 8, CO 4, PDS 8, DBW 6, ML 11, AI 6. Needs `pipeline.publish` to ship.

## Owner fresh set (gap coverage)
The owner supplied a 164-record "GATE DA 2027 Fresh Practice Set" (sources and `ATTRIBUTION.md` in `content/sources/gate_da/fresh_set/`). `pipeline/ingest/gate_fresh.py` converts it to `pipeline/bank_src/gate_da_fresh.json` (`source.kind = authored`). INT and NVQ become `NVQ` with a `range` answer (`value +/- tol`); PARA_CHILD inlines its passage in the stem (SCQ/MSQ); the one MATCH item is an SCQ with a markdown table. All 93 numeric answers are recomputed in `pipeline/gate_da/fresh/checks_*.py`; mismatches, figure references, low-confidence records and duplicates of existing stems are quarantined (`pipeline/quarantine/gate_fresh_rejected.json`). Marks per question are kept in `pipeline/gate_da/fresh/marks.json` (the question schema has no marks field). The set is skewed to MSQ/NAT (few MCQs), so it does not fit the blueprint section counts as a standalone paper; use it as practice and as a pool for mocks.

## NPTEL GATE DA mock tests (freely downloadable; owner-provided)
Source `Gate_DA_Nptel_mocks.pdf` (4 mocks, 65 questions each; no marks or solutions printed). Extracted per mock by `pipeline/ingest/gate_nptel_m{1..4}.py` (hand-transcribed data in `pipeline/gate_da/nptel/`), merged into `pipeline/bank_src/gate_da_nptel_mocks.json` (180 items: 151 verified by code recomputation, 29 conceptual with `needs_review`, which `pipeline.publish` skips). Marks are inferred (GA Q21-25 one mark, Q26-30 two; first 25 technical one mark, rest two) and recorded in `marks_m*.json`.
Not ingested (see `pipeline/held_pending_permission/gate_da_nptel_m*.needs_review.json` and `.report.md`): 105 questions with missing figures/context, keys that disagree with an independent recomputation, or keys pointing at non-existent options. Never edit a key silently: resolve each in the review file first.
