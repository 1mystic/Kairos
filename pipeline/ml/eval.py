"""Feature ablation for logreg: drop each feature, refit (C re-tuned on val), report delta log-loss on student test."""
import argparse
import json
import os
from . import data as D
from . import metrics as M
from .features import FEATURES, build_features
from .train import fit_logreg, logreg_predict


def run_ablation(tr, va, te, seed, out):
    Xtr, Xva, Xte = build_features(tr), build_features(va), build_features(te)
    ytr, yva, yte = tr.correct.values, va.correct.values, te.correct.values
    w = fit_logreg(Xtr, ytr, Xva, yva, seed)
    base = M.log_loss(yte, logreg_predict(w, Xte))
    res = {"base_log_loss": base, "delta_log_loss": {}}
    for i, f in enumerate(FEATURES):
        keep = [j for j in range(len(FEATURES)) if j != i]
        w = fit_logreg(Xtr[:, keep], ytr, Xva[:, keep], yva, seed)
        ll = M.log_loss(yte, logreg_predict(w, Xte[:, keep]))
        res["delta_log_loss"][f] = ll - base  # positive = feature helps
    os.makedirs(out, exist_ok=True)
    with open(os.path.join(out, "ablation.json"), "w") as fh:
        json.dump(res, fh, indent=1)
    return res


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", required=True)
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--out", default="pipeline/ml/out")
    a = ap.parse_args()
    tr, va, te = D.split_by_student(D.load_csv(a.data), 0.2, 0.1, a.seed)
    print(json.dumps(run_ablation(tr, va, te, a.seed, a.out), indent=1))
