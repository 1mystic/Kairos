# NEXT STEPS: resume here (written at the end of session 3, no credit left)

All build work is done and pushed (`main`, tag `checkpoint-session3-end`+). The site is NOT deployed yet. Do these in order. Anything marked **(agent)** is work to hand to a Sonnet subagent in a new session (say: "read docs/NEXT_STEPS.md and docs/00_WORKPLAN.md and continue").

## 1. Firebase console (owner, ~10 min)
1. **Authentication → Sign-in method → Google → Enable** (set the public-facing name "Kairos" and the support email). Email/Password is already enabled.
2. **Authentication → Settings → Authorised domains**: make sure `localhost`, `kairos-76a0d.web.app` and `kairos-76a0d.firebaseapp.com` are listed. After the first preview deploy (step 3) add the preview channel domain it prints.
3. **Local testing of real sign-in:** in `app/.env.local` set `VITE_USE_EMULATORS=false` (it was `true`, which pointed Auth/Firestore at emulators that were not running, so Google AND email sign-in failed locally), then restart `pnpm dev`. Production builds now ignore the emulator flag automatically.
4. Google sign-in fallback fixed in code: the auth domain now defaults to `kairos-76a0d.firebaseapp.com` (it used to default to `localhost`, whose redirect handler does not exist). The popup is tried first, the redirect fallback only if the popup is blocked.

## 2. Run the checks (owner) and send failures to an agent
```bash
export PATH="$HOME/.local/jre/jdk-21.0.13+9-jre/bin:$PATH"
pnpm test:rules                                   # ~175 rules tests (admin rules never run before)
pnpm --filter @kairos/app test
pnpm --filter @kairos/core test:coverage
pnpm lint
pnpm --filter @kairos/app exec tsc --noEmit
```
Nothing was run for days; expect failures. Known risk spots: exam-runner wording now MCQ/NAT, practice summary, analysis, landing PaletteDemo (20 cells), `core/src/gate.test.ts` hand-computed totals, store/bank-cache tests, new GATE calculator tests, telemetry `sessions_GATE_DA`. **(agent)** fix failures, one area at a time, no heavy commands beyond what the owner allows.

## 3. Preview deploy (safe test URL, expires in 7 days)
```bash
pnpm deploy:rules      # AFTER pnpm test:rules passes (security gate): Firestore rules + indexes
pnpm deploy:preview    # builds with emulators OFF and deploys to a preview channel; prints the URL
```
Open the printed URL, add its domain to Auth authorised domains, then test: email sign-up/sign-in/verify/reset, **Google sign-in**, guest mode, onboarding → plan → practice → mock (GATE DA mock A with calculator) → upload → settings, 404 page, `/admin` gate. Watch the browser console for **CSP report-only** violations (header `Content-Security-Policy-Report-Only`); if none, rename it to `Content-Security-Policy` in `firebase.json`.

## 4. Go live
```bash
pnpm deploy:hosting    # builds with emulators OFF + deploys to https://kairos-76a0d.web.app
```
Then: sign in, open `/admin`, copy your UID, create document `admins/<uid>` (any field) in the Firestore console; publish the announcement + exam dates from `/admin`; `git tag v1.0-launch && git push origin v1.0-launch`. Rollback: Firebase console → Hosting → Release history → roll back.

## 5. Owner inputs still needed (see docs/14_LAUNCH.md B)
- **Age policy: DECIDED, open to all ages** (no 18+ requirement). Privacy/Terms/landing/Home wording updated accordingly; no parental-consent flow is promised. (DPDP compliance for minors remains the owner's call; consider legal advice.)
- Legal placeholders in `app/src/pages/Legal.tsx`: `[CONTACT EMAIL]`, `[GRIEVANCE OFFICER NAME/EMAIL]`, `[LEGAL ENTITY / ADDRESS]`, `[CITY / JURISDICTION]`, deletion time frame, then a legal review.
- Confirm rights to the GATE DA workbook (`content/sources/gate_da/qbank/ATTRIBUTION.md`).
- Written permission from NTA / IITs for the held official papers (`pipeline/held_pending_permission/`, `pipeline/bank_src/gate_da_official.json`); IAT papers: iiseradmission.in fails TLS (decide: other official host / supply PDFs / skip).
- Spot-check by a biology-strong person of the 653 NEET/IAT authored questions (esp. numeric facts: GFR, CO2 transport %, RBC lifespan, BP, Homo habilis brain size, pCO2) and 5 JEE chemistry trend items (`halo_bp`, `alc_acidity`, `amn_basic`, `carb_acid`, `perio_ie`).
- Real 2027 exam dates (JEE Main, NEET UG, IAT, GATE DA) into `/admin → Exam dates` when announced.

## 6. More screenshots to review after the preview is live (not yet looked at)
sign-in, forgot, privacy/terms, 404, analysis, roadmap, diagnostic, mocks/new, admin gate, desktop light mode, tablet (768/1024), an active exam + practice session, result + report pages (need data). **(agent)** one temporary headless-browser pass, fix what looks off.

## 7. Backlog (after launch)
Cloudflare Worker for server-graded all-India mocks + FCM digest; App Check (reCAPTCHA v3); 5th mobile tab (needs `.tabbar` 5 columns in `index.css`); `getMock(id)` store method (mocks older than the newest 100 are not found by id); more hard-difficulty authored questions; figure-based questions; Hindi; JEE Advanced skin; shared per-uid caches; harder JEE chemistry; per-exam planner mock shapes beyond JEE/GATE; account deletion self-serve.

## Conventions (always)
Sonnet subagents only; plain commit messages (NO Co-Authored-By); explicit pathspecs; never `git add -A` on main; never commit a dangling import; no coaching/competitor sources; flat design + semantic green/red only for meaning; **ask the owner before running heavy commands** (tests, tsc, builds, browsers).
