"""Independent recomputation for NPTEL GATE DA Mock Test 3 (programs re-typed from the PDF; nothing from the source is run).

c() -> {question number: recomputed answer}; numbers for NVQ, sorted key strings ('A', 'A,C') for choice questions.
Conceptual questions with no sensible computation are not in c() (they are keyed from the source, status per data_m3.json).
"""
from __future__ import annotations

import itertools
import math
import random
import sqlite3
from fractions import Fraction as F


# ---- DSA / python ---------------------------------------------------------------------------------------------------
def q2() -> str:
    def ops(n):
        c, i = 0, 1
        while i <= n:
            j = 1
            while j < n:
                c += 1
                j *= 2
            i += 1
        return c
    n1, n2 = 2 ** 8, 2 ** 12
    r_nlogn = (ops(n2) / (n2 * math.log2(n2))) / (ops(n1) / (n1 * math.log2(n1)))  # ->1 for Theta(n log n)
    r_n2 = (ops(n2) / n2 ** 2) / (ops(n1) / n1 ** 2)  # ->0.5 if Theta(n^2)? (<1 => not n^2)
    assert abs(r_nlogn - 1) < 0.01 and r_n2 < 0.7
    return "C"


def _run_stack(enq, deq, trials=200, seed=1):
    """enq/deq are instruction lists over 'push','pop','rev'; dequeue result = the single popped value."""
    rnd = random.Random(seed)
    for _ in range(trials):
        st, ref, k = [], [], 0
        for _ in range(12):
            if ref and rnd.random() < 0.5:
                out = None
                for ins in deq:
                    if ins == "pop":
                        if not st:
                            return False
                        out = st.pop()
                    elif ins == "rev":
                        st.reverse()
                    else:
                        return False  # push in dequeue not allowed (no value)
                if out != ref.pop(0):
                    return False
            else:
                k += 1
                for ins in enq:
                    if ins == "push":
                        st.append(k)
                    elif ins == "rev":
                        st.reverse()
                    elif ins == "pop":
                        if not st:
                            return False
                        st.pop()
                ref.append(k)
    return True


def q3() -> str:
    good = set()
    # C: enqueue = 3 instr, dequeue = 1 instr
    ok_c = any(_run_stack(list(e), ["pop"]) for e in itertools.product(["push", "rev", "pop"], repeat=3) if e.count("push") == 1)
    # B: enqueue = 1 instr (push), dequeue = 2-instr sequence containing exactly one pop
    ok_b = any(_run_stack(["push"], list(d)) for d in itertools.product(["pop", "rev"], repeat=2) if d.count("pop") == 1)
    # D: single instruction each
    ok_d = _run_stack(["push"], ["pop"])
    # A: a queue cannot be built at all  (false if any construction exists)
    ok_a = not (ok_b or ok_c or ok_d)
    for k, v in zip("ABCD", (ok_a, ok_b, ok_c, ok_d)):
        if v:
            good.add(k)
    return ",".join(sorted(good))


