"""Generate practice questions from the embedded DryRun problem data.

  python -m pipeline.ingest.dsa_questions

Writes pipeline/bank_src/dsa_interview.json (and content/sources/dsa/report.json). Every problem's embedded test
is executed for BOTH variants first (python subprocess / node); only problems that pass produce `verified`
questions. Dry-run answers are recomputed by actually calling the optimized code. Complexity / pattern answers come
from the record fields (with heuristic loop-depth cross-check warnings for python).
"""
from __future__ import annotations

import ast
import json
import random
import re
import sys
from collections import Counter

from ..dsa.chapters import CHAPTER_NAMES, SLUG_CHAPTER, load_dryrun
from ..dsa.runner import run, strip_marks
from ..dsa.verify import matches, test_of
from ..paths import ROOT
from ..taxonomy import default_taxonomy
from ..validate import validate_question

OUT = ROOT / "pipeline" / "bank_src" / "dsa_interview.json"
REPORT = ROOT / "content" / "sources" / "dsa" / "report.json"
LETTERS = "ABCDEFGH"
DIFF_B = {"E": -0.9, "M": 0.1, "H": 1.1}
LICENSE = "Derived from the owner's DryRun project"
KINDS = ("time", "space", "brute", "pattern", "dryrun")

# ------------------------------------------------------------------ helpers


def qid(slug: str, kind: str) -> str:
    # schema: ^q_[A-Za-z0-9]+$ (no '_' or '-' after the prefix)
    camel = "".join(w.capitalize() for w in re.split(r"[^A-Za-z0-9]+", slug) if w)
    return f"q_dsa{camel}{kind.capitalize()}"


def shuffle_options(key: str, correct: str, wrong: list[str]) -> tuple[list[str], str]:
    texts = [correct] + wrong
    order = list(range(len(texts)))
    random.Random(key).shuffle(order)
    return [texts[i] for i in order], LETTERS[order.index(0)]


# ---- complexity strings

_CORE = re.compile(r"^(O\((?:[^()]|\([^()]*\))*\))(.*)$")


def split_cx(s: str) -> tuple[str, str] | None:
    m = _CORE.match(s.strip())
    if not m:
        return None
    core, suffix = m.group(1), m.group(2)
    if "O(" in suffix:
        return None
    return core, suffix


def norm_cx(core: str) -> str:
    t = core[2:-1].lower().replace(" ", "").replace("²", "^2").replace("³", "^3").replace("ⁿ", "^n")
    t = t.replace("*", "·")
    return "·".join(sorted(t.split("·"))) if "(" not in t else t


def cx_vars(core: str) -> set[str]:
    return set(re.findall(r"\b[a-zA-Z]\b", core[2:-1])) - {"O"}


def is_constantish(core: str) -> bool:
    inner = core[2:-1].strip()
    return bool(re.fullmatch(r"\d+|log ?\d+", inner)) or inner == "1"


LADDER = {
    "ot": ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(2ⁿ)"],
    "bt": ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n²)", "O(n³)", "O(2ⁿ)"],
    "os": ["O(1)", "O(log n)", "O(n)", "O(n²)"],
}
LADDER["bs"] = LADDER["os"]


def clean_pool(P: dict, field: str) -> tuple[Counter, Counter]:
    """(common pool = standard ladder + corpus cores seen >= 2 times, full corpus pool)."""
    full: Counter = Counter()
    for p in P.values():
        sc = split_cx(p[field])
        if sc and not sc[1].strip():
            core = sc[0]
            if re.fullmatch(r"O\(\d+\)", core):
                continue
            full[core] += 1
    common: Counter = Counter({c: 3 for c in LADDER[field]})
    for c, n in full.items():
        if n >= 2:
            common[c] += n
    return common, full


def cx_distractors(key: str, answer: str, pools: tuple[Counter, Counter]) -> list[str] | None:
    for pool in pools:
        r = _cx_try(key, answer, pool)
        if r:
            return r
    return None


def _cx_try(key: str, answer: str, pool: Counter) -> list[str] | None:
    sc = split_cx(answer)
    if not sc or is_constantish(sc[0]) and sc[0] != "O(1)":
        return None
    core, suffix = sc
    av = cx_vars(core)
    an = norm_cx(core)
    rnd = random.Random("cx" + key)
    cands = []
    for c, n in pool.items():
        if norm_cx(c) == an or is_constantish(c) and c != "O(1)":
            continue
        v = cx_vars(c)
        if av <= {"n"} and not v <= {"n"}:
            continue
        w = (n ** 0.5) * (3 if v == av else 1)
        cands.append((c, w))
    if len(cands) < 3:
        return None
    chosen: list[str] = []
    while len(chosen) < 3:
        tot = sum(w for _, w in cands)
        r = rnd.random() * tot
        for i, (c, w) in enumerate(cands):
            r -= w
            if r <= 0:
                chosen.append(c)
                cands.pop(i)
                break
    out = [c + suffix for c in chosen]
    if len({norm_cx(split_cx(x)[0]) for x in out + [answer]}) != 4:
        return None
    return out


