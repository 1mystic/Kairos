"""Export logreg (pickle) or lightgbm (txt) to static JSON for the TS scorer.

logreg: x_std=(x-mean)/scale ; p = 1/(1+exp(-(intercept + sum coef_i*x_std_i)))
gbdt:   p = 1/(1+exp(-sum_trees leaf)) ; node: go left iff x[feature] <= threshold.
Golden inputs are raw columns; features computed per features.py; p computed from ROUNDED (8 sig. digit) weights.
"""
import argparse
import json
import math
import os
import pickle

from .features import FEATURES

GOLDEN_INPUTS = [
    dict(elo_theta=0.0, elo_rd=1.0, elo_n=0, fsrs_r=1.0, fsrs_s=0.0, fsrs_d=0.0, err_rate=0.0, k_in_session=0, days_since_last_topic=-1, difficulty_b=0.0),
    dict(elo_theta=0.0, elo_rd=1.0, elo_n=0, fsrs_r=1.0, fsrs_s=0.0, fsrs_d=0.0, err_rate=0.0, k_in_session=2, days_since_last_topic=-1, difficulty_b=1.5),
    dict(elo_theta=0.8, elo_rd=0.4, elo_n=25, fsrs_r=0.9, fsrs_s=12.0, fsrs_d=5.5, err_rate=0.2, k_in_session=0, days_since_last_topic=3, difficulty_b=0.2),
    dict(elo_theta=-0.5, elo_rd=0.6, elo_n=8, fsrs_r=0.55, fsrs_s=4.0, fsrs_d=7.0, err_rate=0.5, k_in_session=1, days_since_last_topic=14, difficulty_b=-0.3),
    dict(elo_theta=1.5, elo_rd=0.15, elo_n=120, fsrs_r=0.98, fsrs_s=90.0, fsrs_d=3.0, err_rate=0.05, k_in_session=4, days_since_last_topic=1, difficulty_b=-1.5),
    dict(elo_theta=-2.0, elo_rd=0.9, elo_n=3, fsrs_r=0.2, fsrs_s=1.0, fsrs_d=9.5, err_rate=0.8, k_in_session=0, days_since_last_topic=60, difficulty_b=2.5),
    dict(elo_theta=2.5, elo_rd=0.15, elo_n=300, fsrs_r=0.0001, fsrs_s=365.0, fsrs_d=1.0, err_rate=0.0, k_in_session=10, days_since_last_topic=0, difficulty_b=-3.0),
    dict(elo_theta=0.1, elo_rd=0.3, elo_n=1, fsrs_r=0.75, fsrs_s=2.5, fsrs_d=6.0, err_rate=1.0, k_in_session=3, days_since_last_topic=7, difficulty_b=0.0),
]


def r8(x):
    return float(f"{x:.8g}")


def py_features(d):
    """Pure-python twin of features.build_features for one raw input dict."""
    x = d["elo_theta"] - d["difficulty_b"]
    c = {"x_elo": x, "rd": d["elo_rd"], "log_n": math.log1p(d["elo_n"]), "r": d["fsrs_r"], "one_minus_r": 1 - d["fsrs_r"],
         "log_days": math.log1p(max(d["days_since_last_topic"], 0)), "unseen": 0.0 if d["elo_n"] > 0 else 1.0,
         "err": d["err_rate"], "b": d["difficulty_b"], "log_k": math.log1p(d["k_in_session"]),
         "x_elo_r": x * d["fsrs_r"], "x_elo_rd": x * d["elo_rd"], "log_s": math.log1p(d["fsrs_s"])}
    return [c[f] for f in FEATURES]


def _sig(z):
    return 1 / (1 + math.exp(-z))


def predict_logreg_json(w, raw):
    x = py_features(raw)
    z = w["intercept"] + sum(c * (v - m) / s for c, v, m, s in zip(w["coef"], x, w["mean"], w["scale"]))
    return _sig(z)


def _tree_pred(node, x):
    while "leaf_value" not in node:
        node = node["left"] if x[node["split_feature"]] <= node["threshold"] else node["right"]
    return node["leaf_value"]


def predict_gbdt_json(w, raw):
    x = py_features(raw)
    return _sig(sum(_tree_pred(t, x) for t in w["trees"]))


def _student_metrics(metrics_path):
    if not metrics_path or not os.path.exists(metrics_path):
        return {}
    with open(metrics_path) as f:
        m = json.load(f).get("student_split", {})
    return {k: m[k] for k in ("logreg", "lgbm", "elo") if k in m}


def export_logreg(pkl, sim_command, metrics_path):
    with open(pkl, "rb") as f:
        m = pickle.load(f)
    assert m["features"] == FEATURES, "feature list mismatch"
    w = {"version": 1, "model": "logreg", "features": FEATURES, "mean": [r8(v) for v in m["mean"]],
         "scale": [r8(v) for v in m["scale"]], "coef": [r8(v) for v in m["coef"]], "intercept": r8(m["intercept"]),
         "seed": m["seed"], "trained_on": {"rows": m["rows"], "csv_sha256": m["csv_sha256"], "sim_command": sim_command},
         "metrics": {k: v for k, v in _student_metrics(metrics_path).items() if k in ("logreg", "elo")}}
    w["golden"] = [{"input": d, "p": predict_logreg_json(w, d)} for d in GOLDEN_INPUTS]
    return w


def export_gbdt(txt, sim_command, metrics_path):
    import lightgbm as lgb
    b = lgb.Booster(model_file=txt)
    assert b.feature_name() == FEATURES, "feature list mismatch"

    def conv(n):
        if "leaf_value" in n:
            return {"leaf_value": r8(n["leaf_value"])}
        assert n["decision_type"] == "<="
        return {"split_feature": n["split_feature"], "threshold": r8(n["threshold"]),
                "left": conv(n["left_child"]), "right": conv(n["right_child"])}
    dump = b.dump_model()
    w = {"version": 1, "model": "gbdt", "features": FEATURES, "decision_rule": "x[split_feature] <= threshold goes left",
         "trees": [conv(t["tree_structure"]) for t in dump["tree_info"]],
         "trained_on": {"rows": None, "csv_sha256": None, "sim_command": sim_command},
         "metrics": {k: v for k, v in _student_metrics(metrics_path).items() if k in ("lgbm", "elo")}}
    side = os.path.join(os.path.dirname(txt), "metrics.json")
    if os.path.exists(side):
        with open(side) as f:
            meta = json.load(f)["meta"]
        w["seed"] = meta["seed"]
        w["trained_on"].update(rows=meta["rows"], csv_sha256=meta["csv_sha256"])
    w["golden"] = [{"input": d, "p": predict_gbdt_json(w, d)} for d in GOLDEN_INPUTS]
    return w


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--sim-command", default="")
    ap.add_argument("--metrics", default=None, help="default: metrics.json next to --model")
    a = ap.parse_args(argv)
    mp = a.metrics or os.path.join(os.path.dirname(a.model), "metrics.json")
    w = export_gbdt(a.model, a.sim_command, mp) if a.model.endswith(".txt") else export_logreg(a.model, a.sim_command, mp)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)
    with open(a.out, "w") as f:
        json.dump(w, f, indent=1)
    print("wrote", a.out, w["model"])


if __name__ == "__main__":
    main()
