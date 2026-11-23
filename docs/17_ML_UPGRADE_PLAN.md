# 17 · ML / Data Science Upgrade Plan

## Status (2026-11-23, branch feat/ml-upgrade)
- [x] Phase A baselines and metrics: `random`, `fixed_round_robin`, `difficulty_only`, `weakest_first`, `chapter_order`, `planner`; metrics gain / retention / wasted minutes / area under score curve; 1,000 x 5 seeds -> `docs/results/sim_baselines.json`. (Not done: "buffer days used" metric.)
- [x] Phase B attempt table: `core/src/measure/export.ts`, sim emits same columns, documented in 03. (Not done: Settings "Download my attempts (CSV)" button — app session events have no typed shape yet.)
- [x] Phase C learned recall model: `pipeline/ml/`, logreg shipped as `core/src/measure/learned.weights.json`, `core/src/measure/learned.ts` with golden test, behind flag. (Not done: Bayesian IRT and DKT/SAKT models.)
- [~] Phase D calibrated item difficulty: `pipeline/ml/irt_job.py` (1PL, held-out model selection), `publish.py --calib`, core `applyCalibration` + time norms in labels. Recovery ρ 0.979 overall but 0.885 at n = 50 — **gate (ρ > 0.9 at n ≥ 50) not met**, met from n ≈ 100. No 2PL. -> `docs/results/irt/`.
- [x] Phase E uncertainty-aware planner: `priorityMode: 'uncertainty'`, ablation per signal, paired comparison vs all baselines -> `docs/results/sim_planner.json`, `docs/results/sim_ablation.json`.
- [x] Phase F score intervals: split conformal on sim mocks, coverage 0.800 / 0.803 at 80% (gate ±5 met) -> `docs/results/score_interval/`, `core/src/gen/interval.ts`. App does not display it yet.
- [ ] Phase G LLM features: blocked (needs an LLM API key / paid inference and a human-labelled validation set).
- [x] Phase H report: `docs/results/README.md`, `pnpm --filter @kairos/core sim:study`, `python -m pipeline.ml.train`.

Goal: turn Kairos from "well-engineered heuristics" into a defensible **applied ML / data science project** (student capstone, 2026-27) without breaking the product rules: Spark-plan only, `/core` stays pure TypeScript, guest data stays on device, minors' data is used only for their own learning.

## 0. Where we are

| Area | Today | Where |
|---|---|---|
| Ability | Elo / 1PL online with rating deviation | `core/src/measure/elo.ts`, `mastery.ts` |
| Retention | FSRS per topic via `ts-fsrs` | `core/src/measure/fsrs.ts` |
| Behaviour | rule-based labels (time sink, guess, etc.) | `core/src/measure/labels.ts` |
| Planner | rolling-horizon heuristic, backlog and pace | `core/src/plan/*` |
| Paper generator | blueprint quotas plus selection | `core/src/gen/*` |
| Evaluation | synthetic students with known true ability | `core/src/sim/*` |
| Data pipeline | acquire, extract, validate, dedupe, tag (Python) | `pipeline/*` |
| Ask AI | prompt builder to external assistants (not our model) | `app/src/lib/askAi.ts` |

Update: see Status above — a learned model and baseline study now exist.

Honest gap: **no learned model of our own**, and no reported evaluation against baselines. Both are fixed below.

## 1. Target and thesis

> *A calibrated, uncertainty-aware learner model (ability + forgetting) drives a planner that provably beats random, fixed-schedule and difficulty-only baselines on simulated and, where available, real learners.*

Deliverables for a capstone: (a) a reproducible simulation study, (b) one learned predictive model with held-out evaluation, (c) calibration and ablation analysis, (d) an ethics and privacy section, (e) a short written report.

## 2. Roadmap (8 phases)