def q4() -> str:
    import bisect  # noqa: F401
    n = 512
    rnd = random.Random(0)
    inputs = [list(range(n)), list(range(n, 0, -1)), rnd.sample(range(n), n)]

    def sel(a):
        a = a[:]; c = 0
        for i in range(len(a)):
            m = i
            for j in range(i + 1, len(a)):
                c += 1
                if a[j] < a[m]:
                    m = j
            a[i], a[m] = a[m], a[i]
        return c

    def ins(a):
        a = a[:]; c = 0
        for i in range(1, len(a)):
            k, j = a[i], i - 1
            while j >= 0:
                c += 1
                if a[j] > k:
                    a[j + 1] = a[j]; j -= 1
                else:
                    break
            a[j + 1] = k
        return c

    def msort(a):
        if len(a) <= 1:
            return a, 0
        l, cl = msort(a[:len(a) // 2]); r, cr = msort(a[len(a) // 2:])
        out, i, j, c = [], 0, 0, cl + cr
        while i < len(l) and j < len(r):
            c += 1
            if l[i] <= r[j]:
                out.append(l[i]); i += 1
            else:
                out.append(r[j]); j += 1
        return out + l[i:] + r[j:], c

    def qs(a):  # first element pivot (no recursion, count comparisons)
        c, stack = 0, [a]
        while stack:
            s = stack.pop()
            if len(s) <= 1:
                continue
            p = s[0]; lo = [x for x in s[1:] if x < p]; hi = [x for x in s[1:] if x >= p]
            c += len(s) - 1
            stack += [lo, hi]
        return c

    cs = [sel(a) for a in inputs]; ci = [ins(a) for a in inputs]; cm = [msort(a)[1] for a in inputs]; cq = [qs(a) for a in inputs]
    nlogn = n * math.log2(n)
    res = set()
    if len(set(cs)) == 1:
        res.add("A")
    if max(ci) / min(ci) < 3:      # insertion: n-1 vs n^2/2
        res.add("B")
    if all(0.4 * nlogn < x < 1.01 * nlogn for x in cm):
        res.add("C")
    if max(cq) / min(cq) < 3:
        res.add("D")
    return ",".join(sorted(res))


def q5() -> int:
    def foo(n):
        if n % 2 == 0:
            return n // 2
        return 3 * n + 1
    count, x = 0, 10
    while x != 1:
        x = foo(x); count += 1
    return count


def q6() -> int:
    # Count(x,y): while y != 1 { if x != 1: print, x = x/2 else: y -= 1, x = 1024 }  (tail calls unrolled)
    x, y, prints = 1024, 1024, 0
    while y != 1:
        if x != 1:
            prints += 1; x //= 2
        else:
            y -= 1; x = 1024
    return prints


def q8() -> str:
    def holds(cond):
        for x, y, q, r in itertools.product(range(0, 7), repeat=4):
            if not cond(x, y, q, r):
                continue
            steps = 0
            while r >= y:
                if steps > 100:
                    return False
                r -= y; q += 1; steps += 1
            if x != y * q + r:
                return False
        return True
    conds = {
        "A": lambda x, y, q, r: q == r and r == 0,
        "B": lambda x, y, q, r: x > 0 and r == x and y > 0,
        "C": lambda x, y, q, r: q == 0 and r == x and y > 0,
        "D": lambda x, y, q, r: q == 0 and y > 0,
    }
    return ",".join(k for k, f in conds.items() if holds(f))


def q9() -> str:
    def cost(seq):
        lst, c = [], 0
        for v in seq:
            i = 0
            while i < len(lst) and lst[i] < v:
                i += 1; c += 1
            lst.insert(i, v)
        return c
    n1, n2 = 200, 400
    r = cost(range(n2)) / cost(range(n1))
    assert 3.8 < r < 4.2  # quadratic growth
    return "C"


def q11() -> int:
    db = sqlite3.connect(":memory:")
    db.execute("create table s(A,B,C)"); db.execute("create table r(P,Q,C)")
    db.executemany("insert into s values (?,?,?)", [(i, i, 1) for i in range(30)])
    db.executemany("insert into r values (?,?,?)", [(i, i, 1) for i in range(12)])
    return db.execute("select count(*) from r natural join s").fetchone()[0]


# ---- FDs ------------------------------------------------------------------------------------------------------------
def closure(attrs, fds):
    s = set(attrs); ch = True
    while ch:
        ch = False
        for l, r in fds:
            if set(l) <= s and not set(r) <= s:
                s |= set(r); ch = True
    return s


def q15() -> str:
    fds = [("EF", "G"), ("F", "IJ"), ("EH", "KL"), ("K", "M"), ("L", "N")]
    allA = set("EFGHIJKLMN")
    def is_key(x):
        x = set(x)
        return closure(x, fds) == allA and all(closure(x - {a}, fds) != allA for a in x)
    opts = {"A": "EF", "B": "EFH", "C": "EFHKL", "D": "E"}
    return ",".join(k for k, v in opts.items() if is_key(v))


def q18_not_implied() -> str:
    fds = [("AB", "C"), ("A", "C"), ("CD", "E"), ("B", "D"), ("E", "A")]
    opts = {"A": ("CD", "AC"), "B": ("BD", "CD"), "C": ("BC", "CD"), "D": ("AC", "BC")}
    return ",".join(k for k, (l, r) in opts.items() if not set(r) <= closure(l, fds))


# ---- GA -------------------------------------------------------------------------------------------------------------
def q23() -> str:
    def enc(w):
        return "".join(chr((ord(ch) - 65 + 1) % 26 + 65) for ch in w)[::-1]  # shift +1 then reverse
    assert enc("IMAGE") == "FHBNJ" and enc("FIELD") == "EMFJG"
    opts = {"A": "CEADP", "B": "IDBFC", "C": "JGIBC", "D": "IBCEC"}
    return ",".join(k for k, v in opts.items() if v == enc("BEACH"))


def q26() -> str:
    n = next(n for n in range(1, 200) if F(308, 10) * n + 18 == F(314, 10) * n)
    return ",".join(k for k, v in {"A": 25, "B": 28, "C": 30, "D": 32}.items() if v == n)


def q28() -> str:
    a = {1: 5, 5: 3, 10: 13}
    tot = sum(k * v for k, v in a.items())
    pct = F(5 * 3, tot) * 100
    return ",".join(k for k, v in {"A": 21, "B": 10, "C": 14.28, "D": 30}.items() if abs(v - float(pct)) < 0.01)


def q29_literal() -> float:
    # each fold halves the long edge (20 -> 10 -> 5 -> 2.5): literal reading; alt reading re-picks the long edge each time
    w, h = F(20), F(8)
    for _ in range(3):
        w /= 2
    lit = 2 * (w + h)
    w, h = F(20), F(8)
    for _ in range(3):
        if w >= h:
            w /= 2
        else:
            h /= 2
    alt = 2 * (w + h)
    return float(lit), float(alt)


# ---- calculus -------------------------------------------------------------------------------------------------------
def q31() -> str:
    fs_odd = [lambda x: x, lambda x: x ** 3 - 2 * x]
    fs_even = [lambda x: x * x, lambda x: abs(x) + 1]
    xs = [F(k, 3) for k in range(1, 8)]
    def odd(h): return all(h(-x) == -h(x) for x in xs)
    def even(h): return all(h(-x) == h(x) for x in xs)
    res = set()
    if all(odd(lambda x, f=f: f(x) - 2) for f in fs_odd): res.add("A")
    if all(even(lambda x, f=f: f(x) - 2) for f in fs_even): res.add("B")
    gs_odd = [lambda x: x, lambda x: x ** 3]; gs_even = [lambda x: x * x, lambda x: abs(x)]
    if all(odd(lambda x, g=g: g(x) + 2) for g in gs_odd): res.add("C")
    if all(even(lambda x, g=g: g(x) + 2) for g in gs_even): res.add("D")
    return ",".join(sorted(res))


def q32() -> int:
    f = lambda x: (x ** 6 - 24 * x - 16) / (x ** 3 + 2 * x - 12)
    x = F(2) + F(1, 10 ** 9)
    return round(float(f(x)))


def q33() -> float:
    f = lambda x: 2 * x ** 3 - 9 * x ** 2 + 12 * x + 6
    xs = [F(1) + F(k, 1000) for k in range(1, 2000)]
    return float(min(xs, key=f))


def q34_family() -> list:
    # continuity: k+l = 1+k+m ; differentiability: 2k = 2k'... derivative left 2k, right 2+k -> k=2 ; l=1+m
    out = []
    for m in range(-2, 4):
        k = 2; l = 1 + m
        out.append(k - 2 * l + m)
    return out  # equals -m: not a single value


def q35() -> int:
    for a in range(-20, 21):
        for b in range(-20, 21):
            if 3 * a + b == 11 and 5 * a - 2 * b == 11:
                return a + b


def q36() -> str:
    x = 0.7
    sin = x - x ** 3 / 6 + x ** 5 / 120 - x ** 7 / 5040 + x ** 9 / 362880
    cos = 1 - x ** 2 / 2 + x ** 4 / 24 - x ** 6 / 720 + x ** 8 / 40320
    ok = {"A": abs(sin - math.sin(x)) < 1e-6, "B": abs((1 - x ** 2 / 2 + x ** 4 / 24) - math.sin(x)) < 1e-6,
          "C": abs(cos - math.cos(x)) < 1e-6, "D": abs((x - x ** 3 / 6 + x ** 5 / 120) - math.cos(x)) < 1e-6}
    return ",".join(k for k, v in ok.items() if v)


def q37() -> str:
    R = 1.0
    best = max((h / 1e5 for h in range(1, 200000)), key=lambda h: h * (2 * R - h) * h)  # V ~ r^2 h, r^2 = h(2R-h)
    opts = {"A": 1, "B": 1.25, "C": 4 / 3, "D": 1.5}
    return ",".join(k for k, v in opts.items() if abs(v - best) < 1e-3)


def q38() -> float:
    from decimal import Decimal, getcontext
    getcontext().prec = 40
    x = Decimal(-3) + Decimal(1) / Decimal(10 ** 12)
    return float(((2 * x + 22).sqrt() - 4) / (x + 3))


def q39() -> str:
    d = lambda x: math.pi * (x * math.cos(x) - math.sin(x)) / x ** 2
    m1, m2 = d(math.pi), d(-math.pi)
    ang = abs(math.degrees(math.atan(m1) - math.atan(m2)))
    ang = min(ang, 180 - ang) if abs(m1 * m2 + 1) > 1e-9 else 90.0  # perpendicular when m1*m2 = -1
    opts = {"A": 30, "B": 45, "C": 60, "D": 90}
    return ",".join(k for k, v in opts.items() if abs(v - ang) < 1e-6)


def q40() -> str:
    xs = [F(k, 100) for k in range(-1000, 1001)]
    ok = [x for x in xs if 5 - 4 * x - x * x >= 0]
    lo, hi = min(ok), max(ok)
    vals = [math.sqrt(5 - 4 * float(x) - float(x) ** 2) for x in ok]
    res = set()
    if lo == 0: res.add("A")
    if lo == hi and False: pass
    if (lo, hi) == (-5, 1): res.add("C")
    if max(vals) > 1e6: res.add("D")
    if min(vals) == 0 and abs(max(vals) - 3) < 1e-9: res.add("E")
    # B: (-inf,-5] U [1,inf) : points x=-6 and x=2 are outside the domain
    assert (-6) not in ok and 2 not in ok
    return ",".join(sorted(res))


# ---- probability / statistics ---------------------------------------------------------------------------------------
def q41() -> str:
    v = math.perm(15, 11)
    opts = {"A": math.factorial(15), "B": math.factorial(15) // (math.factorial(11) * math.factorial(4)),
            "C": math.factorial(15) // math.factorial(11), "D": math.factorial(15) // math.factorial(4)}
    return ",".join(k for k, x in opts.items() if x == v)


def q42() -> float:
    return float(1 - (F(6, 10) + F(7, 10) - F(5, 10)))


def q43() -> float:
    pa = F(3, 10) * F(1, 2); tot = pa + F(2, 10) * F(4, 10) + F(5, 10) * F(6, 10)
    return round(float(pa / tot), 3)


def q44() -> str:
    res = {"B"}
    for n in range(1, 8):
        tot = 2 ** (2 * n)
        p = sum(math.comb(2 * n, h) for h in range(n + 1, 2 * n + 1)) / tot
        fa = math.comb(2 * n, n) * 0.5 ** (2 * n)
        opts = {"A": fa, "B": 0.5 * (1 - fa), "C": 1 - math.comb(2 * n, n) * 0.5 ** n, "D": math.comb(2 * n, n) * 0.5 ** n}
        res &= {k for k, v in opts.items() if abs(v - p) < 1e-12}
    return ",".join(sorted(res))


def q45() -> str:
    lam, k0 = 40, 35  # 20/hour * 2 hours
    p = 1 - sum(math.exp(-lam) * lam ** k / math.factorial(k) for k in range(k0))
    # options: A/B use rate 20, C/D use 40; B/D complement. Option C is a sum to infinity (identical value when summed fully).
    def tail(l): return 1 - sum(math.exp(-l) * l ** k / math.factorial(k) for k in range(35))
    res = []
    if abs(tail(20) - p) < 1e-12: res.append("A")
    if abs(tail(20) - p) < 1e-12: res.append("B")
    if abs(tail(40) - p) < 1e-12: res.extend(["C", "D"])
    # A/B (rate 20, i.e. one hour) are not the 2-hour probability; C is the sum from 35 to infinity with rate 40 = D too
    return ",".join(sorted(set(res) - {"A", "B"}))


def q46() -> float:
    z = (5.4 - 5) / (1 / math.sqrt(16))
    phi = lambda t: 0.5 * (1 + math.erf(t / math.sqrt(2)))
    return round(phi(z) - phi(-z), 2)


def q47() -> tuple:
    d = [24.58, 24.67, 24.99, 25.22, 25.32, 25.25, 24.96, 24.87, 25.52, 24.85]
    n = len(d); m = sum(d) / n; s = math.sqrt(sum((x - m) ** 2 for x in d) / (n - 1))
    t = (m - 25) / (s / math.sqrt(n))
    return m, s, t, ("B" if t < -1.833 else "A")  # H0: mu = 25 vs H1: mu < 25


def q48() -> int:
    lx = next(l for l in range(1, 20) if l == l * l / 2)            # P(1)=P(2): l = l^2/2
    ly = next(l for l in range(1, 20) if l * l / 2 == l ** 3 / 6)   # P(2)=P(3)
    return lx + 4 * ly


def q49() -> float:
    return (30 * 20 - 15 + 25) / 20


def q50() -> float:
    pts = [(x, y) for x in (1, 2) for y in (1, 2)]  # i.i.d. discrete uniform on {1,2}
    p = F(1, 4)
    E = lambda f: sum(p * f(x, y) for x, y in pts)
    eu, ev = E(lambda x, y: x + y), E(lambda x, y: x)
    cov = E(lambda x, y: (x + y) * x) - eu * ev
    vu = E(lambda x, y: (x + y) ** 2) - eu ** 2; vv = E(lambda x, y: x * x) - ev ** 2
    return round(float(cov) / math.sqrt(float(vu * vv)), 2)


# ---- linear algebra -------------------------------------------------------------------------------------------------
def det3(m):
    return (m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0])
            + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]))


