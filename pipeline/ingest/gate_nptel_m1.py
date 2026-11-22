"""Build the HELD bank file for NPTEL GATE DA Mock Test 1 (pipeline/gate_da/nptel/data_m1.json).

  python -m pipeline.ingest.gate_nptel_m1
      -> pipeline/held_pending_permission/gate_da_nptel_m1.json              accepted questions
         pipeline/held_pending_permission/gate_da_nptel_m1.needs_review.json quarantined + key mismatches
         pipeline/held_pending_permission/gate_da_nptel_m1.report.md
         pipeline/gate_da/nptel/marks_m1.json                                id -> marks, section

Modes (see data): C recomputed in checks_m1 (match -> verified; mismatch -> needs_review file), K conceptual
(status needs_review, key kept), X manual mismatch, Q quarantine. The PDF key is never silently changed.
The held location is outside pipeline/bank_src, so pipeline.publish does not pick it up.
"""
from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter, defaultdict

from ..gate_da.nptel import checks_m1
from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question

MOCK = 1
DATA = ROOT / "pipeline" / "gate_da" / "nptel" / "data_m1.json"
HELD = ROOT / "pipeline" / "held_pending_permission"
OUT = HELD / "gate_da_nptel_m1.json"
REV = HELD / "gate_da_nptel_m1.needs_review.json"
REPORT = HELD / "gate_da_nptel_m1.report.md"
MARKS = ROOT / "pipeline" / "gate_da" / "nptel" / "marks_m1.json"
BANK_SRC = ROOT / "pipeline" / "bank_src"
LICENSE = "Freely downloadable NPTEL GATE DA mock tests; provided by the project owner"
SRC_URL = "Gate_DA_Nptel_mocks.pdf"
DIFF = {1: ("M", -0.2), 2: ("M", 0.4)}


def qid(mock: int, n: int) -> str:
    return "q_" + hashlib.sha1(f"gate_da_nptel|{mock}|{n}".encode()).hexdigest()[:12]


def marks_of(n: int) -> int:
    """Not printed in the PDF. Inferred from the GATE DA layout: GA Q21-25 one mark, Q26-30 two marks;
    of the 55 technical questions in order (Q1-20, Q31-65) the first 25 carry one mark, the last 30 two."""
    if 21 <= n <= 30:
        return 1 if n <= 25 else 2
    return 1 if (n <= 20 or n <= 35) else 2


def section_of(qtype: str, marks: int, ga: bool) -> str:
    if ga:
        return "GA1" if marks == 1 else "GA2"
    return ("T1M" if marks == 1 else "T2M") + "-" + {"SCQ": "MCQ", "MSQ": "MSQ", "NVQ": "NAT"}[qtype]


def fmt_num(v: float) -> str:
    return f"{v:.6g}"


