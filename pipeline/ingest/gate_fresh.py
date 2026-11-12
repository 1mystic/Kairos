"""Convert the owner-supplied GATE DA 2027 "Fresh Set" (content/sources/gate_da/fresh_set) into pipeline questions.

  python -m pipeline.ingest.gate_fresh     # -> pipeline/bank_src/gate_da_fresh.json
                                           #    pipeline/quarantine/gate_fresh_rejected.json
                                           #    pipeline/gate_da/fresh/marks.json  (id -> marks, source n, blueprint section)

Deterministic and re-runnable. Records that cannot be converted cleanly are quarantined with a reason (never guessed).
Numeric answers are recomputed by pipeline/gate_da/fresh/checks_{a,b,c}.py (programs re-typed, nothing from the source is
executed); a mismatch quarantines the record and the owner's key is never silently changed.
"""
from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

from ..gate_da.fresh import checks_a, checks_b, checks_c
from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question
from .gate_qbank import norm_stem

SRC_DIR = ROOT / "content" / "sources" / "gate_da" / "fresh_set"
JSONL = SRC_DIR / "GATE_DA_2027_Fresh_Set.jsonl"
JSON_FULL = SRC_DIR / "GATE_DA_2027_Fresh_Set.json"
OUT = ROOT / "pipeline" / "bank_src" / "gate_da_fresh.json"
QUAR = ROOT / "pipeline" / "quarantine" / "gate_fresh_rejected.json"
MARKS = ROOT / "pipeline" / "gate_da" / "fresh" / "marks.json"
BANK_SRC = ROOT / "pipeline" / "bank_src"
LICENSE = "Provided by the project owner (owner confirms rights)"
# no owner difficulty in the file: 2-mark items are set slightly harder than 1-mark ones
DIFF = {1: ("M", -0.2), 2: ("M", 0.4)}
# owner chapter ids that are not taxonomy chapters (none in this set; kept so a future set can be mapped explicitly)
CHAPTER_FIX: dict[str, str] = {}


def qid(n: int) -> str:
    return "q_" + hashlib.sha1(f"gate_da_fresh|{n}".encode()).hexdigest()[:12]


def numeric_checks() -> dict[int, float]:
    out: dict[int, float] = {}
    for m in (checks_a, checks_b, checks_c):
        for k, v in m.c().items():
            assert k not in out, f"duplicate check for n={k}"
            out[k] = float(v)
    return out


def num_answer(a: dict) -> tuple[dict, float, float]:
    v = float(a["value"]); tol = float(a.get("tol", 0))
    return {"range": [round(v - tol, 9), round(v + tol, 9)]}, v, tol


def section_of(qtype: str, marks: int, subject: str) -> str:
    if subject == "GA":
        return "GA1" if marks == 1 else "GA2"
    pre = "T1M" if marks == 1 else "T2M"
    return f"{pre}-{ {'SCQ': 'MCQ', 'MSQ': 'MSQ', 'NVQ': 'NAT'}[qtype] }"


