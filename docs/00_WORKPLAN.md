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

## Live status (orchestrator log; last updated end of session 2, 2026-11-08 evening)
Repo: https://github.com/1mystic/Kairos (`main` = committed work; branch `wip-snapshot` = full working-tree snapshot incl. UNFINISHED agent work, force-pushed each save; never merge blindly: `git fetch origin wip-snapshot && git diff main origin/wip-snapshot --stat`, then `git checkout origin/wip-snapshot -- <paths>` for what you need).
Firebase `kairos-76a0d` (Spark): Firestore (asia-south1) + rules (v1, the 55-test set) + indexes + email/password + Google auth DEPLOYED. **Hosting NOT deployed. The new admin rules (commit 0ca07a1) are committed but NOT deployed and their ~120 tests have NEVER been run** (dry-run compile passed). `app/.env.local` holds the web config (owner pasted; never read it).
Tools: firebase CLI + gh logged in; Java for emulators at `~/.local/jre/jdk-21.0.13+9-jre/bin`; pipeline venv `pipeline/.venv`; `pdftotext/pdftoppm` installed.

### OWNER RULES LEARNED (apply to every agent prompt)
- **CPU is overloaded: agents (and the orchestrator) must NOT run tests, tsc, vite/dev servers, builds, Playwright/Chromium or screenshots.** Only file edits, git, and `pnpm exec eslint <changed files>` once. The owner runs tests/type-check/visual checks manually and reports failures. (Exception granted: orchestrator may run tests LIGHTLY once at final integration before deploying hosting, per owner.)
- **Never commit code that imports files that don't exist**: create the file BEFORE adding the import; before committing check every new import resolves in the same commit. Don't commit other agents' half-finished work.
- **Never weaken TLS/security checks** (no curl -k) for downloads; an unverifiable host = unavailable, ask the owner.
- Design: brand palette = neutrals + indigo + saffron; **semantic green/red allowed for status** (tokens `--good*`/`--bad*`, classes in app/src/styles/semantic.css); flat (no borders/shadows/gradients); one spacing scale; symmetric two-column layouts (TwoPane/Columns/CardGrid); hover = pointer cursor + tint change (app/src/styles/interactions.css); responsive 320→2560.
- Content: official papers + official final keys + MIT datasets + own/user questions ONLY; never coaching/publisher sites (Aakash, PW, Vedantu, Motion, Careers360, AglaSem, etc.).
- Sonnet subagents only. One owner per directory; commits by explicit pathspec with NO Co-Authored-By/attribution trailer (owner rule); never `git add -A` on main, never stash/reset.

### Done and committed on main
Phase 0 foundations (scaffold, core, app shell/auth, firebase config+rules, pipeline) · guest mode + store + migration (onboarding fields, user bank/media, decide-later modal, limited session reads) · bank client + QuestionView (+ user images) · CI workflow · landing page (animated, FAQ, legal) · measurement engine · practice mode (+ My questions, self-check) · mock exam/CBT (+ fullscreen exit, result page with report tabs) · upload your questions (prompt copy, PDF/images, paste, review, crop, local+cloud bank) · analysis (mastery heatmap, mistakes, full mock report) · planner engine + backlog + simulation (planner 144.8 vs random 131.6 vs chapter-order 109.9) · generator/diagnostic/predicted score + UI · onboarding + daily plan UI · customisable dashboard (mounted on Home) · question bank v2 (519 Qs) · flat design system + layout primitives (docs/10_DESIGN_SYSTEM.md, docs/layout-audit.md) · custom Select, sidebar branding, interactions.css (hover/pointer) · semantic green/red tokens+classes · admin RULES + rules tests (written, not run).
Routes MOUNTED in App.tsx: landing `/`, auth, settings, privacy/terms, practice, mocks/results, exam runner, upload (/upload, /bank), diagnostic (/diagnostic, /mocks/new), analysis, onboarding, plan. ScrollToTop on route change.

### IN FLIGHT when session 2 ended (check `git status`, `git log`, wip-snapshot)
1. **W9 admin console + remote config + roadmap + telemetry** (app/src/admin, config, roadmap, telemetry; docs/12_ADMIN.md; spec in the conversation: `/admin` gated by `admins/{uid}` doc the owner creates in the Firebase console with their UID; tabs Overview/Exam dates/Announcement/Roadmap defaults/Users/System; public `config/{exam_calendar,announcement,roadmap_defaults}` docs; aggregate-only `stats/{day}` counters with daily-active marker; user Default-vs-Custom roadmap page `/roadmap`; Settings "Exam & plan" rows). **Uncommitted & incomplete at snapshot: `app/src/pages/Settings.tsx` imports `../admin/useIsAdmin` which does not exist yet (Vite error); `app/src/admin/` has calendarEdit/insights/publish/users/tabs only.** If the agent is gone: re-run it from this plan ("continue, don't restart", read app/src/admin, app/src/config, app/src/roadmap, app/src/telemetry and the rules contract in firestore.rules + firestore-tests/src/admin.rules.test.ts). It must NOT leave dangling imports.
2. **W7b official PYQ sourcing pilot** (pipeline/acquire, extract, ingest/nta_*, content/sources/nta|iiser): find official NTA/IISER paper+final-key URLs (no coaching sites, no TLS bypass; iiseradmission.in failed TLS verification (curl exit 60) → treat as unavailable unless a verifying official host exists; ask owner), build acquire→pdftotext→structure→validate pipeline, pilot 1 paper per exam, report quality + scaling plan for ~10 years (owner approves scale/usage). Raw PDFs go to gitignored `pipeline/raw/`.

