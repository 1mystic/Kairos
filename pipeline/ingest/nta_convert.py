"""Convert a structured official paper (prompt-v2 style, from pipeline/extract) + the OFFICIAL final key
into pipeline questions.

    python -m pipeline.ingest.nta_convert PILOT [--write-manual-tags]
    PILOT in: jee_main_2026_0402_s1 | neet_ug_2020_H3

Inputs   pipeline/extract/structured/<stem>.json     (agent transcription; ``answer`` is always null there)
         pipeline/extract/structured/<stem>.chapters.json   optional {qno: chapter | "NONE"} reading-based hints
         pipeline/raw/**/<paper>.pdf, <key>.pdf      (downloaded by pipeline.acquire.fetch; not committed)
Outputs  pipeline/bank_src/nta_<name>.json           questions (status verified | needs_review)
         pipeline/quarantine/nta_<name>.json         questions we did NOT convert, with reason + the transcription

Rules (same conventions as ingest.jeebench: normalise_latex, id, difficulty prior, skills, tagging):
  * answer ONLY from the official final key. Key says Dropped / Bonus / "Any non-negative Integer" -> answer null,
    status needs_review (never published). A question with no key entry -> quarantine ``missing_key``.
  * status ``verified`` only when the key supplied the answer, validation passes and the transcription is not
    flagged low-confidence by the agent; otherwise ``needs_review``.
  * quarantine reasons: needs_figure | table | garbled_math (agent flag), no_chapter, needs_manual_tag,
    missing_key, key_option_mismatch, text_sanity / schema_validation.
  * id = "q_" + sha1("nta|<exam>|<year>|<session>|<shift>|<qno>")[:12]; source.kind = official.
  * chapter: hint file (reading-based) > manual_tags.json > keyword rules (PHY/CHE/MAT only). ``--write-manual-tags``
    persists the hints into pipeline/tag/manual_tags.json (manual always wins on later runs).
  * solution: null (official papers carry none).
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from collections import Counter
from pathlib import Path

from ..extract import keys as K
from ..extract import pdf_text as P
from ..paths import ROOT
from ..schema import check_text, split_math
from ..tag import MANUAL, manual_tags, tag_question
from ..taxonomy import default_taxonomy
from ..validate import validate_question
from .jeebench import DIFF_B, difficulty, normalise_latex, skills_for

STRUCT = ROOT / "pipeline" / "extract" / "structured"
RAW = ROOT / "pipeline" / "raw"
LICENSE = "Public exam paper published by NTA; used per project source policy (see content/sources/nta/ATTRIBUTION.md)"

NTA_CDN = "https://cdnbbsr.s3waas.gov.in/s3f8e59f4b2fe7c5705bf878bbd494ccdf/uploads/"
PILOTS = {
    "jee_main_2026_0402_s1": dict(
        exam="JEE_MAIN", year=2026, session=2, shift="2026-04-02-S1", stem="jee_main_2026-04-02_s1",
        syllabus_year="2026", out="nta_jee_main_2026_0402_s1", paper_id="jee_main_2026-04-02_s1_paper",
        key_id="jee_main_2026_s2_final_key", key=dict(kind="nta_id", date="02.04.2026", shift="First"),
        url=NTA_CDN + "2026/04/202604092096865379.pdf"),
    "neet_ug_2020_H3": dict(
        exam="NEET_UG", year=2020, session=None, shift="H3", stem="neet_ug_2020_H3",
        syllabus_year="2027", out="nta_neet_ug_2020_H3", paper_id="neet_ug_2020_H3_paper",
        key_id="neet_ug_2020_final_key", key=dict(kind="neet_book", book="H3"),
        url="https://nta.ac.in/Download/ExamPaper/Paper_20201106080951.pdf"),
}
SPECIAL_NOTE = {"DROP": "official key: question dropped", "BONUS": "official key: bonus / any answer accepted"}


def raw_pdf(entry_id: str) -> Path:
    f = sorted(RAW.rglob(f"{entry_id}__*.pdf"))
    if not f:
        raise SystemExit(f"{entry_id}: PDF not downloaded (run python -m pipeline.acquire.fetch)")
    return f[0]


def stable_id(cfg: dict, qno: int) -> str:
    key = f"nta|{cfg['exam']}|{cfg['year']}|{cfg['session']}|{cfg['shift']}|{qno}"
    return "q_" + hashlib.sha1(key.encode()).hexdigest()[:12]


def load_answers(cfg: dict, qnos: list[int]) -> dict[int, dict]:
    """qno -> {"keys": [...]} | {"value": n} | {"special": "DROP"|"BONUS"} | missing from dict."""
    kcfg = cfg["key"]
    out: dict[int, dict] = {}
    if kcfg["kind"] == "neet_book":
        key = K.neet_book_key(raw_pdf(cfg["key_id"]), kcfg["book"])
        for n in qnos:
            v = key.get(n)
            if v is None:
                continue
            out[n] = {"special": v} if v in SPECIAL_NOTE else {"keys": ["ABCD"[int(v) - 1]]}
        return out
    key = K.nta_id_key(raw_pdf(cfg["key_id"]), kcfg["date"], kcfg["shift"])
    ids = K.paper_ids("\n".join(P.pages_text(raw_pdf(cfg["paper_id"]))))
    for n in qnos:
        if n not in ids or ids[n][0] not in key:
            continue
        qid, opts = ids[n]
        v = key[qid]
        if v in SPECIAL_NOTE:
            out[n] = {"special": v}
        elif opts:
            out[n] = {"keys": ["ABCD"[opts.index(v)]]} if v in opts else {"mismatch": v}
        else:
            out[n] = {"value": int(v)} if v.isdigit() else {"mismatch": v}
    return out


def chapter_for(qid: str, subject: str, text: str, hint: str | None) -> tuple[str | None, str]:
    if hint == "NONE":
        return None, "no_chapter"
    if hint:
        return hint, "hint"
    if qid in manual_tags():
        return manual_tags()[qid], "manual"
    if subject in ("PHY", "CHE", "MAT"):
        ch, how = tag_question(qid, subject, text)
        if ch:
            return ch, how
    return None, "needs_manual_tag"


def convert(pilot: str, write_tags: bool = False) -> dict:
    cfg = PILOTS[pilot]
    struct = json.loads((STRUCT / f"{cfg['stem']}.json").read_text(encoding="utf-8"))
    hints_f = STRUCT / f"{cfg['stem']}.chapters.json"
    hints = {int(k): v for k, v in json.loads(hints_f.read_text()).items()} if hints_f.exists() else {}
    qs = struct["questions"]
    answers = load_answers(cfg, [q["n"] for q in qs])
    tax = default_taxonomy()
    chmap = tax.chapter_map()
    accepted, quarantined, new_tags = [], [], {}

    def quarantine(q: dict, qid: str, reason: str, detail: str = "") -> None:
        quarantined.append({"id": qid, "qno": q["n"], "reason": reason, "detail": detail, "stem": q["stem"],
                            "options": q.get("options"), "official_answer": answers.get(q["n"])})

    for q in qs:
        n = q["n"]
        qid = stable_id(cfg, n)
        if q.get("quarantine"):
            quarantine(q, qid, q["quarantine"])
            continue
        qtype = "SCQ" if q["options"] else "INT"
        stem = normalise_latex(q["stem"])
        opts = [(o["key"], normalise_latex(o["text"])) for o in (q["options"] or [])]
        problems = check_text("stem", stem) + [p for k, t in opts for p in check_text(f"option {k}", t)]
        if problems or any(not t.strip() for _, t in opts):
            quarantine(q, qid, "text_sanity", "; ".join(problems)[:200])
            continue
        ans = answers.get(n)
        if ans is None:
            quarantine(q, qid, "missing_key")
            continue
        if "mismatch" in ans:
            quarantine(q, qid, "key_option_mismatch", str(ans["mismatch"]))
            continue
        subject = q["subject"] or (hints.get(n, "").split(".")[0] if hints.get(n) else None)
        if cfg["exam"] == "NEET_UG" and hints.get(n) and hints[n] != "NONE":
            subject = hints[n].split(".")[0]
        if subject is None:
            quarantine(q, qid, "needs_manual_tag", "no subject")
            continue
        chapter, how = chapter_for(qid, subject, stem + "\n" + "\n".join(t for _, t in opts), hints.get(n))
        if chapter is None:
            quarantine(q, qid, how)
            continue
        if how == "hint":
            new_tags[qid] = chapter
        ch = chmap.get(chapter)
        if ch is None or chapter.split(".")[0] != subject:
            quarantine(q, qid, "needs_manual_tag", f"bad chapter {chapter!r} for subject {subject}")
            continue
        label = difficulty(qtype, stem, opts)
        special = ans.get("special")
        answer = None if special else ({"keys": ans["keys"]} if "keys" in ans else {"value": float(ans["value"])})
        rec = {
            "id": qid, "type": qtype, "stem": stem, "images": [],
            "answer": answer,
            "tax": {"subject": subject, "chapter": chapter, "topics": [], "concepts": []},
            "skills": skills_for(qtype, stem, opts),
            "appearances": [{"exam": cfg["exam"], "year": cfg["year"], "session": cfg["session"],
                             "shift": cfg["shift"], "qno": n}],
            "in_syllabus": {cfg["exam"]: {cfg["syllabus_year"]: bool(getattr(ch.exams, cfg["exam"]))}},
            "difficulty": {"label": label, "b": DIFF_B[label], "n": 0},
            "source": {"kind": "official", "license": LICENSE, "url": cfg["url"]},
            "solution": None,
            "status": "verified" if answer is not None and q.get("confidence") != "low" else "needs_review",
            "version": 1,
        }
        if opts:
            rec["options"] = [{"key": k, "text": t.strip()} for k, t in opts]
        res = validate_question(rec, tax)
        if not res.ok:
            quarantine(q, qid, "schema_validation", "; ".join(res.errors)[:200])
            continue
        accepted.append(rec)
        if special:
            quarantined.append({"id": qid, "qno": n, "reason": "key_" + special.lower(), "detail": SPECIAL_NOTE[special],
                                "note": "kept in bank_src as needs_review with answer null"})

    if write_tags and new_tags:
        cur = json.loads(MANUAL.read_text(encoding="utf-8")) if MANUAL.exists() else {}
        cur.update(new_tags)
        MANUAL.write_text(json.dumps(dict(sorted(cur.items())), indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    out = ROOT / "pipeline" / "bank_src" / f"{cfg['out']}.json"
    qf = ROOT / "pipeline" / "quarantine" / f"{cfg['out']}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    qf.parent.mkdir(parents=True, exist_ok=True)
    accepted.sort(key=lambda d: d["appearances"][0]["qno"])
    out.write_text(json.dumps(accepted, indent=1, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    qf.write_text(json.dumps(quarantined, indent=1, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return {"accepted": accepted, "quarantined": quarantined, "new_tags": new_tags}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.ingest.nta_convert", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("pilot", choices=sorted(PILOTS))
    ap.add_argument("--write-manual-tags", action="store_true")
    a = ap.parse_args(argv)
    r = convert(a.pilot, a.write_manual_tags)
    acc, qr = r["accepted"], r["quarantined"]
    print(f"{len(acc)} questions written: {dict(Counter(q['status'] for q in acc))}")
    print("quarantined:", dict(Counter(x["reason"] for x in qr)))
    print("by subject:", dict(Counter(q["tax"]["subject"] for q in acc)))
    if r["new_tags"]:
        print(f"{len(r['new_tags'])} hint-derived chapter tags", "(written)" if a.write_manual_tags else "(not written)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
