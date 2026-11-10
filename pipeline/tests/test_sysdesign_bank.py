"""Structure checks for the System Design / ML System Design banks and design problems."""
import json

from pipeline.paths import ROOT
from pipeline.taxonomy import default_taxonomy
from pipeline.validate import validate_question

SD = ROOT / "pipeline" / "bank_src" / "sysdesign.json"
MSD = ROOT / "pipeline" / "bank_src" / "ml_sysdesign.json"
PROB = ROOT / "content" / "sources" / "sysdesign" / "problems.json"


def _load(p):
    return json.loads(p.read_text(encoding="utf-8"))


def test_questions_valid_and_tracked():
    tax = default_taxonomy()
    for path, subj, exam in ((SD, "SD", "SYS_DESIGN"), (MSD, "MSD", "ML_SYS_DESIGN")):
        qs = _load(path)
        assert len({q["id"] for q in qs}) == len(qs)
        for q in qs:
            assert validate_question(q, tax, q["id"]).ok
            assert q["tax"]["subject"] == subj and q["in_syllabus"] == {exam: {"2026": True}}
            assert q["source"]["kind"] == "authored" and q["solution_source"] == "in_house"
            assert "Verified by:" in q["solution"]


def test_msq_has_two_correct_and_numeric_have_value():
    for path in (SD, MSD):
        for q in _load(path):
            if q["type"] == "MSQ":
                assert len(q["answer"]["keys"]) >= 2
            if q["type"] in ("NVQ", "INT"):
                assert "value" in q["answer"]


def test_problems_shape():
    doc = _load(PROB)
    ps = doc["problems"]
    assert len(ps) == 18
    for p in ps:
        assert 8 <= len(p["rubric"]) <= 14
        assert p["requirements"]["functional"] and p["requirements"]["nonFunctional"]
        assert p["estimation"]["given"] and p["estimation"]["tasks"] and p["referenceOutline"]
