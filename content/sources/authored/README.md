# Authored JEE Main / IAT practice questions

Original problems written for Kairos (fresh numbers and contexts; nothing copied from real papers or coaching material).
Output: `pipeline/bank_src/authored_jee_main.json` (247 questions, `source.kind = authored`, `solution_source = in_house`, `status = verified`).
Generator and verification code: `pipeline/jee_authored/`.

## Counts
- Subjects: Physics 115, Maths 67, Chemistry 65.
- Types: SCQ 97, INT 118, NVQ 22, MSQ 10.
- Difficulty: E 87, M 138, H 22 (labels set by the author; `b` prior is -0.9 / 0.1 / 1.1 with `n: 0`).
- Chapters: every chapter with `JEE_MAIN` true now has at least 6 questions in the bank (the 39 thin ones were targeted). `in_syllabus` is
  set to year 2026 for every exam flag (JEE_MAIN, NEET_UG, IAT) that is true for the chapter in `content/taxonomy/taxonomy.json`.
- Not covered: Advanced-only chapters (JEE_MAIN false), Biology, and any chapter that needs a figure.

## How each answer is verified
Each question is created by a call in a module under `pipeline/jee_authored/` (`phy_*.py`, `che_*.py`, `mat_*.py`, `extra*.py`).
The call sits next to Python code that recomputes the answer from the stem parameters and `assert`s it:
- `recomputed-by-code` (222 / 247, 90%): stdlib arithmetic, exact `fractions`, brute force over finite sets (relations, subsets, dice, lattice points,
  tree enumeration for isomer counts), numeric integration, or an independent second method. Numeric distractors are asserted different from the correct value.
- `second-derivation` (25 / 247, 10%): conceptual or factual items (chemistry facts, trends, true/false statements). The worked solution gives an independent second
  argument; reference values (pKa, Pauling electronegativity, ionisation enthalpies) are stated in the solution.
Importing a module re-runs all asserts, so `python -m pipeline.jee_authored.verify` re-verifies everything. Each solution ends with `*Verified by: <method>.*`.
Constants are stated in the stem (g, hc, k_B, R, molar volume). No figures are used.

## Rebuild / add more
1. Add a call to `scq`, `scqn` (numeric options), `msq`, `intq` (integer 0-99) or `nvq` (decimal with `tol`) in a module, with a unique key and the verification code above it.
   Use `via="second-derivation"` only when the answer cannot be computed.
2. If you add a new module, list it in `MODULES` in `pipeline/jee_authored/build.py`.
3. `python -m pipeline.jee_authored.build` then `python -m pipeline.validate -q pipeline/bank_src/authored_jee_main.json`.
   The build aborts on any failed assert, validation error, or a stem that duplicates an existing bank or fixture question.

# Authored NEET UG / IAT practice questions (Biology priority)

Original questions written for Kairos (fresh wording, NCERT-level facts only; nothing copied from real papers or coaching material).
Output: `pipeline/bank_src/authored_neet_iat.json` (653 questions, `source.kind = authored`, `solution_source = in_house`, `status = verified`).
Generator and verification code: `pipeline/neet_authored/` (`bot_a/b/c.py`, `zoo_a/b.py`, `phy.py`, `che.py`, `build.py`).

## Counts
- Subjects: BOT 293, ZOO 197, CHE 119, PHY 44.
- Types: SCQ 562, INT 53, NVQ 34, ASSERT_REASON 4.
- Difficulty: E 259, M 344, H 50 (about 40 / 53 / 8 per cent; the hard share is below the 15 per cent target). `b` prior -0.9 / 0.1 / 1.1, `n: 0`.
- Biology: every one of the 35 BOT/ZOO chapters in the taxonomy has 12-21 questions. `in_syllabus` (years 2026 and 2027) follows the taxonomy flags (NEET_UG and IAT for BOT/ZOO).
- Physics/chemistry gap chapters (all text-only): PHY.MAGM 13, PHY.WOP 11, PHY.SEM 13, PHY.EMW 7; CHE.HC 13, HALO 11, ALC 12, CARB 7, AMN 8, BIOM 12, PERIO 9, PBLK 9, DF 6,
  and the IAT-only chapters SBLK 8, POLY 8, GAS 4, SOLID 4, SURF 4, METAL 4.

## Verification statement
- `recomputed-by-code` (92 / 653): genetics crosses and probabilities (enumeration), Hardy-Weinberg, ploidy/chromatid/DNA-content counts, population growth and logistic rates,
  enzyme kinetics, respiratory volumes, cardiac output, GFR, energy transfer, stoichiometry (atom-balance checks), optics, semiconductor and magnetism numerics.
  The module asserts the stored answer at import time.
- `second-derivation` (561 / 653): factual items. Each solution states the fact together with the textbook rule or mechanism that fixes the answer, independent of the option text.
  Every solution ends with `*Verified by: <method>.*`. Items with any doubt (edition-dependent numbers, contested facts, "NOT" traps on edge cases) were dropped.
- No `needs_review` items. No figure-dependent items. Stems were checked for duplicates against the other `bank_src` files by the build.

## Known limits
- Facts follow the NCERT-style statement of each topic; NEET paper wording can differ. A subject expert should still spot-check Biology (especially counts such as GFR, percentages of CO2 transport).
- Chapters still thin (below 12): CHE.GAS, SOLID, SURF, METAL (IAT-only, 4 each), CHE.DF 6, CHE.CARB 7, CHE.AMN 8, PHY.EMW 7. Other NEET physics/chemistry chapters already covered by the JEE authored set were not duplicated.
- Hard items are only 8 per cent.

## Rebuild
`python -m pipeline.neet_authored.build` (aborts on any failed assert, validation error or duplicate stem), then `python -m pipeline.validate pipeline/bank_src/authored_neet_iat.json`.
