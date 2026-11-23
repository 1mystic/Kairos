"""python -m pipeline.ml.train --data ... --seed 2026 --out pipeline/ml/out"""
import argparse
import json
import os
import pickle
import platform
import numpy as np
import sklearn
import lightgbm as lgb
import pandas as pd
from sklearn.linear_model import LogisticRegression

from . import data as D
from . import metrics as M
from .features import FEATURES, build_features

C_GRID = [0.001, 0.01, 0.1, 1.0, 10.0]
NAMES = ["elo", "fsrs_raw", "fsrs_cal", "logreg", "lgbm"]


def sigmoid(z):
    return 1 / (1 + np.exp(-z))


def fit_logreg(Xtr, ytr, Xva, yva, seed):
    mean, scale = Xtr.mean(0), Xtr.std(0)
    scale = np.where(scale < 1e-12, 1.0, scale)
    best = None
    for C in C_GRID:
        m = LogisticRegression(C=C, max_iter=2000, random_state=seed).fit((Xtr - mean) / scale, ytr)
        ll = M.log_loss(yva, m.predict_proba((Xva - mean) / scale)[:, 1])
        if best is None or ll < best[0]:
            best = (ll, C, m)
    _, C, m = best
    return {"mean": mean, "scale": scale, "coef": m.coef_[0].copy(), "intercept": float(m.intercept_[0]), "C": C}


def logreg_predict(w, X):
    return sigmoid(((X - w["mean"]) / w["scale"]) @ w["coef"] + w["intercept"])


def fit_lgbm(Xtr, ytr, Xva, yva, seed):
    params = dict(objective="binary", num_leaves=15, learning_rate=0.05, min_data_in_leaf=50, feature_fraction=0.9,
                  bagging_fraction=0.8, bagging_freq=1, lambda_l2=1.0, seed=seed, deterministic=True,
                  force_row_wise=True, num_threads=4, verbose=-1)
    return lgb.train(params, lgb.Dataset(Xtr, ytr, feature_name=FEATURES), num_boost_round=1000,
                     valid_sets=[lgb.Dataset(Xva, yva)], callbacks=[lgb.early_stopping(50, verbose=False)])


def fit_all(tr, va, seed):
    Xtr, Xva = build_features(tr), build_features(va)
    ytr, yva = tr.correct.values, va.correct.values
    # fsrs calibration: 1-feature logistic on logit(clipped r)
    lg = lambda d: np.log(np.clip(d.fsrs_r.values, 1e-4, 1 - 1e-4) / (1 - np.clip(d.fsrs_r.values, 1e-4, 1 - 1e-4)))[:, None]
    cal = LogisticRegression(C=1e6, max_iter=1000).fit(lg(tr), ytr)
    lr = fit_logreg(Xtr, ytr, Xva, yva, seed)
    gb = fit_lgbm(Xtr, ytr, Xva, yva, seed)
    models = {"lr": lr, "gb": gb, "cal": cal}

    def predict(df):
        X = build_features(df)
        return {
            "elo": sigmoid(df.elo_theta.values - df.difficulty_b.values),
            "fsrs_raw": np.clip(df.fsrs_r.values, 1e-4, 1 - 1e-4),
            "fsrs_cal": cal.predict_proba(lg(df))[:, 1],
            "logreg": logreg_predict(lr, X),
            "lgbm": gb.predict(X, num_iteration=gb.best_iteration),
        }
    return models, predict


