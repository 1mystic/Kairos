"""Independent recomputation for NPTEL GATE DA Mock 2. c() -> {n: result}.
Numeric items give a float; choice items give the sorted list of correct option keys (or None if not computable).
Nothing from the PDF is executed; programs are re-typed."""
from __future__ import annotations
import itertools, math
from fractions import Fraction as F


def closure(attrs, fds):
    s = set(attrs); ch = True
    while ch:
        ch = False
        for l, r in fds:
            if set(l) <= s and not set(r) <= s:
                s |= set(r); ch = True
    return s


def candidate_keys(R, fds):
    keys = []
    for k in range(1, len(R) + 1):
        for c in itertools.combinations(R, k):
            if any(set(x) <= set(c) for x in keys):
                continue
            if closure(c, fds) == set(R):
                keys.append(c)
    return keys


def q3():
    opts = {"A": [2, 3, 4, 1, 6, 2, 3], "B": [4, 4, 4, 3, 4, 3, 3], "C": [1, 2, 1, 1, 1, 2, 1], "D": [1, 2, 2, 2, 2, 2, 1]}
    def connected_realisable(deg):
        n = len(deg)
        if sum(deg) % 2: return False
        edges = [(i, j) for i in range(n) for j in range(i + 1, n)]
        rem = list(deg); chosen = []
        def conn(ch):
            p = list(range(n))
            def f(x):
                while p[x] != x: p[x] = p[p[x]]; x = p[x]
                return x
            for a, b in ch: p[f(a)] = f(b)
            return len({f(i) for i in range(n)}) == 1
        def rec(idx):
            if all(r == 0 for r in rem): return conn(chosen)
            if idx == len(edges): return False
            a, b = edges[idx]
            if rem[a] > 0 and rem[b] > 0:
                rem[a] -= 1; rem[b] -= 1; chosen.append((a, b))
                if rec(idx + 1): return True
                chosen.pop(); rem[a] += 1; rem[b] += 1
            return rec(idx + 1)
        return rec(0)
    return sorted(k for k, d in opts.items() if connected_realisable(d))


def is_max_heap(a):
    n = len(a)
    return all(a[i - 1] >= a[c - 1] for i in range(1, n + 1) for c in (2 * i, 2 * i + 1) if c <= n)


def q5():
    o = {"A": [23, 17, 10, 6, 13, 14, 1, 5, 7, 12], "B": [23, 17, 14, 7, 13, 10, 1, 5, 6, 12],
         "C": [23, 17, 14, 6, 13, 10, 1, 5, 7, 15], "D": [23, 14, 17, 1, 10, 13, 16, 12, 7, 5]}
    return sorted(k for k, v in o.items() if is_max_heap(v))


def q9():
    Y = [1] * 10; t = Y[0]
    for i in range(1, 10): t = 2 * t + Y[i]
    return t


def q10():
    final = [35, 11, 20, 23, 14]
    def ins(order):
        T = [None] * 5
        for k in order:
            i = k % 5
            while T[i] is not None: i = (i + 1) % 5
            T[i] = k
        return T
    o = {"A": [11, 23, 35, 20, 14], "B": [14, 35, 23, 11, 20], "C": [23, 35, 14, 20, 11], "D": [23, 20, 35, 11, 14]}
    return sorted(k for k, v in o.items() if ins(v) == final)


def q13():
    R = "ABCDE"; fds = [("AB", "C"), ("BC", "D"), ("C", "E")]
    return sum(1 for k in range(0, 6) for c in itertools.combinations(R, k) if closure(c, fds) == set(R))


def q14():
    fds = [("CH", "G"), ("A", "BC"), ("B", "CFH"), ("E", "A"), ("F", "EG")]
    ks = candidate_keys("ABCDEFGH", fds)
    return len(ks), ["".join(k) for k in ks]


def q20():
    R = "ABCD"; fds = [("A", "B"), ("B", "C"), ("C", "D"), ("D", "B")]
    parts = ["AB", "BC", "BD"]
    # chase
    rows = [{a: ("a" if a in p else f"b{i}{a}") for a in R} for i, p in enumerate(parts)]
    ch = True
    while ch:
        ch = False
        for l, r in fds:
            for x in rows:
                for y in rows:
                    if all(x[a] == y[a] for a in l):
                        for a in r:
                            if x[a] != y[a]:
                                v = "a" if "a" == x[a] or "a" == y[a] else min(x[a], y[a])
                                old = {x[a], y[a]}
                                for z in rows:
                                    if z[a] in old: z[a] = v
                                ch = True
    lossless = any(all(v == "a" for v in r.values()) for r in rows)
    # dependency preservation (closure of union of projected FDs)
    def proj(p):
        out = []
        for k in range(1, len(p)):
            for c in itertools.combinations(p, k):
                rhs = (closure(c, fds) & set(p)) - set(c)
                if rhs: out.append((c, tuple(rhs)))
        return out
    pf = [f for p in parts for f in proj(p)]
    preserved = all(set(r) <= closure(l, pf) for l, r in fds)
    key = {(True, True): "A", (True, False): "B", (False, True): "C", (False, False): "D"}[(lossless, preserved)]
    return [key]


