"""Convert hand-structured official GATE DA papers (pipeline/gate_da/papers/y<year>.py) + the official
final answer keys into pipeline questions.

  python -m pipeline.ingest.gate_convert keys     # parse raw key text -> content/sources/gate_da/keys/*.json (needs raw/)
  python -m pipeline.ingest.gate_convert convert  # -> pipeline/bank_src/gate_da_official.json + quarantine/gate_da_<year>.json

Answers come ONLY from the official key files. Cancelled / marks-to-all (MTA) items keep answer=null and
status needs_review (never published). Questions that depend on a figure the text does not carry are
listed in each paper module's QUARANTINE and written to pipeline/quarantine/gate_da_<year>.json.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question

RAW = ROOT / "pipeline" / "gate_da" / "raw"
KEYS_DIR = ROOT / "content" / "sources" / "gate_da" / "keys"
OUT = ROOT / "pipeline" / "bank_src" / "gate_da_official.json"
QDIR = ROOT / "pipeline" / "quarantine"
BASE = "https://gate2027.iitm.ac.in/static/doc/download/"

YEARS = {
    2024: {"session": 1, "paper": BASE + "2024/DA24S1.pdf", "key": BASE + "2024/DAFinalAnswerKey.pdf", "rawkey": "2024_DAFinalAnswerKey.txt"},
    2025: {"session": 5, "paper": BASE + "2025/DA2025.pdf", "key": BASE + "2025_Key/DA_Keys.pdf", "rawkey": "2025_Key_DA_Keys.txt"},
    2026: {"session": 8, "paper": BASE + "2026/QPs/DA.pdf", "key": BASE + "2026/Keys/DA_Keys.pdf", "rawkey": "2026_Keys_DA_Keys.txt"},
}
# The official GATE portal footer reads "(c) 2027 Indian Institute of Technology Madras. All Rights Reserved." with no
# reuse grant (see content/sources/gate_da/licences.md). Until the organising institutes give permission, every
# converted official question is held back: status "needs_review" => pipeline.publish skips it (publish only ships
# status "verified"). Set to False (and re-run `convert`) once permission is recorded.
HOLD_PENDING_PERMISSION = True
LICENSE = "Public exam paper published by the organising institute; used per project source policy"
TYPE_MAP = {"MCQ": "SCQ", "MSQ": "MSQ", "NAT": "NVQ"}
DIFF = {1: ("E", -0.9), 2: ("M", 0.1)}

_KEYROW = re.compile(r"^\s*(\d+)\s+(\d+)\s+(MCQ|MSQ|NAT)\s+(GA|DA)\s+(.+?)\s+(\d)\s*$")
_RANGE = re.compile(r"^(-?[\d.]+)\s+to\s+(-?[\d.]+)$")


def parse_key_text(txt: str) -> dict:
    items: dict[str, dict] = {}
    for line in txt.splitlines():
        m = _KEYROW.match(line)
        if not m:
            continue
        qno, sess, typ, sec, ans, marks = m.groups()
        it = {"type": typ, "section": sec, "marks": int(marks), "session": int(sess)}
        ans = ans.strip()
        if typ == "NAT":
            r = _RANGE.match(ans)
            if r:
                it["range"] = [float(r.group(1)), float(r.group(2))]
            else:
                it["special"] = ans  # e.g. MTA
        else:
            ks = [k.strip() for k in ans.split(";")]
            if all(re.fullmatch(r"[A-D]", k) for k in ks):
                it["keys"] = ks
            else:
                it["special"] = ans
        items[qno] = it
    return items


def build_keys() -> None:
    KEYS_DIR.mkdir(parents=True, exist_ok=True)
    for year, meta in YEARS.items():
        items = parse_key_text((RAW / meta["rawkey"]).read_text(encoding="utf-8"))
        assert len(items) == 65, (year, len(items))
        doc = {"year": year, "session": meta["session"], "key_url": meta["key"], "paper_url": meta["paper"],
               "_note": "transcribed mechanically from the official key PDF (pdftotext); do not edit by hand",
               "items": items}
        (KEYS_DIR / f"gate_da_{year}_key.json").write_text(json.dumps(doc, indent=1, ensure_ascii=False) + "\n")
        print(year, "key items", len(items), Counter(v["type"] for v in items.values()))


def qid(year: int, session: int, qno: int) -> str:
    return "q_" + hashlib.sha1(f"gate_da|{year}|{session}|{qno}".encode()).hexdigest()[:12]


def convert_year(year: int) -> tuple[list[dict], list[dict], list[str]]:
    meta = YEARS[year]
    key = json.loads((KEYS_DIR / f"gate_da_{year}_key.json").read_text(encoding="utf-8"))["items"]
    mod = importlib.import_module(f"pipeline.gate_da.papers.y{year}")
    tax = default_taxonomy()
    chapters = tax.chapter_map()
    topics = tax.topic_ids()
    out, notes = [], []
    seen = set()
    for q in mod.QUESTIONS:
        k = key.get(str(q.qno))
        if k is None:
            notes.append(f"{year} Q{q.qno}: not in key")
            continue
        seen.add(q.qno)
        typ = TYPE_MAP[k["type"]]
        if (typ == "NVQ") != (q.options is None):
            notes.append(f"{year} Q{q.qno}: key type {k['type']} vs options {'present' if q.options else 'absent'}")
            continue
        parts = q.ch.split(".")
        chapter = ".".join(parts[:2])
        if chapter not in chapters or (len(parts) == 3 and q.ch not in topics):
            notes.append(f"{year} Q{q.qno}: unknown taxonomy id {q.ch}")
            continue
        answer, status, extra = None, "verified", None
        if "keys" in k:
            answer = {"keys": k["keys"]}
        elif "range" in k:
            answer = {"range": k["range"]}
        else:
            status, extra = "needs_review", f"official key: {k.get('special')} (question cancelled or marks to all); no answer"
        if HOLD_PENDING_PERMISSION:
            status = "needs_review"
        label, b = DIFF[k["marks"]]
        d = {
            "id": qid(year, meta["session"], q.qno),
            "type": typ,
            "stem": q.stem,
            "images": [],
            "answer": answer,
            "tax": {"subject": parts[0], "chapter": chapter, "topics": [q.ch] if len(parts) == 3 else [], "concepts": []},
            "skills": [],
            "appearances": [{"exam": "GATE_DA", "year": year, "session": meta["session"], "qno": q.qno}],
            "in_syllabus": {"GATE_DA": {"2027": True}},
            "difficulty": {"label": label, "b": b, "n": 0},
            "source": {"kind": "official", "license": LICENSE, "url": meta["paper"]},
            "status": status,
            "version": 1,
        }
        if q.options:
            d["options"] = [{"key": "ABCDEFGH"[i], "text": t} for i, t in enumerate(q.options)]
        if extra:
            d["solution"] = None
            notes.append(f"{year} Q{q.qno}: INFO {extra}")
        res = validate_question(d, tax, f"gate_da_{year}")
        if not res.ok:
            notes.append(f"{year} Q{q.qno}: validation: {'; '.join(res.errors)[:200]}")
            continue
        out.append(d)
    quarantine = []
    for no, reason, note in mod.QUARANTINE:
        seen.add(no)
        quarantine.append({"year": year, "session": meta["session"], "qno": no, "reason": reason, "note": note,
                           "key": key.get(str(no)), "paper_url": meta["paper"]})
    missing = sorted(set(int(n) for n in key) - seen)
    if missing:
        notes.append(f"{year}: key questions neither converted nor quarantined: {missing}")
    return out, quarantine, notes


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.ingest.gate_convert")
    ap.add_argument("cmd", choices=["keys", "convert"])
    ap.add_argument("--years", type=int, nargs="*", default=None)
    a = ap.parse_args(argv)
    if a.cmd == "keys":
        build_keys()
        return 0
    allq: list[dict] = []
    bad = 0
    for year in a.years or sorted(YEARS):
        try:
            importlib.import_module(f"pipeline.gate_da.papers.y{year}")
        except ModuleNotFoundError:
            print(f"{year}: paper module missing, skipped")
            continue
        qs, quar, notes = convert_year(year)
        allq += qs
        (QDIR / f"gate_da_{year}.json").write_text(json.dumps(quar, indent=1, ensure_ascii=False) + "\n")
        for n in notes:
            info = "INFO" in n
            print("INFO" if info else "PROBLEM", n)
            bad += 0 if info else 1
        print(year, "converted", len(qs), "quarantined", len(quar), "status", dict(Counter(q["status"] for q in qs)))
    allq.sort(key=lambda d: d["id"])
    OUT.write_text(json.dumps(allq, indent=1, ensure_ascii=False) + "\n")
    print("wrote", OUT, len(allq))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