# ---- python loop-depth heuristic (warnings only)


def loop_depth(code: str) -> tuple[int, bool, bool]:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return -1, False, False
    names = {n.name for n in ast.walk(tree) if isinstance(n, ast.FunctionDef)}
    rec = any(isinstance(n, ast.Call) and ((isinstance(n.func, ast.Name) and n.func.id in names)
              or (isinstance(n.func, ast.Attribute) and n.func.attr in names)) for n in ast.walk(tree))
    has_while = any(isinstance(n, ast.While) for n in ast.walk(tree))

    def depth(node, d=0):
        best = d
        for ch in ast.iter_child_nodes(node):
            nd = d + (1 if isinstance(ch, (ast.For, ast.While, ast.ListComp, ast.SetComp, ast.DictComp,
                                           ast.GeneratorExp)) else 0)
            best = max(best, depth(ch, nd))
        return best

    return depth(tree), rec, has_while


def shape_warnings(slug: str, p: dict) -> list[str]:
    if (p.get("lang") or "py") != "py":
        return []
    w = []
    for var, cx in (("b", p["bt"]), ("o", p["ot"])):
        sc = split_cx(cx)
        if not sc:
            continue
        d, rec, wh = loop_depth(strip_marks(p[var], "py"))
        if d < 0 or rec:
            continue
        core = norm_cx(sc[0])
        if core in ("n^2", "n^3") and d < int(core[-1]) and "sort" not in p[var] and "in " not in p[var]:
            w.append(f"{slug} [{var}] claims {sc[0]} but loop depth is {d}")
        if core in ("n", "1", "logn") and d >= 2 and not wh:
            w.append(f"{slug} [{var}] claims {sc[0]} but nested for-loop depth is {d}")
    return w


# ---- value display / distractors

NUM_LIT = re.compile(r"(?<![\w.'\"])\d+(?![\w.'\"])")


def mutate_tests(test: str, limit: int = 8) -> list[str]:
    spots = list(NUM_LIT.finditer(test))
    out: list[str] = []
    for m in spots:
        v = int(m.group())
        for nv in (v + 1, max(v - 1, 0)):
            if nv != v:
                t = test[: m.start()] + str(nv) + test[m.end():]
                if t not in out:
                    out.append(t)
    random.Random(test).shuffle(out)
    return out[:limit]


def canon(v) -> str:
    return json.dumps(v, sort_keys=True, default=repr)


def perturb(v) -> list:
    out: list = []
    if isinstance(v, bool):
        return [not v]
    if isinstance(v, int):
        return [v + 1, v - 1, v + 2, v - 2, 0, -v]
    if isinstance(v, str):
        c = [v[::-1], v[:-1], v[1:], v.upper(), v.lower(), v + v[-1:]]
        return [x for x in c if x != v and x != ""]
    if isinstance(v, (list, tuple)):
        mk = type(v)
        L = list(v)
        for i, e in enumerate(L):
            for alt in perturb(e)[:2]:
                out.append(mk(L[:i] + [alt] + L[i + 1:]))
        if len(L) > 1:
            out += [mk(L[::-1]), mk(L[:-1]), mk(L[1:]), mk(L[1:] + L[:1])]
        return out
    if isinstance(v, dict) and v:
        k = next(iter(v))
        d1 = dict(v)
        d1.pop(k)
        out.append(d1)
        for kk in v:
            for alt in perturb(v[kk])[:1]:
                d2 = dict(v)
                d2[kk] = alt
                out.append(d2)
        return out
    return out


def show(v, lang: str) -> str:
    return json.dumps(v, ensure_ascii=False) if lang == "js" else repr(v)


def parse_py(s: str):
    return ast.literal_eval(s)


# ------------------------------------------------------------------ item builders


def solution_text(p: dict, slug: str, lead: str) -> str:
    parts = [lead, f"**Idea ({p['pat']}):** {p['trick']}"]
    if p.get("real"):
        parts.append(f"**Where it shows up:** {p['real']}")
    parts.append(f"[Watch the animated trace](/dsa/{slug})")
    return "\n\n".join(parts)


def stem_head(p: dict) -> str:
    return f"**{p['t']}**: {p['br']}"


