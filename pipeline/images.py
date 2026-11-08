"""Image processing: source png/jpg/webp -> trimmed, white-flattened webp variants.

id        = first 16 hex chars of sha256(original source bytes)
variants  = widths (480, 960), never upscaling past the (trimmed) source width
output    = {img_dir}/{id}.w{W}.webp  (lossless when the source is a <=32-colour line drawing)
"""
from __future__ import annotations

import hashlib
import io
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageChops

WIDTHS = (480, 960)
QUALITY = 80
METHOD = 6
MAX_VARIANT_BYTES = 80 * 1024
LINE_ART_MAX_COLOURS = 32
SOURCE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}


@dataclass
class ProcessedImage:
    id: str
    w: int
    h: int
    variants: dict[int, bytes]  # width -> webp bytes
    lossless: bool
    warnings: list[str] = field(default_factory=list)

    @property
    def widths(self) -> list[int]:
        return sorted(self.variants)


def image_id(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()[:16]


def _flatten_white(im: Image.Image) -> Image.Image:
    if im.mode == "P" and "transparency" in im.info:
        im = im.convert("RGBA")
    if im.mode in ("RGBA", "LA"):
        bg = Image.new("RGB", im.size, (255, 255, 255))
        bg.paste(im.convert("RGBA"), mask=im.convert("RGBA").getchannel("A"))
        return bg
    return im.convert("RGB")


def _trim(im: Image.Image) -> Image.Image:
    diff = ImageChops.difference(im, Image.new("RGB", im.size, (255, 255, 255)))
    bbox = diff.getbbox()
    return im.crop(bbox) if bbox else im


def process_image(data: bytes, widths: tuple[int, ...] = WIDTHS) -> ProcessedImage:
    iid = image_id(data)
    im = Image.open(io.BytesIO(data))
    im.load()
    im = _trim(_flatten_white(im))
    lossless = im.getcolors(maxcolors=LINE_ART_MAX_COLOURS + 1) is not None
    targets = sorted({min(w, im.width) for w in widths})
    out: dict[int, bytes] = {}
    warnings: list[str] = []
    for t in targets:
        v = im if t == im.width else im.resize((t, max(1, round(im.height * t / im.width))), Image.LANCZOS)
        buf = io.BytesIO()
        v.save(buf, "WEBP", quality=QUALITY, method=METHOD, lossless=lossless)
        out[t] = buf.getvalue()
        if len(out[t]) > MAX_VARIANT_BYTES:
            warnings.append(f"{iid}.w{t}.webp is {len(out[t]) // 1024} KB (> 80 KB)")
    big = max(out)
    h = im.height if big == im.width else max(1, round(im.height * big / im.width))
    return ProcessedImage(iid, big, h, out, lossless, warnings)


def index_sources(src_dir: Path) -> dict[str, Path]:
    """Map image id -> source file for every png/jpg/webp in src_dir."""
    res: dict[str, Path] = {}
    if src_dir.is_dir():
        for f in sorted(src_dir.iterdir()):
            if f.suffix.lower() in SOURCE_EXTS:
                res[image_id(f.read_bytes())] = f
    return res


def write_variants(p: ProcessedImage, img_dir: Path) -> list[Path]:
    img_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for w, b in sorted(p.variants.items()):
        f = img_dir / f"{p.id}.w{w}.webp"
        f.write_bytes(b)
        paths.append(f)
    return paths


def main(argv: list[str] | None = None) -> int:
    import argparse
    import sys

    from .paths import ROOT

    ap = argparse.ArgumentParser(prog="pipeline.images", description="Process source images to webp variants.")
    ap.add_argument("sources", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, default=ROOT / "app" / "public" / "img")
    a = ap.parse_args(argv)
    for s in a.sources:
        p = process_image(s.read_bytes())
        write_variants(p, a.out)
        print(f"{s.name}: id={p.id} w={p.w} h={p.h} variants={p.widths} lossless={p.lossless}")
        for w in p.warnings:
            print("warning:", w, file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
