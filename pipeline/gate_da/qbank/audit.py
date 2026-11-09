"""Automated structural audit of pipeline/bank_src/gate_da_qbank.json (+ cross-check against the source jsonl).

  python -m pipeline.gate_da.qbank.audit
"""
from __future__ import annotations

import json
import re
import sys
from collections import Counter

from ...paths import ROOT

BANK = ROOT / "pipeline" / "bank_src" / "gate_da_qbank.json"
SRC = ROOT / "content" / "sources" / "gate_da" / "qbank" / "GATE_DA_2027_QBank.jsonl"
IMG = ROOT / "app" / "public" / "img"
FENCE = re.compile(r"```.*?```", re.S)


def outside(t: str) -> str:
    t = FENCE.sub(" ", t)
    t = re.sub(r"\$\$.*?\$\$|\$.*?\$", " ", t, flags=re.S)
    return re.sub(r"`[^`]*`", " ", t)


def main() -> int:
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    src = {}
    for l in SRC.read_text(encoding="utf-8").splitlines():
        r = json.loads(l)
        src[r["id"]] = r
    problems: Counter = Counter()
    ex: dict[str, list[str]] = {}

    def bad(kind: str, qid: str) -> None:
        problems[kind] += 1
        ex.setdefault(kind, []).append(qid)

    for q in bank:
        qid = q["id"]
        texts = {"stem": q["stem"], "solution": q["solution"] or ""} | {f"opt{o['key']}": o["text"] for o in q.get("options") or []}
        if q["type"] in ("SCQ", "MSQ"):
            keys = [o["key"] for o in q["options"]]
            if len(keys) != 4:
                bad("not_4_options", qid)
            if not set(q["answer"]["keys"]) <= set(keys):
                bad("answer_not_in_options", qid)
            if q["answer"]["keys"] != sorted(set(q["answer"]["keys"])):
                bad("msq_keys_unsorted", qid)
            if q["type"] == "SCQ" and len(q["answer"]["keys"]) != 1:
                bad("scq_multi", qid)
            if len({o["text"].strip().lower() for o in q["options"]}) != len(keys):
                bad("duplicate_option_text", qid)
            if any(not o["text"].strip() for o in q["options"]):
                bad("empty_option", qid)
        else:
            a = q["answer"]
            if "range" in a and not a["range"][0] <= a["range"][1]:
                bad("range_order", qid)
            if "value" in a and a.get("tol") is None:
                bad("value_without_tol", qid)
            if "____" not in q["stem"] and not re.search(r"is \$?_|equals|=\s*$", q["stem"]):
                pass
        for k, t in texts.items():
            if not t.strip():
                bad(f"empty_{k[:3]}", qid)
            if FENCE.sub("", t).count("```"):
                bad("unclosed_fence", qid)
            if t.count("```") % 2:
                bad("odd_fence_count", qid)
            if re.search(r"\\[a-zA-Z]+|\\[^\s$]", outside(t)):
                bad("latex_outside_math", qid)
            if re.search(r"\b(?:Q|Question)\s?\d+\.\d+\b", t):
                bad("dangling_xref", qid)
            if re.search(r"\[FIGURE", t):
                bad("figure_placeholder_left", qid)
            if re.search(r"\\(?:mathbbm|textbf|emph|texttt|begin\{tabular)", outside(t)) or "\\mathbbm" in t:
                bad("latex_command", qid)
        # tables
        for t in texts.values():
            lines = t.split("\n")
            for i, l in enumerate(lines[:-1]):
                if l.startswith("|") and re.fullmatch(r"\|(?: ?:?-{3}:? ?\|)+", lines[i + 1].strip()):
                    n = len(re.findall(r"\|", l)) - 1
                    j = i + 2
                    while j < len(lines) and lines[j].startswith("|"):
                        if len(re.findall(r"(?<!\\)\|", lines[j])) - 1 != n:
                            bad("table_columns", qid)
                        j += 1
        for im in q["images"]:
            for w in im["variants"]:
                if not (IMG / f"{im['id']}.w{w}.webp").exists():
                    bad("image_missing", qid)
        if "<" in outside(q["stem"]) and re.search(r"<\s*/?\s*[A-Za-z]", outside(q["stem"])):
            bad("html_like", qid)
    print("converted", len(bank), "problems:", dict(problems) or "none")
    for k, v in ex.items():
        print(" ", k, v[:12])
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
