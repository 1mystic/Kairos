"""Phase F: calibrated score intervals for sim mocks by split conformal prediction.

python -m pipeline.ml.conformal --data pipeline/ml/data/sim_mocks.csv --seed 2027 --out docs/results/score_interval \
    --export core/src/gen/score_interval.json

Each row is one mock: model-predicted expected marks `pred_<m>` and Bernoulli sd `sd_<m>` from the pre-mock mastery doc,
and the realised score `actual`. Score z = (actual - pred) / sd. Calibration students (split by sid) give per-bucket
conformal quantiles of z (Mondrian on seen_frac: how much of the paper the student has practised). Interval =
pred + sd * [q_lo, q_hi]. Baseline: the model's own normal band pred +/- z_(1-a/2) * sd (point ability, luck only),
which is what a Monte Carlo band like gen/predict.ts amounts to.
"""
import argparse
import json
import os
from statistics import NormalDist

import numpy as np
import pandas as pd

from .data import sha256_file, split_sids

MODELS = ["elo", "learned"]
BUCKETS = [0.5, 0.9, 1.0]  # upper edges of seen_frac buckets (last inclusive)
DAYS_BINS = [0, 30, 60, 1000]


def bucket_of(seen):
    seen = np.asarray(seen, dtype=float)
    return np.searchsorted(np.array(BUCKETS[:-1]), seen, side="right")


def conformal_q(z, alpha):
    """Finite-sample split-conformal lower/upper quantiles of z (two-sided, alpha split equally)."""
    z = np.sort(np.asarray(z, dtype=float))
    n = len(z)
    k_lo = int(np.floor((n + 1) * (alpha / 2))) - 1
    k_hi = int(np.ceil((n + 1) * (1 - alpha / 2))) - 1
    lo = z[max(k_lo, 0)] if k_lo >= 0 else -np.inf
    hi = z[min(k_hi, n - 1)] if k_hi < n else np.inf
    return float(lo), float(hi)


def fit(cal, model, alpha):
    z = (cal.actual - cal[f"pred_{model}"]) / cal[f"sd_{model}"]
    b = bucket_of(cal.seen_frac)
    out = []
    for i, edge in enumerate(BUCKETS):
        zi = z[b == i]
        lo, hi = conformal_q(zi, alpha) if len(zi) >= 20 else conformal_q(z, alpha)
        out.append({"max_seen_frac": edge, "q_lo": round(lo, 6), "q_hi": round(hi, 6), "n": int(len(zi))})
    return out


def interval(df, model, buckets):
    b = bucket_of(df.seen_frac)
    qlo = np.array([buckets[i]["q_lo"] for i in b])
    qhi = np.array([buckets[i]["q_hi"] for i in b])
    m, s = df[f"pred_{model}"].values, df[f"sd_{model}"].values
    return m + s * qlo, m + s * qhi


def coverage_stats(df, lo, hi, seed, n_boot=1000):
    hit = ((df.actual.values >= lo) & (df.actual.values <= hi)).astype(float)
    width = hi - lo
    sids = df.sid.values
    uniq = np.unique(sids)
    idx = {s: np.where(sids == s)[0] for s in uniq}
    rng = np.random.default_rng(seed)
    reps = []
    for _ in range(n_boot):
        pick = rng.choice(uniq, size=len(uniq), replace=True)
        rows = np.concatenate([idx[s] for s in pick])
        reps.append(hit[rows].mean())
    by_bucket = {}
    for i, edge in enumerate(BUCKETS):
        mask = bucket_of(df.seen_frac) == i
        if mask.any():
            by_bucket[f"seen<={edge}"] = {"n": int(mask.sum()), "coverage": float(hit[mask].mean())}
    by_days = {}
    dl = df.days_left.values
    for a, b in zip(DAYS_BINS[:-1], DAYS_BINS[1:]):
        mask = (dl >= a) & (dl < b)
        if mask.any():
            by_days[f"days_left {a}-{b - 1}"] = {"n": int(mask.sum()), "coverage": float(hit[mask].mean())}
    return {
        "n": int(len(hit)),
        "coverage": float(hit.mean()),
        "coverage_ci95": [float(np.quantile(reps, 0.025)), float(np.quantile(reps, 0.975))],
        "mean_width": float(width.mean()),
        "by_seen_frac": by_bucket,
        "by_days_left": by_days,
    }


def run(path, seed, alpha=0.2, cal_frac=0.5):
    df = pd.read_csv(path)
    tr, _, te = split_sids(df.sid.unique(), test_frac=1 - cal_frac, val_frac=0.0, seed=seed)
    cal, test = df[df.sid.isin(tr)].reset_index(drop=True), df[df.sid.isin(te)].reset_index(drop=True)
    zq = NormalDist().inv_cdf(1 - alpha / 2)
    res = {"meta": {"seed": seed, "alpha": alpha, "csv_sha256": sha256_file(path), "rows": int(len(df)),
                    "rows_cal": int(len(cal)), "rows_test": int(len(test)), "students": int(df.sid.nunique()),
                    "buckets_seen_frac": BUCKETS},
           "conformal": {}, "naive_normal": {}, "point_error": {}}
    tables = {}
    for m in MODELS:
        tables[m] = fit(cal, m, alpha)
        lo, hi = interval(test, m, tables[m])
        res["conformal"][m] = coverage_stats(test, lo, hi, seed)
        mu, sd = test[f"pred_{m}"].values, test[f"sd_{m}"].values
        res["naive_normal"][m] = coverage_stats(test, mu - zq * sd, mu + zq * sd, seed)
        err = test.actual.values - mu
        res["point_error"][m] = {"mae": float(np.abs(err).mean()), "bias": float(err.mean()), "rmse": float(np.sqrt((err ** 2).mean()))}
    err = test.actual.values - test.pred_true.values
    res["point_error"]["oracle_true_p"] = {"mae": float(np.abs(err).mean()), "bias": float(err.mean()), "rmse": float(np.sqrt((err ** 2).mean()))}
    res["tables"] = tables
    return res


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--seed", type=int, default=2027)
    ap.add_argument("--alpha", type=float, default=0.2)
    ap.add_argument("--out", default="pipeline/ml/out/score_interval")
    ap.add_argument("--export", default=None, help="write the client table (core/src/gen/score_interval.json)")
    a = ap.parse_args(argv)
    res = run(a.data, a.seed, a.alpha)
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, "metrics.json"), "w") as f:
        json.dump(res, f, indent=1)
    if a.export:
        exp = {"version": 1, "method": "split conformal, Mondrian on seen_frac, z = (actual - pred) / sd",
               "level": round(1 - a.alpha, 6), "seed": a.seed, "csv_sha256": res["meta"]["csv_sha256"],
               "models": res["tables"],
               "test_coverage": {m: round(res["conformal"][m]["coverage"], 4) for m in MODELS}}
        with open(a.export, "w") as f:
            json.dump(exp, f, indent=1)
            f.write("\n")
    for m in MODELS:
        c, n = res["conformal"][m], res["naive_normal"][m]
        print(f"{m}: conformal cov {c['coverage']:.3f} {c['coverage_ci95']} width {c['mean_width']:.1f} | naive cov {n['coverage']:.3f} width {n['mean_width']:.1f} | point {res['point_error'][m]}")
    print("oracle point", res["point_error"]["oracle_true_p"])


if __name__ == "__main__":
    main()
