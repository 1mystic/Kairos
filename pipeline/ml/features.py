"""Closed-form features of the raw snapshot columns (re-implementable in TypeScript).

Order matters (FEATURES). Definitions, with seen = (elo_n > 0), x_elo = elo_theta - difficulty_b:
  x_elo      = elo_theta - difficulty_b
  rd         = elo_rd
  log_n      = ln(1 + elo_n)
  r          = fsrs_r
  one_minus_r= 1 - fsrs_r
  log_days   = ln(1 + max(days_since_last_topic, 0))   # -1 (never) -> 0
  unseen     = 1 - seen = 1 if elo_n == 0 else 0
  err        = err_rate
  b          = difficulty_b
  log_k      = ln(1 + k_in_session)
  x_elo_r    = x_elo * fsrs_r
  x_elo_rd   = x_elo * elo_rd
  log_s      = ln(1 + fsrs_s)
No clipping is applied. `seen` is only used inside `unseen`.
"""
import numpy as np

FEATURES = ["x_elo", "rd", "log_n", "r", "one_minus_r", "log_days", "unseen", "err",
            "b", "log_k", "x_elo_r", "x_elo_rd", "log_s"]


def build_features(df) -> np.ndarray:
    g = lambda c: np.asarray(df[c], dtype=np.float64)
    x_elo = g("elo_theta") - g("difficulty_b")
    r = g("fsrs_r")
    rd = g("elo_rd")
    cols = {
        "x_elo": x_elo,
        "rd": rd,
        "log_n": np.log1p(g("elo_n")),
        "r": r,
        "one_minus_r": 1.0 - r,
        "log_days": np.log1p(np.maximum(g("days_since_last_topic"), 0.0)),
        "unseen": 1.0 - (g("elo_n") > 0).astype(np.float64),
        "err": g("err_rate"),
        "b": g("difficulty_b"),
        "log_k": np.log1p(g("k_in_session")),
        "x_elo_r": x_elo * r,
        "x_elo_rd": x_elo * rd,
        "log_s": np.log1p(g("fsrs_s")),
    }
    return np.column_stack([cols[f] for f in FEATURES])
