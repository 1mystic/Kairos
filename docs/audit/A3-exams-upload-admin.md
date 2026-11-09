# A3 audit: exams (CBT), results, upload, admin console, rules compatibility

Static audit only (nothing was run: no tests, tsc or build). Tests written below have NOT been run.

## Verified OK (by hand)
- **GATE mini-paper mapping** (`app/src/cbt/model.ts` buildExamModel): hand-simulated against `gate_da_2027` + mocks A/B/C and `sample_jee_mini_v1`. Every question of every mock is placed (A 48 q / 66 marks: GA1 5, GA2 3, T1M-MCQ 12, T1M-MSQ 6, T1M-NAT 7, T2M-MCQ 4, T2M-MSQ 0 (dropped), T2M-NAT 11; B 46 q / 62 marks; C 45 q / 60 marks; JEE mini 9 q). Marks per slot follow the blueprint section, so fractional negatives (-0.333333 / -0.666667) apply to the right slots. Note: GA2 (2-mark) gets only the leftover GA questions after GA1 takes 5, by design.
- All mock question ids exist with answers in the v4 practice shards (so grading is not "pending"); `getQuestionsByIds(version, model.exam, ids)` is called with `GATE_DA` / `JEE_MAIN`.
- Calculator evaluator (`calculator/eval.ts`), 15 expressions traced: `2+3*4`=14, `2^3^2`=512 (right assoc), `-2^2`=-4, `2^-2`=0.25, `2*-3`=-6, `-3+5`=2, `sqrt(16)+1`=5, `sin(30)` deg=0.5, `2pi`, `2e3`=2000, `2e`=2*e, `(2+3)(4)`=20, `1/0` and `sqrt(-1)` -> "Math error", `3-2-1`=0, `-sqrt(4)`=-2. No eval/Function. Calculator field is a normal input; only the NVQ keypad field blocks the physical keyboard.
- `putMock` doc has no `gradedBy`; rules for `mocks/{mid}` accept it. `reportMock()` runs after the write. Double-submit guarded (`done` ref + reducer is idempotent after submit). Timer derives from `startedAtEpoch`. Stats counters in telemetry unchanged by this audit.
- Upload: `app/src/upload/prompt/extract_v2.txt` is byte-identical to the fenced block of `prompts/extract_questions_v2.md` (lines 6-60). GATE_DA is the 4th exam in the chooser (39 chapters flagged). Bank media ids are 16 hex, question ids `u_<12 hex>`, media doc shape matches the rules (`b64 <= 120000`, mime webp, createdAt serverTimestamp, create-only).
- Admin: config payload keys equal the rules' `hasOnly` sets (exam_calendar v/entries(+stamp); announcement all 8 fields; roadmap_defaults v/taperDays/sprintDays/workDaysPerBuffer/mockMinCapacityMin/phases(+stamp)); stamp = `updatedAt: serverTimestamp()` + `updatedBy: uid`; entries <= 40 enforced; GATE_DA calendar entries supported (`EXAMS` includes it, bundled calendar has `GATE_DA_2027`). Users list shows initials/exam/date only.

