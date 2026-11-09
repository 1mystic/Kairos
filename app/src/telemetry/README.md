# Telemetry call sites (for the orchestrator)

Anonymous daily totals only (`stats/{YYYY-MM-DD}`), signed-in users only; guests, signed-out and offline are skipped.
Do not call Firestore directly. Import from `app/src/telemetry`.

| where | call |
|---|---|
| `main.tsx` (once, after render) | `installTelemetry()` |
| practice session end (the single place a session summary is written, `SessionRunner`/`Summary`) | `reportSession({ exam, answered, correct })` with `exam` = `JEE_MAIN` / `NEET_UG` / `IAT` of the session (omit if mixed) |
| CBT mock submit (`cbt/ExamFlow` after the mock is stored) | `reportMock()` |
| diagnostic completion (`diagnostic/*` when the result is saved) | `reportDiagnostic()` |
| upload wizard when questions are saved to the user's bank | `reportUpload(n)` with n = questions added |
| `auth/AuthProvider.signUp` after the profile doc is created (and `CompleteProfile` for Google first sign-in) | `reportSignup()` |
| onboarding save (`Wizard.save`, first time only: `!edit`) | `reportOnboarded()` |

Flush policy: one scheduled write a day (5 s after load / sign-in / 20 s after a report), plus one when the page is hidden with data pending.
The daily `active` count is +1 per user per day in a batch with `stats/{day}/seen/{uid}` (marker is read first; skipped if it exists).
