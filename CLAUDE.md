# Kairos — JEE / NEET / IAT prep platform

> working name. greek *kairos* = "the right moment". the product decides **what to practise, when**, counted down from the student's exam date.

## read first (in order)
1. `docs/01_PRODUCT.md` — what we're building and why, headline feature
2. `docs/02_ARCHITECTURE.md` — stack, planes, firebase budget, repo layout
3. `docs/03_DATA_MODEL.md` — schemas (question, event, firestore paths)
4. `docs/04_CBT_UI_SPEC.md` — exam screen spec (NTA-style palette)
5. `docs/05_ALGORITHMS.md` — mastery, FSRS, paper generator, planner, backlog, pace
6. `docs/06_ROADMAP.md` — build order + done criteria. **work phase by phase**
7. `brand/BRAND.md` + `brand/tokens.css` — name, colours, type, logo
8. `docs/07_FREE_TIER.md` — **Spark-only constraints. overrides 02 where they conflict.**
9. `docs/00_WORKPLAN.md` — current task breakdown + status

## non-negotiables
- **exam patterns are config.** never hard-code counts/marks. read `content/blueprints/*.json`.
- **question bank is static** (versioned JSON shards on hosting/CDN). firestore = per-user state only. never put questions in firestore.
- **`/core` is pure TypeScript** — no firebase/react imports. scoring, elo, fsrs wrapper, planner, generator, pace live here, fully unit-tested.
- **mock answer keys never ship to the client.** practice shards may include answers; mocks are graded by a cloud function.
- **one batched write per session.** events buffered in IndexedDB, flushed at session end. target ≤ 8 writes/user/day.
- **planner never exceeds the student's stated daily capacity** without asking. load changes ≤ ±15%/day. buffers spent before load rises.
- **content sources:** official papers + final answer keys, MIT datasets (JEEBench etc), user uploads, own solutions. **no scraping competitors** (Marks, PW, etc) or coaching solutions.
- users are mostly minors → DPDP: DOB at signup, parental consent flow <18, attempt data used only for the student's own learning.
- math rendering: KaTeX with `trust:false`. user content = markdown only, no raw HTML.
- CBT UI must not use NTA / TCS logos or names. copy behaviour, not branding.

## stack
**firebase project `kairos-43000`, Spark plan only — never add anything that requires billing.**

React + TypeScript + Vite (PWA via vite-plugin-pwa/Workbox) · Tailwind using `brand/tokens.css` vars · KaTeX · Firebase Auth (Google + email/password) · Firestore (offline persistence on) · Firebase Hosting · Cloudflare Workers for server logic (no Cloud Functions: Spark plan only, see 07) · `ts-fsrs` · zod · vitest + playwright · Python 3.11 pipeline in `/pipeline` (GitHub Actions cron).

## repo layout
```
/app        React PWA: cbt/ practice/ planner/ analytics/ upload/ onboarding/
/core       pure TS domain logic (+ __tests__)
/worker     cloudflare worker (phase 4+): grade, moderate, leaderboard, daily-digest
/pipeline   python: acquire extract validate dedupe tag calibrate publish
/content    blueprints/ taxonomy/ weights/ exam_calendar.json
/docs /brand /prompts
```

## commands (set these up in phase 0)
`pnpm dev` · `pnpm test` (vitest, /core coverage ≥ 90%) · `pnpm e2e` · `pnpm build` · `firebase emulators:start` · `python -m pipeline.publish --version N`

## working style
- small PRs per roadmap item; tests with every /core change.
- simulate before shipping planner changes: `core/sim` runs 1,000 synthetic students (known true ability) — planner must beat random practice on predicted-score gain.
- if a doc and code disagree, update the doc in the same PR.
- facts that need verification before launch are marked `VERIFY` in docs.
