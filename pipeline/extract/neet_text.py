"""Mechanical first pass for text-layer NEET UG booklets (bilingual two-column layout).

    python -m pipeline.extract.neet_text PDF STEM [--expect 180]

Writes ``pipeline/extract/structured/<STEM>.notes0.jsonl``: one {no, stem, options[4], quarantine?} per question
(English column only). Rules: soft-wrapped lines are joined; (1)-(4) options split; a question that mentions a figure /
diagram / graph / circuit etc. is flagged ``needs_figure`` (the figure is not in the text layer).
Math is NOT repaired here (pdftotext puts fractions / sub- / superscripts on separate lines and maps some glyphs
to digits, e.g. the degree sign); the structuring agent reads every question and writes corrected notes
(``notes1.jsonl`` ...) which override these by question number.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

from ..paths import ROOT
from . import pdf_text as P

OUT = ROOT / "pipeline" / "extract" / "structured"
FIG = re.compile(r"\b(figure|fig\.|diagram|graph|circuit|shown below|as shown|given below is|curve|structure of the)\b", re.I)


_TAIL = re.compile(r"\s+(?:\d{1,2}\s+)?(?:H3|Hindi\+English)\s*$|\s+\d{1,2}\s{5,}\S*\s*$")


def join(t: str) -> str:
    t = _TAIL.sub("", t.rstrip())
    lines = [ln.strip() for ln in t.strip().splitlines()]
    out, buf = [], []
    for ln in lines:
        if not ln:
            if buf:
                out.append(" ".join(buf)); buf = []
            continue
        buf.append(ln)
    if buf:
        out.append(" ".join(buf))
    return "\n\n".join(out)


_ROMAN = re.compile(r"^\(\s*(i|ii|iii|iv)\s*\)(?:\s+\(\s*(i|ii|iii|iv)\s*\)){3}$")


def match_option(o: str) -> str:
    """'(ii)  (iv)  (iii)  (i)' (a match-the-columns answer row) -> '(a)-(ii), (b)-(iv), (c)-(iii), (d)-(i)'."""
    o = re.sub(r"\s+", " ", o.strip())
    if _ROMAN.match(o):
        return ", ".join(f"({k})-{v}" for k, v in zip("abcd", re.findall(r"\(\s*(?:i|ii|iii|iv)\s*\)", o)))
    return o


def run(pdf: Path, stem: str, expect: int) -> int:
    crop = P.detect_english_column(pdf)
    pages = P.pages_text(pdf, crop)
    text = "\n".join(pages[1:])  # page 1 = cover/instructions
    text = re.sub(r"-o0o-.*", "", text, flags=re.S)
    chunks = P.split_questions(text, expect)
    OUT.mkdir(parents=True, exist_ok=True)
    rows, bad = [], []
    for n in range(1, expect + 1):
        c = chunks.get(n)
        sp = P.split_options(c) if c else None
        if not sp:
            bad.append(n)
            continue
        qstem, opts = sp
        row = {"no": n, "stem": join(qstem), "options": [match_option(join(o)) for o in opts]}
        if FIG.search(row["stem"]):
            row["quarantine"] = "needs_figure"
        rows.append(row)
    (OUT / f"{stem}.notes0.jsonl").write_text("".join(json.dumps(r, ensure_ascii=False) + "\n" for r in rows), encoding="utf-8")
    print(f"column={crop} chunks={len(chunks)} written={len(rows)} unparsed={bad} flagged_fig={sum(1 for r in rows if r.get('quarantine'))}")
    return 1 if bad else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.extract.neet_text")
    ap.add_argument("pdf", type=Path)
    ap.add_argument("stem")
    ap.add_argument("--expect", type=int, default=180)
    a = ap.parse_args(argv)
    return run(a.pdf, a.stem, a.expect)


if __name__ == "__main__":
    sys.exit(main())
