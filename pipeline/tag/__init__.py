"""Chapter tagging: manual overrides first (manual_tags.json), then keyword rules (rules.py)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path

from .rules import classify

MANUAL = Path(__file__).with_name("manual_tags.json")


@lru_cache(maxsize=1)
def manual_tags() -> dict[str, str]:
    if MANUAL.exists():
        return {k: v for k, v in json.loads(MANUAL.read_text(encoding="utf-8")).items() if not k.startswith("_")}
    return {}


def tag_question(qid: str, subject: str, text: str) -> tuple[str | None, str]:
    """Return (chapter | None, 'manual' | 'rules' | 'none')."""
    m = manual_tags().get(qid)
    if m:
        return m, "manual"
    ch, _ = classify(subject, text)
    return (ch, "rules") if ch else (None, "none")
