# 14 · Public launch checklist (Firebase `kairos-76a0d`, Spark plan, Hosting `https://kairos-76a0d.web.app`)

Owner request (2026-11-09): prepare the site for public launch, sync to Firebase, deploy once it is ready. This file is the gate. Nothing is deployed to the public until every **BLOCKER** is checked.

## A. Where we are
- Deployed already: Firestore (asia-south1), the FIRST rules set (55 tests), indexes, email/password + Google sign-in providers.
- NOT deployed: Hosting; the admin rules (commit 0ca07a1: admins, public config, stats counters, roadmap state: about 120 tests written, NEVER run).
- Content: bank v3 published in the repo (JEEBench 495 + fixtures 24 + GATE DA 641 = 1,160 questions). Bank v4 (authored JEE/NEET/IAT questions) is being prepared. The NTA pilot papers and the official GATE papers are held back pending permission (not published).

## B. BLOCKERS (must be true before the public deploy)
1. **Static flow audit done and fixed** (see docs/00_WORKPLAN.md "FINAL QA PLAN"): auth (email sign-up/sign-in, Google, reset, complete profile, sign-out), guest mode + migration, onboarding → plan → practice → summary, mocks/CBT (incl. GATE DA calculator/MSQ/NAT), upload, dashboard, analysis, roadmap, admin gate, config fallback, telemetry.
2. **Owner ran the checks** and failures are fixed: `pnpm test:rules` (Java on PATH `~/.local/jre/jdk-21.0.13+9-jre/bin`), `pnpm --filter @kairos/app test`, `pnpm --filter @kairos/core test:coverage`, `pnpm lint`, `pnpm --filter @kairos/app exec tsc --noEmit`, `pnpm --filter @kairos/app exec vite build`.
3. **Rules gate**: `firebase deploy --only firestore:rules --dry-run` compiles AND `pnpm test:rules` passes (all ~175 tests) BEFORE `firebase deploy --only firestore:rules,firestore:indexes`.
4. **Minors / DPDP decision (OWNER)**: users are mostly under 18. Today the app only records `consent.status: 'pending'` for minors and does NOT enforce parental consent. Choose before launch: (a) **recommended for v1:** accounts require 18+; under-18s can use **guest mode** (local-only, no personal data collected) until a verified parental-consent flow exists; (b) build the guardian consent flow first; (c) launch as is and accept the compliance risk. Whatever is chosen, the Privacy Policy must say it.
5. **Legal pages are real**, not "draft": Privacy Policy (what is collected: email, name, DOB, exam, study activity; anonymous aggregate counters; guest data stays on device; where stored (Google Firestore, asia-south1); retention/deletion; minors; contact email), Terms of use, contact/grievance email (DPDP). Owner supplies the contact email and reviews the text.
6. **Content permissions**: only MIT/Apache/CC0/CC BY datasets and our own authored questions are published. NTA/official GATE extractions stay unpublished until written permission is recorded (`pipeline/held_pending_permission/README.md`).
7. **No secrets in the repo or bundle**: `app/.env.local` is gitignored; the Firebase web config is public by design; no service-account keys anywhere.
8. **Firebase Auth**: Email/Password + Google enabled (done); authorised domains include `kairos-76a0d.web.app`, `kairos-76a0d.firebaseapp.com` (default) and any custom domain; Google OAuth consent screen branding/support email set (Firebase console → Authentication → Settings; Google Cloud console → OAuth consent screen). Email verification and password reset templates reviewed (console → Authentication → Templates).
9. **Admin access**: after rules are deployed the owner signs in, opens `/admin`, copies the UID, and creates the `admins/<uid>` document in the Firestore console.

## C. Strongly recommended (not blockers)
- 404 page + error boundary (no white screen), `robots.txt`, `sitemap.xml` (landing, privacy, terms), correct `<title>`/OG tags (done in index.html), PNG app icons 192/512 + maskable for PWA installability, Hosting headers/caching (in firebase.json), offline fallback page.
- App Check (reCAPTCHA v3) once the owner creates a site key (Firebase console → App Check).
- Spark quota watch: Firestore 50k reads / 20k writes per day; Hosting ~360 MB/day transfer (first visit ≈ 0.5–1.5 MB; the service worker caches the rest); set a calendar reminder to check the Usage tab weekly. If quotas are hit the app degrades gracefully (local-first); there is no billing risk on Spark.
- Fill real exam dates in `/admin → Exam dates` when NTA/NTA-like bodies announce them (JEE Main 2027, NEET UG 2027, IAT 2027, GATE 2027 DA session).
- Custom domain (optional): Hosting → Add custom domain, then add it to Auth authorised domains.

## D. Deploy sequence (orchestrator does this when B is satisfied)
1. `git status` clean on main; all agents finished; push.
2. `firebase deploy --only firestore:rules --dry-run --project kairos-76a0d` (compile) then **`pnpm test:rules`** (security gate), then
   `firebase deploy --only firestore:rules,firestore:indexes --project kairos-76a0d --non-interactive`.
3. `pnpm --filter @kairos/app build` (one build) → inspect `app/dist` size → `firebase deploy --only hosting --project kairos-76a0d --non-interactive`.
4. Smoke test on the live URL (temporary headless screenshots + manual): landing → guest → onboarding → plan → practice → mock → upload; sign-up/sign-in/Google/reset; `/admin` gate; 404 page.
5. Owner creates `admins/<uid>`; publishes the announcement + exam dates from `/admin`.
6. Tag the release: `git tag v1.0-launch && git push origin v1.0-launch`.

## E. Rollback
- Hosting: Firebase console → Hosting → Release history → Roll back to the previous release (instant).
- Rules: redeploy the previous `firestore.rules` from git (`git show <old-commit>:firestore.rules > firestore.rules`) and deploy.
