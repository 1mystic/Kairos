"""Hand-structured official GATE DA papers (one module per year)."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class Q:
    qno: int
    ch: str  # taxonomy chapter id or topic id
    stem: str
    options: Optional[list]
    note: str = ""

    def __post_init__(self):
        # authoring convenience: r-strings used with literal "\\n\\n" paragraph breaks and escaped quotes
        fix = lambda t: t.replace("\\n\\n", "\n\n").replace('\\"', '"')
        self.stem = fix(self.stem)
        if self.options:
            self.options = [fix(o) for o in self.options]
