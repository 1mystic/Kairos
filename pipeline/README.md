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

### Official NTA papers + keys (procedure, not yet run)
Needs a vision extractor, because papers are PDFs with figures and Hindi/English text:
1. Download the paper PDF and the official final key from the NTA site (record URLs/date in `content/sources/nta/ATTRIBUTION.md`). Do not use coaching re-typed versions.
2. Render pages to images; send them with the key to the model using `prompts/extract_questions_v2.md` (`{{EXAM}}` = JEE_MAIN, `{{CHAPTER_LIST}}` from the taxonomy). The prompt copies wording exactly, fills `answer` only from the key, and lists figures with page and bounding box.
3. Crop figures, run them through `pipeline.images` (ids are hashes of the source bytes), reference them as `![alt](img:<id>)`.
4. Set `source.kind = "official"`, `appearances = [{exam: JEE_MAIN, year, session, shift, qno}]`, `status: needs_review`; a human checks each question against the paper and key before flipping to `verified`. Dropped/bonus items in the key get `answer: null` and stay unpublished.
5. Dedupe against the existing bank (normalised stem+options, then simhash), then tag, validate and publish a new version.
