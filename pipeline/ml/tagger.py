"""Offline classical-ML chapter tagger (Phase G without an LLM).

Design
------
* Text = stem + option texts, normalised by :func:`normalise`.
* Features = TF-IDF word 1-2 grams + TF-IDF char_wb 3-5 grams (sublinear tf), hstacked.
* ONE MODEL PER SUBJECT (PHY, CHE, MAT, BOT, ZOO): each model only ever predicts chapters of its own
  subject, so the subject restriction holds by construction. The subject is taken from the question
  (``tax.subject``); in evaluation it is the human-given subject, in ``suggest`` it is the input's
  subject, or (if missing) predicted by a small subject classifier and flagged ``subject_inferred``.
* Classifiers: multinomial LogisticRegression (C tuned by inner 3-fold CV) and LinearSVC (C tuned
  likewise; confidence = top1 - top2 decision margin).
* Evaluation: seeded 5-fold stratified CV per subject; chapters with < 2 labelled examples stay in
  train only (counted, not evaluated). Selective prediction = precision vs coverage over the
  confidence threshold, pooled over all out-of-fold predictions.

POLICY: suggestions are for HUMAN REVIEW ONLY. The pipeline rule "a question with no tag is
rejected, never guessed" stays; nothing here writes tags into the bank or manual_tags.json.
Everything runs offline; no network, no pretrained models.
"""
from __future__ import annotations

import argparse
import json
import re
import time
import warnings
from collections import Counter
from pathlib import Path

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import f1_score
from sklearn.model_selection import GridSearchCV, StratifiedKFold
from sklearn.svm import LinearSVC

ROOT = Path(__file__).resolve().parents[2]
BANK_SRC = ROOT / "pipeline" / "bank_src"
MANUAL_TAGS = ROOT / "pipeline" / "tag" / "manual_tags.json"
SOURCES = ["jeebench", "authored_jee_main", "authored_neet_iat"]
GRID = {"logreg": [1.0, 10.0, 100.0], "svc": [0.1, 1.0, 10.0]}
TARGET_PRECISION = 0.95

# formatting-only LaTeX commands carry no topic information
_NOISE_CMDS = {"mathrm", "left", "right", "text", "mathbf", "mathit", "quad", "qquad", "displaystyle",
               "begin", "end", "operatorname", "textbf", "mathbb", "boldsymbol", "limits"}


