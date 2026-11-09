"""Pydantic model for content/taxonomy/taxonomy.json (one shared tree, dotted stable IDs)."""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from .paths import TAXONOMY_PATH

SubjectId = Literal["PHY", "CHE", "MAT", "BOT", "ZOO", "GA", "PRS", "LA", "CO", "PDS", "DBW", "ML", "AI"]
EXAMS = ("JEE_MAIN", "NEET_UG", "IAT", "GATE_DA")


class Topic(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str
    name: str


class ExamFlags(BaseModel):
    model_config = ConfigDict(extra="forbid")
    JEE_MAIN: bool
    NEET_UG: bool
    IAT: bool
    GATE_DA: bool = False


class Chapter(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    id: str
    name: str
    class_: Literal[11, 12] = Field(alias="class")
    exams: ExamFlags
    topics: list[Topic] = []


class Subject(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: SubjectId
    name: str
    chapters: list[Chapter]


class Taxonomy(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    version: int
    verify: str = Field(alias="_verify")
    iat_subject_map: dict[str, list[str]] = {}
    subjects: list[Subject]

    @model_validator(mode="after")
    def _check_ids(self) -> "Taxonomy":
        seen: set[str] = set()

        def add(i: str) -> None:
            if i in seen:
                raise ValueError(f"duplicate taxonomy id {i!r}")
            seen.add(i)

        for s in self.subjects:
            add(s.id)
            for c in s.chapters:
                if not c.id.startswith(s.id + ".") or c.id.count(".") != 1:
                    raise ValueError(f"chapter id {c.id!r} must be '{s.id}.<CODE>'")
                add(c.id)
                for t in c.topics:
                    if not t.id.startswith(c.id + "."):
                        raise ValueError(f"topic id {t.id!r} must be prefixed by {c.id + '.'!r}")
                    add(t.id)
        return self

    def chapter_map(self) -> dict[str, Chapter]:
        return {c.id: c for s in self.subjects for c in s.chapters}

    def topic_ids(self) -> set[str]:
        return {t.id for s in self.subjects for c in s.chapters for t in c.topics}


def load_taxonomy(path: Path | str = TAXONOMY_PATH) -> Taxonomy:
    return Taxonomy.model_validate(json.loads(Path(path).read_text(encoding="utf-8")))


@lru_cache(maxsize=1)
def default_taxonomy() -> Taxonomy:
    return load_taxonomy()
