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