# ---------------------------------------------------------------- text
def normalise(text: str) -> str:
    t = text.lower()
    t = re.sub(r"\\(?:ce|pu)\s*\{([^{}]*)\}", r" \1 ", t)  # mhchem: keep contents
    def cmd(m):
        n = m.group(1)
        return " " if n in _NOISE_CMDS else f" {n}_cmd "
    t = re.sub(r"\\([a-z]+)", cmd, t)
    t = re.sub(r"\\.", " ", t)  # spacing/escape commands such as \, \; \\
    t = t.replace("$", " ")
    t = re.sub(r"\d+(?:\.\d+)?", " num ", t)
    t = re.sub(r"[{}]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def question_text(q: dict) -> str:
    parts = [q.get("stem") or ""]
    for o in q.get("options") or []:
        parts.append(o.get("text") or "")
    return "\n".join(parts)


def load_labelled(src_dir: Path = BANK_SRC, manual_path: Path = MANUAL_TAGS) -> list[dict]:
    manual = json.loads(manual_path.read_text()) if manual_path.exists() else {}
    rows = []
    for name in SOURCES:
        for q in json.loads((src_dir / f"{name}.json").read_text()):
            if q.get("status") != "verified":
                continue
            if name == "jeebench":
                prov = "manual" if q["id"] in manual else "rule"
            else:
                prov = "authored"
            rows.append({"qid": q["id"], "source": name, "provenance": prov, "text": question_text(q),
                         "subject": q["tax"]["subject"], "chapter": q["tax"]["chapter"]})
    return rows


# ---------------------------------------------------------------- model
class Featuriser:
    def __init__(self):
        self.w = TfidfVectorizer(ngram_range=(1, 2), sublinear_tf=True, min_df=1, token_pattern=r"(?u)\b\w\w+\b")
        self.c = TfidfVectorizer(analyzer="char_wb", ngram_range=(3, 5), sublinear_tf=True, min_df=2)

    def fit_transform(self, texts):
        n = [normalise(t) for t in texts]
        return hstack([self.w.fit_transform(n), self.c.fit_transform(n)]).tocsr()

    def transform(self, texts):
        n = [normalise(t) for t in texts]
        return hstack([self.w.transform(n), self.c.transform(n)]).tocsr()


def _make_clf(kind: str, C: float, seed: int):
    if kind == "logreg":
        return LogisticRegression(C=C, max_iter=400, random_state=seed)
    return LinearSVC(C=C, random_state=seed)


def _tune_C(kind, X, y, seed):
    classes, counts = np.unique(y, return_counts=True)
    if len(classes) < 2 or counts.max() < 3:
        return GRID[kind][1]
    cv = StratifiedKFold(3, shuffle=True, random_state=seed)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        gs = GridSearchCV(_make_clf(kind, 1.0, seed), {"C": GRID[kind]}, cv=cv, scoring="accuracy", error_score=0.0)
        gs.fit(X, y)
    return float(gs.best_params_["C"])


class _SubjectModel:
    def __init__(self, kind, seed, tune=True):
        self.kind, self.seed, self.tune = kind, seed, tune

    def fit(self, texts, chapters):
        self.f = Featuriser()
        X = self.f.fit_transform(texts)
        y = np.asarray(chapters)
        self.classes_ = sorted(set(chapters))
        self.C = _tune_C(self.kind, X, y, self.seed) if self.tune else GRID[self.kind][1]
        if len(self.classes_) == 1:
            self.clf = None
        else:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                self.clf = _make_clf(self.kind, self.C, self.seed).fit(X, y)
        return self

    def scores(self, texts):
        """(n, n_classes) matrix: probabilities (logreg) or decision values (svc)."""
        X = self.f.transform(texts)
        if self.clf is None:
            return np.ones((X.shape[0], 1))
        if self.kind == "logreg":
            return self.clf.predict_proba(X)
        d = self.clf.decision_function(X)
        return np.column_stack([-d, d]) if d.ndim == 1 else d  # binary case is 1-D


def confidence(kind: str, s: np.ndarray) -> np.ndarray:
    """logreg: max probability. svc: margin between best and second-best decision value."""
    if kind == "logreg" or s.shape[1] < 2:
        return s.max(axis=1)
    p = np.sort(s, axis=1)
    return p[:, -1] - p[:, -2]


class SubjectTagger:
    """One model per subject (+ a tiny subject classifier for inputs without a subject)."""

    def __init__(self, kind="logreg", seed=2026, tune=True):
        self.kind, self.seed, self.tune = kind, seed, tune
        self.models: dict[str, _SubjectModel] = {}
        self.subject_model = None

    def fit(self, texts, subjects, chapters, fit_subject_clf=False):
        texts, subjects, chapters = list(texts), list(subjects), list(chapters)
        for s in sorted(set(subjects)):
            idx = [i for i, x in enumerate(subjects) if x == s]
            self.models[s] = _SubjectModel(self.kind, self.seed, self.tune).fit(
                [texts[i] for i in idx], [chapters[i] for i in idx])
        if fit_subject_clf:
            self.subject_model = _SubjectModel("logreg", self.seed, False).fit(texts, subjects)
        return self

    def predict(self, texts, subjects):
        """-> list of (ranked [(chapter, score)...], confidence). Only chapters of the given subject."""
        texts, subjects = list(texts), list(subjects)
        out = [None] * len(texts)
        for s in set(subjects):
            idx = [i for i, x in enumerate(subjects) if x == s]
            m = self.models[s]
            sc = m.scores([texts[i] for i in idx])
            conf = confidence(self.kind, sc)
            for r, i in enumerate(idx):
                order = np.argsort(-sc[r], kind="stable")
                out[i] = ([(m.classes_[j], float(sc[r, j])) for j in order], float(conf[r]))
        return out

    def infer_subjects(self, texts):
        sc = self.subject_model.scores(list(texts))
        return [self.subject_model.classes_[j] for j in sc.argmax(axis=1)]


# ---------------------------------------------------------------- selective prediction
def selective_curve(conf, correct):
    """Points (threshold, coverage, precision), one per distinct confidence value, high -> low."""
    conf, correct = np.asarray(conf, float), np.asarray(correct, bool)
    order = np.argsort(-conf, kind="stable")
    c, ok = conf[order], correct[order]
    cum = np.cumsum(ok)
    n = len(c)
    pts = []
    for k in range(1, n + 1):
        if k == n or c[k] != c[k - 1]:
            pts.append((float(c[k - 1]), k / n, float(cum[k - 1] / k)))
    return pts


def threshold_for_precision(conf, correct, target=TARGET_PRECISION):
    """Largest-coverage threshold whose precision (conf >= threshold) is >= target.
    Returns dict(threshold, coverage, precision) or None if the target is never reached."""
    best = None
    for t, cov, prec in selective_curve(conf, correct):
        if prec >= target:
            best = {"threshold": t, "coverage": cov, "precision": prec}
    return best


# ---------------------------------------------------------------- evaluation
def cv_predictions(rows, kind, seed, n_splits=5, tune=True):
    """Out-of-fold predictions for eligible rows (chapter has >= 2 examples in its subject)."""
    n = len(rows)
    cnt = Counter((r["subject"], r["chapter"]) for r in rows)
    eligible = np.array([cnt[(r["subject"], r["chapter"])] >= 2 for r in rows])
    pred = [None] * n
    folds_of = {}
    for s in sorted({r["subject"] for r in rows}):
        sidx = np.array([i for i, r in enumerate(rows) if r["subject"] == s and eligible[i]])
        y = [rows[i]["chapter"] for i in sidx]
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            skf = StratifiedKFold(min(n_splits, len(sidx)), shuffle=True, random_state=seed)
            for f, (tr, te) in enumerate(skf.split(sidx, y)):
                for i in sidx[te]:
                    folds_of[i] = f
    for f in range(n_splits):
        test = [i for i in range(n) if folds_of.get(i) == f]
        train = [i for i in range(n) if folds_of.get(i) != f]  # incl. ineligible singletons
        m = SubjectTagger(kind, seed, tune).fit([rows[i]["text"] for i in train],
                                               [rows[i]["subject"] for i in train],
                                               [rows[i]["chapter"] for i in train])
        res = m.predict([rows[i]["text"] for i in test], [rows[i]["subject"] for i in test])
        for i, r in zip(test, res):
            pred[i] = r
    return eligible, pred


def _metrics(y, top1, top3):
    if not len(y):
        return {"n": 0}
    return {"n": len(y), "top1": float(np.mean([a == b for a, b in zip(y, top1)])),
            "top3": float(np.mean([a in t for a, t in zip(y, top3)])),
            "macro_f1": float(f1_score(y, top1, labels=sorted(set(y)), average="macro", zero_division=0))}


def summarise(rows, eligible, pred, kind, target=TARGET_PRECISION):
    idx = [i for i in range(len(rows)) if eligible[i]]
    y = [rows[i]["chapter"] for i in idx]
    top1 = [pred[i][0][0][0] for i in idx]
    top3 = [[c for c, _ in pred[i][0][:3]] for i in idx]
    conf = [pred[i][1] for i in idx]
    ok = [a == b for a, b in zip(y, top1)]
    out = {"overall": _metrics(y, top1, top3), "by_subject": {}, "by_provenance": {}}
    for key, field in (("by_subject", "subject"), ("by_provenance", "provenance")):
        for v in sorted({rows[i][field] for i in idx}):
            sel = [k for k, i in enumerate(idx) if rows[i][field] == v]
            out[key][v] = _metrics([y[k] for k in sel], [top1[k] for k in sel], [top3[k] for k in sel])
    thr = threshold_for_precision(conf, ok, target)
    out["selective"] = {"target_precision": target, "at_target": thr}
    if thr:
        prov = {}
        for v in sorted({rows[i]["provenance"] for i in idx}):
            sel = [k for k, i in enumerate(idx) if rows[i]["provenance"] == v]
            acc = [k for k in sel if conf[k] >= thr["threshold"]]
            prov[v] = {"n": len(sel), "coverage": len(acc) / len(sel),
                       "precision": (sum(ok[k] for k in acc) / len(acc)) if acc else None}
        out["selective"]["at_target_by_provenance"] = prov
    out["_curve"] = selective_curve(conf, ok)
    out["_confusions"] = Counter((a, b) for a, b in zip(y, top1) if a != b)
    return out


def rules_baseline(rows, eligible):
    from pipeline.tag.rules import RULES, classify
    idx = [i for i in range(len(rows)) if eligible[i]]
    def block(sel):
        ans = []
        for i in sel:
            r = rows[i]
            if r["subject"] not in RULES:
                ans.append(None)
                continue
            ans.append(classify(r["subject"], r["text"])[0])
        n = len(sel)
        made = [(a, rows[i]["chapter"]) for a, i in zip(ans, sel) if a is not None]
        return {"n": n, "coverage": len(made) / n if n else None,
                "precision": (sum(a == c for a, c in made) / len(made)) if made else None,
                "accuracy_abstain_counts_wrong": sum(a == c for a, c in made) / n if n else None}
    out = {"overall": block(idx), "by_provenance": {}, "by_subject": {}}
    out["overall_rule_subjects_only"] = block([i for i in idx if rows[i]["subject"] in RULES])
    for v in sorted({rows[i]["provenance"] for i in idx}):
        out["by_provenance"][v] = block([i for i in idx if rows[i]["provenance"] == v])
    for v in sorted({rows[i]["subject"] for i in idx}):
        out["by_subject"][v] = block([i for i in idx if rows[i]["subject"] == v])
    return out


def run_eval(out_dir: Path, seed: int):
    t0 = time.time()
    rows = load_labelled()
    cnt = Counter((r["subject"], r["chapter"]) for r in rows)
    singles = sorted(f"{c}" for (s, c), v in cnt.items() if v < 2)
    res, curves = {}, {}
    for kind in ("logreg", "svc"):
        eligible, pred = cv_predictions(rows, kind, seed)
        s = summarise(rows, eligible, pred, kind)
        curves[kind] = s.pop("_curve")
        conf = s.pop("_confusions")
        res[kind] = s
        if kind == "logreg":
            res["top10_confused_pairs"] = [{"true": a, "predicted": b, "count": n} for (a, b), n in
                                           sorted(conf.items(), key=lambda kv: (-kv[1], kv[0]))[:10]]
    res["rules_baseline"] = rules_baseline(rows, eligible)
    res["data"] = {"n_rows": len(rows), "n_evaluated": int(eligible.sum()),
                   "by_provenance": dict(Counter(r["provenance"] for r in rows)),
                   "by_subject": dict(Counter(r["subject"] for r in rows)),
                   "n_chapters": len(cnt), "singleton_chapters_train_only": singles,
                   "n_singleton_rows": int((~eligible).sum())}
    res["config"] = {"seed": seed, "folds": 5, "C_grid": GRID, "model": "one per subject",
                     "svc_confidence": "top1-top2 decision margin", "macro_f1_labels": "classes present in y_true"}
    res["caveats"] = [
        "rule-provenance labels come from the keyword rules and were accepted by a reviewer: partly circular, "
        "the rules baseline is ~perfect there by construction.",
        "manual rows exist exactly where the rules failed or abstained: the rules baseline is biased low on them.",
        "authored questions are often written in sibling families: near-twins across CV folds inflate authored scores.",
        "the 95%-precision threshold is chosen on the same out-of-fold predictions it is reported on (optimistic).",
        "BOT/ZOO have no rule baseline (rules cover PHY/CHE/MAT): rules abstain on them.",
    ]
    res["runtime_s"] = round(time.time() - t0, 1)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "metrics.json").write_text(json.dumps(res, indent=2, sort_keys=True))
    _plot(out_dir / "precision_coverage.png", curves, res["rules_baseline"]["overall"])
    return res


