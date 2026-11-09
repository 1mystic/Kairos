# GATE DA: source and licence decisions

Policy: official papers + official keys, permissively licensed datasets (MIT / Apache-2.0 / CC0 / CC BY), our own authored questions, user uploads. Never coaching/publisher/community-solution sites. Checked 2026-11-09, TLS verified.

## Official GATE papers (used)
- GATE 2024 / 2025 / 2026 DA master question papers and answer keys from the official portal gate2027.iitm.ac.in (Download page). Public exam papers published by the organising institutes; stored as `source.kind=official`, license text "Public exam paper published by the organising institute; used per project source policy". See `papers_manifest.json`.
- GATE 2027 Information Brochure and DA syllabus PDF (gate2027ib.iitm.ac.in, gate2027.iitm.ac.in): used for the exam pattern, marking scheme and syllabus.

## Sources the owner asked us to check

| Source | Terms found | Decision |
|---|---|---|
| https://github.com/DS-AI-GATE/dsai-gate | LICENSE is the Unlicense ("This is free and unencumbered software released into the public domain"). Contents: README/notes pages, cheat sheets, third-party university ML exam PDFs (final2017..2022, midterms) and books, and a `PYQ/` folder holding byte-identical copies of the six official GATE DA PDFs (SHA-256 match ours). No structured question content of its own. | INDEX ONLY. The Unlicense covers only the authors' own work; the bundled third-party PDFs (books, university exams) carry no licence we can rely on, so none were copied. Used to confirm that the official 2024/2025/2026 papers and keys exist and to locate the official syllabus URL. We took the official files directly from the official host. |
| https://practicepaper.in/gate-da/... | Footer: "(c) 2026 PracticePaper.in - All rights reserved." robots.txt allows crawling but no reuse licence is granted. | EXCLUDED. Learned only that subject-wise PYQ practice exists. Nothing copied. |
| https://www.geeksforgeeks.org/gate/gate-da-topic-wise-quizzes/ | Copyrighted publisher content; robots.txt disallows `anthropic-ai`, `CCBot`, `cohere-ai`, `Bytespider`. Not fetched beyond robots.txt. | EXCLUDED (project policy names GeeksforGeeks). |
| https://www.gatexaiml.in/gatexaiml_black/da/index.php | Footer: "(c) GateXAIML 2025 - 2026, All rights reserved." Terms section 1: "GateXAIML owns the intellectual property rights for all original study material ... You may view and download materials for personal, non-commercial educational use only." No robots.txt (404). | EXCLUDED (personal non-commercial only; not compatible). Learned only topic coverage. |

## Open question banks (Phase 3)

| Dataset | Licence evidence read | Decision | Notes |
|---|---|---|---|
| MMLU (hendrycks/test) | LICENSE: MIT (c) 2020 Dan Hendrycks; HF card `license: mit` | ACCEPTED (9 subjects, syllabus-filtered) | attribution/mmlu.md. Known label noise caveat. |
| MATH (via openai/prm800k MATH-500 split) | prm800k LICENSE MIT (c) 2023 OpenAI; hendrycks/math LICENSE MIT (c) 2021 | ACCEPTED (numeric answers only) | attribution/math500.md. The official MATH tar on people.eecs.berkeley.edu returned HTTP 403, so the MIT-licensed MATH-500 split was used. |
| GSM8K (openai/grade-school-math) | LICENSE MIT (c) 2021 OpenAI | ACCEPTED (multi-step quantitative aptitude) | attribution/gsm8k.md |
| AQuA-RAT / MathQA | Apache-2.0 on GitHub (google-deepmind/AQuA); not downloaded | REJECTED for now | Gold labels are known to be noisy and cannot be verified at scale; rationales not reusable. Re-evaluate with a verification pass. |
| TheoremQA, SciBench, LogiQA, BIG-bench | not fetched (distributed as HF parquet / mixed per-task licences; no stdlib parquet reader allowed under the no-install rule; LogiQA licence unclear) | NOT USED | Licence not verified by us: treated as unavailable per policy. |
| econometrics / logical_fallacies (MMLU subjects) | same MIT licence | EXCLUDED | off-syllabus (jargon-heavy, no GATE DA topic match) |

## Official GATE papers: copyright notice and decision (HELD BACK)

Notice read on the official portal (gate2027.iitm.ac.in home, Download and Question Paper Pattern pages, footer, retrieved 2026-11-09):

> "(c) 2027 Indian Institute of Technology Madras. All Rights Reserved."

The papers (IISc Bengaluru 2024, IIT Roorkee 2025, IIT Guwahati 2026) carry only an "Organizing Institute" footer; no reuse licence or permission statement was found on the portal, in the 2027 Information Brochure (grep for copyright / reproduce / rights: no relevant hit) or in the papers. An "All Rights Reserved" notice without a reuse grant is treated as requiring permission.

Decision: the 175 extracted official questions stay in `pipeline/bank_src/gate_da_official.json` but every item has `status: needs_review`, so `pipeline.publish` (which ships only `verified` questions) does NOT publish them. They are listed as "extracted, held back pending permission". To release: obtain written permission from the organising institutes, record it here, set `HOLD_PENDING_PERMISSION = False` in `pipeline/ingest/gate_convert.py`, re-run `python -m pipeline.ingest.gate_convert convert`.
