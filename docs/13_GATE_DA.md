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
