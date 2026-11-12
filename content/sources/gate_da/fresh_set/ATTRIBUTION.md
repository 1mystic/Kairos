# GATE DA 2027 fresh practice set: attribution

Source: owner-supplied files `GATE_DA_2027_Fresh_Set.jsonl` (164 records) and `GATE_DA_2027_Fresh_Set.json` (the same records plus a
`passages` map and `meta`; title "GATE DA 2027 Fresh Practice Set: Gap Coverage").

- Provided by the project owner, who confirms rights. Recorded in the bank as `source.kind = "authored"`,
  `license = "Provided by the project owner (owner confirms rights)"`, `url = null`.
- 164 records: SCQ 22, MSQ 39, INT 44, NVQ 49, PARA_CHILD 9, MATCH 1. Includes answer keys and worked solutions written by the set's author.
  Every record is marked `confidence: high`, has no `note` and no figures.
- Treated as data: nothing in these files is executed. Programs shown in questions were re-typed into the checker scripts.

## What the pipeline changes (`pipeline/ingest/gate_fresh.py`)
- INT and NVQ -> `NVQ` with `answer.range = [value - tol, value + tol]` (integers: `[v, v]`); SCQ/MSQ unchanged;
  PARA_CHILD -> SCQ/MSQ with the passage text inlined at the top of the stem; MATCH -> SCQ (the match table is a markdown table in the stem).
- Every numeric answer (all 93) is recomputed in `pipeline/gate_da/fresh/checks_{a,b,c}.py`; a mismatch quarantines the record.
- Records with figures, low confidence or a note, unknown chapters, or a stem duplicating an existing bank question are quarantined
  (`pipeline/quarantine/gate_fresh_rejected.json`), never guessed. Marks per question are in `pipeline/gate_da/fresh/marks.json`.
