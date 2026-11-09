# NTA official papers and answer keys (attribution)

Official question papers and **official final answer keys** published by the National Testing Agency (Government of India) for JEE (Main) and NEET (UG). Only official hosts are used (`pipeline/acquire/fetch.py` enforces an allow-list in code, TLS verification always on). No coaching / publisher / competitor material is used, and nothing from them was downloaded or copied.

Retrieved: 2026-11-08. Machine-readable list (URLs, status, sha256, pages): `papers_manifest.json` in this directory. PDFs are not committed (`pipeline/raw/`, gitignored).

## What was used (pilot, W7b)

| Exam | Paper | Source URL | Key (official, final) |
|---|---|---|---|
| JEE (Main) 2026 Session 2, B.E./B.Tech paper, 2 Apr 2026 shift 1 (75 q) | "B Tech 2nd Apr 2026 Shift 1" (online-paper preview, question text is images) | https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2026/04/202604092096865379.pdf (linked from https://jeemain.nta.nic.in/) | "Final Answer Keys for JEE(Main) 2026 [Session-II] (B.E./B.Tech)" https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/2026/04/20260420409057044.pdf |
| NEET (UG) 2020, exam of 13.09.2020, test booklet **H3** (Hindi+English, English column used; 180 q) | https://nta.ac.in/Download/ExamPaper/Paper_20201106080951.pdf | "NEET (UG) 2020 final answer keys on which the result declared on 16.10.2020", booklet H3: https://nta.ac.in/Download/Notice/Notice_20201016104324.pdf |

IAT (IISER Aptitude Test): not used. See `content/sources/iiser/ATTRIBUTION.md`.

## What Kairos changed

- Transcribed each question (English only) into structured JSON (`pipeline/extract/structured/`): LaTeX in `$..$`, chemistry as `\ce{}`; figure-dependent, table and unreliable items are not converted but listed in `pipeline/quarantine/nta_*.json` with the reason.
- Match-the-column items were re-laid out as lists; answer rows such as "(ii) (iv) (iii) (i)" were rewritten as "(a)-(ii), (b)-(iv), ...". Wording is otherwise copied; no question was rewritten, simplified or translated.
- Answers come **only** from the official final key (JEE: Question ID to Option ID mapping through the paper's own IDs; NEET: booklet H3 column). No answer was solved or guessed. Items marked Dropped / Bonus in a key would be kept with `answer: null` and never published (none occurred in the pilot papers).
- Added our own metadata: stable id, chapter tag (`pipeline/tag`, reading-based hints, `manual_tags.json`), difficulty prior (`n: 0`), appearances, `source.kind: official`.
- No solutions: official papers have none; `solution: null`.

## Policy statement

Public exam papers and answer keys published by NTA; used per the project source policy (official papers + official final keys only, for the student's own practice). Copyright in the papers remains with NTA. The NTA copyright policy (https://jeemain.nta.nic.in/copyright-policy/, same text on neet.nta.nic.in) says: "Material featured on this site may be reproduced free of charge after taking proper permission from National Testing Agency (NTA). This is subject to the material being reproduced accurately and not being used in a derogatory manner or in a misleading context. Wherever the material is being published or issued to others, the source must be prominently acknowledged." **Open item for the project owner:** obtain/confirm NTA permission before publishing these questions in the production bank (see report); keep the source acknowledgement visible in the app.

## Takedown / contact

If NTA or any rights holder asks for removal, contact: `TODO: project contact email` (placeholder). We will remove the affected questions from `pipeline/bank_src/`, `pipeline/quarantine/` and published bank versions within `TODO` days.
