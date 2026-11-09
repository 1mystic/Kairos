# GATE DA 2027 question bank: attribution

Source: owner-supplied workbook export (`GATE_DA_2027_QBank.zip`, not committed), extracted here as
`README.md`, `GATE_DA_2027_QBank.jsonl`, `GATE_DA_2027_QBank.md` and `figures/` (20 PNG diagrams with TikZ source in the records).

- Provided by the project owner, who confirms rights. Recorded in the bank as `source.kind = "authored"`,
  `license = "Provided by the project owner (owner confirms rights)"`, `url = null`.
- 1,206 records: 708 NAT, 314 MCQ, 184 MSQ. Days 1-28 by subject, Day 29 General Aptitude (40), Days 30-32 Mock Sets A/B/C (full syllabus).
- Includes answer keys and worked solutions written by the workbook author (not machine-verified; see `QUALITY.md`).
- Treated as data: nothing in these files is executed.

## What the pipeline changes (`pipeline/ingest/gate_qbank.py`)
- MCQ -> SCQ, MSQ -> MSQ, NAT -> NVQ; answers mapped from the key; LaTeX text commands and tabulars converted to markdown;
  figure placeholders replaced by processed webp images (`app/public/img`) with alt text; shared contexts inlined; sections mapped to taxonomy chapters.
- Records that cannot be converted cleanly are quarantined (`pipeline/quarantine/gate_qbank_rejected.json`), never guessed.

## Rights note
Solution notes in the workbook mention "PYQ variants". These are the workbook author's own variants, not copies of official papers.
The owner should confirm rights to all content before public launch.
