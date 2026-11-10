"""Write app/public/dsa/catalog.json from the embedded DryRun data.  python -m pipeline.dsa.build_catalog"""
from __future__ import annotations

import json
import sys

from ..paths import ROOT
from .chapters import SLUG_CHAPTER, load_dryrun

OUT = ROOT / "app" / "public" / "dsa" / "catalog.json"
FIELDS = ["n", "t", "d", "tg", "pat", "br", "bt", "bs", "ot", "os", "trick", "real"]


def build() -> dict:
    data = load_dryrun()
    P, T = data["P"], data["T"]
    missing = sorted(set(P) - set(SLUG_CHAPTER))
    extra = sorted(set(SLUG_CHAPTER) - set(P))
    if missing or extra:
        raise SystemExit(f"chapter map out of sync: unmapped={missing} unknown={extra}")
    problems = {}
    for slug in sorted(P, key=lambda s: (P[s]["n"], s)):
        p = P[slug]
        rec = {k: p[k] for k in FIELDS}
        rec["lang"] = p.get("lang") or "py"
        rec["chapter"] = SLUG_CHAPTER[slug]
        problems[slug] = rec
    tracks = [{"id": t["id"], "name": t["name"], "focus": t["blurb"], "ids": t["ids"]} for t in T]
    for t in tracks:
        for s in t["ids"]:
            assert s in problems, f"track {t['id']} references unknown {s}"
    return {"version": 1, "tracks": tracks, "problems": problems}


def main() -> int:
    cat = build()
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(cat, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print("wrote", OUT, OUT.stat().st_size, "bytes;", len(cat["problems"]), "problems,", len(cat["tracks"]), "tracks")
    return 0


if __name__ == "__main__":
    sys.exit(main())
