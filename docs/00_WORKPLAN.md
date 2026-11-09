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

## Live status (orchestrator log; end of session 3, 2026-11-09). READ THIS FIRST when resuming.
Repo: https://github.com/1mystic/Kairos (PRIVATE). `main` = committed work. Branch `wip-snapshot` = full working-tree snapshot incl. UNFINISHED agent work (force-pushed at each save): recover with `git fetch origin wip-snapshot && git diff main origin/wip-snapshot --stat`, then `git checkout origin/wip-snapshot -- <paths>`.
Firebase `kairos-76a0d` (Spark): Firestore (asia-south1) + FIRST rules set + indexes + email/password & Google auth DEPLOYED. **Hosting NOT deployed. Admin rules (commit 0ca07a1) NOT deployed and their ~120 tests never run.** Launch gate + deploy sequence: **docs/14_LAUNCH.md** (blockers: static flow audit, owner-run checks, rules tests, minors/DPDP decision, real legal pages, content permissions, auth authorised domains, admin doc).
Tools: firebase CLI + gh logged in; Java for emulators `~/.local/jre/jdk-21.0.13+9-jre/bin`; `pipeline/.venv`; pdftotext installed.

### OWNER RULES (put in every agent prompt)
- CPU overloaded: agents run NOTHING heavy (no tests, tsc, builds, dev servers, browsers). Only file edits, git, `pnpm exec eslint <changed files>` once. **Order at the end (owner): all agents done + integrated + static flow audit first; THEN one controlled round of temporary headless-browser screenshots (single browser, key pages, 2–3 widths, light/dark) to finish each view; owner runs tests last and reports failures.**
- NO Co-Authored-By/attribution trailer on commits. Plain messages, explicit pathspecs, never `git add -A`/stash/reset on main.
- Never commit dangling imports (create file before importing; verify imports resolve). Never weaken TLS. No coaching/publisher/community sources; official/MIT/CC-BY/own authored only; **NTA and official GATE papers are held back pending written permission** (`pipeline/held_pending_permission/`, `gate_da_official.json` needs_review).
- Design: flat; brand palette neutrals + indigo + saffron; semantic green/red allowed for meaning; hover = pointer + tint (styles/interactions.css); shared layout primitives (docs/10_DESIGN_SYSTEM.md); symmetric two-column layouts; responsive 320→2560; custom scrollbar done.
- Sonnet subagents only. Vite HMR can throw "useStore must be used inside StoreProvider" while agents edit: hard-reload (Ctrl+Shift+R); only a persistent error is a real bug.

### DONE and committed on main
Everything from the earlier handoff (core, practice, mocks/CBT, upload, analysis, planner+sim, diagnostic/generator/predicted score, onboarding+plan, dashboard, guest mode+migration, bank v2, design system) PLUS: admin console + remote config + roadmap + telemetry (mounted: /admin, /roadmap; counters wired at call sites) · semantic green/red applied across screens · Settings tidy · landing: new hero product-preview panel, "How it decides" tinted scroll-reveal section, compact feature visuals, footer, auth panel with animated interactive SVG scene (logo now in flow; verify visually) · custom scrollbar · interactions.css hover/pointer · exam-calendar crash fixed (GATE window shape; loader validates entry by entry) · official PYQ pipeline (acquire/extract, pilots JEE Main 2026-04-02 S1 66q + NEET 2020 H3 169q: HELD, not published) · **GATE DA**: exam definition (docs/13_GATE_DA.md, taxonomy 8 subjects, blueprint gate_da_2027 incl. `calculator: true`, calendar entry), bank v3 published (1,160 Qs: JEEBench 495 + fixtures 24 + GATE DA 641 = 450 MIT open-bank (MMLU/GSM8K/MATH-500) + 191 code-verified authored; 175 official GATE Qs held), core support (subject_map, roundMarks, precise negatives) commit d5c6cc0.
Mounted routes: / (landing), auth, settings, privacy/terms, practice, mocks/exam/result, upload (/upload,/bank), diagnostic (/diagnostic,/mocks/new), analysis, onboarding, plan, roadmap, admin.

