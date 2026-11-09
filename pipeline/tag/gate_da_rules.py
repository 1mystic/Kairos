"""Keyword rules mapping free text to a GATE DA 2027 taxonomy chapter (and topic).

``classify_gate(text)`` returns (chapter_id | None, topic_id | None, score). Nothing is guessed: a result needs
MIN_SCORE and a margin over the runner-up, otherwise (None, None, score) and the item is treated as off-syllabus /
ambiguous by the open-bank syllabus filter. Patterns are regexes searched in the lower-cased text.
"""
from __future__ import annotations

import re

MIN_SCORE = 2
MARGIN = 1
W = lambda p, w: (p, w)  # noqa: E731

RULES: dict[str, list] = {
    "PRS.CNT": [W(r"permutation|combination|\bchoose\b|number of ways|arrangements? of|distinct arrangements|binomial coefficient|\bC\(\d", 3), r"committee|selected from|how many (different )?(ways|ordered)"],
    "PRS.PROB": [W(r"probability|probable|\bodds\b|\bevent[s]?\b|independent events|mutually exclusive|bayes|conditional prob|sample space|at random|randomly (chosen|selected|drawn|picked)|\bfair (coin|die|dice)", 3), r"\bcoin|\bdice\b|\bdie\b|\bdraw[n]? |marbles?|\bballs?\b"],
    "PRS.DESC": [W(r"standard deviation|variance of (the )?(data|sample|set)|\bmedian\b|\bmode\b|\bmean of\b|\baverage of\b|correlation coefficient|\bcovariance\b|z-score|interquartile|skew", 3), r"data set|\bsample\b"],
    "PRS.DRV": [W(r"binomial|bernoulli|poisson|geometric distribution|probability mass|discrete random variable|expected value of the (number|sum)", 3)],
    "PRS.CRV": [W(r"normal distribution|standard normal|exponential distribution|uniform distribution|probability density|continuous random variable|t-distribution|chi-?square|cumulative distribution|\bpdf\b|\bcdf\b", 3)],
    "PRS.MOM": [W(r"expected value|expectation|\bE\[|\bvar\(|joint (distribution|density)|marginal|\bE\(", 3)],
    "PRS.CLT": [W(r"central limit|sampling distribution of the (sample )?mean|sample mean", 3)],
    "PRS.INF": [W(r"confidence interval|hypothesis|null hypothesis|significance level|p-value|t-test|z-test|type i error|type ii error|critical value|margin of error|chi-square test|test statistic", 3)],
    "LA.VS": [W(r"vector space|subspace|linearly (in)?dependent|linear independence|\bbasis\b|\bspan\b|dimension of", 3)],
    "LA.MAT": [W(r"orthogonal matrix|idempotent|symmetric matrix|quadratic form|positive (semi)?definite|partitioned matrix|inverse of (the )?matrix|matrix multiplication|matrices", 2), r"\bmatrix\b|transpose|identity matrix"],
    "LA.SYS": [W(r"system of (linear )?equations|gaussian elimination|row reduc|augmented matrix|consistent system|unique solution|infinitely many solutions", 3)],
    "LA.EIG": [W(r"eigenvalue|eigenvector|characteristic (polynomial|equation)|determinant|\bdet\b", 3)],
    "LA.PROJ": [W(r"\brank of\b|nullity|null space|projection (matrix|onto)|orthogonal projection|column space|kernel of", 3)],
    "LA.DEC": [W(r"singular value|\bsvd\b|\blu decomposition|\blu factor|cholesky|\bqr decomposition", 4)],
    "CO.LIM": [W(r"\blimit\b|\\lim|continuous at|continuity|differentiable|derivative of|\bsum of the (infinite )?series|converges?\b", 3)],
    "CO.TAY": [W(r"taylor|maclaurin|power series|series expansion|taylor polynomial", 4)],
    "CO.OPT": [W(r"maximum value|minimum value|maxima|minima|local (max|min)|critical point|inflection|maximi[sz]e|minimi[sz]e|optimi[sz]", 3), r"largest possible value|smallest possible value|second derivative"],
    "PDS.PY": [W(r"python|def [a-z_]+\(|print\(|\bfor [a-z] in range|lambda\b|list comprehension|dictionary", 3)],
    "PDS.DS": [W(r"\bstack\b|\bqueue\b|linked list|binary (search )?tree|\btree\b|hash table|hash function|\bheap\b|\bdeque\b|binary tree|preorder|inorder|postorder|in-order|pre-order|post-order", 3), r"collision|\bnode\b"],
    "PDS.ALG": [W(r"binary search|linear search|quicksort|merge ?sort|insertion sort|selection sort|bubble sort|\bsorting\b|\bsorted\b|divide and conquer|big-?o|time complexity|worst-case|\bo\(n|\\theta|recurrence|master theorem|\bpivot\b", 3)],
    "PDS.GRAPH": [W(r"\bgraph\b|breadth-first|depth-first|\bbfs\b|\bdfs\b|shortest path|dijkstra|vertices|\bedges\b|spanning tree|topological|adjacency", 3)],
    "DBW.ER": [W(r"entity[- ]relationship|\ber (model|diagram)|weak entity|cardinality constraint|participation constraint", 4)],
    "DBW.REL": [W(r"relational (algebra|model|database)|\bsql\b|select .* from|primary key|foreign key|natural join|\bjoin\b|tuple calculus|integrity constraint|\bschema\b", 3)],
    "DBW.NF": [W(r"normal form|\b[123]nf\b|\bbcnf\b|functional dependenc|candidate key|b\+ ?tree|indexing|\bindex\b|file organi[sz]ation|lossless", 3)],
    "DBW.XFM": [W(r"discreti[sz]ation|min-max normali|z-score normali|data (transformation|compression)|sampling method", 3)],
    "DBW.DW": [W(r"data warehouse|star schema|snowflake schema|\bolap\b|data cube|drill-down|roll-up|concept hierarch|fact table|dimension table", 4)],
    "ML.REG": [W(r"linear regression|ridge|lasso|least[- ]squares|regulari[sz]|gradient descent|residual|\bols\b|regression", 3)],
    "ML.CLS": [W(r"logistic regression|k-nearest|\bknn\b|naive bayes|linear discriminant|support vector|\bsvm\b|decision tree|information gain|entropy|\bclassifier\b|perceptron|classification", 3)],
    "ML.EVAL": [W(r"bias-variance|bias and variance|\bbias\b.*\bvariance|cross[- ]validation|leave-one-out|k-fold|overfit|underfit|generali[sz]ation error|training error|test error|precision|recall|\bf1\b|confusion matrix|accuracy of", 3)],
    "ML.NN": [W(r"neural network|multi-?layer|feed-?forward|backprop|activation function|hidden layer|\bneurons?\b|relu|sigmoid", 3)],
    "ML.CLU": [W(r"k-means|k-medoid|clustering|\bcluster|hierarchical|single[- ]linkage|complete[- ]linkage", 3)],
    "ML.DR": [W(r"principal component|\bpca\b|dimensionality reduction|variance explained|covariance matrix of the data", 3)],
    "AI.SRCH": [W(r"\ba\*|a-star|admissible|heuristic|minimax|alpha-beta|alpha beta|breadth-first search|depth-first search|uniform[- ]cost|iterative deepening|state space|game tree|adversarial", 3)],
    "AI.LOG": [W(r"propositional|predicate logic|first-order|\bentail|\bresolution\b|truth table|tautology|satisfiab|modus|quantifier|logical (equivalent|consequence)|\bvalid(ity)? of|well-formed|conjunction|disjunction|contrapositive|\bnegation\b|\\neg|\\forall|\\exists|⊃|∃|∀|≡", 3)],
    "AI.UNC": [W(r"bayesian network|belief network|d-separation|conditional independence|variable elimination|gibbs|rejection sampling|likelihood weighting|markov blanket|inference in", 4)],
    "GA.VERB": [W(r"synonym|antonym|choose the (word|option|sentence)|grammatically|sentence completion|fill in the blank|idiom|analogy|odd one out|paragraph|reading comprehension", 3)],
    "GA.QUANT": [W(r"percent|\bratio\b|proportion|per cent|discount|profit|\bloss\b|simple interest|compound interest|speed|km/h|\bhours?\b|work together|average|\bpipe|mixture|\bage[s]? of|years old|\bsum of|\bremainder|\bdivisible|\bfactors?\b", 2), r"\d+%|rs\.? ?\d|\$\d|how (many|much)"],
    "GA.ANAL": [W(r"\bdeduc|\binfer|\bconclusion\b|all (of )?the (following )?statements|logical(ly)? follow|if and only if|\bsyllogism|statements? (is|are) true|cannot be determined", 3)],
}

