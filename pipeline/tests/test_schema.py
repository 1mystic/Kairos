import copy
import json

import pytest

from pipeline.paths import FIXTURES
from pipeline.schema import Question, braces_balanced, check_text, split_math
from pipeline.validate import validate_paths, validate_question
from pipeline.taxonomy import default_taxonomy

BASE = json.loads((FIXTURES / "questions" / "phy.json").read_text())[0]  # SCQ, PHY.ROT


def errs(**over):
    d = copy.deepcopy(BASE)
    d.update(over)
    return validate_question(d, default_taxonomy()).errors


def test_fixture_question_valid():
    assert errs() == []


def test_math_helpers():
    assert split_math("a $x$ b $$y$$ c")[0] == ["x", "y"]
    assert split_math("cost \\$5")[2] == []
    assert split_math("$x")[2]
    assert braces_balanced("\\frac{a}{b}") and braces_balanced("\\{") and not braces_balanced("{a")
    assert check_text("s", "plain x < y and $a<b$") == []
    assert check_text("s", "<script>alert(1)</script>")


def test_scq_one_key_and_subset():
    assert any("exactly one" in e for e in errs(answer={"keys": ["A", "B"]}))
    assert any("not in option keys" in e for e in errs(answer={"keys": ["Z"]}))


def test_msq_multiple_ok():
    assert errs(type="MSQ", answer={"keys": ["A", "B"]}) == []


def test_numeric_types():
    assert any("numeric" in e for e in errs(type="NVQ", options=None, answer={"keys": ["A"]}))
    assert errs(type="NVQ", options=None, answer={"value": 2.5, "tol": 0.01}) == []
    assert errs(type="NVQ", options=None, answer={"range": [2.4, 2.6]}) == []
    assert any("integral" in e for e in errs(type="INT", options=None, answer={"value": 2.5}))
    assert any("must not have options" in e for e in errs(type="NVQ", answer={"value": 1}))


def test_answer_variants():
    assert any("exactly one" in e for e in errs(answer={"keys": ["A"], "value": 1}))
    assert any("lo <= hi" in e for e in errs(type="NVQ", options=None, answer={"range": [3, 1]}))
    assert any("tol" in e for e in errs(type="NVQ", options=None, answer={"tol": 1}))


def test_missing_answer():
    assert any("missing" in e for e in errs(answer=None))
    r = validate_question({**copy.deepcopy(BASE), "answer": None, "status": "needs_review"}, default_taxonomy())
    assert r.ok and r.warnings  # allowed when not verified


def test_unknown_chapter_and_subject_mismatch():
    assert any("unknown chapter" in e for e in errs(tax={"subject": "PHY", "chapter": "PHY.NOPE"}))
    assert any("does not match" in e for e in errs(tax={"subject": "CHE", "chapter": "PHY.ROT"}))
    assert any("not under chapter" in e for e in errs(tax={"subject": "PHY", "chapter": "PHY.ROT", "topics": ["PHY.OSC.X"]}))


def test_extra_fields_rejected():
    assert any("extra" in e.lower() or "Extra" in e for e in errs(bogus=1))


def test_exams_routing():
    q = Question.model_validate(BASE)
    assert q.exams() == ["JEE_MAIN", "NEET_UG", "IAT"]


def test_invalid_fixtures_fail_with_expected_messages():
    res = {r.id: r for r in validate_paths([FIXTURES / "invalid"])}
    expect = {
        "q_badscqtwokeys": "exactly one answer key",
        "q_badnotinoptions": "not in option keys",
        "q_badchapter": "unknown chapter",
        "q_baddollar": "unbalanced '$'",
        "q_badbraces": "unbalanced braces",
        "q_badhtml": "raw HTML",
        "q_badnvqkeys": "numeric answer",
        "q_badintfraction": "integral",
        "q_badmissinganswer": "missing",
        "q_badstruct": "Field required",
        "q_badtype": "Input should be",
        "q_badimgundeclared": "referenced but not declared",
        "q_badimgunused": "never referenced",
        "q_badimgurl": "not allowed",
        "q_badimgalt": "at least 1 character",
        "q_badimgsize": "largest variant",
    }
    assert set(res) == set(expect)
    for qid, frag in expect.items():
        assert not res[qid].ok
        assert any(frag in e for e in res[qid].errors), (qid, res[qid].errors)


def test_good_fixtures_all_valid_and_unique():
    res = validate_paths([FIXTURES / "questions"])
    assert len(res) == 24 and all(r.ok for r in res)
    assert len({r.id for r in res}) == 24


def test_mhchem_accepted():
    assert check_text("s", r"$\ce{N2 + 3H2 <=> 2NH3}$ and $\ce{MnO4^- + 8H+ -> Mn^2+}$ $\pu{1 mol}$") == []
    assert check_text("s", r"$\ce{N2 + 3H2 <=> 2NH3$")


def test_image_refs():
    from pipeline.schema import image_refs

    assert image_refs("a ![x](img:0123456789abcdef) b")[0] == ["0123456789abcdef"]
    assert image_refs("![x](http://e.com/a.png)")[1]
    assert image_refs("![x][ref]")[1]