### Phase A · Baselines and metrics (week 1)
Make the evaluation trustworthy before adding models.
- Add policies to `core/src/sim/policies.ts`: `random`, `fixedRoundRobin`, `difficultyOnly` (always target P≈0.5), `weakestFirst`, `kairosPlanner`.
- Fix metrics in `core/src/sim/harness.ts`: **predicted-score gain at exam day**, area under mastery curve, retention at exam day, minutes wasted (practice at P>0.9 or <0.2), buffer days used.
- Run ≥ 1,000 students × 5 seeds. Report mean ± 95% bootstrap CI and paired differences vs random.
- Acceptance: every policy reproducible from a seed, results written to `docs/results/sim_<date>.json`.

### Phase B · Data schema for learning (week 1–2)
- Define a flat, anonymous **attempt table** (no uid, no free text): `{day_idx, topic, qid, difficulty_b, correct, time_ms, hint_used, prior_n_topic, days_since_last_topic}`.
- Add `core/src/measure/export.ts` (pure) that turns local events into that table, plus a **"Download my data (CSV)" opt-in** in Settings for research use. Never upload automatically.
- Synthetic generator (`sim/student.ts`) emits the same table so models train on sim now and real data later.
- Acceptance: schema documented in `docs/03_DATA_MODEL.md`; round-trip test.

### Phase C · Learned recall model (week 2–4), the core ML contribution
Predict `P(correct | student history, item)`.
- Baselines: Elo (current), FSRS retrievability, logistic regression on hand features.
- Models to add (Python, `pipeline/ml/`): **Bayesian IRT (1PL/2PL)** via `pymc` or `numpyro`; **gradient-boosted trees** (`lightgbm`) on features (recent accuracy, spacing, time, difficulty, topic); optional **Deep Knowledge Tracing / SAKT** (small PyTorch) for comparison.
- Split by **student**, not by row (avoid leakage); also a temporal split (train past, test future).
- Metrics: AUC, log-loss, **Brier**, **ECE** and a reliability plot. Report vs Elo/FSRS.
- Ship the winner as **weights in a static JSON** consumed by a tiny pure-TS scorer in `core/src/measure/learned.ts` (logistic/GBDT inference is small). No server inference, so Spark stays free.
- Acceptance: beats Elo on held-out log-loss in the sim, with calibration within ECE < 0.05.

### Phase D · Calibrated item difficulty (week 3–4)
Docs already plan a weekly IRT job.
- `pipeline/ml/irt_job.py`: fit item difficulty (and discrimination for 2PL) from pooled anonymous attempts; shrink toward a prior for items with few attempts.
- Publish `bank/v{N}/calib.json` (`{qid: [b, a, n]}`) next to `qindex.json`; `core/gen/select.ts` reads it.
- Time norms: per-topic median and MAD of solve time, used by `labels.ts` instead of the fixed `TIME_SINK_MS`.
- Acceptance: simulated recovery of true difficulty, Spearman ρ > 0.9 at n ≥ 50 attempts per item.

### Phase E · Uncertainty-aware planner (week 4–6)
- Replace point estimates with the posterior (Elo RD or Bayesian σ). Practise where **expected information gain × exam weight × forgetting risk** is highest (a contextual-bandit / Thompson-sampling view).
- Keep the hard rules: never exceed stated daily capacity, load change ≤ ±15%/day, buffers spent before load rises. ML only changes *which* items, never the cap.
- Ablate each signal (days left, weak topics, forgetting, skipped work) and report each one's marginal gain.
- Acceptance: beats `difficultyOnly` and `weakestFirst` with paired CI excluding 0.

### Phase F · Score prediction with intervals (week 5–6)
- Replace the heuristic band in `core/src/gen/predict.ts` with a model that outputs a **calibrated interval** (quantile regression or conformal prediction over mock results).
- Report interval coverage (target 80% interval covers ≈ 80%).
- Acceptance: empirical coverage within ±5 points on held-out sim and, if available, real mocks.

### Phase G · LLM features, done properly (optional, week 6–7)
Currently "Ask AI" only forwards prompts. To make it a real component:
- Offline pipeline (not in client): auto-tag questions with topic and misconception using an LLM, then **validate against human-labelled samples** (report precision/recall).
- Embeddings for near-duplicate detection and "similar question" retrieval in `pipeline/dedupe`; evaluate recall@k on a labelled set.
- Keep user content out of third-party calls unless the student explicitly sends it.

