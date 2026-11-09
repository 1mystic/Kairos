# Static audits

Four read-only audits of the app (nothing was run; findings and fixes are by reading).

- [A1 auth + store](A1-auth-store.md)
- [A2 learning flows](A2-learning-flows.md)
- [A3 exams, upload, admin](A3-exams-upload-admin.md)
- [A4 launch hygiene + app shell](A4-launch-hygiene.md)

## Cleanup C1

Leftover items from the "not fixed" sections of A1 to A3, fixed without running anything (tests written, not run).

Fixed
- Resend verification: rejections are caught and shown calmly (friendly auth message, `text-status-bad`) in the verify banner.
- Nudge modals never open over `/exam/:id` (runner) or `/diagnostic`; a request made there stays queued and shows afterwards (`isFullScreenRoute` in `store/nudgeLogic.ts`).
- Google redirect fallback: `getRedirectResult` runs once on mount; failures reach the sign-in/up form through `AuthContext.redirectError` (the Google button copies it into the form error); "no redirect" is ignored.
- Profile refresh: `FirestoreStore` reports successful `saveProfile` writes and `AuthProvider.patchProfile` merges them into the in-memory profile (no extra read, no loading flash), so onboarding writes and name edits show without a reload.
- Shared bank cache: `CloudBankStore` list cache is module level per (adapter, uid), 5 min TTL, dropped on write/delete/migration; `createBankFirestoreAdapter` returns one adapter per Firestore instance; `resetBankCache()` for tests.
- `UserStore.getSession(id)` (1 read) used by the practice summary, so old sessions are found.
- Dashboard reads at most 200 sessions; `listMocks({limit})` is bounded in `FirestoreStore` (default 100, `orderBy submittedAt desc`, single field so no composite index; export passes Infinity; `LocalStore` stays unbounded).
- Predicted-score cache is keyed per account (`kairos-predicted:<uid|guest>`).
- `getLatestVersion()` memoised for 60 s (offline fallback and version purge unchanged; `resetBankMemo()` / `configureBank()` reset it).
- Settings: signed-in users can edit their display name (1 to 80, trimmed, `saveProfile({displayName})`); "Clear local data" also clears the guest question bank and images, with danger styling and matching copy.
- Planner mock shape: `PlanInput.mockMinutes` / `mockQuestions` (JEE defaults 180 min + 30 analysis, 75 items unchanged); `plan/engine.ts` passes them from the exam blueprint via `PlanEnv.loadMockShape` (GATE DA: 180 min, 65 questions).
- Dashboard `today` uses the plan's 04:00 day boundary (`planDate`); a timed-out practice question gets the "time" reason only when the answer was missing or wrong.

Remaining
- Mock docs written without a numeric `submittedAt` would not appear in the bounded `listMocks` query (all current writers set it). Lookups by id (`analysis/views/pages.tsx`, `cbt/ResultPage.tsx`) still scan `listMocks()`, so a mock older than the newest 100 is not found there; a `getMock(id)` would fix it.
- Roadmap `mockMinCapacityMin` (schedule threshold, default 210) is a user setting and is not derived from the blueprint.
- A3: `sessions_GATE_DA` telemetry key needs the rules deployed (already in `firestore.rules`; deploy is the owner's step).
- Minors: no under-13 DOB floor; consent stays pending (by design).
- Everything above is unverified at runtime: run lint, `tsc --noEmit`, the app and core test suites and a build.
