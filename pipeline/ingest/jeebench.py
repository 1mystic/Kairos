"""Deterministic JEEBench -> Kairos question converter.

    python -m pipeline.ingest.jeebench [--src content/sources/jeebench/dataset.json]
                                       [--out pipeline/bank_src/jeebench.json]
                                       [--rejected pipeline/quarantine/jeebench_rejected.json]

JEEBench (Arora, Singh, Mausam; EMNLP 2023; MIT) = 515 text-only JEE Advanced 2016-2023 questions
with gold answers. Records: {description, index, subject, type, question, gold}.

Mapping
  type MCQ -> SCQ, MCQ(multiple) -> MSQ, Integer -> INT, Numeric -> NVQ
  options (A)-(D) / [A]-[D] are split off the question text (line-start markers, in order)
  NVQ tolerance: JEE Advanced asks numeric answers "correct up to the 2nd decimal digit", so
      tol = 10**-max(2, dp(gold))   e.g. gold "0.22" -> 0.01, "2" -> 0.01, "0.0033" -> 0.0001
  id = "q_" + sha1("jeebench|<description>|<subject>|<index>")[:12]
  appearances = [{exam: JEE_ADV, year, session: <paper number>}]  (index is NOT the printed qno)
  in_syllabus.JEE_MAIN['2026'] = taxonomy chapter flag (so Advanced-only chapters are not served
      from the JEE_MAIN shards)
Rejected (never published) -> quarantine file with reasons.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from collections import Counter
from pathlib import Path

from ..paths import ROOT
from ..schema import Question, check_text, split_math
from ..tag import tag_question
from ..taxonomy import default_taxonomy
from ..validate import validate_question

SRC = ROOT / "content" / "sources" / "jeebench" / "dataset.json"
OUT = ROOT / "pipeline" / "bank_src" / "jeebench.json"
REJECTED = ROOT / "pipeline" / "quarantine" / "jeebench_rejected.json"
SOURCE_URL = "https://github.com/dair-iitd/jeebench"

TYPE_MAP = {"MCQ": "SCQ", "MCQ(multiple)": "MSQ", "Integer": "INT", "Numeric": "NVQ"}
SUBJECT_MAP = {"phy": "PHY", "chem": "CHE", "math": "MAT"}
DIFF_B = {"E": -0.9, "M": 0.1, "H": 1.1}

# ------------------------------------------------------------------ latex normaliser

_DISPLAY_OPEN = re.compile(r"(?<!\\)\\\[")
_DISPLAY_CLOSE = re.compile(r"(?<!\\)\\\]")
_INLINE_OPEN = re.compile(r"(?<!\\)\\\(")
_INLINE_CLOSE = re.compile(r"(?<!\\)\\\)")

_EL = r"(?:[A-Z][a-z]?)"
_ATOM = rf"\\mathrm\{{({_EL}(?:{_EL})*)\}}(?:_\{{?(\d+)\}}?)?"  # \mathrm{H}_{2} or \mathrm{H}_2 or \mathrm{NaOH}
_FORMULA = re.compile(rf"^\s*(?:{_ATOM}\s*)+(?:\^\{{(\d*[+-])\}})?\s*$")
_ATOM_RE = re.compile(_ATOM)

ELEMENTS = set(
    "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb "
    "Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au "
    "Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm".split()
)


def _split_symbols(word: str) -> list[str] | None:
    """Split 'NaOH' -> ['Na','O','H']; None if not made of element symbols."""
    out = re.findall(r"[A-Z][a-z]?", word)
    if "".join(out) != word or any(s not in ELEMENTS for s in out):
        return None
    return out


def chem_to_ce(seg: str) -> str:
    """Whole-segment conversion of ``\\mathrm{H}_{2} \\mathrm{O}`` style formulas to ``\\ce{H2O}``.

    Only when the *entire* segment is a formula built from \\mathrm{<element symbols>} atoms with optional
    integer subscripts and one optional trailing charge; and only when it has >= 2 atoms or a subscript
    (a lone ``\\mathrm{Fe}`` is left alone). Anything else is returned unchanged.
    """
    m = _FORMULA.match(seg)
    if not m:
        return seg
    atoms = _ATOM_RE.findall(seg)
    if not atoms or any(_split_symbols(w) is None for w, _ in atoms):
        return seg
    if len(atoms) < 2 and not any(sub for _, sub in atoms):
        return seg
    body = "".join(w + (sub or "") for w, sub in atoms)
    cm = re.search(r"\^\{(\d*[+-])\}\s*$", seg)
    if cm:
        body += "^" + cm.group(1)
    return r"\ce{" + body + "}"


def normalise_latex(text: str) -> str:
    t = text.replace("\r\n", "\n")
    t = _DISPLAY_OPEN.sub("$$", t)
    t = _DISPLAY_CLOSE.sub("$$", t)
    t = _INLINE_OPEN.sub("$", t)
    t = _INLINE_CLOSE.sub("$", t)
    # $$ ... $$ must not sit on the same line as prose in a way KaTeX/markdown mis-parse: put on own lines
    t = re.sub(r"[ \t]*\$\$([^$]*?)\$\$[ \t]*", lambda m: "\n$$" + m.group(1).strip() + "$$\n", t)
    t = re.sub(r"\n{3,}", "\n\n", t).strip()

    # chemistry: convert whole inline segments only
    segs, _, errs = split_math(t)
    if errs:
        return t
    out: list[str] = []
    i, n = 0, len(t)
    while i < n:
        ch = t[i]
        if ch == "\\" and i + 1 < n:
            out.append(t[i : i + 2])
            i += 2
            continue
        if ch == "$" and not t.startswith("$$", i):
            j = i + 1
            while j < n and t[j] != "$":
                j += 2 if t[j] == "\\" else 1
            seg = t[i + 1 : j]
            out.append("$" + chem_to_ce(seg) + "$")
            i = j + 1
            continue
        if ch == "$":  # display math: copy verbatim
            j = t.find("$$", i + 2)
            out.append(t[i : j + 2])
            i = j + 2
            continue
        out.append(ch)
        i += 1
    res = "".join(out)
    # text-mode bold/italic outside math -> markdown
    parts = re.split(r"(\$\$.*?\$\$|\$.*?\$)", res, flags=re.S)
    for k in range(0, len(parts), 2):
        parts[k] = re.sub(r"\\textbf\{([^{}]*)\}", r"**\1**", parts[k])
        parts[k] = re.sub(r"\\textit\{([^{}]*)\}", r"*\1*", parts[k])
    return "".join(parts)


# ------------------------------------------------------------------ record parsing

_MARK = re.compile(r"(?m)^[ \t]*[(\[]([A-D])[)\]][ \t]*")
_LATEX_ENV = re.compile(r"\\begin\{(tabular|center|figure|table|tikzpicture|enumerate|itemize)\}")
_FIGURE = re.compile(r"\b(figure|diagram|graph shown|as shown|shown below|shown above|sketch|plot)\b", re.I)
_OUTSIDE_CMD = re.compile(r"\\(?!\$)[A-Za-z]+")


def split_options(q: str) -> tuple[str, list[tuple[str, str]]] | None:
    marks = list(_MARK.finditer(q))
    for k in range(len(marks)):
        if marks[k].group(1) != "A":
            continue
        seq, nxt = [marks[k]], "B"
        for m in marks[k + 1 :]:
            if m.group(1) == nxt:
                seq.append(m)
                nxt = chr(ord(nxt) + 1)
        if len(seq) >= 4 and all(m.group(1) == c for m, c in zip(seq, "ABCD")):
            seq = seq[:4]
            # prefer the last complete A..D run
            later = [j for j in range(k + 1, len(marks)) if marks[j].group(1) == "A"]
            if later:
                continue
            stem = q[: seq[0].start()]
            opts = []
            for a, b in zip(seq, seq[1:] + [None]):
                end = b.start() if b else len(q)
                opts.append((a.group(1), q[a.end() : end]))
            return stem, opts
    return None


def dp(s: str) -> int:
    return len(s.split(".")[1]) if "." in s else 0


def stable_id(rec: dict) -> str:
    key = f"jeebench|{rec['description']}|{rec['subject']}|{rec['index']}"
    return "q_" + hashlib.sha1(key.encode()).hexdigest()[:12]


def norm_stem(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", s.lower())


def dedupe_key(q: dict) -> str:
    """Normalised stem + options (generic stems like 'Choose the correct statement(s)' recur legitimately)."""
    return norm_stem(q["stem"] + "".join(o["text"] for o in q.get("options", [])))


def difficulty(qtype: str, stem: str, options: list[tuple[str, str]]) -> str:
    """Rough prior (JEEBench carries no marks / solve rates). Index 0..2 = E, M, H.

    base: SCQ, INT, NVQ -> M (1); MSQ -> H (2, multi-select with negative marking)
    length of stem + options: < 250 chars -> one step easier; > 600 chars -> one step harder
    b prior: E -0.9, M 0.1, H 1.1 (same values as the authored fixtures); n = 0.
    Calibration (Elo/IRT from attempts) replaces this prior.
    """
    total = len(stem) + sum(len(t) for _, t in options)
    idx = 2 if qtype == "MSQ" else 1
    if total < 250:
        idx -= 1
    elif total > 600:
        idx += 1
    return "EMH"[max(0, min(2, idx))]


def skills_for(qtype: str, stem: str, options: list[tuple[str, str]]) -> list[str]:
    if qtype in ("INT", "NVQ"):
        return ["calculation"]
    if qtype == "MSQ":
        return ["conceptual"]
    return ["calculation"] if any(re.search(r"\d", t) for _, t in options) else ["conceptual"]


def convert(rec: dict, tax) -> tuple[dict | None, str | None]:
    """Return (question dict, None) or (None, reject reason)."""
    qtype = TYPE_MAP.get(rec["type"])
    subj = SUBJECT_MAP.get(rec["subject"])
    if qtype is None or subj is None:
        return None, "unsupported_type_or_subject"
    raw = rec["question"]
    if _LATEX_ENV.search(raw):
        return None, "latex_table_or_environment_unsupported"
    dm = re.match(r"JEE Adv (\d{4}) Paper (\d)", rec["description"])
    if not dm:
        return None, "unparseable_description"
    year, paper = int(dm.group(1)), int(dm.group(2))

    gold = str(rec["gold"]).strip()
    options: list[tuple[str, str]] = []
    stem = raw
    if qtype in ("SCQ", "MSQ"):
        sp = split_options(raw)
        if sp is None:
            return None, "options_not_parsed"
        stem, options = sp
        keys = list(gold)
        if not keys or any(k not in "ABCD" for k in keys) or len(set(keys)) != len(keys):
            return None, "bad_gold_keys"
        if qtype == "SCQ" and len(keys) != 1:
            return None, "bad_gold_keys"
        answer = {"keys": sorted(keys)}
    else:
        try:
            val = float(gold)
        except ValueError:
            return None, "gold_not_numeric"
        if qtype == "INT":
            if val != int(val):
                return None, "int_gold_not_integral"
            answer = {"value": float(int(val))}
        else:
            answer = {"value": val, "tol": round(10 ** -max(2, dp(gold)), 10)}

    stem_n = normalise_latex(stem)
    opts_n = [(k, normalise_latex(t)) for k, t in options]
    if _FIGURE.search(stem_n):
        return None, "references_figure_not_present"
    outside = split_math(stem_n)[1] + "".join(split_math(t)[1] for _, t in opts_n)
    if _OUTSIDE_CMD.search(outside):
        return None, "latex_command_outside_math"
    problems = check_text("stem", stem_n)
    for k, t in opts_n:
        if not t.strip():
            problems.append(f"option {k} empty")
        problems += check_text(f"option {k}", t)
    if problems:
        return None, "text_sanity: " + "; ".join(problems)[:200]

    qid = stable_id(rec)
    chapter, how = tag_question(qid, subj, stem_n + "\n" + "\n".join(t for _, t in opts_n))
    if chapter is None:
        return None, "needs_manual_tag"
    ch = tax.chapter_map()[chapter]
    label = difficulty(qtype, stem_n, opts_n)
    q = {
        "id": qid,
        "type": qtype,
        "stem": stem_n,
        "images": [],
        "answer": answer,
        "tax": {"subject": subj, "chapter": chapter, "topics": [], "concepts": []},
        "skills": skills_for(qtype, stem_n, opts_n),
        "appearances": [{"exam": "JEE_ADV", "year": year, "session": paper}],
        "in_syllabus": {"JEE_MAIN": {"2026": bool(ch.exams.JEE_MAIN)}},
        "difficulty": {"label": label, "b": DIFF_B[label], "n": 0},
        "source": {"kind": "dataset", "license": "MIT", "url": SOURCE_URL},
        "status": "verified",
        "version": 1,
    }
    if opts_n:
        q["options"] = [{"key": k, "text": t.strip()} for k, t in opts_n]
    return q, None


def run(src: Path, out: Path, rejected: Path) -> dict:
    tax = default_taxonomy()
    data = json.loads(src.read_text(encoding="utf-8"))
    accepted: list[dict] = []
    rej: list[dict] = []
    seen: dict[str, str] = {}
    for rec in data:
        q, why = convert(rec, tax)
        if q is not None:
            res = validate_question(q, tax)
            if not res.ok:
                q, why = None, "schema_validation: " + "; ".join(res.errors)[:200]
        if q is not None:
            key = dedupe_key(q)
            if key in seen:
                q, why = None, f"duplicate_of_{seen[key]}"
            else:
                seen[key] = q["id"]
        if q is None:
            rej.append({"source_id": f"{rec['description']} / {rec['subject']} #{rec['index']}",
                        "id": stable_id(rec), "reason": why, "record": rec})
        else:
            accepted.append(q)
    accepted.sort(key=lambda d: d["id"])
    rej.sort(key=lambda d: d["id"])
    out.parent.mkdir(parents=True, exist_ok=True)
    rejected.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(accepted, indent=1, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    rejected.write_text(json.dumps(rej, indent=1, ensure_ascii=False, sort_keys=True) + "\n", encoding="utf-8")
    return {"accepted": accepted, "rejected": rej, "total": len(data)}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.ingest.jeebench", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--src", type=Path, default=SRC)
    ap.add_argument("--out", type=Path, default=OUT)
    ap.add_argument("--rejected", type=Path, default=REJECTED)
    a = ap.parse_args(argv)
    r = run(a.src, a.out, a.rejected)
    acc, rej = r["accepted"], r["rejected"]
    print(f"{r['total']} records: {len(acc)} accepted, {len(rej)} rejected")
    for reason, n in Counter(x["reason"].split(":")[0] for x in rej).most_common():
        print(f"  rejected {n:4d}  {reason}")
    print("accepted by subject/type:", dict(Counter((q["tax"]["subject"], q["type"]) for q in acc)))
    print("accepted by year:", dict(sorted(Counter(q["appearances"][0]["year"] for q in acc).items())))
    return 0


if __name__ == "__main__":
    sys.exit(main())
