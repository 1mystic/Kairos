# 01 · Product

## one line
a practice platform where **the app decides what you solve today** — from days left, weak topics, what you're forgetting, and what you skipped yesterday — on a real CBT-style exam screen with real-pattern papers.

## headline feature: exam date in → comfortable plan out
student enters **when is my exam** (picks exam + session from `exam_calendar`, or custom date). every day the app checks progress vs time left and re-sizes the plan. never cramming at the end, never an impossible backlog.

- exam calendar: `status: expected | official`. date confirmed/changed → plans re-anchor on next open + 1-line notice.
- JEE Main S1 → after it passes, ask "S2?" and roll forward (mastery carries, phase clock resets).
- multiple exams: nearest drives phases; second exam adds its unique topics.
- onboarding also asks: minutes per weekday, weekly off-day, chapters done, coaching/self-study, ambition (Comfortable / Competitive / Top-rank).

**reverse scheduling** (built from exam date backwards): taper (last 2 days) → final sprint (last 15 days, daily full mock at real exam clock time) → mock days per phase → buffer days (1 per 7 work days, light reviews only) → work days get everything else.

**pace** each day: W = work still needed, A = minutes available on work days, ρ = W/A.
| ρ | status | action |
|---|---|---|
| <0.85 | Ahead | offer higher ambition / extra mocks, never auto-add |
| 0.85–1.0 | On track | none |
| 1.0–1.15 | Slightly behind | spend buffer days, say which |
| >1.15 | Behind | student chooses: +X min/day or drop N low-weight chapters (shows marks cost) |

**daily check**: first open after 04:00 local + FCM push at chosen time. computes yesterday done/planned, mastery deltas, ρ, buffers left, predicted score band, today's plan; writes 1 snapshot to `pace_log/{date}`.

today card:
```
97 days to JEE Main S1 (22 Jan)         On track ● ρ 0.92 · 6 buffer days left
Yesterday  41/50 · Physics +3% · Organic needs attention
Today      46 questions · ~2h10m · Rotation (weak) · Ionic Eq (review) · mixed
Next mock  Sat 9:00 · full JEE Main pattern
Predicted  168–196 (target 180)
```

## five loops
| loop | in | out | runs |
|---|---|---|---|
| ingest | official PDFs, datasets, uploads | tagged deduped items | pipeline |
| test | blueprint + bank + history | real-pattern paper in CBT UI | browser + grader fn |
| measure | event log | ability, retention, errors, time | browser + nightly |
| plan | model + days left + capacity + backlog | today's tasks, mock calendar | browser on open |
| calibrate | all attempts | IRT difficulty, time norms, percentiles | weekly batch |

## exams (seed blueprints, as of Nov 2026)
| exam | mode | structure | Q | marks | time | marking |
|---|---|---|---|---|---|---|
| JEE Main P1 | CBT | P,C,M × (20 MCQ + 5 NVQ) all compulsory | 75 | 300 | 180 | +4/−1 MCQ; NVQ negative **VERIFY** in NTA bulletin |
| JEE Adv | CBT ×2 papers | varies yearly | ~48+54 | ~360 | 180 each | full/partial/zero/neg per section |
| NEET UG | **CBT from 2027** | Phy45 Chem45 Bio90 | 180 | 720 | 180 | +4/−1 |
| IAT | CBT | B,C,M,P × 15 | 60 | 240 | 180 | +4/−1 |

## launch scope
JEE Main + NEET together (NEET first-time-CBT students = wedge). JEE Adv + IAT later.

## differentiators vs Marks / NTA Abhyas / PW
closed-loop planner · honest backlog (re-score, spread, shed — never pile) · exam-time daily mocks in final sprint · marks-lost waterfall analysis · bring-your-own-paper via any LLM.
