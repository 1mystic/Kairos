"""Fast tests for tagger.py / dedupe.py using tiny inline fixtures."""
from pipeline.ml.dedupe import dedupe_text, metrics_from_ranks, retrieve_ranks
from pipeline.ml.tagger import (SubjectTagger, normalise, selective_curve, suggest, threshold_for_precision)

TOY = [
    ("PHY", "PHY.OPT", "A convex lens of focal length cm forms a real image of the object"),
    ("PHY", "PHY.OPT", "A concave mirror forms a virtual image; magnification and focal length"),
    ("PHY", "PHY.OPT", "Refraction of a ray through a glass prism and the angle of deviation"),
    ("PHY", "PHY.OPT", "lens focal length image distance object distance magnification"),
    ("PHY", "PHY.KIN", "A projectile is thrown with velocity; find the maximum height and range"),
    ("PHY", "PHY.KIN", "Particle moves with uniform acceleration; velocity and displacement"),
    ("PHY", "PHY.KIN", "A stone is dropped from a tower; time of fall and velocity"),
    ("PHY", "PHY.KIN", "projectile angle of projection horizontal range velocity"),
    ("CHE", "CHE.ORG", "The alkene reacts with HBr following Markovnikov addition to give alkyl halide"),
    ("CHE", "CHE.ORG", "benzene undergoes electrophilic substitution nitration alkene alkyl"),
    ("CHE", "CHE.ORG", "aldehyde ketone carbonyl alkene hydrocarbon reaction product"),
    ("CHE", "CHE.ORG", "alkyne alkene hydrogenation Markovnikov product"),
    ("CHE", "CHE.EQ", "equilibrium constant Kp and Le Chatelier principle for the gaseous equilibrium"),
    ("CHE", "CHE.EQ", "at equilibrium the degree of dissociation and equilibrium constant"),
    ("CHE", "CHE.EQ", "equilibrium mixture partial pressure Kc Kp relation"),
    ("CHE", "CHE.EQ", "Le Chatelier shift of the equilibrium on increasing pressure"),
]


def _fit(kind="logreg"):
    return SubjectTagger(kind, 0, tune=False).fit([t[2] for t in TOY], [t[0] for t in TOY], [t[1] for t in TOY],
                                                  fit_subject_clf=True)


def test_normalise():
    n = normalise(r"Find $\int_0^{12} x\,dx$ and \ce{H2SO4}, \mathrm{kg} 3.5")
    assert "int_cmd" in n and "$" not in n and "12" not in n and "3.5" not in n
    assert "num" in n and "h num so num" in n  # \ce contents kept, digits collapsed
    assert "mathrm" not in n and "\\" not in n


def test_tagger_learns_separable_toy_set():
    for kind in ("logreg", "svc"):
        m = _fit(kind)
        out = m.predict([t[2] for t in TOY], [t[0] for t in TOY])
        acc = sum(r[0][0][0] == t[1] for r, t in zip(out, TOY)) / len(TOY)
        assert acc == 1.0
        r = m.predict(["Markovnikov addition to the alkene"], ["CHE"])[0]
        assert r[0][0][0] == "CHE.ORG"


def test_selective_threshold_logic():
    conf = [0.9, 0.8, 0.7, 0.6, 0.5, 0.4]
    ok = [True, True, True, False, True, False]
    pts = selective_curve(conf, ok)
    assert pts[0] == (0.9, 1 / 6, 1.0) and abs(pts[-1][2] - 4 / 6) < 1e-9
    t = threshold_for_precision(conf, ok, 0.95)
    assert t["threshold"] == 0.7 and abs(t["coverage"] - 0.5) < 1e-9 and t["precision"] == 1.0
    assert threshold_for_precision([0.9, 0.8], [False, False], 0.95) is None
    # ties are not split
    assert [p[0] for p in selective_curve([0.5, 0.5, 0.4], [True, False, True])] == [0.5, 0.4]


def test_suggest_schema_and_subject_restriction():
    m = _fit()
    qs = [{"id": "q1", "stem": "lens focal length image", "tax": {"subject": "PHY"}},
          {"id": "q2", "stem": "equilibrium constant Kp", "subject": "CHE"},
          {"qid": "q3", "stem": "alkene Markovnikov addition"}]  # no subject -> inferred
    out = suggest(qs, m, 0.5)
    assert [o["qid"] for o in out] == ["q1", "q2", "q3"]
    for o in out:
        assert set(o) >= {"qid", "subject", "top3", "confident"}
        assert isinstance(o["confident"], bool) and 1 <= len(o["top3"]) <= 3
        assert all(isinstance(c, str) and isinstance(p, float) for c, p in o["top3"])
        allowed = {t[1] for t in TOY if t[0] == o["subject"]}
        assert {c for c, _ in o["top3"]} <= allowed
    # a physics question can never get a chemistry chapter, even with chemistry-looking text
    phys = suggest([{"id": "x", "stem": "alkene Markovnikov equilibrium", "tax": {"subject": "PHY"}}], m)[0]
    assert all(c.startswith("PHY.") for c, _ in phys["top3"])
    assert out[2].get("subject_inferred") is True and out[2]["subject"] == "CHE"


def test_dedupe_exact_twin_recall():
    qs = [{"stem": t[2] + f" variant {i}", "options": []} for i, t in enumerate(TOY)]
    texts = [dedupe_text(q) for q in qs]
    # queries are the exact texts; own copy excluded would remove the answer, so add a twin copy
    corpus = texts + texts
    ranks, _ = retrieve_ranks(corpus, texts, list(range(len(texts), 2 * len(texts))), list(range(len(texts))))
    m = metrics_from_ranks(ranks)
    assert m["recall@1"] == 1.0 and m["mrr"] == 1.0
