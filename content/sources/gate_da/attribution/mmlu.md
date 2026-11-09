# MMLU (Measuring Massive Multitask Language Understanding)
- Source: https://github.com/hendrycks/test (test CSVs from https://people.eecs.berkeley.edu/~hendrycks/data.tar, retrieved 2026-11-09); HF dataset card cais/mmlu declares `license: mit`.
- Licence: MIT, Copyright (c) 2020 Dan Hendrycks (LICENSE read at https://raw.githubusercontent.com/hendrycks/test/master/LICENSE).
- Citation: Hendrycks et al., "Measuring Massive Multitask Language Understanding", ICLR 2021.
- Used subjects: machine_learning, college_computer_science, high_school_computer_science, high_school_statistics, college_mathematics, high_school_mathematics, abstract_algebra, formal_logic, elementary_mathematics (syllabus-filtered per item). No explanations are provided in MMLU; none copied.
- Caveat: MMLU is known to contain a small share of wrong/ambiguous items; filtered by our quality rules but gold labels are not independently verified.
- Raw SHA-256 of the extracted CSVs: pipeline/gate_da/raw/mmlu/SHA256 (not committed).