### IN FLIGHT at snapshot time (check git status/log, re-run from this text if gone: "continue, don't restart")
1. **G2: GATE DA across the app** (app only): exam lists/labels everywhere (practice picker, onboarding + `GATE_DA.1` packing, upload prompt, diagnostic, mock generator, analysis/dashboard/admin labels, landing exams + footer), calendar/planner for a single exam day, CBT: NAT decimal keypad, MSQ UI, readable section labels for ids like GA1/T1M-MCQ, fractional-negative marking text, **virtual calculator** (`app/src/cbt/calculator/`, flag `calculator` in blueprint, shunting-yard evaluator, no eval), markdown tables/code blocks (`app/src/components/mdBlocks.ts`), telemetry guard (no `sessions_GATE_DA`). Uncommitted at snapshot: cbt.css, model.test.ts, QuestionView.css/.tsx, cbt/calculator/, cbt/labels.ts, components/mdBlocks.ts.
2. **Q1: authored JEE Main questions** (`pipeline/jee_authored/**` → `pipeline/bank_src/authored_jee_main.json`, code-verified, thin chapters).
3. **Q2: authored NEET + IAT-biology questions** (`pipeline/neet_authored/**` → `pipeline/bank_src/authored_neet_iat.json`; biology only well-established NCERT facts, second-derivation verified).
Neither Q agent publishes. **Orchestrator then publishes bank v4**: `python -m pipeline.publish --version 4 --src pipeline/fixtures/questions --src pipeline/bank_src` (default src; NTA files are outside bank_src; `gate_da_official.json` is needs_review so skipped), bump the version in `.github/workflows/ci.yml` determinism step to 4, update `app/public/bank/latest.json`.

### TODO in order
1. Let G2/Q1/Q2 finish; verify each commit's imports resolve; push.
2. Publish bank v4 (see above).
3. (resolved) Firestore rules DO allow GATE_DA entries in `config/exam_calendar` (per-entry validation is client-side); only the optional stats counter `sessions_GATE_DA` is absent from the rules (telemetry guards it).
4a. **KNOWN BUG for the audit (found by G2):** DiagnosticScreen, NewMockScreen and usePredictedScore call `isExamId(profile.exam)` on the PACKED exam string (`JEE_MAIN.1`, `GATE_DA.0`, `JEE_MAIN.2+NEET_UG.1@2027-05-03`), which never matches: decode with the onboarding decode helper (primary exam) first. Also the exam-runner marking table/header now says MCQ/NAT instead of SCQ/NVQ for all exams (check existing exam tests asserting exact strings).
4. **Static flow audit** (agent(s), code reading only; list in docs/14_LAUNCH.md B1 and the FINAL QA PLAN below): fix everything found.
5. Launch blockers needing the OWNER: minors/DPDP decision (recommend: 18+ accounts, guest mode for minors until a consent flow exists), contact/grievance email + real Privacy/Terms text, permission emails to NTA/IITs, Auth authorised domains + OAuth consent branding, create `admins/<uid>` after rules deploy, optional App Check site key.
6. 404 page + error boundary, robots.txt/sitemap, PNG PWA icons 192/512 (+maskable), offline fallback.
7. **Final screenshots round** (temporary headless browser): landing (hero, sections, footer), sign-up/sign-in (logo overlap check, animated scene), home dashboard, practice picker/session/summary, mock exam + result, upload, analysis, plan/onboarding, settings, admin, GATE DA mock with calculator; widths 390/768/1024/1440/1920 light+dark; fix issues.
8. **Owner runs tests**: `pnpm test:rules` (Java on PATH), `pnpm --filter @kairos/app test`, `pnpm --filter @kairos/core test:coverage`, `pnpm lint`, `pnpm --filter @kairos/app exec tsc --noEmit`, `pnpm --filter @kairos/app exec vite build`; fix failures. Known risk spots: practice/summary tests, analysis tests, consistency.test.ts (new rules + new files), landing tests (PaletteDemo now 20 cells), gate.test.ts hand-computed totals, rules admin tests (~120 never run).
9. **Deploy** per docs/14_LAUNCH.md D: dry-run + `pnpm test:rules`, deploy rules+indexes, build, deploy hosting, smoke test, owner adds admin doc, publish announcement/dates, tag `v1.0-launch`.
10. Later: Cloudflare Worker (server-graded all-India mocks, FCM digest), parental-consent flow, Hindi, JEE Advanced skin, more PYQs after permissions, figure-question support.

### Owner decisions pending
Minors/DPDP approach; NTA/IIT written permissions (publish official papers or not); IISER TLS issue for IAT papers (use another official host / user-supplied PDFs / skip); real 2027 exam dates; target fractions (0.4/0.6/0.8) vs real cut-offs; PRIOR_NEW/PRIOR_DONE ("Behind" for new students); taxonomy VERIFY flags; whether to accept MMLU/GSM8K/MATH gold answers as verified.

## Later phases
1 exam engine → 2 measure → 3 plan per docs/06, each broken into waves here before starting. Phase 4 server work goes to `/worker` (Cloudflare), see 07.
