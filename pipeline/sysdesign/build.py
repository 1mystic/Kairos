"""Build pipeline/bank_src/sysdesign.json and ml_sysdesign.json from the content modules (imports re-run all asserts).

  python -m pipeline.sysdesign.build
"""
from __future__ import annotations

import importlib
import json
import sys
from collections import Counter

from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question
from . import dsl

SD_MODULES = ["sd_core1", "sd_core2", "sd_core3", "sd_trade", "sd_pat"]
MSD_MODULES = ["msd_a", "msd_b"]
OUT = {"SD": ROOT / "pipeline" / "bank_src" / "sysdesign.json", "MSD": ROOT / "pipeline" / "bank_src" / "ml_sysdesign.json"}
EXAM = {"SD": "SYS_DESIGN", "MSD": "ML_SYS_DESIGN"}
DIFF_B = {"E": -0.9, "M": 0.1, "H": 1.1}
LICENSE = "Original work of the Kairos project"


def load() -> None:
    for m in SD_MODULES + MSD_MODULES:
        try:
            importlib.import_module(f"pipeline.sysdesign.{m}")
        except ModuleNotFoundError as e:
            if e.name != f"pipeline.sysdesign.{m}":
                raise


def other_stems() -> set[str]:
    s: set[str] = set()
    for f in (ROOT / "pipeline" / "bank_src").glob("*.json"):
        if f.name in ("sysdesign.json", "ml_sysdesign.json"):
            continue
        for q in json.loads(f.read_text(encoding="utf-8")):
            s.add(" ".join(q["stem"].lower().split()))
    return s


def via_text(it: dict) -> str:
    if it["via"] == "recomputed-by-code":
        return "recomputed by script (the stored answer is the computed value)"
    if "Check:" in it["sol"]:
        return "independent second derivation (see the Check sentence) against the owner's study notes and standard references"
    return "definition-level cross-check against the owner's study notes and standard references"


def to_question(it: dict) -> dict:
    subj = it["ch"].split(".")[0]
    skill = it["skill"]
    q = {
        "id": dsl.qid(it["stem"]), "type": it["type"], "stem": it["stem"], "images": [],
        "answer": it["answer"], "solution": it["sol"] + f"\n\n*Verified by: {via_text(it)}.*", "solution_source": "in_house",
        "tax": {"subject": subj, "chapter": it["ch"], "topics": [], "concepts": []},
        "skills": [skill], "appearances": [], "in_syllabus": {EXAM[subj]: {"2026": True}},
        "difficulty": {"label": it["d"], "b": DIFF_B[it["d"]], "n": 0},
        "source": {"kind": "authored", "license": LICENSE}, "status": "verified", "version": 1,
    }
    if it["options"]:
        q["options"] = [{"key": dsl.LETTERS[i], "text": t} for i, t in enumerate(it["options"])]
    return q


def main() -> int:
    load()
    tax = default_taxonomy()
    chapters = tax.chapter_map()
    seen = other_stems()
    out: dict[str, list] = {"SD": [], "MSD": []}
    errors = []
    for it in dsl.ITEMS:
        if it["ch"] not in chapters:
            errors.append(f"unknown chapter {it['ch']}")
            continue
        if " ".join(it["stem"].lower().split()) in seen:
            errors.append(f"dup of existing bank stem: {it['stem'][:60]}")
            continue
        q = to_question(it)
        r = validate_question(q, tax, it["stem"][:30])
        if not r.ok:
            errors.append(f"{it['stem'][:40]}: {'; '.join(r.errors)[:200]}")
            continue
        out[q["tax"]["subject"]].append(q)
    if errors:
        raise SystemExit("build failed:\n" + "\n".join(errors))
    for s, qs in out.items():
        qs.sort(key=lambda d: d["id"])
        OUT[s].write_text(json.dumps(qs, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        print(s, len(qs), dict(Counter(q["type"] for q in qs)), dict(Counter(q["difficulty"]["label"] for q in qs)))
    per = Counter(it["ch"] for it in dsl.ITEMS)
    thin = {c: per.get(c, 0) for c in chapters if c.split(".")[0] in ("SD", "MSD") and per.get(c, 0) < 10}
    print("chapters below 10:", thin)
    return 0


if __name__ == "__main__":
    sys.exit(main())
