"""Run DryRun problem code (python via the current interpreter in a subprocess, js via node)."""
from __future__ import annotations

import json
import re
import subprocess
import sys

from ..paths import ROOT

PY_MARK = re.compile(r"[ \t]+#[!?].*$", re.M)
JS_MARK = re.compile(r"[ \t]+//[!?].*$", re.M)


def strip_marks(code: str, lang: str) -> str:
    return (JS_MARK if lang == "js" else PY_MARK).sub("", code)


def run_py(code: str, tests: list[str], timeout: int = 60) -> list[dict]:
    r = subprocess.run([sys.executable, "-m", "pipeline.dsa._pyrun"], cwd=ROOT, env={"PYTHONPATH": str(ROOT)},
                       input=json.dumps({"code": code, "tests": tests}), capture_output=True, text=True, timeout=timeout)
    if r.returncode:
        return [{"ok": False, "err": "runner crashed: " + r.stderr[-200:]} for _ in tests]
    return json.loads(r.stdout)


def run_js(code: str, tests: list[str], timeout: int = 60) -> list[dict]:
    r = subprocess.run(["node", str(ROOT / "pipeline" / "dsa" / "_jsrun.cjs")],
                       input=json.dumps({"code": code, "tests": tests}), capture_output=True, text=True, timeout=timeout)
    if r.returncode:
        return [{"ok": False, "err": "runner crashed: " + r.stderr[-200:]} for _ in tests]
    return json.loads(r.stdout)


def run(p: dict, variant: str, tests: list[str]) -> list[dict]:
    """variant 'b' or 'o'. Returns per-test dicts with canonical 'value' (python/json-parsed) on success."""
    lang = p.get("lang") or "py"
    code = strip_marks(p[variant], lang)
    try:
        res = run_js(code, tests) if lang == "js" else run_py(code, tests)
    except subprocess.TimeoutExpired:
        return [{"ok": False, "err": "timeout (process)"} for _ in tests]
    return res
