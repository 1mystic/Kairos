"""Tests for the GATE DA open-bank adapter (written, not run by the author)."""
import json

from pipeline.ingest import gate_openbank as ob
from pipeline.tag.gate_da_rules import classify_gate
from pipeline.taxonomy import default_taxonomy


def test_classify_gate_chapters():
    assert classify_gate("What is the determinant and eigenvalue of this matrix?")[0] == "LA.EIG"
    assert classify_gate("Run quicksort and mergesort on the sorted array; worst-case time complexity")[0] == "PDS.ALG"
    assert classify_gate("Apply Bayes theorem; what is the conditional probability?")[0] == "PRS.PROB"
    assert classify_gate("hello world")[0] is None


def test_classify_topics_exist_in_taxonomy():
    tx = default_taxonomy().topic_ids()
    for ch, lst in __import__("pipeline.tag.gate_da_rules", fromlist=["TOPICS"]).TOPICS.items():
        for suf, _ in lst:
            assert f"{ch}.{suf}" in tx


def test_num_parser():
    assert ob._num("1,200") == (1200.0, 0.0)
    assert ob._num("3.5")[0] == 3.5
    assert ob._num("\\frac{1}{2}") is None


def test_figure_and_offsyllabus_rejected():
    tax = default_taxonomy()
    rec = {"source": "mmlu", "key": "x", "subject": "machine_learning", "stem": "Consider the figure below showing a neural network with hidden layer.", "options": list("abcd"), "answer": "A"}
    assert ob.convert(rec, tax, tax.topic_ids())[1] == "needs_figure"


def test_openbank_output_shape():
    qs = json.loads(ob.OUT.read_text())
    assert qs and all(q["source"]["kind"] == "dataset" and q["source"]["license"] == "MIT" for q in qs)
    assert len({q["id"] for q in qs}) == len(qs)