# optional refinements: chapter -> [(topic_suffix, regex)]
TOPICS: dict[str, list[tuple[str, str]]] = {
    "PRS.PROB": [("BAYES", r"bayes|posterior|prior"), ("COND", r"conditional|given that"), ("IND", r"independent"), ("AX", r"sample space|axiom")],
    "PDS.DS": [("HASH", r"hash"), ("STK", r"\bstack"), ("QUE", r"\bqueue|deque"), ("LL", r"linked list"), ("TREE", r"tree|preorder|inorder|postorder|in-order|pre-order|post-order")],
    "PDS.ALG": [("SRCH", r"binary search|linear search"), ("SORT", r"insertion sort|selection sort|bubble sort"), ("DC", r"quicksort|merge ?sort|divide and conquer"), ("CPX", r"complexity|big-?o")],
    "PDS.GRAPH": [("TRAV", r"breadth-first|depth-first|\bbfs|\bdfs"), ("SP", r"shortest path|dijkstra")],
    "AI.SRCH": [("INF", r"a\*|heuristic|admissible"), ("ADV", r"minimax|alpha|game tree|adversarial"), ("UNINF", r"breadth-first|depth-first|uniform[- ]cost|iterative deepening")],
    "AI.LOG": [("PRED", r"predicate|first-order|quantifier|\\forall|\\exists|∀|∃"), ("PROP", r"propositional|truth table|tautology")],
    "ML.CLS": [("LOG", r"logistic"), ("KNN", r"nearest neighbo"), ("NB", r"naive bayes"), ("SVM", r"support vector|svm"), ("DT", r"decision tree|information gain"), ("LDA", r"discriminant")],
    "GA.QUANT": [("NUMC", r"percent|ratio|proportion|interest|speed|profit|discount"), ("STAT", r"average|mean|probab")],
    "GA.ANAL": [("DED", r"deduc|conclusion|statements"), ("NREL", r"series|pattern")],
}