def _plot(path, curves, rules):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(figsize=(6.5, 4.5))
    for kind, lab in (("logreg", "ML logreg"), ("svc", "ML linear SVC")):
        pts = curves[kind]
        ax.plot([p[1] for p in pts], [p[2] for p in pts], label=lab)
    if rules.get("precision") is not None:
        ax.scatter([rules["coverage"]], [rules["precision"]], marker="o", color="k", zorder=5, label="keyword rules")
    ax.axhline(TARGET_PRECISION, ls=":", color="gray", lw=1)
    ax.set_xlabel("coverage (share of questions auto-suggested)")
    ax.set_ylabel("precision")
    ax.set_title("Chapter tagging: selective prediction (5-fold CV)")
    ax.set_xlim(0, 1.02)
    ax.set_ylim(0, 1.02)
    ax.legend(loc="lower left")
    fig.tight_layout()
    fig.savefig(path, dpi=130)
    plt.close(fig)


# ---------------------------------------------------------------- suggest
def train_full(seed=2026, kind="logreg", rows=None):
    rows = rows or load_labelled()
    return SubjectTagger(kind, seed).fit([r["text"] for r in rows], [r["subject"] for r in rows],
                                         [r["chapter"] for r in rows], fit_subject_clf=True)


def suggest(questions, model: SubjectTagger, threshold: float = 0.5):
    """Suggestions for HUMAN REVIEW ONLY (never auto-applied).
    questions: dicts with id/qid, stem, options, and tax.subject (or subject). If the subject is missing
    it is predicted and ``subject_inferred`` is true.
    -> [{qid, subject, top3: [[chapter, prob], ...], confident: bool, (subject_inferred)}]"""
    texts = [question_text(q) for q in questions]
    subs = [q.get("subject") or (q.get("tax") or {}).get("subject") for q in questions]
    inferred = [s is None for s in subs]
    if any(inferred):
        guess = model.infer_subjects([t for t, f in zip(texts, inferred) if f])
        it = iter(guess)
        subs = [next(it) if f else s for s, f in zip(subs, inferred)]
    preds = model.predict(texts, subs)
    out = []
    for q, s, inf, (ranked, conf) in zip(questions, subs, inferred, preds):
        d = {"qid": q.get("qid") or q.get("id"), "subject": s,
             "top3": [[c, round(p, 4)] for c, p in ranked[:3]], "confident": bool(conf >= threshold)}
        if inf:
            d["subject_inferred"] = True
        out.append(d)
    return out


