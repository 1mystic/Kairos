"""Framework for our own original GATE DA questions.

Every module in this package calls scq()/msq()/nat() at import time. Answers are COMPUTED by code in the module
(and cross-checked by an independent second method with ``assert`` right next to the item), so importing a module
re-verifies all of its questions. ``python -m pipeline.gate_da.verify.run`` imports them all and reports counts;
``python -m pipeline.gate_da.build_authored`` writes pipeline/bank_src/gate_da_authored.json.

Items without code verification state their method in ``via`` ("second-derivation" = independent second
derivation recorded in the worked solution).
"""
from __future__ import annotations

import hashlib
import random

ITEMS: list[dict] = []
_KEYS: set[str] = set()
LETTERS = "ABCDEFGH"


def _reg(key, ch, typ, stem, options, answer, sol, diff, via, marks):
    assert key not in _KEYS, f"duplicate key {key}"
    _KEYS.add(key)
    ITEMS.append({"key": key, "ch": ch, "type": typ, "stem": stem.strip(), "options": options, "answer": answer,
                  "solution": sol.strip(), "diff": diff, "via": via, "marks": marks})


def scq(key, ch, stem, correct, wrong, sol, diff="M", via="recomputed-by-code", marks=1, pos=None):
    """One correct option. correct: str; wrong: list of 3 str (distinct from correct)."""
    texts = [correct] + list(wrong)
    assert len(texts) == 4 and len({t.strip().lower() for t in texts}) == 4, f"{key}: options must be 4 distinct"
    order = list(range(4))
    rnd = random.Random(key)
    rnd.shuffle(order)
    if pos is not None:
        order.remove(0)
        order.insert(pos, 0)
    opts = [texts[i] for i in order]
    _reg(key, ch, "SCQ", stem, opts, {"keys": [LETTERS[order.index(0)]]}, sol, diff, via, marks)


def msq(key, ch, stem, statements, sol, diff="M", via="recomputed-by-code", marks=2):
    """statements: list of (text, is_correct); at least one true. Order kept as given."""
    assert 3 <= len(statements) <= 5 and any(t for _, t in statements)
    opts = [s for s, _ in statements]
    keys = [LETTERS[i] for i, (_, t) in enumerate(statements) if t]
    _reg(key, ch, "MSQ", stem, opts, {"keys": keys}, sol, diff, via, marks)


def nat(key, ch, stem, value, sol, tol=0.0, dec=None, diff="M", via="recomputed-by-code", marks=1):
    """Numeric answer type. Stored as GATE-style range [lo, hi] = value +- tol (tol=0 for exact)."""
    lo, hi = float(value) - tol, float(value) + tol
    if dec is not None:
        lo, hi = round(lo, dec), round(hi, dec)
    _reg(key, ch, "NVQ", stem, None, {"range": [lo, hi]}, sol, diff, via, marks)


def qid(key: str) -> str:
    return "q_" + hashlib.sha1(f"gate_da_auth|{key}".encode()).hexdigest()[:12]
