"""Framework for our own original JEE Main / IAT practice questions (authored, in-house solutions).

Every module calls scq()/scqn()/msq()/nvq()/intq() at import time. Answers are COMPUTED in the module from the
question parameters and asserted next to the item; distractors are asserted different from the correct value.
Importing a module therefore re-verifies all of its questions.

  python -m pipeline.jee_authored.build     # writes pipeline/bank_src/authored_jee_main.json
  python -m pipeline.jee_authored.verify    # re-runs verification, prints coverage

``via``: "recomputed-by-code" (answer recomputed by an independent routine / brute force / exact arithmetic) or
"second-derivation" (independent second derivation noted in the solution, for conceptual items).
"""
from __future__ import annotations

import hashlib
import math
import random

ITEMS: list[dict] = []
_KEYS: set[str] = set()
LETTERS = "ABCDEFGH"


def _reg(key, ch, typ, stem, options, answer, sol, diff, via, skills):
    assert key not in _KEYS, f"duplicate key {key}"
    assert diff in "EMH" and via in ("recomputed-by-code", "second-derivation"), key
    _KEYS.add(key)
    ITEMS.append({"key": key, "ch": ch, "type": typ, "stem": stem.strip(), "options": options, "answer": answer,
                  "solution": sol.strip(), "diff": diff, "via": via, "skills": skills})


def _place(key, texts, pos):
    assert len(texts) == 4 and len({t.strip().lower() for t in texts}) == 4, f"{key}: options must be 4 distinct"
    order = list(range(4))
    random.Random(key).shuffle(order)
    if pos is not None:
        order.remove(0)
        order.insert(pos, 0)
    return [texts[i] for i in order], LETTERS[order.index(0)]


def scq(key, ch, stem, correct, wrong, sol, diff="M", via="recomputed-by-code", skills=("conceptual",), pos=None):
    opts, k = _place(key, [correct] + list(wrong), pos)
    _reg(key, ch, "SCQ", stem, opts, {"keys": [k]}, sol, diff, via, list(skills))


def fmt(x, sig=3):
    """Number -> '$...$' text with sig significant figures, no trailing zeros."""
    if abs(x - round(x)) < 1e-9 * max(1, abs(x)):
        return f"${int(round(x))}$"
    return f"${x:.{sig}g}$"


def scqn(key, ch, stem, val, wrongs, sol, diff="M", via="recomputed-by-code", skills=("calculation",),
         f=fmt, pos=None):
    """Numeric-valued options. val: computed correct value; wrongs: 3 values (computed from typical mistakes)."""
    for w in wrongs:
        assert abs(w - val) > 1e-6 * max(1, abs(val)), f"{key}: distractor equals correct"
    scq(key, ch, stem, f(val), [f(w) for w in wrongs], sol, diff, via, skills, pos)


def msq(key, ch, stem, statements, sol, diff="M", via="recomputed-by-code", skills=("conceptual",)):
    assert 4 <= len(statements) <= 5 and any(t for _, t in statements) and not all(t for _, t in statements)
    opts = [s for s, _ in statements]
    keys = [LETTERS[i] for i, (_, t) in enumerate(statements) if t]
    _reg(key, ch, "MSQ", stem, opts, {"keys": keys}, sol, diff, via, list(skills))


def intq(key, ch, stem, value, sol, diff="M", via="recomputed-by-code", skills=("calculation",)):
    assert float(value) == int(value) and 0 <= value <= 99, key
    _reg(key, ch, "INT", stem, None, {"value": float(int(value))}, sol, diff, via, list(skills))


def nvq(key, ch, stem, value, tol, sol, diff="M", via="recomputed-by-code", skills=("calculation",)):
    _reg(key, ch, "NVQ", stem, None, {"value": float(value), "tol": float(tol)}, sol, diff, via, list(skills))


def qid(key: str) -> str:
    return "q_" + hashlib.sha1(f"jee_auth|{key}".encode()).hexdigest()[:12]
