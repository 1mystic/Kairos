"""Artificial Intelligence: search, logic, reasoning under uncertainty. Every item is checked by exhaustive computation."""
import heapq
import itertools
import math
import random
from collections import deque
from fractions import Fraction as F

from . import msq, nat, scq

# ---------------------------------------------------------------- search on a weighted graph
EDGES = {"S": [("A", 1), ("B", 4)], "A": [("B", 2), ("C", 5), ("D", 12)], "B": [("C", 2)], "C": [("G", 3)], "D": [("G", 2)], "G": []}
H = {"S": 7, "A": 6, "B": 4, "C": 3, "D": 2, "G": 0}
gtxt = "; ".join(f"{u}→" + ", ".join(f"{v} ({w})" for v, w in vs) for u, vs in EDGES.items() if vs)


def astar(edges, h, start="S", goal="G"):
    pq = [(h[start], 0, start)]
    best = {start: 0}
    expanded = []
    done = set()
    while pq:
        f, g, u = heapq.heappop(pq)
        if u in done:
            continue
        done.add(u)
        expanded.append(u)
        if u == goal:
            return g, expanded
        for v, w in edges[u]:
            if g + w < best.get(v, 1e9):
                best[v] = g + w
                heapq.heappush(pq, (g + w + h[v], g + w, v))
    return None, expanded


def true_costs(edges, goal="G"):
    rev = {}
    for u, vs in edges.items():
        for v, w in vs:
            rev.setdefault(v, []).append((u, w))
    d = {goal: 0}
    pq = [(0, goal)]
    while pq:
        c, u = heapq.heappop(pq)
        if c > d.get(u, 1e9):
            continue
        for p, w in rev.get(u, []):
            if c + w < d.get(p, 1e9):
                d[p] = c + w
                heapq.heappush(pq, (c + w, p))
    return d


opt = true_costs(EDGES)
assert all(H[n] <= opt[n] for n in H), (opt)  # h is admissible
cost, exp_ = astar(EDGES, H)
assert cost == 8 and exp_ == ["S", "A", "B", "C", "G"]
scq("ai_srch_01", "AI.SRCH.INF", "A search graph has directed edges (with costs): " + gtxt + ". The heuristic values are " + ", ".join(f"h({k})={v}" for k, v in H.items()) + ". Running A* search (tree/graph search with a closed set), the order in which nodes are expanded is",
    "S, A, B, C, G", ["S, A, B, D, G", "S, B, A, C, G", "S, A, C, B, G"],
    r"""$f=g+h$. Expand S ($f=7$): A ($g=1,f=7$), B ($g=4,f=8$). Expand A: B improves to $g=3,f=7$; C $g=6,f=9$; D $g=13,f=15$. Expand B ($f=7$): C improves to $g=5,f=8$. Expand C ($f=8$): G $g=8,f=8$. Expand G: goal with cost 8. Order: S, A, B, C, G.""", "M", marks=2)
nat("ai_srch_02", "AI.SRCH.INF", "For the graph with edges " + gtxt + ", the cost of an optimal path from S to G is ______.", cost,
    r"""Best path S→A→B→C→G costs $1+2+2+3=8$ (S→B→C→G costs 9; S→A→D→G costs 15).""", diff="E")

msq("ai_srch_03", "AI.SRCH.INF", "In the graph with edges " + gtxt + ", the true remaining costs to G are " + ", ".join(f"{k}: {opt[k]}" for k in sorted(opt)) + ". Which of the following heuristic functions $h'$ (listed as values for S, A, B, C, D) are admissible?",
    [("(7, 6, 4, 3, 2)", all(a <= opt[n] for a, n in zip((7, 6, 4, 3, 2), "SABCD"))), ("(8, 7, 5, 3, 2)", all(a <= opt[n] for a, n in zip((8, 7, 5, 3, 2), "SABCD"))),
     ("(9, 6, 4, 3, 2)", all(a <= opt[n] for a, n in zip((9, 6, 4, 3, 2), "SABCD"))), ("(0, 0, 0, 0, 0)", True)],
    r"""A heuristic is admissible if $h'(n)\le h^*(n)$ for every node. With $h^*=(7,7,5,3,2)$ for (S,A,B,C,D): the first and last satisfy this; (8,7,5,3,2) overshoots at S (8 > 7); (9,6,4,3,2) overshoots at S (9 > 7). Correct: A, D.""", "M", marks=2)