### Phase H · Report and reproducibility (week 7–8)
- One command per experiment (`pnpm sim:study`, `python -m pipeline.ml.train`), pinned versions, seeds logged.
- Results notebook or `docs/results/README.md` with tables and plots (reliability curve, learning curves, policy comparison).
- Ethics: minors, DPDP, parental consent, opt-in export, no demographic features, fairness check across exams and difficulty bands.

## 3. Detailed upgrade guide (how to do it)

### 3.1 Setup
```bash
pnpm install
pnpm --filter @kairos/core test            # baseline green first
python3.11 -m venv pipeline/ml/.venv && source pipeline/ml/.venv/bin/activate
pip install -r pipeline/ml/requirements.txt   # then: numpy pandas scikit-learn lightgbm pymc matplotlib
```
Create `pipeline/ml/` with `__init__.py`, `data.py`, `train.py`, `eval.py`, `irt_job.py`, `export_weights.py`.

### 3.2 Add a simulation policy (Phase A)
1. In `core/src/sim/policies.ts`, add a function with the same signature as the existing policies; keep it pure and seeded via `rng.ts`.
2. Register it in the harness policy list in `core/src/sim/harness.ts`.
3. Extend `sim.test.ts` with a smoke test; keep heavy runs in `full.sim.test.ts` (the repo convention is to ask before running heavy commands).
4. Output JSON, then plot in Python.

### 3.3 Train and ship a model (Phase C)
1. Generate data: run the sim to emit the attempt table (CSV/parquet).
2. `train.py`: split by student, fit logistic → LightGBM → (optional) SAKT; log AUC / log-loss / Brier / ECE.
3. `eval.py`: reliability plot and ablation (drop each feature).
4. `export_weights.py`: write `core/src/measure/learned.weights.json` (coefficients or serialised trees) with a version and the training seed.
5. In `core/src/measure/learned.ts`, implement a pure `predictP(features, weights)`; add unit tests that compare it against the Python output on fixed vectors (golden test).
6. Gate behind a flag so Elo remains the default until the study shows a win; keep the old path for rollback.

### 3.4 Calibration job (Phase D)
- Run weekly from GitHub Actions (cron), reading anonymised pooled attempts, writing `calib.json` into the bank publish step in `pipeline/publish`.
- Version it with the bank (`bank/v{N}`); the app already caches bank files in the service worker.

### 3.5 Evaluation protocol (every phase)
- Pre-register the metric and the baseline in the PR description before running.
- ≥ 5 seeds, paired comparison, bootstrap CI; never report a single run.
- Keep a **negative result** log in `docs/results/`. Honest nulls are worth marks.

### 3.6 Definition of done (per phase)
Tests green (`pnpm test`), `pnpm typecheck` and `pnpm lint` clean, docs updated in the same PR (`05_ALGORITHMS.md` for any algorithm change), and results committed under `docs/results/`.

## 4. Constraints (do not break)
- Firebase **Spark only**: no Cloud Functions, no paid inference. Models ship as static JSON; training runs offline or in Actions.
- `/core` stays pure TS: no React or Firebase imports.
- Exam patterns stay config in `content/blueprints/`.
- Real-user data: opt-in only, anonymised, no free text, no uid, minors' data never leaves the device without consent.
- Mock answer keys never ship to the client.

## 5. Risks
| Risk | Mitigation |
|---|---|
| Too little real data for IRT or DKT | Lead with the simulation study; use priors and shrinkage; call real-data results "preliminary" |
| Sim ≠ reality | Vary sim parameters (learning rate, forgetting, guess rate) and show robustness |
| Overfitting a small model | Student-level splits, regularisation, simple baselines reported alongside |
| Scope creep | Phases A, C, E and the report are the minimum; D, F, G are stretch |

## 6. Minimum viable capstone
A + C + E + H: baselines, one learned model beating Elo with calibration, an uncertainty-aware planner beating baselines with CIs, and a reproducible report.
