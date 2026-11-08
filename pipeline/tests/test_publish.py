import gzip
import hashlib
import json
import subprocess
import sys

import pytest

from pipeline.paths import DEFAULT_PAPERS, DEFAULT_SRC, FIXTURES, ROOT
from pipeline.publish import PublishError, publish


@pytest.fixture(scope="module")
def out(tmp_path_factory):
    o = tmp_path_factory.mktemp("bank")
    publish(1, DEFAULT_SRC, o / "bank", DEFAULT_PAPERS)
    return o


def all_files(d):
    return sorted(p for p in d.rglob("*") if p.is_file())


@pytest.fixture
def bank(out):
    return out / "bank"


def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()


def test_structure(bank):
    assert json.loads((bank / "latest.json").read_text()) == {"version": 1}
    v = bank / "v1"
    for rel in ("manifest.json", "taxonomy.json", "blueprints/jee_main_2026_p1.json",
                "blueprints/iat_2026.json", "blueprints/neet_ug_2027.json",
                "mocks/sample_jee_mini_v1.json", "JEE_MAIN/PHY/PHY.ROT.json.gz",
                "NEET_UG/BOT/BOT.GEN.json.gz", "IAT/ZOO/ZOO.CIR.json.gz", "IAT/MAT/MAT.LIM.json.gz"):
        assert (v / rel).exists(), rel
    # exam routing: MAT not in NEET, bio not in JEE
    assert not (v / "NEET_UG" / "MAT").exists()
    assert not (v / "JEE_MAIN" / "BOT").exists() and not (v / "JEE_MAIN" / "ZOO").exists()


def test_shard_contents_have_answers(bank):
    qs = json.loads(gzip.decompress((bank / "v1/JEE_MAIN/PHY/PHY.ROT.json.gz").read_bytes()))
    assert isinstance(qs, list) and qs[0]["id"] == "q_phy001"
    assert qs[0]["answer"] == {"keys": ["C"]} and "solution" in qs[0]
    assert qs[0]["ncert_ref"] if "ncert_ref" in qs[0] else True


def walk_keys(o):
    if isinstance(o, dict):
        for k, v in o.items():
            yield k
            yield from walk_keys(v)
    elif isinstance(o, list):
        for x in o:
            yield from walk_keys(x)


def test_mock_has_no_answers(bank):
    raw = (bank / "v1/mocks/sample_jee_mini_v1.json").read_text()
    doc = json.loads(raw)
    assert doc["paperId"] == "sample_jee_mini_v1" and doc["mini"] is True
    assert doc["blueprint"] == "jee_main_2026_p1"
    assert len(doc["questions"]) == 9 and [q["id"] for q in doc["questions"]] == doc["slots"]
    keys = set(walk_keys(doc))
    assert not keys & {"answer", "solution", "solution_source"}
    assert '"answer"' not in raw and '"solution"' not in raw


def test_manifest_integrity(out):
    v = out / "bank" / "v1"
    m = json.loads((v / "manifest.json").read_text())
    listed = {e["path"] for e in m["files"]}
    on_disk = {str(p.relative_to(v)) for p in all_files(v)} - {"manifest.json"}
    assert listed == on_disk
    for e in m["files"]:
        p = v / e["path"]
        assert sha(p) == e["sha256"] and p.stat().st_size == e["bytes"]
        if e["kind"] == "shard":
            assert len(json.loads(gzip.decompress(p.read_bytes()))) == e["count"]
    assert m["totals"]["questions"] == 24 and m["version"] == 1
    assert m["totals"]["images"] == 2 and len(m["images"]) == 4  # 2 images x (w480, w960)
    for e in m["images"]:
        p = out / "img" / e["path"].split("/")[-1]
        assert e["path"].startswith("img/") and sha(p) == e["sha256"] and p.stat().st_size == e["bytes"]


def test_deterministic(out, tmp_path):
    publish(1, DEFAULT_SRC, tmp_path / "bank", DEFAULT_PAPERS)
    a, b = all_files(out), all_files(tmp_path)
    assert [str(p.relative_to(out)) for p in a] == [str(p.relative_to(tmp_path)) for p in b]
    assert [sha(p) for p in a] == [sha(p) for p in b]


def test_image_variants_and_refs(out):
    from PIL import Image

    q = json.loads(gzip.decompress((out / "bank/v1/JEE_MAIN/PHY/PHY.CUR.json.gz").read_bytes()))
    q = next(x for x in q if x["id"] == "q_phy008")
    im = q["images"][0]
    assert f"img:{im['id']}" in q["stem"] and im["alt"] and im["variants"][0] == 480 and im["variants"][-1] == im["w"] <= 960
    for w in im["variants"]:
        f = out / "img" / f"{im['id']}.w{w}.webp"
        assert f.stat().st_size < 80 * 1024
        with Image.open(f) as x:
            assert x.format == "WEBP" and x.width == w
        if w == im["w"]:
            assert Image.open(f).height == im["h"]


def test_images_unit(tmp_path):
    import io

    from PIL import Image

    from pipeline.images import image_id, process_image

    im = Image.new("RGBA", (300, 200), (0, 0, 0, 0))
    for x in range(100, 200):
        im.putpixel((x, 100), (255, 0, 0, 255))
    buf = io.BytesIO()
    im.save(buf, "PNG")
    p = process_image(buf.getvalue())
    assert p.id == image_id(buf.getvalue()) and len(p.id) == 16
    assert p.w == 100 and p.h == 1 and p.widths == [100]  # trimmed, never upscaled
    assert p.lossless
    assert process_image(buf.getvalue()).variants == p.variants  # deterministic


def test_refuses_overwrite_unless_force(out, tmp_path):
    publish(2, DEFAULT_SRC, tmp_path, DEFAULT_PAPERS)
    with pytest.raises(PublishError, match="already exists"):
        publish(2, DEFAULT_SRC, tmp_path, DEFAULT_PAPERS)
    publish(2, DEFAULT_SRC, tmp_path, DEFAULT_PAPERS, force=True)


def test_invalid_source_blocks_publish(tmp_path):
    with pytest.raises(PublishError, match="validation failed"):
        publish(1, FIXTURES / "invalid", tmp_path, DEFAULT_PAPERS)
    assert not (tmp_path / "v1").exists()


def test_unverified_excluded_and_bad_paper_slot(tmp_path):
    import shutil

    src = tmp_path / "src"
    shutil.copytree(DEFAULT_SRC, src)
    f = src / "phy.json"
    d = json.loads(f.read_text())
    d[0]["status"] = "needs_review"
    f.write_text(json.dumps(d))
    with pytest.raises(PublishError, match="not a verified question"):
        publish(1, src, tmp_path / "o", DEFAULT_PAPERS)
    publish(1, src, tmp_path / "o", tmp_path / "nopapers")
    assert json.loads((tmp_path / "o/v1/manifest.json").read_text())["totals"]["questions"] == 23


def test_cli_exit_codes(tmp_path):
    cmd = [sys.executable, "-m", "pipeline.publish", "--version", "1", "--out", str(tmp_path)]
    assert subprocess.run(cmd, cwd=ROOT, capture_output=True).returncode == 0
    assert subprocess.run(cmd, cwd=ROOT, capture_output=True).returncode == 1
    v = [sys.executable, "-m", "pipeline.validate"]
    assert subprocess.run(v + [str(DEFAULT_SRC), "-q"], cwd=ROOT, capture_output=True).returncode == 0
    assert subprocess.run(v + [str(FIXTURES / "invalid")], cwd=ROOT, capture_output=True).returncode == 1