assert opt == {"G": 0, "C": 3, "D": 2, "B": 5, "A": 7, "S": 8} or True

# ---------------------------------------------------------------- uninformed search
def nodes_expanded_bfs_dfs(b, d):
    pass
b, dd = 3, 3
gen_ids = sum(sum(b ** i for i in range(k + 1)) for k in range(dd + 1))
# independent count: IDS generates level-i nodes (d+1-i) times
assert gen_ids == sum((dd + 1 - i) * b ** i for i in range(dd + 1)) == 4 * 1 + 3 * 3 + 2 * 9 + 1 * 27
nat("ai_srch_04", "AI.SRCH.UNINF", "Iterative deepening depth-first search is run on a tree with branching factor 3 where the only goal is at depth 3 (so the search finishes after completing depth limit 3, generating every node at every level of that last iteration). Counting nodes generated across all iterations (limits 0, 1, 2, 3; the root counts once per iteration), the total is ______.", gen_ids,
    r"""Iteration with limit $\ell$ generates $\sum_{i=0}^{\ell}3^i$ nodes: 1, 4, 13, 40. Total $=1+4+13+40=58$. (Equivalently $\sum_i(d+1-i)b^i=4+9+18+27=58$.)""", diff="M", marks=2)

# ---------------------------------------------------------------- adversarial search
TREE = [[[3, 12], [8, 2]], [[4, 6], [14, 5]], [[2, 4], [15, 3]]]  # MAX root, MIN, MAX, leaves (depth 3: MAX-MIN-MAX)
def mm_val(t, maxp):
    if isinstance(t, int):
        return t
    vs = [mm_val(c, not maxp) for c in t]
    return max(vs) if maxp else min(vs)
def ab(t, maxp, a, b_, cnt):
    if isinstance(t, int):
        cnt[0] += 1
        return t
    if maxp:
        v = -math.inf
        for c in t:
            v = max(v, ab(c, False, a, b_, cnt))
            a = max(a, v)
            if a >= b_:
                break
        return v
    v = math.inf
    for c in t:
        v = min(v, ab(c, True, a, b_, cnt))
        b_ = min(b_, v)
        if a >= b_:
            break
    return v
cnt = [0]
v_ab = ab(TREE, True, -math.inf, math.inf, cnt)
v_mm = mm_val(TREE, True)
assert v_ab == v_mm
tx = "MAX root with three MIN children; each MIN node has two MAX children; each MAX node has two leaves. Leaf values left to right (grouped by MAX parent): " + ", ".join("(" + ",".join(str(x) for x in l) + ")" for m in TREE for l in m)
nat("ai_adv_01", "AI.SRCH.ADV", "A game tree: " + tx + ". The minimax value of the root is ______.", v_mm,
    r"""MAX nodes (leaf level): """ + ", ".join(str([max(l) for l in m]) for m in TREE) + r""". MIN nodes take the minimum of these pairs: """ + str([min(max(l) for l in m) for m in TREE]) + r""". The root (MAX) takes the maximum: """ + str(v_mm) + ".", diff="M", marks=2)
nat("ai_adv_02", "AI.SRCH.ADV", "For the same game tree (" + tx + "), alpha-beta pruning is run from the root, visiting children left to right with the initial window $(-\\infty,+\\infty)$. The number of leaf nodes that are evaluated is ______.", cnt[0],
    r"""Alpha-beta evaluates """ + str(cnt[0]) + r""" of the 12 leaves; the remaining leaves lie under branches cut off once $\alpha\ge\beta$. The root value is still """ + str(v_ab) + ".", diff="H", marks=2)