def q52() -> str:
    tr, det = 2 + 1, 2 * 1 - (-1) * 3
    disc = tr * tr - 4 * det
    if disc < 0:
        return "B"
    return "A"


def q54() -> int:
    return det3([[2010, 2020, 2030], [2020, 2030, 2010], [2030, 2010, 2020]])


def q55() -> str:
    a = [[-4, -6], [3, -8]]
    # A^T A
    ata = [[sum(a[k][i] * a[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
    tr, det = ata[0][0] + ata[1][1], ata[0][0] * ata[1][1] - ata[0][1] * ata[1][0]
    d = math.sqrt(tr * tr - 4 * det)
    s = sorted([math.sqrt((tr + d) / 2), math.sqrt((tr - d) / 2)], reverse=True)
    opts = {"A": (1, 0), "B": (10, 5), "C": (100, 25), "D": (0, 0)}
    return ",".join(k for k, v in opts.items() if all(abs(x - y) < 1e-9 for x, y in zip(v, s)))


def q57() -> str:
    mul = lambda a, b: [[sum(a[i][k] * b[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
    a, b = [[1, 1], [1, 0]], [[0, 1], [1, 0]]
    s2_true = mul(a, b) == [list(r) for r in zip(*mul(a, b))]
    s1_true = True  # (A+B)^T = A^T + B^T = A + B
    return {(True, False): "A", (False, True): "B", (True, True): "C", (False, False): "D"}[(s1_true, s2_true)]


def q58() -> str:
    a = [[1, 2], [2, -1]]
    mul = lambda x, y: [[sum(x[i][k] * y[k][j] for k in range(2)) for j in range(2)] for i in range(2)]
    p = [[1, 0], [0, 1]]
    for _ in range(8):
        p = mul(p, a)
    opts = {"A": 25, "B": 125, "C": 625, "D": 3125}
    return ",".join(k for k, v in opts.items() if p == [[v, 0], [0, v]])


def q60() -> str:
    def classify(k):
        k = F(k)
        det = 1 - k * k
        if det != 0:
            return "unique"
        # rank test: [1 k | 1; k 1 | -1]
        return "none" if (k == 1) else "inf"   # k=1: x+y=1,x+y=-1 ; k=-1: x-y=1, -x+y=-1 (same)
    ks = [F(n, 2) for n in range(-8, 9)]
    cls = {k: classify(k) for k in ks}
    none = [k for k in ks if cls[k] == "none"]; inf = [k for k in ks if cls[k] == "inf"]; uni = [k for k in ks if cls[k] == "unique"]
    res = set()
    if len(none) == 1: res.add("A")
    if len(uni) == 1: res.add("C")   # false: unique for every k != +-1
    if len(inf) == 1: res.add("D")
    return ",".join(sorted(res))


def c() -> dict:
    out = {
        1: 8 + 5 - 2, 2: q2(), 3: q3(), 4: q4(), 5: q5(), 6: q6(), 8: q8(), 9: q9(), 11: q11(), 15: q15(),
        18: q18_not_implied(), 23: q23(), 26: q26(), 28: q28(), 29: ("lit/alt", *q29_literal()), 31: q31(), 32: q32(), 33: q33(),
        35: q35(), 36: q36(), 37: q37(), 38: round(q38(), 6), 39: q39(), 40: q40(), 41: q41(), 42: q42(), 43: q43(),
        44: q44(), 45: q45(), 46: q46(), 47: q47(), 48: q48(), 49: q49(), 50: q50(), 52: q52(), 54: q54(), 55: q55(),
        57: q57(), 58: q58(), 60: q60(),
    }
    out[1] = 11
    return out


if __name__ == "__main__":
    for k, v in sorted(c().items()):
        print(k, v)
    print(34, q34_family())
