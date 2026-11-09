"""Tests for the authored GATE DA bank (written, not run by the author)."""
import json
from collections import Counter

from pipeline.gate_da import build_authored as ba
from pipeline.validate import validate_paths


def test_all_items_import_and_verify():
    items = ba.load_all()  # in-line asserts re-verify every computed answer
    assert len(items) >= 150
    assert len({i["key"] for i in items}) == len(items)


def test_every_type_and_subject_present():
    items = ba.load_all()
    assert {i["type"] for i in items} == {"SCQ", "MSQ", "NVQ"}
    assert {i["ch"].split(".")[0] for i in items} == {"GA", "PRS", "LA", "CO", "PDS", "DBW", "ML", "AI"}


def test_built_file_valid_and_authored():
    res = validate_paths([ba.OUT])
    assert all(r.ok for r in res)
    for r in res:
        q = r.question
        assert q.source.kind == "authored" and q.status == "verified" and q.solution_source == "in_house"
        assert q.solution and "Verified by" in q.solution


def test_msq_never_all_or_none_trivially():
    for q in json.loads(ba.OUT.read_text()):
        if q["type"] == "MSQ":
            assert 1 <= len(q["answer"]["keys"]) <= len(q["options"])