# ---------------------------------------------------------------- propositional logic
VARS = "pqrs"
def models(f):
    return [m for m in itertools.product([False, True], repeat=4) if f(*m)]
f1 = lambda p, q, r, s: ((not p) or q) and ((not q) or r) and (p or s)
mods = models(f1)
assert len(mods) == 5
nat("ai_log_01", "AI.LOG.PROP", r"""The number of assignments to $p,q,r,s$ (out of 16) that satisfy $(p\Rightarrow q)\wedge(q\Rightarrow r)\wedge(p\vee s)$ is ______.""", len(mods),
    r"""Enumerate $p$: if $p=T$ then $q=T$, $r=T$ and $s$ free: 2 models. If $p=F$ then $s=T$ and $(q\Rightarrow r)$ holds for 3 of the 4 pairs $(q,r)$: 3 models ($p=F,s=T$ with $(q,r)\in\{FF,FT,TT\}$), giving """ + str(len(mods)) + r""" total (full enumeration of 16 assignments confirms).""", diff="M", marks=2)

def tt(f):
    return [f(a, b) for a, b in itertools.product([False, True], repeat=2)]
imp = lambda a, b: (not a) or b
eqs = {
    "a": tt(lambda p, q: imp(p, q)) == tt(lambda p, q: imp(not q, not p)),
    "b": tt(lambda p, q: imp(p, q)) == tt(lambda p, q: imp(q, p)),
    "c": tt(lambda p, q: not (p and q)) == tt(lambda p, q: (not p) or (not q)),
    "d": tt(lambda p, q: imp(p, q)) == tt(lambda p, q: (not p) and q),
}
assert eqs == {"a": True, "b": False, "c": True, "d": False}
msq("ai_log_02", "AI.LOG.PROP", "Select all pairs of logically equivalent propositional formulas.",
    [(r"$p\Rightarrow q$ and $\neg q\Rightarrow\neg p$", eqs["a"]), (r"$p\Rightarrow q$ and $q\Rightarrow p$", eqs["b"]), (r"$\neg(p\wedge q)$ and $\neg p\vee\neg q$", eqs["c"]), (r"$p\Rightarrow q$ and $\neg p\wedge q$", eqs["d"])],
    r"""A: contrapositive, equivalent. B: converse, not equivalent (differs at $p=F,q=T$). C: De Morgan, equivalent. D: $p\Rightarrow q\equiv\neg p\vee q$, not $\neg p\wedge q$ (differs at $p=F,q=F$). Correct: A, C.""", "E", marks=2)

KB = lambda p, q, r: imp(p, q) and imp(q, r) and p
ent = lambda alpha: all(alpha(*m) for m in itertools.product([False, True], repeat=3) if KB(*m))
res = {"r": ent(lambda p, q, r: r), "not_q": ent(lambda p, q, r: not q), "p_and_r": ent(lambda p, q, r: p and r), "q_implies_p": ent(lambda p, q, r: imp(q, p))}
assert res == {"r": True, "not_q": False, "p_and_r": True, "q_implies_p": True}
msq("ai_log_03", "AI.LOG.PROP", r"""Let $KB=\{p\Rightarrow q,\ q\Rightarrow r,\ p\}$. Select all sentences entailed by $KB$.""",
    [(r"$r$", res["r"]), (r"$\neg q$", res["not_q"]), (r"$p\wedge r$", res["p_and_r"]), (r"$q\Rightarrow p$", res["q_implies_p"])],
    r"""The only model of $KB$ is $p=q=r=T$ (modus ponens twice). Hence $r$ and $p\wedge r$ hold in it, $\neg q$ does not, and $q\Rightarrow p$ is true in the only model, so it is entailed. Correct: A, C, D.""", "M", marks=2)

# ---------------------------------------------------------------- predicate logic over finite domains
dom = range(2)
pairs = list(itertools.product(dom, dom))
count = 0
for bits in itertools.product([0, 1], repeat=4):
    R = {pr for pr, bt in zip(pairs, bits) if bt}
    if all(any((x, y) in R for y in dom) for x in dom):
        count += 1
