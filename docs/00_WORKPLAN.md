# 00 · Work plan (orchestrator-maintained)

Executed by Sonnet subagents, one owner per directory per wave so agents never edit the same files.
Each agent: read CLAUDE.md + docs it needs, do its task, run its tests, commit with a clear message, report back.

## Phase 0 — foundations

### Wave 1 (single agent, blocks everything)
- [x] **W1 scaffold** — pnpm workspace (`app`, `core`, `firestore-tests`), `tsconfig.base.json` strict, eslint flat config + prettier, vitest workspace, root scripts (`dev test e2e build lint`). Install ALL deps for every package up front (so wave 2 agents never run concurrent installs). Empty compiling entry points.

### Wave 2 (parallel, disjoint dirs)
- [ ] **W2a core domain** (`/core`) — `blueprint.ts` (zod + loader for `content/blueprints/*.json`), `question.ts` (zod from docs/03, all answer variants), `scoring.ts` (score responses vs blueprint, MSQ partial hook), `katex.ts` render-check util (`trust:false`), `cbt/palette.ts` pure reducer for the 5 palette states + all button semantics from docs/04 (palette click does NOT save). ≥90% coverage.
- [ ] **W2b app shell** (`/app`) — Vite React TS PWA, Tailwind wired to `brand/tokens.css` (copy/import, dark mode via `data-theme`), Inter + Space Grotesk, logo + favicon from `brand/`, router, Firebase init (`app/src/lib/firebase.ts`, config from `VITE_FIREBASE_*` env, Firestore offline persistence, emulator connect when `VITE_USE_EMULATORS=true`), auth: email/password sign-up/sign-in/reset + Google popup, protected routes, signup asks DOB (DPDP; <18 flag stored for consent flow later). Writes `users/{uid}` profile once.
- [ ] **W2c firebase config** (root `firebase.json`, `.firebaserc`, `firestore.rules`, `firestore.indexes.json`, `/firestore-tests`) — hosting → `app/dist` SPA rewrite, auth providers block (emailPassword + googleSignIn), emulators (auth, firestore, hosting, ui). Rules per docs/02 security + 03 paths (users/** owner only with field validation on `users/{uid}`; exam_calendar + papers read signed-in, no client write; uploads create-validated; leaderboards no client write; default deny). Rules unit tests with `@firebase/rules-unit-testing` against the emulator.
- [ ] **W2d pipeline** (`/pipeline`, `/content/taxonomy`) — Python package: `validate` (pydantic schema mirroring docs/03, answer∈options, LaTeX sanity), `publish --version N` (writes `bank/v{N}/manifest.json` + gzipped chapter shards to `app/public/bank`, mocks without answers), 20-question hand-made fixture (PHY/CHE/MAT/BIO, mixed SCQ/NVQ, original questions written by the agent — no copyrighted coaching content), pytest. Taxonomy v1 skeleton `content/taxonomy/taxonomy.json` (subjects → chapters for PHY, CHE, MAT, BOT, ZOO from NCERT chapter lists, dotted IDs).

### Wave 3 (after wave 2)
- [ ] **W3a CBT UI** (`/app/src/cbt`) — exam screen per docs/04 on top of `core/cbt/palette`, `--cbt-*` tokens only, NVQ keypad, instructions screen, timer + auto-submit, IndexedDB resume (refresh-safe), 360px drawer palette, loads fixture paper from `/bank`. Basic result screen using `core/scoring`.
- [ ] **W3b bank client** (`/app/src/bank`) — manifest fetch, shard fetch + IndexedDB cache by version, `VITE_BANK_BASE_URL`.
- [ ] **W3c CI** — GitHub Actions: lint, test, build, rules tests on emulator.

### Orchestrator-only (needs Firebase project access)
- [ ] register web app in `kairos-76a0d`, write `app/.env.local` from `firebase apps:sdkconfig`
- [ ] create Firestore DB (`asia-south1`), deploy rules + auth config, add authorized domains
- [ ] first hosting deploy

## Later phases
1 exam engine → 2 measure → 3 plan per docs/06, each broken into waves here before starting. Phase 4 server work goes to `/worker` (Cloudflare), see 07.
