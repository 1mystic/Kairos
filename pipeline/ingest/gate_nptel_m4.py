"""Convert NPTEL GATE DA Mock Test 4 (owner-supplied PDF, pdf pages 37-48) into held Kairos questions.

  python -m pipeline.ingest.gate_nptel_m4
      -> pipeline/held_pending_permission/gate_da_nptel_m4.json              (accepted, status verified)
         pipeline/held_pending_permission/gate_da_nptel_m4.needs_review.json (quarantined / key mismatches)
         pipeline/held_pending_permission/gate_da_nptel_m4.report.md
         pipeline/gate_da/nptel/marks_m4.json                                (id -> n, marks, basis, section, status)

Input: pipeline/gate_da/nptel/data_m4.json (hand-transcribed stems/options/keys) and checks_m4.py (independent recomputation).
Every computable answer is recomputed; a mismatch with the PDF key goes to needs_review with both answers (never silently picked).
Held outside bank_src/ so pipeline.publish does not publish it by default.
"""
from __future__ import annotations

import hashlib
from fractions import Fraction
import json
import sys
from collections import Counter
from pathlib import Path

from ..gate_da.nptel import checks_m4
from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question
from .gate_qbank import norm_stem

N = 4
DATA = ROOT / "pipeline" / "gate_da" / "nptel" / f"data_m{N}.json"
HELD = ROOT / "pipeline" / "held_pending_permission"
OUT = HELD / f"gate_da_nptel_m{N}.json"
REVIEW = HELD / f"gate_da_nptel_m{N}.needs_review.json"
REPORT = HELD / f"gate_da_nptel_m{N}.report.md"
MARKS = ROOT / "pipeline" / "gate_da" / "nptel" / f"marks_m{N}.json"
BANK_SRC = ROOT / "pipeline" / "bank_src"
LICENSE = "Freely downloadable NPTEL GATE DA mock tests; provided by the project owner"
DIFF = {1: ("M", -0.2), 2: ("M", 0.4)}

# The PDF prints no marks. GA: Q21-25 one mark, Q26-30 two (GATE pattern). Subject: 25 one-mark of 55; the split below is a
# cautious heuristic (short conceptual / one-step items = 1 mark) and is recorded as inferred.
ONE_MARK_SUBJECT = {1, 4, 6, 7, 10, 11, 16, 17, 19, 20, 34, 36, 37, 39, 41, 42, 45, 46, 47, 50, 51, 52, 56, 57, 63}


def marks_of(n: int) -> int:
    if 21 <= n <= 25: return 1
    if 26 <= n <= 30: return 2
    return 1 if n in ONE_MARK_SUBJECT else 2


def qid(n: int) -> str:
    return "q_" + hashlib.sha1(f"gate_da_nptel|{N}|{n}".encode()).hexdigest()[:12]


def section_of(qt: str, marks: int, subject: str) -> str:
    if subject == "GA":
        return "GA1" if marks == 1 else "GA2"
    return ("T1M" if marks == 1 else "T2M") + "-" + {"SCQ": "MCQ", "MSQ": "MSQ", "NVQ": "NAT"}[qt]


def fmt(a):
    if isinstance(a, (set, frozenset)): return sorted(a)
    if isinstance(a, dict): return {k: str(v) for k, v in a.items()}
    return a


