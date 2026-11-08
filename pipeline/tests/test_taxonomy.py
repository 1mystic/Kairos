import copy
import json

import pytest
from pydantic import ValidationError

from pipeline.paths import TAXONOMY_PATH
from pipeline.taxonomy import Taxonomy, load_taxonomy


def test_loads_and_ids_unique_and_prefixed():
    t = load_taxonomy()
    assert t.version == 1 and "2026" in t.verify
    assert {s.id for s in t.subjects} == {"PHY", "CHE", "MAT", "BOT", "ZOO"}
    ids = [c.id for c in t.chapter_map().values()]
    assert len(ids) == len(set(ids))
    for s in t.subjects:
        for c in s.chapters:
            assert c.id.startswith(s.id + ".")
            assert all(tp.id.startswith(c.id + ".") for tp in c.topics)


ADV_ONLY = {"CHE.GAS", "CHE.SBLK", "CHE.SOLID", "CHE.SURF", "CHE.METAL", "CHE.POLY"}


def test_exam_flags():
    t = load_taxonomy()
    for s in t.subjects:
        for c in s.chapters:
            assert c.exams.IAT is True
            assert c.class_ in (11, 12)
            if s.id == "MAT":
                assert c.exams.JEE_MAIN and not c.exams.NEET_UG
            if s.id in ("BOT", "ZOO"):
                assert c.exams.NEET_UG and not c.exams.JEE_MAIN
            if s.id in ("PHY", "CHE") and c.id not in ADV_ONLY:
                assert c.exams.JEE_MAIN and c.exams.NEET_UG
            if c.id in ADV_ONLY:  # W7a: chapters kept for JEE Advanced coverage only (VERIFY vs 2026 syllabi)
                assert not c.exams.JEE_MAIN and not c.exams.NEET_UG
    assert t.iat_subject_map["BIO"] == ["BOT", "ZOO"]


def _raw():
    return json.loads(TAXONOMY_PATH.read_text())


def test_duplicate_chapter_id_rejected():
    raw = _raw()
    ch = raw["subjects"][0]["chapters"]
    ch[1]["id"] = ch[0]["id"]
    with pytest.raises(ValidationError, match="duplicate"):
        Taxonomy.model_validate(raw)


def test_wrong_prefix_rejected():
    raw = _raw()
    raw["subjects"][0]["chapters"][0]["id"] = "CHE.XYZ"
    with pytest.raises(ValidationError, match="must be"):
        Taxonomy.model_validate(raw)
    raw = copy.deepcopy(_raw())
    rot = next(c for c in raw["subjects"][0]["chapters"] if c["id"] == "PHY.ROT")
    rot["topics"][0]["id"] = "PHY.OSC.MOI"
    with pytest.raises(ValidationError, match="prefixed"):
        Taxonomy.model_validate(raw)
