# 09 · Upload your own questions (BYO paper)

An important user view. The flow: student has a paper (PDF, photos, text) → copies our prompt → runs it in any AI chat (ChatGPT, Gemini, Claude…) with their files → pastes the JSON back → the app validates it, auto-crops figures from their pages, lets them fix problems → the questions land in **their private bank** and work in practice, mocks and the planner like bank questions.

## page: `/upload` (guest + signed-in)
1. **Choose exam** (JEE Main / NEET UG / IAT). This fills the chapter list into the prompt.
2. **Copy prompt**: shows `prompts/extract_questions_v2.md` with placeholders filled in, plus a big Copy button, a "how to use" in 3 steps, and tips: send pages in order, include the answer key, type "continue" when asked.
3. **Add your pages** (optional but needed for figures): drop PDF/images. PDF pages are rendered with `pdfjs-dist` at about 1600px long side. Pages are kept locally only, in IndexedDB, and are never uploaded.
4. **Paste JSON**: a textarea that also accepts multiple pasted blocks (for continue_from) or a .json file. Extract the fenced block if the user pasted the whole chat reply.
5. **Review screen**: one card per question.
   - status chips: ok / needs answer / bad math / unknown chapter / figure missing / low confidence / duplicate
   - live preview via QuestionView, with an inline editor (stem, options, answer, chapter dropdown, type)
   - figure crop tool: page image with the AI's bbox pre-drawn, drag handles to adjust, Save crop
   - bulk actions: set chapter for selected, drop selected, accept all ok
6. **Save to my bank**: questions without an answer are saved as `status: needs_answer`. They can be practised as "self-check" only, with no scoring and no mastery update.

## conversion (pure, in /core: `byo.ts`)
- prompt-v2 JSON → zod parse (lenient: coerce option keys, trim), then map to the internal `Question`:
  - `id = "u_" + sha256(normalised stem + options)[:12]`, which also deduplicates against the user's bank
  - `source.kind = "user"`, `solution_source = "user"`
  - `tax` from the chapter, plus `appearances` from meta.source
  - PARA_CHILD gets its passage text copied into `passage`
- `{{fig:k}}` → `![alt](img:<id>)` once the crop exists. Before that the question is invalid ("figure missing").
- validation = core `questionSchema` + `checkMath` + extra checks: answer ∈ options, NVQ numeric, ≥2 options for choice types.

## images on Spark (no Cloud Storage)
- Crop → canvas → resize to ≤960px wide → `toBlob('image/webp', 0.8)`. Retry at q 0.6 if over 80 KB. id = sha256(webp bytes)[:16], one variant only (`variants:[w]`).
- **Guest:** blobs in IndexedDB (`kairos-guest` store `media`).
- **Signed-in:** Firestore `users/{uid}/media/{imgId}` = `{b64: string ≤ 120000 chars, w, h, mime: 'image/webp', createdAt}`. One write per image. Rules enforce owner-only, size cap and immutability.
  - Quota: **max 300 images and 2000 questions per user** (UI shows usage).
  - Read lazily per question and cache in IndexedDB.
- Questions: `users/{uid}/bank/{qid}` (one doc per question, ≤ 50 KB). Saving 25 questions = 1 batched write of 25 docs. Daily cap of 300 questions per user, enforced client-side and documented.
- Guest → sign-in migration (docs/08) also moves `bank` + `media`, within the same caps.

## safety
- Private by default. Sharing to the community (`uploads/`) is phase 4 and needs moderation, which is not in scope.
- KaTeX `trust:false`, markdown only, alt text required.
- The prompt says never guess answers. The UI also labels user-supplied answers "from your key".
