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
