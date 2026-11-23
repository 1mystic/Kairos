import json
import math
import numpy as np
import pytest
from sklearn.metrics import roc_auc_score, log_loss as sk_ll

from pipeline.ml import data as D, metrics as M, export_weights as X
from pipeline.ml.features import FEATURES, build_features


@pytest.fixture(scope="module")
def toy(tmp_path_factory):
    p = tmp_path_factory.mktemp("d") / "toy.csv"
    D.make_toy_csv(p, 40, seed=1)
    return p, D.load_csv(p)


def test_metrics_known():
    y = np.array([0, 0, 1, 1])
    p = np.array([0.1, 0.4, 0.35, 0.8])
    assert M.auc(y, p) == pytest.approx(roc_auc_score(y, p))
    assert M.log_loss(y, p) == pytest.approx(sk_ll(y, p))
    assert M.brier(y, p) == pytest.approx(np.mean((p - y) ** 2))
    assert M.ece([1, 0], [1.0, 0.0]) == 0.0  # p=1 handled in last bin
    assert M.ece([1, 1, 0, 0], [0.0, 0.0, 1.0, 1.0]) == pytest.approx(1.0)


def test_ece_calibrated_small():
    rng = np.random.default_rng(0)
    p = rng.random(200000)
    y = (rng.random(200000) < p).astype(int)
    assert M.ece(y, p) < 0.01
    conf, acc, cnt = M.reliability_curve(y, p, 15)
    assert len(conf) == len(acc) == len(cnt) == 15 and cnt.sum() == 200000


def test_bootstrap_ci():
    rng = np.random.default_rng(0)
    sids = np.repeat(np.arange(50), 20)
    p = rng.random(1000)
    y = (rng.random(1000) < p).astype(int)
    r = M.bootstrap_logloss_diff(y, p, np.full(1000, 0.5), sids, n_boot=200, seed=1)
    assert r["lo"] < r["diff"] < r["hi"] and r["hi"] < 0  # informative model beats constant
    assert r == M.bootstrap_logloss_diff(y, p, np.full(1000, 0.5), sids, n_boot=200, seed=1)


def test_splits(toy):
    _, df = toy
    tr, va, te = D.split_by_student(df, seed=3)
    s = [set(x.sid) for x in (tr, va, te)]
    assert not (s[0] & s[1]) and not (s[0] & s[2]) and not (s[1] & s[2])
    assert len(tr) + len(va) + len(te) == len(df) and len(te) > 0
    tr2, _, te2 = D.split_by_student(df, seed=3)
    assert set(te2.sid) == s[2]
    a, b = D.temporal_split(df, 30)
    assert a.day_idx.max() < 30 <= b.day_idx.min()
    a, b = D.temporal_split(df, 30, (s[0], s[2]))
    assert set(a.sid) <= s[0] and set(b.sid) <= s[2]


def test_features_shape_order(toy):
    _, df = toy
    X_ = build_features(df)
    assert X_.shape == (len(df), len(FEATURES)) and np.isfinite(X_).all()
    i = FEATURES.index("x_elo")
    assert X_[0, i] == pytest.approx(df.elo_theta[0] - df.difficulty_b[0])
    assert FEATURES.index("unseen") == 6
    j = FEATURES.index("log_days")
    assert (X_[df.days_since_last_topic.values == -1, j] == 0).all()


def test_end_to_end(toy, tmp_path):
    p, df = toy
    from pipeline.ml import train
    out = tmp_path / "out"
    train.main(["--data", str(p), "--seed", "5", "--out", str(out)])
    for f in ("metrics.json", "reliability.png", "reliability.json", "ablation.json", "logreg.pkl", "lgbm.txt"):
        assert (out / f).exists(), f
    m = json.loads((out / "metrics.json").read_text())
    assert m["meta"]["winner"] in ("logreg", "lgbm") and len(m["meta"]["csv_sha256"]) == 64
    assert m["student_split"]["logreg"]["log_loss"] < m["student_split"]["elo"]["log_loss"]
    for kind, src in (("logreg", "logreg.pkl"), ("gbdt", "lgbm.txt")):
        dst = tmp_path / f"{kind}.json"
        X.main(["--model", str(out / src), "--out", str(dst), "--sim-command", "toy"])
        w = json.loads(dst.read_text())
        assert w["model"] == kind and len(w["golden"]) == 8 and w["features"] == FEATURES
        fn = X.predict_logreg_json if kind == "logreg" else X.predict_gbdt_json
        for g in w["golden"]:  # pure python, no sklearn, from the JSON alone
            assert abs(fn(w, g["input"]) - g["p"]) < 1e-12
    # JSON features match vectorised builder
    row = df.iloc[10]
    raw = {k: row[k].item() for k in X.GOLDEN_INPUTS[0]}
    assert np.allclose(X.py_features(raw), build_features(df.iloc[[10]])[0])
