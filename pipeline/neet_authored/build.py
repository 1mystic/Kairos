"""Build pipeline/bank_src/authored_neet_iat.json from the modules in this package.

  python -m pipeline.neet_authored.build
Importing a module re-runs its in-line verification asserts; any failure aborts the build.
"""
from __future__ import annotations

import importlib
import json
import re
import sys
from collections import Counter

from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question
from . import ITEMS, qid, LETTERS

OUT = ROOT / "pipeline" / "bank_src" / "authored_neet_iat.json"
MODULES = ["bot_a", "bot_b", "bot_c", "zoo_a", "zoo_b", "phy", "che"]
DIFF_B = {"E": -0.9, "M": 0.1, "H": 1.1}
DIFF_P = {"E": 0.78, "M": 0.55, "H": 0.3}
YEARS = ("2026", "2027")


def load_all() -> list[dict]:
    for m in MODULES:
        try:
            importlib.import_module(f"pipeline.neet_authored.{m}")
        except ModuleNotFoundError as e:
            if e.name != f"pipeline.neet_authored.{m}":
                raise
    return ITEMS


def _norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def existing_stems() -> set[str]:
    out = set()
    for p in (ROOT / "pipeline" / "bank_src").glob("*.json"):
        if p.name == OUT.name:
            continue
        for q in json.loads(p.read_text(encoding="utf-8")):
            out.add(_norm(q.get("stem", "")))
    return out


def build() -> list[dict]:
    tax = default_taxonomy()
    chapters = tax.chapter_map()
    seen = existing_stems()
    out, errors = [], []
    for it in load_all():
        ch = it["ch"]
        subject = ch.split(".")[0]
        flags = chapters[ch].exams
        ins = {e: {y: True for y in YEARS} for e in ("JEE_MAIN", "NEET_UG", "IAT") if getattr(flags, e)}
        sol = it["solution"] + f"\n\n*Verified by: {it['via']}.*"
        skills = ["calculation"] if it["type"] in ("NVQ", "INT") else ["conceptual" if it["diff"] != "E" else "recall"]
        q = {
            "id": qid(it["key"]), "type": it["type"], "stem": it["stem"], "images": [],
            "answer": it["answer"], "solution": sol, "solution_source": "in_house",
            "tax": {"subject": subject, "chapter": ch, "topics": [], "concepts": []},
            "skills": skills, "appearances": [], "in_syllabus": ins,
            "difficulty": {"label": it["diff"], "b": DIFF_B[it["diff"]], "p_correct": DIFF_P[it["diff"]], "n": 0},
            "source": {"kind": "authored", "license": "Original work of the Kairos project"},
            "status": "verified", "version": 1,
        }
        if it["options"]:
            q["options"] = [{"key": LETTERS[i], "text": t} for i, t in enumerate(it["options"])]
        n = _norm(it["stem"])
        if n in seen:
            errors.append(f"{it['key']}: duplicate stem")
            continue
        seen.add(n)
        res = validate_question(q, tax, it["key"])
        if not res.ok:
            errors.append(f"{it['key']}: {'; '.join(res.errors)[:200]}")
            continue
        out.append(q)
    if errors:
        raise SystemExit("authored validation failed:\n" + "\n".join(errors))
    return out


def main() -> int:
    qs = build()
    qs.sort(key=lambda d: d["id"])
    OUT.write_text(json.dumps(qs, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", OUT, len(qs))
    print("by type:", dict(Counter(q["type"] for q in qs)))
    print("by diff:", dict(Counter(q["difficulty"]["label"] for q in qs)))
    print("by chapter:", dict(sorted(Counter(q["tax"]["chapter"] for q in qs).items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
