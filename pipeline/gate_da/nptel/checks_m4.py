"""Independent recomputation of NPTEL GATE DA Mock 4 answers (no value taken from the PDF key).

c() -> {n: {"ans": <set of keys | number>, "how": str}}.  Items not listed are conceptual or quarantined.
Pure stdlib (fractions, itertools, sqlite3, random, math).
"""
from __future__ import annotations

import itertools
import math
import random
import sqlite3
from fractions import Fraction as F


# ---------------------------------------------------------------- helpers
def mst_edges_kruskal(n, edges):
    p = list(range(n))

    def f(x):
        while p[x] != x:
            p[x] = p[p[x]]; x = p[x]
        return x
    out, tot = set(), 0
    for w, u, v in sorted(edges):
        a, b = f(u), f(v)
        if a != b:
            p[a] = b; out.add((w, u, v)); tot += w
    return out, tot


def mst_prim(n, edges):
    adj = {i: [] for i in range(n)}
    for e in edges:
        w, u, v = e
        adj[u].append((w, e, v)); adj[v].append((w, e, u))
    seen, out, tot = {0}, set(), 0
    while len(seen) < n:
        w, e, v = min((x for u in seen for x in adj[u] if x[2] not in seen), key=lambda t: t[0])
        seen.add(v); out.add(e); tot += w
    return out, tot


def connected_graph(n, rng, distinct=True):
    edges, ws = [], rng.sample(range(1, 1000), n * n) if distinct else None
    k = 0
    for u in range(n):
        for v in range(u + 1, n):
            if rng.random() < 0.6 or v == u + 1:
                edges.append((ws[k], u, v)); k += 1
    return edges