### FINAL QA PLAN (owner decision 2026-11-09; follow this order)
1. **Now: no verification runs at all** (no tests, tsc, builds, dev servers, browsers). Keep building and integrating statically.
2. When ALL agents are done and everything is integrated and committed: a **static flow audit** (code reading only; agents/orchestrator) of every user flow and function, fixing what's broken: auth (email sign-up/sign-in, Google, forgot password, complete-profile, sign-out, verification banner), guest mode + guest→account migration, onboarding → plan → practice → summary → mastery, mocks (exam runner, grading, result, report tabs, fullscreen), diagnostic + personalised mock (`gen_`), upload → My questions → practice, dashboard widgets with real data, analysis, roadmap (default/custom), admin (gate, config publish, stats, announcement), remote config + calendar fallback, telemetry counters, PWA/offline, routing (all routes mounted, no dangling imports, providers present for every screen, nav items built), Firestore rules vs client writes (field names/limits), quota budget.
3. ONLY THEN: one controlled round of **temporary headless-browser screenshots** (single browser, a handful of key pages at 2–3 widths, light/dark) to check the visuals, fix issues from them. Nothing else is run by agents.
4. **Tests/type-check/build last, run by the owner** (`pnpm --filter @kairos/app test`, `pnpm --filter @kairos/core test:coverage`, `pnpm test:rules` (Java on PATH), `pnpm lint`, `pnpm --filter @kairos/app exec tsc --noEmit`, `pnpm --filter @kairos/app exec vite build`); owner reports failures; agents fix; then deploy rules + hosting.

### TODO next, in order
1. Let W9 + W7b finish (or re-run). Check W9's imports all resolve; commit by explicit paths.
2. **Mount** in App.tsx: `adminRoutes`, `roadmapRoutes` (+ `/privacy` etc. already). Tidy Settings (sidebar tagline wraps; nav column too wide; content card shorter than nav; add "Admin" row only for admins; add "Add this device's progress" row via `useMigration().retry()`).
3. **Telemetry wiring** (call sites in app/src/telemetry/README.md): practice commitSession, mock submit, diagnostic finish, upload save, signup, onboarded; call `installTelemetry()` once.
4. **Apply semantic green/red** across screens (practice/mock correct vs wrong feedback and review rows `opt-right/opt-wrong`, pace on-track/behind chips, dashboard deltas, analysis waterfall, form errors/success toasts, Save=btn-success, Delete/Discard=btn-danger). Agent task; don't overlap with W9 files.
5. **Conformance pass for onboarding/plan/Settings/AppLayout** to layout primitives (layout agent's conformance list) after W9 is done.
6. Put `<PredictedBand/>` + `useTodayPlan()` into Home/dashboard (dashboard plan/readiness widgets currently fall back); set `bundle.band` in useDashboardData.
7. **OWNER runs checks manually** (nothing was run since ~W4f): `pnpm test:rules` (needs Java on PATH; 55 old + ~120 new admin rules tests), `pnpm --filter @kairos/app test`, `pnpm --filter @kairos/core test:coverage`, `pnpm lint`, `pnpm --filter @kairos/app exec tsc --noEmit`, `pnpm --filter @kairos/app exec vite build`. Known test risks: practice/summary.test.tsx (focus change after last run), analysis tests (layout markup changed), consistency.test.ts (new rules), Wizard/Dashboard "Esc closes" timeouts under load (20s timeout added), noborders tests. Fix failures with agents.
8. **Deploy** (after tests pass): `firebase deploy --only firestore:rules,firestore:indexes --project kairos-76a0d` (admin rules), then `pnpm build && firebase deploy --only hosting --project kairos-76a0d`; smoke test landing → guest → onboarding → plan → practice → mock → analysis → upload. Owner then creates `admins/<uid>` in the console.
9. Content: after W7b report, approve scope; extract more official PYQs (JEE Main shifts, NEET, IAT); fill empty/thin chapters (organic needs figures: add figure cropping step); NEET/IAT mocks need more questions. Add `chapter_weights` files so the generator uses real weights; fill real exam dates in config/exam_calendar via the admin page.
10. Later phases: Cloudflare Worker for server-graded all-India mocks + FCM digest; App Check; parental consent flow; Hindi; JEE Advanced skin.

### Owner decisions pending
- Scale/usage for the 10-year PYQ extraction (after W7b pilot report); what to do about iiseradmission.in TLS (use another official host or skip IAT papers).
- Real exam dates for 2027 sessions (fill in admin page when announced).
- Verify targets: ambition → target fractions of max marks (0.4/0.6/0.8) against real cut-offs; PRIOR_NEW/PRIOR_DONE constants make new students read "Behind".
- Verify taxonomy additions marked VERIFY (7 chapters added, JEE Advanced-only flags).

## Later phases
1 exam engine → 2 measure → 3 plan per docs/06, each broken into waves here before starting. Phase 4 server work goes to `/worker` (Cloudflare), see 07.
