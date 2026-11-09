"""PDF -> per-page text (pdftotext -layout, cached) and question splitting.

    python -m pipeline.extract.pdf_text PDF [--crop-x X --crop-w W] [--info]

Cache: ``<pdf dir>/txt/<pdf stem>[.cx<X>w<W>]/p<NNN>.txt`` (inside the gitignored pipeline/raw tree).

Official papers come in three shapes (see docs in pipeline/README.md):
  * text PDF, single column                       -> pages_text(pdf)
  * text PDF, bilingual two columns (NEET 2020)   -> detect_english_column() then pages_text(pdf, crop=...)
  * image-only (JEE Main 2026 online-paper preview) -> no text layer: render_pages() for reading by the
    structuring agent (vision); the paper's own text layer still carries Question/Option IDs.
"""
from __future__ import annotations

import argparse
import re
import subprocess
import sys
from pathlib import Path


def page_count(pdf: Path) -> int:
    out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    return int(re.search(r"^Pages:\s+(\d+)", out, re.M).group(1))


def page_size(pdf: Path) -> tuple[float, float]:
    out = subprocess.run(["pdfinfo", str(pdf)], capture_output=True, text=True, check=True).stdout
    m = re.search(r"Page size:\s+([\d.]+) x ([\d.]+)", out)
    return float(m.group(1)), float(m.group(2))


def _run(pdf: Path, page: int, crop: tuple[int, int] | None) -> str:
    cmd = ["pdftotext", "-layout", "-f", str(page), "-l", str(page)]
    if crop:
        w, h = page_size(pdf)
        cmd += ["-x", str(crop[0]), "-y", "0", "-W", str(crop[1]), "-H", str(int(h))]
    return subprocess.run(cmd + [str(pdf), "-"], capture_output=True, text=True, check=True).stdout


def pages_text(pdf: Path, crop: tuple[int, int] | None = None, cache: bool = True) -> list[str]:
    """One string per page. ``crop=(x, width)`` in PDF points restricts to a vertical strip (a column)."""
    tag = f".cx{crop[0]}w{crop[1]}" if crop else ""
    cdir = pdf.parent / "txt" / (pdf.stem + tag)
    n = page_count(pdf)
    out: list[str] = []
    for p in range(1, n + 1):
        f = cdir / f"p{p:03d}.txt"
        if cache and f.exists():
            out.append(f.read_text(encoding="utf-8"))
            continue
        t = _run(pdf, p, crop)
        if cache:
            cdir.mkdir(parents=True, exist_ok=True)
            f.write_text(t, encoding="utf-8")
        out.append(t)
    return out


def detect_english_column(pdf: Path, probe_pages: tuple[int, ...] = (3, 4, 5)) -> tuple[int, int] | None:
    """Two-column bilingual layout? Return the (x, width) strip holding the English column, else None.

    Heuristic: on probe pages, compare the share of plain ASCII letters in the left and right halves; the legacy
    Hindi font decodes to Latin-1 symbols (¬ ∑ ‚ ...), so the English half has far fewer non-ASCII characters.
    Single-column pages (few lines in both halves with option markers on the same side) return None.
    """
    w, _ = page_size(pdf)
    half = int(w // 2)
    n = page_count(pdf)
    score = {"L": [0, 0], "R": [0, 0]}  # [ascii-alpha, non-ascii] per half
    marker = {"L": 0, "R": 0}
    for p in probe_pages:
        if p > n:
            continue
        for side, crop in (("L", (0, half)), ("R", (half, int(w) - half))):
            t = _run(pdf, p, crop)
            score[side][0] += len(re.findall(r"[A-Za-z]", t))
            score[side][1] += len(re.findall(r"[^\x00-\x7f]", t))
            marker[side] += len(re.findall(r"\(\s*[1-4]\s*\)", t))
    if min(marker.values()) < 4:
        return None
    ratio = {s: score[s][1] / max(1, score[s][0]) for s in score}
    if ratio["L"] < 0.05 and ratio["R"] < 0.05:
        return None  # both halves are plain Latin text -> not the legacy-Hindi layout
    return (half, int(w) - half) if ratio["R"] <= ratio["L"] else (0, half)


def render_pages(pdf: Path, first: int, last: int, out_dir: Path, dpi: int = 110) -> list[Path]:
    """PNG pages for vision reading (image-only PDFs). Light: one pdftoppm process."""
    out_dir.mkdir(parents=True, exist_ok=True)
    subprocess.run(["pdftoppm", "-png", "-r", str(dpi), "-f", str(first), "-l", str(last), str(pdf),
                    str(out_dir / "pg")], check=True)
    return sorted(out_dir.glob("pg-*.png"))


# ------------------------------------------------------------------ question splitting

_QSTART = re.compile(r"(?m)^[ \t]*(\d{1,3})\.[ \t]+(?=\S)")
_OPT = re.compile(r"(?m)^[ \t]*\(\s*([1-4])\s*\)[ \t]*")
_NOISE = re.compile(r"(?m)^[ \t]*(?:Hindi\+English|H3|\d{1,2})[ \t]*$")  # running headers / page numbers


def clean(text: str) -> str:
    return re.sub(r"\n{3,}", "\n\n", _NOISE.sub("", text))


def split_questions(text: str, expected: int) -> dict[int, str]:
    """Split page-joined text into {qno: chunk}. Numbers must run 1..expected in order (a stray number
    inside a stem, e.g. '5. ' in a list, is ignored unless it is the next expected number)."""
    t = clean(text)
    chunks: dict[int, str] = {}
    nxt, starts = 1, []
    for m in _QSTART.finditer(t):
        if int(m.group(1)) == nxt and nxt <= expected:
            starts.append((nxt, m.start(), m.end()))
            nxt += 1
    for i, (q, _s, e) in enumerate(starts):
        end = starts[i + 1][1] if i + 1 < len(starts) else len(t)
        chunks[q] = t[e:end].rstrip()
    return chunks


def split_options(chunk: str) -> tuple[str, list[str]] | None:
    """Return (stem, [opt1..opt4]) for a chunk whose options are marked (1)..(4) at line start, else None."""
    ms = list(_OPT.finditer(chunk))
    seq, want = [], 1
    for m in ms:
        if int(m.group(1)) == want:
            seq.append(m)
            want += 1
    if len(seq) != 4:
        return None
    stem = chunk[: seq[0].start()]
    opts = [chunk[a.end(): (b.start() if b else len(chunk))] for a, b in zip(seq, seq[1:] + [None])]
    return stem, opts


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.extract.pdf_text")
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--crop-x", type=int)
    ap.add_argument("--crop-w", type=int)
    ap.add_argument("--info", action="store_true")
    a = ap.parse_args(argv)
    crop = (a.crop_x, a.crop_w) if a.crop_w else None
    if a.info:
        print("pages", page_count(a.pdf), "english column", detect_english_column(a.pdf))
        return 0
    pages = pages_text(a.pdf, crop)
    print(f"{len(pages)} pages, {sum(len(p) for p in pages)} chars; cached next to the PDF under txt/")
    return 0


if __name__ == "__main__":
    sys.exit(main())
