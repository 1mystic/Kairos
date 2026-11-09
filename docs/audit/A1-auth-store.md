# AUDIT-A1: auth, guest mode, store/migration, providers, Firestore-rules contract

Static read only (no tests, tsc, build or browser were run). Area: `app/src/{auth,store,lib,config,telemetry}`, `pages/{Settings,Home,Legal,PublicEntry}`.

## Findings and fixes

| # | Sev | Finding | Status |
|---|-----|---------|--------|
| 1 | blocker | Email sign-up wrote `email` as typed (`signUp` -> `writeProfile`). Firebase Auth lower-cases the address in the ID token and the rules require `d.email == request.auth.token.email`, so anyone typing a capital letter (phone auto-capitalise) got permission-denied and an account without a profile. | Fixed: `auth/AuthProvider.tsx` signUp uses `cred.user.email` (fallback lower-case). |
| 2 | major | A failed/offline profile lookup was treated as "no profile": an existing user was bounced to `/complete-profile` (and a re-submit then fails the rules as an invalid update). | Fixed: `AuthProvider` exposes `profileError` + `reloadProfile`; `ProtectedRoute`/`HomeGate`/`CompleteProfile` show a calm retry screen (`ProfileRetry`). |
| 3 | major | Stale profile lookup race (sign-out then another sign-in, unmount) could set the wrong profile. | Fixed: request sequence counter in `AuthProvider`. |
| 4 | major | `completeProfile` blindly `setDoc` (create). If the doc already existed (second tab, earlier attempt) it becomes an update that the rules reject. | Fixed: reads first and adopts the existing profile; also sends the verification mail for password accounts whose sign-up write had failed earlier. |
| 5 | major | Firestore client had no `ignoreUndefinedProperties`; any undefined optional field in a session/plan/profile write throws in `setDoc/updateDoc`. | Fixed: `lib/firebase.ts`. |
| 6 | major | Reads budget: `listPaceLog()` read the whole collection (up to 365+ docs) on every Home visit; sessions/mocks re-billed on every navigation back to Home. | Fixed: `FirestoreStore.listPaceLog` newest 130 days (`all:true` for export, via `orderBy(documentId(),'desc')`); `createFirestoreAdapter` memoises collection reads for 30 s and drops them on any write under that collection. |
| 7 | major | Migration/bank batches were bounded by op count only (400). Firestore rejects commits > 10 MiB: 400 sessions with events, or 100 questions with media, would fail forever. | Fixed: new `store/batching.ts` (`chunkOps`, ~4 MB / 400 ops) used by `migrate.ts`, `bankCloud.ts`, `FirestoreStore.batchWrite`. |
| 8 | major | Migration could upload a guest session with > 2000 events or a plan with > 200 tasks; the rules reject the whole batch, so migration failed on every retry. | Fixed: truncated to the rule caps in `migrate.ts`. |
| 9 | major | `roadmap` state (allowed by rules) was not migrated from the guest. | Fixed (skipped when the account's own plan is kept). |
| 10 | major | Sign-out wiped guest data that was never added to the account (prompt postponed, upload failed, questions left over caps). | Fixed: `signOutToGuest` keeps local data when something is still unmigrated. Spec says "empty local store"; this only deviates to avoid silent data loss. |
| 11 | major | Migration was attempted only once per uid per page load; sign out then back in as the same user never re-checked new guest data. Double-click on "Add progress" could run two migrations. | Fixed: `attempted` reset on sign-out, `migrating` guard in `StoreProvider`. |
| 12 | major | `NudgeProvider` default `now = () => new Date()` was a new function per render, so its effect (IndexedDB session scan, state writes) re-ran on every render. | Fixed: module-level `defaultNow`. |
| 13 | minor | `state.from` was set by `ProtectedRoute` but never used: deep links were lost after sign-in. | Fixed: `PublicOnlyRoute` redirects to a validated `from` (`safeReturnPath`: same-origin, not an auth page). |
| 14 | minor | `Continue as guest` and `startGuest` failed silently/unhandled if IndexedDB is blocked. | Fixed: `startGuest` tolerates IDB failure (guest still opens, session-only); SignIn shows a message on failure. |
| 15 | minor | Google button had no busy state: double clicks produced `cancelled-popup-request` errors. | Fixed. |
| 16 | minor | Settings export/clear had no error handling (unhandled rejection, no message) and revoked the blob URL immediately (cancels the download on some browsers). | Fixed. |

## Rules contract (checked, no change needed)
- users/{uid} create: field set, `createdAt/updatedAt` server time, `consent.status` not_required|pending, `isMinor`, `schemaVersion:1`, name 1..80 match `buildNewProfile` + `writeProfile`. Update allow-list matches `FirestoreStore.saveProfile`, `updateProfileFields`, migration onboarding copy (`onboardingFields` validates every value).
- state/{mastery|pace|roadmap}, sessions, plans, mocks (client never sets `gradedBy`), bank (`u_` ids, caps from core quota), media (create-only, exactly b64,w,h,mime,createdAt, `SERVER_TIME` swapped for `serverTimestamp()`), config `get` only, admins get-self, stats (`active` + `seen` marker in one batch after a `get`, other counters separate, zero deltas dropped by `normalize`, GATE_DA has no per-exam counter): all consistent.
- Guests never reach Firestore: LocalStore only; telemetry `bump` returns false without a uid.
- Config reads fall back cache -> bundled defaults; fetch errors are swallowed.
- No `console.*`, no PII logging, no `dangerouslySetInnerHTML`, announcement links are `https?` only with `rel="noopener noreferrer"`.

## NOT fixed / needs decision or other owners
- `app/src/pages/AppLayout.tsx` (A4/App owner): `resendVerification().then(...)` has no `.catch` (too-many-requests becomes an unhandled rejection and the button stays).
- `dashboard/useDashboardData.ts` (A2): still reads up to 600 sessions + all mocks per Home visit (now memoised 30 s by the adapter, still ~600 reads on a cold visit for a heavy user). Consider `limit: 200` or caching a summary doc. `store.listMocks()` is unbounded everywhere (fine while users have tens of mocks).
- `CloudBankStore` caches per instance and `BankProvider` is mounted per route (`/practice`, `/upload`, `/bank`), so each route change re-reads the whole bank (up to 2000 docs). Needs a shared per-uid cache; left because tests inject adapters per provider.
- Google `signInWithRedirect` fallback: redirect errors (e.g. account-exists-with-different-credential) are not surfaced (no `getRedirectResult` call). Sign-in itself works.
- `AuthProvider.profile` is not refreshed after `saveProfile` (onboarding writes go to the store only); consumers needing `onboarded` must read the store. Home only uses `displayName`/`isMinor`, so unaffected.
- NudgeProvider modals can open while a full-screen exam route is mounted (e.g. `three_days` on load). Suggest suppressing on exam routes (needs route paths from cbt).
- Settings has no name editing and "Clear local data" does not remove the guest question bank (copy says sessions, mocks, plans).
- Minors: consent stays `pending` with a Home note only (as designed); no under-13 floor on DOB.
- Firestore profile read on every sign-in is 1 read; migration `hasData` costs 6 reads but only runs when the guest has local data/onboarding fields.

## Tests written (not run)
- `app/src/store/batching.test.ts`: `chunkOps` splitting, migration truncation to rule caps, roadmap state migrated.
- `app/src/auth/validation.test.ts`: `safeReturnPath`, `validateDob`.

## Could not verify
Everything is by reading: type-checking of the new optional context fields (`profileError?`, `reloadProfile?`) against test harnesses (`plan/harness.test-util.tsx`, `cbt/_harness.tsx` build `AuthContextValue` objects and should still compile since the fields are optional), that Firebase Auth lower-cases the token email (documented behaviour; the fix is harmless either way), and the 10 MiB commit limit heuristics.
