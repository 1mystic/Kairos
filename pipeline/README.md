# pipeline

Python 3.11+ tooling for the static question bank. Run from the repo root.

```
python3 -m venv pipeline/.venv && pipeline/.venv/bin/pip install -r pipeline/requirements.txt
P=pipeline/.venv/bin/python

$P -m pipeline.validate pipeline/fixtures/questions      # file or dir; exit 1 on errors; -q = errors only
$P -m pipeline.publish --version 1                       # validate + write app/public/bank/v1 + latest.json
    [--src DIR] [--papers DIR] [--out DIR] [--img-src DIR] [--img-out DIR] [--force]
$P -m pipeline.images some.png --out /tmp/img            # process single images
$P -m pytest pipeline
```

- `schema.py` question model (docs/03), `taxonomy.py` taxonomy model (`content/taxonomy/taxonomy.json`).
- Output is deterministic (sorted keys, gzip mtime 0, fixed webp settings). An existing `v{N}` is never overwritten without `--force`.
- Only `status: verified` questions are published. Mock papers (`fixtures/papers/*.json`) are written without `answer`/`solution`/`solution_source`.
- Images: `![alt](img:<id>)` inline in markdown; `id` = sha256(original bytes)[:16]; sources in `fixtures/images/`, output `app/public/img/{id}.w{W}.webp` (W in 480, 960, never upscaled, borders trimmed, flattened on white, lossless for line art <=32 colours). Declared `w/h/variants` in the question must match the processed result.
- Math: `$..$`, `$$..$$`, mhchem `\ce{}` / `\pu{}`. Real KaTeX render check lives in TS core.
