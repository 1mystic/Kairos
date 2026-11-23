"""IRT calibration job (Phase D): 1PL (Rasch) item difficulty from pooled attempts, with shrinkage.

    python -m pipeline.ml.irt_job --data CSV --out DIR --seed 2026 [--prior-b 0.0 --prior-sd 1.0 --min-n 20 --block-days 7 --eval]

Model: P(correct) = sigmoid(theta_g - b_q), g = (sid, policy, topic, day_idx // block_days) is an ability "group"
(abilities drift over time, so each week/topic cell gets its own theta). Priors: theta_g ~ N(0, 1.5^2), b_q ~ N(prior_b, prior_sd^2).
Fit = penalised joint maximum likelihood (MAP), alternating vectorised Newton steps (steps clipped to +-1).

Identifiability: a Rasch model is only identified up to a common shift of theta and b. The N(0,1.5^2) prior on theta (and the
N(prior_b, .) prior on b) pins the location; the scale is fixed by the 1PL (a = 1). Joint ML also has a known finite-sample
bias (JMLE inflates |b|, ~ n/(n-1)); the priors shrink in the opposite direction. Items with few attempts are pulled toward
prior_b; consumers should look at n. The simulator's true difficulty column (difficulty_b) is NEVER used by the fit, only by --eval.

Outputs: DIR/calib.json {"version":1,"model":"1pl","fit":{...},"items":{qid:[b,a,n]}} (a = 1.0, 1PL),
         DIR/time_norms.json {"version":1,"topics":{topic:[median_ms, mad_ms, n]}} (raw, unscaled MAD),
         with --eval: DIR/irt_recovery.json and DIR/irt_recovery.png.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import time
from pathlib import Path

import numpy as np
import pandas as pd

THETA_SD = 1.5
N_TARGETS = (10, 20, 50, 100, 200)
BUCKETS = (("n<20", 0, 19), ("20-49", 20, 49), ("50-99", 50, 99), (">=100", 100, 10**12))


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def fit_rasch(g, q, y, n_groups, n_items, prior_b=0.0, prior_sd=1.0, theta_sd=THETA_SD,
              max_iter=300, tol=1e-4, clip=1.0):
    """g, q: int index arrays; y: 0/1. Returns (theta, b, info). Alternating Newton on the penalised log-likelihood."""
    y = y.astype(np.float64)
    theta = np.zeros(n_groups)
    b = np.full(n_items, float(prior_b))
    pt, pb = 1.0 / theta_sd**2, 1.0 / prior_sd**2
    max_delta, it = np.inf, 0
    for it in range(1, max_iter + 1):
        p = sigmoid(theta[g] - b[q])
        grad = np.bincount(g, y - p, n_groups) - pt * theta
        hess = np.bincount(g, p * (1 - p), n_groups) + pt
        dt = np.clip(grad / hess, -clip, clip)
        theta += dt
        p = sigmoid(theta[g] - b[q])
        # d/db of loglik = -(y - p); penalty -pb*(b - prior_b)
        grad = -np.bincount(q, y - p, n_items) - pb * (b - prior_b)
        hess = np.bincount(q, p * (1 - p), n_items) + pb
        db = np.clip(grad / hess, -clip, clip)
        b += db
        max_delta = max(float(np.abs(dt).max()), float(np.abs(db).max()))
        if max_delta < tol:
            break
    return theta, b, {"iterations": it, "max_abs_delta": max_delta, "converged": bool(max_delta < tol)}


def load(csv, usecols=("sid", "policy", "day_idx", "topic", "qid", "correct", "time_ms", "difficulty_b")):
    dt = {"sid": "int32", "policy": "category", "day_idx": "int32", "topic": "category", "qid": "category",
          "correct": "int8", "time_ms": "float32", "difficulty_b": "float32"}
    cols = list(usecols)
    return pd.read_csv(csv, usecols=cols, dtype={c: dt[c] for c in cols})


def index_arrays(df, block_days):
    """Group codes (sid, policy, topic, week block) and item codes. Does not touch difficulty_b."""
    blk = (df["day_idx"].to_numpy() // block_days).astype(np.int64) if block_days > 0 else np.zeros(len(df), np.int64)
    key = pd.MultiIndex.from_arrays([df["sid"].to_numpy(), df["policy"].astype(str).to_numpy(),
                                     df["topic"].astype(str).to_numpy(), blk])
    g, _ = pd.factorize(key)
    q_codes, q_names = pd.factorize(df["qid"].astype(str))
    return g.astype(np.int64), q_codes.astype(np.int64), list(q_names)


def calibrate(df, prior_b=0.0, prior_sd=1.0, block_days=7, **kw):
    g, q, names = index_arrays(df, block_days)
    y = df["correct"].to_numpy()
    theta, b, info = fit_rasch(g, q, y, int(g.max()) + 1, len(names), prior_b, prior_sd, **kw)
    n = np.bincount(q, minlength=len(names))
    info["n_groups"] = int(g.max()) + 1
    return names, b, n, info


def time_norms(df):
    out = {}
    for t, s in df.groupby(df["topic"].astype(str))["time_ms"]:
        v = s.to_numpy(dtype=np.float64)
        v = v[np.isfinite(v)]
        if not len(v):
            continue
        med = float(np.median(v))
        out[t] = [round(med, 1), round(float(np.median(np.abs(v - med))), 1), int(len(v))]
    return {"version": 1, "topics": out}


def make_calib(names, b, n, fit):
    return {"version": 1, "model": "1pl",
            "fit": {**fit, "note": "1PL: discrimination a fixed at 1.0; n = attempts used; b shrunk toward prior_b for small n"},
            "items": {k: [round(float(bb), 4), 1.0, int(nn)] for k, bb, nn in zip(names, b, n)}}


def sha256_file(p, chunk=1 << 22):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        while c := f.read(chunk):
            h.update(c)
    return h.hexdigest()


def _metrics(bh, bt):
    from scipy.stats import spearmanr  # sklearn dependency, always present
    if len(bh) < 3:
        return {"items": int(len(bh)), "spearman": None, "rmse": None}
    rho = float(spearmanr(bh, bt).statistic)
    rmse = float(np.sqrt(np.mean(((bh - bh.mean()) - (bt - bt.mean())) ** 2)))
    return {"items": int(len(bh)), "spearman": round(rho, 4), "rmse": round(rmse, 4)}


def recovery(df, b_hat, n, names, prior_b, prior_sd, block_days, seed, n_targets=N_TARGETS):
    """Compare with simulator truth (difficulty_b). Truth is used here only."""
    truth = df.groupby(df["qid"].astype(str))["difficulty_b"].first()
    bt = truth.reindex(names).to_numpy(dtype=np.float64)
    out = {"overall": _metrics(b_hat, bt), "by_n_bucket": {}}
    for label, lo, hi in BUCKETS:
        m = (n >= lo) & (n <= hi)
        out["by_n_bucket"][label] = _metrics(b_hat[m], bt[m])
    out["by_n_target"] = n_target_curve(df, truth, prior_b, prior_sd, block_days, seed, n_targets)
    return out


def n_target_curve(df, truth, prior_b, prior_sd, block_days, seed, n_targets=N_TARGETS):
    res = {}
    # controlled curve: cap attempts per item at n_target (seeded), refit, evaluate items that reached n_target
    rng = np.random.default_rng(seed)
    qcodes = pd.factorize(df["qid"].astype(str))[0]
    order = rng.permutation(len(df))  # random order; rank within item via stable sort on item code
    srt = order[np.argsort(qcodes[order], kind="stable")]
    starts = np.concatenate([[0], np.cumsum(np.bincount(qcodes))[:-1]])
    rank = np.empty(len(df), dtype=np.int64)
    rank[srt] = np.arange(len(df)) - np.repeat(starts, np.bincount(qcodes))
    for nt in n_targets:
        sub = df[rank < nt]
        nm, b2, n2, info = calibrate(sub, prior_b, prior_sd, block_days)
        keep = n2 >= nt
        bt2 = truth.reindex(nm).to_numpy(dtype=np.float64)
        r = _metrics(b2[keep], bt2[keep])
        r["iterations"] = info["iterations"]
        res[str(nt)] = r
    return res


def heldout_select(df, candidates, prior_b, prior_sd, seed, frac=0.1):
    """Pick block_days by held-out log-loss on a seeded random row split. Never touches difficulty_b."""
    rng = np.random.default_rng(seed)
    test = rng.random(len(df)) < frac
    y = df["correct"].to_numpy()
    rows = []
    for bd in candidates:
        g, q, names = index_arrays(df, bd)
        G, I = int(g.max()) + 1, len(names)
        tr = ~test
        theta, b, _ = fit_rasch(g[tr], q[tr], y[tr], G, I, prior_b, prior_sd)
        seen = (np.bincount(g[tr], minlength=G)[g[test]] > 0) & (np.bincount(q[tr], minlength=I)[q[test]] > 0)
        gt, qt, yt = g[test][seen], q[test][seen], y[test][seen]
        p = np.clip(sigmoid(theta[gt] - b[qt]), 1e-6, 1 - 1e-6)
        ll = float(-np.mean(yt * np.log(p) + (1 - yt) * np.log(1 - p)))
        rows.append({"block_days": int(bd), "heldout_logloss": round(ll, 5), "coverage": round(float(seen.mean()), 4)})
    chosen = min(rows, key=lambda r: r["heldout_logloss"])["block_days"]
    return rows, chosen


def plot_recovery(rec, path):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    pts = [(int(k), v["spearman"]) for k, v in rec["by_n_target"].items() if v["spearman"] is not None and np.isfinite(v["spearman"])]
    pts.sort()
    if not pts:
        return
    fig, ax = plt.subplots(figsize=(5, 3.5))
    ax.plot([p[0] for p in pts], [p[1] for p in pts], marker="o", color="#2b5fa5")
    ax.axhline(0.9, linestyle="--", color="gray", linewidth=1)
    ax.set_xscale("log")
    ax.set_xticks([p[0] for p in pts])
    ax.set_xticklabels([str(p[0]) for p in pts])
    ax.set_xlabel("attempts per item (n)")
    ax.set_ylabel("Spearman ρ (b̂ vs true b)")
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main(argv=None):
    ap = argparse.ArgumentParser(prog="pipeline.ml.irt_job", description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--prior-b", type=float, default=0.0)
    ap.add_argument("--prior-sd", type=float, default=1.0)
    ap.add_argument("--min-n", type=int, default=20, help="recorded in calib.json fit; consumers decide via n")
    ap.add_argument("--block-days", type=int, default=7)
    ap.add_argument("--select-block-days", type=str, default=None,
                    help="comma list, e.g. 7,14,28,0 (0 = one ability per sid,policy,topic); choose by held-out log-loss, overrides --block-days")
    ap.add_argument("--eval", action="store_true", help="recovery study vs simulator truth (needs difficulty_b)")
    a = ap.parse_args(argv)
    t0 = time.time()
    a.out.mkdir(parents=True, exist_ok=True)
    df = load(a.data, usecols=("sid", "policy", "day_idx", "topic", "qid", "correct", "time_ms")
              + (("difficulty_b",) if a.eval else ()))
    selection = chosen = None
    if a.select_block_days:
        cands = [int(x) for x in a.select_block_days.split(",")]
        selection, chosen = heldout_select(df, cands, a.prior_b, a.prior_sd, a.seed)
        a.block_days = chosen
        for r in selection:
            print("select", r)
        print("chosen block_days =", chosen)
    names, b, n, info = calibrate(df, a.prior_b, a.prior_sd, a.block_days)
    fit = {"seed": a.seed, "iterations": info["iterations"], "converged": info["converged"],
           "max_abs_delta": info["max_abs_delta"], "n_groups": info["n_groups"],
           "priors": {"theta_sd": THETA_SD, "b_mean": a.prior_b, "b_sd": a.prior_sd},
           "block_days": a.block_days, "min_n": a.min_n, "rows": int(len(df)), "n_items": len(names),
           "csv_sha256": sha256_file(a.data)}
    (a.out / "calib.json").write_text(json.dumps(make_calib(names, b, n, fit), sort_keys=True))
    (a.out / "time_norms.json").write_text(json.dumps(time_norms(df), sort_keys=True))
    print(f"fit: {len(df)} rows, {len(names)} items, {info['n_groups']} groups, {info['iterations']} iters, "
          f"converged={info['converged']} (max|d|={info['max_abs_delta']:.2e})")
    if a.eval:
        rec = recovery(df, b, n, names, a.prior_b, a.prior_sd, a.block_days, a.seed)
        rec["fit"] = fit
        if selection is not None:
            rec["selection"], rec["chosen"] = selection, chosen
            truth = df.groupby(df["qid"].astype(str))["difficulty_b"].first()
            rec["sensitivity"] = {
                "note": "computed AFTER selection using true b; NOT used for choosing block_days",
                "by_block_days": {str(r["block_days"]): n_target_curve(df, truth, a.prior_b, a.prior_sd, r["block_days"], a.seed)
                                  for r in selection}}
        (a.out / "irt_recovery.json").write_text(json.dumps(rec, indent=1))
        plot_recovery(rec, a.out / "irt_recovery.png")
        print("overall:", rec["overall"])
        for k, v in rec["by_n_bucket"].items():
            print("  bucket", k, v)
        for k, v in rec["by_n_target"].items():
            print("  n_target", k, v)
    print(f"done in {time.time() - t0:.1f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
