"""Merge the agent's per-chunk transcription notes (JSON lines) into one prompt-v2 style structured file.

    python -m pipeline.extract.merge_notes STEM --exam JEE_MAIN --year 2026 --session 2 --shift 2026-04-02/1 \
        --expect 75 --sections "1-25:MAT,26-50:PHY,51-75:CHE"

Reads ``pipeline/extract/structured/<STEM>.notes*.jsonl`` (later files / later lines win per question number),
writes ``<STEM>.json``: {"prompt_version": 2, "meta": {...}, "questions": [{n, type, stem, options, answer: null, ...}]}.

The agent NEVER writes answers: ``answer`` is always null here and is filled by ``ingest.nta_convert`` from the official key.
Per-note optional fields: ``quarantine`` (needs_figure | table | garbled_math ...), ``recheck`` (agent doubt, kept for the audit).
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from ..paths import ROOT

DIR = ROOT / "pipeline" / "extract" / "structured"


def merge(stem: str, expect: int) -> dict[int, dict]:
    notes: dict[int, dict] = {}
    files = sorted(DIR.glob(f"{stem}.notes*.jsonl"), key=lambda p: int(re.search(r"notes(\d*)", p.name).group(1) or 0))
    for f in files:
        for line in f.read_text(encoding="utf-8").splitlines():
            if line.strip():
                r = json.loads(line)
                n = int(r["no"])
                notes[n] = {**notes.get(n, {}), **r}  # later notes override field by field
    missing = [n for n in range(1, expect + 1) if n not in notes]
    if missing:
        raise SystemExit(f"missing question numbers: {missing}")
    return notes


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.extract.merge_notes")
    ap.add_argument("stem")
    ap.add_argument("--exam", required=True)
    ap.add_argument("--year", type=int, required=True)
    ap.add_argument("--session", type=int)
    ap.add_argument("--shift")
    ap.add_argument("--expect", type=int, required=True)
    ap.add_argument("--sections", default="", help="'1-25:MAT,26-50:PHY'")
    a = ap.parse_args(argv)
    notes = merge(a.stem, a.expect)
    secs = []
    for part in filter(None, a.sections.split(",")):
        rng, sub = part.split(":")
        lo, hi = (int(x) for x in rng.split("-"))
        secs.append((lo, hi, sub))
    qs = []
    for n in range(1, a.expect + 1):
        r = notes[n]
        opts = r.get("options")
        if opts is not None and len(opts) != 4:
            raise SystemExit(f"Q{n}: expected 4 options, got {len(opts)}")
        sub = next((s for lo, hi, s in secs if lo <= n <= hi), None)
        qs.append({
            "n": n,
            "type": "SCQ" if opts else "INT",
            "subject": sub,
            "stem": r["stem"],
            "options": [{"key": "ABCD"[i], "text": t} for i, t in enumerate(opts)] if opts else None,
            "answer": None,
            "solution": None,
            "figures": [],
            "confidence": "low" if r.get("recheck") else "high",
            "note": r.get("recheck"),
            "quarantine": r.get("quarantine"),
        })
    out = {"prompt_version": 2,
           "meta": {"title": f"{a.exam} {a.year}", "language": "en",
                    "source": {"exam": a.exam, "year": a.year, "session": a.session, "shift": a.shift},
                    "has_answer_key": False, "has_solutions": False},
           "questions": qs}
    (DIR / f"{a.stem}.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"{len(qs)} questions; quarantine flagged: {sum(1 for q in qs if q['quarantine'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