## Fixed
| # | Sev | Where | Problem -> fix |
|---|---|---|---|
| 1 | High | `core/src/byo/validate.ts` (new caps, test in `core/src/byo/byo.test.ts`) | Client allowed stem/solution/passage > 12000 chars, > 10 options, > 12 figures that `firestore.rules validBankDoc` rejects, which would fail the whole batched save with a generic permission error. Now flagged as per-question errors in review (not auto-selected, blocks save with a clear message). |
| 2 | High | `app/src/admin/data.ts` getUsers | The admin users query cached full profile docs (email, date of birth of minors) in sessionStorage via `useCachedQuery`. Now projected to displayName/isMinor/consent.status/onboarded/exam/createdAt before leaving the data layer. |
| 3 | Medium | `app/src/cbt/ExamFlow.tsx` (decide effect) | Effect re-ran if `finish`/`clock`/`store` identity changed and, finding the just-saved attempt, switched a RUNNING exam back to the "Resume attempt" screen. Now decides only while phase is `loading`. |
| 4 | Medium | `ExamFlow.tsx` | IndexedDB failures (private mode) left the student stuck on "Loading your paper" (`attempts.get` unhandled rejection) or unable to submit (`attempts.put(...).then(finish)` never ran). get-failure -> instructions; put failure no longer blocks `finish`; `attempts.delete` failure no longer shows "could not save". `ExamSession.tsx` flush `put` and Start `put` get `.catch`. |
| 5 | Medium | `app/src/components/mdBlocks.ts` (+ new `mdBlocks.test.ts`) | Table rows split on pipes inside `` `code` ``, `$|x|$` math and `\|`; ragged rows silently dropped extra cells. Scanner now respects code/math/escaped pipes, and the table widens to the longest row. Verified against the v4 bank: 0 rows with unbalanced `$`/backticks. |
| 6 | Medium | `app/src/admin/tabs/Overview.tsx` | 7-day view computed week-over-week insights from 7 fetched days, so it printed "N sign-ups this week, 0 the week before". Now always reads max(range,14) days (<= 90 reads); added test. |
| 7 | Medium | `app/src/upload/QuestionEditor.tsx` | Removing option B of A-D re-lettered the options but kept the old answer keys (answer silently pointed at a different option). Keys are now remapped/dropped with the option. |
| 8 | Low | `ExamSession.tsx` CbtModal | No Esc to close, no focus move/trap/restore. Added (focus first button, Tab loop, Esc, restore focus). |
| 9 | Low | `MockResultSummary.tsx`, `MockReview.tsx` | Negative-marks chip and per-question marks showed floats like -2.333331 / -0.333333; rounded to 2 decimals. GATE section ids (GA1, T1M-MCQ) no longer shown as "Section GA1". |

## Not fixed / notes
- Telemetry `sessions_GATE_DA` is not in the rules' `statKeys()` (GATE sessions only bump `sessions`); admin Overview "Sessions by exam" therefore has no GATE row. Needs a rules change + deploy (A1 / owner). Documented in `telemetry/logic.ts`.
- Mini GATE papers: GA2 (2-mark) gets fewer questions than GA1 by the first-count rule (A: 5+3). Intentional per the slot-order rule; content decision, not a bug.
- `useAdminStatus` caches `false` for the session on any `admins/{uid}` read error (e.g. offline): an admin must reload. Left as is (safe default).
- `ExamFlow` finalize path (`expired`/`finalize`) can double-run `finish` if its deps change while still `loading`; extremely unlikely, left.
- An unclosed/empty code fence (` ``` ` with no body) falls back to inline rendering; data has none (checked: 0 unclosed in v4).
- Saved questions whose figure crop is missing from the in-memory `crops` map (not possible via the UI flow) would save without media.

## Cross-area requests
- A1 (telemetry/rules): add `sessions_GATE_DA` to `statKeys`/`validStat*` and `STAT_FIELDS` when rules are next deployed.
- A2: `roadmap/model.ts toDefaultsDoc` spreads `config.phases` into the doc; rules allow only the six known phase keys and ints 0..400 (clamp looks fine, just keep it that way).

## Tests written (NOT run)
- `app/src/components/mdBlocks.test.ts` (3 tests: pipes in math/code/escaped, ragged rows, escaped code fence).
- `core/src/byo/byo.test.ts`: "rejects fields over the firestore.rules caps".
- `app/src/admin/admin.test.tsx`: "the 7 day view still reads 14 days".

## Could not verify
Everything runtime: tsc, vitest, rendering, fullscreen/pointer behaviour, KaTeX output for the 22 images and tables, Workbox caching, and the (still undeployed) admin rules against the emulator.
