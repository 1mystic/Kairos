"""Tests for the owner GATE DA question-bank converter and mock papers (written, not run by the author)."""
import json

from pipeline.gate_da.qbank import build_mocks
from pipeline.gate_da.qbank.latex import Ctx, convert
from pipeline.ingest import gate_qbank as gq
from pipeline.paths import ROOT
from pipeline.taxonomy import default_taxonomy
from pipeline.validate import validate_paths

BANK = ROOT / "pipeline" / "bank_src" / "gate_da_qbank.json"
QB = ROOT / "pipeline" / "gate_da" / "qbank"


def _conv(t):
    c = Ctx()
    out = convert(t, c)
    return out, c.issues


def test_text_commands_and_escapes():
    out, issues = _conv(r"\emph{no} box holds \textbf{4}; \texttt{a\_b} costs 5\% of ``x'' --- see 3--4.\\Next")
    assert not issues
    assert out == '*no* box holds **4**; `a_b` costs 5% of "x" — see 3–4.\nNext'


def test_math_kept_and_display_normalised():
    out, issues = _conv(r"Let \(x\) and \[y^2\] and $z$.")
    assert not issues and out == "Let $x$ and $$y^2$$ and $z$."


def test_unknown_macro_and_leftover_are_reported():
    _, issues = _conv(r"$\mathbbm{1}$ and \foo{x}")
    assert any(i.startswith("unknown_macro") for i in issues)
    assert any(i.startswith("latex_leftover") for i in issues)


def test_tabular_to_pipe_table_and_pipe_in_math():
    out, issues = _conv("\\begin{tabular}{c|cc}\\toprule\n & $a$ & $|x|$\\\\\\midrule\n1 & 2 & NULL\\\\\n3 & -- & 4\\\\\\bottomrule\n\\end{tabular}")
    assert not issues
    lines = out.strip().split("\n")
    assert lines[0] == "|  | $a$ | $\\vert x\\vert$ |" and lines[1] == "| --- | --- | --- |"
    assert lines[3] == "| 3 | – | 4 |"
    assert len({l.count("|") for l in lines}) == 1


def test_fenced_code_untouched():
    out, issues = _conv("Run:\n\n```sql\nSELECT a -- c\nFROM t WHERE x < 3 AND y > 1;\n```\n")
    assert not issues and "SELECT a -- c" in out and "x < 3 AND y > 1" in out


def test_figure_placeholder_uses_callback():
    c = Ctx(figure=lambda p: f"![alt](img:0123456789abcdef)")
    out = convert("Look.\n\n[FIGURE 1: figures/x.png]\n\nEnd.", c)
    assert "![alt](img:0123456789abcdef)" in out and not c.issues


def test_parse_answer_formats():
    pa = gq.parse_answer
    assert pa({"type": "NAT", "answer": "202", "question": "x"})[0] == {"value": 202, "tol": 0}
    assert pa({"type": "NAT", "answer": "0.477", "question": "x"})[0] == {"value": 0.477, "tol": 0.0005}
    # the stem's "round to d decimals" wins when it asks for more decimals than the key shows
    assert pa({"type": "NAT", "answer": "0.5", "question": "round to 3 decimals"})[0]["tol"] == 0.0005
    assert pa({"type": "NAT", "answer": "−1.732", "question": "x"})[0] == {"value": -1.732, "tol": 0.0005}
    assert pa({"type": "NAT", "answer": "0.105–0.106", "question": "x"})[0] == {"range": [0.105, 0.106]}
    assert pa({"type": "NAT", "answer": "−1.076 to −1.075", "question": "x"})[0] == {"range": [-1.076, -1.075]}
    assert pa({"type": "NAT", "answer": "2.5–2.1", "question": "x"})[1].startswith("answer_parse")
    assert pa({"type": "MSQ", "answer": "C, A, D", "question": "x"})[0] == {"keys": ["A", "C", "D"]}
    assert pa({"type": "MCQ", "answer": "B", "question": "x"})[0] == {"keys": ["B"]}
    assert pa({"type": "MCQ", "answer": "B, C", "question": "x"})[1].startswith("answer_parse")


def test_qid_is_stable():
    assert gq.qid("Q7.12") == gq.qid("Q7.12") and gq.qid("Q7.12") != gq.qid("Q7.13") and gq.qid("Q1.01").startswith("q_")


def test_section_map_and_overrides_use_real_chapters():
    chapters = default_taxonomy().chapter_map()
    secmap = json.loads((QB / "section_map.json").read_text(encoding="utf-8"))
    assert len(secmap) == 124 and set(secmap.values()) <= set(chapters)
    ov = json.loads((QB / "chapter_overrides.json").read_text(encoding="utf-8"))["overrides"]
    assert len(ov) == 120 and set(ov.values()) <= set(chapters)


def test_bank_file_validates_and_is_self_contained():
    res = validate_paths([BANK])
    assert res and all(r.ok for r in res)
    bank = json.loads(BANK.read_text(encoding="utf-8"))
    assert len(bank) == len({q["id"] for q in bank}) and all(q["source"]["kind"] == "authored" for q in bank)
    for q in bank:
        txt = q["stem"] + (q["solution"] or "") + " ".join(o["text"] for o in q.get("options", []))
        assert "[FIGURE" not in txt and "\\textbf" not in txt and "\\begin{tabular}" not in txt
        for im in q["images"]:
            for w in im["variants"]:
                assert (ROOT / "app" / "public" / "img" / f"{im['id']}.w{w}.webp").exists()


def test_figures_have_alt_text_for_every_png():
    alts = json.loads((QB / "figures.json").read_text(encoding="utf-8"))
    pngs = {p.stem for p in (ROOT / "content" / "sources" / "gate_da" / "qbank" / "figures").glob("*.png")}
    assert pngs == set(alts) and all(len(a) > 40 for a in alts.values())


def test_mock_papers_are_consistent_with_the_blueprint():
    bank = {q["id"]: q for q in json.loads(BANK.read_text(encoding="utf-8"))}
    bp = json.loads((ROOT / "content" / "blueprints" / "gate_da_2027.json").read_text(encoding="utf-8"))
    seen: set[str] = set()
    for k in "abc":
        p = json.loads((ROOT / "pipeline" / "fixtures" / "papers" / f"gate_da_mock_{k}.json").read_text(encoding="utf-8"))
        assert p["paperId"] == f"gate_da_mock_{k}" and p["blueprint"] == "gate_da_2027" and p["mini"] is True
        slots = p["slots"]
        assert len(set(slots)) == len(slots) < 65 and not (set(slots) & seen)
        seen |= set(slots)
        assert all(bank[q]["status"] == "verified" for q in slots)
        assign = build_mocks.simulate(bp, slots, bank)
        assert set(assign) == set(slots)  # the app's mini builder keeps every question
        # GA first, then technical in blueprint section order
        order = [assign[q]["id"] for q in slots]
        ids = [s["id"] for sub in bp["subjects"] for s in sub["sections"]]
        assert order == sorted(order, key=ids.index)