def make_q(slug: str, p: dict, kind: str, stem: str, type_: str, answer: dict, options: list[str] | None,
           sol: str, via: str) -> dict:
    q = {
        "id": qid(slug, kind), "type": type_, "stem": stem, "images": [], "answer": answer,
        "solution": sol + f"\n\n*Verified by: {via}.*", "solution_source": "in_house",
        "tax": {"subject": "ALG", "chapter": SLUG_CHAPTER[slug], "topics": [], "concepts": []},
        "skills": ["calculation"] if kind == "dryrun" else ["conceptual"],
        "appearances": [], "in_syllabus": {"DSA_INTERVIEW": {"2026": True}},
        "difficulty": {"label": p["d"], "b": DIFF_B[p["d"]], "n": 0},
        "source": {"kind": "authored", "license": LICENSE},
        "status": "verified", "version": 1,
    }
    if options:
        q["options"] = [{"key": LETTERS[i], "text": t} for i, t in enumerate(options)]
    return q


def complexity_q(slug, p, kind, field, pool, what, variant_phrase):
    ans = p[field]
    d = cx_distractors(f"{slug}{kind}", ans, pool)
    if d is None:
        return None, f"{kind}: no clean distractors for {ans!r}"
    opts, key = shuffle_options(f"{slug}{kind}", ans, d)
    opts = [f"`{o}`" for o in opts]
    stem = f"{stem_head(p)}\n\nWhat is the {what} of {variant_phrase}?"
    lead = {
        "time": f"The optimized solution runs in **{p['ot']}** time (beginner version: {p['bt']}).",
        "space": f"The optimized solution uses **{p['os']}** extra space (beginner version: {p['bs']}).",
        "brute": f"The beginner solution runs in **{p['bt']}** time; the optimized one improves this to {p['ot']}.",
    }[kind]
    return make_q(slug, p, kind, stem, "SCQ", {"keys": [key]}, opts, solution_text(p, slug, lead),
                  "problem record + embedded tests pass for both variants"), None


def pattern_q(slug, p, P):
    mine = set(p["tg"])
    pool = sorted({q["pat"] for s, q in P.items()
                   if SLUG_CHAPTER[s] != SLUG_CHAPTER[slug] and not (set(q["tg"]) & mine) and q["pat"] != p["pat"]})
    if len(pool) < 3:
        return None, "pattern: not enough distractors"
    rnd = random.Random("pat" + slug)
    wrong = rnd.sample(pool, 3)
    opts, key = shuffle_options(slug + "pattern", p["pat"], wrong)
    stem = f"{stem_head(p)}\n\nWhich pattern gives the optimized solution?"
    lead = f"The optimized solution uses the **{p['pat']}** pattern ({p['ot']} time, {p['os']} space)."
    return make_q(slug, p, "pattern", stem, "SCQ", {"keys": [key]}, opts, solution_text(p, slug, lead),
                  "problem record + embedded tests pass for both variants"), None


NONDET_TAGS = {"Randomized", "Timers", "Async", "Concurrency", "Promise", "Reservoir Sampling"}


def dryrun_q(slug, p):
    lang = p.get("lang") or "py"
    test, exp = test_of(p)
    if not test or NONDET_TAGS & set(p["tg"]):
        return None, "dryrun: non-deterministic or no test"
    if lang == "js" and re.search(r"sleep|await|Promise", test):
        return None, "dryrun: async test"
    code = strip_marks(p["o"], lang).strip("\n")
    if code.count("\n") + 1 > 70:
        return None, "dryrun: code too long"
    if test.count("\n") + 1 > 8 or len(test) > 420:
        return None, "dryrun: test too long"
    muts = mutate_tests(test)
    r1 = run(p, "o", [test] + muts)
    r2 = run(p, "o", [test])
    if not r1[0].get("ok") or not r2[0].get("ok"):
        return None, "dryrun: test errored"
    if not matches(p, r1[0], exp):
        return None, "dryrun: computed value != exp"
    if r1[0].get("repr", r1[0].get("json")) != r2[0].get("repr", r2[0].get("json")):
        return None, "dryrun: non-deterministic"
    if lang == "js":
        val = json.loads(r1[0]["json"] or "null")
        mvals = [json.loads(r["json"]) for r in r1[1:] if r.get("ok") and r.get("json") is not None]
    else:
        try:
            val = parse_py(r1[0]["repr"])
        except Exception:
            return None, "dryrun: result not a literal"
        mvals = []
        for r in r1[1:]:
            try:
                if r.get("ok"):
                    mvals.append(parse_py(r["repr"]))
            except Exception:
                pass
    shown = show(val, lang)
    if val is None or len(shown) > 60 or (isinstance(val, float) and len(repr(val)) > 8):
        return None, "dryrun: output not small/unambiguous"
    ok_exp = (parse_py(exp) if lang == "py" else json.loads(exp))
    assert canon(ok_exp) == canon(val) or ok_exp == val, f"{slug}: exp mismatch"
    fence = "javascript" if lang == "js" else "python"
    note = ""
    if lang == "py" and re.search(r"\bLL?\(|\bTT?\(", test):
        note = ("\n\n(Helpers: `L(list)` builds a linked list and `LL(head)` converts it back to a list; "
                "`T(list)` builds a binary tree from a level-order list and `TT(root)` converts it back.)")
    if lang == "js":
        call_intro = "Then this snippet runs inside an `async` function:"
        q_text = "What does the snippet return?"
    else:
        call_intro = "Then this snippet runs (it stores its outcome in `res`):"
        q_text = "What is the value of `res` afterwards?"
    stem = (f"Study this optimized solution to **{p['t']}**.\n\n```{fence}\n{code}\n```\n\n{call_intro}\n\n"
            f"```{fence}\n{test}\n```{note}\n\n{q_text}")
    via = ("code executed: the optimized variant was run on the embedded test (twice, deterministic)"
           + ("; distractors from mutated-input runs" if mvals else ""))
    lead = f"Tracing the call (or running it) gives **`{shown}`**."
    sol = solution_text(p, slug, lead)
    if isinstance(val, (int, float)) and not isinstance(val, bool):
        ans = {"value": float(val), "tol": 0}
        return make_q(slug, p, "dryrun", stem, "NVQ", ans, None, sol, via), None
    # SCQ: distractors from mutated runs, then perturbations
    seen = {canon(val)}
    wrong: list = []
    for cand in mvals + perturb(val):
        if type(cand) is not type(val):
            continue
        c = canon(cand)
        if c in seen or len(show(cand, lang)) > 60:
            continue
        seen.add(c)
        wrong.append(cand)
        if len(wrong) == 3:
            break
    if isinstance(val, bool):
        wrong = wrong[:1]
    if len(wrong) < (1 if isinstance(val, bool) else 3):
        return None, "dryrun: not enough distractors"
    opts, key = shuffle_options(slug + "dryrun", f"`{shown}`", [f"`{show(w, lang)}`" for w in wrong])
    return make_q(slug, p, "dryrun", stem, "SCQ", {"keys": [key]}, opts, sol, via), None