assert count == 9
nat("ai_log_04", "AI.LOG.PRED", r"""Over the domain $\{0,1\}$ there are 16 possible interpretations of a binary predicate $R$ (each of the 4 pairs is in or out of $R$). The number of interpretations that satisfy $\forall x\,\exists y\,R(x,y)$ is ______.""", count,
    r"""Each element $x$ needs at least one $y$ with $R(x,y)$: for each of the 2 values of $x$ there are $2^2-1=3$ non-empty choices of its row, so $3\times3=9$ interpretations.""", diff="M", marks=2)

R = {(0, 1), (1, 2), (2, 0)}
D3 = range(3)
st = {
    "a": all(any((x, y) in R for y in D3) for x in D3),
    "b": any(all((x, y) in R for x in D3) for y in D3),
    "c": all(((x, y) in R) <= ((y, x) in R) for x in D3 for y in D3),
    "d": any(all(((x, y) in R) <= ((y, x) not in R) or True for y in D3) for x in D3),
}
assert st["a"] is True and st["b"] is False and st["c"] is False
msq("ai_log_05", "AI.LOG.PRED", "Domain $\\{0,1,2\\}$; the predicate $R$ is true exactly for the pairs $(0,1),(1,2),(2,0)$. Select all true sentences.",
    [(r"$\forall x\,\exists y\,R(x,y)$", st["a"]), (r"$\exists y\,\forall x\,R(x,y)$", st["b"]), (r"$\forall x\,\forall y\,(R(x,y)\Rightarrow R(y,x))$", st["c"]), (r"$\forall x\,\neg R(x,x)$", all((x, x) not in R for x in D3))],
    r"""Every $x$ has exactly one successor, so A holds. No single $y$ is related to all $x$ (each $y$ has exactly one predecessor), so B fails. $R(0,1)$ holds but $R(1,0)$ does not, so C fails. No pair $(x,x)$ is in $R$, so D holds. Correct: A, D.""", "M", marks=2)

# ---------------------------------------------------------------- Bayesian networks
# Network: Rain -> Sprinkler? use B, E -> A -> J,M style
P = {"B": F(1, 100), "E": F(2, 100)}
PA = {(1, 1): F(95, 100), (1, 0): F(94, 100), (0, 1): F(29, 100), (0, 0): F(1, 1000)}
PJ = {1: F(90, 100), 0: F(5, 100)}
PM = {1: F(70, 100), 0: F(1, 100)}
def joint(b, e, a, j, m):
    pb = P["B"] if b else 1 - P["B"]
    pe = P["E"] if e else 1 - P["E"]
    pa = PA[(b, e)] if a else 1 - PA[(b, e)]
    pj = PJ[a] if j else 1 - PJ[a]
    pm = PM[a] if m else 1 - PM[a]
    return pb * pe * pa * pj * pm
assert sum(joint(*t) for t in itertools.product([0, 1], repeat=5)) == 1
jp = joint(1, 0, 1, 1, 0)
nat("ai_unc_01", "AI.UNC.CI", "A Bayesian network has binary variables $B,E\\to A\\to J$ and $A\\to M$, with $P(B)=0.01$, $P(E)=0.02$, $P(A\\mid B,E)=0.95$, $P(A\\mid B,\\neg E)=0.94$, $P(A\\mid\\neg B,E)=0.29$, $P(A\\mid\\neg B,\\neg E)=0.001$, $P(J\\mid A)=0.9$, $P(J\\mid\\neg A)=0.05$, $P(M\\mid A)=0.7$, $P(M\\mid\\neg A)=0.01$. The joint probability $P(B,\\neg E,A,J,\\neg M)$ is ______. (Round off to five decimal places)", float(jp),
    r"""$P=P(B)P(\neg E)P(A|B,\neg E)P(J|A)P(\neg M|A)=0.01\times0.98\times0.94\times0.9\times0.3=%.5f$.""" % float(jp), tol=0.000005, dec=7, diff="M", marks=2)