def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--out", default="docs/results/tagging")
    ap.add_argument("--seed", type=int, default=2026)
    ap.add_argument("--suggest", help="JSON file (list of untagged questions) to write suggestions for")
    ap.add_argument("--model-out", help="where to save the model trained on all labelled data (pickle)")
    ap.add_argument("--suggest-out", help="suggestions JSON path (default: <out>/suggestions.json)")
    a = ap.parse_args(argv)
    out = Path(a.out)
    out = out if out.is_absolute() else ROOT / out
    if a.suggest:
        import pickle
        m = train_full(a.seed)
        if a.model_out:
            Path(a.model_out).write_bytes(pickle.dumps(m))
        thr = 0.5
        mp = out / "metrics.json"
        if mp.exists():
            at = json.loads(mp.read_text())["logreg"]["selective"]["at_target"]
            thr = at["threshold"] if at else thr
        qs = json.loads(Path(a.suggest).read_text())
        res = suggest(qs, m, thr)
        dest = Path(a.suggest_out) if a.suggest_out else out / "suggestions.json"
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_text(json.dumps({"for_human_review_only": True, "threshold": thr, "suggestions": res}, indent=1))
        print(f"wrote {len(res)} suggestions -> {dest} (threshold {thr:.3f}); FOR HUMAN REVIEW ONLY")
        return
    r = run_eval(out, a.seed)
    for k in ("logreg", "svc"):
        print(k, json.dumps(r[k]["overall"]), json.dumps(r[k]["selective"]["at_target"]))
    print("rules", json.dumps(r["rules_baseline"]["overall"]))
    print(f"{r['runtime_s']}s")


if __name__ == "__main__":
    main()
