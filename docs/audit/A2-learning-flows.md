# AUDIT-A2: learning flows (static audit, nothing was run)

Scope: onboarding, plan, practice, diagnostic, dashboard, analysis, roadmap, bank client. Read by hand, no tests/tsc/build executed.

## Fixed

### Blockers / high
1. Packed profile exam never matched `isExamId` (known bug). `profile.exam` is `JEE_MAIN.1` / `GATE_DA.0` / `JEE_MAIN.2+NEET_UG.1@date`.
   New `primaryExamId()` in `app/src/practice/taxonomy.ts` (decodes the nearest exam, also accepts a bare id). Used in
   `diagnostic/DiagnosticScreen.tsx` (exam pre-select), `diagnostic/NewMockScreen.tsx` (pre-select), `diagnostic/usePredictedScore.ts`
   (was always falling back to JEE_MAIN, so GATE/NEET/IAT students got a JEE band), `analysis/hooks.ts` (the `exam` fed to
   MasteryTab/MistakesTab; MistakesTab built `/practice/GATE_DA.1/...` links), `practice/Picker.tsx` (opens on the student's own exam tab).
   Other readers of the profile (`plan/*`, `onboarding/*`, `dashboard/plan.ts`) already use `decodeExams` or `examDate`.
2. GATE DA mock generator: `capacityShortfalls` and `miniBlueprint` (`diagnostic/mockPlan.ts`) matched `q.tax.subject === s.code`, but the
   GATE blueprint subject `DA` is virtual (`subject_map` -> PRS, LA, CO, ...). Result: "full paper not possible" and an empty mini paper for GATE.
   Both now use core `resolveSubjects` (same mapping the generator uses). Test added in `diagnostic/mock.test.tsx`.
3. Plan "Full mock" task link always pointed at `sample_jee_mini_v1` (a 9-question JEE paper) for every exam.
   `plan/engine.ts` `taskLink`: per-exam map (`JEE_MAIN` -> sample, `GATE_DA` -> `gate_da_mock_a`), exams without a published paper (NEET, IAT) -> `/mocks/new`. Tests updated.
4. Numeric answer box (`practice/SessionRunner.tsx`) stripped the Unicode minus (U+2212, en dash) so "-2" typed on a phone keyboard became "2" and was marked wrong. New `cleanNumeric()` maps them to "-" first. Test `practice/cleanNumeric.test.ts`.

### Medium
5. `practice/SessionScreen.tsx`: `started` boolean never reset, so navigating to another chapter inside the mounted screen kept the old session. Now keyed by exam/chapters/own-questions.
6. `practice/SessionScreen.tsx`: `listSessions` for recency had no limit (cloud default 60, local unbounded) and "unseen" read all history. Now `{since, limit: 200}` / `{limit: 300}` (bounded reads).
7. `bank/client.ts` `getQuestionsByIds` took no hint, so opening one session summary downloaded every shard of the exam (JEE ~76 shards, GATE ~39). New optional `chapterHint`: loads only those shards first and falls back to all shards if an id is missing. Used by `practice/Summary.tsx` and `analysis/hooks.ts`. Test added in `bank/client.test.ts`.
8. `plan/usePlan.tsx`: when the calendar/roadmap config arrived (or StrictMode remount) two runs of the load effect both ran `commitDay` (duplicate plan/pace writes). Superseded runs now return before writing.
9. `diagnostic/DiagnosticScreen.tsx`: guests lost the onboarding `chaptersDone` prefill (it was read only for non-guest profiles).
10. `diagnostic/NewMockScreen.tsx`: chapter weights of the previous exam stayed in state while the new exam's bank loaded; reset with the bank.
11. `plan/PlanScreens.tsx` `DayPage`: an error state rendered the "exam date has passed" screen; now shows the error with retry. "JEE MAIN" label now uses `examLabel` ("JEE Main", "GATE DA").
12. Dashboard predicted band: `bundle.band` was never set and `PredictedBand` is mounted nowhere. `dashboard/Dashboard.tsx` now calls `usePredictedScore({ enabled })` only when a visible card shows the band (Readiness "band" view or a "band" stat tile), so no bank download otherwise. `usePredictedScore` got an `enabled` option.

## Checked and fine
- Bank v4: latest.json -> manifest -> shard path building for all 4 exams (302 shards, GATE_DA subjects GA PRS LA CO PDS DBW ML AI), taxonomy at `v4/taxonomy.json`, 4 blueprints + 4 mocks present, sha check on gz bytes, purge of older versions on version change, `deriveImgBase('/bank') = '/img'`. All 74 image refs in the GATE shards have their webp variants in `app/public/img` (verified by script). Chapter ids contain dots (`AI.LOG`): fine in React Router params; Vite dev server may not SPA-fallback on a reload of such URLs (dev only).
- Calendar: GATE has `date: null` + `window` (start used as expected date, student confirms), JEE/NEET/IAT have no dates yet: the form requires a typed date. Pack/unpack round-trips and stays under 40 chars.
- Practice: MSQ all-or-nothing, NAT ranges (`{range}`), `tol 0` values and decimals go through core `evaluateDetailed`; one `addSession` + one `putState('mastery')` in `commitSession`; `reportSession` after commit. Mastery key `θ` is consistent across measure/practice/diagnostic/analysis/dashboard.
- GATE topic meta in the plan: `canonicalSubject` falls back to lower-case taxonomy id; core `subjectBalance` gives equal shares for unknown exams.

## Not fixed (reason)
- Predicted-score cache (`localStorage kairos-predicted`) is not per user: a second account on the same device briefly sees the first account's band until the daily/attempts check invalidates it. Needs a uid in the key (store is A1's area).
- `getLatestVersion()` hits `latest.json` (no-store) on every call (session start does it 2-3 times). Cheap, but a 30 s memo would be better; left alone to avoid breaking client tests I cannot run.
- Planner mock task uses fixed `mockMin` 210 / 75 items (JEE shape) for every exam (GATE paper is 180 min / 65 q); `core/src/plan/planner.ts` would need per-exam config. Not changed (design decision).
- Dashboard `today` is computed once at mount (stale if the tab stays open past midnight) and uses calendar midnight while the plan uses a 04:00 day boundary.
- Summary page finds the session with `listSessions()` (cloud default 60), so a summary older than the last 60 sessions says "not found".
- Practice "Only unseen" still falls back to seen questions when the pool is short (banner says so); intended.
- Timed mode: a question that times out auto-tags reason `time` even if the typed answer was right (reasons only matter for wrong answers).
- `SessionRunner` re-renders every 250 ms for the timer (QuestionView re-render cost unknown; not measured).

## Cross-area requests
- A3 (cbt): `/exam/:paperId` for `gate_da_mock_a` is now linked from the plan; make sure `gate_da_mock_*` open from the plan link with a signed-out guest.
- A1 (store): include uid in the predicted-score cache key or clear `kairos-predicted` on sign-in/out; `listSessions()` without opts on cloud returns only 60.
- A4: none.

## Tests written (not run)
`practice/primaryExam.test.ts`, `practice/cleanNumeric.test.ts`, additions in `bank/client.test.ts`, `diagnostic/mock.test.tsx`, `plan/engine.test.ts`; `plan/plan.test.tsx` expectation updated to "JEE Main".
