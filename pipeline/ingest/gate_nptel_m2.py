"""Build the HELD questions for NPTEL GATE DA Mock Test 2 (owner-supplied PDF; pdf pages 15-24).

  python -m pipeline.ingest.gate_nptel_m2
    -> pipeline/held_pending_permission/gate_da_nptel_m2.json              accepted items (Kairos schema)
       pipeline/held_pending_permission/gate_da_nptel_m2.needs_review.json quarantined / mismatched items
       pipeline/held_pending_permission/gate_da_nptel_m2.report.md
       pipeline/gate_da/nptel/marks_m2.json                                id -> marks (inferred; PDF shows none)

Not in pipeline/bank_src, so pipeline.publish never picks it up; the owner releases it by moving the file.
Transcription is in pipeline/gate_da/nptel/data_m2.json; answers are recomputed by checks_m2.py. A mismatch is
quarantined with both answers; the PDF key is never silently changed.
"""
from __future__ import annotations

import hashlib
import json
import math
import sys
from collections import Counter
from fractions import Fraction as F

from ..gate_da.nptel import checks_m2
from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question
from .gate_qbank import norm_stem

N = 2
DATA = ROOT / "pipeline" / "gate_da" / "nptel" / f"data_m{N}.json"
HELD = ROOT / "pipeline" / "held_pending_permission"
OUT = HELD / f"gate_da_nptel_m{N}.json"
REVIEW = HELD / f"gate_da_nptel_m{N}.needs_review.json"
REPORT = HELD / f"gate_da_nptel_m{N}.report.md"
MARKS = ROOT / "pipeline" / "gate_da" / "nptel" / f"marks_m{N}.json"
BANK_SRC = ROOT / "pipeline" / "bank_src"
LICENSE = "Freely downloadable NPTEL GATE DA mock tests; provided by the project owner"
DIFF = {1: ("M", -0.2), 2: ("M", 0.4)}


def qid(n: int) -> str:
    return "q_" + hashlib.sha1(f"gate_da_nptel|{N}|{n}".encode()).hexdigest()[:12]


def recomputed() -> dict:
    """n -> comparable recomputed answer (sorted keys list, or float)."""
    c = checks_m2.c()
    out: dict = {}
    out[3] = c[3]
    out[5] = c[5]
    out[9] = float(c[9]); out[10] = c[10]
    out[13] = float(c[13]); out[14] = ["B"] if c[14][0] == 4 else None
    out[20] = c[20]; out[23] = ("val", float(c[23]))
    out[31] = float(c[31]); out[32] = float(c[32][0])
    out[34] = float(c[34])
    out[36] = sorted(k for k, v in c[36].items() if v)
    out[37] = sorted(k for k, v in c[37].items() if v)
    out[38] = c[38]; out[39] = float(c[39])
    l3 = math.log(3); out[40] = ["D"] if abs(c[40] - 3 * l3) < 1e-12 else None
    out[41] = float(c[41]); out[42] = float(c[42]); out[43] = float(c[43])
    out[44] = ["B"] if c[44] == [9.74, 10.26] else None
    out[45] = float(c[45])
    out[46] = ["B"] if c[46] == F(-2, 27) else None
    out[47] = ["A"] if abs(c[47][0] - c[47][1]) < 1e-5 else None
    out[48] = ["D"] if c[48] == 30 else None
    out[49] = sorted(k for k, ok in {"C": c[49]["C: f(y|x)=3y^2"], "D": c[49]["D: E[Y|X]=3/4"], "A": c[49]["A(3x)"], "B": c[49]["B: 3xy^2"]}.items() if ok)
    out[50] = float(c[50]); out[51] = float(c[51])
    out[54] = float(c[54][0])  # right-hand-rule value; opposite convention in c[54][1]
    d = set(c[56])
    out[56] = sorted(k for k, ok in {"A": 0 in d, "B": 1 in d, "C": -1 in d}.items() if ok)
    out[57] = float(c[57])
    out[58] = ["C", "D"]  # A,E false and D true are verified in c[58]
    assert all(c[58].values())
    assert all(c[59].values()) and all(c[60].values())
    out[59] = ["A"]  # d=lambda^2>=0; counterexamples for C,D,E verified in checks
    out[60] = ["A", "C", "D", "E"]  # idempotent example checks (I-A idem, singular, rank=trace)
    out[65] = ["B"] if abs(c[65] - math.log(0.7 / 0.3)) < 1e-12 else None
    return out


def key_list(r):
    return sorted(r["key"]) if "key" in r else None