def main() -> int:
    tax = default_taxonomy()
    recs = json.loads(DATA.read_text(encoding="utf-8"))
    chk = checks_m4.c()
    existing_ids, existing_norm = set(), {}
    for f in sorted(BANK_SRC.glob("*.json")):
        for q in json.loads(f.read_text(encoding="utf-8")):
            existing_ids.add(q["id"]); existing_norm.setdefault(norm_stem(q["stem"], q.get("options")), q["id"])
    out, review, marks, seen = [], [], {}, {}

    def to_review(r, reason, detail, recomputed=None, derivation=None):
        review.append({"n": r["n"], "id": qid(r["n"]), "chapter": r["chapter"], "marks": marks_of(r["n"]), "reason": reason, "detail": detail,
                       "pdf_key": r["pdf_key"], "recomputed": fmt(recomputed), "derivation": derivation,
                       "stem": r["stem"], "options": r["options"]})
        marks[qid(r["n"])] = {"n": r["n"], "marks": marks_of(r["n"]), "marks_basis": "inferred", "status": "needs_review", "reason": reason}

    for r in recs:
        n = r["n"]; c = chk.get(n)
        if r["chapter"] not in tax.chapter_map():
            to_review(r, "chapter", f"unknown chapter {r['chapter']}"); continue
        if r["quarantine"]:
            to_review(r, "quarantine", r["quarantine"], c and c["ans"], c and c["how"]); continue
        key = r["pdf_key"]; opts = r["options"]
        if opts:
            have = {o["key"] for o in opts}
            if not set(key) <= have:
                to_review(r, "key_not_in_options", f"key {key} not among {sorted(have)}"); continue
        if c is not None:
            if opts:
                a = c["ans"]
                if isinstance(a, (int, float)):  # numeric result: find the option(s) with that value
                    val = lambda t: float(Fraction(t.strip()))
                    a = {o["key"] for o in opts if abs(val(o["text"]) - float(a)) < 1e-9}
                    c["ans"] = a
                same = set(key) == set(a)
            else:
                tol = 0 if not r["decimals"] else 0.5 * 10 ** -r["decimals"]
                same = abs(float(key[0]) - float(c["ans"])) <= tol + 1e-9
            if not same:
                to_review(r, "answer_mismatch", f"PDF key {key} vs recomputed {fmt(c['ans'])}", c["ans"], c["how"]); continue
        marks_n = marks_of(n)
        solution = r["solution"]
        if "Verified by:" not in solution:
            solution += "\n\nVerified by: " + ("recomputed-by-code." if c is not None else "key from source, conceptual.")
        if opts:
            qt = "MSQ" if len(key) > 1 else "SCQ"
            ans = {"keys": sorted(key)}; options = [{"key": o["key"], "text": o["text"]} for o in opts]; skills = ["conceptual"]
        else:
            qt = "NVQ"; v = float(key[0]); tol = 0 if not r["decimals"] else 0.5 * 10 ** -r["decimals"]
            ans = {"range": [round(v - tol, 9), round(v + tol, 9)]}; options = None; skills = ["calculation"]
        label, b = DIFF[marks_n]
        d = {"id": qid(n), "type": qt, "stem": r["stem"], "images": [], "answer": ans, "solution": solution, "solution_source": "in_house",
             "tax": {"subject": r["chapter"].split(".")[0], "chapter": r["chapter"], "topics": [], "concepts": []}, "skills": skills,
             "appearances": [], "in_syllabus": {"GATE_DA": {"2027": True}}, "difficulty": {"label": label, "b": b, "n": 0},
             "source": {"kind": "user", "license": LICENSE, "url": None}, "status": "verified", "version": 1}
        if options: d["options"] = options
        if d["id"] in existing_ids:
            to_review(r, "id_collision", d["id"]); continue
        ns = norm_stem(d["stem"], d.get("options"))
        if ns in existing_norm:
            to_review(r, "duplicate", f"same normalised stem+options as {existing_norm[ns]}"); continue
        if ns in seen:
            to_review(r, "duplicate", f"same as Q{seen[ns]}"); continue
        res = validate_question(d, tax, f"q{n}")
        if not res.ok:
            to_review(r, "validation", "; ".join(res.errors)[:400]); continue
        seen[ns] = n; out.append(d)
        marks[d["id"]] = {"n": n, "marks": marks_n, "marks_basis": "inferred", "status": "verified",
                          "section": section_of(qt, marks_n, d["tax"]["subject"]), "recomputed": c is not None}
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    REVIEW.write_text(json.dumps(review, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    MARKS.write_text(json.dumps(marks, indent=1, sort_keys=True) + "\n", encoding="utf-8")

    L = [f"# NPTEL GATE DA Mock {N}: extraction report", "",
         f"Source: Gate_DA_Nptel_mocks.pdf pages 37-48. License: {LICENSE}.", "",
         f"Questions in PDF: {len(recs)}. Accepted (verified): {len(out)}. Needs review / quarantined: {len(review)}.", "",
         "Marks are not printed in the PDF; they are inferred (GA Q21-25 one mark, Q26-30 two; subject marks by a cautious heuristic) and recorded in marks_m4.json with basis 'inferred'.", "",
         "## Accepted by type", "", *[f"- {k}: {v}" for k, v in sorted(Counter(q["type"] for q in out).items())], "",
         "## Accepted by chapter", "", *[f"- {k}: {v}" for k, v in sorted(Counter(q["tax"]["chapter"] for q in out).items())], "",
         f"Recomputed by code: {sum(1 for m in marks.values() if m.get('recomputed'))}; conceptual (key from source): "
         f"{[m['n'] for m in marks.values() if m['status']=='verified' and not m.get('recomputed')]}", "",
         "## Needs review / quarantined", "", "| Q | chapter | reason | PDF key | recomputed | note |", "|---|---|---|---|---|---|"]
    for e in sorted(review, key=lambda e: e["n"]):
        L.append(f"| {e['n']} | {e['chapter']} | {e['reason']} | {e['pdf_key']} | {e['recomputed']} | {(e['detail'] or '')[:200]} |")
    L += ["", "## Key mismatches (PDF key vs independent recomputation)", ""]
    for e in sorted(review, key=lambda e: e["n"]):
        if e["reason"] == "answer_mismatch":
            L.append(f"- Q{e['n']}: PDF {e['pdf_key']}, recomputed {e['recomputed']}. {e['derivation']}")
    L += ["", "## Chapter mapping (all 65)", "", *[f"- Q{r['n']}: {r['chapter']}" for r in recs], "",
          "## Reading notes", "", "- Math in the PDF text layer is garbled; all stems were transcribed from page images (pdf pages 37-48), all read confidently.",
          "- Q31: the exponent is read as $\\sqrt{\\pi}\\,x$; the answer is 0 under either reading.", "- Q3: $f_5=2^n\\log n$ (superscript visible in the image).",
          "- Q40: the PDF key (A, C) contradicts oddness (a minimum exists at $-x_0$); quarantined."]
    REPORT.write_text("\n".join(L) + "\n", encoding="utf-8")
    print("records", len(recs), "accepted", len(out), "needs_review", len(review))
    print("review:", {e["n"]: e["reason"] for e in review})
    print("by type:", dict(Counter(q["type"] for q in out)))
    print("by chapter:", dict(sorted(Counter(q["tax"]["chapter"] for q in out).items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