def main() -> int:
    tax = default_taxonomy()
    recs = json.loads(DATA.read_text(encoding="utf-8"))
    checks = checks_m1.c()
    assert [r["n"] for r in recs] == list(range(1, 66))
    existing = set()
    for f in BANK_SRC.glob("*.json"):
        existing |= {q["id"] for q in json.loads(f.read_text(encoding="utf-8"))}
    out, rev, marks = [], [], {}
    stats = []
    for r in recs:
        n, mode = r["n"], r["mode"]
        numeric = r["opts"] is None
        base = {"mock": MOCK, "n": n, "id": qid(MOCK, n), "chapter": r["ch"], "type": "NVQ" if numeric else ("MSQ" if "," in r["key"] else "SCQ"),
                "pdf_key": r["key"], "stem": r["stem"], "options": r["opts"]}
        if mode in ("Q", "X"):
            rev.append({**base, "category": "quarantine" if mode == "Q" else "key_mismatch_manual", "reason": r["reason"] or "", "derived_answer": r["derived"], "derivation": r["sol"]})
            stats.append((n, mode, r["ch"], base["type"])); continue
        verified = False
        if mode == "C":
            assert n in checks, f"no check for Q{n}"
            got = checks[n]
            if numeric:
                ok = abs(got - float(r["key"])) <= (r["tol"] or 0) + 1e-9
                got_s = fmt_num(got)
            else:
                ok = got == ",".join(sorted(r["key"].split(",")))
                got_s = got
            if not ok:
                rev.append({**base, "category": "key_mismatch", "reason": "PDF key differs from the independently recomputed answer",
                            "recomputed_answer": got_s, "derivation": r["sol"]})
                stats.append((n, "M", r["ch"], base["type"])); continue
            verified = True
        sol = r["sol"] + ("\n\n*Verified by: recomputed-by-code.*" if verified else
                          "\n\nKey from PDF, not independently verified by code (it agrees with the reasoning above).\n\n*Verified by: key from source, conceptual.*")
        mk = marks_of(n)
        label, b = DIFF[mk]
        if numeric:
            v, tol = float(r["key"]), r["tol"] or 0.0
            ans = {"range": [round(v - tol, 9), round(v + tol, 9)]}
            options = None
        else:
            ans = {"keys": sorted(r["key"].split(","))}
            options = [{"key": chr(65 + i), "text": t} for i, t in enumerate(r["opts"])]
        d = {"id": qid(MOCK, n), "type": base["type"], "stem": r["stem"], "images": [], "answer": ans, "solution": sol,
             "solution_source": "in_house", "tax": {"subject": r["ch"].split(".")[0], "chapter": r["ch"], "topics": [], "concepts": []},
             "skills": ["calculation" if numeric or verified else "conceptual"], "appearances": [],
             "in_syllabus": {"GATE_DA": {"2027": True}}, "difficulty": {"label": label, "b": b, "n": 0},
             "source": {"kind": "user", "license": LICENSE, "url": SRC_URL}, "status": "verified" if verified else "needs_review", "version": 1}
        if options:
            d["options"] = options
        res = validate_question(d, tax, f"m1q{n}")
        if not res.ok:
            rev.append({**base, "category": "validation", "reason": "; ".join(res.errors)[:400], "derivation": r["sol"]})
            stats.append((n, "V", r["ch"], base["type"])); continue
        assert d["id"] not in existing, d["id"]
        out.append(d)
        marks[d["id"]] = {"mock": MOCK, "n": n, "marks": mk, "section": section_of(d["type"], mk, r["ch"].startswith("GA"))}
        stats.append((n, "ok" if verified else "K", r["ch"], d["type"]))

    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    REV.write_text(json.dumps(rev, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    MARKS.write_text(json.dumps(marks, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    write_report(out, rev, stats)
    print("accepted", len(out), "(verified", sum(q["status"] == "verified" for q in out), ") needs_review file", len(rev))
    print(Counter(c for _, c, _, _ in stats))
    return 0


def write_report(out, rev, stats) -> None:
    L = ["# NPTEL GATE DA Mock Test 1: held extraction report", "",
         "Source: `Gate_DA_Nptel_mocks.pdf` pages 1-14 (Mock Test 1, 65 questions, answer key on page 14). Held outside `pipeline/bank_src/`; release by moving the accepted file (see docs/13_GATE_DA.md).", ""]
    ver = [q for q in out if q["status"] == "verified"]
    L += [f"- Accepted into `gate_da_nptel_m1.json`: **{len(out)}** ({len(ver)} verified by code recomputation, {len(out) - len(ver)} conceptual with status `needs_review`).",
          f"- In `gate_da_nptel_m1.needs_review.json`: **{len(rev)}** ({sum(r['category'] == 'quarantine' for r in rev)} quarantined for missing context/figures, "
          f"{sum(r['category'].startswith('key_mismatch') for r in rev)} key mismatches).", "",
          "Marks are not printed in the PDF; inferred from the GATE DA layout (GA Q21-25 one mark, Q26-30 two; of the 55 technical questions the first 25 one mark, the last 30 two) and stored in `pipeline/gate_da/nptel/marks_m1.json`.", "",
          "## Accepted by type and chapter", ""]
    L.append("By type: " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(q["type"] for q in out).items())))
    L.append("")
    L.append("By chapter: " + ", ".join(f"{k} {v}" for k, v in sorted(Counter(q["tax"]["chapter"] for q in out).items())))
    L += ["", "## Quarantined (missing or broken context)", ""]
    for r in rev:
        if r["category"] == "quarantine":
            L.append(f"- Q{r['n']} ({r['chapter']}, PDF key {r['pdf_key']}): {r['reason']}")
    L += ["", "## Key mismatches (PDF key vs independent recomputation)", ""]
    for r in rev:
        if r["category"].startswith("key_mismatch"):
            L.append(f"- Q{r['n']} ({r['chapter']}): PDF key **{r['pdf_key']}**, recomputed **{r.get('recomputed_answer') or r.get('derived_answer')}**.")
    L += ["", "## Chapter mapping (all 65)", ""]
    byc = defaultdict(list)
    for n, st, ch, ty in stats:
        byc[ch].append(f"Q{n}")
    for ch in sorted(byc):
        L.append(f"- {ch}: {', '.join(byc[ch])}")
    L += ["", "## Pages not read confidently", "", "None. All 14 pages were rendered and read. Q13 and Q19 are cut off at the right page edge in the PDF itself (quarantined).", ""]
    REPORT.write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main())
