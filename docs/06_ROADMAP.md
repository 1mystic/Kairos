# 06 · Roadmap (do in order; tick in PRs)

| phase | weeks | ship | done when |
|---|---|---|---|
| 0 foundations | 1–2 | monorepo, tokens, taxonomy v1 (P,C,M,Bot,Zoo), schemas (zod), ingest JEE Main + NEET last 3 yrs, shard build + deploy, exam_calendar | 5k+ items render, zero KaTeX errors |
| 1 exam engine | 3–4 | CBT UI (5 states, keypad, auto-submit, offline resume), PYQ replay, basic report | full paper survives refresh + network drop |
| 2 measure | 5–6 | practice mode, event log, elo + rd, heatmap, mock report v1 (waterfall, time map), BYO upload + validator | 20 testers; mastery correlates with mock scores |
| 3 plan | 7–9 | onboarding w/ exam date, reverse schedule, pace ρ + today card, planner v1, backlog, FSRS, diagnostic, generator (greedy+anneal), daily FCM digest | testers follow daily plan 2 weeks unprompted |
| 4 expand | 10–12 | IAT, server grading, all-India weekly mock + percentile, IRT job, parental consent | first public mock 200+ takers |
| 5 polish | 13+ | JEE Adv skin + partial marking, Hindi, CP-SAT, predicted score sim, Socratic hint mode | — |

## first tasks for claude code (phase 0)
- [ ] pnpm workspace: app, core, functions; vitest; eslint+prettier; tsconfig strict
- [ ] tailwind wired to `brand/tokens.css`; logo + favicon from `brand/`
- [ ] `core/blueprint.ts`: zod schema + loader for `content/blueprints/*.json`
- [ ] `core/question.ts`: zod schema from docs/03; render test util with KaTeX
- [ ] `core/scoring.ts`: score responses vs blueprint (incl. MSQ partial hook) + tests
- [ ] firebase project init, emulators, rules skeleton + rules tests
- [ ] pipeline skeleton: `validate` + `publish` over a hand-made 20-question fixture
- [ ] CBT palette state machine in core (pure reducer) + tests, then UI
