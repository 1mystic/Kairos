"""Question schema (pydantic v2) mirroring docs/03_DATA_MODEL.md.

Semantic checks are model validators that raise one ValueError whose message has
one problem per line. Taxonomy is taken from validation context ``{"taxonomy": Taxonomy}``
or, if absent, the repo's content/taxonomy/taxonomy.json.
"""
from __future__ import annotations

import re
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, model_validator

from .taxonomy import EXAMS, Taxonomy, default_taxonomy

QType = Literal["SCQ", "MSQ", "NVQ", "INT", "MATCH", "PARA_CHILD", "ASSERT_REASON"]
# JEE_ADV is an appearance/provenance tag only: it has no shard tree. Such questions are served
# under JEE_MAIN when in_syllabus.JEE_MAIN is true (see Question.exams()).
Exam = Literal["JEE_MAIN", "JEE_ADV", "NEET_UG", "IAT", "GATE_DA", "DSA_INTERVIEW", "SYS_DESIGN", "ML_SYS_DESIGN"]
CHOICE_TYPES = {"SCQ", "MSQ", "MATCH", "ASSERT_REASON"}  # PARA_CHILD may be either
NUMERIC_TYPES = {"NVQ", "INT"}

# ---------------------------------------------------------------- text sanity

_HTML_TAG = re.compile(r"<\s*/?\s*[A-Za-z!][^>]*>")


def split_math(text: str) -> tuple[list[str], str, list[str]]:
    """Return (math segments, text with math removed, delimiter errors).

    ``$...$`` inline, ``$$...$$`` display, ``\\$`` is a literal dollar.
    """
    segs: list[str] = []
    outside: list[str] = []
    errs: list[str] = []
    i, n = 0, len(text)
    while i < n:
        ch = text[i]
        if ch == "\\" and i + 1 < n:
            outside.append(text[i : i + 2])
            i += 2
            continue
        if ch != "$":
            outside.append(ch)
            i += 1
            continue
        delim = "$$" if text.startswith("$$", i) else "$"
        j = i + len(delim)
        start = j
        found = -1
        while j < n:
            if text[j] == "\\":
                j += 2
                continue
            if text.startswith(delim, j):
                found = j
                break
            j += 1
        if found < 0:
            errs.append(f"unbalanced '{delim}' delimiter")
            break
        seg = text[start:found]
        if not seg.strip():
            errs.append(f"empty math segment '{delim}{delim}'")
        segs.append(seg)
        outside.append(" ")
        i = found + len(delim)
    return segs, "".join(outside), errs


def braces_balanced(seg: str) -> bool:
    depth = 0
    i = 0
    while i < len(seg):
        c = seg[i]
        if c == "\\":
            i += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth < 0:
                return False
        i += 1
    return depth == 0


_MD_IMAGE = re.compile(r"!\[([^\]]*)\]\(([^)]*)\)")
_MD_IMAGE_REF = re.compile(r"!\[[^\]]*\]\[[^\]]*\]")
_IMG_TARGET = re.compile(r"^img:([0-9a-f]{16})$")


def image_refs(text: str) -> tuple[list[str], list[str]]:
    """Return (referenced image ids, errors). Only ``![alt](img:<16 hex>)`` is allowed."""
    ids: list[str] = []
    errs: list[str] = []
    for m in _MD_IMAGE.finditer(text):
        t = _IMG_TARGET.match(m.group(2).strip())
        if not t:
            errs.append(f"image target {m.group(2)!r} not allowed (use ![alt](img:<id>))")
        else:
            ids.append(t.group(1))
            if not m.group(1).strip():
                errs.append(f"image img:{t.group(1)} has empty alt text in markdown")
    if _MD_IMAGE_REF.search(text):
        errs.append("reference-style images not allowed (use ![alt](img:<id>))")
    return ids, errs


def check_text(label: str, text: str) -> list[str]:
    segs, outside, errs = split_math(text)
    problems = [f"{label}: {e}" for e in errs]
    for s in segs:
        if not braces_balanced(s):
            problems.append(f"{label}: unbalanced braces in math '{s.strip()[:40]}'")
    if _HTML_TAG.search(outside):
        problems.append(f"{label}: raw HTML tag not allowed (markdown only)")
    return problems