def build(r: dict, passages: dict, checks: dict, tax) -> tuple[dict | None, dict | None, dict]:
    n = r["n"]
    info: dict = {}
    if r.get("figures"):
        return None, {"n": n, "reason": "figures", "detail": f"references figures not supplied: {r['figures']}"}, info
    if r.get("confidence") != "high" or r.get("note"):
        return None, {"n": n, "reason": "low_confidence", "detail": f"confidence={r.get('confidence')!r} note={r.get('note')!r}"}, info
    ch = CHAPTER_FIX.get(r["chapter"], r["chapter"])
    if ch not in tax.chapter_map():
        return None, {"n": n, "reason": "chapter", "detail": f"unknown chapter {r['chapter']!r}"}, info
    t, a, opts = r["type"], r["answer"], r.get("options")
    stem = r["stem"].strip()
    if r.get("passage_id"):
        p = passages.get(r["passage_id"])
        if not p:
            return None, {"n": n, "reason": "passage", "detail": f"passage {r['passage_id']} missing"}, info
        if r.get("passage") and r["passage"] != p:
            return None, {"n": n, "reason": "passage", "detail": "inline passage differs from passages map"}, info
        stem = p.strip() + "\n\n" + stem
    solution = r["solution"].strip()
    if "keys" in a:
        if not opts or len(opts) < 2:
            return None, {"n": n, "reason": "options", "detail": "choice answer without options"}, info
        have = {o["key"] for o in opts}
        if not set(a["keys"]) <= have:
            return None, {"n": n, "reason": "options", "detail": f"answer {a['keys']} not in options {sorted(have)}"}, info
        qt = "MSQ" if len(a["keys"]) > 1 else "SCQ"
        if t == "MSQ" and qt == "SCQ":
            qt = "MSQ"  # a one-key MSQ is still an MSQ
        if t in ("SCQ", "MATCH") and len(a["keys"]) != 1:
            return None, {"n": n, "reason": "answer", "detail": f"{t} with keys {a['keys']}"}, info
        ans = {"keys": sorted(a["keys"])}
        options = [{"key": o["key"], "text": o["text"].strip()} for o in opts]
        skills = ["conceptual"]
    else:
        if opts:
            return None, {"n": n, "reason": "options", "detail": "numeric answer with options"}, info
        qt = "NVQ"
        ans, v, tol = num_answer(a)
        options = None
        skills = ["calculation"]
        if n in checks:
            if abs(checks[n] - v) > tol + 1e-9:
                return None, {"n": n, "reason": "answer_mismatch", "detail": f"owner key {v} (tol {tol}) vs recomputed {checks[n]!r}"}, info
            info["checked"] = True
            solution += "\n\n*Verified by: recomputed-by-code.*"
        else:
            info["checked"] = False
    label, b = DIFF[r["marks"]]
    d = {
        "id": qid(n),
        "type": qt,
        "stem": stem,
        "images": [],
        "answer": ans,
        "solution": solution,
        "solution_source": "in_house",
        "tax": {"subject": ch.split(".")[0], "chapter": ch, "topics": [], "concepts": []},
        "skills": skills,
        "appearances": [],
        "in_syllabus": {"GATE_DA": {"2027": True}},
        "difficulty": {"label": label, "b": b, "n": 0},
        "source": {"kind": "authored", "license": LICENSE, "url": None},
        "status": "verified",
        "version": 1,
    }
    if options:
        d["options"] = options
    info["section"] = section_of(qt, r["marks"], d["tax"]["subject"])
    return d, None, info


def main(argv=None) -> int:
    tax = default_taxonomy()
    recs = [json.loads(l) for l in JSONL.read_text(encoding="utf-8").splitlines() if l.strip()]
    full = json.loads(JSON_FULL.read_text(encoding="utf-8"))
    passages = {p["id"]: p["text"] for p in full["passages"]}
    assert [r["n"] for r in recs] == [q["n"] for q in full["questions"]], "jsonl and json disagree on record order"
    checks = numeric_checks()
    existing_norm: dict[str, str] = {}
    existing_ids: set[str] = set()
    for f in sorted(BANK_SRC.glob("*.json")):
        if f.name == OUT.name:
            continue
        for q in json.loads(f.read_text(encoding="utf-8")):
            existing_ids.add(q["id"])
            existing_norm.setdefault(norm_stem(q["stem"], q.get("options")), q["id"])

    out, quar, marks, seen = [], [], {}, {}
    nchecked = 0
    for r in recs:
        d, bad, info = build(r, passages, checks, tax)
        if bad:
            quar.append(bad); continue
        if d["id"] in existing_ids:
            quar.append({"n": r["n"], "reason": "id_collision", "detail": d["id"]}); continue
        ns = norm_stem(d["stem"], d.get("options"))
        if ns in existing_norm:
            quar.append({"n": r["n"], "reason": "duplicate", "detail": f"same normalised stem+options as {existing_norm[ns]} in an existing bank file"}); continue
        if ns in seen:
            quar.append({"n": r["n"], "reason": "duplicate", "detail": f"same stem as fresh-set record {seen[ns]}"}); continue
        res = validate_question(d, tax, f"n{r['n']}")
        if not res.ok:
            quar.append({"n": r["n"], "reason": "validation", "detail": "; ".join(res.errors)[:400]}); continue
        seen[ns] = r["n"]
        out.append(d)
        nchecked += bool(info.get("checked"))
        marks[d["id"]] = {"n": r["n"], "marks": r["marks"], "section": info["section"]}

    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    QUAR.write_text(json.dumps(quar, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    MARKS.write_text(json.dumps(marks, indent=1, sort_keys=True) + "\n", encoding="utf-8")
    print("records", len(recs), "accepted", len(out), "quarantined", len(quar), "numeric answers recomputed", nchecked)
    print("quarantine by reason:", dict(Counter(q["reason"] for q in quar)))
    print("by type:", dict(Counter(q["type"] for q in out)))
    print("by chapter:", dict(sorted(Counter(q["tax"]["chapter"] for q in out).items())))
    print("by section:", dict(sorted(Counter(m["section"] for m in marks.values()).items())))
    print("unchecked numeric:", [r["n"] for r in recs if r["type"] in ("INT", "NVQ") and r["n"] not in checks])
    return 0


if __name__ == "__main__":
    sys.exit(main())
