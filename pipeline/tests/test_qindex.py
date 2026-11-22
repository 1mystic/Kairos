"""bank/v{N}/qindex.json: {qid: [exam, chapter]} for every published question (resolves old saved AI notes)."""
import gzip
import json

import pytest

from pipeline.paths import DEFAULT_PAPERS, DEFAULT_SRC
from pipeline.publish import publish


@pytest.fixture(scope="module")
def vdir(tmp_path_factory):
    o = tmp_path_factory.mktemp("qidx")
    return publish(1, DEFAULT_SRC, o / "bank", DEFAULT_PAPERS)


def shard_ids(vdir):
    out = {}
    for p in sorted(vdir.rglob("*.json.gz")):
        exam, _subj, chap = p.relative_to(vdir).parts[0], p.parts[-2], p.name.removesuffix(".json.gz")
        for q in json.loads(gzip.decompress(p.read_bytes())):
            out.setdefault(q["id"], []).append((exam, chap))
    return out


def test_qindex_covers_every_published_question(vdir):
    idx = json.loads((vdir / "qindex.json").read_text(encoding="utf-8"))
    ids = shard_ids(vdir)
    assert set(idx) == set(ids)
    for qid, (exam, chap) in idx.items():
        assert (exam, chap) in ids[qid], qid


def test_qindex_is_sorted_and_one_exam_per_qid(vdir):
    raw = (vdir / "qindex.json").read_text(encoding="utf-8")
    idx = json.loads(raw)
    assert list(idx) == sorted(idx)
    assert all(isinstance(v, list) and len(v) == 2 for v in idx.values())
    assert raw == json.dumps(idx, sort_keys=True, ensure_ascii=False, separators=(",", ":")) + "\n"


def test_qindex_is_in_the_manifest(vdir):
    m = json.loads((vdir / "manifest.json").read_text(encoding="utf-8"))
    e = next(f for f in m["files"] if f["path"] == "qindex.json")
    assert e["kind"] == "qindex" and e["count"] == len(json.loads((vdir / "qindex.json").read_text()))
