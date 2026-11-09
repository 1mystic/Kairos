"""Open-bank adapters for GATE DA (permissive licences only; see content/sources/gate_da/licences.md).

  python -m pipeline.ingest.gate_openbank   # raw files in pipeline/gate_da/raw/{mmlu,math,gsm8k} (gitignored)
        -> pipeline/bank_src/gate_da_openbank.json + pipeline/quarantine/gate_openbank_rejected.json

Sources (all MIT): MMLU test CSVs (hendrycks/test), MATH-500 split (openai/prm800k, from hendrycks/math),
GSM8K test (openai/grade-school-math).  Each item must map to a GATE DA 2027 chapter via
pipeline/tag/gate_da_rules.py (syllabus filter), pass text/LaTeX sanity checks, not need a figure, and
not duplicate another stem.  Explanations are never copied.  Answers: dataset gold (single-correct MCQ,
exact numeric); status 'verified' follows the jeebench precedent (dataset gold accepted).
"""
from __future__ import annotations

import csv
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

from ..paths import ROOT
from ..tag.gate_da_rules import classify_gate
from ..taxonomy import default_taxonomy
from ..validate import validate_question

RAW = ROOT / "pipeline" / "gate_da" / "raw"
OUT = ROOT / "pipeline" / "bank_src" / "gate_da_openbank.json"
OFFICIAL = ROOT / "pipeline" / "bank_src" / "gate_da_official.json"
REJECTED = ROOT / "pipeline" / "quarantine" / "gate_openbank_rejected.json"

SOURCES = {
    "mmlu": {"license": "MIT", "url": "https://github.com/hendrycks/test"},
    "math500": {"license": "MIT", "url": "https://github.com/openai/prm800k/tree/main/prm800k/math_splits"},
    "gsm8k": {"license": "MIT", "url": "https://github.com/openai/grade-school-math"},
}
DIFF_B = {"E": -0.9, "M": 0.1, "H": 1.1}

# MMLU subject -> chapters it may be mapped to (prefix match on chapter id)
MMLU_ALLOWED = {
    "machine_learning": ["ML."],
    "college_computer_science": ["PDS.", "DBW.", "AI.SRCH", "AI.LOG"],
    "high_school_computer_science": ["PDS."],
    "high_school_statistics": ["PRS."],
    "college_mathematics": ["LA.", "CO.", "PRS.CNT", "PRS.PROB"],
    "high_school_mathematics": ["CO.", "PRS.CNT", "PRS.PROB", "PRS.DESC", "GA.QUANT"],
    "abstract_algebra": ["LA.VS", "LA.MAT", "LA.EIG", "LA.PROJ", "LA.SYS"],
    "formal_logic": ["AI.LOG"],
    "elementary_mathematics": ["GA.QUANT", "PRS.PROB"],
}
MMLU_DIFF = {"machine_learning": "M", "college_computer_science": "M", "high_school_computer_science": "E",
             "high_school_statistics": "E", "college_mathematics": "H", "high_school_mathematics": "M",
             "abstract_algebra": "H", "formal_logic": "M", "elementary_mathematics": "E"}

_FIG = re.compile(r"\b(figure|diagram|shown below|graph below|table below|picture|image|\[asy\]|the following (table|graph|chart)|above (table|graph|figure))\b", re.I)
# clearly outside the GATE DA 2027 syllabus although keywords may match
_OFF = re.compile(r"transformer|word2vec|resnet|boltzmann|self-attention|\bgan\b|reinforcement|\bcnn\b|\brnn\b|lstm|deadlock|operating system|\bprocess(es)?\b.*\bresource|compiler|\bcpu\b|virtual memory|\bpage fault|cache|network protocol|\btcp\b|encryption|\bmutex|semaphore|completely randomized|randomized (block )?design|\bblocking\b|experiment(al)? (design|unit)|survey|\bbias in (a )?sample|z_\d|\bgroup\b|\bring\b|\bfield\b.*finite|uniformly continuous|compact|np-?(hard|complete)|turing|assembly|\bregister\b|instruction set|pipelin", re.I)
_DISPLAY_O = re.compile(r"(?<!\\)\\\[")
_DISPLAY_C = re.compile(r"(?<!\\)\\\]")
_INLINE_O = re.compile(r"(?<!\\)\\\(")
_INLINE_C = re.compile(r"(?<!\\)\\\)")


