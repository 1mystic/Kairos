"""Convert the owner-supplied GATE DA 2027 question bank (content/sources/gate_da/qbank) into pipeline questions.

  python -m pipeline.ingest.gate_qbank            # -> pipeline/bank_src/gate_da_qbank.json
                                                  #    pipeline/quarantine/gate_qbank_rejected.json
                                                  #    pipeline/gate_da/qbank/id_map.json, app/public/img/*.webp

Deterministic and re-runnable. Records that cannot be converted cleanly are quarantined with a reason (never guessed).
Audit-time overrides live in pipeline/gate_da/qbank/audit_status.json (id -> status needs_review + note).
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
from collections import Counter
from fractions import Fraction
from pathlib import Path

from ..gate_da.qbank import xref as X
from ..gate_da.qbank.latex import Ctx, _balanced, convert
from ..images import ProcessedImage, process_image, write_variants
from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question

SRC_DIR = ROOT / "content" / "sources" / "gate_da" / "qbank"
JSONL = SRC_DIR / "GATE_DA_2027_QBank.jsonl"
QB = ROOT / "pipeline" / "gate_da" / "qbank"
OUT = ROOT / "pipeline" / "bank_src" / "gate_da_qbank.json"
QUAR = ROOT / "pipeline" / "quarantine" / "gate_qbank_rejected.json"
IDMAP = QB / "id_map.json"
IMG_OUT = ROOT / "app" / "public" / "img"
BANK_SRC = ROOT / "pipeline" / "bank_src"

LICENSE = "Provided by the project owner (owner confirms rights)"
TYPE_MAP = {"MCQ": "SCQ", "MSQ": "MSQ", "NAT": "NVQ"}
DIFF = {1: ("E", -0.9), 2: ("M", 0.1), 3: ("H", 1.1)}
MOCK_SEC = re.compile(r"^([ABC])\.(\d)\\quad (.+)$")
LABEL = re.compile(r"(?m)^(Idea|Work|Trap|Note|Shortcut):[ \t]*")
XREF = re.compile(r"\bQ\d+\.\d+\b")

# shared-material contexts are attached to EVERY question of their scope in the source; keep them only where used
CTX_MATCH = {
    "Day16-ctx2": r"\$H\$",
    "Day18-ctx1": r"\b(?:Emp|Dept)\b",
    "Day22-ctx1": r"\\mathcal K",
    "Day24-ctx2": r"\\mathcal M",
    "Day25-ctx1": r"conventions|expan|frontier|generated|\\mathcal H|A\*|BFS|DFS|uniform-cost|greedy",
    "Day25-ctx2": r"\\mathcal H",
    "Day26-ctx3": r"\\mathcal T|prun|strateg|principal variation|alpha",
    "Day26-ctx4": r"\\mathcal T_1",
    "Day28-ctx5": r"\\mathcal N",
    "Day28-ctx6": r"\\mathcal G",
}
CTX_DROP = {"Day13-ctx1", "Day30-ctx1", "Day31-ctx2", "Day32-ctx3"}  # trivial / mock instructions (constants handled separately)
CONST_NUMS = {"Day30-ctx1": ["1.96", "2.131"], "Day31-ctx2": ["0.9772", "0.9582", "1.645"]}

_FIG_CACHE: dict[str, tuple[ProcessedImage, str]] = {}
_ALT = json.loads((QB / "figures.json").read_text(encoding="utf-8"))
_NOTES: list[str] = []


def qid(src_id: str) -> str:
    return "q_" + hashlib.sha1(f"gate_da_qbank|{src_id}".encode()).hexdigest()[:12]


def load_figure(path: str) -> tuple[ProcessedImage, str]:
    if path not in _FIG_CACHE:
        f = SRC_DIR / path
        key = f.stem
        if key not in _ALT:
            raise KeyError(f"no alt text for {path}")
        p = process_image(f.read_bytes())
        write_variants(p, IMG_OUT)
        for w in p.warnings:
            _NOTES.append(f"WARN {path}: {w}")
        _FIG_CACHE[path] = (p, _ALT[key])
    return _FIG_CACHE[path]


# ----------------------------------------------------------------------------- answers


def _num(s: str) -> float:
    s = s.strip().replace("\u2212", "-").replace(",", "")
    if re.fullmatch(r"-?\d+/\d+", s):
        return float(Fraction(s))
    return float(s)


def _decimals(s: str) -> int:
    s = s.strip().replace("\u2212", "-")
    if "e" in s.lower() or "/" in s:
        return 0
    return len(s.split(".")[1]) if "." in s else 0


def parse_answer(r: dict) -> tuple[dict | None, str | None, str | None]:
    """-> (answer, error, nat_format)"""
    t, a = r["type"], r["answer"].strip()
    if t == "MCQ":
        if not re.fullmatch(r"[A-D]", a):
            return None, f"answer_parse: MCQ answer {a!r}", None
        return {"keys": [a]}, None, None
    if t == "MSQ":
        ks = [k.strip() for k in a.split(",")]
        if not ks or not all(re.fullmatch(r"[A-D]", k) for k in ks):
            return None, f"answer_parse: MSQ answer {a!r}", None
        return {"keys": sorted(set(ks))}, None, None
    a2 = a.replace("\u2212", "-")
    m = re.fullmatch(r"(-?[\d.]+)\s*(?:\u2013|to)\s*(-?[\d.]+)", a2)
    if m:
        lo, hi = _num(m.group(1)), _num(m.group(2))
        if lo > hi:
            return None, f"answer_parse: range {a!r} lo>hi", None
        return {"range": [lo, hi]}, None, "range" + (" (words 'to')" if " to " in a2 else "")
    try:
        v = _num(a2)
    except ValueError:
        return None, f"answer_parse: NAT answer {a!r}", None
    d = _decimals(a2)
    mm = re.search(r"round(?:ed)?\s+to\s+(\d+)\s+decimal", r["question"])
    if mm:
        d = max(d, int(mm.group(1)))
    fmt = ("unicode-minus " if "\u2212" in a else "") + ("integer" if d == 0 and float(v).is_integer() else f"decimal(d={d})")
    if d == 0:
        return {"value": int(v) if float(v).is_integer() else v, "tol": 0}, None, fmt
    return {"value": v, "tol": round(0.5 * 10 ** (-d), d + 1)}, None, fmt


# ----------------------------------------------------------------------------- tagging


def _load_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def chapter_for(r: dict, secmap: dict, overrides: dict) -> tuple[str | None, str]:
    if r["id"] in overrides:
        return overrides[r["id"]], "override"
    k = f"{r['subject']}||{r['section']}"
    if k in secmap:
        return secmap[k], "section"
    return None, "unmapped"


# ----------------------------------------------------------------------------- contexts


def prep_context(c: dict) -> str:
    t = c["text"].strip()
    cid = c["context_id"]
    m = re.search(r"\\\\\s*\{", t)
    if m:
        b = m.end() - 1
        e = _balanced(t, b)
        cap = t[b + 1 : e]
        cap = re.sub(r",? used in the next \w+ questions", "", cap)
        cap = re.sub(r",? [Uu]sed in [\d. ]+(?:to [\d. ]+)?\.?", ".", cap) if re.search(r"[Uu]sed in \d", cap) else cap
        cap = cap.replace("..", ".")
        t = t[: m.start()] + "\n\n" + cap + t[e + 1 :]
    t = re.sub(r"\s*\(used in every question that mentions[^)]*\)", "", t)
    t = t.replace("for every trace on this day", "for every trace below")
    return t.strip()


# ----------------------------------------------------------------------------- build


def norm_stem(s: str, options: list | None = None) -> str:
    """Normalised stem + options (several workbook stems are just 'Which are correct?')."""
    t = s + "|" + "|".join(o["text"] for o in options or [])
    return re.sub(r"[^a-z0-9|]", "", t.lower())


def build(r: dict, by_id: dict, ctxs_by_id: dict, secmap: dict, overrides: dict, tax) -> tuple[dict | None, dict | None, dict]:
    sid = r["id"]
    info: dict = {}
    issues: list[str] = []
    cv = Ctx()
    used: dict[str, tuple[ProcessedImage, str]] = {}

    def figure(path: str) -> str:
        p, alt = load_figure(path)
        used[p.id] = (p, alt)
        return f"![{alt}](img:{p.id})"

    cv.figure = figure

    ans, err, fmt = parse_answer(r)
    if err:
        return None, {"id": sid, "reason": "answer_parse", "detail": err}, info
    info["nat_format"] = fmt
    opts_src = r.get("options") or {}
    if r["type"] != "NAT":
        if len(opts_src) < 2:
            return None, {"id": sid, "reason": "options", "detail": "missing options"}, info
        missing = [k for k in ans["keys"] if k not in opts_src]
        if missing:
            return None, {"id": sid, "reason": "options", "detail": f"answer keys {missing} not in options"}, info
    elif opts_src:
        return None, {"id": sid, "reason": "options", "detail": "NAT with options"}, info

    # ---- stem (raw LaTeX) with self-containment fixes
    q = r["question"]
    if sid in X.DROP_FIG_CAPTION:
        m = re.search(r"\n*\[FIGURE \d+: [^\]]+\]\s*\\\\\s*\{", q)
        if m:
            e = _balanced(q, m.end() - 1)
            q = (q[: m.start()] + q[e + 1 :]).strip()
        else:
            issues.append("cross_ref: figure block to drop not found")
    if sid in X.DROP_TABLE_CAPTION:
        q = q[: q.index("\\begin{tabular}")].strip()
    for old, new in X.STEM_FIX.get(sid, []):
        if old not in q:
            issues.append(f"cross_ref: stem fix not applicable ({old[:30]!r})")
        else:
            q = q.replace(old, new)
    def expand_tables(txt: str) -> str:
        return re.sub(r"\{\{TABLE:(Q\d+\.\d+)\}\}", lambda m: re.search(r"\\begin\{tabular\}.*?\\end\{tabular\}", by_id[m.group(1)]["question"], re.S).group(0), txt)

    q = expand_tables(q)
    opt_text = " ".join(opts_src.values())
    probe = q + " " + opt_text
    pre: list[str] = []
    if sid in X.VIRTUAL:
        pre.append(expand_tables(X.VIRTUAL[sid]))
    cids = [c["context_id"] for c in r.get("contexts", [])] + X.EXTRA_CTX.get(sid, [])
    tail = ""
    for cid in cids:
        c = ctxs_by_id[cid]
        if cid in CTX_DROP:
            nums = CONST_NUMS.get(cid)
            if nums:
                sol = r["solution"] + " " + r["answer_detail"]
                if any(n in sol for n in nums) and not any(n in q for n in nums):
                    tail = "\n\n" + re.search(r"Take .*$", c["text"].strip()).group(0)
            continue
        rx = CTX_MATCH.get(cid)
        if rx is None:
            issues.append(f"context: no rule for {cid}")
            continue
        if re.search(rx, probe) and not (cid == "Day18-ctx1" and ("\\begin{tabular}" in q or "CREATE TABLE" in q)):
            pre.append(prep_context(c))
    stem_raw = "\n\n".join(pre + [q]) + tail
    stem = convert(stem_raw, cv)

    options = []
    for k, v in opts_src.items():
        options.append({"key": k, "text": convert(v, cv)})

    sol_raw = r["solution"]
    for old, new in X.SOL_FIX.get(sid, []):
        if old not in sol_raw:
            issues.append(f"cross_ref: solution fix not applicable ({old[:30]!r})")
        else:
            sol_raw = sol_raw.replace(old, new)
    solution = convert(sol_raw, cv)
    solution = LABEL.sub(lambda m: f"**{m.group(1)}:** ", solution)
    if not stem.strip() or not solution.strip():
        issues.append("empty: stem or solution")
    for where, txt in (("stem", stem), ("solution", solution), ("options", " ".join(o["text"] for o in options))):
        mm = XREF.search(txt)
        if mm:
            issues.append(f"cross_ref: dangling {mm.group(0)} in {where}")
    issues += cv.issues
    if issues:
        reason = issues[0].split(":")[0]
        return None, {"id": sid, "reason": reason, "detail": "; ".join(sorted(set(issues)))[:400]}, info

    ch, how = chapter_for(r, secmap, overrides)
    if ch is None or ch not in tax.chapter_map():
        return None, {"id": sid, "reason": "chapter", "detail": f"unmapped section {r['subject']!r}/{r['section']!r}"}, info
    info["chapter_how"] = how
    label, b = DIFF[r["difficulty"]]
    d = {
        "id": qid(sid),
        "type": TYPE_MAP[r["type"]],
        "stem": stem,
        "images": [{"id": p.id, "w": p.w, "h": p.h, "alt": alt, "variants": p.widths} for p, alt in used.values()],
        "answer": ans,
        "solution": solution,
        "solution_source": "in_house",
        "tax": {"subject": ch.split(".")[0], "chapter": ch, "topics": [], "concepts": []},
        "skills": ["calculation"] if r["type"] == "NAT" else ["conceptual"],
        "appearances": [],
        "in_syllabus": {"GATE_DA": {"2027": True}},
        "difficulty": {"label": label, "b": b, "n": 0},
        "source": {"kind": "authored", "license": LICENSE, "url": None},
        "status": "verified",
        "version": 1,
    }
    if options:
        d["options"] = options
    return d, None, info


def main(argv=None) -> int:
    tax = default_taxonomy()
    recs = [json.loads(l) for l in JSONL.read_text(encoding="utf-8").splitlines() if l.strip()]
    by_id = {r["id"]: r for r in recs}
    ctxs = {}
    for r in recs:
        for c in r.get("contexts", []):
            ctxs[c["context_id"]] = c
    secmap = _load_json(QB / "section_map.json")
    overrides = _load_json(QB / "chapter_overrides.json")["overrides"]
    audit_p = QB / "audit_status.json"
    audit = _load_json(audit_p)["needs_review"] if audit_p.exists() else {}

    existing: dict[str, str] = {}
    for f in sorted(BANK_SRC.glob("*.json")):
        if f.name == OUT.name:
            continue
        for q in _load_json(f):
            existing.setdefault(norm_stem(q["stem"], q.get("options")), q["id"])

    out, quar, idmap, nat_fmt = [], [], {}, Counter()
    seen_norm: dict[str, str] = {}
    chapter_how = Counter()
    for r in recs:
        d, bad, info = build(r, by_id, ctxs, secmap, overrides, tax)
        if bad:
            quar.append(bad)
            continue
        ns = norm_stem(d["stem"], d.get("options"))
        if ns in existing:
            quar.append({"id": r["id"], "reason": "duplicate", "detail": f"same normalised stem+options as {existing[ns]} in an existing bank file"})
            continue
        if ns in seen_norm:
            quar.append({"id": r["id"], "reason": "duplicate", "detail": f"same normalised stem+options as workbook record {seen_norm[ns]}"})
            idmap[r["id"]] = idmap[seen_norm[ns]]  # alias: mocks may reuse the kept question
            continue
        seen_norm[ns] = r["id"]
        res = validate_question(d, tax, r["id"])
        if not res.ok:
            quar.append({"id": r["id"], "reason": "validation", "detail": "; ".join(res.errors)[:400]})
            continue
        if r["id"] in audit:
            d["status"] = "needs_review"
        out.append(d)
        idmap[r["id"]] = d["id"]
        nat_fmt[info.get("nat_format") or "choice"] += 1
        chapter_how[info.get("chapter_how")] += 1

    OUT.write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    QUAR.write_text(json.dumps(quar, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    IDMAP.write_text(json.dumps(idmap, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("records", len(recs), "converted", len(out), "quarantined", len(quar))
    print("quarantine by reason:", dict(Counter(q["reason"] for q in quar)))
    print("NAT/answer formats:", dict(nat_fmt))
    print("chapter source:", dict(chapter_how))
    print("by type:", dict(Counter(q["type"] for q in out)))
    print("by status:", dict(Counter(q["status"] for q in out)))
    print("by subject:", dict(sorted(Counter(q["tax"]["subject"] for q in out).items())))
    print("by chapter:", dict(sorted(Counter(q["tax"]["chapter"] for q in out).items())))
    print("images:", len(_FIG_CACHE))
    for n in _NOTES:
        print(n)
    return 0


if __name__ == "__main__":
    sys.exit(main())
