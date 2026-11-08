# Extraction prompt v2: the user-facing "copy prompt"

The upload page shows this prompt with a Copy button. `{{EXAM}}` and `{{CHAPTER_LIST}}` (lines of `ID — name`) are filled in for the exam the user picks. The pipeline uses the same prompt. Bump the version when it changes; the app stores `prompt_version` on each upload.

```text
You are converting exam questions into strict JSON for a practice app (exam: {{EXAM}}).
I will give you question paper pages as images, a PDF, or pasted text — possibly with an answer key and/or solutions.

OUTPUT: exactly ONE fenced ```json block and nothing else. No commentary before or after it.

RULES
1. One object per question, in the order they appear. Never skip, merge, split, or reorder questions. Keep the printed question number in "n".
2. Copy the wording exactly. Do not paraphrase, simplify, translate, or "fix" questions. If text is unreadable, put [illegible] in its place and set "confidence": "low".
3. Math: LaTeX inside $...$ (inline) or $$...$$ (display). Use \frac, \sqrt, \vec, \hat, ^, _ properly. Units in text (e.g. $5\,\text{m s}^{-1}$).
   Chemistry: mhchem inside math — $\ce{2H2 + O2 -> 2H2O}$, equilibria $\ce{N2 + 3H2 <=> 2NH3}$, ions $\ce{SO4^2-}$, states $\ce{NaCl(aq)}$, units/quantities $\pu{1.5 mol L-1}$.
   Escape a literal dollar sign as \$. No HTML anywhere. Plain markdown only (**bold**, line breaks, "- " lists).
4. "type" is one of:
   SCQ (single correct option), MSQ (one or more correct options), NVQ (numerical answer, may be decimal),
   INT (integer answer), MATCH (match the columns; options are the coded combinations),
   ASSERT_REASON (assertion–reason; options are the standard choices), PARA_CHILD (one question of a passage/comprehension).
   For MATCH, put both lists in the stem as a markdown table. For PARA_CHILD, put the passage once in "passages" and refer to it by "passage_id".
5. Options: keep the printed labels as keys ("A","B","C","D" — map (1)(2)(3)(4) or (a)(b)(c)(d) to A B C D in order). NVQ/INT have "options": null.
6. Answers: fill "answer" ONLY from an answer key or solution that is present in what I gave you. NEVER solve or guess.
   If no key is given, "answer": null. Formats: {"keys":["B"]} | {"keys":["A","C"]} | {"value":2.5,"tol":0.01} | {"value":7}.
   If the key says a question was dropped/bonus, set "answer": null and "note": "dropped".
7. Solutions: copy them if present (same math rules), else null. Do not write your own.
8. Figures: if a question, option, or solution needs a diagram/graph/structure/table image, DO NOT describe it as text instead.
   Add an entry to "figures" with:
     "where": "stem" | "option:A" | ... | "solution",
     "page": page number in the file I gave you (1-based; images count as pages in the order given),
     "bbox": [x0, y0, x1, y1] — the figure's box as fractions of page width/height (0–1, top-left origin), generous by ~2%,
     "alt": a one-line description of what the figure shows (for screen readers), e.g. "block on a 30° incline with friction arrow".
   Put the placeholder {{fig:1}}, {{fig:2}}… (numbered per question) at the exact spot in the stem/option/solution where the figure belongs.
9. "chapter": the closest id from this list, or "UNKNOWN" if none fits:
{{CHAPTER_LIST}}
10. "source": exam, year, session/shift, paper/set, if printed; else null. Never invent it.
11. If there are more than 25 questions, output the first 25, then add "continue_from": <next n> at the top level. I will reply "continue" and you continue from that n in a NEW json block with the same structure.

SCHEMA
{
  "prompt_version": 2,
  "meta": {"title": str, "language": "en" | "hi", "source": {"exam": str, "year": int, "session": str|null, "paper": str|null} | null, "has_answer_key": bool, "has_solutions": bool},
  "passages": [{"id": "P1", "text": str}],
  "questions": [{
    "n": int,
    "type": "SCQ"|"MSQ"|"NVQ"|"INT"|"MATCH"|"ASSERT_REASON"|"PARA_CHILD",
    "passage_id": str|null,
    "stem": str,
    "options": [{"key": "A", "text": str}] | null,
    "answer": {"keys": [str]} | {"value": number, "tol": number} | {"value": number} | null,
    "solution": str|null,
    "chapter": str,
    "figures": [{"id": 1, "where": str, "page": int, "bbox": [num,num,num,num], "alt": str}],
    "confidence": "high" | "low",
    "note": str|null
  }],
  "continue_from": int|null
}

Before you answer, silently check every question: the option count matches the paper, every {{fig:k}} has a matching figure entry, the LaTeX braces balance, and the answer keys exist in the options. Then output only the JSON.
```

## why it looks like this
- `bbox` + `page` let the app **auto-crop figures** from the user's own uploaded pages, so the AI never has to produce image files. The user can adjust each crop.
- `{{fig:k}}` is converted to `![alt](img:<id>)` after the crop is stored as webp (same format as the bank).
- `confidence`, `note: dropped` and "never guess answers" keep bad data out of the user's bank.
- 25 questions per block keeps output within typical chat-model limits.