# ---------------------------------------------------------------- sub-models


class Option(BaseModel):
    model_config = ConfigDict(extra="forbid")
    key: str = Field(pattern=r"^[A-Z0-9]{1,2}$")
    text: str


class Answer(BaseModel):
    """Exactly one of: keys | value (+tol) | range."""

    model_config = ConfigDict(extra="forbid")
    keys: Optional[list[str]] = None
    value: Optional[float] = None
    tol: Optional[float] = Field(default=None, ge=0)
    range: Optional[tuple[float, float]] = None

    @model_validator(mode="after")
    def _one_variant(self) -> "Answer":
        n = sum(x is not None for x in (self.keys, self.value, self.range))
        if n != 1:
            raise ValueError("answer must have exactly one of keys | value(+tol) | range")
        if self.tol is not None and self.value is None:
            raise ValueError("answer.tol only valid with answer.value")
        if self.keys is not None:
            if not self.keys:
                raise ValueError("answer.keys must be non-empty")
            if len(set(self.keys)) != len(self.keys):
                raise ValueError("answer.keys has duplicates")
        if self.range is not None and self.range[0] > self.range[1]:
            raise ValueError("answer.range must be [lo, hi] with lo <= hi")
        return self


class ImageRef(BaseModel):
    """Entry of Question.images. id = sha256(original source bytes)[:16]."""

    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=r"^[0-9a-f]{16}$")
    w: int = Field(gt=0)  # intrinsic size of the largest variant
    h: int = Field(gt=0)
    alt: str = Field(min_length=1)
    variants: list[int] = Field(min_length=1)  # generated widths, e.g. [480, 960]

    @model_validator(mode="after")
    def _v(self) -> "ImageRef":
        if any(v <= 0 for v in self.variants) or len(set(self.variants)) != len(self.variants):
            raise ValueError("variants must be unique positive widths")
        if not self.alt.strip():
            raise ValueError("alt must not be blank")
        if max(self.variants) != self.w:
            raise ValueError("w must equal the largest variant width")
        return self


class Tax(BaseModel):
    model_config = ConfigDict(extra="forbid")
    subject: str
    chapter: str
    topics: list[str] = []
    concepts: list[str] = []


class NcertRef(BaseModel):
    model_config = ConfigDict(extra="forbid")
    class_: Literal[11, 12] = Field(alias="class")
    chapter: int
    page: Optional[int] = None


class Appearance(BaseModel):
    model_config = ConfigDict(extra="forbid")
    exam: Exam
    year: int
    session: Optional[int] = None
    shift: Optional[str] = None
    qno: Optional[int] = None


class Difficulty(BaseModel):
    model_config = ConfigDict(extra="forbid")
    label: Literal["E", "M", "H"]
    b: Optional[float] = None
    a: Optional[float] = Field(default=None, gt=0)
    p_correct: Optional[float] = Field(default=None, ge=0, le=1)
    median_time_s: Optional[float] = Field(default=None, ge=0)
    n: Optional[int] = Field(default=None, ge=0)


class Source(BaseModel):
    model_config = ConfigDict(extra="forbid")
    kind: Literal["official", "dataset", "user", "authored"]
    license: Optional[str] = None
    url: Optional[str] = None


class Fingerprint(BaseModel):
    model_config = ConfigDict(extra="forbid")
    simhash: Optional[str] = None
    emb_id: Optional[str] = None


# ---------------------------------------------------------------- question