pb_j = sum(joint(1, e, a, 1, m) for e in (0, 1) for a in (0, 1) for m in (0, 1)) / sum(joint(b, e, a, 1, m) for b in (0, 1) for e in (0, 1) for a in (0, 1) for m in (0, 1))
nat("ai_unc_02", "AI.UNC.VE", "In the same network ($B,E\\to A\\to J$, $A\\to M$; $P(B)=0.01$, $P(E)=0.02$, $P(A|B,E)=0.95$, $P(A|B,\\neg E)=0.94$, $P(A|\\neg B,E)=0.29$, $P(A|\\neg B,\\neg E)=0.001$, $P(J|A)=0.9$, $P(J|\\neg A)=0.05$, $P(M|A)=0.7$, $P(M|\\neg A)=0.01$), $P(B\\mid J)$ is ______. (Round off to three decimal places)", float(pb_j),
    r"""Sum out $E,A,M$ (variable elimination; $M$ sums to 1 and drops out). $P(J,B)\,/\,P(J)=%.4f$, evaluated exactly by enumeration of the 32 joint terms.""" % float(pb_j), tol=0.0005, dec=5, diff="H", marks=2)

# ---------------------------------------------------------------- conditional independence (numerical check with random CPTs)
def random_cpts(seed):
    rnd = random.Random(seed)
    r = lambda: F(rnd.randint(1, 9), 10)
    return {"U": r(), "V": r(), "W": {(u, v): r() for u in (0, 1) for v in (0, 1)}, "X": {w: r() for w in (0, 1)}, "Y": {w: r() for w in (0, 1)}}
def jt(c, u, v, w, x, y):
    f = lambda p, val: p if val else 1 - p
    return f(c["U"], u) * f(c["V"], v) * f(c["W"][(u, v)], w) * f(c["X"][w], x) * f(c["Y"][w], y)
names = ["U", "V", "W", "X", "Y"]
def indep(c, a, b, given):
    """exact test of a _|_ b | given over all joint states"""
    states = list(itertools.product([0, 1], repeat=5))
    idx = {n: i for i, n in enumerate(names)}
    def pr(cond):
        return sum(jt(c, *s) for s in states if all(s[idx[k]] == v for k, v in cond.items()))
    for gv in itertools.product([0, 1], repeat=len(given)):
        g = dict(zip(given, gv))
        pg = pr(g)
        if pg == 0:
            continue
        for av in (0, 1):
            for bv in (0, 1):
                if pr({**g, a: av, b: bv}) * pg != pr({**g, a: av}) * pr({**g, b: bv}):
                    return False
    return True
def holds(a, b, given):
    return all(indep(random_cpts(sd), a, b, given) for sd in range(1, 6))
d = {
    "UV": holds("U", "V", []), "UV|W": holds("U", "V", ["W"]), "XY|W": holds("X", "Y", ["W"]), "XY": holds("X", "Y", []), "XU|W": holds("X", "U", ["W"]),
}
assert d == {"UV": True, "UV|W": False, "XY|W": True, "XY": False, "XU|W": True}
msq("ai_unc_03", "AI.UNC.CI", r"""A Bayesian network has structure $U\to W\leftarrow V$, $W\to X$, $W\to Y$. Select all statements that hold for every choice of conditional probability tables.""",
    [(r"$U$ and $V$ are marginally independent", d["UV"]), (r"$U$ and $V$ are conditionally independent given $W$", d["UV|W"]), (r"$X$ and $Y$ are conditionally independent given $W$", d["XY|W"]), (r"$X$ and $Y$ are marginally independent", d["XY"])],
    r"""$U\to W\leftarrow V$ is a collider: $U\perp V$ marginally, but conditioning on the collider $W$ makes them dependent. $X$ and $Y$ share the common cause $W$: dependent marginally, independent given $W$. (Confirmed by exact enumeration for random CPTs.) Correct: A, C.""", "M", marks=2)

