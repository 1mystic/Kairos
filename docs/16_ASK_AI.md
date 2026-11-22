# 16 · Ask AI

After a student has answered (or revealed the solution) they can send the question to an AI assistant and save the explanation they like.

## where it shows
Only where the answer is already visible: practice feedback (after Check, or after Reveal on self-check questions), the practice summary and mistake review, and mock review after submission. **Never** in the live mock runner (`cbt/ExamFlow.tsx`) and never before a practice question is answered. Call sites mount `AiHelp` (`components/AiNotePanel.tsx`) next to a `QuestionView` that has `showSolution`.

## how it works
- `lib/askAi.ts` (pure): `buildAiPrompt` (exam, subject/chapter, stem, options, type + answer format; if revealed also the key, official solution and the student's answer; then instructions), `aiTarget` / `aiTargetUrl` (ChatGPT, Claude, Perplexity, Google AI Mode prefill via `?q=`; Gemini has no prefill so it opens `/app` and the prompt goes via clipboard). URLs over ~7000 chars get a shortened prompt; the full one is on the clipboard.
- `AskAiButton`: split button. Main part opens the last-used provider (localStorage `kairos.askAi.provider`, default ChatGPT); the chevron lists all. A click copies the full prompt and opens the site in a new tab (`noopener,noreferrer`).
- `AiNotePanel`: paste, edit, delete the student's saved explanation, rendered with the same safe markdown + KaTeX renderer as solutions (`trust:false`, no raw HTML). Labelled as AI-generated and not checked by Kairos.

## privacy
Nothing is sent automatically. The question text leaves the app only when the student clicks a provider, and goes to that third-party site via the URL / their clipboard. Kairos never calls an AI API and has no keys.

## data
`users/{uid}/ai_notes/{qid}`: `{ qid, text (<= AI_NOTE_MAX = 20000), provider, updatedAt }`. Owner-only read/write in `firestore.rules`. Guests keep it in IndexedDB via `LocalStore` and it migrates on sign-in. One write per save/delete, through `UserStore` (`getAiNote`, `putAiNote`, `deleteAiNote`).
