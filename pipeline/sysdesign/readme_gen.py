"""Writes content/sources/sysdesign/README.md and coverage.json from the built banks and problems.json.

  python -m pipeline.sysdesign.readme_gen      (run after build and problems_src)
"""
from __future__ import annotations

import json
import sys
from collections import Counter, defaultdict

from ..paths import ROOT
from . import build, dsl

D = ROOT / "content" / "sources" / "sysdesign"
NOTES = """- Handbook tips 24 and 25 ("write-through for write-heavy", "read-through for read-heavy"): write-through adds a synchronous backing-store write to every write, so it is not a write-latency optimisation; write-back or batching is. Not published as a verified answer (questions state the trade-off instead).
- Handbook "Long Polling vs WebSockets": the long-polling paragraph describes plain short polling (client asks at regular intervals). Questions use the standard definition (server holds the request open).
- Handbook availability-tier table is an image and was not extracted; downtime figures in questions are recomputed (365-day year).
- Handbook "10 common questions" differ from the task list (no rate limiter, autocomplete or distributed cache page); `problems.json` follows the handbook's ten.
- Case study 5 (distributed training) says ZeRO stage 2 gives a 2x memory reduction; the ZeRO paper reports up to 8x for stage 2 (stage 1 up to 4x). No question relies on the 2x claim; questions ask concrete per-GPU memory instead.
- Case study 5: 60% MFU at 10,000 GPUs with FP8 is a stated design target, optimistic against published large-run MFUs; 1.979e15 FLOP/s is the dense FP8 peak. Questions say "assume".
- Case study 5: "up to 40% wasted FLOPs from padding" depends on the length distribution; not used.
- Case study 9: the speculative-decoding speedup formula is garbled in the PDF text; questions use the standard expected tokens per step (1 - a^(k+1))/(1 - a).
- Case study 3: eCPM = P(click) x P(conversion|click) x bid x 1000 is right for cost-per-action bids; for cost-per-click bids eCPM = P(click) x bid x 1000, which is what the question uses.
- Case studies 1, 3, 6: "8-bit product quantization = 75% memory reduction" is scalar int8 quantisation (4 bytes to 1); PQ is a different technique. The questions use the int8 arithmetic only. HNSW "O(log N d)" is an empirical statement, not a worst-case bound.
- Case study 1 (spam): the uncertain band is 0.40-0.60 in the fallback text but the PSI example labels 0.4-0.7 as "Uncertain"; harmless but inconsistent.
- Case study 3 of the single PDFs (fraud): fail-open (approve and flag when no hard rule fires) vs the ads case (fail-closed bidding) are policy choices tied to risk, which the questions present as such.
- PSI bands 0.10 and 0.25 are industry rules of thumb, not statistical thresholds.
- Case study 2 (feed ranking): its budget cap was not read; only the cost total (11,100) was checked arithmetically."""


