"""In-line recomputation of numeric answers in the GATE DA fresh set (part C)."""
from fractions import Fraction as F
from math import ceil, comb, exp, log, log2, sqrt, floor
from . import la


def H(*c):
    t = sum(c); return -sum(x / t * log2(x / t) for x in c if x)


def c():
    o = {}
    v = [3, 7, 7, 10, 13, 16]; m = sum(v) / 6; sd = sqrt(sum((x - m) ** 2 for x in v) / 6); o[108] = (16 - m) / sd
    j = 0
    while 1000 / 10 ** j >= 1: j += 1
    o[109] = 735 / 10 ** j
    vals = [7, 12, 19, 23, 28, 31, 36, 44, 47, 52, 58, 67]; w = (67 - 7) / 5
    b = lambda x: min(int((x - 7) // w), 4)
    o[110] = sum(1 for x in vals if b(x) == b(31))
    o[113] = 4 * 4 * 3 * 2
    o[117] = 21 * 366 * 51
    # 118: strong 4 + weak 1 + multivalued 1 + M:N 1
    o[118] = 4 + 1 + 1 + 1
    # 121
    emp = [(1, "D1", 60), (2, "D1", 40), (3, "D1", 80), (4, "D2", 50), (5, "D2", 30), (6, "D2", None), (7, "D3", 90), (8, "D3", 30), (9, "D3", 60), (10, "D3", 70), (11, "D4", 45), (12, "D4", 45)]
    leads = {1, 3, 4, 5, 8, 7, 3, 6, 11, 12}
    cnt = {}
    for e, d, s in emp:
        sal = [x for _, dd, x in emp if dd == d and x is not None]
        if s is not None and s >= sum(sal) / len(sal) and e in leads: cnt[d] = cnt.get(d, 0) + 1
    o[121] = sum(1 for x in cnt.values() if x >= 2)
    # 123
    mgr = {1: None, 2: 1, 3: 1, 4: 2, 5: 2, 6: 4, 7: 3, 8: 6}
    gone = {2}; ch = True
    while ch:
        ch = False
        for e, mg in mgr.items():
            if mg in gone and e not in gone: gone.add(e); ch = True
    assign = [(1, "A"), (2, "A"), (4, "B"), (5, "C"), (6, "B"), (7, "C"), (8, "D"), (3, "D"), (5, "A")]
    o[123] = len(gone) + sum(1 for e, _ in assign if e in gone)
    bfr = 4096 // 300; blocks = ceil(50000 / 13); ib = ceil(blocks / (4096 // 20)); o[124] = ceil(log2(ib)) + 1
    p = max(p for p in range(1, 200) if 6 * p + 10 * (p - 1) <= 1024); q = max(q for q in range(1, 200) if 17 * q + 6 <= 1024)
    n = ceil(10 ** 6 / q); tot = 0
    while n > 1: n = ceil(n / p); tot += n
    o[125] = tot
    sxy = -sqrt(0.8 * 50 * 160); b1 = sxy / 50; o[127] = 20 - b1 * 4 + b1 * 6
    o[128] = float(la.solve([[5, 15, 15], [15, 55, 53], [15, 53, 55]], [39, 137, 136])[2])
    o[129] = 15 / 0.4 - 15
    w_ = log(3); b_ = -w_; o[131] = (log(4) - b_) / w_
    # 133
    V = ["win", "money", "now", "prize", "meeting", "project"]
    docs = [("spam", "win money now"), ("spam", "win win prize"), ("ham", "meeting now"), ("ham", "project meeting money")]
    def lik(cl):
        toks = [t for c_, d in docs if c_ == cl for t in d.split()]
        r = 0.5
        for wd in "win meeting money".split(): r *= (toks.count(wd) + 1) / (len(toks) + len(V))
        return r
    o[133] = lik("spam") / lik("ham")
    c1 = [1, 2, 3, 4]; c2 = [6, 8, 10]; m1, m2 = 2.5, 8
    s2 = (sum((x - m1) ** 2 for x in c1) + sum((x - m2) ** 2 for x in c2)) / 5
    o[134] = (m1 + m2) / 2 + s2 / (m2 - m1) * log(4 / 3)
    o[138] = 5 * (3 * 4 * 4 + 1)
    xs = [1, 3, 4, 6, 8, 10, 12]; cl = "AABABBA"; err = 0
    for i, x in enumerate(xs):
        nb = min((abs(x - y), y, cl[k]) for k, y in enumerate(xs) if k != i)
        err += nb[2] != cl[i]
    o[139] = err
    ch_ = [(5, 1), (1, 1), (0, 4)]; ent = sum((a + b) / 12 * H(a, b) for a, b in ch_)
    o[141] = (1 - ent) / -sum((a + b) / 12 * log2((a + b) / 12) for a, b in ch_)
    o[142] = (784 * 128 + 128) + (128 * 64 + 64) + (64 * 10 + 10)
    o[143] = 1 / (1 + exp(-(0.8 * max(0, .5 * 1 + 2) - 1.2 * max(0, 1 - 2 + .5) - 1.5)))
    a1 = 1 * 1.5 - .25 * 2; a2 = .2 * 1.5 + .4 * 2; z = 2 * max(a1, 0) - max(a2, 0); y = 1 / (1 + exp(-z))
    o[144] = (y - 1) * 2 * (a1 > 0) * 1.5
    o[145] = log(exp(3) + exp(1) + exp(.2)) - 1
    D = {("a", "b"): 2, ("a", "c"): 6, ("a", "d"): 10, ("a", "e"): 9, ("b", "c"): 5, ("b", "d"): 9, ("b", "e"): 8, ("c", "d"): 4, ("c", "e"): 5, ("d", "e"): 3}
    d = lambda x, y: D.get((x, y)) or D[(y, x)]
    avg = lambda A, B: sum(d(x, y) for x in A for y in B) / (len(A) * len(B))
    cs = [("a",), ("b",), ("c",), ("d",), ("e",)]; last = None
    while len(cs) > 1:
        best = min((avg(A, B), i, j) for i, A in enumerate(cs) for j, B in enumerate(cs) if i < j)
        last = best[0]; _, i, j = best; new = cs[i] + cs[j]; cs = [x for k, x in enumerate(cs) if k not in (i, j)] + [new]
    o[146] = last
    # 148: eigen of [[2,3],[3,10]]
    lam = 11; u = (1 / sqrt(10), 3 / sqrt(10)); zz = 2 * u[0] + u[1]
    assert abs((2 - lam) * u[0] + 3 * u[1]) < 1e-12 and abs(3 * u[0] + (10 - lam) * u[1]) < 1e-12
    o[148] = (2 - zz * u[0]) ** 2 + (1 - zz * u[1]) ** 2
    o[149] = sum((5 - k) * 3 ** k for k in range(5))
    o[153] = exp(-4 / (10 * 0.9 ** 5))
    o[154] = 4 ** 5 - (4 ** 3 + 4 ** 2 - 1)
    o[155] = sum(1 for p_ in (0, 1) for q_ in (0, 1) for r in (0, 1) for s in (0, 1) if (not p_ or q_ or r) and (s or (p_ and q_)) and (not r or not q_))
    return o
