"""Framework for our own original NEET UG / IAT practice questions (Biology priority, plus PHY/CHE gaps).

Every module in this package calls S()/M()/N()/AR() at import time. Computable items assert their answer
by code next to the item; factual items state the textbook rule in the solution and are recorded as
``second-derivation`` (fact + rule written independently of the option choice). Items are original wording.

  python -m pipeline.neet_authored.build      # writes pipeline/bank_src/authored_neet_iat.json
"""
from __future__ import annotations

import hashlib
import random
from collections import Counter

ITEMS: list[dict] = []
_KEYS: Counter = Counter()
LETTERS = "ABCDEFGH"

AR_OPTIONS = [
    "Both A and R are true and R is the correct explanation of A",
    "Both A and R are true but R is not the correct explanation of A",
    "A is true but R is false",
    "A is false but R is true",
]
SD = "second-derivation"
CODE = "recomputed-by-code"


def _key(ch: str) -> str:
    _KEYS[ch] += 1
    return f"{ch}.{_KEYS[ch]:02d}"


def _reg(ch, typ, stem, options, answer, sol, diff, via):
    assert diff in ("E", "M", "H")
    ITEMS.append({"key": _key(ch), "ch": ch, "type": typ, "stem": stem.strip(), "options": options,
                  "answer": answer, "solution": sol.strip(), "diff": diff, "via": via})


def S(ch, diff, stem, correct, wrong, sol, via=SD):
    """SCQ: correct option text + exactly 3 distinct wrong texts. Option order is shuffled deterministically."""
    texts = [correct] + list(wrong)
    assert len(texts) == 4 and len({t.strip() for t in texts}) == 4, f"{ch}: options must be 4 distinct: {stem[:50]}"
    order = list(range(4))
    random.Random(f"{ch}|{stem}").shuffle(order)
    opts = [texts[i] for i in order]
    _reg(ch, "SCQ", stem, opts, {"keys": [LETTERS[order.index(0)]]}, sol, diff, via)


def M(ch, diff, stem, statements, sol, via=SD):
    """MSQ: list of (text, is_true), 4 statements, at least one true and one false."""
    assert len(statements) == 4 and any(t for _, t in statements) and not all(t for _, t in statements)
    _reg(ch, "MSQ", stem, [s for s, _ in statements], {"keys": [LETTERS[i] for i, (_, t) in enumerate(statements) if t]},
         sol, diff, via)


def N(ch, diff, stem, value, sol, via=CODE, integer=False, tol=0.0):
    """Numeric answer (NVQ, or INT when integer=True)."""
    if integer:
        assert float(value) == int(value)
    _reg(ch, "INT" if integer else "NVQ", stem, None, {"value": float(value), "tol": float(tol)}, sol, diff, via)


def AR(ch, diff, assertion, reason, code, sol, via=SD):
    """Assertion-Reason with the standard four options (fixed order). code in 'ABCD' = key of the correct option."""
    assert code in "ABCD"
    stem = f"**Assertion (A):** {assertion}\n\n**Reason (R):** {reason}\n\nChoose the correct option."
    _reg(ch, "ASSERT_REASON", stem, list(AR_OPTIONS), {"keys": [code]}, sol, diff, via)


def qid(key: str) -> str:
    return "q_" + hashlib.sha1(f"neet_iat_auth|{key}".encode()).hexdigest()[:12]