def main() -> int:
    build.load()
    items = dsl.ITEMS
    banks = {s: json.loads(p.read_text(encoding="utf-8")) for s, p in build.OUT.items()}
    allq = banks["SD"] + banks["MSD"]
    tax = build.default_taxonomy().chapter_map()
    per_ch = defaultdict(Counter)
    for it in items:
        per_ch[it["ch"]][it["type"]] += 1
    diff = {s: Counter(q["difficulty"]["label"] for q in qs) for s, qs in banks.items()}
    code = sum(it["via"] == "recomputed-by-code" for it in items)
    chk = sum(it["via"] != "recomputed-by-code" and "Check:" in it["sol"] for it in items)
    other = len(items) - code - chk
    # coverage
    by_src = defaultdict(lambda: {"chapters": set(), "ids": []})
    for it in items:
        src = it["src"] or "general"
        by_src[src]["chapters"].add(it["ch"])
        by_src[src]["ids"].append(dsl.qid(it["stem"]))
    probs = json.loads((D / "problems.json").read_text(encoding="utf-8"))["problems"]
    prob_src = {p["id"]: p["source"] for p in probs}
    cov = {"questions": {k: {"chapters": sorted(v["chapters"]), "ids": sorted(v["ids"])} for k, v in sorted(by_src.items())}, "problems": prob_src}
    (D / "coverage.json").write_text(json.dumps(cov, indent=1) + "\n", encoding="utf-8")

    L = ["# System design and AI/ML system design content", "",
         "Questions and design problems derived from the owner-authored study notes (see `ATTRIBUTION.md`). Structured outlines of the notes are in `extracted/`.", "",
         "## Counts", "",
         f"- System Design (`SD`, track SYS_DESIGN): **{len(banks['SD'])}** questions, E/M/H = {diff['SD']['E']}/{diff['SD']['M']}/{diff['SD']['H']}",
         f"- AI/ML System Design (`MSD`, track ML_SYS_DESIGN): **{len(banks['MSD'])}** questions, E/M/H = {diff['MSD']['E']}/{diff['MSD']['M']}/{diff['MSD']['H']}",
         f"- Design problems: {len(probs)} (10 system design, 8 ML) in `problems.json`", "",
         "### By chapter and type", "", "| Chapter | Name | Total | SCQ | MSQ | NVQ | INT | A/R |", "|---|---|---|---|---|---|---|---|"]
    for cid in tax:
        if cid.split(".")[0] in ("SD", "MSD"):
            c = per_ch[cid]
            L.append(f"| {cid} | {tax[cid].name} | {sum(c.values())} | {c['SCQ']} | {c['MSQ']} | {c['NVQ']} | {c['INT']} | {c['ASSERT_REASON']} |")
    n = len(items)
    L += ["", "## Verification coverage", "",
          f"- Recomputed by code (numeric items; the stored answer IS the script value and the solution is asserted to contain it): **{code}** ({100*code/n:.0f}%)",
          f"- Conceptual items with an explicit independent second derivation (the `Check:` sentence in the solution): **{chk}** ({100*chk/n:.0f}%)",
          f"- Conceptual items cross-checked at definition level only (stated in `Verified by`): **{other}** ({100*other/n:.0f}%)", "",
          "## Regenerate", "", "```",
          "pipeline/.venv/bin/python -m pipeline.sysdesign.taxdef          # SD and MSD taxonomy subjects (idempotent)",
          "pipeline/.venv/bin/python -m pipeline.sysdesign.build           # imports all content modules (asserts), writes both bank_src files",
          "pipeline/.venv/bin/python -m pipeline.sysdesign.problems_src    # writes problems.json",
          "pipeline/.venv/bin/python -m pipeline.sysdesign.readme_gen      # this README and coverage.json",
          "pipeline/.venv/bin/python -m pipeline.validate pipeline/bank_src/sysdesign.json pipeline/bank_src/ml_sysdesign.json", "```", "",
          "## Coverage: notes section -> chapters, questions, problems", "",
          "Question ids per section are in `coverage.json`. Tags: `hb:` handbook section (F fundamentals, T trade-offs, P patterns, Q common questions), `ml1`..`ml6` single-case PDFs, `cs1`..`cs10` combined case studies.", "",
          "| Source section | Chapters | Questions | Design problems |", "|---|---|---|---|"]
    for src, v in sorted(by_src.items()):
        tag = src.split(" ")[0]
        tags = {x for x in tag.split(",") if x} or {tag}
        pr = ", ".join(pid for pid, s in prob_src.items() if tags & {x.strip() for x in s.split("+")})
        L.append(f"| {src} | {', '.join(sorted(v['chapters']))} | {len(v['ids'])} | {pr or ''} |")
    L += ["", "Problem sources: " + "; ".join(f"`{k}` <- {v}" for k, v in prob_src.items()), "",
          "## Not included on purpose", "",
          "- No figures, diagrams or page images (items are text only); the PDFs are not in the repo.",
          "- Vendor-specific prices and numbers that change over time are used only where the owner's notes state them as stated assumptions in the question.",
          "- Claims in the notes that looked wrong or outdated (see below) are not published as verified answers.",
          "- Questions are not yet wired into `publish`; the orchestrator publishes the bank.", "",
          "## Notes to double-check (owner)", "", NOTES, ""]
    (D / "README.md").write_text("\n".join(L), encoding="utf-8")
    print("README written;", code, chk, other)
    return 0


if __name__ == "__main__":
    sys.exit(main())
