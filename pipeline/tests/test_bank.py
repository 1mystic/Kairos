"""Quality gates over the whole question bank (fixtures + ingested sources)."""
import json
import re
from collections import Counter

import pytest

from pipeline.ingest import jeebench as jb
from pipeline.paths import DEFAULT_PAPERS, DEFAULT_SRCS, ROOT
from pipeline.publish import build
from pipeline.schema import check_text, split_math
from pipeline.stats import build_tables, load_questions
from pipeline.tag import MANUAL, manual_tags
from pipeline.tag.rules import RULES
from pipeline.taxonomy import default_taxonomy
from pipeline.validate import validate_paths


@pytest.fixture(scope="module")
def qs():
    return load_questions(list(DEFAULT_SRCS))


def test_every_question_validates():
    res = validate_paths(list(DEFAULT_SRCS))
    bad = [(r.id, r.errors) for r in res if not r.ok]
    assert not bad, bad[:3]
    assert len(res) >= 500


def test_ids_unique(qs):
    ids = [q.id for q in qs]
    assert len(ids) == len(set(ids))


def test_no_duplicate_questions(qs):
    """Normalised stem+options; generic stems ('Choose the correct statement(s)') recur with different options."""
    def key(q):
        return jb.norm_stem(q.stem + "".join(o.text for o in q.options or []))
    dup = [k for k, n in Counter(key(q) for q in qs).items() if n > 1]
    assert not dup


def test_math_segments_sane(qs):
    for q in qs:
        texts = [("stem", q.stem)] + [(f"opt {o.key}", o.text) for o in q.options or []]
        for label, t in texts:
            segs, outside, errs = split_math(t)
            assert not errs, (q.id, label, errs)
            assert all(s.strip() for s in segs), (q.id, label)
            assert not check_text(label, t), (q.id, label)
            assert "\\[" not in t and "\\(" not in t, (q.id, label, "unnormalised delimiter")


def test_answers_consistent(qs):
    for q in qs:
        assert q.answer is not None
        if q.options:
            keys = {o.key for o in q.options}
            assert q.answer.keys and set(q.answer.keys) <= keys, q.id
        if q.type == "INT":
            assert q.answer.value is not None and q.answer.value == int(q.answer.value), q.id
        if q.type == "NVQ":
            assert q.answer.value is not None, q.id
            if q.source.kind == "dataset":
                assert q.answer.tol and q.answer.tol > 0, q.id


def test_no_unknown_chapters(qs):
    chapters = default_taxonomy().chapter_map()
    for q in qs:
        assert q.tax.chapter in chapters and "UNKNOWN" not in q.tax.chapter.upper(), q.id
        assert q.tax.subject == q.tax.chapter.split(".")[0]


def test_dataset_questions_provenance(qs):
    ds = [q for q in qs if q.source.kind == "dataset"]
    assert len(ds) >= 450
    for q in ds:
        assert q.source.license == "MIT" and q.source.url == jb.SOURCE_URL
        assert [a.exam for a in q.appearances] == ["JEE_ADV"]
        assert q.difficulty and q.difficulty.n == 0 and q.difficulty.b == jb.DIFF_B[q.difficulty.label]
        assert q.skills
    assert sum(q.source.kind == "authored" for q in qs) == 24


def test_jee_adv_routing(qs):
    """JEE_ADV questions are served from JEE_MAIN shards iff the chapter is in the JEE Main syllabus."""
    tax = default_taxonomy().chapter_map()
    for q in qs:
        if any(a.exam == "JEE_ADV" for a in q.appearances):
            assert q.exams() == (["JEE_MAIN"] if tax[q.tax.chapter].exams.JEE_MAIN else []), q.id
            assert q.in_syllabus["JEE_MAIN"]["2026"] == tax[q.tax.chapter].exams.JEE_MAIN


def test_published_bank_has_no_adv_tree_and_mock(tmp_path):
    files = build(list(DEFAULT_SRCS), DEFAULT_PAPERS)
    paths = [p for p in files if not p.startswith("__")]
    assert not any(p.startswith("JEE_ADV") for p in paths)
    assert "mocks/sample_jee_mini_v1.json" in paths
    shard = [p for p in paths if p.endswith(".json.gz")]
    assert max(len(files[p][0]) for p in shard) < 16_000  # per-chapter gz stays small