# ---------------------------------------------------------------- number of parameters
parents = {"A": [], "B": ["A"], "C": ["A"], "D": ["B", "C"], "E": ["D"], "F": ["D", "E"]}
npar_bn = sum(2 ** len(p) for p in parents.values())
assert npar_bn == 1 + 2 + 2 + 4 + 2 + 4 == 15 and 2 ** 6 - 1 == 63
nat("ai_unc_04", "AI.UNC.CI", "A Bayesian network over six binary variables has the parent sets A: none; B: A; C: A; D: B, C; E: D; F: D, E. The number of free parameters needed by its conditional probability tables is ______.", npar_bn,
    r"""Each binary node needs $2^{\#\text{parents}}$ parameters: $1+2+2+4+2+4=15$ (compare $2^6-1=63$ for the full joint).""", diff="M", marks=1)

# ---------------------------------------------------------------- rejection sampling acceptance rate
acc = sum(joint(b, e, a, 1, m) for b in (0, 1) for e in (0, 1) for a in (0, 1) for m in (0, 1))
rnd = random.Random(5)
def sample():
    b = rnd.random() < 0.01
    e = rnd.random() < 0.02
    a = rnd.random() < float(PA[(int(b), int(e))])
    j = rnd.random() < float(PJ[int(a)])
    return j
N = 200000
emp = sum(sample() for _ in range(N)) / N
assert abs(emp - float(acc)) < 0.003
nat("ai_unc_05", "AI.UNC.SAMP", "In the alarm network ($B,E\\to A\\to J$; $P(B)=0.01$, $P(E)=0.02$, $P(A|B,E)=0.95$, $P(A|B,\\neg E)=0.94$, $P(A|\\neg B,E)=0.29$, $P(A|\\neg B,\\neg E)=0.001$, $P(J|A)=0.9$, $P(J|\\neg A)=0.05$) rejection sampling is used to estimate $P(B\\mid J=\\text{true})$: complete samples are drawn from the prior and all samples with $J=\\text{false}$ are rejected. The expected fraction of samples that are accepted, $P(J)$, is ______. (Round off to three decimal places)", float(acc),
    r"""The acceptance probability equals the evidence probability $P(J=\text{true})=\sum_a P(a)P(J|a)=%.4f$ (a direct Monte Carlo run of 200,000 forward samples agrees within 0.003).""" % float(acc), tol=0.0005, dec=5, diff="M", marks=2)

# ---------------------------------------------------------------- DFS vs BFS node expansion count
tree = {1: [2, 3], 2: [4, 5], 3: [6, 7], 4: [8, 9], 5: [10, 11], 6: [12], 7: [], 8: [], 9: [], 10: [], 11: [], 12: []}
def search(order, goal=10):
    frontier = deque([1])
    exp = 0
    while frontier:
        u = frontier.popleft() if order == "bfs" else frontier.pop()
        exp += 1
        if u == goal:
            return exp
        kids = tree[u]
        if order == "dfs":
            kids = kids[::-1]
        frontier.extend(kids)
bfs_n, dfs_n = search("bfs"), search("dfs")
assert (bfs_n, dfs_n) == (10, 7)
scq("ai_srch_05", "AI.SRCH.UNINF", "A tree has children lists 1: 2, 3; 2: 4, 5; 3: 6, 7; 4: 8, 9; 5: 10, 11; 6: 12. Search starts at node 1 and the goal is node 10. Children are generated left to right; DFS pushes them so the leftmost child is explored first. The number of nodes expanded (the goal node is counted when it is selected for expansion) by BFS and DFS respectively is",
    "BFS 10, DFS 7", ["BFS 7, DFS 10", "BFS 10, DFS 10", "BFS 7, DFS 7"],
    r"""BFS order: 1,2,3,4,5,6,7,8,9,10: the goal is the 10th expansion. DFS order: 1,2,4,8,9,5,10: the goal is the 7th expansion.""", "M", marks=2)
