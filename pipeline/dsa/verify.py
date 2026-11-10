"""Run every DryRun problem's embedded test for BOTH variants.  python -m pipeline.dsa.verify  -> prints failures; returns dict."""
from __future__ import annotations

import ast
import json
import sys

from .chapters import load_dryrun
from .runner import run


def test_of(p: dict) -> tuple[str, str]:
    return (p["jt"], p["je"]) if (p.get("lang") == "js") else (p.get("test"), p.get("exp"))


def matches(p: dict, got: dict, exp: str) -> bool:
    if not got.get("ok"):
        return False
    if p.get("lang") == "js":
        return json.loads(got["json"] or "null") == json.loads(exp)
    return ast.literal_eval(got["repr"]) == ast.literal_eval(exp) if _lit(got["repr"]) else _evalcmp(got, exp)


def _lit(s: str) -> bool:
    try:
        ast.literal_eval(s)
        return True
    except Exception:
        return False


def _evalcmp(got: dict, exp: str) -> bool:
    return got["repr"] == repr(eval(exp, {"__builtins__": {}}))  # exp is a trusted python literal-ish expression


def verify_all(P: dict) -> dict:
    out = {}
    for slug, p in P.items():
        test, exp = test_of(p)
        r = {}
        for v in ("b", "o"):
            if not test:
                r[v] = "no test"
                continue
            g = run(p, v, [test])[0]
            want = (p.get("jeb") or exp) if (v == "b" and p.get("lang") == "js") else exp  # DryRun: brute variant may differ
            r[v] = "pass" if matches(p, g, want) else f"FAIL {g.get('err') or g.get('repr') or g.get('json')} want {want}"
        out[slug] = r
    return out


def main() -> int:
    P = load_dryrun()["P"]
    res = verify_all(P)
    bad = {s: r for s, r in res.items() if r["b"] != "pass" or r["o"] != "pass"}
    for s, r in bad.items():
        print(s, r)
    print(f"{len(P)} problems, {sum(r['b']=='pass' for r in res.values())} b pass, "
          f"{sum(r['o']=='pass' for r in res.values())} o pass, {len(bad)} problems with failures")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
