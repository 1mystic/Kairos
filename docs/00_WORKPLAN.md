# 00 · Work plan (orchestrator-maintained)

Executed by Sonnet subagents, one owner per directory per wave so agents never edit the same files.
Each agent: read CLAUDE.md + docs it needs, do its task, run its tests, commit with a clear message, report back.

## Phase 0 — foundations

### Wave 1 (single agent, blocks everything)
- [x] **W1 scaffold** — pnpm workspace (`app`, `core`, `firestore-tests`), `tsconfig.base.json` strict, eslint flat config + prettier, vitest workspace, root scripts (`dev test e2e build lint`). Install ALL deps for every package up front (so wave 2 agents never run concurrent installs). Empty compiling entry points.

### Wave 2 (parallel, disjoint dirs)
- [x] **W2a core domain** (`/core`) — `blueprint.ts` (zod + loader for `content/blueprints/*.json`), `question.ts` (zod from docs/03, all answer variants), `scoring.ts` (score responses vs blueprint, MSQ partial hook), `katex.ts` render-check util (`trust:false`), `cbt/palette.ts` pure reducer for the 5 palette states + all button semantics from docs/04 (palette click does NOT save). ≥90% coverage.
- [x] **W2b app shell** (`/app`) — Vite React TS PWA, Tailwind wired to `brand/tokens.css` (copy/import, dark mode via `data-theme`), Inter + Space Grotesk, logo + favicon from `brand/`, router, Firebase init (`app/src/lib/firebase.ts`, config from `VITE_FIREBASE_*` env, Firestore offline persistence, emulator connect when `VITE_USE_EMULATORS=true`), auth: email/password sign-up/sign-in/reset + Google popup, protected routes, signup asks DOB (DPDP; <18 flag stored for consent flow later). Writes `users/{uid}` profile once.
- [x] **W2c firebase config** (root `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `/firestore-tests`) — hosting → `app/dist` SPA rewrite, auth providers block (emailPassword + googleSignIn), emulators (auth, firestore, hosting, ui). Rules per docs/02 security + 03 paths (users/** owner only with field validation on `users/{uid}`; exam_calendar + papers read signed-in, no client write; uploads create-validated; leaderboards no client write; default deny). Rules unit tests with `@firebase/rules-unit-testing` against the emulator.
- [x] **W2d pipeline** (`/pipeline`, `/content/taxonomy`) — Python package: `validate` (pydantic schema mirroring docs/03, answer∈options, LaTeX sanity), `publish --version N` (writes `bank/v{N}/manifest.json` + gzipped chapter shards to `app/public/bank`, mocks without answers), 20-question hand-made fixture (PHY/CHE/MAT/BIO, mixed SCQ/NVQ, original questions written by the agent — no copyrighted coaching content), pytest. Taxonomy v1 skeleton `content/taxonomy/taxonomy.json` (subjects → chapters for PHY, CHE, MAT, BOT, ZOO from NCERT chapter lists, dotted IDs).

### Wave 2 notes (as delivered)
- core API: see core/src/index.ts. palette: palette click discards draft; Save&Next on marked question unmarks; CLEAR keeps mark. scoring indexes by `flattenSlots` order.
- app: tokens copied to `app/src/styles/tokens.css` (re-copy when brand/tokens.css changes). profile schema in `app/src/lib/profile.ts` == firestore.rules.
- rules: 44 tests. Firestore emulator needs Java: `export PATH="$HOME/.local/jre/jdk-21.0.13+9-jre/bin:$PATH"` before `pnpm test:rules`.
- W2d (pipeline) was told mid-task to add: image schema `images:[{id,w,h,alt,variants}]` + inline `![alt](img:<id>)`, `pipeline/images.py` (webp 480/960), mhchem fixtures. Check its report; core must mirror its final image schema.

### Wave 3 (after W2d lands) — launch in parallel, model sonnet, disjoint dirs
Every prompt must say: read CLAUDE.md + docs/07 + brand/BRAND.md; own only listed paths; no `pnpm add` except where allowed below; stage only own paths; never `git add -A`/stash/reset; retry on index.lock; commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; report back.

- [x] **W3a design pass + guest mode** (`/app` except `app/src/cbt`, `app/src/bank`, `app/src/components/QuestionView*`, `app/public/bank`, `app/public/img`) — ALLOWED: `pnpm --filter @kairos/app add @fontsource-variable/plus-jakarta-sans` and remove inter/space-grotesk fontsource. Re-copy brand/tokens.css; apply 3-colour rule (no green/red outside CBT; errors use `accent-ink`); Plus Jakarta Sans everywhere; restyle auth + home to be clean/minimal. **Guest mode per docs/08_GUEST_MODE.md**: `app/src/store/` (`UserStore` interface + `LocalStore` (idb) + `FirestoreStore` + `useStore()` picking by session), "Continue as guest" on sign-in, local guest profile (name optional, no DOB), guest can reach `/` and every practice/exam route, sign-in nudges (banner + milestone prompts), migration on sign-in/sign-up with merge rules, `navigator.storage.persist()`. Tests for store + migration (fake Firestore via injected interface, no network).
- [x] **W3e bank client (merged with W3b into one agent) + QuestionView** (`app/src/bank/`, `app/src/components/QuestionView*`, `app/vite.config.ts` workbox block only) — bank client: fetch `bank/latest.json` → manifest → shards (`.json.gz` served as application/gzip → `DecompressionStream('gzip')`), IndexedDB cache by version (idb), `VITE_BANK_BASE_URL`. `QuestionView.tsx`: renders stem/options/solution via core `renderMath`, resolves `![alt](img:<id>)` into `<img srcset="{base}/img/{id}.w480.webp 480w, ...w960.webp 960w" sizes width height loading=lazy decoding=async alt>` on a white card (also in dark mode). Workbox runtime caching: `/img/**` + `/bank/v*/**` CacheFirst. Tests. Bank is public static content: works identically for guests.
- [ ] **W3b core media + chemistry** (`/core`) — import `katex/contrib/mhchem` in katex.ts so `\ce{}`/`\pu{}` render + tests; mirror W2d's final image schema in `question.ts` (+ ref/entry consistency refinement); `splitMarkdownImages(md)` helper returning text/math/image segments for the app; keep coverage ≥90%.
- [ ] **W3c CBT UI** (`app/src/cbt/**`, route `/exam/:paperId`; save results only through W3a's `useStore()` so guests work — start after W3a+W3b+W3e) — depends on W3b API names: start it after W3b, or tell it to use only existing core API + a local image-segment shim. Exam screen per docs/04 on `core/cbt/palette`, `--cbt-*` tokens only, NVQ keypad (physical keyboard disabled), instructions + "I have read", timer + auto-submit, IndexedDB resume (refresh-safe), 360px palette drawer, loads `bank/v1/mocks/sample_jee_mini_v1.json` + practice shards for grading (PYQ/practice graded in browser), result screen via `scorePaper` + "lost N unsaved answers" nudge. Playwright e2e: answer, refresh, resume, submit (install chromium via `pnpm --filter @kairos/app exec playwright install chromium`).
- [x] **W3d CI** (`.github/workflows/`) — lint, typecheck, test, coverage, build, pytest pipeline, rules tests (setup-java 21 + firebase-tools). No deploy step yet.

### Orchestrator-only (Firebase project kairos-76a0d, CLI logged in as owner)
- [x] web app `kairos-web` registered (appId 1:522344330144:web:9989b46bd6209fd3116ac5)
- [ ] OWNER: create Firestore DB in console (Standard, `asia-south1`, production mode) — CLI can't, Firestore API disabled until then
- [ ] OWNER: paste web config into `app/.env.local` (do NOT read that file — owner request)
- [ ] then: `firebase deploy --only firestore:rules,firestore:indexes,auth --project kairos-76a0d` (auth block in firebase.json enables email/password + Google)
- [ ] then: `pnpm build && firebase deploy --only hosting --project kairos-76a0d`; smoke test sign-up/sign-in on https://kairos-76a0d.web.app
- [ ] later: App Check (reCAPTCHA v3) — needs site key from owner

- [x] **W3f landing page** (`app/src/landing/**`) — animated, 3-colour, no fake stats/competitor names; exports `Landing({onStartGuest})`. Orchestrator mounts it at `/` for signed-out visitors via `app/src/pages/PublicEntry.tsx`.

## Feature map (every user-facing feature → owner task)
| feature | user view / route | spec | task |
|---|---|---|---|
| landing page | `/` (signed-out) | BRAND, 01 | W3f |
| auth + guest + settings | `/signin` `/signup` `/settings` | 08 | W3a |
| question rendering (math, mhchem, webp) | component | BRAND media, 03 | W3b/e |
| **mock exam mode** (CBT, PYQ replay, sample mock, result) | `/exam/:paperId`, `/exam/:paperId/result/:mockId`, `/mocks` | 04 | W4a |
| **practice mode** (chapter practice, instant check, solutions, why-wrong) | `/practice`, `/practice/:exam/:chapter` | 01, 05.3 | W4c |
| **upload your questions** (copy prompt, paste JSON, crop figures, review, private bank) | `/upload`, `/bank` | 09, prompts/v2 | W4d |
| measurement engine (elo, rd, FSRS, behaviour labels, session summary) | core only | 05.1–5.3 | W4b |
| **analysis** (mastery heatmap, mock report: waterfall, quadrant, time map, fatigue, unsaved nudge) | `/analysis`, mock result tabs | 04 report, 05 | W5a |
| onboarding + exam date + pace ρ + today card | `/onboarding`, Home | 01, 05.7 | W5b |
| **auto-adaptive planner** (plan_day, backlog carry/spread/shed, capacity, sim gate) | core + Home task list | 05.5–5.6, 05.11 | W5c (engine) + W6b (UI) |
| diagnostic (cold start) + personalised mock generator | `/diagnostic`, "Make me a mock" | 05.4, 05.9 | W6a |
| predicted score band | Home + analysis | 05.10 | W6c |
| deploy + smoke test | — | 07 | orchestrator |

**Routing convention (wave 4+):** each feature agent creates `app/src/<feature>/routes.tsx` exporting `export const featureRoutes: RouteObject[]` (or JSX `<Route>` fragments, matching whatever App.tsx uses after W3a). The orchestrator mounts them in App.tsx. Feature agents never edit App.tsx. Shared core index: each agent adds only its own export lines to `core/src/index.ts`.

## Wave 4 (start when wave 3 is merged + green) — 4 parallel agents
- [ ] **W4a mock exam mode** (`app/src/cbt/**`) — exam screen per docs/04 on `core/cbt/palette`; `--cbt-*` tokens only; instructions + "I have read"; timer + auto-submit at 00:00; no pause in exam mode; NVQ on-screen keypad (physical keys disabled); palette drawer at 360px; fullscreen request; tab-switch logging; IndexedDB resume (refresh/crash resumes same second); graded in browser via bank answers (PYQ/practice-shard answers; mocks with no public answers show "result pending" — phase 4); result screen (score, per subject/section, "lost N unsaved answers"); `/mocks` list (sample + PYQ papers from manifest + past attempts via `useStore().listMocks`); save via `useStore().putMock` + `nudge('first_session')`. Playwright e2e: answer → refresh → resume → submit.
- [x] **W4b core measure** (`core/src/measure/**`) — elo.ts, fsrs.ts (ts-fsrs), labels.ts, sessionSummary.ts, mastery state shape matching docs/03 `state/mastery`. ≥90% coverage.
- [ ] **W4c practice mode** (`app/src/practice/**`) — pick exam → subject → chapter (manifest + taxonomy, counts), session of N questions with QuestionView, check → solution → 1-tap reason when wrong, per-question timer, events buffered in IndexedDB, one `addSession` at end with summary; includes user's own bank questions (from W4d store API if present, else skip). After W4b lands, a follow-up wires mastery updates.
- [ ] **W4d upload** (`app/src/upload/**`, `core/src/byo.ts`, `firestore.rules` media block + tests, ALLOWED install: `pdfjs-dist`) — per docs/09 + prompts/extract_questions_v2.md: prompt copy page, page drop (pdf.js render), paste/parse (multi-block, fenced-block extraction), review cards with QuestionView preview + editor, bbox crop tool → webp → media store, quotas, save to bank via store (extend UserStore with `putBankQuestions/listBankQuestions/putMedia/getMedia` in a new file `app/src/store/bank.ts` — coordinate: W3a owns store; W4d may ADD files to app/src/store but not rewrite existing ones), `/bank` list view. Rules: `users/{uid}/media/{id}` owner create-only, b64 ≤120000, immutable; tests.

## Wave 5
- [ ] **W5a analysis** (`app/src/analysis/**`) — heatmap, mock report v1 per docs/04 (waterfall, quadrant, time map, fatigue curve, chapter heatmap, fix list), hand-rolled SVG, 3-colour; mount as tabs in W4a's result screen via an exported `<MockReport/>`.
- [ ] **W5b onboarding + pace** (`app/src/onboarding/**`, `core/src/plan/schedule.ts`, `pace.ts`) — as before.
- [ ] **W5c planner engine** (`core/src/plan/planner.ts`, `backlog.ts`, `core/src/sim/**`) — as before, sim gate.

## Wave 6
- [ ] **W6a diagnostic + generator** (`core/src/gen/**`, `app/src/diagnostic/**`)
- [ ] **W6b daily plan UI** (Home task list, replan on open, pace_log 1/day)
- [ ] **W6c predicted score** (core monte-carlo + UI band)
Phase 4 (server grading / all-India mocks / FCM digest / community uploads) needs `/worker` on Cloudflare — plan separately.

## Live status (orchestrator log, updated 2026-11-08, for session handoff)
Repo: https://github.com/1mystic/Kairos (`main` = committed work; branch `wip-snapshot` = full working-tree snapshot incl. UNFINISHED agent work, force-pushed, never merge blindly — diff it against main to recover work if a session dies).
Firebase `kairos-76a0d` (Spark): Firestore (asia-south1) + rules + indexes + email/password + Google auth DEPLOYED. Hosting NOT deployed. `app/.env.local` holds the web config (owner pasted it; never read it).
Tools: firebase CLI + gh logged in; Java for emulators at `~/.local/jre/jdk-21.0.13+9-jre/bin` (prepend to PATH before `pnpm test:rules`); pipeline venv `pipeline/.venv`.

### Done and committed on main
W1 scaffold · W2a core · W2b app shell/auth · W2c firebase+rules (55 rules tests) · W2d pipeline · W3a design v1 + guest mode · W3b/e core media + bank client + QuestionView · W3d CI · W3f landing · W4b measurement engine · W4c practice mode (routes NOT mounted) · W4d-core upload data layer + media rules · W5b-core schedule/pace · W6a-core generator/diagnostic/predict. Core: 261 tests, ~99% coverage.

### In flight when this was written (check `git status` / `git log` / wip-snapshot to see how far they got)
- W3g design-system redesign (flat, no borders/shadows, consistent spacing tokens, responsive 320→2560, production landing page with FAQ/footer/privacy/terms, pro Settings/Home layouts on big screens, shared primitives documented in docs/10_DESIGN_SYSTEM.md). Touches app/src/{index.css,styles,components/ui.tsx,icons,pages,auth,landing,QuestionView*,bank/BankPreview}. Uncommitted at snapshot time.
- W4a mock exam mode (app/src/cbt/**, app/e2e/exam.spec.ts). Had type errors in cbt/loader.ts + cbt/model.ts at last check.
- W4d-ui upload screens (app/src/upload/**, app/src/store/bank*.ts, adds pdfjs-dist).
- W5c planner engine + 1,000-student sim gate (core/src/plan/planner.ts, backlog.ts, core/src/sim/**). Had 1 lint error (unused `tmin`, planner.ts:~327).
- W7a question bank v2 from JEEBench: DONE + committed (519 questions, bank v2 live in repo).
- W5d customisable Home dashboard (app/src/dashboard/**, spec docs/11_DASHBOARD.md; layout reference from owner: Daily/Week/Month control, readiness ring hero, trend bars, stat tiles, top chapters, plan ring, activity feed, tip card; customise sheet to show/hide/reorder/resize cards). Orchestrator mounts `<Dashboard/>` inside Home.
- W4a mock exam: DONE + committed (routes NOT mounted; guests must reach /exam/:paperId outside AppLayout).
If an agent is gone: re-launch it with the same task text from this plan (model sonnet), telling it to continue from the files already in the tree/wip-snapshot rather than starting over.

### Next, in order
1. Let in-flight agents finish; run the verify block (pnpm lint, typecheck, core test:coverage, app test, build, test:rules if rules changed, pipeline pytest); commit; push main.
2. INTEGRATION (orchestrator, tiny edits in app/src/App.tsx): mount practiceRoutes, cbtRoutes, uploadRoutes, landing via PublicEntry (`<Landing onStartGuest={useStartGuest()...}/>`), BankPreview at /dev/bank (DEV only), Settings; replace Placeholder routes. Add missing core exports (JEE_ADV exam enum if W7a reports it). Update docs/03 mastery doc with reps/lapses/st fields.
3. Deploy hosting: `pnpm build && firebase deploy --only hosting --project kairos-76a0d --non-interactive`; smoke test landing → guest → practice → sample mock → upload → sign up/in.
4. Remaining features (feature map above): W5a analysis (mock report tabs + heatmap), W5b-ui onboarding + exam date + today card (uses core/plan + nudge('exam_date_set')), W6b daily plan UI (uses planner), W6c predicted-score UI, practice mode: include user bank source (`userBankSource()` from upload) + session screen change, diagnostic UI.
5. Content: NEET/JEE Main source decision pending (official NTA PYQs via vision extraction vs authored+cross-checked).
6. Phase 4 later (Cloudflare Worker for server-graded all-India mocks, FCM digest).

### Owner decisions pending
- Migration modal: closing it (Esc/X) currently discards local data — proposed fix: closing keeps local data and re-asks next time; only an explicit "Discard local" deletes.
- NEET/JEE Main question source (see 5).

### Conventions that must hold
Spark only (no billing). 3 colours (neutrals + indigo + saffron), flat (no borders/shadows/gradients except landing ring; CBT screen keeps NTA-style tokens), Plus Jakarta Sans, spacing scale 4/8/12/16/24/32/48/64, responsive 320→2560. All user state through `UserStore` (guest = local only). Sonnet subagents only; one owner per directory; commits by explicit pathspec, trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`; never `git add -A` on main, never stash/reset.

## Later phases
1 exam engine → 2 measure → 3 plan per docs/06, each broken into waves here before starting. Phase 4 server work goes to `/worker` (Cloudflare), see 07.