_COMPILED = {ch: [(re.compile(p if isinstance(p, str) else p[0]), 1 if isinstance(p, str) else p[1]) for p in pats]
             for ch, pats in RULES.items()}
_TOPICS = {ch: [(t, re.compile(r)) for t, r in lst] for ch, lst in TOPICS.items()}


def scores(text: str) -> dict[str, int]:
    t = text.lower()
    out: dict[str, int] = {}
    for ch, pats in _COMPILED.items():
        s = sum(w for rx, w in pats if rx.search(t))
        if s:
            out[ch] = s
    return out


def classify_gate(text: str, allowed: set[str] | None = None) -> tuple[str | None, str | None, int]:
    """allowed: restrict to these chapter ids (e.g. by source subject); chapter ids not in the taxonomy are ignored by callers."""
    sc = {c: s for c, s in scores(text).items() if allowed is None or c in allowed}
    if not sc:
        return None, None, 0
    ranked = sorted(sc.items(), key=lambda kv: -kv[1])
    best, s = ranked[0]
    if s < MIN_SCORE or (len(ranked) > 1 and s - ranked[1][1] < MARGIN):
        return None, None, s
    topic = None
    for suf, rx in _TOPICS.get(best, []):
        if rx.search(text.lower()):
            topic = f"{best}.{suf}"
            break
    return best, topic, s
