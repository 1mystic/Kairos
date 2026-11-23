"""CSV loading, deterministic splits, toy data generator."""
import argparse
import hashlib
import numpy as np
import pandas as pd

COLUMNS = ["sid", "policy", "day_idx", "topic", "qid", "difficulty_b", "correct", "time_ms", "hint_used",
           "prior_n_topic", "days_since_last_topic", "elo_theta", "elo_rd", "elo_n", "fsrs_r", "fsrs_s",
           "fsrs_d", "err_rate", "k_in_session"]
DTYPES = {"sid": "int64", "policy": "str", "day_idx": "int64", "topic": "str", "qid": "str",
          "difficulty_b": "float64", "correct": "int64", "time_ms": "int64", "hint_used": "int64",
          "prior_n_topic": "int64", "days_since_last_topic": "int64", "elo_theta": "float64",
          "elo_rd": "float64", "elo_n": "int64", "fsrs_r": "float64", "fsrs_s": "float64",
          "fsrs_d": "float64", "err_rate": "float64", "k_in_session": "int64"}


def sha256_file(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def load_csv(path) -> pd.DataFrame:
    df = pd.read_csv(path, dtype=DTYPES)
    missing = [c for c in COLUMNS if c not in df.columns]
    if missing:
        raise ValueError(f"missing columns: {missing}")
    # p_true (sim-only diagnostic, never a feature) is kept when present for the oracle reference row
    extra = ["p_true"] if "p_true" in df.columns else []
    return df[COLUMNS + extra].reset_index(drop=True)


def _bucket(sid: int, seed: int) -> float:
    h = hashlib.sha256(f"{seed}:{int(sid)}".encode()).digest()
    return int.from_bytes(h[:8], "big") / 2.0**64


def split_sids(sids, test_frac=0.2, val_frac=0.1, seed=0):
    """Deterministic by hash of (seed, sid). Returns (train, val, test) sid sets."""
    tr, va, te = set(), set(), set()
    for s in sorted(set(int(x) for x in sids)):
        u = _bucket(s, seed)
        (te if u < test_frac else va if u < test_frac + val_frac else tr).add(s)
    return tr, va, te


def split_by_student(df, test_frac=0.2, val_frac=0.1, seed=0):
    tr, va, te = split_sids(df["sid"].unique(), test_frac, val_frac, seed)
    return (df[df.sid.isin(tr)].reset_index(drop=True), df[df.sid.isin(va)].reset_index(drop=True),
            df[df.sid.isin(te)].reset_index(drop=True))


def temporal_split(df, cutoff_day, sids=None):
    """train = day_idx < cutoff, test = day_idx >= cutoff. If `sids` is a (train_sids, test_sids) pair,
    train is restricted to train_sids and test to test_sids (student-disjoint AND future); else all students."""
    if sids is not None:
        trs, tes = sids
        a, b = df[df.sid.isin(trs)], df[df.sid.isin(tes)]
    else:
        a = b = df
    return (a[a.day_idx < cutoff_day].reset_index(drop=True), b[b.day_idx >= cutoff_day].reset_index(drop=True))


def make_toy_csv(path, n_students=40, seed=0, days=60, topics=6):
    """Schema-valid synthetic data with learnable signal: P = sigmoid(1.2*(theta_true-b) + 1.5*(r-0.6) - 0.3*unseen)."""
    rng = np.random.default_rng(seed)
    rows = []
    for sid in range(n_students):
        true = rng.normal(0, 1)
        elo = {t: dict(theta=0.0, rd=1.0, n=0, last=-1, err=0, s=0.0, d=0.0) for t in range(topics)}
        for pol in ("a", "b"):
            st = {t: dict(v) for t, v in elo.items()}
            prior = {t: 0 for t in range(topics)}
            for day in range(0, days, 2):
                t = int(rng.integers(topics))
                s = st[t]
                snap = dict(theta=s["theta"], rd=s["rd"], n=s["n"], err=s["err"], s=s["s"], d=s["d"])
                gap = -1 if s["last"] < 0 else day - s["last"]
                r = 1.0 if s["n"] == 0 else float(np.exp(-max(gap, 0) / max(s["s"], 0.5) * 0.5))
                for k in range(int(rng.integers(1, 4))):
                    b = float(rng.normal(0, 1))
                    p = 1 / (1 + np.exp(-(1.2 * (true - b) + 1.5 * (r - 0.6) - (0.3 if snap["n"] == 0 else 0))))
                    y = int(rng.random() < p)
                    rows.append((sid, pol, day, f"t{t}", f"q{rng.integers(10**6)}", b, y, int(rng.integers(20000, 120000)),
                                 int(rng.random() < 0.05), prior[t], gap, snap["theta"], snap["rd"], snap["n"], r,
                                 snap["s"], snap["d"], snap["err"] / max(snap["n"], 1), k))
                    prior[t] += 1
                    s["n"] += 1
                    s["theta"] += 0.3 * (y - 1 / (1 + np.exp(-(s["theta"] - b))))
                    s["rd"] = max(0.15, s["rd"] * 0.95)
                    s["err"] += 1 - y
                s["last"] = day
                s["s"] = max(s["s"], 1.0) * 1.5
                s["d"] = 5.0
    df = pd.DataFrame(rows, columns=COLUMNS).astype(DTYPES)
    df = df.sort_values(["sid", "policy", "day_idx"], kind="stable").reset_index(drop=True)
    df.to_csv(path, index=False)
    return df


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--toy", required=True)
    ap.add_argument("--n-students", type=int, default=200)
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args()
    import os
    os.makedirs(os.path.dirname(a.toy) or ".", exist_ok=True)
    print(len(make_toy_csv(a.toy, a.n_students, a.seed)), "rows")
