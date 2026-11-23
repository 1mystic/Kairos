"""Near-duplicate retrieval: TF-IDF char 3-5-gram cosine (offline, no models).

The labelled evaluation set is SYNTHETIC (no human duplicate pairs exist): for N sampled questions a
perturbed twin is generated (numbers changed, option order shuffled, whitespace/punctuation/LaTeX-spacing
edits, a short phrase dropped). Real duplicates may differ in other ways, so recall here is an optimistic
estimate. Everything is for human review; nothing is removed from the bank.
"""
from __future__ import annotations

import argparse
import json
import random
import re
import time
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from pipeline.ml.tagger import BANK_SRC, SOURCES, ROOT


def dedupe_text(q: dict) -> str:
    """Light normalisation: digits are kept (different numbers = different question)."""
    parts = [q.get("stem") or ""] + [o.get("text") or "" for o in q.get("options") or []]
    t = " ".join(parts).lower().replace("$", " ")
    return re.sub(r"\s+", " ", t).strip()


def load_bank():
    rows = []
    for name in SOURCES:
        for q in json.loads((BANK_SRC / f"{name}.json").read_text()):
            if q.get("status") == "verified":
                rows.append({"qid": q["id"], "source": name, "q": q, "chapter": q["tax"]["chapter"]})
    return rows


def perturb(q: dict, rng: random.Random) -> dict:
    """Seeded perturbed twin (returns a new question dict)."""
    q = json.loads(json.dumps(q))
    def bump(m):
        if rng.random() < 0.5:
            return m.group(0)
        v = int(m.group(0))
        return str(max(0, v + rng.choice([-2, -1, 1, 2])))
    stem = re.sub(r"(?<![\d.])\d{1,3}(?![\d.])", bump, q.get("stem") or "")
    words = stem.split(" ")
    if len(words) > 10:  # drop a short phrase of 2-3 words
        k = rng.randint(2, 3)
        s = rng.randrange(1, len(words) - k)
        del words[s:s + k]
    stem = " ".join(words)
    # whitespace / punctuation / latex spacing edits
    stem = stem.replace(" = ", "=" if rng.random() < .5 else "  =  ")
    stem = re.sub(r"\\frac", r"\\dfrac", stem) if rng.random() < .5 else stem
    stem = stem.replace(",", " ,", 1) if rng.random() < .5 else stem
    stem = stem.replace("$", " $", 1) if rng.random() < .5 else stem
    stem = re.sub(r"\.$", "", stem)
    q["stem"] = stem + ("  " if rng.random() < .5 else "")
    opts = q.get("options") or []
    if opts:
        texts = [o.get("text") or "" for o in opts]
        rng.shuffle(texts)
        for o, t in zip(opts, texts):
            o["text"] = t.replace("\\,", "").replace(" ", "  ", 1) if rng.random() < .3 else t
    return q


def metrics_from_ranks(ranks):
    r = np.asarray(ranks, float)
    return {"n": len(r), "recall@1": float((r <= 1).mean()), "recall@5": float((r <= 5).mean()),
            "mrr": float((1.0 / r).mean())}


def retrieve_ranks(corpus_texts, query_texts, target_idx, exclude_idx=None):
    """Rank (1 = best) of corpus item target_idx[i] for query i by char-ngram cosine."""
    v = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=1)
    C = v.fit_transform(corpus_texts)
    Q = v.transform(query_texts)
    S = (Q @ C.T).toarray()
    if exclude_idx is not None:
        for i, e in enumerate(exclude_idx):
            if e is not None:
                S[i, e] = -1.0
    ranks = []
    for i, t in enumerate(target_idx):
        ranks.append(1 + int((S[i] > S[i, t]).sum()))
    return ranks, S


