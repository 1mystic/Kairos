# user-facing "copy prompt" (also used by the pipeline). {{CHAPTER_ID_LIST}} injected per exam.

```text
You are extracting exam questions into strict JSON. Output ONLY one ```json block, nothing else.
Rules:
- One object per question, in the order they appear. Do not skip or merge questions.
- Keep math in LaTeX inside $...$ (inline) or $$...$$ (display). Chemistry: use \ce{} if possible.
- type: SCQ (one correct), MSQ (multiple correct), NVQ (numeric answer), INT (integer),
  MATCH (list matching), ASSERT_REASON, PARA_CHILD (part of a passage; repeat passage id).
- If an answer key or solutions are present, fill answer/solution. If not, set answer null. NEVER guess the answer.
- If the question needs a diagram/graph/structure, set needs_figure true and describe it in figure_note.
- chapter: choose the closest id from this list, or "UNKNOWN": {{CHAPTER_ID_LIST}}
- source: exam/institute/year/shift if printed on the page, else null.
Schema:
{"meta":{"title":str,"source":str|null,"language":"en|hi"},
 "questions":[{"n":int,"type":str,"passage_id":str|null,"stem":str,
   "options":[{"key":"A","text":str}]|null,
   "answer":{"keys":[str]}|{"value":num,"tol":num}|null,
   "solution":str|null,"chapter":str,"needs_figure":bool,"figure_note":str|null}]}
If the input has more than 30 questions, output the first 30 and end with {"continue_from": <next n>}.
```
validator: zod parse → KaTeX render each → flag missing answer / bad LaTeX / unknown chapter / answer∉options → fix-up UI with crop tool → private bank. limits: 300 q/day, 200KB/paste, App Check.
