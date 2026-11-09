# 05 · Algorithms (all in /core, pure TS)

## 5.1 ability (user × topic) — elo / 1PL online
P = 1 / (1 + e^-(θ − b))
θ ← θ + K(r − P),  K = K0 / (1 + n/20)   (K0 ≈ 0.4)
track rd (glicko-style): falls with n, grows with time since last seen. UI shows rd: wide = "not enough data", not "weak".
chapter/subject = weight-averaged topics, shrunk to chapter mean when n small.
mastery m_T = P(correct) on a medium exam-level item.
item b: prior (source label + LLM + solution length) → offline 2PL IRT once n≥~200.

## 5.2 retention — FSRS per topic (`ts-fsrs`)
due when R < 0.85 (0.9 in last 60 days). same question never returns soon; a **twin** (same concept) does.

## 5.3 behaviour labels (from events + 1-tap reason)
| signal | label |
|---|---|
| wrong, t < 0.4×median | guess/careless |
| wrong, t > 1.5×median | concept gap |
| correct, t > 2×median | fluency (speed drills) |
| changed correct→wrong | overthinking |
| easy (p>0.75) wrong | silly mistake |
| skipped easy | strategy |
| >3 min on wrong | time sink |

## 5.4 paper generator
1 chapter quotas ~ Dirichlet(α≈50 × 5-yr weights), largest-remainder per subject×type
2 difficulty target = real-paper p-value histogram, slot bands
3 select: CP-SAT (fn/offline) — hard: type counts, quotas ±1, one per dedupe cluster, ≤1 per concept, exclude seen/over-exposed; objective min Σ|b−b_target| + λ exposure + μ recency. fallback: greedy + 500 annealing swaps (browser)
4 validate test characteristic curve: expected avg within ±5% of real paper, else redraw
5 order NTA-style; shuffle within section for shared mocks


**Virtual subjects and mark rounding (G1).** A blueprint may carry a top-level `subject_map` (`{ "DA": ["PRS","LA",...] }`). `resolveSubjects(blueprint, slotSubject)` returns the mapped taxonomy subjects, or `[slotSubject]` when unmapped. The generator draws a slot's candidates from every question whose `tax.subject` is in that set, so chapter quotas span all mapped subjects' chapters (weights from the chapter-weights file, floor-equal when missing). Section ids are free-form (`GA1`, `T1M-MCQ`); order is file order. `scorePaper` accumulates raw marks and rounds totals (paper, subject, section) with `roundMarks` (2 d.p., no -0), so GATE's -1/3 and -2/3 (stored as -0.333333 / -0.666667) never surface as 99.999999.

## 5.5 planner (rolling horizon: plan 7 days, commit today, replan every open)
phases by N days left (configurable):
| phase | N | mix new/weak/review/mixed | mocks | target P |
|---|---|---|---|---|
| Build | >120 | 50/25/15/10 | part test /14d | .70–.75 |
| Strengthen | 120–61 | 30/35/20/15 | weekly | .60–.70 |
| Consolidate | 60–31 | 10/35/25/30 | 2/wk | exam |
| Exam mode | 30–16 | 0/30/30/40 | alt days | exam |
| Final sprint | 15–3 | 0/30/50/20 | daily @ exam time | exam |
| Taper | 2–0 | own mistakes only | none | — |

capacity: questions_d = C(d)·f_u / t̄_item ; f_u = EWMA14(done/planned)·1.1
priority: π_T = α w_T(1−m_T) + β(1−R_T) + γ rd_T/rd_max + δ e_T + ε[fix-list] − ζ s_T  (phase sets weights)
triage from 45 days: low w + very low m → capped, said plainly, student can un-skip.

```
plan_day(d):
  budget = C(d)*f_u
  if mock(d): add mock + analysis; budget -= 210
  add fsrs_due(cap .25 budget)
  add carry_over(backlog, cap .30 budget)
  for bucket,share in phase.mix:
     topics = softmax_sample(eligible(bucket), π, τ, ≤3/subject)
     items  = pick_items(T, target_p, exclude seen<21d, prefer twins_of_wrong, high appearances)
  enforce subject balance (NEET bio≈50%, JEE ≈⅓ each, ±10% by weakness)
  order: warm-up → hardest weak → mixed → light review
```

## 5.6 backlog — carry, spread, shed, never pile
1 re-score as topics (practised elsewhere → shrink/dissolve)
2 carry ≤30% today
3 spread rest over k=min(7,⌊N/10⌋) days ∝ spare capacity
4 debt >2 days capacity → shed: low-π review → low-weight new → extra mixed. never shed mocks (exam mode+). show what dropped + marks cost
5 absent ≥3 days → fresh plan + mini diagnostic
6 f_u adapts daily

## 5.7 pace (headline feature)
reverse schedule: taper → sprint → mock days → buffers (1/7) → work days.
W = Σ_c max(0,(m*_c − m_c)/g_c)·t̄_c + W_reviews ;  A = Σ_workdays C(d)·f_u ;  ρ = W/A
g_c = student's mastery gain/question (learned; population prior first). m*_c from ambition, higher for high-weight chapters.
rules: never exceed stated capacity w/o asking · Δload ≤ ±15%/day · off-day respected (except sprint, warned) · spend buffers before raising load.

## 5.8 mock triggers
≥70% syllabus first time · ≥10d since last (Strengthen+) · predicted band shift >1 rd · day before phase change · missed mock → next day with ≥210 free min.

## 5.9 cold start
40-min CAT diagnostic over studied chapters (max-information item selection, ~2 items/chapter). unstudied chapters locked; triage view by weight if N small.

## 5.10 predicted score
monte carlo 500 blueprint papers with current θ → band (P25–P75). nightly.

## 5.11 validation harness
`core/sim`: 1,000 synthetic students with true abilities + learning/forgetting; compare planner vs random practice vs chapter-order on predicted-score gain at exam day. gate planner PRs on it.
