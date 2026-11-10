"""Tiny authoring DSL for original System Design / ML System Design questions.

Usage in content modules::

    C("SD.SCAL")                         # sets the current chapter
    S("E", stem, correct, [w1, w2, w3], solution)       # SCQ
    M("M", stem, [(text, True/False), ...], solution)   # MSQ (>= 2 correct)
    N("M", stem, value, tol, solution)                  # NVQ; ``value`` is computed by code at the call site
    A("E", assertion, reason, key, solution)            # ASSERT_REASON; key 1..4 (standard options)

Verification: N() items are recomputed by code in the module (the stored value IS the computed value, and the
worked solution is checked to contain it). S/M/A items carry an independent second derivation, written as the
"Check:" sentence of the solution.
"""
from __future__ import annotations

import hashlib
import random
import re

ITEMS: list[dict] = []
_IDS: set[str] = set()
LETTERS = "ABCDEFGH"
_cur = {"ch": None, "src": None}
AR_OPTS = ["Both A and R are true and R is the correct explanation of A",
           "Both A and R are true but R is not the correct explanation of A",
           "A is true but R is false",
           "A is false but R is true"]


def C(ch: str, src: str | None = None) -> None:
    """Set current chapter and default source tag (handbook section / case study, used for the coverage table)."""
    _cur["ch"] = ch
    _cur["src"] = src


def qid(stem: str) -> str:
    return "q_" + hashlib.sha1(("sysdesign|" + stem.strip()).encode()).hexdigest()[:12]


def _reg(typ, d, stem, options, answer, sol, via, skill, s=None):
    stem = stem.strip()
    i = qid(stem)
    assert i not in _IDS, f"duplicate stem: {stem[:60]}"
    assert d in "EMH"
    _IDS.add(i)
    ITEMS.append({"ch": _cur["ch"], "type": typ, "d": d, "stem": stem, "options": options, "answer": answer,
                  "sol": sol.strip(), "via": via, "skill": skill, "src": s or _cur["src"]})


def S(d, stem, correct, wrong, sol, skill="conceptual", via="second-derivation", s=None):
    texts = [correct] + list(wrong)
    assert len(texts) == 4 and len({t.strip().lower() for t in texts}) == 4, stem[:50]
    order = list(range(4))
    random.Random(stem).shuffle(order)
    _reg("SCQ", d, stem, [texts[k] for k in order], {"keys": [LETTERS[order.index(0)]]}, sol, via, skill, s)


def M(d, stem, stmts, sol, skill="conceptual", via="second-derivation", s=None):
    assert 4 <= len(stmts) <= 5 and sum(t for _, t in stmts) >= 2 and sum(not t for _, t in stmts) >= 1, stem[:50]
    _reg("MSQ", d, stem, [s for s, _ in stmts], {"keys": [LETTERS[k] for k, (_, t) in enumerate(stmts) if t]}, sol, via, skill, s)


def N(d, stem, value, tol, sol, skill="calculation", integer=False, s=None):
    v = float(value)
    if integer:
        assert abs(v - round(v)) < 1e-9, (stem[:50], v)
        v = float(round(v))
        ans = {"value": v}
        typ = "INT"
    else:
        v = float(f"{v:.6g}")
        ans = {"value": v, "tol": tol}
        typ = "NVQ"
    nums = [float(x.replace(",", "")) for x in re.findall(r"(?<![\d.])\d[\d,]*\.?\d*", sol.replace("{,}", "")) if x.strip(",")]
    assert any(abs(n - v) <= max(tol, 0.006 * abs(v)) for n in nums), f"solution lacks answer {v}: {stem[:50]}"
    _reg(typ, d, stem, None, ans, sol, "recomputed-by-code", skill, s)


def A(d, assertion, reason, key, sol, skill="conceptual", via="second-derivation", s=None):
    stem = f"**Assertion (A):** {assertion}\n\n**Reason (R):** {reason}\n\nChoose the correct option."
    _reg("ASSERT_REASON", d, stem, list(AR_OPTS), {"keys": [LETTERS[key - 1]]}, sol, via, skill, s)
