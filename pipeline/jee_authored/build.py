"""Build pipeline/bank_src/authored_jee_main.json from the modules in pipeline/jee_authored/.

  python -m pipeline.jee_authored.build
Importing a module re-runs its inline verification asserts; any failure aborts (nothing is written).
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
from . import ITEMS, qid

OUT = ROOT / "pipeline" / "bank_src" / "authored_jee_main.json"
MODULES = ["phy_mech", "phy_em", "phy_opt", "che_a", "che_b", "mat_a", "mat_b", "extra"]
DIFF_B = {"E": -0.9, "M": 0.1, "H": 1.1}
YEAR = "2026"


def load_all() -> list[dict]:
    for m in MODULES:
        try:
            importlib.import_module(f"pipeline.jee_authored.{m}")
        except ModuleNotFoundError as e:
            if e.name != f"pipeline.jee_authored.{m}":
                raise
    return ITEMS


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def existing_stems() -> set[str]:
    seen = set()
    for f in list((ROOT / "pipeline" / "bank_src").glob("*.json")) + list((ROOT / "pipeline" / "fixtures" / "questions").glob("*.json")):
        if f.name == OUT.name:
            continue
        for q in json.loads(f.read_text(encoding="utf-8")):
            seen.add(norm(q.get("stem", "")))
    return seen


def build() -> list[dict]:
    tax = default_taxonomy()
    chapters = tax.chapter_map()
    topics = tax.topic_ids()
    taken = existing_stems()
    out, errors = [], []
    for it in load_all():
        parts = it["ch"].split(".")
        chapter = ".".join(parts[:2])
        ch = chapters[chapter]
        exams = {e: {YEAR: True} for e, on in ch.exams.model_dump().items() if on and e in ("JEE_MAIN", "NEET_UG", "IAT")}
        if norm(it["stem"]) in taken:
            errors.append(f"{it['key']}: duplicate stem of an existing bank question")
            continue
        taken.add(norm(it["stem"]))
        sol = it["solution"] + f"\n\n*Verified by: {it['via']}.*"
        q = {
            "id": qid(it["key"]), "type": it["type"], "stem": it["stem"], "images": [],
            "answer": it["answer"], "solution": sol, "solution_source": "in_house",
            "tax": {"subject": parts[0], "chapter": chapter,
                    "topics": [it["ch"]] if len(parts) == 3 and it["ch"] in topics else [], "concepts": []},
            "skills": it["skills"], "appearances": [], "in_syllabus": exams,
            "difficulty": {"label": it["diff"], "b": DIFF_B[it["diff"]], "n": 0},
            "source": {"kind": "authored", "license": "Original work of the Kairos project"},
            "status": "verified", "version": 1,
        }
        if it["options"]:
            q["options"] = [{"key": LETTERS_[i], "text": t} for i, t in enumerate(it["options"])]
        res = validate_question(q, tax, it["key"])
        if not res.ok:
            errors.append(f"{it['key']}: {'; '.join(res.errors)[:300]}")
            continue
        out.append(q)
    if errors:
        raise SystemExit("authored validation failed:\n" + "\n".join(errors))
    return out


LETTERS_ = "ABCDEFGH"


def main() -> int:
    qs = build()
    qs.sort(key=lambda d: d["id"])
    OUT.write_text(json.dumps(qs, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", OUT, len(qs))
    print("by type:", dict(Counter(q["type"] for q in qs)))
    print("by difficulty:", dict(Counter(q["difficulty"]["label"] for q in qs)))
    print("by chapter:", dict(sorted(Counter(q["tax"]["chapter"] for q in qs).items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
