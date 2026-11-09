"""Tests for the GATE DA official-paper converter (written, not run by the author)."""
import json

from pipeline.ingest import gate_convert as gc
from pipeline.paths import ROOT
from pipeline.validate import validate_paths

KEY_TXT = """
  1         1       MCQ          GA         D        1
 28   1   MSQ          DA       A;B;C        1
 31   1   NAT          DA         3 to 3       1
 59   1   NAT          DA          MTA         2
 34   8   NAT          DA      0.34 to 0.36    1
"""


def test_parse_key_text():
    it = gc.parse_key_text(KEY_TXT)
    assert it["1"]["keys"] == ["D"] and it["1"]["marks"] == 1
    assert it["28"]["keys"] == ["A", "B", "C"]
    assert it["31"]["range"] == [3.0, 3.0]
    assert it["59"]["special"] == "MTA"
    assert it["34"]["range"] == [0.34, 0.36]


def test_qid_stable_and_distinct():
    assert gc.qid(2026, 8, 1) == gc.qid(2026, 8, 1)
    assert gc.qid(2026, 8, 1) != gc.qid(2026, 8, 2)
    assert gc.qid(2026, 8, 1).startswith("q_")


def test_keys_complete():
    for y in gc.YEARS:
        k = json.loads((gc.KEYS_DIR / f"gate_da_{y}_key.json").read_text())["items"]
        assert len(k) == 65
        assert sum(v["marks"] for v in k.values()) == 100 + 0 or True  # MTA rows keep marks
        assert sum(v["marks"] for v in k.values()) == 100


def test_every_key_question_converted_or_quarantined():
    for y in gc.YEARS:
        qs, quar, notes = gc.convert_year(y)
        assert not [n for n in notes if "INFO" not in n], notes
        assert len(qs) + len(quar) == 65


def test_official_bank_validates_and_uses_official_answers():
    res = validate_paths([ROOT / "pipeline" / "bank_src" / "gate_da_official.json"])
    assert all(r.ok for r in res)
    for r in res:
        q = r.question
        assert q.source.kind == "official"
        assert q.in_syllabus["GATE_DA"]["2027"] is True
        if q.status == "verified":
            assert q.answer is not None
