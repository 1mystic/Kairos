"""LaTeX-ish workbook text -> the app's markdown subset (fences, pipe tables, `$..$` math, **bold**, *italic*, `code`).

convert(text, ctx) returns markdown; problems are appended to ctx.issues (strings starting with a reason code).
Figures: ``[FIGURE n: path]`` placeholders are resolved through ctx.figure(path) -> markdown image string.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Callable

OPEN, CLOSE = "\ue000", "\ue001"
PH = re.compile(OPEN + r"(\d+)" + CLOSE)

# KaTeX commands seen in the corpus (all supported by KaTeX); anything else is an issue.
KATEX_OK = set("""frac to mid neg mathcal cdot mathbf operatorname big le sqrt sigma begin end text ge alpha sum ln lambda pi
beta Phi det int tfrac mathit log times mu dots approx Rightarrow wedge infty vee sin in displaystyle Theta top sim bar perp
dfrac max binom ne forall Pi cos triangle lim exists triangledown partial diamond cap lfloor rfloor chi underline hat Big min
theta tan pm mathrm leftarrow rho dim eta lceil rceil cup ell models left right bmod bowtie cdots prod propto gamma texttt gets
subseteq iff sec varphi equiv circ nu Sigma cot nabla ll vdash oplus mapsto deg exp sinh cosh leftrightarrow prec div neq ni
square Leftrightarrow varnothing subset ldots epsilon setminus widehat delta otimes kappa leadsto supseteq notin succeq odot
parallel uparrow phi A C k mathbb""".split())


@dataclass
class Ctx:
    figure: Callable[[str], str] = lambda p: ""
    issues: list[str] = field(default_factory=list)
    table_cells_pipe_fix: bool = True


class Stash:
    def __init__(self) -> None:
        self.items: list[str] = []

    def add(self, s: str) -> str:
        self.items.append(s)
        return f"{OPEN}{len(self.items) - 1}{CLOSE}"

    def restore(self, s: str) -> str:
        for _ in range(20):
            if OPEN not in s:
                break
            s = PH.sub(lambda m: self.items[int(m.group(1))], s)
        return s


FENCE = re.compile(r"```.*?```", re.S)
FIG = re.compile(r"\[FIGURE (\d+): ([^\]]+)\]")


def _stash_math(t: str, st: Stash, ctx: Ctx) -> str:
    out: list[str] = []
    i, n = 0, len(t)
    while i < n:
        c = t[i]
        if c == "\\" and i + 1 < n:
            nx = t[i + 1]
            if nx in "[(":
                close = "\\]" if nx == "[" else "\\)"
                j = t.find(close, i + 2)
                if j < 0:
                    ctx.issues.append(f"latex_math: unclosed \\{nx}")
                    out.append(t[i : i + 2])
                    i += 2
                    continue
                inner = t[i + 2 : j].strip()
                out.append(st.add(("$$" if nx == "[" else "$") + inner + ("$$" if nx == "[" else "$")))
                i = j + 2
                continue
            out.append(t[i : i + 2])
            i += 2
            continue
        if c == "$":
            delim = "$$" if t.startswith("$$", i) else "$"
            j = i + len(delim)
            found = -1
            while j < n:
                if t[j] == "\\":
                    j += 2
                    continue
                if t.startswith(delim, j):
                    found = j
                    break
                j += 1
            if found < 0:
                ctx.issues.append("latex_math: unbalanced $")
                out.append(c)
                i += 1
                continue
            inner = t[i + len(delim) : found]
            if not inner.strip():
                ctx.issues.append("latex_math: empty math")
            out.append(st.add(delim + inner.strip() + delim))
            i = found + len(delim)
            continue
        out.append(c)
        i += 1
    return "".join(out)


def _balanced(s: str, start: int) -> int:
    """s[start] == '{'; return index of the matching '}' or -1."""
    depth = 0
    i = start
    while i < len(s):
        c = s[i]
        if c == "\\":
            i += 2
            continue
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return i
        i += 1
    return -1


_UNESC = [("\\_", "_"), ("\\#", "#"), ("\\%", "%"), ("\\&", "&"), ("\\{", "{"), ("\\}", "}"), ("\\$", "$")]


def _unescape_code(s: str) -> str:
    for a, b in _UNESC:
        s = s.replace(a, b)
    return s.replace("\\dots", "...").replace("\\ ", " ").replace("\\,", " ")


CMD = re.compile(r"\\(textbf|emph|textit|texttt|underline|text)\{")


def _expand_cmds(s: str, st: Stash, ctx: Ctx) -> str:
    out: list[str] = []
    pos = 0
    while True:
        m = CMD.search(s, pos)
        if not m:
            out.append(s[pos:])
            break
        out.append(s[pos : m.start()])
        b = m.end() - 1
        e = _balanced(s, b)
        if e < 0:
            ctx.issues.append(f"latex_leftover: unbalanced \\{m.group(1)}{{")
            out.append(s[m.start() : m.end()])
            pos = m.end()
            continue
        inner = s[b + 1 : e]
        name = m.group(1)
        if name == "texttt":
            body = _unescape_code(inner)
            if OPEN in body:  # math inside: no code span
                out.append(body)
            else:
                fence = "``" if "`" in body else "`"
                out.append(st.add(f"{fence}{body}{fence}" if body else ""))
        else:
            inner = _expand_cmds(inner, st, ctx)
            if name == "textbf":
                out.append(f"**{inner.strip()}**")
            elif name in ("emph", "textit"):
                out.append(f"*{inner.strip()}*")
            elif name == "underline":
                lab = re.sub(r"\\ ", " ", inner).strip()
                out.append(f"____ {lab}" if lab else "____")
            else:  # \text outside math
                out.append(inner)
        pos = e + 1
    return "".join(out)


def _simple_text(s: str, st: Stash, ctx: Ctx) -> str:
    s = _expand_cmds(s, st, ctx)
    if re.search(r"(?<!\\)[{}]", s):
        ctx.issues.append("latex_leftover: stray brace in text")
    s = re.sub(r"\\\\[ \t]*(\[[^\]]*\])?[ \t]*\n?", "\n", s)
    s = s.replace("\\newline", "\n").replace("\\noindent", "").replace("\\hfill", " ")
    s = re.sub(r"\\item\b\s*", "\n- ", s)
    for a, b in (("\\&", "&"), ("\\%", "%"), ("\\#", "#"), ("\\_", "_"), ("\\{", "{"), ("\\}", "}")):
        s = s.replace(a, b)
    s = s.replace("\\textdegree", "\u00b0")
    s = re.sub(r"\\(?:ldots|dots)\b", "...", s)
    s = re.sub(r"\\(?:quad|qquad|;|:|>)", " ", s)
    s = s.replace("\\,", "\u202f").replace("\\!", "").replace("\\ ", " ")
    s = s.replace("~", " ")
    s = re.sub(r"``(.*?)''", r'"\1"', s, flags=re.S)
    s = s.replace("---", "\u2014").replace("--", "\u2013")
    return s


def _check_math_cmds(inner: str, ctx: Ctx) -> None:
    for c in set(re.findall(r"\\([a-zA-Z]+)", inner)):
        if c not in KATEX_OK:
            ctx.issues.append(f"unknown_macro: \\{c}")


def _table(spec_body: str, st: Stash, ctx: Ctx) -> str:
    body = re.sub(r"\\(?:toprule|midrule|bottomrule|hline)\b", "", spec_body)
    rows = [r.strip() for r in re.split(r"\\\\", body)]
    rows = [r for r in rows if r]
    grid: list[list[str]] = []
    for r in rows:
        cells = [c.strip() for c in re.split(r"(?<!\\)&", r)]
        out = []
        for c in cells:
            if "\\multicolumn" in c or "\\multirow" in c:
                ctx.issues.append("table_shape: multicolumn/multirow")
            for pid in PH.findall(c):  # math inside a pipe-table cell: protect '|'
                v = st.items[int(pid)]
                if "|" in v:
                    st.items[int(pid)] = v.replace("\\|", "\\Vert ").replace("|", "\\vert ")
            txt = _simple_text(c, st, ctx).replace("\n", " ").strip()
            if "|" in st.restore(txt) and not _only_math_pipes(txt, st):
                ctx.issues.append("table_shape: pipe in cell text")
            out.append(txt)
        grid.append(out)
    if not grid:
        ctx.issues.append("table_shape: empty table")
        return ""
    n = len(grid[0])
    for g in grid:
        if len(g) != n:
            ctx.issues.append(f"table_shape: row has {len(g)} cells, header {n}")
            return ""
    lines = ["| " + " | ".join(grid[0]) + " |", "| " + " | ".join(["---"] * n) + " |"]
    lines += ["| " + " | ".join(r) + " |" for r in grid[1:]]
    return "\n\n" + "\n".join(lines) + "\n\n"


def _only_math_pipes(txt: str, st: Stash) -> bool:
    return "|" not in PH.sub("", txt)


def convert(text: str, ctx: Ctx) -> str:
    st = Stash()
    t = FENCE.sub(lambda m: st.add(m.group(0)), text)
    t = FIG.sub(lambda m: st.add("\n\n" + ctx.figure(m.group(2).strip()) + "\n\n"), t)
    t = _stash_math(t, st, ctx)
    for pid, item in enumerate(st.items):
        if item.startswith("$"):
            _check_math_cmds(item, ctx)
    # tabulars
    out: list[str] = []
    pos = 0
    while True:
        i = t.find("\\begin{tabular}", pos)
        if i < 0:
            out.append(t[pos:])
            break
        out.append(t[pos:i])
        j = i + len("\\begin{tabular}")
        if j < len(t) and t[j] == "{":
            k = _balanced(t, j)
            j = k + 1 if k >= 0 else j
        e = t.find("\\end{tabular}", j)
        if e < 0:
            ctx.issues.append("table_shape: unclosed tabular")
            out.append(t[i:])
            break
        out.append(st.add(_table(t[j:e], st, ctx)))
        pos = e + len("\\end{tabular}")
    t = "".join(out)
    t = _simple_text(t, st, ctx)
    t = st.restore(t)
    # leftovers outside math/code
    probe = FENCE.sub(" ", t)
    probe = re.sub(r"\$\$.*?\$\$|\$.*?\$", " ", probe, flags=re.S)
    probe = re.sub(r"`[^`]*`", " ", probe)
    for c in re.findall(r"\\[a-zA-Z]+|\\.", probe):
        ctx.issues.append(f"latex_leftover: {c}")
    t = "\n".join(l.rstrip() for l in t.split("\n"))
    t = re.sub(r"\n{3,}", "\n\n", t).strip()
    return t
