# pipeline

Python 3.11+ tooling for the static question bank. Run from the repo root.

```
python3 -m venv pipeline/.venv && pipeline/.venv/bin/pip install -r pipeline/requirements.txt
P=pipeline/.venv/bin/python

# ingest -> tag -> validate -> publish
$P -m pipeline.ingest.jeebench          # content/sources/jeebench/dataset.json -> pipeline/bank_src/jeebench.json
                                        #   (+ pipeline/quarantine/jeebench_rejected.json); tagging happens here
$P -m pipeline.validate pipeline/fixtures/questions pipeline/bank_src -q   # exit 1 on errors
$P -m pipeline.stats --md               # per-chapter table; writes content/sources/bank_stats.md
$P -m pytest -q pipeline/tests          # includes the bank quality gates (tests/test_bank.py)
$P -m pipeline.publish --version 2      # validate + write app/public/bank/v2 + latest.json
    [--src DIR ...] [--papers DIR] [--out DIR] [--img-src DIR] [--img-out DIR] [--force]
$P -m pipeline.images some.png --out /tmp/img            # process single images
```

- `schema.py` question model (docs/03), `taxonomy.py` taxonomy model (`content/taxonomy/taxonomy.json`).
- `ingest/jeebench.py` deterministic converter (type map, options split, LaTeX normaliser, id, tolerance rule, difficulty prior: see its docstring). Re-running it must reproduce `pipeline/bank_src/jeebench.json` exactly (a test checks this).
- `tag/rules.py` keyword classifier per chapter; confident only if best score >= 2 and it leads the runner-up by >= 2. Everything else (and any rule mistake found in review) is settled by hand in `tag/manual_tags.json` (`qid -> chapter`), which always wins. A question with no tag is rejected (`needs_manual_tag`), never guessed. After ingesting a new source: run it, list `needs_manual_tag` rejects, read each question, add its chapter to `manual_tags.json`, run again.
- Default question sources for `publish`/`stats`: `pipeline/fixtures/questions` (24 authored demo questions, they back `sample_jee_mini_v1`) + `pipeline/bank_src` (ingested sources).
- Only `status: verified` questions are published. Mock papers (`fixtures/papers/*.json`) are written without `answer`/`solution`/`solution_source`. v1 stays in the repo untouched; v2 is the current bank.
- Output is deterministic (sorted keys, gzip mtime 0, fixed webp settings). An existing `v{N}` is never overwritten without `--force`.
- **Exam routing:** `appearances[].exam` and `in_syllabus` keys accept `JEE_MAIN | JEE_ADV | NEET_UG | IAT`. `JEE_ADV` is provenance only and has no shard tree. A JEE Advanced question is written to `JEE_MAIN/<subject>/<chapter>.json.gz` only if `in_syllabus.JEE_MAIN` has a true year (the ingest sets it from the chapter's `exams.JEE_MAIN` flag); Advanced-only chapters (`CHE.GAS/SBLK/SOLID/SURF/METAL/POLY`, JEE_MAIN false) stay in `bank_src` but are not served.
- Images: `![alt](img:<id>)` inline in markdown; `id` = sha256(original bytes)[:16]; sources in `fixtures/images/`, output `app/public/img/{id}.w{W}.webp` (W in 480, 960, never upscaled, borders trimmed, flattened on white, lossless for line art <=32 colours). Declared `w/h/variants` in the question must match the processed result.
- Math: `$..$`, `$$..$$`, mhchem `\ce{}` / `\pu{}`. Real KaTeX render check lives in TS core.

## Content source policy (non-negotiable, see CLAUDE.md)

Allowed:
- Official papers (NTA JEE Main / NEET UG, IAT) together with the **official final answer keys**.
- Openly licensed datasets (MIT/CC-BY etc.) such as JEEBench. Keep the licence and an `ATTRIBUTION.md` (citation, URL, retrieval date, what we changed) under `content/sources/<name>/`.
- User uploads (through the upload flow, `docs/09_UPLOAD.md`), and our own authored questions/solutions.

Banned: scraping or copying from coaching/competitor sites or apps (Marks, PW, Embibe, Vedantu, Aakash, Allen, etc.), their solutions, or any question bank without a licence that permits it. Never paste third-party solutions into `solution`.

### Adding a new source
1. Put the licence/terms and an `ATTRIBUTION.md` in `content/sources/<name>/`; check the licence yourself. If unclear, stop.
2. Write `pipeline/ingest/<name>.py` that outputs the question schema into `pipeline/bank_src/<name>.json` with `source.kind` (`dataset`/`official`), `source.license`, `source.url`, `appearances`, and a `quarantine/<name>_rejected.json` with reasons. Reuse `ingest.jeebench.normalise_latex` and `tag.tag_question`.
3. Tag (rules + `manual_tags.json`), validate, `pipeline.stats --md`, tests, publish a **new** version number.

### Official NTA papers + keys (acquire -> extract -> validate; pilot run in W7b)

```
P=pipeline/.venv/bin/python
$P -m pipeline.acquire.fetch [--only ID ...] [--dry-run]   # manifest -> pipeline/raw/ (gitignored), sequential, 3 s apart
$P -m pipeline.extract.pdf_text PDF --info                 # pages, bilingual two-column detection
$P -m pipeline.extract.neet_text PDF STEM                  # text-layer booklets: first-pass notes0.jsonl (English column)
#   -> the structuring agent reads each question (page images where math is garbled) and writes notes1..N.jsonl
$P -m pipeline.extract.merge_notes STEM --exam E --year Y --expect N --sections "1-25:MAT,..."
$P -m pipeline.ingest.nta_convert PILOT [--write-manual-tags]   # + official key -> bank_src/nta_*.json, quarantine/nta_*.json
$P -m pipeline.validate pipeline/bank_src/nta_*.json -q
```

- **Sources and allow-list.** `content/sources/nta/papers_manifest.json` (and `content/sources/iiser/`) list every official URL with status (found / not found / provisional / host unavailable), sha256, pages. `acquire/fetch.py` refuses (SystemExit) any host outside `ALLOWED_HOSTS` (jeemain.nta.nic.in, neet.nta.nic.in, nta.ac.in, www.nta.ac.in, the NIC government CDN `cdnbbsr.s3waas.gov.in` that serves their files, and the IISER hosts), also after redirects. TLS verification is always on; a host failing verification (currently `iiseradmission.in`) is recorded as unavailable, never bypassed. Coaching / publisher sites are never fetched.
- **Three PDF shapes.** (1) text, single or bilingual two-column (NEET 2020: English column cropped with `pdftotext -x/-W`); (2) image-only online-paper previews (JEE Main 2026 shifts: render pages with `extract.pdf_text.render_pages` and read them; the text layer still carries Question IDs and Option IDs, which map the official key); (3) scans (NEET 2020 English-only sets on the archive page): need OCR, not supported.
- **Answers only from the official final key** (`extract/keys.py`: NEET booklet tables, JEE Question-ID tables; "Dropped"/"Bonus"/"Any non-negative Integer" -> `answer: null`, `needs_review`). The transcription never contains an answer.
- **Statuses.** `verified` = key supplied the answer + validation passes + transcription not flagged low-confidence; else `needs_review`. Figure / table / unreliable-math / no-chapter questions go to `pipeline/quarantine/nta_*.json` (reason + transcription) and are not in `bank_src`.
- **Tagging.** `manual_tags.json` (written from reading-based hints by `--write-manual-tags`) wins, then `tag/rules.py`. The keyword rules were wrong on 8 of 65 rule-tagged pilot questions (12%) and cover PHY/CHE/MAT only (nothing for BOT/ZOO), so every chapter must be reviewed by reading, as before.
- Dedupe against the existing bank (normalised stem+options, then simhash) is still to do before publishing; do not publish a new bank version from these files until the owner approves scaling and the NTA permission question (see `content/sources/nta/ATTRIBUTION.md`) is settled.
