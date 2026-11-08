"""Validate question JSON files.  python -m pipeline.validate PATH [PATH...]

PATH is a .json file (array of questions, or {"questions": [...]}) or a directory
(all *.json inside, recursive). Exit code 1 if any error.
"""
from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path

from pydantic import ValidationError

from .schema import Question
from .taxonomy import Taxonomy, default_taxonomy, load_taxonomy


@dataclass
class Result:
    id: str
    file: str
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    question: Question | None = None

    @property
    def ok(self) -> bool:
        return not self.errors


def _flatten(e: ValidationError) -> list[str]:
    out: list[str] = []
    for err in e.errors():
        msg = err["msg"]
        if msg.startswith("Value error, "):
            msg = msg[len("Value error, "):]
        loc = ".".join(str(x) for x in err["loc"])
        for line in msg.split("\n"):
            out.append(f"{loc}: {line}" if loc else line)
    return out


def collect_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for p in paths:
        if p.is_dir():
            files += sorted(p.rglob("*.json"))
        else:
            files.append(p)
    return files


def validate_question(raw: object, tax: Taxonomy, file: str = "") -> Result:
    qid = raw.get("id") if isinstance(raw, dict) and isinstance(raw.get("id"), str) else "<no id>"
    res = Result(id=qid, file=file)
    if not isinstance(raw, dict):
        res.errors.append("question must be a JSON object")
        return res
    try:
        res.question = Question.model_validate(raw, context={"taxonomy": tax})
    except ValidationError as e:
        res.errors += _flatten(e)
    if res.question is None and raw.get("answer") is None and raw.get("status") != "verified":
        res.warnings.append("answer missing")
    elif res.question is not None and res.question.answer is None:
        res.warnings.append("answer missing")
    return res


def validate_paths(paths: list[Path], tax: Taxonomy | None = None) -> list[Result]:
    tax = tax or default_taxonomy()
    results: list[Result] = []
    seen: dict[str, str] = {}
    for f in collect_files(paths):
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError) as e:
            results.append(Result(id=f.name, file=str(f), errors=[f"cannot read JSON: {e}"]))
            continue
        items = data.get("questions") if isinstance(data, dict) else data
        if not isinstance(items, list):
            results.append(Result(id=f.name, file=str(f), errors=["expected an array or {\"questions\": [...]}"]))
            continue
        for raw in items:
            r = validate_question(raw, tax, str(f))
            if r.id in seen and r.id != "<no id>":
                r.errors.append(f"duplicate id (also in {seen[r.id]})")
            seen.setdefault(r.id, str(f))
            results.append(r)
    return results


def print_report(results: list[Result], out=sys.stdout, verbose: bool = True) -> None:
    for r in results:
        if r.ok:
            if verbose:
                print(f"ok    {r.id}" + (f"  (warn: {'; '.join(r.warnings)})" if r.warnings else ""), file=out)
        else:
            print(f"ERROR {r.id}  [{Path(r.file).name}]", file=out)
            for m in r.errors:
                print(f"        - {m}", file=out)
    bad = sum(not r.ok for r in results)
    print(f"{len(results)} questions: {len(results) - bad} ok, {bad} with errors", file=out)


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="pipeline.validate", description=__doc__)
    ap.add_argument("paths", nargs="+", type=Path)
    ap.add_argument("--taxonomy", type=Path, help="override taxonomy.json")
    ap.add_argument("-q", "--quiet", action="store_true", help="only print errors")
    a = ap.parse_args(argv)
    tax = load_taxonomy(a.taxonomy) if a.taxonomy else default_taxonomy()
    results = validate_paths(a.paths, tax)
    print_report(results, verbose=not a.quiet)
    return 1 if any(not r.ok for r in results) else 0


if __name__ == "__main__":
    sys.exit(main())
