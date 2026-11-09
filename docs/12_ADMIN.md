# 12 · Admin console, shared config, telemetry

Spark plan only. Code: `app/src/admin`, `app/src/config`, `app/src/roadmap`, `app/src/telemetry`. Rules: `firestore.rules` (commit 0ca07a1).

## Becoming an admin
No credentials live in the repo. Sign in, open `/admin`: you see your UID and a Copy button. Then: Firebase console → Firestore Database → Start collection `admins` → Document ID = your UID → add any field (e.g. `role: owner`) → Save → reload `/admin`. A signed-in user may `get` only their own `admins/{uid}`; nobody can write it from the client or list admins.

## What admins can and cannot see
- Can: aggregate counters `stats/{day}`, user **profile** docs `users/{uid}` (read only; the UI shows counts, and optionally initials + join date + exam; never email or date of birth).
- Cannot: anything under `users/{uid}/**` (sessions, mocks, plans, bank, state). Attempt data is used only for the student's own learning (DPDP; many users are minors).
- Guests are not counted anywhere (local-only).

## Config docs (public read, admin write; each write carries `updatedAt: serverTimestamp()` and `updatedBy: uid`)
| doc | shape |
|---|---|
| `config/exam_calendar` | `{v:1, entries:[{id, exam, session 1..4, date\|null, window{start,end}\|null, status expected\|official, source\|null, last_checked\|null, note?}] (<=40)}` |
| `config/announcement` | `{active, title<=80, body<=400, link<=300\|null, tone info\|important, expiresAt\|null}` |
| `config/roadmap_defaults` | `{v:1, taperDays 0..7, sprintDays 5..30, workDaysPerBuffer 3..14, mockMinCapacityMin 60..300, phases{build,strengthen,consolidate,exam_mode,final_sprint: days-left thresholds}}` |

Client: `useExamCalendar()`, `useAnnouncement()`, `useRoadmapDefaults()` read each doc at most once per 6 h (localStorage `kairos-config-v1`, stale-while-revalidate), validate, and fall back to the bundled `content/exam_calendar.json` / core defaults offline or when the doc is invalid. The remote calendar is merged over the bundled one by exam + session.

## Publishing flow (Exam dates)
Edit rows → validation (ranges, valid dates, unique ids, <=40) → pending-changes diff vs the published doc → Publish → confirm modal → ONE `setDoc`. Students following a calendar session (`exam` packed as `JEE_MAIN.1`) are re-anchored on their next open and see the one-line re-anchor notice; students with their own date (`.0`) keep it.

## User roadmap
`users/{uid}/state/roadmap` = `{v:1, mode:'default'|'custom', config?, updatedAt}` (guests: local). Effective config: custom, else admin defaults, else core defaults (`useRoadmap()`); applied in `buildPlanContext` via `scheduleConfig`. Editor at `/roadmap`; choice also in onboarding review and Settings > Exam and plan (where the student can also switch the date source `.N` <-> `.0` and change the exam/date).

## Telemetry (anonymous counters)
`stats/{YYYY-MM-DD}` flat counters: `signups, sessions, questions, correct, mocks, diagnostics, uploads, active, onboarded, sessions_JEE_MAIN, sessions_NEET_UG, sessions_IAT`. Buffered in memory + localStorage, one scheduled flush a day plus one on page hide with data pending; skipped for guests/offline; deltas clamped to the caps (questions/correct 500, others 50; `correct <= questions`); zero deltas never written. `active` = +1 per user per day in one batch with `stats/{day}/seen/{uid}`; the marker is read first. Call sites: `app/src/telemetry/README.md`.

## Quota cost (Spark: 50k reads, 20k writes per day)
| action | reads | writes |
|---|---|---|
| admin opens Overview (7/30/90 days) | up to 7/30/90, cached 10 min | 0 |
| admin loads Users counts | up to 200, cached 10 min | 0 |
| admin System tab | bank files only (static hosting) | 0 |
| admin publishes a config doc | 0 | 1 |
| admin gate check | 1 per session | 0 |
| student opens the app | up to 3 config docs per 6 h (public docs), +1 `state/roadmap` per plan load | 0 |
| student, a day of use | 1 marker read | 1 counters write + (first flush of the day) 2 for active + marker |
