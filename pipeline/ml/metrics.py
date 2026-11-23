import numpy as np
from sklearn.metrics import roc_auc_score

EPS = 1e-12


def _p(p):
    return np.clip(np.asarray(p, dtype=np.float64), EPS, 1 - EPS)


def auc(y, p):
    y = np.asarray(y)
    return float("nan") if len(np.unique(y)) < 2 else float(roc_auc_score(y, p))


def per_row_logloss(y, p):
    y, p = np.asarray(y, dtype=np.float64), _p(p)
    return -(y * np.log(p) + (1 - y) * np.log1p(-p))


def log_loss(y, p):
    return float(per_row_logloss(y, p).mean())


def brier(y, p):
    return float(np.mean((np.asarray(p, dtype=np.float64) - np.asarray(y)) ** 2))


def reliability_curve(y, p, bins=15):
    """Equal-width bins on [0,1]; returns (mean_conf, acc, count) arrays (nan for empty bins)."""
    y, p = np.asarray(y, dtype=np.float64), np.asarray(p, dtype=np.float64)
    idx = np.minimum((p * bins).astype(int), bins - 1)
    cnt = np.bincount(idx, minlength=bins).astype(np.float64)
    with np.errstate(invalid="ignore", divide="ignore"):
        conf = np.bincount(idx, weights=p, minlength=bins) / cnt
        acc = np.bincount(idx, weights=y, minlength=bins) / cnt
    return conf, acc, cnt


def ece(y, p, bins=15):
    conf, acc, cnt = reliability_curve(y, p, bins)
    m = cnt > 0
    return float(np.sum(cnt[m] * np.abs(acc[m] - conf[m])) / cnt.sum())


def all_metrics(y, p):
    return {"n": int(len(y)), "auc": auc(y, p), "log_loss": log_loss(y, p), "brier": brier(y, p), "ece": ece(y, p)}


def bootstrap_logloss_diff(y, p_model, p_base, sids, n_boot=1000, seed=0):
    """Paired bootstrap over students (resample sids with replacement) of
    mean logloss(model) - mean logloss(base). Returns dict(diff, lo, hi) (95% percentile CI)."""
    d = per_row_logloss(y, p_model) - per_row_logloss(y, p_base)
    u, inv = np.unique(np.asarray(sids), return_inverse=True)
    sums = np.bincount(inv, weights=d, minlength=len(u))
    cnts = np.bincount(inv, minlength=len(u)).astype(np.float64)
    rng = np.random.default_rng(seed)
    draw = rng.integers(0, len(u), size=(n_boot, len(u)))
    est = sums[draw].sum(1) / cnts[draw].sum(1)
    return {"diff": float(d.mean()), "lo": float(np.percentile(est, 2.5)), "hi": float(np.percentile(est, 97.5))}
