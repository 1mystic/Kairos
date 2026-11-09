# GATE DA 2027 owner question bank: quality audit

Scope: 1,206 workbook records -> 1,203 converted questions in `pipeline/bank_src/gate_da_qbank.json` (3 quarantined as duplicates).
Scripts: `python -m pipeline.gate_da.qbank.audit` (structure) and `python -m pipeline.gate_da.qbank.recompute` (answers). Stdlib only.

## (a) Automated structural checks over all 1,203 converted questions: 0 problems
- MCQ/MSQ: exactly 4 options, option texts distinct and non-empty, `answer.keys` a subset of option keys, MSQ keys sorted and unique, SCQ has one key.
- NAT: numeric value (+tol) or range with lo <= hi; no options.
- No empty stem, option or solution; no dangling "Q<d>.<n>" references; no `[FIGURE` placeholders left.
- No LaTeX text commands outside math/code (`\textbf`, `\emph`, `\texttt`, `\begin{tabular}`, any `\cmd`); KaTeX macros inside math were checked against a whitelist of the 130 macros used in the corpus (all supported by KaTeX; `\mathbbm` etc. not used).
- Every pipe table has equal columns in all rows; every code fence is closed; every `img:` reference resolves to files in `app/public/img` and is declared in `images[]` (both directions: validator).
- `pipeline.validate` on the file: 1,203 ok, 0 errors (brace balance, no raw HTML outside math, chapter/topic against taxonomy).
- Workbook consistency: `answer` agrees with `answer_detail` for every record (letters for MCQ/MSQ, numbers/ranges for NAT; 2 records are written as fractions in the detail, 1/3 and 2/3, matching the decimals).

## (b) Independent recomputation of answers
Method: each NAT answer is recomputed in Python from the stem (never by copying the workbook's solution): brute-force enumeration (counting, probability, truth tables, topological orders, hashing, sorting traces), exact `Fraction` linear algebra (det, rank, inverse, solve), numerical integration and limit evaluation, chi-square and t quantiles from first principles, k-means/PAM/linkage, alpha-beta/A*/UCS on the graphs, Bayesian-network enumeration, sqlite3 for SQL. About half of the 635 manual items are cheap closed-form re-derivations (e.g. `n-1`, `C(7,3)`); the rest are search/numeric/exact-arithmetic recomputations.

| Check | Run | Match | Mismatch |
|---|---|---|---|
| NAT recomputed by hand-written code (`CHECKS`) | 635 | 635 | 0 |
| Python snippets executed (static filter, `python -I`, 5 s timeout): 22 NAT + 37 MCQ matched against the option text | 59 | 55 | 0 (4 not machine-matchable: 1 expects `UnboundLocalError`, 3 describe behaviour; all 4 confirmed by hand) |
| SQL on the shared Emp/Dept database (sqlite3) | 17 | 14 | 0 (3 use `ALL`/`ANY`, unsupported by sqlite; confirmed by hand: 0, 7, 4) |
| Mock MCQ/MSQ checked by hand/code (Q30.10, Q30.14, Q30.13, Q30.20, Q30.21, Q30.24, Q30.39, Q31.24, Q31.35, Q32.21) | 10 | 10 | 0 |

Coverage: 673 of 705 NAT questions (95%) independently recomputed, by subject: PRS 116, CO 114, LA 94, GA+mocks 86, ML 75, AI 65, PDS 48 (+ Python snippets), DBW 37 (+ SQL). **Mismatches: none.** No question was marked `needs_review`, so nothing is excluded from publishing on accuracy grounds.

Not recomputed (32 NAT): Q6.35, Q6.36, Q12.14, Q14.12, Q16.14, Q16.18, Q16.22, Q16.29, Q17.02, Q17.06, Q17.14, Q17.21, Q17.36, Q18.07, Q18.17, Q18.21, Q18.27, Q18.29, Q18.30, Q18.33, Q18.34, Q18.35, Q19.21, Q19.30, Q20.25, Q21.20, Q23.09, Q27.24, Q27.38, Q28.09, Q29.14, Q32.26 (Q32.26 and Q27.38 were derived by hand and agree). Most need figure reading or multi-step relational/ER reasoning that is not cheaply scriptable.

Limits of this audit: 498 MCQ/MSQ items are conceptual and were not recomputed except the 47 above; solution text, the "PYQ ..." notes inside solutions, verbal-ability and spatial-reasoning (GA) answers, and the correctness of figure alt text against the original TikZ were checked by reading only. A key and my recomputation could in principle share the same misreading of an ambiguous stem; where stems state conventions (`round to d decimals`, strategy numbering) I followed them.

## (c) End-to-end reading
About 55 converted records were read in full (stem, options, answer, solution) against the source: tables (Emp/Dept, distance matrix, CPT table, contingency tables), figure questions (graph, tree, ER, networks, solution diagrams), SQL and Python items, cross-reference rewrites (Q1.31, Q19.29, Q20.04, Q22.13, Q25.37, Q26.29, Q32.26, Q32.40), and 20 plain items from every subject.

Defects found and fixed in the converter:
1. Shared contexts in the source are attached to *every* question of their scope (e.g. the 36-question Emp/Dept database, the alpha-beta tree on 40 questions) although the README says they are inlined per question. Stems showed neither. Fix: contexts are kept only where the stem uses the shared object (symbol/keyword rules in `CTX_MATCH`), and instruction-only contexts are dropped.
2. Self-contained SQL script (Q18.35, `CREATE TABLE ...`) wrongly received the Emp/Dept preamble: now excluded. Alpha-beta conventions were attached to expectimax questions: rule tightened.
3. Figures/tables with a caption "used in the next two/three questions" sat in the wrong question (Q16.11, Q26.08 figures; Q22.30 table T): moved to the questions that use them (Q16.12-13, Q26.09/10/17/18, Q26.16, Q22.31-33).
4. 32 cross-references ("the fit in Q8.10") rewritten by inlining the referenced text (see below); solution-side references ("see Q19.22") removed or reworded.
5. Duplicate detection initially used the stem only; 40 generic stems "Which are correct?" were falsely flagged. Options are now part of the key.
6. KaTeX macro whitelist missed `\mathbb`; unescaped literal braces were reported as stray; `--` in table cells (NULL) maps to an en dash.
7. Mock Sets reuse day questions: Q30.12 = Q8.21 and Q30.15 = Q9.02 (identical stem and options) are dropped as duplicates; `id_map.json` aliases them to the kept question so the mocks still use all 40 positions.

Open items for the owner: confirm rights (see `ATTRIBUTION.md`); the 4-option MCQ rule holds for every record; tolerance for decimal NAT keys is half a unit of the last decimal (or of the stem's "round to d decimals"), which is stricter than the official range style.