class Question(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    id: str = Field(pattern=r"^q_[A-Za-z0-9]+$")
    type: QType
    stem: str = Field(min_length=1)
    images: list[ImageRef] = []
    options: Optional[list[Option]] = None
    answer: Optional[Answer] = None  # None allowed (mocks / unreviewed); verified requires it
    solution: Optional[str] = None
    solution_source: Optional[Literal["official", "in_house", "llm_verified", "user"]] = None
    tax: Tax
    skills: list[str] = []
    ncert_ref: Optional[NcertRef] = None
    appearances: list[Appearance] = []
    in_syllabus: dict[Exam, dict[str, bool]] = {}
    difficulty: Optional[Difficulty] = None
    source: Source
    fingerprint: Optional[Fingerprint] = None
    status: Literal["verified", "needs_review", "quarantined"]
    version: int = Field(default=1, ge=1)
    passage_id: Optional[str] = None  # PARA_CHILD only (not in docs/03 yet)
    passage: Optional[str] = None

    @model_validator(mode="after")
    def _semantics(self, info: ValidationInfo) -> "Question":
        ctx = info.context or {}
        tax: Taxonomy = ctx.get("taxonomy") or default_taxonomy()
        p: list[str] = []

        # chapter / taxonomy
        chapters = tax.chapter_map()
        ch = chapters.get(self.tax.chapter)
        if ch is None:
            p.append(f"tax.chapter: unknown chapter {self.tax.chapter!r}")
        else:
            if self.tax.subject != self.tax.chapter.split(".")[0]:
                p.append(f"tax.subject {self.tax.subject!r} does not match chapter {self.tax.chapter!r}")
        for t in self.tax.topics:
            if not t.startswith(self.tax.chapter + "."):
                p.append(f"tax.topics: {t!r} not under chapter {self.tax.chapter!r}")

        # text sanity
        p += check_text("stem", self.stem)
        for o in self.options or []:
            p += check_text(f"option {o.key}", o.text)
        if self.solution:
            p += check_text("solution", self.solution)
        if self.passage:
            p += check_text("passage", self.passage)

        # images: every img: reference declared, every declared image referenced
        texts = [self.stem, self.solution or "", self.passage or ""] + [o.text for o in self.options or []]
        used: set[str] = set()
        for t in texts:
            ids, ierrs = image_refs(t)
            used.update(ids)
            p += [f"images: {e}" for e in ierrs]
        declared = [i.id for i in self.images]
        if len(set(declared)) != len(declared):
            p.append("images: duplicate image ids")
        for u in sorted(used - set(declared)):
            p.append(f"images: img:{u} referenced but not declared in images")
        for d_ in sorted(set(declared) - used):
            p.append(f"images: {d_} declared but never referenced")

        # options
        keys = [o.key for o in self.options or []]
        if len(set(keys)) != len(keys):
            p.append("options: duplicate keys")
        if self.type in CHOICE_TYPES and len(keys) < 2:
            p.append(f"{self.type} requires at least 2 options")
        if self.type in NUMERIC_TYPES and self.options:
            p.append(f"{self.type} must not have options")
        if self.type == "PARA_CHILD" and not self.passage_id:
            p.append("PARA_CHILD requires passage_id")

        # answer
        a = self.answer
        if a is None:
            if self.status == "verified":
                p.append("answer: missing (required for status 'verified')")
        else:
            if self.type in NUMERIC_TYPES:
                if a.keys is not None:
                    p.append(f"{self.type} requires a numeric answer (value or range), got keys")
                elif self.type == "INT":
                    vals = [a.value] if a.value is not None else list(a.range or ())
                    if any(float(v) != int(v) for v in vals):
                        p.append("INT answer must be integral")
            elif a.keys is None:
                if not (self.type == "PARA_CHILD" and not keys):
                    p.append(f"{self.type} requires answer.keys")
            else:
                if self.type in {"SCQ", "ASSERT_REASON", "MATCH"} and len(a.keys) != 1:
                    p.append(f"{self.type} requires exactly one answer key, got {len(a.keys)}")
                missing = [k for k in a.keys if k not in keys]
                if missing:
                    p.append(f"answer.keys {missing} not in option keys {keys}")

        if p:
            raise ValueError("\n".join(p))
        return self

    # ---- helpers
    def exams(self) -> list[str]:
        """Exams this question is served under: appearances + in_syllabus (any year true)."""
        found = {a.exam for a in self.appearances}
        found |= {e for e, years in self.in_syllabus.items() if any(years.values())}
        return [e for e in EXAMS if e in found]