def main() -> int:
    tax = default_taxonomy()
    data = json.loads(DATA.read_text(encoding="utf-8"))
    rec = recomputed()
    existing_ids, existing_norm = set(), {}
    for f in sorted(BANK_SRC.glob("*.json")):
        for q in json.loads(f.read_text(encoding="utf-8")):
            existing_ids.add(q["id"]); existing_norm.setdefault(norm_stem(q["stem"], q.get("options")), q["id"])

    out, review, marks = [], [], {}
    for r in data["questions"]:
        n = r["n"]
        base = {"n": n, "id": qid(n), "chapter": r["chapter"], "marks_inferred": r["marks"], "stem": r["stem"],
                "options": r.get("options"), "pdf_key": r.get("key", r.get("value"))}
        if r.get("hold"):
            reason = r["hold"]
            e = dict(base, reason=reason, derivation=r.get("derivation", ""))
            if n in rec:
                e["recomputed"] = rec[n]
            review.append(e); continue
        if r["chapter"] not in tax.chapter_map():
            review.append(dict(base, reason="chapter", derivation=r["chapter"])); continue
        opts = r.get("options")
        if "key" in r:
            have = {o["key"] for o in opts}
            if not set(r["key"]) <= have:
                review.append(dict(base, reason="options", derivation=f"key {r['key']} not in options")); continue
            ans = {"keys": sorted(r["key"])}
            qt = "MSQ" if len(r["key"]) > 1 else "SCQ"
            skills = ["conceptual"]
            exp = key_list(r)
        else:
            v, tol = float(r["value"]), float(r.get("tol", 0))
            ans = {"range": [round(v - tol, 9), round(v + tol, 9)]}
            qt, skills, exp, opts = "NVQ", ["calculation"], v, None
        solution = r["solution"].strip()
        if r["verify"] == "code":
            got = rec.get(n)
            ok = got is not None and ((abs(got - exp) <= (float(r.get("tol", 0)) + 1e-9)) if isinstance(exp, float) else got == exp)
            if not ok:
                review.append(dict(base, reason="answer_mismatch", recomputed=got, derivation=r.get("derivation", ""))); continue
            solution += "\n\nVerified by: recomputed-by-code."
        else:
            solution += "\n\nVerified by: key from source, conceptual."
        label, b = DIFF[r["marks"]]
        d = {"id": qid(n), "type": qt, "stem": r["stem"].strip(), "images": [], "answer": ans, "solution": solution,
             "solution_source": "in_house",
             "tax": {"subject": r["chapter"].split(".")[0], "chapter": r["chapter"], "topics": [], "concepts": []},
             "skills": skills, "appearances": [], "in_syllabus": {"GATE_DA": {"2027": True}},
             "difficulty": {"label": label, "b": b, "n": 0},
             "source": {"kind": "user", "license": LICENSE, "url": None}, "status": "verified", "version": 1}
        if opts:
            d["options"] = [{"key": o["key"], "text": o["text"].strip()} for o in opts]
        if d["id"] in existing_ids:
            review.append(dict(base, reason="id_collision", derivation=d["id"])); continue
        ns = norm_stem(d["stem"], d.get("options"))
        if ns in existing_norm:
            review.append(dict(base, reason="duplicate", derivation=f"same stem as {existing_norm[ns]}")); continue
        res = validate_question(d, tax, f"n{n}")
        if not res.ok:
            review.append(dict(base, reason="validation", derivation="; ".join(res.errors)[:400])); continue
        out.append(d); marks[d["id"]] = {"n": n, "marks": r["marks"], "marks_basis": "inferred (PDF shows no marks)"}

    HELD.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    REVIEW.write_text(json.dumps(review, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    MARKS.write_text(json.dumps(marks, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    chap = {r["n"]: r["chapter"] for r in data["questions"]}
    L = [f"# NPTEL GATE DA Mock {N}: held extraction report", "",
         f"Source: Gate_DA_Nptel_mocks.pdf, pdf pages 15-24 (key on page 24). {len(data['questions'])} questions.",
         f"License recorded: {LICENSE}. Held outside pipeline/bank_src; owner publishes after merge.", "",
         f"Accepted: {len(out)}  |  needs_review: {len(review)}", "",
         "Accepted by type: " + str(dict(Counter(q['type'] for q in out))),
         "Accepted by chapter: " + str(dict(sorted(Counter(q['tax']['chapter'] for q in out).items()))),
         "Needs-review by reason: " + str(dict(Counter(e['reason'] for e in review))), "",
         "Marks are NOT shown in the PDF; they are inferred (GA 21-25 one mark, 26-30 two; subject items by effort) and recorded in marks_m2.json.", "",
         "## Needs review", ""]
    for e in review:
        L.append(f"- Q{e['n']} ({e['chapter']}, {e['reason']}): PDF key {e['pdf_key']!r}" + (f"; recomputed {e['recomputed']!r}" if 'recomputed' in e else "") + f". {e['derivation']}")
    L += ["", "## Chapter mapping (all 65)", ""] + [f"- Q{n}: {chap[n]}" for n in sorted(chap)]
    L += ["", "Notes: conceptual accepted items carry 'Verified by: key from source, conceptual.' (reasoning agrees with the key). Assumptions: Q26 repetition allowed; Q50 geometric support starts at 1; Q59 real matrix."]
    REPORT.write_text("\n".join(L) + "\n", encoding="utf-8")
    print("accepted", len(out), "needs_review", len(review))
    print(dict(Counter(q["type"] for q in out))); print(dict(sorted(Counter(q["tax"]["chapter"] for q in out).items())))
    print(dict(Counter(e["reason"] for e in review)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
