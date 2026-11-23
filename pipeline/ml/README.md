# pipeline/ml: learned recall model P(correct)

Offline training/evaluation (Python 3.11). Input is the CSV emitted by the TS simulator
(`pipeline/ml/data/sim_attempts.csv`, schema in `data.py: COLUMNS`). Output goes to `pipeline/ml/out/` (gitignored).

## Setup
    cd /home/user/Kairos
    /usr/bin/python3.11 -m venv pipeline/ml/.venv
    pipeline/ml/.venv/bin/pip install -r pipeline/ml/requirements.txt

## Run (from repo root)
    PY=pipeline/ml/.venv/bin/python
    $PY -m pipeline.ml.data --toy pipeline/ml/data/toy.csv --n-students 200   # optional synthetic data
    $PY -m pipeline.ml.train --data pipeline/ml/data/sim_attempts.csv --seed 2026 --out pipeline/ml/out
    $PY -m pipeline.ml.eval  --data pipeline/ml/data/sim_attempts.csv --seed 2026 --out pipeline/ml/out   # ablation (train runs it too)
    $PY -m pipeline.ml.export_weights --model pipeline/ml/out/logreg.pkl \
        --out core/src/measure/learned.weights.json --sim-command "pnpm sim:study ..."
    $PY -m pipeline.ml.export_weights --model pipeline/ml/out/lgbm.txt --out /tmp/gbdt.json   # optional GBDT trees
    $PY -m pytest pipeline/ml/tests -q

Splits are by student (sha256 of sid+seed). Temporal split: train rows day_idx < cutoff of train students,
test rows day_idx >= cutoff of test students (models are refit for it).

## Decision rules for the TS scorer
logreg: x_std = (x - mean)/scale; p = sigmoid(intercept + sum coef*x_std).
gbdt: p = sigmoid(sum over trees of leaf_value); at a node go left iff `x[feature] <= threshold`, else right.

## IRT calibration (Phase D)
1PL (Rasch) item difficulty by penalised joint ML (alternating Newton), ability groups = (sid, policy, topic, 7-day block),
b shrunk toward a prior; `a` is fixed at 1.0. Also writes per-topic solve-time median/MAD. The simulator's true `difficulty_b`
is used only by `--eval`, never by the fit.

    $PY -m pipeline.ml.irt_job --data pipeline/ml/data/sim_attempts.csv --out pipeline/ml/out/irt --seed 2026 --eval
    # -> calib.json {qid: [b, a, n]}, time_norms.json, irt_recovery.json/.png
    python -m pipeline.publish --version N --calib pipeline/ml/out/irt/calib.json   # optional: bank/v{N}/calib.json
    $PY -m pytest pipeline/ml/tests/test_irt.py -q

Model selection without true b: `--select-block-days 7,14,28,0` holds out a seeded 10% of rows, picks the `block_days` with the lowest
held-out log-loss (0 = one ability per sid,policy,topic), refits on all data and writes `selection`/`chosen` (plus a post-hoc,
true-b `sensitivity` block that is NOT used for the choice) into `irt_recovery.json`.