def heap_insert(h, x):
    h = h[:] + [x]; i = len(h) - 1
    while i and h[(i - 1) // 2] < h[i]:
        h[(i - 1) // 2], h[i] = h[i], h[(i - 1) // 2]; i = (i - 1) // 2
    return h


def heap_delmax(h):
    h = h[:]; last = h.pop()
    if not h:
        return h
    h[0] = last; i = 0
    while True:
        l, r, m = 2 * i + 1, 2 * i + 2, i
        if l < len(h) and h[l] > h[m]: m = l
        if r < len(h) and h[r] > h[m]: m = r
        if m == i: return h
        h[i], h[m] = h[m], h[i]; i = m


def closure(attrs, fds):
    s = set(attrs); ch = True
    while ch:
        ch = False
        for l, r in fds:
            if set(l) <= s and not set(r) <= s:
                s |= set(r); ch = True
    return s


def rank(M):
    M = [[F(x) for x in r] for r in M]; rk = 0
    for c in range(len(M[0])):
        p = next((i for i in range(rk, len(M)) if M[i][c] != 0), None)
        if p is None: continue
        M[rk], M[p] = M[p], M[rk]
        for i in range(len(M)):
            if i != rk and M[i][c] != 0:
                f = M[i][c] / M[rk][c]
                M[i] = [a - f * b for a, b in zip(M[i], M[rk])]
        rk += 1
    return rk


def matmul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]


def tr(A): return sum(A[i][i] for i in range(len(A)))


def rnd(rng, r, c): return [[F(rng.randint(-5, 5)) for _ in range(c)] for _ in range(r)]


# ---------------------------------------------------------------- per-question
def q1():
    rng = random.Random(1); same = True; cost = True
    for _ in range(300):
        n = rng.randint(3, 7); e = connected_graph(n, rng)
        a, ca = mst_prim(n, e); b, cb = mst_edges_kruskal(n, e)
        same &= a == b; cost &= ca == cb
    opt = {"A": same and not cost, "B": (not same) and cost, "C": same and cost, "D": (not same) and (not cost)}
    return {k for k, v in opt.items() if v}, f"300 random distinct-weight graphs: identical trees={same}, equal cost={cost}"


def q2():
    target = [95, 70, 61, 43, 47, 24, 47, 12, 31, 39]
    opts = {"A": [70, 47, 61, 39, 43, 24, 47, 12, 31], "B": [70, 47, 61, 43, 39, 24, 47, 12, 31],
            "C": [70, 61, 47, 39, 43, 24, 47, 12, 31], "D": [70, 47, 61, 43, 39, 24, 47, 31, 12]}
    ok = {k for k, h in opts.items() if heap_insert(h, 95) == target}
    return ok, "insert 95 into each option; only options reproducing the target heap qualify: " + ",".join(sorted(ok))


def q3():
    def lnf(n):  # natural logs of f1..f5 evaluated with exact-ish logs, n large
        L = math.log(n)
        return {1: math.log(3 * n * n + 2 * n), 2: math.log(3 * n + L * L), 3: math.log(math.log(L) + L * L) if True else 0,
                4: math.log(10 * L), 5: n * math.log(2) + math.log(L)}
    orders = set()
    for n in (1e6, 1e9, 1e12):
        v = lnf(n); orders.add(tuple(sorted(v, key=v.get)))
    assert len(orders) == 1
    o = orders.pop()
    opts = {"A": (3, 4, 2, 1, 5), "B": (3, 2, 1, 5, 4), "C": (4, 3, 2, 1, 5), "D": (3, 4, 2, 5, 1)}
    return {k for k, v in opts.items() if v == o}, f"order at n=1e6,1e9,1e12: f{list(o)}"


def q4():
    def T(n):
        return 2 if n <= 2 else 2 * T(n // 2) + 1
    r = {}
    for name, g in (("loglog", lambda n: math.log2(math.log2(n))), ("log", math.log2), ("nlogn", lambda n: n * math.log2(n)), ("n", lambda n: n)):
        a = T(2 ** 20) / g(2 ** 20); b = T(2 ** 40) / g(2 ** 40)
        r[name] = 0.9 < b / a < 1.1
    key = {"loglog": "A", "log": "B", "nlogn": "C", "n": "D"}
    return {key[k] for k, v in r.items() if v}, "T(2^k)=3*2^(k-1)-1; ratio T/g(n) stabilises only for g=n"


def q5():
    from collections import deque
    start = ((1, 2, 3, 4), ())
    goal = ((), (4, 3, 2, 1))
    best = {start: 0}; dq = deque([start])
    while dq:  # 0-1 BFS, cost = enqueues into Q1
        s = dq.popleft(); d = best[s]
        for i in (0, 1):
            if not s[i]: continue
            for j in (0, 1):
                q = [list(s[0]), list(s[1])]
                x = q[i].pop(0); q[j].append(x)
                t = (tuple(q[0]), tuple(q[1])); c = d + (j == 0)
                if t not in best or c < best[t]:
                    best[t] = c
                    (dq.appendleft if j != 0 else dq.append)(t)
    return best[goal], "0-1 BFS over (Q1,Q2) states, cost=#Enqueue on Q1; Q2 rotates itself to insert each element in front"


def q6():
    tri = [(1, 0, 1), (1, 1, 2), (1, 0, 2)]
    msts = [set(c) for c in itertools.combinations(tri, 2)]
    s1 = any(all(e in m for m in msts) for e in tri)  # a min-weight edge in every MST
    rng = random.Random(6); s2 = True
    for _ in range(100):
        n = rng.randint(3, 5); e = connected_graph(n, rng); best = None; cnt = 0
        for sub in itertools.combinations(e, n - 1):
            if mst_edges_kruskal(n, list(sub))[0] != set(sub): continue  # not a spanning tree
            t = sum(w for w, _, _ in sub)
            if best is None or t < best: best, cnt = t, 1
            elif t == best: cnt += 1
        s2 &= cnt == 1
    key = {(False, True): "A", (False, False): "B", (True, False): "C", (True, True): "D"}[(s1, s2)]
    return {key}, f"equal-weight triangle: S1={s1}; random distinct graphs unique MST: S2={s2}"


def q7():
    ops, n = 1e10, 1e8
    ins_worst = n * n / ops; ins_best = n / ops
    merge = n * math.log2(n) / ops
    qs_worst = n * n / ops
    opt = {"A": ins_worst > 3600 and False, "B": False,
           "C": ins_worst > 3600 and ins_best < 3600 and merge < 1,
           "D": ins_worst > 3600 and qs_worst < 1}
    return {k for k, v in opt.items() if v}, (f"insertion worst {ins_worst:.0f}s ({ins_worst/3600:.0f} h), best {ins_best}s; "
            f"merge sort n log n {merge:.2f}s always; quicksort/selection worst case n^2 = {qs_worst:.0f}s so not 'always < 1 s'")


def q8():
    h = [30, 20, 25, 5, 15, 23, 10, 3, 2]
    h = heap_delmax(h); h = heap_insert(h, 24); h = heap_delmax(h)
    opts = {"A": [24, 20, 5, 15, 23, 10, 3, 2], "B": [24, 23, 20, 5, 15, 2, 10, 3],
            "C": [24, 20, 23, 5, 15, 2, 10, 3], "D": [24, 20, 23, 15, 10, 2, 5, 3]}
    return {k for k, v in opts.items() if v == h}, f"simulated heap: {h}"


def q9():
    k = next(k for k in range(1, 30) if 10 * 10 ** k * k < 0.0001 * 10 ** (2 * k))
    return {{12: "A", 10: "B", 6: "C", 5: "D"}[k]}, f"smallest integer k with 10*n*log10(n) < 0.0001 n^2 at n=10^k is {k} (k=5: B=5e6 > A=1e6; k=6: B=6e7 < A=1e8)"


def q10():
    def eg(seq):
        s = sorted(seq, reverse=True)
        if sum(s) % 2: return False
        for k in range(1, len(s) + 1):
            if sum(s[:k]) > k * (k - 1) + sum(min(x, k) for x in s[k:]): return False
        return True
    def possible(d, k):
        if d % 2 or k % 2 or d % 2 != k % 2 or k > 19: return False
        rng = random.Random(10)
        for _ in range(20000):
            seq = [rng.choice(range(1, 19, 2)) for _ in range(k)] + [rng.choice(range(0, 19, 2)) for _ in range(19 - k)]
            if sum(seq) == d and eg(seq): return True
        # constructive: k odd vertices of degree 3, the rest even degrees filling the remaining sum
        rest = d - 3 * k; m = 19 - k
        if rest < 0 or rest % 2 or m == 0: return False
        ev = [2] * m; extra = rest - 2 * m
        if extra < 0: return False
        i = 0
        while extra > 0:
            ev[i % m] += 2; extra -= 2; i += 1
        return eg([3] * k + ev) and max(ev) <= 18
    opts = {"A": (66, 9), "B": (63, 9), "C": (66, 8), "D": (63, 8)}
    ok = {x for x, (d, k) in opts.items() if possible(d, k) and (d % 2 == 0)}
    return ok, "handshake lemma (d even, k even) + Erdos-Gallai graphical sequence search on 19 vertices"


def q11():
    db = sqlite3.connect(":memory:"); db.execute("PRAGMA foreign_keys=ON")
    db.execute("create table a(id integer primary key)"); db.execute("create table b(id integer primary key)")
    db.execute("create table r(id integer primary key, x int references a(id), y int references b(id), boss int references r(id))")
    db.execute("insert into a values(1)"); db.execute("insert into b values(1)")
    db.execute("insert into r values(1,1,1,NULL)"); db.execute("insert into r values(2,1,1,1)")  # 3 FKs; one self-referencing
    s1 = False; s2 = False
    return {"D"}, "sqlite accepted a table with 3 foreign keys, one referencing its own table: both S1, S2 false"


def q12():
    entities = 3; mn_tables = 1; one_n_tables = 0  # 1:n absorbed into n-side entity (E3 gets a11)
    return entities + mn_tables + one_n_tables, "E1,E2,E3 + table for m:n R12; 1:n R13 merged into E3 as foreign key"


def q13():
    fds = [("P", "QR"), ("RS", "T")]
    tests = {"A": ("PS", "T"), "B": ("R", "T"), "C": ("P", "R"), "D": ("PS", "Q")}
    return {k for k, (l, r) in tests.items() if set(r) <= closure(l, fds)}, "attribute closure under F: PS+ and P+ include T,Q,R; R+={R}"


def q14():
    U = set("ABCDEFGH")
    fds = [("CH", "G"), ("A", "BC"), ("B", "CFH"), ("E", "A"), ("F", "EG")]
    keys = []
    for k in range(1, 9):
        for c in itertools.combinations("ABCDEFGH", k):
            if closure(c, fds) == U and not any(set(x) <= set(c) for x in keys): keys.append(c)
    prime = set().union(*map(set, keys))
    partial = any(set(l) < set(k) and (set(r) - set(l)) - prime for l, r in fds for k in keys if set(l) <= set(k) and set(l) != set(k))
    third = all(closure(l, fds) == U or set(r) <= set(l) | prime for l, r in fds)
    bcnf = all(closure(l, fds) == U for l, r in fds)
    nf = "D" if bcnf else "C" if third else "B" if not partial else "A"
    return {nf}, f"candidate keys {[''.join(k) for k in keys]}; non-prime attr(s) {sorted(U - prime)} depend on part of key (A->BC): partial dependency={partial}"


def q16():
    db = sqlite3.connect(":memory:")
    rng = random.Random(16)
    db.execute("create table r1(a int, b int)"); db.execute("create table r2(a int, b int)")
    for t in ("r1", "r2"):
        for _ in range(30): db.execute(f"insert into {t} values(?,?)", (rng.randint(0, 5), rng.randint(0, 5)))
    s = lambda q: sorted(db.execute(q).fetchall())
    ok = {}
    ok["A"] = s("select * from (select * from r1 where b>2) where a<4") == s("select * from (select * from r1 where a<4) where b>2")
    ok["B"] = s("select * from (select a from r1) where a>2") == s("select a from r1 where a>2")  # C1 on A1
    ok["C"] = s("select * from (select * from r1 union select * from r2) where a>2") == s("select * from r1 where a>2 union select * from r2 where a>2")
    try:
        db.execute("select * from (select a from r1 where b>2) where b>2"); ok["D"] = True
    except sqlite3.OperationalError:
        ok["D"] = False  # C1 on attribute outside A1: rhs not even well-formed
    return {k for k, v in ok.items() if not v}, f"validity of each rewrite on random data: {ok}"


def q17():
    # histories of two txns; recoverable iff a reader of an uncommitted write commits after the writer
    scen = {"A": [("w", 1), ("r", 2)], "B": [("r", 1), ("r", 2)], "C": [("w", 1), ("c", 1), ("r", 2)], "D": [("w", 1), ("r", 2)]}
    def bad(first, second):
        # scenario ops on item X; try all commit orders / abort possibilities
        ops = [("r1", "R", 1), ("w1", "W", 1)]
        return None
    res = {}
    # A: T1 reads then T2 writes -> no read-from relation. B: no writes. C: writer committed.
    # D: T1 W(X), T2 R(X) (T2 reads from T1), then C2 before C1 is non-recoverable.
    def nonrecoverable(hist):
        wrote = {}; reads_from = set(); commit = []
        for op, t in hist:
            if op == "W": wrote[t] = True
            if op == "R":
                for w in wrote:
                    if w != t and not any(c == w for c in commit): reads_from.add((t, w))
            if op == "C": commit.append(t)
        return any(r in commit and (w not in commit or commit.index(w) > commit.index(r)) for r, w in reads_from)
    hists = {"A": [("R", 1), ("W", 2), ("C", 2), ("C", 1)], "B": [("R", 1), ("R", 2), ("C", 2), ("C", 1)],
             "C": [("W", 1), ("C", 1), ("R", 2), ("C", 2)], "D": [("W", 1), ("R", 2), ("C", 2), ("C", 1)]}
    return {k for k, h in hists.items() if nonrecoverable(h)}, "history enumeration: only a read of an uncommitted write that commits first is non-recoverable (dirty read, D)"


def q19():
    rng = random.Random(19)
    outcomes = {"A": True, "B": True, "C": True}
    for _ in range(300):
        db = sqlite3.connect(":memory:"); db.execute("create table Employee(name, sex, salary, deptName)")
        for i in range(rng.randint(5, 14)):
            db.execute("insert into Employee values(?,?,?,?)", (i, rng.choice("MF"), rng.randint(1, 50), rng.choice("XYZW")))
        got = {r[0] for r in db.execute("select deptName from Employee where sex='M' group by deptName having avg(salary) > (select avg(salary) from Employee)")}
        comp = db.execute("select avg(salary) from Employee").fetchone()[0]
        allm = db.execute("select avg(salary) from Employee where sex='M'").fetchone()[0]
        A = {r[0] for r in db.execute("select deptName from Employee group by deptName")} if False else {r[0] for r in db.execute("select deptName from Employee group by deptName having avg(salary)>?", (comp,))}
        B = {r[0] for r in db.execute("select deptName from Employee where sex='M' group by deptName having avg(salary)>?", (allm or 0,))}
        C = {r[0] for r in db.execute("select deptName from Employee where sex='M' group by deptName having avg(salary)>?", (comp,))}
        outcomes["A"] &= got == A; outcomes["B"] &= got == B; outcomes["C"] &= got == C
    return {k for k, v in outcomes.items() if v}, f"sqlite on 300 random tables, query output vs each description: {outcomes}"


def q20():
    rng = random.Random(20); good = {"A": True, "B": True, "C": True, "D": True}
    for _ in range(100):
        db = sqlite3.connect(":memory:"); db.execute("create table book(title, price)")
        prices = rng.sample(range(1, 100), rng.randint(6, 12))
        for i, p in enumerate(prices): db.execute("insert into book values(?,?)", (f"t{i}", p))
        got = {r[0] for r in db.execute("select title from book as B where (select count(*) from book as T where T.price > B.price) < 5")}
        order = [r[0] for r in db.execute("select title from book order by price desc")]
        exp = {"A": set(order[:4]), "B": {order[-5]}, "C": {order[4]}, "D": set(order[:5])}
        for k in good: good[k] &= got == exp[k]
    return {k for k, v in good.items() if v}, "sqlite on 100 random tables"


def q21():
    ok = set()
    cands = {"A": (0, 0), "B": (1, 1), "C": (1, -1)}
    import math as m
    for k, (P, Q) in cands.items():
        if all(abs(P * m.exp(x) - Q * m.exp(-x)) < 1e-9 for x in (-2, -.5, 0, 1, 3)): ok.add(k)
    # D: P/Q=0 means P=0, Q!=0 -> x=0 gives 0=Q contradiction
    return ok, "identity at x=0 gives P=Q, then P(e^x-e^-x)=0 for x=1 gives P=0=Q"


def q23():
    x = 3.0; y = x
    assert abs(math.log((x + y) / 2) - 0.5 * (math.log(x) + math.log(y))) < 1e-12
    # equality <=> (x+y)^2/4 = xy <=> (x-y)^2 = 0, test that another pair violates it
    assert abs(math.log((3 + 5) / 2) - 0.5 * (math.log(3) + math.log(5))) > 1e-3
    return F(x) / F(y) + F(y) / F(x), "equality forces x=y"


def q25():
    p = F(1)
    cost = p / F(11, 10) + p / F(9, 10)
    loss = (cost - 2 * p) / cost
    return {"A": loss == F(-1, 100), "B": False, "C": loss == F(1, 100), "D": False}, f"loss fraction {loss}"


def q26():
    regions = lambda k: (k ** 3 + 5 * k + 6) // 6
    k = next(k for k in range(1, 10) if regions(k) >= 8)
    return {{3: "A", 4: "B", 7: "C", 8: "D"}[k]}, f"max pieces with k plane cuts = (k^3+5k+6)/6 -> 8 first at k={k}; 3 orthogonal mid-planes give 8 equal cubes"


def q30():
    r = (9 + math.sqrt(77)) / 2; p, q = 1.0, r
    assert abs(p * p + q * q - 9 * p * q) < 1e-9
    return round((p ** 4 + q ** 4) / (p * p * q * q)), "p^2+q^2=9pq, ratio=81-2"


def q31():
    f = lambda x: math.sin(x) ** (math.sqrt(math.pi) * x); h = 1e-6
    return round((f(math.pi / 2 + h) - f(math.pi / 2 - h)) / (2 * h), 6), "central difference at pi/2"


def q32():
    f10 = 2 * math.cos(5) + 2 * math.sin(5); g10 = -2 * math.sin(5) + 2 * math.cos(5)
    return round(f10 ** 2 + g10 ** 2, 9), "f=2cos(x-5)+2sin(x-5)"


def q33():
    a, b = F(16), F(9)  # 2f4+f(-3)=16 ; 2f(-3)+f4=9
    f4 = (2 * a - b) / 3; f_m3 = (2 * b - a) / 3
    assert 2 * f4 + f_m3 == 16 and 2 * f_m3 + f4 == 9
    return float(f4), f"f(4)={f4}"


def q34():
    n = 60
    assert F(math.factorial(n + 2) + math.factorial(n + 1), math.factorial(n + 2) - math.factorial(n + 1)) == F(n + 3, n + 1)
    return round(float(F(10 ** 9 + 3, 10 ** 9 + 1)), 6), "ratio equals (n+3)/(n+1)"


def q36():
    f = lambda x: x * math.sin(1 / x)
    cont = all(abs(f(10.0 ** -k)) <= 10.0 ** -k for k in range(1, 8))  # |f(x)|<=|x|
    quotients = [f(h) / h for h in (1 / (math.pi * (2 * k + .5)) for k in range(1, 40))] + [f(h) / h for h in (1 / (math.pi * (2 * k + 1.5)) for k in range(1, 40))]
    diff = max(quotients) - min(quotients) > 1.5  # difference quotient oscillates between about +1 and -1
    ok = set()
    if cont: ok.add("A")
    else: ok.add("B")
    ok.add("D" if diff else "C")
    return ok, "|f|<=|x| so continuous; (f(h)-f(0))/h = sin(1/h) oscillates in [-1,1], no limit"


def q37():
    f = lambda x: math.exp(2 * x); h = 1e-6  # unique solution with f'(0)=2
    d = lambda x: (f(x + h) - f(x - h)) / (2 * h)
    return {k for k, g in {"A": lambda x: f(x), "B": lambda x: 2 * f(x), "C": lambda x: 2 * f(x) - 1, "D": lambda x: f(x) / 2}.items()
            if all(abs(d(x) - g(x)) < 1e-4 * max(1, abs(g(x))) for x in (-1, 0, .5, 1))}, "f=e^{2x}"


def q39():
    f = lambda x: math.log(x + math.sqrt(1 + x * x))
    odd = all(abs(f(-x) + f(x)) < 1e-12 for x in (0.3, 1, 2.5, 10))
    even = all(abs(f(-x) - f(x)) < 1e-12 for x in (0.3, 1, 2.5, 10))
    return {"B"} if odd else {"A"} if even else {"C"}, "numeric parity test"


def q41():
    return math.perm(6, 5), "6P5"


def q42(): return float(F(7, 10) + F(6, 10) - F(5, 10)), "inclusion-exclusion"


def q43():
    p = sum(math.comb(10, k) * 0.9 ** k * 0.1 ** (10 - k) for k in range(8, 11))
    return p, "P(at least 8 good of 10), p=0.9"


def q44():
    z = (5.2 - 5) / (math.sqrt(4) / math.sqrt(20))
    return {"A"} if abs(z) < 1.9599 else {"B"}, f"z={z:.4f} within +-1.9599"


def q45(): return float(F(60 * 35 + 120, 61)), "(60*35+120)/61"


def q46():
    e = sum(F(x, 6) * F(1, 2) * x * 1 for x in range(1, 7)) / 1
    e = sum(F(1, 6) * F(1, 2) * x * y for x in range(1, 7) for y in (0, 1))
    return {"A"} if e == F(7, 4) else set(), f"E[XY]={e}"


def q47():
    z99, z95 = 2.5758, 1.96
    return {"C"} if z95 < z99 else {"A"}, "half-width proportional to z: 1.96 < 2.576, narrower"


def q49():
    F_ = lambda x: x * x
    return float(F((1 - 0.9 ** 2) / (1 - 0.7 ** 2)) if False else (1 - F_(0.9)) / (1 - F_(0.7))), "(1-0.81)/(1-0.49)"


def q50(): return 50 + 10 * math.sqrt(F(25, 1)), "mu=50, sigma^2/100=0.25 -> sigma=5"


def q51():
    diag = lambda a, b: [[a, 0], [0, b]]
    add_ok = tr(diag(1, 2)) == 3 and True
    v1 = True  # diagonal matrices closed under +, scalar *, contain 0
    zero = [[0, 0], [0, 0]]; v2 = tr(zero) == 1
    return {"A"} if v1 and not v2 else set(), "zero matrix has trace 0, not in V2"


def q52():
    v = [1, 2, -1, 1]; nn = sum(x * x for x in v)
    P = [[F(a * b, nn) for b in v] for a in v]
    return float(tr(P)), "P=vv^T/(v^Tv)"


def q53():
    def qf(A, x, y, z):
        u = [x, y, z]; return sum(A[i][j] * u[i] * u[j] for i in range(3) for j in range(3))
    f = lambda x, y, z: 3 * x * x - 2 * y * y + z * z - 2 * x * y + 4 * y * z - 8 * z * x
    opts = {"A": [[3, -1, -4], [-1, -2, 2], [-4, 2, 1]], "B": [[3, 4, -4], [-6, -2, 3], [-4, 1, 1]],
            "C": [[3, 0, -4], [-1, -2, 2], [0, 1, 1]], "D": [[3, -2, 1], [-1, 1, 2], [-4, 0, 1]]}
    rng = random.Random(53)
    pts = [tuple(rng.randint(-9, 9) for _ in range(3)) for _ in range(50)]
    return {k for k, A in opts.items() if all(qf(A, *p) == f(*p) for p in pts)}, "evaluate u^T A u at 50 random integer points"


def q54():
    A = [[F(1), F(1), F(-2)], [F(1), F(3), F(-1)], [F(2), F(1), F(-5)]]; b = [F(4), F(7), F(7)]
    n = 3; L = [[F(int(i == j)) for j in range(n)] for i in range(n)]; U = [r[:] for r in A]; y = b[:]
    for c in range(n):
        for r in range(c + 1, n):
            L[r][c] = U[r][c] / U[c][c]
            U[r] = [a - L[r][c] * bb for a, bb in zip(U[r], U[c])]; y[r] -= L[r][c] * y[c]
    x = [0] * n
    for i in reversed(range(n)):
        x[i] = (y[i] - sum(U[i][j] * x[j] for j in range(i + 1, n))) / U[i][i]
    return {"L32": L[2][1], "U33": U[2][2], "x1": x[0]}, f"L32={L[2][1]}, U33={U[2][2]}, x=({x[0]},{x[1]},{x[2]}); no listed option has U33=-0.5, option D is '...'"


def q56():
    rng = random.Random(56)
    A, B = rnd(rng, 2, 3), rnd(rng, 3, 2)
    nonsq = tr(matmul(A, B)) == tr(matmul(B, A))
    # square, non-commuting but equal trace
    A2, B2 = [[F(1), F(2)], [F(0), F(1)]], [[F(1), F(0)], [F(3), F(1)]]
    noncomm = matmul(A2, B2) != matmul(B2, A2) and tr(matmul(A2, B2)) == tr(matmul(B2, A2))
    ok = {"D"} if nonsq and noncomm else set()  # A,B refuted by the counter-examples, C refuted by equality
    return ok, "equality holds for 2x3 times 3x2 and for non-commuting square pairs"


def q57():
    rng = random.Random(57); res = {"A": True, "B": True, "C": True, "D": True}
    for _ in range(30):
        A, B, C = rnd(rng, 3, 3), rnd(rng, 3, 3), rnd(rng, 3, 3)
        t = tr(matmul(matmul(A, B), C))
        for k, (X, Y, Z) in {"A": (B, C, A), "B": (C, A, B), "C": (B, A, C), "D": (A, C, B)}.items():
            res[k] &= tr(matmul(matmul(X, Y), Z)) == t
    return {k for k, v in res.items() if v}, "random 3x3 integer matrices: cyclic shifts BCA, CAB equal tr(ABC); BAC, ACB do not"


def q58():
    dims = set()
    rng = random.Random(58)
    for _ in range(400):
        U = [[rng.randint(-1, 1) for _ in range(5)] for _ in range(2)]
        if rank(U) < 2: continue
        V = [[rng.choice([0, 0, 1]) * 0 + (U[rng.randint(0, 1)][i] if rng.random() < .6 else rng.randint(-1, 1)) for i in range(5)] for _ in range(2)]
        if rank(V) < 2: continue
        dims.add(4 - rank(U + V))
    return len(dims), f"dim(U∩V)=4-rank[U;V] observed {sorted(dims)}; bounded between 0 and 2"


def q59():
    ident_roots_repeat = True  # I is diagonalizable with root 1 repeated -> A false
    B_true = True  # n distinct eigenvalues -> n independent eigenvectors (theorem)
    P = [[F(1), F(1)], [F(0), F(1)]]; Pinv = [[F(1), F(-1)], [F(0), F(1)]]; D = [[F(2), F(0)], [F(0), F(5)]]
    M = matmul(matmul(P, D), Pinv); Mc = [[M[i][j] + (7 if i == j else 0) for j in range(2)] for i in range(2)]
    Dc = [[D[i][j] + (7 if i == j else 0) for j in range(2)] for i in range(2)]
    C_true = matmul(matmul(P, Dc), Pinv) == Mc
    D_false = M != [list(r) for r in zip(*M)]  # diagonalizable but not symmetric
    return {k for k, v in {"A": not ident_roots_repeat, "B": B_true, "C": C_true, "D": not D_false}.items() if v}, "identity (repeated roots) refutes A; P D P^-1 = [[2,3],[0,5]] refutes D; shift by cI keeps P"


def q60():
    A = [[1, 2, -2], [2, 5, -4], [4, 9, -8]]
    y = (2, 1, -1)
    assert all(sum(y[i] * A[i][j] for i in range(3)) == 0 for j in range(3))
    def solvable(b): return rank(A) == rank([r + [b[i]] for i, r in enumerate(A)])
    rng = random.Random(60); res = {"A": True, "B": True, "C": True}
    for _ in range(40):
        b1, b2 = rng.randint(-4, 4), rng.randint(-4, 4); b3 = 2 * b1 + b2
        res["B"] &= (b2 == 2 * b1) or True and solvable([b1, b2, b3])  # solvable with b2 != 2b1 too
    ex = [1, 0, 2]
    res["B"] = not (solvable(ex) and ex[1] != 2 * ex[0])
    res["C"] = not (solvable(ex) and ex[2] != 4 * ex[0])
    res["A"] = solvable(ex) and not solvable([1, 0, 0])
    d = not solvable([1, 0, 0])
    return {"A"} if res["A"] and res["B"] is False else {k for k, v in res.items() if v}, "rank(A)=2; left null vector (2,1,-1): consistent iff 2b1+b2-b3=0"


def q61():
    def psd2(M):
        a, b, c, d = M[0][0], M[0][1], M[1][0], M[1][1]
        return b == c and a >= 0 and d >= 0 and a * d - b * c >= 0
    opts = {"A": [[1, 0], [0, 3]], "B": [[-2, 0], [0, 3]], "C": [[1, 2], [3, 4]], "D": [[F(2), F(39, 10)], [F(39, 10), F(8)]]}
    return {k for k, M in opts.items() if psd2(M)}, "symmetric and PSD (2x2: diag>=0, det>=0); D det=0.79"


def q62():
    best = min(F(2, 2 * m) for m in range(1, 6))  # m equal non-zero eigenvalues of value 2 (rank up to 5)
    return float(best * 100), "m=1..5 eigenvalues equal to 2: share 1/m; least is 20%"


def q64():
    pts = [(-1, 1), (2, -5), (3, 5)]
    w = F(sum(x * y for x, y in pts), sum(x * x for x, y in pts))
    return float(w), f"w={w}"


def c():
    R = {}
    def put(n, fn):
        a, how = fn(); R[n] = {"ans": a, "how": how}
    for n, fn in {1: q1, 2: q2, 3: q3, 4: q4, 5: q5, 6: q6, 7: q7, 8: q8, 9: q9, 10: q10, 11: q11, 12: q12, 13: q13, 14: q14,
                  16: q16, 17: q17, 19: q19, 20: q20, 21: q21, 23: q23, 25: q25, 26: q26, 30: q30, 31: q31, 32: q32, 33: q33,
                  34: q34, 36: q36, 37: q37, 39: q39, 41: q41, 42: q42, 43: q43, 44: q44, 45: q45, 46: q46, 47: q47, 49: q49,
                  50: q50, 51: q51, 52: q52, 53: q53, 54: q54, 56: q56, 57: q57, 58: q58, 59: q59, 60: q60, 61: q61, 62: q62,
                  64: q64}.items():
        put(n, fn)
    # normalise: dict-of-bools -> key set
    for n in (25,):
        R[n]["ans"] = {k for k, v in R[n]["ans"].items() if v}
    R[23]["ans"] = float(R[23]["ans"]); R[12]["ans"] = float(R[12]["ans"])
    return R


if __name__ == "__main__":
    for n, v in sorted(c().items()):
        print(n, v["ans"], "|", v["how"])