def run(out_dir: Path, seed: int, n_twins: int = 300):
    t0 = time.time()
    rng = random.Random(seed)
    bank = load_bank()
    n = len(bank)
    pick = sorted(rng.sample(range(n), n_twins))
    twins = [perturb(bank[i]["q"], rng) for i in pick]
    corpus = [dedupe_text(b["q"]) for b in bank] + [dedupe_text(t) for t in twins]
    queries = [dedupe_text(t) for t in twins]
    own = [n + k for k in range(n_twins)]  # the twin itself is in the corpus: exclude it
    ranks, S = retrieve_ranks(corpus, queries, pick, own)
    m = metrics_from_ranks(ranks)
    # --- precision at cosine thresholds over ALL pairs in (bank + twins)
    v = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True)
    X = v.fit_transform(corpus)
    P = (X @ X.T).toarray()
    iu = np.triu_indices(len(corpus), 1)
    sims = P[iu]
    true_pairs = {(min(p, n + k), max(p, n + k)) for k, p in enumerate(pick)}
    ia, ib = iu
    key_true = np.zeros(len(sims), bool)
    pos = {(a, b) for a, b in true_pairs}
    sel = np.where(sims >= 0.4)[0]
    for s in sel:
        if (int(ia[s]), int(ib[s])) in pos:
            key_true[s] = True
    thr_rows = []
    for t in (0.5, 0.6, 0.7, 0.8, 0.9, 0.95):
        above = sims >= t
        tp = int((above & key_true).sum())
        tot = int(above.sum())
        thr_rows.append({"cosine_threshold": t, "pairs_flagged": tot, "twin_pairs_flagged": tp,
                         "precision_lower_bound": tp / tot if tot else None,
                         "twin_recall": tp / n_twins,
                         "non_twin_pairs_flagged": tot - tp})
    # --- real cross-source candidates in the bank (originals only)
    Bx = v.transform(corpus[:n])
    SB = (Bx @ Bx.T).toarray()
    cands = []
    for i in range(n):
        for j in range(i + 1, n):
            if bank[i]["source"] != bank[j]["source"]:
                cands.append((SB[i, j], i, j))
    cands.sort(key=lambda x: -x[0])
    top = [{"cosine": round(float(c), 4),
            "a": {"qid": bank[i]["qid"], "source": bank[i]["source"], "chapter": bank[i]["chapter"], "stem": (bank[i]["q"].get("stem") or "")[:160]},
            "b": {"qid": bank[j]["qid"], "source": bank[j]["source"], "chapter": bank[j]["chapter"], "stem": (bank[j]["q"].get("stem") or "")[:160]}}
           for c, i, j in cands[:20]]
    res = {"synthetic_eval": m, "thresholds": thr_rows,
           "config": {"seed": seed, "n_bank": n, "n_twins": n_twins, "corpus_size": len(corpus),
                      "features": "tfidf char_wb 3-5, sublinear, cosine",
                      "perturbations": ["number +-1/2 (p=.5 each)", "option shuffle", "whitespace/punct/latex spacing", "drop 2-3 word phrase"]},
           "caveats": ["Twins are SYNTHETIC and generated by simple edits: recall on real duplicates (paraphrases, "
                       "re-typeset, translated) will be lower.",
                       "precision_lower_bound counts only the planted twin pairs as true; other flagged pairs may be genuine duplicates.",
                       "Authored questions come in templated families, so non-twin pairs at high cosine are common and need human review."],
           "runtime_s": round(time.time() - t0, 1)}
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "dedupe.json").write_text(json.dumps(res, indent=2))
    (out_dir / "dup_candidates.json").write_text(json.dumps(
        {"note": "Top cross-source pairs by cosine, for human review only. Not claimed to be duplicates.", "pairs": top}, indent=1))
    return res


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="docs/results/tagging")
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--twins", type=int, default=300)
    a = ap.parse_args(argv)
    out = Path(a.out)
    out = out if out.is_absolute() else ROOT / out
    r = run(out, a.seed, a.twins)
    print(json.dumps(r["synthetic_eval"]))
    for t in r["thresholds"]:
        print(t)


if __name__ == "__main__":
    main()
