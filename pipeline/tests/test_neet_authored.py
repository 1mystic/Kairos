"""Tests for the authored NEET UG / IAT bank (written, not run by the author)."""
import json
from collections import Counter

from pipeline.neet_authored import build as nb
from pipeline.taxonomy import default_taxonomy
from pipeline.validate import validate_paths


def test_all_items_import_and_verify():
    items = nb.load_all()  # in-line asserts re-verify every computed answer
    assert len(items) >= 300
    assert len({i["key"] for i in items}) == len(items)


def test_every_biology_chapter_has_at_least_12():
    items = nb.load_all()
    counts = Counter(i["ch"] for i in items)
    chapters = default_taxonomy().chapter_map()
    for ch in chapters:
        if ch.startswith(("BOT.", "ZOO.")):
            assert counts[ch] >= 12, ch


def test_built_file_valid_and_authored():
    res = validate_paths([nb.OUT])
    assert res and all(r.ok for r in res)
    for r in res:
        q = r.question
        assert q.source.kind == "authored" and q.status == "verified" and q.solution_source == "in_house"
        assert q.solution and "Verified by" in q.solution
        assert q.difficulty and q.difficulty.n == 0


def test_text_only_and_in_syllabus_flags():
    for q in json.loads(nb.OUT.read_text(encoding="utf-8")):
        assert not q["images"]
        assert q["in_syllabus"].get("NEET_UG") or q["tax"]["chapter"].split(".")[0] == "CHE"
