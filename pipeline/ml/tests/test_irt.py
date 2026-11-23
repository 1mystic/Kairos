import json
import numpy as np
import pandas as pd
import pytest
from scipy.stats import spearmanr

from pipeline.ml import irt_job as J


def synth(n_items=300, n_groups=400, per_item=80, seed=0):
    rng = np.random.default_rng(seed)
    b = rng.normal(0, 1, n_items)
    theta = rng.normal(0, 1, n_groups)
    q = np.repeat(np.arange(n_items), per_item)
    g = rng.integers(0, n_groups, len(q))
    y = (rng.random(len(q)) < J.sigmoid(theta[g] - b[q])).astype(int)
    return b, g, q, y, n_groups, n_items


def test_recovery():
    b, g, q, y, G, I = synth()
    _, bh, info = J.fit_rasch(g, q, y, G, I)
    assert spearmanr(bh, b).statistic > 0.95
    assert info["iterations"] <= 50 and info["converged"]


def test_shrinkage():
    b, g, q, y, G, I = synth(n_items=50, n_groups=100, per_item=60, seed=1)
    # extra item with 2 attempts, both wrong in a high-ability group: MLE would be extreme
    g2 = np.concatenate([g, [0, 0]])
    q2 = np.concatenate([q, [I, I]])
    y2 = np.concatenate([y, [0, 0]])
    _, bh, _ = J.fit_rasch(g2, q2, y2, G, I + 1, prior_b=0.0, prior_sd=1.0)
    assert abs(bh[I]) < 1.0
    _, bh2, _ = J.fit_rasch(g2, q2, y2, G, I + 1, prior_b=0.5, prior_sd=0.1)
    assert abs(bh2[I] - 0.5) < 0.1


def test_time_norms():
    df = pd.DataFrame({"topic": ["a"] * 5 + ["b"] * 2, "time_ms": [1, 2, 3, 4, 100, 10, 20]})
    t = J.time_norms(df)
    assert t["version"] == 1
    assert t["topics"]["a"] == [3.0, 1.0, 5]  # median 3, |dev| = 2,1,0,1,97 -> MAD 1 (raw)
    assert t["topics"]["b"] == [15.0, 5.0, 2]


def test_calib_schema_and_pipeline(tmp_path):
    rng = np.random.default_rng(3)
    n = 3000
    df = pd.DataFrame({"sid": rng.integers(0, 30, n), "policy": "random", "day_idx": rng.integers(0, 30, n),
                       "topic": "t", "qid": ["q%d" % i for i in rng.integers(0, 20, n)],
                       "correct": rng.integers(0, 2, n), "time_ms": rng.integers(1000, 9000, n),
                       "difficulty_b": 0.0})
    df["difficulty_b"] = df["qid"].str[1:].astype(float) / 10
    csv = tmp_path / "a.csv"
    df.to_csv(csv, index=False)
    out = tmp_path / "o"
    assert J.main(["--data", str(csv), "--out", str(out), "--eval"]) == 0
    c = json.loads((out / "calib.json").read_text())
    assert {"version", "model", "fit", "items"} <= set(c) and c["model"] == "1pl"
    assert {"seed", "iterations", "priors", "rows", "csv_sha256"} <= set(c["fit"])
    qid, (b, a, nn) = next(iter(c["items"].items()))
    assert a == 1.0 and nn > 0 and b == round(b, 4)
    assert (out / "time_norms.json").exists() and (out / "irt_recovery.json").exists()


def test_select_block_days():
    rng = np.random.default_rng(5)
    n = 6000
    df = pd.DataFrame({"sid": rng.integers(0, 40, n), "policy": "p", "day_idx": rng.integers(0, 56, n),
                       "topic": "t", "qid": ["q%d" % i for i in rng.integers(0, 30, n)],
                       "correct": rng.integers(0, 2, n)})
    rows, chosen = J.heldout_select(df, [7, 28, 0], 0.0, 1.0, seed=1)
    assert [r["block_days"] for r in rows] == [7, 28, 0]
    assert chosen in (7, 28, 0)
    assert all(0 < r["coverage"] <= 1 and r["heldout_logloss"] > 0 for r in rows)
    assert chosen == min(rows, key=lambda r: r["heldout_logloss"])["block_days"]