# ------------------------------------------------------------------ main


def build() -> tuple[list[dict], dict]:
    data = load_dryrun()
    P = data["P"]
    tax = default_taxonomy()
    report: dict = {"verify": {}, "skipped": {}, "warnings": [], "invalid": []}
    pools = {f: clean_pool(P, f) for f in ("bt", "bs", "ot", "os")}
    out: list[dict] = []
    for slug in sorted(P):
        p = P[slug]
        test, exp = test_of(p)
        res = {}
        for v in ("b", "o"):
            g = run(p, v, [test])[0] if test else {"ok": False}
            want = (p.get("jeb") or exp) if (v == "b" and p.get("lang") == "js") else exp
            res[v] = bool(test) and matches(p, g, want)
        report["verify"][slug] = res
        report["warnings"] += shape_warnings(slug, p)
        if not (res["b"] and res["o"]):
            report["skipped"][slug] = ["problem tests failed: no questions emitted"]
            continue
        cands = [
            complexity_q(slug, p, "time", "ot", pools["ot"], "time complexity", "the optimized solution"),
            complexity_q(slug, p, "space", "os", pools["os"], "space complexity", "the optimized solution"),
            complexity_q(slug, p, "brute", "bt", pools["bt"], "time complexity", "the beginner (brute-force) solution"),
            pattern_q(slug, p, P),
            dryrun_q(slug, p),
        ]
        for kind, (q, why) in zip(KINDS, cands):
            if q is None:
                report["skipped"].setdefault(slug, []).append(why)
                continue
            r = validate_question(q, tax, slug + ":" + kind)
            if not r.ok:
                report["invalid"].append(f"{q['id']}: {'; '.join(r.errors)[:160]}")
                report["skipped"].setdefault(slug, []).append(f"{kind}: failed validation")
                continue
            out.append(q)
    ids = [q["id"] for q in out]
    assert len(ids) == len(set(ids)), "duplicate question ids"
    return out, report


def main() -> int:
    qs, report = build()
    qs.sort(key=lambda q: q["id"])
    OUT.write_text(json.dumps(qs, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    kinds = Counter(next(k for k in KINDS if q["id"].endswith(k.capitalize())) for q in qs)
    chap = Counter(q["tax"]["chapter"] for q in qs)
    report["counts"] = {"total": len(qs), "by_kind": dict(kinds), "by_chapter": dict(sorted(chap.items())),
                        "by_type": dict(Counter(q["type"] for q in qs))}
    report["verify_summary"] = {
        "problems": len(report["verify"]),
        "b_pass": sum(v["b"] for v in report["verify"].values()),
        "o_pass": sum(v["o"] for v in report["verify"].values()),
    }
    REPORT.write_text(json.dumps(report, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("wrote", OUT, len(qs))
    print(json.dumps(report["counts"], indent=1))
    print("verify:", report["verify_summary"], "invalid:", len(report["invalid"]), "warnings:", len(report["warnings"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