def norm_text(t: str, escape_dollar: bool = False) -> str:
    t = t.replace("\r\n", "\n").strip()
    if escape_dollar:
        t = re.sub(r"(?<!\\)\$", r"\\$", t)
    else:
        t = _DISPLAY_O.sub("$$", t)
        t = _DISPLAY_C.sub("$$", t)
        t = _INLINE_O.sub("$", t)
        t = _INLINE_C.sub("$", t)
    return t


def norm_stem(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()


def sid(source: str, key: str) -> str:
    return "q_" + hashlib.sha1(f"gate_da_open|{source}|{key}".encode()).hexdigest()[:12]


# ------------------------------------------------------------------ loaders


def load_mmlu():
    d = RAW / "mmlu" / "data" / "test"
    for f in sorted(d.glob("*_test.csv")):
        subj = f.name[: -len("_test.csv")]
        if subj not in MMLU_ALLOWED:
            continue
        with f.open(newline="", encoding="utf-8") as fh:
            for i, row in enumerate(csv.reader(fh)):
                if len(row) != 6:
                    yield {"source": "mmlu", "key": f"{subj}:{i}", "bad": "malformed_row"}
                    continue
                yield {"source": "mmlu", "key": f"{subj}:{i}", "subject": subj, "stem": row[0],
                       "options": row[1:5], "answer": row[5].strip().upper()}


def load_math500():
    p = RAW / "math" / "test.jsonl"
    for line in p.read_text(encoding="utf-8").splitlines():
        r = json.loads(line)
        yield {"source": "math500", "key": r["unique_id"], "subject": r["subject"], "level": int(r["level"]),
               "stem": r["problem"], "gold": r["answer"]}


def load_gsm8k():
    p = RAW / "gsm8k" / "test.jsonl"
    for i, line in enumerate(p.read_text(encoding="utf-8").splitlines()):
        r = json.loads(line)
        ans = r["answer"].split("####")[-1].strip().replace(",", "")
        yield {"source": "gsm8k", "key": f"test:{i}", "stem": r["question"], "gold": ans,
               "steps": r["answer"].count("<<")}


# ------------------------------------------------------------------ conversion


def _num(s: str):
    s = s.strip().replace(",", "")
    if re.fullmatch(r"-?\d+", s):
        return float(int(s)), 0.0
    if re.fullmatch(r"-?\d+\.\d{1,3}", s):
        dp = len(s.split(".")[1])
        return float(s), round(0.5 * 10 ** -dp, 6)
    return None


def convert(rec: dict, tax, topics: set[str]):
    if rec.get("bad"):
        return None, rec["bad"]
    src = rec["source"]
    raw_stem = rec["stem"]
    if _FIG.search(raw_stem):
        return None, "needs_figure"
    if len(raw_stem) > 1100 or len(raw_stem) < 25:
        return None, "length"
    if _OFF.search(raw_stem):
        return None, "off_syllabus_keyword"
    escape = src in ("mmlu", "gsm8k")
    stem = norm_text(raw_stem, escape_dollar=escape)
    qtype, answer, options, label, allowed = None, None, None, "M", None
    if src == "mmlu":
        opts = [norm_text(o, True) for o in rec["options"]]
        if rec["answer"] not in "ABCD" or len(rec["answer"]) != 1:
            return None, "bad_answer"
        if len(set(o.strip().lower() for o in opts)) < 4 or any(not o.strip() for o in opts):
            return None, "duplicate_or_empty_options"
        if any(re.search(r"\b(both|all of the above|none of the above|neither)\b", o, re.I) for o in opts) and False:
            pass
        qtype, answer = "SCQ", {"keys": [rec["answer"]]}
        options = [{"key": "ABCD"[i], "text": o} for i, o in enumerate(opts)]
        label = MMLU_DIFF[rec["subject"]]
        allowed = MMLU_ALLOWED[rec["subject"]]
    elif src == "math500":
        if rec["level"] < 3:
            return None, "too_easy"
        if re.search(r"common fraction|in terms of|simplest radical|interval notation|ordered pair|expression|polynomial|\\pi|as a (fraction|decimal)|radical form|base", raw_stem, re.I) and not re.search(r"decimal", raw_stem, re.I):
            return None, "answer_format"
        n = _num(rec["gold"])
        if n is None:
            return None, "non_numeric_answer"
        qtype, answer = "NVQ", {"value": n[0], "tol": n[1]}
        label = "M" if rec["level"] == 3 else "H"
        allowed = ["PRS.CNT", "PRS.PROB", "PRS.DESC", "LA.", "CO.", "GA.QUANT"]
    elif src == "gsm8k":
        if rec["steps"] < 4:
            return None, "too_easy"
        n = _num(rec["gold"])
        if n is None:
            return None, "non_numeric_answer"
        qtype, answer = "NVQ", {"value": n[0], "tol": n[1]}
        label = "E" if rec["steps"] < 6 else "M"
        allowed = ["GA.QUANT", "PRS.PROB", "PRS.DESC"]
    text = stem + "\n" + "\n".join(o["text"] for o in options or [])
    ch, topic, score = classify_gate(text, None)
    if ch is None or (src == "mmlu" and score < 3):
        return None, "off_syllabus_or_ambiguous"
    if not any(ch.startswith(a) for a in allowed):
        return None, f"chapter_{ch}_not_allowed_for_source_subject"
    if src == "gsm8k" and not re.search(r"percent|%|ratio|average|fraction|half|twice|times as|speed|per (hour|day|week)|discount|profit|probab", raw_stem, re.I):
        return None, "no_quantitative_aptitude_theme"
    if topic and topic not in topics:
        topic = None
    q = {
        "id": sid(src, rec["key"]),
        "type": qtype,
        "stem": stem,
        "images": [],
        "answer": answer,
        "tax": {"subject": ch.split(".")[0], "chapter": ch, "topics": [topic] if topic else [], "concepts": []},
        "skills": ["calculation"] if qtype == "NVQ" else ["conceptual"],
        "appearances": [],
        "in_syllabus": {"GATE_DA": {"2027": True}},
        "difficulty": {"label": label, "b": DIFF_B[label], "n": 0},
        "source": {"kind": "dataset", "license": SOURCES[src]["license"], "url": SOURCES[src]["url"]},
        "status": "verified",
        "version": 1,
    }
    if options:
        q["options"] = options
    return q, None


def run() -> int:
    tax = default_taxonomy()
    topics = tax.topic_ids()
    seen = set()
    if OFFICIAL.exists():
        for q in json.loads(OFFICIAL.read_text(encoding="utf-8")):
            seen.add(norm_stem(q["stem"]))
    accepted, rejected = [], []
    stats = Counter()
    for loader in (load_mmlu, load_math500, load_gsm8k):
        for rec in loader():
            stats[(rec["source"], "seen")] += 1
            q, why = convert(rec, tax, topics)
            if q is None:
                rejected.append({"source": rec["source"], "key": rec["key"], "reason": why})
                continue
            k = norm_stem(q["stem"])
            if k in seen:
                rejected.append({"source": rec["source"], "key": rec["key"], "reason": "duplicate_stem"})
                continue
            res = validate_question(q, tax, rec["source"])
            if not res.ok:
                rejected.append({"source": rec["source"], "key": rec["key"], "reason": "validation: " + "; ".join(res.errors)[:160]})
                continue
            seen.add(k)
            accepted.append(q)
    accepted.sort(key=lambda d: d["id"])
    OUT.write_text(json.dumps(accepted, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    summary = {"accepted": len(accepted), "rejected": len(rejected),
               "reject_reasons": Counter((r["source"], r["reason"].split(":")[0]) for r in rejected).most_common()}
    REJECTED.write_text(json.dumps({"summary": {k: (v if k != "reject_reasons" else [[list(a), b] for a, b in v]) for k, v in summary.items()},
                                    "items": rejected}, indent=1) + "\n", encoding="utf-8")
    print("accepted", len(accepted), "rejected", len(rejected))
    print("by source:", dict(Counter(q["source"]["url"].split("/")[-1] if False else q["id"][:0] or "" for q in accepted)) if False else "")
    by_src = Counter()
    for q in accepted:
        by_src[("mmlu" if "hendrycks" in q["source"]["url"] else "math500" if "prm800k" in q["source"]["url"] else "gsm8k", q["tax"]["chapter"], q["type"])] += 1
    for k, v in sorted(by_src.items()):
        print(" ", k, v)
    for k, v in summary["reject_reasons"]:
        print(" reject", k, v)
    return 0


if __name__ == "__main__":
    sys.exit(run())
