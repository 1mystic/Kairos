"""Tests for the authored JEE Main bank (written, not run by the author)."""
from collections import Counter

from pipeline.jee_authored import build as jb
from pipeline.taxonomy import default_taxonomy
from pipeline.validate import validate_paths


def test_all_items_import_and_verify():
    items = jb.load_all()  # inline asserts re-verify every computed answer
    assert len(items) >= 240
    assert len({i["key"] for i in items}) == len(items)


def test_built_file_valid_and_authored():
    res = validate_paths([jb.OUT])
    assert res and all(r.ok for r in res)
    for r in res:
        q = r.question
        assert q.source.kind == "authored" and q.status == "verified" and q.solution_source == "in_house"
        assert q.solution and "Verified by" in q.solution
        assert not q.images and q.appearances == []


def test_types_and_mix():
    qs = [r.question for r in validate_paths([jb.OUT])]
    types = Counter(q.type for q in qs)
    assert {"SCQ", "INT", "NVQ", "MSQ"} <= set(types)
    diff = Counter(q.difficulty.label for q in qs)
    assert diff["E"] and diff["M"] and diff["H"]
    for q in qs:
        if q.type == "SCQ":
            assert len(q.options) == 4 and len(q.answer.keys) == 1
        if q.type == "INT":
            assert 0 <= q.answer.value <= 99 and q.answer.value == int(q.answer.value)


def test_syllabus_flags_follow_taxonomy():
    chapters = default_taxonomy().chapter_map()
    for r in validate_paths([jb.OUT]):
        q = r.question
        flags = chapters[q.tax.chapter].exams.model_dump()
        expected = {e for e in ("JEE_MAIN", "NEET_UG", "IAT") if flags[e]}
        assert set(q.in_syllabus) == expected


def test_thin_chapters_filled():
    qs = [r.question for r in validate_paths([jb.OUT])]
    per = Counter(q.tax.chapter for q in qs)
    for ch in ("PHY.MAGM", "PHY.WOP", "PHY.SEM", "CHE.HC", "CHE.HALO", "CHE.ALC", "MAT.SET", "MAT.INEQ", "MAT.TDI", "MAT.LP"):
        assert per[ch] >= 5, ch