def test_ingest_is_reproducible_and_in_sync(tmp_path):
    out, rej = tmp_path / "o.json", tmp_path / "r.json"
    jb.run(jb.SRC, out, rej)
    committed = (jb.OUT).read_text(encoding="utf-8")
    assert out.read_text(encoding="utf-8") == committed
    assert rej.read_text(encoding="utf-8") == jb.REJECTED.read_text(encoding="utf-8")
    assert not [r for r in json.loads(rej.read_text(encoding="utf-8")) if r["reason"] == "needs_manual_tag"]


def test_manual_tags_valid_and_used():
    chapters = default_taxonomy().chapter_map()
    m = manual_tags()
    assert MANUAL.exists() and len(m) > 200
    ids = {q["id"] for q in json.loads(jb.OUT.read_text(encoding="utf-8"))}
    for qid, ch in m.items():
        assert ch in chapters, (qid, ch)
        assert qid in ids, f"manual tag for non-published {qid}"


def test_rules_reference_real_chapters():
    chapters = default_taxonomy().chapter_map()
    for subj, d in RULES.items():
        for ch in d:
            assert ch in chapters and ch.startswith(subj + "."), ch


def test_stats_table(qs):
    table, extra = build_tables(qs)
    assert table[-1][0] == "TOTAL" and table[-1][2] == len(qs)
    assert (ROOT / "content" / "sources" / "bank_stats.md").exists()


# ---------------------------------------------------------------- ingest unit tests


def test_normalise_delimiters():
    t = jb.normalise_latex("If \\(x=1\\) then\n\n\\[\ny=\\frac{1}{2}\n\\]\n\nholds")
    assert "\\[" not in t and "\\(" not in t
    assert "$x=1$" in t and "$$y=\\frac{1}{2}$$" in t
    assert jb.normalise_latex("a \\\\[2pt] b $x$") == "a \\\\[2pt] b $x$"  # row break untouched


@pytest.mark.parametrize("src,out", [
    (r"$\mathrm{H}_{2} \mathrm{O}$", r"$\ce{H2O}$"),
    (r"$\mathrm{CO}_{2}$", r"$\ce{CO2}$"),
    (r"$\mathrm{Na}_{2} \mathrm{CO}_{3}$", r"$\ce{Na2CO3}$"),
    (r"$\mathrm{Fe}$", r"$\mathrm{Fe}$"),  # lone atom untouched
    (r"$\mathrm{H}_{2} \mathrm{O} \rightarrow x$", r"$\mathrm{H}_{2} \mathrm{O} \rightarrow x$"),  # never partial
    (r"$\mathrm{Xx}_{2}$", r"$\mathrm{Xx}_{2}$"),  # not an element
    (r"$2 \mathrm{H}_{2}$", r"$2 \mathrm{H}_{2}$"),
])
def test_chem_conversion_is_conservative(src, out):
    assert jb.normalise_latex(src) == out


def test_split_options_variants():
    s, o = jb.split_options("Stem?\n\n(A) one\n\n(B) two\n\n(C) three\n\n(D) four")
    assert s.strip() == "Stem?" and [k for k, _ in o] == list("ABCD")
    s, o = jb.split_options("Stem?\n\n[A] one\n\n[B] two\n\n[C] three\n\n[D] four")
    assert [t.strip() for _, t in o] == ["one", "two", "three", "four"]
    assert jb.split_options("no options here") is None


def test_numeric_tolerance_convention(monkeypatch):
    monkeypatch.setattr(jb, "tag_question", lambda qid, subj, text: ("MAT.LIM", "manual"))
    tax = default_taxonomy()
    base = {"description": "JEE Adv 2020 Paper 1", "index": 1, "subject": "math", "type": "Numeric",
            "question": "What is $x$ if $x=2$?"}
    q, why = jb.convert({**base, "gold": "0.22"}, tax)
    assert q["answer"] == {"value": 0.22, "tol": 0.01}, why
    q, _ = jb.convert({**base, "gold": "19"}, tax)
    assert q["answer"]["tol"] == 0.01
    q, _ = jb.convert({**base, "gold": "0.0033"}, tax)
    assert q["answer"]["tol"] == 0.0001
    q, why = jb.convert({**base, "type": "Integer", "gold": "2.5"}, tax)
    assert q is None and why == "int_gold_not_integral"
    q, why = jb.convert({**base, "gold": "1", "question": "See the figure below. Find $x$."}, tax)
    assert q is None and why == "references_figure_not_present"
