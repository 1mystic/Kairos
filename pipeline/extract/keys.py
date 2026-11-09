"""Parse OFFICIAL final answer keys (the only source of `answer` in the pipeline).

  neet_book_key(pdf, book)                     NEET UG key PDFs: ``BOOK : H3`` / ``Test Booklet Code : Q1`` blocks of
                                               ``Q.No Key`` columns -> {qno: "1".."4" | "DROP" | "BONUS"}
  nta_id_key(pdf, date, shift)                 JEE Main CBT keys: ``Exam Date : 02.04.2026  Exam Shift : First`` blocks of
                                               ``QUESTION ID  CORRECT OPTION ID`` triples -> {question_id: option_id | int}
  paper_ids(paper_text)                        JEE Main CBT paper text layer: {qno: (question_id, [option_id x4])}

Special key values are preserved, never guessed: "Dropped" -> "DROP"; "Any non-negative Integer" / "Bonus" -> "BONUS".
Callers must treat DROP/BONUS as "no single official answer": the question keeps ``answer: null`` and stays unpublished.
"""
from __future__ import annotations

import re
import subprocess
from pathlib import Path


def _text(pdf: Path) -> str:
    return subprocess.run(["pdftotext", "-layout", str(pdf), "-"], capture_output=True, text=True, check=True).stdout


def _special(tok: str) -> str | None:
    t = tok.strip().lower()
    if t.startswith("drop"):
        return "DROP"
    if t.startswith("bonus") or t.startswith("any"):
        return "BONUS"
    return None


def neet_book_key(pdf: Path, book: str) -> dict[int, str]:
    txt = _text(pdf)
    blocks = re.split(r"(?=(?:BOOK|Test Booklet Code)\s*:\s*[A-Z0-9]+)", txt)
    block = next((b for b in blocks if re.match(rf"(?:BOOK|Test Booklet Code)\s*:\s*{re.escape(book)}\b", b)), None)
    if block is None:
        raise KeyError(f"booklet {book} not found in {pdf.name}")
    key: dict[int, str] = {}
    for m in re.finditer(r"(?<!\d)(\d{1,3})\s+(\d|[A-Za-z][A-Za-z ]*?)(?=\s{2,}|\s*$|\s+\d{1,3}\s)", block, re.M):
        q, v = int(m.group(1)), m.group(2).strip()
        if not 1 <= q <= 200 or q in key:
            continue
        key[q] = _special(v) or v
    return key


_SHIFT = {"first": "First", "1": "First", "second": "Second", "2": "Second"}


def nta_id_key(pdf: Path, date: str, shift: str) -> dict[str, str]:
    """date 'DD.MM.YYYY'; shift 'First'|'Second'. Question ids are long digit strings, option ids too."""
    txt = _text(pdf)
    want = _SHIFT[str(shift).lower()]
    out: dict[str, str] = {}
    for pg in re.split(r"(?=NATIONAL TESTING AGENCY)", txt):
        m = re.search(r"Exam Date\s*:\s*([\d.]+)\s+Exam Shift\s*:\s*(\w+)", pg)
        if not m or m.group(1) != date or m.group(2) != want:
            continue
        for qm in re.finditer(r"(?<!\d)(\d{6,12})\s{2,}(\d{6,13}|\d{1,6}|Dropped|Any non ?-? ?negative Integer|Bonus)(?!\d)", pg):
            qid, val = qm.group(1), qm.group(2)
            out[qid] = _special(val) or val
    return out


def paper_ids(text: str) -> dict[int, tuple[str, list[str]]]:
    """From the CBT paper text layer: question number -> (question id, option ids in displayed order)."""
    res: dict[int, tuple[str, list[str]]] = {}
    for m in re.finditer(r"Question Number\s*:\s*(\d+)\s+Question Id\s*:\s*(\d+)(.*?)(?=Question Number\s*:\s*\d+\s+Question Id|\Z)", text, re.S):
        qn, qid, body = int(m.group(1)), m.group(2), m.group(3)
        opts = re.findall(r"(?m)^\s*(\d{6,13})\.\s*$", body)
        res[qn] = (qid, opts)
    return res
