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
