"""Publish the static question bank.

python -m pipeline.publish --version N [--src DIR ...  (default: pipeline/fixtures/questions + pipeline/bank_src)] [--out app/public/bank] [--force]

Routing: a question is written to one shard per exam in schema.EXAMS it is served under (appearances + in_syllabus).
'JEE_ADV' appearances have no shard tree: such questions land in JEE_MAIN/ only when in_syllabus.JEE_MAIN has a true year.

Output (deterministic: sorted keys, gzip mtime=0):
  bank/v{N}/{exam}/{subject}/{chapter}.json.gz   verified questions, with answers + solutions
  bank/v{N}/mocks/{paperId}.json                 mock papers, answers/solutions stripped
  bank/v{N}/taxonomy.json, bank/v{N}/blueprints/*.json
  bank/v{N}/manifest.json                        every other file: sha256, bytes, counts
  bank/latest.json                               {"version": N}
  img/{id}.w{W}.webp                                 (sibling of bank/, or --img-out) referenced images;
                                                     listed in manifest "images" (paths relative to bank/..)
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import shutil
import sys
from pathlib import Path

from .images import index_sources, process_image, write_variants
from .paths import BLUEPRINTS_DIR, DEFAULT_OUT, DEFAULT_PAPERS, DEFAULT_SRCS, FIXTURES, TAXONOMY_PATH
from .schema import Question, image_refs
from .validate import print_report, validate_paths

STRIP_KEYS = ("answer", "solution", "solution_source")


class PublishError(Exception):
    pass


def dumps(obj, indent: int | None = None) -> bytes:
    return (json.dumps(obj, sort_keys=True, ensure_ascii=False, indent=indent,
                       separators=(",", ":") if indent is None else None) + "\n").encode("utf-8")


def gz(data: bytes) -> bytes:
    import io

    buf = io.BytesIO()
    with gzip.GzipFile(filename="", mode="wb", fileobj=buf, mtime=0, compresslevel=9) as f:
        f.write(data)
    return buf.getvalue()


def qdict(q: Question) -> dict:
    return q.model_dump(mode="json", by_alias=True, exclude_none=True)


def strip_for_mock(d: dict) -> dict:
    d = {k: v for k, v in d.items() if k not in STRIP_KEYS}
    if d.get("images"):  # drop images only used by the (stripped) solution
        texts = [d.get("stem", ""), d.get("passage", "")] + [o["text"] for o in d.get("options", [])]
        used = {i for t in texts for i in image_refs(t)[0]}
        d["images"] = [im for im in d["images"] if im["id"] in used]
    return d


def load_papers(papers_dir: Path) -> list[dict]:
    papers = []
    if papers_dir.is_dir():
        for f in sorted(papers_dir.glob("*.json")):
            p = json.loads(f.read_text(encoding="utf-8"))
            for k in ("paperId", "blueprint", "title", "slots"):
                if k not in p:
                    raise PublishError(f"{f.name}: paper missing {k!r}")
            if not (BLUEPRINTS_DIR / f"{p['blueprint']}.json").exists():
                raise PublishError(f"{f.name}: unknown blueprint {p['blueprint']!r}")
            papers.append(p)
    return papers


def build(src: Path | list[Path], papers_dir: Path, img_src: Path | None = None):
    """Return {relative path: (bytes, manifest-meta)} without touching disk."""
    results = validate_paths([src] if isinstance(src, Path) else list(src))
    if any(not r.ok for r in results):
        import io

        buf = io.StringIO()
        print_report(results, out=buf, verbose=False)
        raise PublishError("validation failed:\n" + buf.getvalue())
    questions = {r.question.id: r.question for r in results if r.question}
    verified = {i: q for i, q in questions.items() if q.status == "verified"}

    groups: dict[tuple[str, str, str], list[dict]] = {}
    for q in verified.values():
        for exam in q.exams():
            groups.setdefault((exam, q.tax.subject, q.tax.chapter), []).append(qdict(q))

    files: dict[str, tuple[bytes, dict]] = {}
    for (exam, subj, chap), qs in sorted(groups.items()):
        qs.sort(key=lambda d: d["id"])
        files[f"{exam}/{subj}/{chap}.json.gz"] = (
            gz(dumps(qs)),
            {"kind": "shard", "exam": exam, "subject": subj, "chapter": chap, "count": len(qs)},
        )

    for p in load_papers(papers_dir):
        qs = []
        for qid in p["slots"]:
            if qid not in verified:
                raise PublishError(f"paper {p['paperId']}: slot {qid!r} is not a verified question")
            qs.append(strip_for_mock(qdict(verified[qid])))
        doc = {k: v for k, v in p.items() if k != "slots"}
        doc["slots"] = list(p["slots"])
        doc["questions"] = qs
        files[f"mocks/{p['paperId']}.json"] = (
            dumps(doc), {"kind": "mock", "paperId": p["paperId"], "count": len(qs)})

    # images referenced by published (verified) questions
    img_src_idx = index_sources(img_src or FIXTURES / "images")
    images: dict[str, tuple[bytes, dict]] = {}
    declared = {}
    for q in verified.values():
        for im in q.images:
            declared[im.id] = im
    for iid, im in sorted(declared.items()):
        if iid not in img_src_idx:
            raise PublishError(f"image {iid} ({im.alt!r}) has no source file in {img_src or FIXTURES / 'images'}")
        pi = process_image(img_src_idx[iid].read_bytes())
        if (pi.w, pi.h, pi.widths) != (im.w, im.h, sorted(im.variants)):
            raise PublishError(
                f"image {iid}: declared w={im.w} h={im.h} variants={sorted(im.variants)} "
                f"but source gives w={pi.w} h={pi.h} variants={pi.widths}")
        for warn in pi.warnings:
            print(f"warning: {warn}", file=sys.stderr)
        for w, b in sorted(pi.variants.items()):
            images[f"img/{iid}.w{w}.webp"] = (b, {"kind": "image", "id": iid, "w": w})
    files["__images__"] = (b"", {"images": images})

    files["taxonomy.json"] = (TAXONOMY_PATH.read_bytes(), {"kind": "taxonomy"})
    for f in sorted(BLUEPRINTS_DIR.glob("*.json")):
        files[f"blueprints/{f.name}"] = (f.read_bytes(), {"kind": "blueprint"})
    files["__total__"] = (b"", {"questions": len(verified), "skipped_unverified": len(questions) - len(verified)})
    return files


def publish(version: int, src: Path | list[Path], out: Path, papers: Path, force: bool = False,
            img_src: Path | None = None, img_out: Path | None = None) -> Path:
    files = build(src, papers, img_src)
    images = files.pop("__images__")[1]["images"]
    img_root = img_out if img_out is not None else out.parent / "img"
    total = files.pop("__total__")[1]
    vdir = out / f"v{version}"
    if vdir.exists():
        if not force:
            raise PublishError(f"{vdir} already exists; use --force to overwrite")
        shutil.rmtree(vdir)
    entries = []
    for rel in sorted(files):
        data, meta = files[rel]
        dest = vdir / rel
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        entries.append({"path": rel, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), **meta})
    img_entries = []
    for rel in sorted(images):
        data, meta = images[rel]
        dest = img_root / Path(rel).name
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)
        img_entries.append({"path": rel, "sha256": hashlib.sha256(data).hexdigest(), "bytes": len(data), **meta})
    manifest = {"version": version, "schema": 1, "totals": {**total, "images": len({e["id"] for e in img_entries})},
                "files": entries, "images": img_entries}
    (vdir / "manifest.json").write_bytes(dumps(manifest, indent=1))
    (out / "latest.json").write_bytes(dumps({"version": version}))
    return vdir


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.publish", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--version", type=int, required=True)
    ap.add_argument("--src", type=Path, action="append", default=None,
                    help="question dir/file, repeatable (default: fixtures/questions + bank_src)")
    ap.add_argument("--papers", type=Path, default=DEFAULT_PAPERS)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--img-src", type=Path, default=FIXTURES / "images", help="source png/jpg/webp dir")
    ap.add_argument("--img-out", type=Path, default=None, help="default: <out>/../img")
    ap.add_argument("--force", action="store_true", help="overwrite an existing version")
    a = ap.parse_args(argv)
    if a.version < 1:
        ap.error("--version must be >= 1")
    try:
        vdir = publish(a.version, a.src or list(DEFAULT_SRCS), a.out, a.papers, a.force, a.img_src, a.img_out)
    except PublishError as e:
        print(f"publish failed: {e}", file=sys.stderr)
        return 1
    m = json.loads((vdir / "manifest.json").read_text())
    print(f"published {vdir} : {len(m['files'])} files, {m['totals']['questions']} questions")
    return 0


if __name__ == "__main__":
    sys.exit(main())