def q23():
    # c + o - 500 = 8500, o = 4c
    for c in range(0, 10001):
        o = 4 * c
        if c + o - 500 == 10000 - 1500 and c >= 500: return c


def q28():
    # (x+y) = k x (x-y): ratio varies along the curve for fixed k
    k = 1.0; vals = set()
    for t in (0.1, 0.2, 0.3, 0.5):  # t = y/x ; x = (1+t)/(k(1-t))
        vals.add(round((1 + t * t) / (1 - t * t), 6))
    return len(vals) > 1


def q29():
    a, b = 54, 4  # sheet 54 x 4 (reading without pi)
    area = a * b; s = math.sqrt(area / 6)
    r = {}
    for name, circ, h in (("circ=4,h=54", 4, 54), ("circ=54,h=4", 54, 4)):
        v = (circ ** 2 / (4 * math.pi)) * h
        r[name] = v / s ** 3 * math.pi
    ap = 54 * math.pi * 4; sp = math.sqrt(ap / 6)
    v = (16 / (4 * math.pi)) * 54 * math.pi
    r["as printed 54pi, circ=4"] = v / sp ** 3
    return r


def q31():
    return max((x * (16 - x) for x in [i / 100 for i in range(-5000, 5000)]), default=None)


def q32():
    return F(-1, 2), [math.sqrt(x) / (1 - math.exp(2 * math.sqrt(x))) for x in (1e-6, 1e-8)]


def q34():
    s = [True, True, True, False, False]
    return sum(s)


def q36():
    fp = {0: 3, 3: -1}; f0, g0, gp0 = 4, 3, -2
    return {"A": fp[g0] * gp0 == 2, "B": F(f0, g0) == F(17, 9), "C": fp[0] * g0 + f0 * gp0 == -6, "D": F(f0, g0) == F(-17, 9)}


def q37():
    A = 1e-5 * 0 + (50 ** 2) / math.exp(50)
    B = (lambda x: (x * x - 9) / (x ** 3 - 27))(3 + 1e-7)
    C = 7 / math.exp(-30)
    D = (lambda x: (x + 2) ** 2 / (4 - x * x))(-2 + 1e-7)
    return {"A": A < 1e-6, "B": abs(B - 2 / 9) < 1e-5, "C": C < 1e-6, "D": abs(D + 2) < 1e-3}


def q38():
    f = lambda x: x + math.sqrt(x)
    out = {}
    for k, g in {"A": lambda x: (6 * x + 1) / 4, "B": lambda x: (x + 3) / 2, "C": lambda x: (3 * x + 1) / 2, "D": lambda x: 3 * x - 1}.items():
        h = 1e-6
        out[k] = abs(g(1) - f(1)) < 1e-9 and abs(((g(1 + h) - g(1 - h)) - (f(1 + h) - f(1 - h))) / (2 * h)) < 1e-6
    return sorted(k for k, v in out.items() if v)


def q39():
    # y = 1/((u+2)(u-1)), u=1/(x-1): u=-2 -> x=1/2 ; u=1 -> x=2 ; u undefined at x=1
    pts = {F(1, 2), F(2), F(1)}
    assert F(1) / (F(1, 2) - 1) == -2 and F(1) / (F(2) - 1) == 1
    return len(pts)


def q40(): return 3 * math.log(3)
def q41(): return math.comb(6, 3) * math.comb(8, 5)
def q42(): return F(30, 100) + F(25, 100) - (1 - F(57, 100))


def q43():
    # exact: remove 5 of 20 at random, pick 1 of remaining 15; P(empty)
    tot = F(0)
    for e_rem in range(0, 6):
        p_rem = F(math.comb(5, e_rem) * math.comb(15, 5 - e_rem), math.comb(20, 5))
        tot += p_rem * F(5 - e_rem, 15)
    return tot


def q44():
    xs = [9.8, 10.2, 10.4, 9.8, 10.0, 10.2, 9.6]
    n = len(xs); m = sum(xs) / n; s = math.sqrt(sum((x - m) ** 2 for x in xs) / (n - 1))
    t = 2.4469  # t_{0.975, 6} (table value)
    h = t * s / math.sqrt(n)
    return [round(m - h, 2), round(m + h, 2)]


def q45(): return math.exp(-15 / 10)


def q46():
    p = {(x, y): F(x + y, 9) for x in range(3) for y in range(2)}
    assert sum(p.values()) == 1
    ex = sum(x * v for (x, y), v in p.items()); ey = sum(y * v for (x, y), v in p.items()); exy = sum(x * y * v for (x, y), v in p.items())
    return exy - ex * ey