def evaluate(df, preds, seed):
    y = df.correct.values
    out = {n: M.all_metrics(y, preds[n]) for n in NAMES}
    for n in NAMES:
        if n != "elo":
            out[n]["logloss_diff_vs_elo"] = M.bootstrap_logloss_diff(y, preds[n], preds["elo"], df.sid.values, seed=seed)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--out", default="pipeline/ml/out")
    ap.add_argument("--cutoff-day", type=int, default=None, help="default: 70%% of max day_idx")
    ap.add_argument("--no-ablation", action="store_true")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    np.random.seed(a.seed)
    df = D.load_csv(a.data)
    sha = D.sha256_file(a.data)
    tr, va, te = D.split_by_student(df, 0.2, 0.1, a.seed)
    trs, vas, tes = (set(x.sid.unique()) for x in (tr, va, te))

    models, predict = fit_all(tr, va, a.seed)
    res = {"student_split": evaluate(te, predict(te), a.seed)}

    cutoff = a.cutoff_day if a.cutoff_day is not None else int(0.7 * df.day_idx.max())
    ttr, tte = D.temporal_split(df, cutoff, (trs, tes))
    tva = va[va.day_idx < cutoff].reset_index(drop=True)
    tmodels, tpredict = fit_all(ttr, tva, a.seed)
    res["temporal_split"] = evaluate(tte, tpredict(tte), a.seed)

    cand = {k: res["student_split"][k]["log_loss"] for k in ("logreg", "lgbm")}
    winner = min(cand, key=cand.get)

    # artifacts
    lr = models["lr"]
    with open(os.path.join(a.out, "logreg.pkl"), "wb") as f:
        pickle.dump({"features": FEATURES, "mean": lr["mean"].tolist(), "scale": lr["scale"].tolist(),
                     "coef": lr["coef"].tolist(), "intercept": lr["intercept"], "C": lr["C"], "seed": a.seed,
                     "rows": int(len(df)), "csv_sha256": sha}, f)
    models["gb"].save_model(os.path.join(a.out, "lgbm.txt"), num_iteration=models["gb"].best_iteration)

    # reliability
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    pt = predict(te)
    rel = {}
    fig, ax = plt.subplots(figsize=(5, 5))
    ax.plot([0, 1], [0, 1], "k--", lw=1)
    for n in ("elo", "fsrs_cal", "logreg", "lgbm"):
        conf, acc, cnt = M.reliability_curve(te.correct.values, pt[n], 15)
        rel[n] = {"conf": [None if np.isnan(v) else float(v) for v in conf],
                  "acc": [None if np.isnan(v) else float(v) for v in acc], "count": cnt.tolist()}
        ax.plot(conf, acc, marker="o", ms=3, label=n)
    ax.set_xlabel("predicted P(correct)")
    ax.set_ylabel("observed accuracy")
    ax.set_title("Reliability (student-level test split)")
    ax.legend()
    fig.tight_layout()
    fig.savefig(os.path.join(a.out, "reliability.png"), dpi=130)
    plt.close(fig)
    with open(os.path.join(a.out, "reliability.json"), "w") as f:
        json.dump(rel, f, indent=1)

    meta = {"seed": a.seed, "csv_sha256": sha, "rows": int(len(df)), "n_students": int(df.sid.nunique()),
            "rows_train": int(len(tr)), "rows_val": int(len(va)), "rows_test": int(len(te)),
            "temporal_cutoff_day": cutoff, "rows_temporal_train": int(len(ttr)), "rows_temporal_test": int(len(tte)),
            "logreg_C": lr["C"], "lgbm_best_iteration": int(models["gb"].best_iteration),
            "versions": {"python": platform.python_version(), "numpy": np.__version__, "pandas": pd.__version__,
                         "sklearn": sklearn.__version__, "lightgbm": lgb.__version__},
            "features": FEATURES, "winner": winner}
    with open(os.path.join(a.out, "metrics.json"), "w") as f:
        json.dump({"meta": meta, **res}, f, indent=1)
    if not a.no_ablation:
        from .eval import run_ablation
        run_ablation(tr, va, te, a.seed, a.out)
    print(json.dumps({s: {m: {k: round(v, 4) for k, v in d.items() if isinstance(v, float)} for m, d in r.items()}
                      for s, r in res.items()}, indent=1))
    print("winner:", winner)
    return res


if __name__ == "__main__":
    main()
