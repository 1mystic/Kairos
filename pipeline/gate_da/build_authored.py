"""Build pipeline/bank_src/gate_da_authored.json from the modules in pipeline/gate_da/authored/.

  python -m pipeline.gate_da.build_authored
Importing a module re-runs its in-line verification asserts; any failure aborts the build (nothing is written).
"""
from __future__ import annotations

import importlib
import json
import sys
from collections import Counter

from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question
from . import authored

OUT = ROOT / "pipeline" / "bank_src" / "gate_da_authored.json"
MODULES = ["ga", "prs", "la", "co", "pds", "dbw", "ml", "ai", "extra", "mock_e"]
DIFF_B = {"E": -0.9, "M": 0.1, "H": 1.1}


def load_all() -> list[dict]:
    for m in MODULES:
        try:
            importlib.import_module(f"pipeline.gate_da.authored.{m}")
        except ModuleNotFoundError as e:
            if e.name != f"pipeline.gate_da.authored.{m}":
                raise
    return authored.ITEMS


def build() -> list[dict]:
    tax = default_taxonomy()
    topics = tax.topic_ids()
    out, errors = [], []
    for it in load_all():
        parts = it["ch"].split(".")
        chapter = ".".join(parts[:2])
        sol = it["solution"] + f"\n\n*Verified by: {it['via']}.*"
        q = {
            "id": authored.qid(it["key"]), "type": it["type"], "stem": it["stem"], "images": [],
            "answer": it["answer"], "solution": sol, "solution_source": "in_house",
            "tax": {"subject": parts[0], "chapter": chapter,
                    "topics": [it["ch"]] if len(parts) == 3 and it["ch"] in topics else [], "concepts": []},
            "skills": ["calculation"] if it["type"] == "NVQ" else ["conceptual"],
            "appearances": [], "in_syllabus": {"GATE_DA": {"2027": True}},
            "difficulty": {"label": it["diff"], "b": DIFF_B[it["diff"]], "n": 0},
            "source": {"kind": "authored", "license": "Original work of the Kairos project", "url": None},
            "status": "verified", "version": 1,
        }
        q["source"].pop("url")
        if it["options"]:
            q["options"] = [{"key": authored.LETTERS[i], "text": t} for i, t in enumerate(it["options"])]
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
    print("by subject:", dict(sorted(Counter(q["tax"]["subject"] for q in qs).items())))
    print("by chapter:", dict(sorted(Counter(q["tax"]["chapter"] for q in qs).items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