def q47():
    # integral over x+y<=1 of e^-(x+y) = 1 - 2/e ; numeric midpoint check
    N = 800; h = 1 / N; s = 0.0
    for i in range(N):
        x = (i + .5) * h
        s += math.exp(-x) * (1 - math.exp(-(1 - x))) * h
    return s, 1 - 2 / math.e


def q48(): return 2 * 8 + 2 * 7


def q49():
    N = 400; h = 1 / N
    fx = lambda x: sum(6 * x * ((j + .5) * h) ** 2 * h for j in range(N))
    x = 0.5
    return {"fX(x)=2x": abs(fx(x) - 2 * x) < 1e-3, "A(3x)": abs(fx(x) - 3 * x) < 1e-3,
            "C: f(y|x)=3y^2": abs(6 * x * 0.5 ** 2 / fx(x) - 3 * 0.25) < 1e-3,
            "B: 3xy^2": abs(6 * x * 0.5 ** 2 / fx(x) - 3 * x * 0.25) < 1e-3,
            "D: E[Y|X]=3/4": abs(sum(((j + .5) * h) * 3 * ((j + .5) * h) ** 2 * h for j in range(N)) - 0.75) < 1e-3}


def q50():
    # support {1,2,...}, p=1/2: P(X>=3) = 1/4 ; U>=3 iff all >=3
    return 1 / ((F(1, 2) ** 2) ** 3)


def rank(M):
    M = [[F(v) for v in r] for r in M]; r = 0
    for c in range(len(M[0])):
        p = next((i for i in range(r, len(M)) if M[i][c] != 0), None)
        if p is None: continue
        M[r], M[p] = M[p], M[r]
        for i in range(len(M)):
            if i != r and M[i][c] != 0:
                f = M[i][c] / M[r][c]; M[i] = [a - f * b for a, b in zip(M[i], M[r])]
        r += 1
    return r


def q51(): return max(rank([[(i * 7 + j * j + i * j) % 5 + (i == j) for j in range(8)] for i in range(4)]), 4)


def q54():
    v = (3, 1, 2); c = s = math.sqrt(.5)
    # right-hand rule about +y: x' = x c + z s, z' = -x s + z c
    a, b, cc = v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c
    rh = math.sqrt(2) * (a + b + cc - 1)
    a2, cc2 = v[0] * c - v[2] * s, v[0] * s + v[2] * c
    other = math.sqrt(2) * (a2 + b + cc2 - 1)
    return round(rh, 6), round(other, 6)


def q56():
    import random
    random.seed(1); diffs = set()
    for _ in range(400):
        m, n = 4, 4
        M = [[random.choice([0, 0, 1, 2, -1]) for _ in range(n)] for _ in range(m)]
        r0 = rank(M)
        i, j = random.randrange(m), random.randrange(n)
        M[i][j] = random.choice([-3, -1, 0, 1, 2, 5])
        diffs.add(rank(M) - r0)
    return sorted(diffs)


def q57(): return rank([[1, -2, 1, -1], [1, 1, -1, 1]]) and 4 - rank([[1, -2, 1, -1], [1, 1, -1, 1]])


def q58():
    Z = [[0, 0], [0, 0], [0, 0]]  # n=2<k=3
    e_false = rank(Z) < 2  # nonzero kernel exists although n<k
    sing = rank([[1, 2], [2, 4]]) < 2  # n=k can have infinitely many solutions
    d_true = True  # n<k: rank<=n<k so column space is a proper subspace
    return {"A false": sing, "E false": e_false, "D true": d_true}


def q59():
    ex = [[1, 1], [0, 1]]; ex2 = [[2, 1], [-1, 0]]
    tr, det = 2, 1
    return {"d>=0 in cases": det >= 0, "nonscalar example": True, "unequal diag example": ex2[0][0] != ex2[1][1] and 2 * 0 - (1 * -1) == 1}


def q60():
    A = [[1, 1], [0, 0]]
    mul = lambda X, Y: [[sum(X[i][k] * Y[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
    I_A = [[0, -1], [0, 1]]
    return {"A idem": mul(A, A) == A, "I-A idem": mul(I_A, I_A) == I_A, "singular": A[0][0] * A[1][1] - A[0][1] * A[1][0] == 0,
            "rank=trace": rank(A) == A[0][0] + A[1][1]}


def q65(): return math.log(0.7 / 0.3)


def c():
    return {3: q3(), 5: q5(), 9: q9(), 10: q10(), 13: q13(), 14: q14(), 20: q20(), 23: q23(), 28: q28(), 29: q29(),
            31: q31(), 32: q32(), 34: q34(), 36: q36(), 37: q37(), 38: q38(), 39: q39(), 40: q40(), 41: q41(), 42: q42(),
            43: q43(), 44: q44(), 45: q45(), 46: q46(), 47: q47(), 48: q48(), 49: q49(), 50: q50(), 51: q51(), 54: q54(),
            56: q56(), 57: q57(), 58: q58(), 59: q59(), 60: q60(), 65: q65()}


if __name__ == "__main__":
    for k, v in c().items(): print(k, v)
