# Held back: extracted official papers pending reuse permission

These files are intentionally OUTSIDE `pipeline/bank_src/` so `pipeline.publish` (default sources) never publishes them:
- `nta_jee_main_2026_0402_s1.json`, `nta_neet_ug_2020_H3.json`: NTA's copyright policy requires prior permission before reproducing its material (see `content/sources/nta/ATTRIBUTION.md`).

To release: obtain written permission from NTA, record it in `content/sources/nta/ATTRIBUTION.md`, move the files back to `pipeline/bank_src/`, publish a new bank version, and keep the source acknowledgement visible in the app.
(`pipeline/bank_src/gate_da_official.json` is held the same way via `HOLD_PENDING_PERMISSION` in `pipeline/ingest/gate_convert.py`: its items are `needs_review`, which publish skips.)
