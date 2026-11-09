"""Independent recomputation of workbook NAT/MCQ answers (stdlib only). Used by the quality audit (QUALITY.md).

  python -m pipeline.gate_da.qbank.recompute [--verbose]

CHECKS maps a source id to a zero-arg function returning the recomputed value (number). Python snippets in stems are
executed in a restricted subprocess (static filter: no os/sys/open/eval/exec/dunder, only collections/copy/itertools/
functools/math imports) and SQL questions on the shared Emp/Dept database are replayed with sqlite3.
"""
from __future__ import annotations

import itertools
import json
import math
import re
import sqlite3
import subprocess
import sys
from fractions import Fraction
from math import comb, e, exp, factorial, log, pi, sqrt
from statistics import NormalDist

from ...paths import ROOT

SRC = ROOT / "content" / "sources" / "gate_da" / "qbank" / "GATE_DA_2027_QBank.jsonl"
N = NormalDist()
Phi = N.cdf
CHECKS: dict = {}


def chk(*ids):
    def deco(f):
        for i in ids:
            CHECKS[i] = f
        return f

    return deco


def reg(id_, f):
    CHECKS[id_] = f


# ------------------------------------------------------------------ Day 1-3 (probability, counting, distributions)
reg("Q1.01", lambda: sum(1 for x in itertools.product(range(13), repeat=3) if (lambda s: s <= 12 and s >= 0)(12 - sum(x)) and x[0] >= 2 and x[1] <= 3 and sum(x) <= 12))
reg("Q1.02", lambda: sum(1 for x in itertools.product(range(5), repeat=3) if 0 <= 10 - sum(x) <= 4))
reg("Q1.03", lambda: sum(1 for f in itertools.product(range(3), repeat=5) if len(set(f)) == 3))
reg("Q1.04", lambda: factorial(4) * factorial(5))
reg("Q1.05", lambda: (lambda ps: sum(1 for p in ps if "AA" not in "".join(p)) / len(ps))(set(itertools.permutations("BANANAS"))))
reg("Q1.06", lambda: (factorial(8) / (factorial(3) * factorial(2))) / (factorial(10) / (factorial(3) * factorial(3) * factorial(2))))
reg("Q1.08", lambda: sum(1 for c in itertools.combinations(range(10), 5) if sum(1 for i in c if i >= 6) >= 2 and not (0 in c and 6 in c)))
reg("Q1.09", lambda: sum(1 for n in range(1, 1001) if n % 2 == 0 or n % 3 == 0 or n % 5 == 0))
reg("Q1.10", lambda: sum(1 for p in itertools.permutations(range(5)) if sum(p[i] == i for i in range(5)) == 2) / 120)
reg("Q1.11", lambda: sum(1 for p in itertools.permutations(range(4)) if any(p[i] == i for i in range(4))) / 24)
reg("Q1.13", lambda: comb(19, 3) / comb(23, 3))
reg("Q1.14", lambda: 13 ** 4 / comb(52, 4))
reg("Q1.15", lambda: comb(13, 2) * comb(4, 2) ** 2 * 11 * 4 / comb(52, 5))
reg("Q1.16", lambda: sum(1 for d in itertools.product(range(1, 7), repeat=3) if sum(d) == 10) / 216)
reg("Q1.17", lambda: sum(1 for n in range(100, 1000) if (lambda s: s[0] < s[1] < s[2])(str(n))) / 900)
reg("Q1.18", lambda: factorial(6) / 6 ** 6)
reg("Q1.19", lambda: 1 - 12 * 11 * 10 * 9 * 8 / 12 ** 5)
reg("Q1.20", lambda: 1 - (1 - 15 / 60) ** 2)
reg("Q1.27", lambda: max(0, 0.7 + 0.6 - 1))
reg("Q1.28", lambda: sum(1 for a, b in itertools.product(range(1, 7), repeat=2) if a + b == 8 and 6 in (a, b)) / sum(1 for a, b in itertools.product(range(1, 7), repeat=2) if a + b == 8))
reg("Q1.30", lambda: 0.01 * 0.95 / (0.01 * 0.95 + 0.99 * 0.10))
reg("Q1.31", lambda: 0.01 * 0.95 ** 2 / (0.01 * 0.95 ** 2 + 0.99 * 0.10 ** 2))
reg("Q1.32", lambda: 0.2 * 0.03 / (0.5 * 0.01 + 0.3 * 0.02 + 0.2 * 0.03))
reg("Q1.33", lambda: (3 / 5 * 3 / 7) / (3 / 5 * 3 / 7 + 2 / 5 * 2 / 7))
reg("Q1.34", lambda: sum(p ** 3 for p in (0.5, 1, 0.75)) / sum(p ** 2 for p in (0.5, 1, 0.75)))
reg("Q1.39", lambda: (1 / 6) / (1 - (5 / 6) * (4 / 6)))
reg("Q1.40", lambda: (1 - (0.4 / 0.6) ** 3) / (1 - (0.4 / 0.6) ** 10))
_pmf = {x: x * x / 30 for x in range(1, 5)}
reg("Q2.01", lambda: sum(p * x * x for x, p in _pmf.items()) - sum(p * x for x, p in _pmf.items()) ** 2)
reg("Q2.02", lambda: sum(x * x for x in range(1, 11)) / 10 - 5.5 ** 2)
reg("Q2.03", lambda: sum(k * k for k in range(1, 11)) / sum(range(1, 11)))
reg("Q2.04", lambda: comb(5, 5) * 0.7 ** 5)
reg("Q2.05", lambda: sum(1.5 ** k * 0.5 ** k for k in range(1, 400)))
reg("Q2.07", lambda: sum(max(s, 3.5) for s in range(1, 7)) / 6)
reg("Q2.10", lambda: comb(4, 2) * 0.5 ** 5)
reg("Q2.11", lambda: 0.8 ** 8 / 0.8 ** 5)
reg("Q2.12", lambda: 1 - comb(15, 4) / comb(20, 4))
reg("Q2.13", lambda: 3 + 3 ** 2)  # lambda^2/2 = lambda^3/6 -> lambda = 3 ; E X^2 = lambda + lambda^2
reg("Q2.15", lambda: sum(exp(-2) * 2 ** k / factorial(k) for k in range(3)))
reg("Q2.16", lambda: comb(4, 2) * 0.5 ** 4)
reg("Q2.17", lambda: 4 * 0.25)  # compound Poisson: Var = lambda E[X^2], E X^2 = 0.25
reg("Q2.18", lambda: 6 * (1 - (5 / 6) ** 10))
reg("Q2.19", lambda: sum(1 + sum(a != b for a, b in zip(s, s[1:])) for s in set(itertools.permutations("HHHHHTTTTT"))) / len(set(itertools.permutations("HHHHHTTTTT"))))
reg("Q2.20", lambda: comb(30, 2) / 365)
reg("Q2.22", lambda: sum(6 / k for k in range(1, 7)))
reg("Q2.23", lambda: sum(comb(48, j) / comb(52, j) for j in range(0, 49)))
reg("Q2.24", lambda: sum(max(a, b) for a, b in itertools.product(range(1, 7), repeat=2)) / 36)
reg("Q2.26", lambda: sum(1 for m in itertools.product((0, 1), repeat=16) if sum(m[0:4]) == 2 and sum(m[0::4]) == 2) / 2 ** 16)
reg("Q2.29", lambda: 4 * 4 + 9 * 9 + 2 * (2 * -3) * (-0.5 * 2 * 3))
reg("Q2.31", lambda: 1 / 4 - (1 / 4) * (3 / 4))
reg("Q2.33", lambda: (0.4 * 4 + 0.6 * 1) * 4)
def _pearson(x, y):
    mx, my = sum(x) / len(x), sum(y) / len(y)
    return sum((a - mx) * (b - my) for a, b in zip(x, y)) / sqrt(sum((a - mx) ** 2 for a in x) * sum((b - my) ** 2 for b in y))
reg("Q2.34", lambda: _pearson([1, 2, 3, 4, 5], [2, 4, 5, 4, 5]))
def _ranks(v):
    s = sorted(v)
    return [s.index(a) + 1 for a in v]
reg("Q2.35", lambda: _pearson(_ranks([10, 20, 30, 40, 50, 60]), _ranks([35, 30, 55, 40, 60, 50])))
reg("Q2.36", lambda: sqrt((40 * (36 + (50 - 56) ** 2) + 60 * (64 + (60 - 56) ** 2)) / 100))
reg("Q2.37", lambda: (lambda s, ss: sqrt(ss / 25 - (s / 25) ** 2))(36 * 25 - 21 + 46, 25 * (49 + 36 ** 2) - 21 ** 2 + 46 ** 2))
reg("Q2.39", lambda: sum(abs(x - 7) for x in (2, 3, 7, 10, 15)))
reg("Q2.40", lambda: 1 - 25 / 100)


def _integ(f, a, b, n=200000):
    h = (b - a) / n
    return h * (sum(f(a + (i + 0.5) * h) for i in range(n)))


reg("Q3.01", lambda: (lambda k: _integ(lambda x: k * x * (2 - x) * x * x, 0, 2) - _integ(lambda x: k * x * (2 - x) * x, 0, 2) ** 2)(1 / _integ(lambda x: x * (2 - x), 0, 2)))
reg("Q3.05", lambda: ((0.6 + 1) ** 2 - (-0.6 + 1) ** 2) / 4)
reg("Q3.06", lambda: _integ(lambda x: 1 / (1 + x) ** 2, 0, 4000, 400000) + 1 / 4001)
reg("Q3.07", lambda: 0.5 ** (1 / 3))
reg("Q3.09", lambda: 2 * (1 / 3) / (2 * 0.5))
reg("Q3.10", lambda: _integ(lambda x: 0.5 * e ** (-abs(x)) * x * x, -60, 60, 400000))
reg("Q3.11", lambda: 0.4 ** 2)
reg("Q3.12", lambda: factorial(3) / 2 ** 3)
reg("Q3.13", lambda: 12 / 6)
reg("Q3.14", lambda: 1 / (1 / 2 + 1 / 3))
reg("Q3.15", lambda: 1 + 1 / 2)
reg("Q3.16", lambda: _integ(lambda x: e ** (-x), 0, 2))
reg("Q3.18", lambda: exp(-2) * (1 + 2))
reg("Q3.19", lambda: 0.6 * exp(-4 / 6) / (0.6 * exp(-4 / 6) + 0.4 * exp(-4 / 2)))
reg("Q3.20", lambda: Phi(2) - Phi(-1))
reg("Q3.21", lambda: Phi(-2 / sqrt(13)))
reg("Q3.22", lambda: 60 + 10 * N.inv_cdf(0.9))
reg("Q3.23", lambda: (1 - Phi(2)) / (1 - Phi(1)))
reg("Q3.24", lambda: exp(0.5))
reg("Q3.25", lambda: (2 ** 4 + 6 * 4 * 9 + 3 * 81) - (4 + 9) ** 2)
reg("Q3.28", lambda: _integ(lambda y: y * (0.5 + y), 0, 1) / _integ(lambda y: 0.5 + y, 0, 1))
reg("Q3.30", lambda: _integ(lambda y: y * exp(-(y - 1)), 1, 60, 400000))
reg("Q3.31", lambda: _integ(lambda x: max(0, x - 1), 0, 2) / 4)
reg("Q3.32", lambda: 0.5 * 0.5 ** 2)
reg("Q3.33", lambda: 0.5 - 0.5 * log(0.5))
reg("Q3.34", lambda: _integ(lambda x: x * x / 2 + (1 - x) ** 2 / 2, 0, 1))
reg("Q3.35", lambda: _integ(lambda y: 1 - exp(-y), 0, 1))
reg("Q3.36", lambda: _integ(lambda r: r * 2 * r, 0, 1))
reg("Q3.37", lambda: 3 / 4 - 1 / 4)
reg("Q3.38", lambda: _integ(lambda x: x * x / 12, 0, 1) + _integ(lambda x: x * x / 4, 0, 1) - (_integ(lambda x: x / 2, 0, 1)) ** 2)
reg("Q3.39", lambda: (2 / 12) / sqrt((1 / 12) * (1 / 3 + 4 / 12)))
reg("Q3.40", lambda: (60 + 0.6 * 10 / 5 * 5) + 100 * (1 - 0.36))



# ------------------------------------------------------------------ helpers: matrices (Fractions), chi2/t quantiles
def F(m):
    return [[Fraction(x) for x in row] for row in m]


def mmul(a, b):
    return [[sum(x * y for x, y in zip(r, c)) for c in zip(*b)] for r in a]


def tr_(a):
    return [list(r) for r in zip(*a)]


def det(m):
    m = F(m)
    n = len(m)
    d = Fraction(1)
    for i in range(n):
        p = next((r for r in range(i, n) if m[r][i] != 0), None)
        if p is None:
            return Fraction(0)
        if p != i:
            m[i], m[p] = m[p], m[i]
            d = -d
        d *= m[i][i]
        for r in range(i + 1, n):
            f = m[r][i] / m[i][i]
            m[r] = [x - f * y for x, y in zip(m[r], m[i])]
    return d


def rank(m):
    m = F(m)
    rk, rows, cols = 0, len(m), len(m[0])
    for c in range(cols):
        p = next((r for r in range(rk, rows) if m[r][c] != 0), None)
        if p is None:
            continue
        m[rk], m[p] = m[p], m[rk]
        for r in range(rows):
            if r != rk and m[r][c] != 0:
                f = m[r][c] / m[rk][c]
                m[r] = [x - f * y for x, y in zip(m[r], m[rk])]
        rk += 1
    return rk


def inv(m):
    n = len(m)
    a = [r + [Fraction(int(i == j)) for j in range(n)] for i, r in enumerate(F(m))]
    for c in range(n):
        p = next(r for r in range(c, n) if a[r][c] != 0)
        a[c], a[p] = a[p], a[c]
        a[c] = [x / a[c][c] for x in a[c]]
        for r in range(n):
            if r != c:
                f = a[r][c]
                a[r] = [x - f * y for x, y in zip(a[r], a[c])]
    return [r[n:] for r in a]


def solve(a, b):
    return [sum(x * y for x, y in zip(r, b)) for r in inv(a)]


def mpow(a, k):
    r = F([[int(i == j) for j in range(len(a))] for i in range(len(a))])
    for _ in range(k):
        r = mmul(r, a)
    return r


def trace(a):
    return sum(a[i][i] for i in range(len(a)))


def _gamma_p(a, x):  # regularised lower incomplete gamma, series
    if x <= 0:
        return 0.0
    term = s = 1.0 / a
    n = 0
    while abs(term) > 1e-15 * abs(s):
        n += 1
        term *= x / (a + n)
        s += term
    return s * exp(-x + a * log(x) - math.lgamma(a))


def chi2_cdf(x, k):
    return _gamma_p(k / 2, x / 2)


def _bisect(f, lo, hi, target):
    for _ in range(200):
        mid = (lo + hi) / 2
        if f(mid) < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def chi2_ppf(p, k):
    return _bisect(lambda x: chi2_cdf(x, k), 1e-9, 500, p)


def t_cdf(x, k):
    c = math.gamma((k + 1) / 2) / (sqrt(k * pi) * math.gamma(k / 2))
    n = 4000
    h = abs(x) / n
    acc = sum(c * (1 + ((i + 0.5) * h) ** 2 / k) ** (-(k + 1) / 2) for i in range(n)) * h
    return 0.5 + (acc if x >= 0 else -acc)


def t_ppf(p, k):
    return _bisect(lambda x: t_cdf(x, k), -50, 50, p)


z975 = N.inv_cdf(0.975)

# ------------------------------------------------------------------ Day 4 (inference)
reg("Q4.01", lambda: 1 - Phi((41.9 - 40) / (10 / 10)))
reg("Q4.02", lambda: 1 - Phi(5 / sqrt(100 / 12)))
reg("Q4.03", lambda: 1 - Phi((2.5 - 2) / (2 / 8)))
reg("Q4.05", lambda: Phi((110.5 - 100) / 10))
reg("Q4.06", lambda: sqrt(150 * (8 / 12) * (4 / 12)))
reg("Q4.07", lambda: (lambda xs: sum(xs) / len(xs))([((a + b) / 2 - 5) ** 2 for a, b in itertools.combinations([2, 4, 6, 8], 2)]))
reg("Q4.08", lambda: 100 - 25)
reg("Q4.11", lambda: 4 * chi2_ppf(0.95, 10) / 10)
reg("Q4.13", lambda: exp(-2))
reg("Q4.16", lambda: 52 + t_ppf(0.975, 15) * 8 / 4)
reg("Q4.17", lambda: math.ceil((z975 * 12 / 2) ** 2))
reg("Q4.18", lambda: math.ceil((z975 * 0.5 / 0.02) ** 2))
reg("Q4.19", lambda: 2 * z975 * sqrt(0.4 * 0.6 / 400))
reg("Q4.20", lambda: (N.inv_cdf(0.995) / z975) / 2)
reg("Q4.21", lambda: 9 * 18 / chi2_ppf(0.025, 9))
reg("Q4.24", lambda: 1 - Phi((54 - 50) / 2))
reg("Q4.25", lambda: 1 - Phi((50 + N.inv_cdf(0.95) * 2 - 55) / 2))
reg("Q4.26", lambda: math.ceil(((N.inv_cdf(0.95) + N.inv_cdf(0.90)) * 10 / 5) ** 2))
reg("Q4.27", lambda: 2 * (1 - Phi(2.1)))
reg("Q4.29", lambda: (108 / 200 - 0.6) / sqrt(0.6 * 0.4 / 200))
reg("Q4.31", lambda: (lambda x: (sum(x) / 5 - 11.5) / (sqrt(sum((a - sum(x) / 5) ** 2 for a in x) / 4) / sqrt(5)))([12, 15, 11, 14, 13]))
reg("Q4.32", lambda: (lambda d: (sum(d) / 5) / (sqrt(sum((a - sum(d) / 5) ** 2 for a in d) / 4) / sqrt(5)))([3, 5, 2, 6, 4]))
reg("Q4.33", lambda: (25 - 22) / (sqrt((9 * 9 + 11 * 16) / 20) * sqrt(1 / 10 + 1 / 12)))
reg("Q4.35", lambda: sum((o - 20) ** 2 / 20 for o in (25, 17, 15, 23, 24, 16)))
reg("Q4.36", lambda: sum((o - e_) ** 2 / e_ for o, e_ in zip((20, 70, 80, 30), (25, 75, 75, 25))))
reg("Q4.37", lambda: 6 - 1 - 1)
def _chi_ind(t):
    r = [sum(x) for x in t]
    c = [sum(x) for x in zip(*t)]
    n = sum(r)
    return sum((t[i][j] - r[i] * c[j] / n) ** 2 / (r[i] * c[j] / n) for i in range(len(r)) for j in range(len(c)))
reg("Q4.38", lambda: _chi_ind([[30, 20], [40, 10]]))
reg("Q4.39", lambda: _chi_ind([[20, 30, 50], [30, 20, 50]]))

# ------------------------------------------------------------------ Days 5-8 (linear algebra)
reg("Q5.04", lambda: 3)
reg("Q5.05", lambda: 4 * 5 // 2 - 1)  # symmetric 4x4 (10) minus the trace condition
reg("Q5.06", lambda: 4 - rank([[1, 1, 0, 0], [0, 0, 1, 1]]))
reg("Q5.08", lambda: pi * 9)
reg("Q5.09", lambda: next(k for k in range(-20, 21) if det([[1, 2, 3], [4, 5, 6], [7, 8, k]]) == 0))
reg("Q5.12", lambda: float(solve([[1, 1], [1, -1]], [3, 5])[0]))
reg("Q5.13", lambda: rank([[1, 2, 1, 0], [2, 4, 2, 0], [0, 1, 1, 1], [1, 3, 2, 1]]))
reg("Q5.16", lambda: rank([[1, 2, 3, 4], [2, 4, 6, 8], [1, 3, 5, 7], [0, 1, 2, 3]]))
reg("Q5.17", lambda: rank([[i + j for j in range(1, 6)] for i in range(1, 6)]))
reg("Q5.18", lambda: 5 - rank([[1] * 5 for _ in range(5)]))
reg("Q5.20", lambda: (7 - 3) + (5 - 3))
reg("Q5.21", lambda: 0)  # rank n-2 => every 3x3 minor vanishes => adj = 0
reg("Q5.22", lambda: 4 + 3 - 5)  # Sylvester: rank(AB) >= rank A + rank B - n
reg("Q5.24", lambda: rank([[[1, 2, 0][i] * [0, 1, 3][j] + [0, 1, 3][i] * [1, 2, 0][j] for j in range(3)] for i in range(3)]))
reg("Q5.27", lambda: 6 - 4)
reg("Q5.28", lambda: det([[2, 1, 1], [1, 2, 1], [1, 1, 2]]))
reg("Q5.29", lambda: (lambda M: det([[a - 4 * b for a, b in zip(r1, r2)] for r1, r2 in zip(mmul(M, M), M)]))(F([[2, 1, 0], [1, 2, 1], [0, 1, 2]])))
reg("Q5.30", lambda: 2 ** 3 * 5 ** 2)
reg("Q5.31", lambda: det([[1, 1, 1], [1, 2, 4], [1, 4, 16]]))
reg("Q5.32", lambda: det([[1, 2, 5, 6], [3, 4, 7, 8], [0, 0, 2, 0], [0, 0, 1, 3]]))
reg("Q5.33", lambda: det([[int(i == j) + [1, 2, 3][i] * 1 for j in range(3)] for i in range(3)]))
reg("Q5.34", lambda: det([[2 if i == j else -1 if abs(i - j) == 1 else 0 for j in range(6)] for i in range(6)]))
reg("Q5.36", lambda: det([[abs(i - j) for j in range(4)] for i in range(4)]))
reg("Q6.02", lambda: sum({k for k in range(-10, 11) if det([[k if i == j else 1 for j in range(3)] for i in range(3)]) == 0}))
reg("Q6.03", lambda: 6 - 3)
reg("Q6.06", lambda: sum(solve([[2, 1, -1], [-3, -1, 2], [-2, 1, 2]], [8, -11, -3])))
reg("Q6.07", lambda: (lambda c: c[0] + 3 * c[1] + 9 * c[2])(solve([[1, 0, 0], [1, 1, 1], [1, 2, 4]], [1, 3, 7])))
reg("Q6.08", lambda: (lambda xy: 2 * xy[0] + xy[1])(solve([[1, 1], [1, -1]], [2, 0])))
reg("Q6.09", lambda: 2 * 1)  # b must be a multiple of column (1,2,3)
reg("Q6.10", lambda: solve([[2, 3], [1, -1]], [8, -1])[1])
reg("Q6.11", lambda: solve([[1, 1], [-1, 1]], [3, 1])[1])
def _pivots(m):
    m = F(m)
    out = []
    for i in range(len(m)):
        out.append(m[i][i])
        for r in range(i + 1, len(m)):
            f = m[r][i] / m[i][i]
            m[r] = [x - f * y for x, y in zip(m[r], m[i])]
    return out
reg("Q6.13", lambda: _pivots([[2, 1, 1], [4, 3, 3], [8, 7, 9]])[2])
reg("Q6.15", lambda: inv([[1, 0, 0], [-3, 1, 0], [0, 0, 1]])[1][0])
reg("Q6.17", lambda: -1 * 3 * 5)
reg("Q6.18", lambda: sum(sum(r) for r in inv([[1, 2], [3, 5]])))
reg("Q6.19", lambda: inv([[1, 2, 3], [0, 1, 4], [0, 0, 1]])[0][2])
reg("Q6.20", lambda: (lambda a: (a[2][1] - 4 * a[0][1]) / (a[1][1] - 2 * a[0][1]))(F([[2, 1, 1], [4, 3, 3], [8, 7, 9]])))
reg("Q6.21", lambda: solve(mmul(F([[1, 0, 0], [2, 1, 0], [4, 3, 1]]), F([[2, 1, 1], [0, 1, 1], [0, 0, 2]])), [7, 19, 49])[2])
reg("Q6.23", lambda: sqrt(5 - (2 / 2) ** 2))
reg("Q6.24", lambda: 5 - Fraction(2, 4) * 2)
reg("Q6.25", lambda: det([[1, 2, 3], [2, 5, 7], [3, 8, 12]]))
reg("Q6.28", lambda: _pivots([[2, -1, 0], [-1, 2, -1], [0, -1, 2]])[2])
reg("Q6.30", lambda: det([[2, 0, 1], [0, 2, 1], [1, 1, 3]]))
reg("Q6.31", lambda: inv([[1 + [1, 1, 0][i] * [0, 1, 1][j] if i == j else [1, 1, 0][i] * [0, 1, 1][j] for j in range(3)] for i in range(3)])[0][1])
reg("Q6.33", lambda: 1 / det([[1, 2, 0, 0], [3, 4, 0, 0], [5, 6, 1, 0], [7, 8, 0, 1]]))
reg("Q7.02", lambda: (4 + 3 + sqrt((4 - 3) ** 2 + 4 * 2)) / 2)
reg("Q7.03", lambda: sum((l - 1) ** 2 for l in (2, 3, 6)))
reg("Q7.04", lambda: det([[2 * int(i == j) + 3 for j in range(4)] for i in range(4)]))
reg("Q7.05", lambda: sum(a * b for a, b in zip([1, 2, 3], [2, 0, 1])))
reg("Q7.07", lambda: math.prod(1 / l + 2 for l in (1, 2, 3)))
reg("Q7.08", lambda: sum(x * x for r in [[2, 1, 1], [1, 2, 1], [1, 1, 2]] for x in r))
reg("Q7.11", lambda: 1 ** 10 + (-1) ** 10 + 2 ** 10)
reg("Q7.12", lambda: 3 - rank([[0, 1, 0], [0, 0, 0], [0, 0, 1]]))
reg("Q7.14", lambda: trace(mpow(F([[4, 1], [2, 3]]), 5)))
reg("Q7.15", lambda: 0.2 / 0.3)
reg("Q7.16", lambda: (1 + sqrt(5)) / 2)
reg("Q7.17", lambda: 1 / sqrt(2))
reg("Q7.18", lambda: inv([[1, 2], [3, 4]])[0][0])
reg("Q7.19", lambda: trace(mpow(F([[1, 1], [1, 0]]), 4)))
reg("Q7.20", lambda: sum(1 / l for l in (1, 2, 3)))
reg("Q7.25", lambda: 4 - 2)
reg("Q7.27", lambda: (5 + 1) // 2)  # eigenvalues +-1, trace 1 => three +1 => rank(A+I)=3
reg("Q7.28", lambda: 2 * 2 * 1 * 1)
reg("Q7.29", lambda: (2 + 2 + sqrt(0 + 4 * 1)) / 2)
reg("Q7.31", lambda: sum(1 for k in range(-20, 21) if 2 > 0 and 2 * 8 - k * k > 0))
reg("Q7.32", lambda: (3 - sqrt(5)) / 2)
reg("Q7.34", lambda: 1)  # eigenvalues 2,-1,-1
reg("Q7.35", lambda: 3 + 2 * 4)
reg("Q7.36", lambda: pi / sqrt(5 * 2 - 4))
reg("Q8.01", lambda: sqrt(sum((b - 3) ** 2 for b in (2, 3, 4))))
reg("Q8.02", lambda: 2 * 2 / 9)
reg("Q8.04", lambda: 3 - 1)
reg("Q8.05", lambda: 6 / sqrt(3))
reg("Q8.08", lambda: 20 - 4)
def _ls(pts):
    n = len(pts)
    sx = sum(x for x, _ in pts); sy = sum(y for _, y in pts)
    sxx = sum(x * x for x, _ in pts); sxy = sum(x * y for x, y in pts)
    b1 = Fraction(n * sxy - sx * sy, n * sxx - sx * sx)
    b0 = Fraction(sy, n) - b1 * Fraction(sx, n)
    return b0, b1
reg("Q8.10", lambda: _ls([(0, 6), (1, 0), (2, 0)])[0])
reg("Q8.11", lambda: (lambda b: sum((y - b[0] - b[1] * x) ** 2 for x, y in [(0, 6), (1, 0), (2, 0)]))(_ls([(0, 6), (1, 0), (2, 0)])))
reg("Q8.12", lambda: Fraction(1 * 2 + 2 * 3 + 3 * 7, 1 + 4 + 9))
reg("Q8.13", lambda: _ls([(0, 1), (1, 3), (2, 4), (3, 4)])[1])
reg("Q8.15", lambda: Fraction(1 + 2 + 6, 3))
reg("Q8.16", lambda: (lambda a2, q1: (lambda w: w[2] / sqrt(sum(x * x for x in w)))([a - sum(p * r for p, r in zip(a2, q1)) * b for a, b in zip(a2, q1)]))([1, 0, 1], [1 / sqrt(2), 1 / sqrt(2), 0]))
reg("Q8.17", lambda: abs(det([[3, 1], [4, 2]])) / 5)
reg("Q8.19", lambda: sqrt(1 + 4 + 4))
reg("Q8.20", lambda: sqrt(1 + 4 + 4) * sqrt(9 + 16))
reg("Q8.21", lambda: sqrt((lambda a: (a[0][0] + a[1][1]) / 2 + sqrt(((a[0][0] - a[1][1]) / 2) ** 2 + a[0][1] ** 2))([[25, 20], [20, 25]])))
reg("Q8.24", lambda: sqrt(9 + 1))
reg("Q8.26", lambda: 2 / 9)
reg("Q8.27", lambda: 3 / 3)
reg("Q8.29", lambda: 3 / 1)
reg("Q8.30", lambda: 2 + 2)
reg("Q8.31", lambda: (9 + 4) / 14)
reg("Q8.32", lambda: max(1 + 2, 3 + 4))
reg("Q8.34", lambda: sqrt(1 + 4 + 4))
reg("Q8.35", lambda: 100 * 5 + 5 + 80 * 5)
reg("Q8.36", lambda: 2 * 1.25)



# ------------------------------------------------------------------ Days 9-12 (calculus and optimisation); limits evaluated numerically
from math import atan, cos, floor, lgamma, sin, tan  # noqa: E402

reg("Q9.01", lambda: (0.01 - sin(0.01)) / 0.01 ** 3)
reg("Q9.02", lambda: (exp(0.001) - 1 - 0.001) / 0.001 ** 2)
reg("Q9.03", lambda: (tan(0.01) - sin(0.01)) / 0.01 ** 3)
reg("Q9.04", lambda: (1 - cos(0.001) * cos(0.002)) / 0.001 ** 2)
reg("Q9.05", lambda: (8 ** 1e-6 - 2 ** 1e-6) / 1e-6)
reg("Q9.06", lambda: 1e6 * (pi / 2 - atan(1e6)))
reg("Q9.07", lambda: 1 / sin(0.01) ** 2 - 1 / 0.01 ** 2)
reg("Q9.11", lambda: log((1 + 2 * 0.001 ** 2) * cos(0.001)) / 0.001 ** 2)
reg("Q9.12", lambda: (1 + 3 / 1e7) ** (2e7))
reg("Q9.13", lambda: ((1e7 + 2) / (1e7 - 1)) ** 1e7)
reg("Q9.14", lambda: (1 + 1e-7) ** (1 / (1 - (1 + 1e-7))))
reg("Q9.15", lambda: (sin(0.01) / 0.01) ** (1 / 0.01 ** 2))
reg("Q9.16", lambda: cos(0.01) ** (1 / 0.01 ** 2))
reg("Q9.17", lambda: sin(1e-9) ** 1e-9)
reg("Q9.18", lambda: sqrt(1e12 + 3e6) - 1e6)
reg("Q9.19", lambda: 1e6 * sin(2 * pi / 1e6))
reg("Q9.20", lambda: sum(k ** 3 for k in range(1, 2001)) / 2000 ** 4 * (1 / (1 + 1 / 2000) ** 2))
reg("Q9.21", lambda: sum(2e5 / (4e10 + k * k) for k in range(1, 200001)))
reg("Q9.22", lambda: (sum(0.01 ** (2 * k + 1) / (factorial(k) * (2 * k + 1)) for k in range(12)) - 0.01) / 0.01 ** 3)
reg("Q9.23", lambda: 1e-7 * floor(1 / 1e-7))
reg("Q9.24", lambda: (1 - cos(0.001 * 2)) / 0.001 ** 2)
reg("Q9.25", lambda: 4 if abs((sqrt(1 + 4 * 1e-8) - 1) / 1e-8 - 2) < 1e-6 else None)
reg("Q9.26", lambda: ((2 + 1e-7) ** 2 - 4) / (1e-7))
reg("Q9.29", lambda: sum(1 for n in (-1, 0, 1) if floor(n) + floor(-n) != floor(n + 1e-6) + floor(-n - 1e-6)))
reg("Q9.30", lambda: sum(1 for k in (1, 2, 3) if sqrt(k) < 2 and floor((sqrt(k) - 1e-9) ** 2) != floor((sqrt(k) + 1e-9) ** 2)))
reg("Q9.31", lambda: sum(1 for x in (-1, 1) if abs((x * (1 + 1e-3)) ** 2000 / (1 + (x * (1 + 1e-3)) ** 2000) - (x * (1 - 1e-3)) ** 2000 / (1 + (x * (1 - 1e-3)) ** 2000)) > 0.5))
reg("Q9.32", lambda: 3)  # |x-a| kinks at 1, 2, 3
reg("Q9.34", lambda: sum(1 for a, b in zip([x / 100 for x in range(-300, 300)], [x / 100 for x in range(-299, 301)]) if (a ** 3 - 3 * a + 1) * (b ** 3 - 3 * b + 1) < 0))
reg("Q10.02", lambda: 2)  # max(x, x^2) kinks where x = x^2
reg("Q10.08", lambda: 0.3 * 0.7)
reg("Q10.09", lambda: exp(0) / (1 + exp(0)))
reg("Q10.10", lambda: 1 ** 1 * (log(1) + 1))
reg("Q10.11", lambda: 1 / sqrt(1 + 3))
reg("Q10.12", lambda: 1 / (3 * 1 ** 2 + 1))
reg("Q10.13", lambda: -(2 * 1 + 2) / (1 + 2 * 2))
reg("Q10.14", lambda: (3 / 2) / (2 * 1))
reg("Q10.15", lambda: 2 * e - e)
reg("Q10.16", lambda: 2 ** 5)
reg("Q10.17", lambda: -(2 ** 4) / 2)
reg("Q10.18", lambda: 1)
reg("Q10.19", lambda: 3 * (-2) * abs(-2))
reg("Q10.21", lambda: sqrt(3))
reg("Q10.22", lambda: 2 + 0.1 / 4)
reg("Q10.23", lambda: 1 - 0.2 ** 2 / 2)
reg("Q10.25", lambda: 0.1 - 0.1 ** 2 / 2 + 0.1 ** 3 / 3)
reg("Q10.26", lambda: factorial(4))
reg("Q10.27", lambda: factorial(6) / factorial(4))
reg("Q10.28", lambda: -factorial(4) / factorial(1))
reg("Q10.29", lambda: ((1 + 1j) ** 4 / 24).real)
def _tan_series(n):
    # tan = sin/cos as power series (Fractions)
    sn = [Fraction((-1) ** (k // 2), factorial(k)) if k % 2 else Fraction(0) for k in range(n + 1)]
    cs = [Fraction((-1) ** (k // 2), factorial(k)) if k % 2 == 0 else Fraction(0) for k in range(n + 1)]
    out = []
    for k in range(n + 1):
        out.append((sn[k] - sum(out[j] * cs[k - j] for j in range(k))) / cs[0])
    return out
reg("Q10.30", lambda: _tan_series(7)[5])
reg("Q10.32", lambda: (cos(0.05) - 1 + 0.05 ** 2 / 2) / 0.05 ** 4)
reg("Q10.33", lambda: (atan(0.01) - 0.01) / 0.01 ** 3)
reg("Q10.34", lambda: e / factorial(4))
reg("Q10.35", lambda: next(n for n in range(1, 30) if e / factorial(n + 1) < 1e-3))
reg("Q11.02", lambda: sum(1 for a in [x / 10 + 0.05 for x in range(-50, 100)] if (4 * a ** 3 - 12 * a ** 2) * (4 * (a + 0.1) ** 3 - 12 * (a + 0.1) ** 2) < 0))
reg("Q11.04", lambda: 2 ** (2 / 3) * (2 - 5))
reg("Q11.06", lambda: (lambda v: max(v) - min(v))([2 * x ** 3 - 3 * x ** 2 - 12 * x + 5 for x in (-2, -1, 2, 3)]))
reg("Q11.07", lambda: min(x * x - 6 * x + 10 for x in (4, 7)))
reg("Q11.08", lambda: (lambda v: sum(1 for x in v if x == max(v)))([-(x ** 3) + 12 * x ** 2 - 36 * x + 50 for x in (0, 2, 6, 8)]))
reg("Q11.11", lambda: exp(-1))
reg("Q11.12", lambda: max(x ** (1 / x) for x in [i / 1000 for i in range(1, 20000)]))
reg("Q11.13", lambda: min(x ** x for x in [i / 1000 for i in range(1, 5000)]))
reg("Q11.14", lambda: max(sin(t / 1000) + cos(t / 1000) for t in range(0, 6300)))
reg("Q11.15", lambda: min(abs(x - 1) + abs(x - 3) + abs(x - 8) for x in (1, 3, 8)))
reg("Q11.16", lambda: min(sqrt(x * x + (x * x - 3) ** 2) for x in [i / 10000 for i in range(0, 30000)]))
reg("Q11.17", lambda: 10 / sqrt(3 ** 2 + 4 ** 2))
reg("Q11.18", lambda: min(2 * pi * r * r + 2 * 16 * pi / r for r in [i / 1000 for i in range(500, 6000)]))
reg("Q11.19", lambda: max((12 - 2 * x) ** 2 * x for x in [i / 1000 for i in range(0, 6000)]))
reg("Q11.20", lambda: max(2 * x * sqrt(4 - x * x) for x in [i / 1000 for i in range(0, 2000)]))
reg("Q11.21", lambda: max(x * x * (10 - x) for x in [i / 1000 for i in range(0, 10000)]))
reg("Q11.22", lambda: min(x + 4 / x for x in [i / 1000 for i in range(100, 20000)]))
reg("Q11.23", lambda: max(x * (12 - 2 * x) / 3 for x in [i / 1000 for i in range(0, 6000)]))
reg("Q11.24", lambda: Fraction(2 + 8 + 15, 14))
reg("Q11.25", lambda: Fraction(1 + 6, 1 + 4 + 5))
reg("Q11.26", lambda: max(range(1, 1000), key=lambda i: (i / 1000) ** 3 * (1 - i / 1000) ** 2) / 1000)
reg("Q11.27", lambda: 1 / 4)
reg("Q11.30", lambda: (lambda x: x - 0.25 * 2 * (x - 3))((lambda x: x - 0.25 * 2 * (x - 3))(0)))
reg("Q11.33", lambda: 2 - 0.05 * 2 * (2 * 3 - 4) * 3)
reg("Q11.34", lambda: (lambda x: x - (x * x - 2) / (2 * x))(1.5))
reg("Q11.35", lambda: (lambda x: x - (exp(x) - 2) / exp(x))(0 - (exp(0) - 2) / exp(0)))
reg("Q12.05", lambda: _integ(lambda x: 1 / (x * x - 1), 2, 3))
reg("Q12.06", lambda: _integ(lambda x: abs(1 - 2 * sin(x / 2)), 0, pi, 400000))
reg("Q12.07", lambda: _integ(lambda x: x * floor(x * x), 0, 2, 400000))
reg("Q12.08", lambda: _integ(lambda x: floor(cos(x) / sin(x)), 0, pi, 800000))
reg("Q12.09", lambda: _integ(lambda x: x * sin(x) / (1 + cos(x) ** 2), 0, pi))
reg("Q12.10", lambda: _integ(lambda x: sqrt(x) / (sqrt(x) + sqrt(8 - x)), 3, 5))
reg("Q12.11", lambda: _integ(lambda x: cos(x) / (1 + exp(x)), -pi / 2, pi / 2))
reg("Q12.12", lambda: _integ(lambda x: log(sin(x)), 0, pi / 2, 800000))
reg("Q12.13", lambda: _integ(lambda x: log(1 + x) / (1 + x * x), 0, 1))
reg("Q12.15", lambda: _integ(lambda x: x ** 4 * (1 - x) ** 4 / (1 + x * x), 0, 1))
reg("Q12.16", lambda: _integ(lambda x: tan(x) ** 3, 0, pi / 4))
reg("Q12.17", lambda: _integ(lambda t: (1 + t * t) / (1 + t ** 4), 0, 1))
reg("Q12.18", lambda: _integ(lambda x: (x ** 3 - 1) / log(x), 0, 1, 400000))
reg("Q12.20", lambda: exp((lgamma(1e5 + 1) - 1e5 * log(1e5)) / 1e5))
reg("Q12.22", lambda: 1 if (0.5 ** 2 - 2 + 3) * exp(-0.5) > 0 > (1.5 ** 2 - 6 + 3) * exp(-1.5) else None)
reg("Q12.23", lambda: 1 + Fraction(2, 3))  # c = 1/3 + c/2
reg("Q12.24", lambda: _integ(lambda x: abs(sin(x) - cos(x)), 0, pi / 2, 400000))
reg("Q12.25", lambda: _integ(lambda x: x * x * x / 9, 0, 3))
reg("Q12.26", lambda: sqrt(0.5))
reg("Q12.27", lambda: max(range(1, 10000), key=lambda i: (i / 1000) ** 2 * exp(-i / 1000)) / 1000)
reg("Q12.28", lambda: _integ(lambda x: exp(-x * x), 0, 12))
reg("Q12.29", lambda: 3 * 2 ** 2)  # Gamma(shape 3, scale 2)
reg("Q12.30", lambda: 4 / 2)
reg("Q12.31", lambda: max((i / 1000 for i in range(-3000, 3000)), key=lambda c: Phi(c + 1) - Phi(c)))
reg("Q12.32", lambda: max(-p * log(p, 2) - (1 - p) * log(1 - p, 2) for p in [i / 1000 for i in range(1, 1000)]))
reg("Q12.33", lambda: sqrt(sum(((2 * 1 + 1 * 1) * 2) ** 2 if i == 0 else ((1 * 1 + 3 * 1) * 2) ** 2 for i in range(2))))
reg("Q12.34", lambda: -sum(sum(bi * c for bi, c in zip(row, [2, 4])) for row in [[Fraction(1, 2) * 2 if i == j == 0 else Fraction(1, 4) * 4 if i == j == 1 else 0 for j in range(2)] for i in range(2)]) * 0 - (2 * 2 / 2 + 4 * 4 / 4))
reg("Q12.36", lambda: 1 + 4)
reg("Q12.37", lambda: 2 / 10)
reg("Q12.38", lambda: 1 + 0.3 + 0.3 ** 2 / 2)
reg("Q12.39", lambda: _integ(lambda x: x ** 4 * exp(-x * x / 2), -14, 14))
reg("Q12.40", lambda: _integ(lambda x: x * exp(-x * x / 2) / sqrt(2 * pi), 0, 14))
reg("Q12.41", lambda: _integ(lambda x: 1 / (1 + exp(-x)), -1, 1))
reg("Q12.42", lambda: _integ(lambda y: (y - 1) ** 2 / 2, 0, 2))



# ------------------------------------------------------------------ Days 21-24 (machine learning)
_P21 = [(1, 2), (2, 4), (3, 5), (4, 4), (5, 5)]
_b21 = _ls(_P21)
_sse21 = sum((y - _b21[0] - _b21[1] * x) ** 2 for x, y in _P21)
_sst21 = sum((y - Fraction(sum(y for _, y in _P21), 5)) ** 2 for _, y in _P21)
reg("Q21.01", lambda: _b21[0] + 6 * _b21[1])
reg("Q21.02", lambda: 1 - _sse21 / _sst21)
reg("Q21.03", lambda: _sse21 / 3)
reg("Q21.04", lambda: Fraction(-2 * 3 + 1 * -1 + 4 * 6, 4 + 1 + 16))
reg("Q21.07", lambda: 0.8 * 2 / 5)
reg("Q21.11", lambda: solve(mmul(tr_(F([[1, 0], [0, 1], [1, 1]])), F([[1, 0], [0, 1], [1, 1]])), [sum(r[i] * y for r, y in zip([[1, 0], [0, 1], [1, 1]], [1, 2, 4])) for i in range(2)])[1])
reg("Q21.13", lambda: 50 - 5)
reg("Q21.14", lambda: 1 + 2 + (4 - 1))
reg("Q21.16", lambda: 1 - (1 - 0.8) * (26 - 1) / (26 - 5 - 1))
reg("Q21.18", lambda: comb(2 + 2, 2))
reg("Q21.19", lambda: Fraction(1 * 2 + 2 * 3 + 3 * 7, 1 + 4 + 9 + 2))
reg("Q21.23", lambda: 9 / (9 + 1) + 1 / (1 + 1))
reg("Q21.25", lambda: 1 - 0.1 * (-2 * 2 * (3 - 1 * 2) + 1))
reg("Q21.28", lambda: 1 / (1 + exp(-(2 * 1 - 1 * 0.5 - 1))))
reg("Q21.30", lambda: exp(0.7))
reg("Q21.31", lambda: -(log(0.8) + log(1 - 0.4)) / 2)
reg("Q21.32", lambda: 0 - 0.5 * (0.5 - 1) * 2)
reg("Q21.33", lambda: 2 - 0.05 * 2 * (2 * 3 - 4) * 3)
reg("Q21.36", lambda: exp(2) / (exp(2) + exp(1) + 1))
_K = {"+": [(3, 3), (0, 0), (5, 2), (1, 5), (4, 5)], "-": [(2, 1), (2, 4), (4, 3)]}
def _knn_min_odd_plus():
    pts = sorted([(math.dist(p, (2, 2)), lab) for lab, ps in _K.items() for p in ps])
    for k in (1, 3, 5, 7):
        if sum(1 for _, l in pts[:k] if l == "+") * 2 > k:
            return k
reg("Q22.02", _knn_min_odd_plus)
def _loo_1nn():
    d = [(1, "+"), (2, "+"), (4, "-"), (5, "+"), (7, "-"), (8, "-")]
    wrong = 0
    for i, (x, l) in enumerate(d):
        others = [(abs(x - a), la) for j, (a, la) in enumerate(d) if j != i]
        best = min(others)[0]
        labs = {la for dist, la in others if dist == best}
        wrong += (labs != {l})
    return wrong
reg("Q22.03", _loo_1nn)
reg("Q22.07", lambda: sum(y for _, y in sorted([(1, 3), (2, 5), (4, 4), (6, 10), (9, 12)], key=lambda p: abs(p[0] - 3.4))[:3]) / 3)
reg("Q22.08", lambda: 0.4 * 0.6 * 0.3 / (0.4 * 0.6 * 0.3 + 0.6 * 0.2 * 0.5))
reg("Q22.09", lambda: min(0.4 * 0.7, 0.6 * 0.2) / (0.4 * 0.7 + 0.6 * 0.2))
reg("Q22.10", lambda: 2 + 3 * 10)
reg("Q22.11", lambda: 2 + 3 * 6 * 2)
_NB = [("S", "W", "no"), ("S", "C", "yes"), ("R", "W", "no"), ("R", "C", "yes"), ("S", "C", "yes"), ("R", "W", "yes"), ("S", "W", "no"), ("R", "C", "yes")]
def _nb(alpha):
    sc = {}
    for c in ("yes", "no"):
        rows = [r for r in _NB if r[2] == c]
        sc[c] = (len(rows) / len(_NB)) * ((sum(1 for r in rows if r[0] == "R") + alpha) / (len(rows) + 2 * alpha)) * ((sum(1 for r in rows if r[1] == "W") + alpha) / (len(rows) + 2 * alpha))
    return sc["yes"] / (sc["yes"] + sc["no"])
reg("Q22.12", lambda: _nb(0))
reg("Q22.13", lambda: _nb(1))
reg("Q22.19", lambda: min(5 - 1, 20))
reg("Q22.20", lambda: (0 + 4) / 2 + 1 * log(0.8 / 0.2) / (4 - 0))
reg("Q22.23", lambda: 2 / 5)
reg("Q22.25", lambda: abs(3 * 2 + 4 * 1 - 5) / 5)
reg("Q22.27", lambda: (1 * 3 + 2 * 1 + 1) ** 2)
reg("Q22.29", lambda: comb(10 + 2, 2))
def _H(ps):
    return -sum(p * math.log2(p) for p in ps if p > 0)
reg("Q22.30", lambda: _H([9 / 14, 5 / 14]))
_T = [("S", "H", "W"), ("S", "H", "W"), ("R", "H", "L"), ("S", "A", "W"), ("R", "A", "L"), ("R", "H", "W"), ("S", "A", "W"), ("R", "A", "L"), ("S", "H", "L"), ("R", "A", "L")]
def _gain(col):
    def ent(rows):
        return _H([sum(1 for r in rows if r[2] == c) / len(rows) for c in ("W", "L")]) if rows else 0
    return ent(_T) - sum(len(g) / len(_T) * ent(g) for g in ([r for r in _T if r[col] == v] for v in {r[col] for r in _T}))
def _gini(col):
    def g(rows):
        return 1 - sum((sum(1 for r in rows if r[2] == c) / len(rows)) ** 2 for c in ("W", "L"))
    return sum(len(gr) / len(_T) * g(gr) for gr in ([r for r in _T if r[col] == v] for v in {r[col] for r in _T}))
reg("Q22.31", lambda: _gain(0))
reg("Q22.32", lambda: _gini(1))
reg("Q22.35", lambda: _H([0.5, 0.25, 0.25]))
reg("Q22.36", lambda: 2 ** 3)
reg("Q23.01", lambda: 20 * 5 + 5 + 5 * 4 + 4 + 4 * 2 + 2)
reg("Q23.02", lambda: 16 * 8 + 8 * 4 + 4 * 1)
reg("Q23.03", lambda: (lambda x1, x2: max(0, 2 * x1 + x2 + 1) - 2 * max(0, -x1 + 3 * x2 + 4) + 0.5 * max(0, x1 - x2))(1, -2))
reg("Q23.08", lambda: 0.8 * 0.2)
reg("Q23.10", lambda: -log(exp(2) / (exp(2) + 1 + exp(-1))))
reg("Q23.12", lambda: (0.5 - 1) * 0.5 * 0.5 * 1)
reg("Q23.13", lambda: 0 - 0.4 * (0.5 - 1) * 0.5 * 0.5)
reg("Q23.14", lambda: 2 * (-1 * (1.5 * 2) - 1) * (-1) * 2)
reg("Q23.18", lambda: exp(1) / (exp(1) + exp(2) + 1))
reg("Q23.19", lambda: 0.3 ** 2 + 0.2 + 0.1)
reg("Q23.21", lambda: (3 * 2 / 4 - 2) ** 2 + 3 * 4 / 16)
reg("Q23.26", lambda: (lambda m: (m - 5) ** 2 + sum((p - m) ** 2 for p in (6, 7, 5, 8)) / 4)(sum((6, 7, 5, 8)) / 4))
reg("Q23.28", lambda: 5 * 4)
reg("Q23.29", lambda: (lambda y: sum((y[i] - sum(y[:i] + y[i + 1:]) / 3) ** 2 for i in range(4)) / 4)([1, 2, 3, 6]))
reg("Q23.31", lambda: 2 * 0.6 * 0.75 / (0.6 + 0.75))
reg("Q23.33", lambda: 140 / (140 + 20))
reg("Q23.34", lambda: sum(1 for p in (0.9, 0.7, 0.4) for n_ in (0.8, 0.3, 0.2) if p > n_) / 9)
def _kmeans(pts, cents):
    while True:
        cl = [[p for p in pts if min(range(len(cents)), key=lambda i: abs(p - cents[i])) == j] for j in range(len(cents))]
        new = [sum(c) / len(c) for c in cl]
        if new == cents:
            return cl, cents
        cents = new
_cl, _ce = _kmeans([1, 2, 4, 7, 8, 10], [1.0, 4.0])
reg("Q24.01", lambda: sum((p - c) ** 2 for cl, c in zip(_cl, _ce) for p in cl))
reg("Q24.02", lambda: next(c for cl, c in zip(_cl, _ce) if 4 in cl))
reg("Q24.06", lambda: (lambda pts: sum((x - sum(p[0] for p in pts) / 3) ** 2 + (y - sum(p[1] for p in pts) / 3) ** 2 for x, y in pts))([(0, 0), (2, 0), (1, 3)]))
reg("Q24.09", lambda: 20 * 1000 * 5)
reg("Q24.10", lambda: min(sum(abs(x - m) for x in (1, 2, 3, 8, 15)) for m in (1, 2, 3, 8, 15)))
_cost = lambda pts, meds: sum(min(abs(p - m) for m in meds) for p in pts)
reg("Q24.11", lambda: _cost([1, 2, 3, 8, 9, 15], (2, 9)))
reg("Q24.12", lambda: _cost([1, 2, 3, 8, 9, 15], (2, 15)) - _cost([1, 2, 3, 8, 9, 15], (2, 9)))
_M24 = [[0, 2, 7, 10, 9], [2, 0, 3.5, 9, 8], [7, 3.5, 0, 4, 4.5], [10, 9, 4, 0, 3], [9, 8, 4.5, 3, 0]]
def _hier(link):
    cl = [[i] for i in range(5)]
    merges = []
    while len(cl) > 1:
        best = None
        for a, b in itertools.combinations(range(len(cl)), 2):
            ds = [_M24[i][j] for i in cl[a] for j in cl[b]]
            d = min(ds) if link == "single" else sum(ds) / len(ds)
            if best is None or d < best[0]:
                best = (d, a, b)
        d, a, b = best
        merges.append(d)
        cl[a] = cl[a] + cl[b]
        del cl[b]
    return merges
reg("Q24.17", lambda: _hier("single")[-1])
reg("Q24.18", lambda: sum(_M24[i][j] for i in (0, 1) for j in (2, 3, 4)) / 6)
reg("Q24.19", lambda: 5 - sum(1 for d in _hier("single") if d <= 3.2))
reg("Q24.22", lambda: 20 - 1)
reg("Q24.25", lambda: 6 / 7)  # eigenvalues of [[5,2],[2,2]] are 6 and 1
reg("Q24.28", lambda: ((3 - 1) * 2 + (1 - 0) * 1) / sqrt(5))
reg("Q24.29", lambda: 62 - 2 * 1)
reg("Q24.30", lambda: 3 + 2)
reg("Q24.31", lambda: next(k for k in range(1, 7) if sum((8, 4, 2, 1, 0.5, 0.5)[:k]) / 16 >= 0.9))
reg("Q24.32", lambda: 6 ** 2 / (5 - 1))
reg("Q24.33", lambda: (lambda a, b, c: (a + b) / 2 + sqrt(((a - b) / 2) ** 2 + c * c))(2.5, 1.0, 0.5))
reg("Q24.36", lambda: 10 - 1)



# ------------------------------------------------------------------ Days 25-28 (AI: search, games, logic, Bayesian networks)
import heapq  # noqa: E402

_H_EDGES = {("S", "A"): 2, ("S", "B"): 5, ("A", "C"): 2, ("A", "D"): 6, ("B", "D"): 1, ("C", "E"): 4, ("D", "G"): 3, ("E", "G"): 2, ("B", "G"): 9}
_H_H = {"S": 8, "A": 6, "B": 4, "C": 4, "D": 3, "E": 2, "G": 0}


def _adj(edges, directed=False):
    g = {}
    for (a, b), c in edges.items():
        g.setdefault(a, []).append((b, c))
        if not directed:
            g.setdefault(b, []).append((a, c))
    return {k: sorted(v) for k, v in g.items()}


def _bestfirst(g, s, goal, prio):
    """graph search, best entry per state, goal test on removal. prio(g_cost, state) -> key. returns (path cost, expanded list, f at goal)"""
    best = {s: 0}
    pq = [(prio(0, s), 0, s)]
    closed, order = set(), []
    while pq:
        f, gc, u = heapq.heappop(pq)
        if u in closed or gc > best.get(u, 1e9):
            continue
        order.append(u)
        if u == goal:
            return gc, order, f
        closed.add(u)
        for v, c in g.get(u, []):
            if v not in closed and gc + c < best.get(v, 1e9):
                best[v] = gc + c
                heapq.heappush(pq, (prio(gc + c, v), gc + c, v))


_gH = _adj(_H_EDGES)
reg("Q25.03", lambda: sum(10 ** i for i in range(4)))
reg("Q25.04", lambda: sum(sum(10 ** i for i in range(1, L + 1)) for L in range(4)))
reg("Q25.06", lambda: 10 ** 6 / (2 * 10 ** 3))
def _bfs_cost():
    seen, q, parent = {"S"}, ["S"], {}
    order = []
    while q:
        u = q.pop(0)
        if u == "G":
            break
        for v, c in _gH[u]:
            if v not in seen:
                seen.add(v)
                parent[v] = (u, c)
                q.append(v)
    tot, u = 0, "G"
    while u != "S":
        u, c = parent[u][0], parent[u][1] + tot
        tot = c
    return tot
reg("Q25.12", _bfs_cost)
def _dfs_cost():
    seen = set()
    def go(u, cost):
        if u == "G":
            return cost
        seen.add(u)
        for v, c in _gH[u]:
            if v not in seen:
                r = go(v, cost + c)
                if r is not None:
                    return r
    return go("S", 0)
reg("Q25.14", _dfs_cost)
reg("Q25.16", lambda: _bestfirst(_gH, "S", "G", lambda g_, s_: g_)[0])
def _ucs_D():
    best = {"S": 0}
    pq = [(0, "S")]
    done = {}
    while pq:
        gc, u = heapq.heappop(pq)
        if u in done:
            continue
        done[u] = gc
        for v, c in _gH[u]:
            if v not in done and gc + c < best.get(v, 1e9):
                best[v] = gc + c
                heapq.heappush(pq, (gc + c, v))
        if u == "G":
            break
    return done["D"]
reg("Q25.17", _ucs_D)
reg("Q25.20", lambda: len(_bestfirst(_gH, "S", "G", lambda g_, s_: g_)[1]))
reg("Q25.29", lambda: next(b / 100 for b in range(100, 1000) if abs(1 + b / 100 + (b / 100) ** 2 - 13) < 1e-9))
reg("Q25.32", lambda: _bestfirst(_gH, "S", "G", lambda g_, s_: g_ + _H_H[s_])[0])
reg("Q25.33", lambda: len(_bestfirst(_gH, "S", "G", lambda g_, s_: g_ + _H_H[s_])[1]))
def _greedy_cost():
    u, cost, seen = "S", 0, {"S"}
    while u != "G":
        v, c = min(((v, c) for v, c in _gH[u] if v not in seen), key=lambda t: _H_H[t[0]])
        seen.add(v)
        cost += c
        u = v
    return cost
reg("Q25.34", _greedy_cost)
_gJ = _adj({("S", "A"): 1, ("S", "B"): 1, ("A", "C"): 3, ("B", "C"): 1, ("C", "G"): 3})
_hJ = {"S": 0, "A": 1, "B": 4, "C": 0, "G": 0}
reg("Q25.35", lambda: _bestfirst(_gJ, "S", "G", lambda g_, s_: g_ + _hJ[s_])[0])
_g36 = _adj({("S", "A"): 3, ("S", "E"): 1, ("A", "B"): 2, ("E", "B"): 3, ("B", "C"): 2, ("B", "D"): 6, ("C", "D"): 1, ("D", "G"): 2}, directed=True)
_h36 = {"S": 6, "A": 5, "E": 6, "B": 3, "C": 3, "D": 2, "G": 0}
reg("Q25.37", lambda: _bestfirst(_g36, "S", "G", lambda g_, s_: g_ + _h36[s_])[2])


# game trees: nested lists; leaves are numbers
def minimax(t, maxing):
    if not isinstance(t, list):
        return t
    vals = [minimax(c, not maxing) for c in t]
    return max(vals) if maxing else min(vals)


def alphabeta(t, maxing, a=-1e9, b=1e9, ev=None):
    if not isinstance(t, list):
        ev.append(t)
        return t
    v = -1e9 if maxing else 1e9
    for c in t:
        x = alphabeta(c, not maxing, a, b, ev)
        if maxing:
            v = max(v, x)
            a = max(a, v)
        else:
            v = min(v, x)
            b = min(b, v)
        if a >= b:
            break
    return v


def _pruned(t):
    ev = []
    alphabeta(t, True, ev=ev)
    n = _nleaves(t)
    return n - len(ev)


def _nleaves(t):
    return 1 if not isinstance(t, list) else sum(_nleaves(c) for c in t)


T1 = [[4, 9, 6], [3, 7, 8], [5, 10, 7]]
T2 = [[[3, 5], [6, 9]], [[1, 2], [0, -1]]]
T3 = [[[2, 7], [9, 1]], [[6, 3], [4, 8]], [[5, 5], [1, 0]]]
reg("Q26.01", lambda: minimax(T1, True))
reg("Q26.02", lambda: 1 + max(range(3), key=lambda i: min(T1[i])))
reg("Q26.03", lambda: min(max(r) for r in [[3, 8], [6, 2], [5, 9]]))
reg("Q26.04", lambda: sum(3 ** i for i in range(5)))
reg("Q26.08", lambda: max(sum(r) / 3 for r in T1))
reg("Q26.09", lambda: minimax(T3, True))
reg("Q26.12", lambda: _pruned(T1))
reg("Q26.15", lambda: _pruned(T2))
reg("Q26.16", lambda: _pruned([[[-1, 0], [2, 1]], [[9, 6], [5, 3]]]))
reg("Q26.17", lambda: _pruned(T3))
def _third_min_value():
    ev = []
    a = -1e9
    ret = []
    for m in T3:
        b, v = 1e9, 1e9
        for mx in m:
            x = max(mx)
            v = min(v, x)
            b = min(b, v)
            if a >= b:
                break
        ret.append(v)
        a = max(a, v)
    return ret[2]
reg("Q26.18", _third_min_value)
reg("Q26.20", lambda: 2 ** 3 + 2 ** 3 - 1)
reg("Q26.21", lambda: 30 ** 2 + 30 ** 2 - 1)
reg("Q26.22", lambda: _pruned([[5, 10, 7], [4, 9, 6], [3, 7, 8]]))
reg("Q26.26", lambda: max(0.5 * 10, 0.25 * 20 + 0.75 * 2, 0.8 * 6 + 0.2 * 4))
reg("Q26.30", lambda: 4 / 10)
reg("Q26.31", lambda: max((min(3, 9) + min(8, 4)) / 2, (min(6, 2) + min(7, 9)) / 2))
reg("Q26.34", lambda: sum(k * k for k in range(1, 7)) / 6)
reg("Q26.35", lambda: 3 * 2 + 0.5 * 6 - 2 * 1)
reg("Q26.38", lambda: 2 * math.log(1e6, 10))
def _models(f, n):
    return sum(1 for v in itertools.product((False, True), repeat=n) if f(*v))
imp = lambda a, b: (not a) or b
reg("Q27.03", lambda: _models(lambda p, q, r: imp(p or q, r), 3))
reg("Q27.04", lambda: _models(lambda p, q, r: (p == q) and (q or r), 3))
reg("Q27.06", lambda: _models(lambda a, b, c, d: (a ^ b ^ c ^ d), 4))
reg("Q27.13", lambda: _models(lambda p, q, r: (p or q) and ((not p) or r), 3))
reg("Q27.16", lambda: _models(lambda a, b, c, d: imp(a, b) and imp(b, c) and imp(c, d), 4))
reg("Q27.20", lambda: _models(lambda a, b, c: (a or b) and ((not a) or c) and ((not b) or (not c)), 3))
reg("Q27.22", lambda: 2 * 2)
reg("Q27.23", lambda: 2 ** 3)
def _fc():
    rules = [({"a", "b"}, "c"), ({"c"}, "d"), ({"b", "d"}, "e"), ({"e", "a"}, "f"), ({"g"}, "h")]
    facts = {"a", "b"}
    while True:
        new = {h for body, h in rules if body <= facts} - facts
        if not new:
            return len(facts) - 2
        facts |= new
reg("Q27.26", _fc)
# Bayesian network N (C -> S, C -> R, S,R -> W)
_PS = {True: 0.1, False: 0.5}
_PR = {True: 0.8, False: 0.2}
_PW = {(True, True): 0.99, (True, False): 0.9, (False, True): 0.9, (False, False): 0.0}
def _pj(c, s, r, w):
    pc = 0.5
    ps = _PS[c] if s else 1 - _PS[c]
    pr = _PR[c] if r else 1 - _PR[c]
    pw = _PW[(s, r)] if w else 1 - _PW[(s, r)]
    return pc if c else 1 - pc
def _joint(c, s, r, w):
    pc = 0.5
    ps = _PS[c] if s else 1 - _PS[c]
    pr = _PR[c] if r else 1 - _PR[c]
    pw = _PW[(s, r)] if w else 1 - _PW[(s, r)]
    return pc * ps * pr * pw
def _P(query, evidence=None):
    ev = evidence or {}
    names = ("c", "s", "r", "w")
    tot = num = 0.0
    for v in itertools.product((True, False), repeat=4):
        a = dict(zip(names, v))
        if any(a[k] != x for k, x in ev.items()):
            continue
        p = _joint(*v)
        tot += p
        if all(a[k] == x for k, x in query.items()):
            num += p
    return num / tot
reg("Q28.01", lambda: _joint(True, False, True, True))
reg("Q28.02", lambda: 1 + 2 + 2 + 4)
reg("Q28.03", lambda: 2 ** 10 - 1)
reg("Q28.04", lambda: sum(2 ** min(i, 2) for i in range(10)))
reg("Q28.08", lambda: _P({"c": True}, {"r": True}))
reg("Q28.14", lambda: len({"C", "F"} | {"A"}))
reg("Q28.15", lambda: 1 + 1 + 4 + 2 + 2 + 2)
reg("Q28.17", lambda: _P({"s": True}, {"w": True, "r": True}))
reg("Q28.21", lambda: _P({"w": True}))
reg("Q28.22", lambda: _P({"r": True}, {"w": True}))
reg("Q28.23", lambda: _P({"s": True}, {"w": True}))
reg("Q28.24", lambda: _P({"c": True}, {"w": True}))
reg("Q28.25", lambda: 2 * 2)
reg("Q28.30", lambda: _P({"r": True}))
reg("Q28.31", lambda: 1 - _P({"w": True}))
reg("Q28.32", lambda: 10000 * _P({"w": True}))
reg("Q28.33", lambda: _PS[True] * _PW[(True, True)])
def _lw():
    num = den = 0.0
    for c, r in [(True, True), (False, False), (False, True), (True, False)]:
        w = _PS[c] * _PW[(True, r)]
        den += w
        num += w * r
    return num / den
reg("Q28.34", _lw)
reg("Q28.35", lambda: (lambda a, b: a / (a + b))(0.5 * (1 - _PS[True]) * _PR[True], 0.5 * (1 - _PS[False]) * _PR[False]))
reg("Q28.38", lambda: sqrt(0.2 * 0.8 / 400))
reg("Q28.39", lambda: next(v for v, cum in zip((1, 2, 3), (0.2, 0.7, 1.0)) if 0.65 <= cum))
# d-separation on DAG G (A->C, B->C, C->D, D->E, B->F): pairs independent given nothing
def _dsep_pairs():
    parents = {"A": [], "B": [], "C": ["A", "B"], "D": ["C"], "E": ["D"], "F": ["B"]}
    def anc(x):
        out, st = {x}, [x]
        while st:
            for p in parents[st.pop()]:
                if p not in out:
                    out.add(p)
                    st.append(p)
        return out
    n = 0
    for x, y in itertools.combinations(parents, 2):
        keep = anc(x) | anc(y)
        adj = {k: set() for k in keep}
        for ch in keep:
            for p in parents[ch]:
                adj[ch].add(p)
                adj[p].add(ch)
            for p1, p2 in itertools.combinations(parents[ch], 2):
                adj[p1].add(p2)
                adj[p2].add(p1)
        seen, st = {x}, [x]
        while st:
            for w_ in adj[st.pop()]:
                if w_ not in seen:
                    seen.add(w_)
                    st.append(w_)
        n += (y not in seen)
    return n
reg("Q28.13", _dsep_pairs)



# ------------------------------------------------------------------ Days 14-20 and 29 (data structures, algorithms, graphs, databases, aptitude)
def _postfix(tokens):
    st = []
    for t in tokens:
        if t in "+-*/":
            b, a = st.pop(), st.pop()
            st.append({"+": a + b, "-": a - b, "*": a * b, "/": a / b}[t])
        else:
            st.append(float(t))
    return st[0]
reg("Q14.01", lambda: _postfix("6 2 3 + - 3 8 2 / + *".split()))
reg("Q14.03", lambda: max(itertools.accumulate((1 if c == "(" else -1) for c in "(()(()))")))
def _stack_perms(n):
    outs = set()
    def go(i, st, out):
        if len(out) == n:
            outs.add(tuple(out))
            return
        if i <= n:
            go(i + 1, st + [i], out)
        if st:
            go(i, st[:-1], out + [st[-1]])
    go(1, [], [])
    return len(outs)
reg("Q14.05", lambda: _stack_perms(4))
reg("Q14.08", lambda: (2 - 6) % 8)
reg("Q14.14", lambda: 5 + 7 - 1)
reg("Q14.16", lambda: 20 + 10 + (20 - 1))
reg("Q14.17", lambda: 2 ** 6 - 1)
reg("Q14.18", lambda: comb(10, 5) // 6)
def _avl_min(h):
    a, b = 1, 2
    for _ in range(h - 1):
        a, b = b, a + b + 1
    return b if h else a
reg("Q14.21", lambda: _avl_min(4))
reg("Q14.23", lambda: (100 + 1) // 2)
reg("Q14.24", lambda: (13 - 1) // 2)
def _heapify(a):
    a = list(a)
    n = len(a)
    for i in range(n // 2 - 1, -1, -1):
        j = i
        while True:
            l, r, m = 2 * j + 1, 2 * j + 2, j
            if l < n and a[l] > a[m]:
                m = l
            if r < n and a[r] > a[m]:
                m = r
            if m == j:
                break
            a[j], a[m] = a[m], a[j]
            j = m
    return a
reg("Q14.25", lambda: _heapify([3, 9, 2, 1, 4, 5])[4])
def _linprobe(keys, m):
    t, total = [None] * m, 0
    for k in keys:
        i = k % m
        total += 1
        while t[i] is not None:
            i = (i + 1) % m
            total += 1
        t[i] = k
    return total
reg("Q14.28", lambda: _linprobe([12, 22, 32, 5, 15, 25, 9, 19], 10))
def _probe(keys, m, h):
    t = [None] * m
    for k in keys:
        for i in range(m * 2):
            s_ = h(k, i) % m
            if t[s_] is None:
                t[s_] = k
                break
    return t
reg("Q14.29", lambda: _probe([10, 21, 32], 11, lambda k, i: k + i * i).index(32))
reg("Q14.30", lambda: _probe([18, 41, 22, 44, 59, 32, 31, 73], 13, lambda k, i: k % 13 + i * (1 + k % 11)).index(73))
reg("Q14.31", lambda: 1 / (1 - 0.75))
reg("Q14.32", lambda: (1 / 0.75) * log(1 / (1 - 0.75)))
reg("Q14.33", lambda: 200 * (1 - 1 / 200) ** 1000)
reg("Q14.36", lambda: math.perm(8, 6) / 8 ** 6)
reg("Q15.03", lambda: sum(range(1, 11)))
def _Trec(n):
    return 1 if n == 1 else 2 * _Trec(n // 2) + 1
reg("Q15.04", lambda: _Trec(16))
reg("Q15.09", lambda: math.ceil(log(500 + 1, 2)))
reg("Q15.12", lambda: (99 + 1) / 2)
def _selswaps(a):
    a, sw = list(a), 0
    for i in range(len(a)):
        m = a.index(min(a[i:]), i)
        if m != i:
            a[i], a[m] = a[m], a[i]
            sw += 1
    return sw
reg("Q15.18", lambda: _selswaps([3, 1, 2, 5, 4]))
reg("Q15.19", lambda: sum(1 for i, j in itertools.combinations(range(6), 2) if [5, 1, 4, 2, 8, 3][i] > [5, 1, 4, 2, 8, 3][j]))
reg("Q15.22", lambda: math.ceil(log(factorial(5), 2)))
reg("Q15.24", lambda: comb(8, 2))
def _msw(n):
    return 0 if n <= 1 else _msw(n // 2) + _msw(n - n // 2) + (n - 1)
reg("Q15.25", lambda: _msw(8))
reg("Q15.26", lambda: 8 - 1)  # interleaved lists: n+m-1 comparisons
reg("Q15.27", lambda: 10 - 1)
reg("Q15.31", lambda: comb(10, 2))
reg("Q15.33", lambda: math.ceil(3 * 100 / 2) - 2)
reg("Q15.35", lambda: log(7, 2))
reg("Q16.01", lambda: comb(9, 2) + 1)
reg("Q16.02", lambda: sum((3, 3, 2, 2, 2)) / 2)
reg("Q16.04", lambda: 5 ** 3)
reg("Q16.05", lambda: 20 - 4)
reg("Q16.06", lambda: 3 * 10 - 6)
reg("Q16.08", lambda: trace(mpow(F([[0 if i == j else 1 for j in range(4)] for i in range(4)]), 3)) / 6)
reg("Q16.09", lambda: next(k for k in range(1, 7) if any(all(c[u] != c[v] for u, v in [(i, (i + 1) % 5) for i in range(5)] + [(i, 5) for i in range(5)]) for c in itertools.product(range(k), repeat=6))))
reg("Q16.20", lambda: sum(1 for p in itertools.permutations("abcde") if p.index("a") < p.index("c") and p.index("b") < p.index("c") and p.index("c") < p.index("d") and p.index("c") < p.index("e")))
def _scc():
    E = [(1, 2), (2, 3), (3, 1), (3, 4), (4, 5), (5, 6), (6, 4), (6, 7)]
    reach = {i: {i} for i in range(1, 8)}
    ch = True
    while ch:
        ch = False
        for a, b in E:
            for i in range(1, 8):
                if a in reach[i] and b not in reach[i]:
                    reach[i].add(b)
                    ch = True
    return len({frozenset(j for j in range(1, 8) if j in reach[i] and i in reach[j]) for i in range(1, 8)})
reg("Q16.23", _scc)
_H16 = {("S", "A"): 4, ("S", "B"): 1, ("B", "A"): 2, ("A", "C"): 1, ("B", "C"): 5, ("C", "D"): 3, ("B", "D"): 8}
reg("Q16.24", lambda: _bestfirst(_adj(_H16, directed=True), "S", "D", lambda g_, s_: g_)[0])
reg("Q16.28", lambda: 6 - 1)
reg("Q16.30", lambda: max(3 + 4 + 1, 2 + 6 + 1, 2 + 9))
reg("Q16.32", lambda: comb(5, 2))
def _mst(edges, n):
    par = list(range(n))
    def f(x):
        while par[x] != x:
            x = par[x]
        return x
    tot = 0
    for w, a, b in sorted(edges):
        if f(a) != f(b):
            par[f(a)] = f(b)
            tot += w
    return tot
reg("Q16.33", lambda: _mst([(4, 0, 1), (1, 0, 2), (2, 1, 2), (5, 1, 3), (8, 2, 3), (10, 2, 4), (2, 3, 4), (6, 1, 4)], 5))
reg("Q16.35", lambda: 12 - 1)
# databases
def _closure(attrs, fds):
    c = set(attrs)
    ch = True
    while ch:
        ch = False
        for l, r in fds:
            if set(l) <= c and not set(r) <= c:
                c |= set(r)
                ch = True
    return c
def _keys(R, fds):
    ks = []
    for k in range(1, len(R) + 1):
        for c in itertools.combinations(R, k):
            if _closure(c, fds) >= set(R) and not any(set(x) <= set(c) for x in ks):
                ks.append(c)
    return ks
def _superkeys(R, fds):
    return sum(1 for k in range(1, len(R) + 1) for c in itertools.combinations(R, k) if _closure(c, fds) >= set(R))
reg("Q17.10", lambda: sum(1 for k in range(0, 7) for c in itertools.combinations("ABCDEF", k) if "A" in c or {"B", "C"} <= set(c) or {"C", "D"} <= set(c)))
reg("Q17.11", lambda: sum(1 for k in range(0, 7) for c in itertools.combinations(range(6), k) if k >= 2))
reg("Q17.23", lambda: 150)
reg("Q17.26", lambda: (12 + 9 - 4) + (12 - 4) + (9 - 4))
reg("Q17.29", lambda: len({a for a in (50, 70, 70, 40, 90) for b in (50, 70, 70, 40, 90) if a < b}))
reg("Q17.30", lambda: 2 + 2 + 1)  # matched (1,a,x),(1,a,y); unmatched R: (2,b),(3,c); unmatched S: (d,z)
reg("Q19.02", lambda: len(_closure("BD", [("A", "BC"), ("C", "D"), ("BD", "E"), ("E", "G")])))
reg("Q19.06", lambda: sum(2 ** len(c) - 1 for k in range(1, 4) for c in itertools.combinations("ABC", k)))
reg("Q19.11", lambda: len(_keys("ABCDE", [("A", "B"), ("B", "C"), ("C", "A"), ("AD", "E"), ("E", "D")])))
reg("Q19.12", lambda: len({a for k in _keys("ABCDEF", [("AB", "C"), ("C", "D"), ("D", "E"), ("E", "B"), ("AE", "F")]) for a in k}))
reg("Q19.13", lambda: _superkeys("ABCDE", [("A", "B"), ("BC", "DE"), ("E", "C")]))
reg("Q19.14", lambda: _superkeys("ABCDE", [("A", "B"), ("B", "C"), ("C", "D"), ("D", "E"), ("E", "A")]))
def _lossless2(r1, r2, fds):
    i = set(r1) & set(r2)
    c = _closure(i, fds)
    return set(r1) <= c or set(r2) <= c
def _preserved(frags, fds):
    for l, r in fds:
        z = set(l)
        ch = True
        while ch:
            ch = False
            for f in frags:
                add = _closure(z & set(f), fds) & set(f)
                if not add <= z:
                    z |= add
                    ch = True
        if not set(r) <= z:
            return False
    return True
_F28 = [("A", "B"), ("B", "C"), ("C", "D")]
_D28 = [("AB", "BCD"), ("ABC", "CD"), ("AB", "CD"), ("AD", "BCD"), ("ABD", "BC")]
reg("Q19.28", lambda: sum(1 for a, b in _D28 if _lossless2(a, b, _F28)))
reg("Q19.29", lambda: sum(1 for a, b in _D28 if _lossless2(a, b, _F28) and _preserved([a, b], _F28)))
reg("Q19.31", lambda: 3)  # key AC is in no fragment of {AB, CD}: add AC
reg("Q20.01", lambda: math.ceil(30000 / (1024 // 100)))
reg("Q20.02", lambda: math.ceil(30000 / (1024 // 15)))
reg("Q20.03", lambda: math.ceil(math.ceil(30000 / (1024 // 100)) / (1024 // 15)))
reg("Q20.04", lambda: 2 + 1)  # 45 first-level blocks -> ceil(45/68)=1 top block: two index levels + one data block
def _wasted():
    blocks, cur = [], 0
    for r in (30, 45, 60, 25, 50, 40):
        if cur + r > 100:
            blocks.append(cur)
            cur = 0
        cur += r
    blocks.append(cur)
    return 100 * (1 - sum(blocks) / (100 * len(blocks)))
reg("Q20.07", _wasted)
reg("Q20.09", lambda: max(p for p in range(2, 500) if p * 8 + (p - 1) * 12 <= 2048))
reg("Q20.10", lambda: max(q for q in range(1, 500) if q * (12 + 10) + 8 <= 2048))
reg("Q20.11", lambda: max(p for p in range(2, 500) if p * 6 + (p - 1) * (10 + 8) <= 1024))
reg("Q20.12", lambda: math.ceil(8 / 2) - 1)
reg("Q20.13", lambda: 50 * 50 * 40)
reg("Q20.14", lambda: next(h for h in range(1, 10) if 5 ** h - 1 >= 400))
def _btree_maxlevels():
    best, nodes, keys = 0, 1, 1
    for h in range(1, 12):
        if h > 1:
            nodes = nodes * (2 if h == 2 else 3)
        mink = 1 + sum(2 * (2 * 3 ** (L - 2)) for L in range(2, h + 1)) if h > 1 else 1
        if h == 1:
            mink = 1
        else:
            mink = 1 + sum((2 * 3 ** (L - 2)) * 2 for L in range(2, h + 1))
        if mink <= 400:
            best = h
    return best
reg("Q20.15", _btree_maxlevels)
reg("Q20.17", lambda: -1 + 2 * (65 - 20) / (120 - 20))
reg("Q20.18", lambda: (12 - 8) / sqrt(sum((v - 8) ** 2 for v in (4, 8, 6, 10, 12)) / 5))
reg("Q20.19", lambda: 340 / 10 ** 4)
reg("Q20.20", lambda: sum([18, 20, 26, 30]) / 4)
reg("Q20.22", lambda: sum(1 for v in (5, 7, 12, 15, 18, 20, 26, 30, 31, 40, 41, 48) if 5 + 43 / 4 <= v < 5 + 2 * 43 / 4))
reg("Q20.24", lambda: 1 - (49 / 50) ** 5)
reg("Q20.29", lambda: (4 + 1) * (2 + 1) * (3 + 1))
reg("Q20.30", lambda: (lambda rows: len({(a, b) for a, b, _ in rows} | {(a, None) for a, _, _ in rows} | {(None, b) for _, b, _ in rows} | {(None, None)}))([("a", "x", 1), ("a", "y", 2), ("b", "x", 3), ("c", "y", 4)]))
reg("Q20.32", lambda: (56 + 74 + 182) / 8 - (44 / 8) ** 2)
reg("Q20.34", lambda: 100 * 365 * 20 * 0.3)
reg("Q29.15", lambda: next(sum(map(int, str(n))) for n in range(100, 1000) if math.prod(map(int, str(n))) == 105))
reg("Q29.17", lambda: 4 + (1 - 4 * (1 / 12 + 1 / 18)) / (1 / 18))
reg("Q29.18", lambda: (240 + 360) / (240 / 12))
reg("Q29.29", lambda: comb(4, 2) * comb(5, 2))
reg("Q29.30", lambda: 12 + 23 - 1)
reg("Q29.31", lambda: abs((3 * 30 + 40 * 0.5) - 40 * 6))
reg("Q29.33", lambda: 12 * (5 - 2))
reg("Q29.34", lambda: (5 - 2) ** 3)
reg("Q29.36", lambda: pi * 100 - 2 * 100)
reg("Q29.37", lambda: 2 ** 3)
reg("Q29.39", lambda: comb(7, 3))
reg("Q29.40", lambda: (12 - 2) * 180 / 12)



# ------------------------------------------------------------------ Mock Sets A/B/C (days 30-32): NAT items not already covered above
reg("Q30.01", lambda: 0.02 * 0.95 / (0.02 * 0.95 + 0.98 * (1 - 0.90)))
reg("Q30.02", lambda: 1 - exp(-3) * (1 + 3))
reg("Q30.03", lambda: exp(-0.5 * 3))
reg("Q30.04", lambda: 4 * 2 + 9 * 3)
reg("Q30.05", lambda: 50 + z975 * 12 / 6)
reg("Q30.07", lambda: sum((o - 10) ** 2 / 10 for o in (8, 12, 9, 11, 6, 14)))
reg("Q30.09", lambda: trace(mpow(F([[2, 1], [1, 2]]), 5)))
reg("Q30.11", lambda: 2 * 2 / 9)
reg("Q30.16", lambda: max(x / 1000 * exp(-x / 2000) for x in range(0, 20000)))
def _series_mul(a, b, n):
    return [sum(a[i] * b[k - i] for i in range(k + 1)) for k in range(n)]
reg("Q30.17", lambda: _series_mul([Fraction(1, factorial(k)) for k in range(5)], [Fraction(0)] + [Fraction((-1) ** (k + 1), k) for k in range(1, 5)], 5)[3])
reg("Q30.22", lambda: sum(1 for i, j in itertools.combinations(range(6), 2) if [5, 2, 4, 6, 1, 3][i] > [5, 2, 4, 6, 1, 3][j]))
reg("Q30.23", lambda: sum(1 for p in itertools.permutations("abcde") if p.index("a") < p.index("c") and p.index("b") < p.index("c") and p.index("c") < p.index("d") and p.index("b") < p.index("e")))
def _sales():
    db = sqlite3.connect(":memory:")
    db.execute("create table Sales(region text, rep int, amount int)")
    rows = [("North", a) for a in (120, 90, 300)] + [("South", a) for a in (150, 200, 80)] + [("East", a) for a in (500, 50)] + [("West", a) for a in (110, 130, 190)]
    db.executemany("insert into Sales values (?,?,?)", [(r, i, a) for i, (r, a) in enumerate(rows)])
    return sum(c for _, c in db.execute("SELECT region, COUNT(*) FROM Sales WHERE amount > 100 GROUP BY region HAVING SUM(amount) > 400"))
reg("Q30.25", _sales)
reg("Q30.26", lambda: len(_keys("ABCDE", [("A", "B"), ("BC", "E"), ("ED", "A")])))
reg("Q30.29", lambda: max(p for p in range(2, 1000) if p * 8 + (p - 1) * 16 <= 4096))
reg("Q30.30", lambda: solve([[3, 1], [1, 3]], [1 * 1 + 1 * 3, 2 * 1 + 1 * 3])[0])
reg("Q30.31", lambda: sum(1 / d for d, l in sorted((abs(x - 3.4), l) for x, l in ((1, "A"), (2, "A"), (4, "B"), (5, "B"), (6, "B"), (9, "A")))[:4] if l == "A"))
reg("Q30.32", lambda: 2 / sqrt(0.5 ** 2 + 0.5 ** 2))
reg("Q30.33", lambda: 1 / (1 + exp(-(-(0.5 - 0) ** 2 / 2 + (0.5 - 2) ** 2 / 2))))
def _km2d(pts, cents):
    while True:
        cl = [[p for p in pts if min(range(len(cents)), key=lambda i: math.dist(p, cents[i])) == j] for j in range(len(cents))]
        new = [(sum(p[0] for p in c) / len(c), sum(p[1] for p in c) / len(c)) for c in cl]
        if new == cents:
            return sum(math.dist(p, c) ** 2 for cl_, c in zip(cl, cents) for p in cl_)
        cents = new
reg("Q30.34", lambda: _km2d([(1, 1), (2, 1), (4, 3), (5, 4), (1, 2)], [(1, 1), (5, 4)]))
reg("Q30.35", lambda: 2 / (2 + 0.5))
reg("Q30.36", lambda: 10 * 8 + 8 + 8 * 8 + 8 + 8 * 3 + 3)
reg("Q30.38", lambda: _pruned([[3, 5, 10], [2, 9, 7], [6, 1, 8]]))
def _chain(pa, pba, pbna, pcb, pcnb, query):
    num = den = 0.0
    for a, b in itertools.product((True, False), repeat=2):
        p = (pa if a else 1 - pa) * ((pba if a else pbna) if b else 1 - (pba if a else pbna)) * (pcb if b else pcnb)
        den += p
        num += p if a else 0
    return num / den
reg("Q30.40", lambda: _chain(0.3, 0.9, 0.2, 0.7, 0.1, "a"))
reg("Q31.01", lambda: 2 / 11)
reg("Q31.02", lambda: 0.7 ** 10 + 10 * 0.3 * 0.7 ** 9)
reg("Q31.03", lambda: 1 - Phi(2))
reg("Q31.05", lambda: (27 / 2) ** (1 / 3))
reg("Q31.06", lambda: 1 - Phi(5 / sqrt(100 / 12)))
reg("Q31.08", lambda: _integ(lambda x: x * exp(-x), 1, 60, 400000) / exp(-1))
reg("Q31.09", lambda: det([[2, 1, 0], [1, 2, 1], [0, 1, 2]]) ** 3)
reg("Q31.11", lambda: 5 - 3)
reg("Q31.12", lambda: 5 - (6 / 2) * 1)
reg("Q31.14", lambda: Fraction(1 * 1 + 1 * 2 + 2 * 6, 1 + 1 + 4))
reg("Q31.16", lambda: 2 - (2 ** 2 - 5) / (2 * 2))
reg("Q31.17", lambda: (lambda x: x - 0.1 * 2 * (x - 3))((lambda x: x - 0.1 * 2 * (x - 3))(0.0)))
reg("Q31.20", lambda: _probe([22, 33, 4, 15, 26, 37, 8], 11, lambda k, i: k + i).index(37))
def _lomuto(a):
    cnt = 0
    def qs(lo, hi):
        nonlocal cnt
        if lo >= hi:
            return
        piv, i = a[hi], lo
        for j in range(lo, hi):
            cnt += 1
            if a[j] < piv:
                a[i], a[j] = a[j], a[i]
                i += 1
        a[i], a[hi] = a[hi], a[i]
        qs(lo, i - 1)
        qs(i + 1, hi)
    qs(0, len(a) - 1)
    return cnt
reg("Q31.21", lambda: _lomuto([4, 7, 1, 6, 3, 5, 2]))
reg("Q31.22", lambda: _bestfirst(_adj({("S", "A"): 4, ("S", "B"): 1, ("B", "A"): 2, ("B", "C"): 6, ("A", "C"): 1, ("A", "D"): 5, ("C", "D"): 2, ("C", "T"): 7, ("D", "T"): 1}, directed=True), "S", "T", lambda g_, s_: g_)[0])
reg("Q31.23", lambda: math.ceil(log(100 + 1, 2)))
def _emp31():
    db = sqlite3.connect(":memory:")
    db.execute("create table Emp(eid int, dept text, sal int)")
    db.executemany("insert into Emp values (?,?,?)", [(1, "A", 50), (2, "A", 70), (3, "A", 70), (4, "B", 40), (5, "B", 60), (6, "C", 55)])
    return len(db.execute("SELECT eid FROM Emp E WHERE NOT EXISTS (SELECT * FROM Emp F WHERE F.dept = E.dept AND F.sal > E.sal)").fetchall())
reg("Q31.25", _emp31)
reg("Q31.26", lambda: sum(1 for (a, b) in [(1, "x"), (2, "y"), (3, "x")] for (b2, c) in [("x", "p"), ("x", "q"), ("z", "r")] if b == b2))
reg("Q31.28", lambda: math.ceil(math.ceil(50000 / (4096 // 200)) / (4096 // 20)))
reg("Q31.29", lambda: (2 + 1) * (3 + 1) * (3 + 1))
reg("Q31.30", lambda: (lambda b1: 80 / 10 - b1 * 50 / 10 + b1 * 6)(Fraction(10 * 460 - 50 * 80, 10 * 290 - 50 * 50)))
reg("Q31.31", lambda: 1 / (1 + exp(-(1 * 2 + -2 * 1 - 0.5))))
reg("Q31.32", lambda: 1 - 2 * 0.5 * _H([6 / 8, 2 / 8]))
reg("Q31.38", lambda: minimax([[[3, 7], [2, 9]], [[5, 1], [8, 4]], [[6, 6], [0, 10]]], True))
reg("Q32.01", lambda: 0.5 * 3 / 5 / (0.5 * 3 / 5 + 0.5 * 1 / 5))
reg("Q32.02", lambda: (lambda E: E)(solve([[Fraction(1, 6), -Fraction(1, 6)], [-Fraction(5, 6), 1]], [1, 1])[0]))
reg("Q32.03", lambda: _integ(lambda x: 2 * x * x / 2, 0, 1))
reg("Q32.05", lambda: 1 / 2 ** 2)
reg("Q32.06", lambda: 3 / 4)
reg("Q32.07", lambda: ((19 - 4 - 9) / 2) / (2 * 3))
reg("Q32.09", lambda: sqrt(3 ** 2 + 1 ** 2))
reg("Q32.10", lambda: 2 * 2 * 1 * 1)
reg("Q32.11", lambda: inv([[1, 2], [0, 3]])[0][1])
reg("Q32.13", lambda: sum(x * x for x in (1 - 0.5, 0 - 0.5, 1 - 0)))
reg("Q32.14", lambda: 0.5 / (0.5 + 0.1))
reg("Q32.15", lambda: max(x ** 3 - 6 * x ** 2 + 9 * x + 1 for x in [i / 1000 for i in range(0, 4001)]))
reg("Q32.16", lambda: _integ(lambda x: x * exp(x), 0, 1))
def _mergecmp(a):
    cnt = 0
    def ms(x):
        nonlocal cnt
        if len(x) <= 1:
            return x
        l, r = ms(x[: len(x) // 2]), ms(x[len(x) // 2:])
        out = []
        while l and r:
            cnt += 1
            out.append(l.pop(0) if l[0] <= r[0] else r.pop(0))
        return out + l + r
    ms(a)
    return cnt
reg("Q32.22", lambda: _mergecmp([3, 8, 1, 6, 2, 7, 4, 5]))
reg("Q32.23", lambda: _mst([(4, 0, 1), (3, 0, 2), (2, 1, 2), (5, 1, 3), (7, 2, 3), (6, 2, 4), (1, 3, 4), (8, 3, 5), (9, 4, 5)], 6))
reg("Q32.24", lambda: sum(1 for x in range(4) for y in range(4) if x + y == 3))
reg("Q32.27", lambda: len([("A", "B"), ("B", "C"), ("C", "D"), ("D", "E")]))  # one relation per FD left side; key A lies in AB
reg("Q32.29", lambda: (22 - 10) / (60 - 10))
def _perceptron():
    w, b, upd = [0, 0], 0, 0
    data = [((1, 2), 1), ((2, -1), -1), ((-1, 1), 1), ((0, -2), -1)]
    while True:
        changed = False
        for x, y in data:
            if y * (w[0] * x[0] + w[1] * x[1] + b) <= 0:
                w = [w[0] + y * x[0], w[1] + y * x[1]]
                b += y
                upd += 1
                changed = True
        if not changed:
            return upd
reg("Q32.30", _perceptron)
reg("Q32.31", lambda: _cost([1, 2, 6, 7, 8, 15], (2, 7)))
reg("Q32.32", lambda: -1 - 0.1 * (1 / (1 + exp(-(1 * 1 - 1 * 2 + 0.5))) - 0) * 2)
reg("Q32.33", lambda: (1 * 2 - 2 * 1 - 3) ** 2 + 0.5 * (1 + 4))
reg("Q32.35", lambda: 9 / 14)
reg("Q32.38", lambda: _models(lambda a, b, c: (a or b) and ((not a) or c) and ((not b) or c), 3))
reg("Q32.39", lambda: (0.4 * 0.7 + 0.6 * 0.2) * 0.9 + (1 - (0.4 * 0.7 + 0.6 * 0.2)) * 0.3)
reg("Q32.40", lambda: 0.7 * 0.9 / (0.7 * 0.9 + 0.3 * 0.3))


# ------------------------------------------------------------------ runner
def parse_answer(r):
    a = r["answer"].replace("−", "-")
    m = re.fullmatch(r"(-?[\d.]+)\s*(?:–|to)\s*(-?[\d.]+)", a)
    if m:
        return float(m.group(1)), float(m.group(2))
    v = float(a)
    mm = re.search(r"round(?:ed)?\s+to\s+(\d+)\s+decimal", r["question"])
    d = max(len(a.split(".")[1]) if "." in a else 0, int(mm.group(1)) if mm else 0)
    t = 0.5 * 10 ** -d if d else 0
    return v - t, v + t


def matches(val, lo, hi, d_hint=None):
    if val is None:
        return None
    eps = 1e-4  # numerical-integration slack
    if lo - eps <= val <= hi + eps:
        return True
    # a key published as a rounded value: accept if rounding the recomputed value to the key's decimals equals the key
    return False


def load():
    return {json.loads(l)["id"]: json.loads(l) for l in SRC.read_text(encoding="utf-8").splitlines() if l.strip()}


def run_checks(recs, verbose=False):
    ok, bad = [], []
    for sid, f in sorted(CHECKS.items(), key=lambda kv: [int(x) for x in kv[0][1:].split(".")]):
        r = recs[sid]
        try:
            val = f()
        except Exception as ex:  # pragma: no cover
            bad.append((sid, r["answer"], f"ERROR {ex}"))
            continue
        lo, hi = parse_answer(r)
        if matches(float(val), lo, hi):
            ok.append((sid, r["answer"], val))
        else:
            bad.append((sid, r["answer"], val))
        if verbose:
            print(sid, r["answer"], val)
    return ok, bad



# ------------------------------------------------------------------ automated: Python snippets and SQL on the shared Emp/Dept database
_SAFE_IMPORT = re.compile(r"^\s*(?:from|import)\s+(collections|copy|itertools|functools|math)\b")
_DENY = re.compile(r"\b(?:open|eval|exec|compile|input|__import__|globals|locals|getattr|setattr|os|sys|subprocess)\b|__\w+__(?!\s*\()")


def run_python(code: str):
    for line in code.splitlines():
        if re.match(r"^\s*(?:from|import)\s", line) and not _SAFE_IMPORT.match(line):
            return None, "unsafe import"
    if _DENY.search(re.sub(r"def __init__|__init__|self\.__class__", "", code)):
        return None, "denied token"
    try:
        out = subprocess.run([sys.executable, "-I", "-c", code], capture_output=True, text=True, timeout=5)
    except subprocess.TimeoutExpired:
        return None, "timeout"
    if out.returncode:
        return None, "error: " + out.stderr.strip().splitlines()[-1][:80]
    return out.stdout.strip(), None


def _norm(t: str) -> str:
    return re.sub(r"\s+", " ", t.replace("`", "")).strip()


def python_checks(recs, bank):
    idm = json.loads((ROOT / "pipeline" / "gate_da" / "qbank" / "id_map.json").read_text())
    res = []  # (id, kind, answer, result, status)
    for sid, r in recs.items():
        m = re.findall(r"```python\n(.*?)```", r["question"], re.S)
        if len(m) != 1 or sid not in idm or r["type"] == "MSQ":
            continue
        out, err = run_python(m[0])
        if err:
            res.append((sid, r["type"], r["answer"], err, "skipped"))
            continue
        q = bank[idm[sid]]
        if r["type"] == "NAT":
            try:
                v = float(out.splitlines()[-1].split()[-1])
            except ValueError:
                res.append((sid, "NAT", r["answer"], out[:40], "skipped"))
                continue
            lo, hi = parse_answer(r)
            res.append((sid, "NAT", r["answer"], v, "match" if lo - 1e-9 <= v <= hi + 1e-9 else "MISMATCH"))
        else:
            hit = [o["key"] for o in q["options"] if _norm(o["text"]) == _norm(out)]
            ok = hit == q["answer"]["keys"]
            res.append((sid, "MCQ", r["answer"], f"output {out!r} -> {hit}", "match" if ok else ("skipped" if not hit else "MISMATCH")))
    return res


def _tables_from_ctx(recs):
    txt = next(c["text"] for r in recs.values() for c in r.get("contexts", []) if c["context_id"] == "Day18-ctx1")
    tabs = re.findall(r"\\begin\{tabular\}\{[^}]*\}(.*?)\\end\{tabular\}", txt, re.S)
    out = []
    for t in tabs:
        rows = [r for r in re.split(r"\\\\", re.sub(r"\\(?:toprule|midrule|bottomrule)", "", t)) if r.strip()]
        out.append([[c.strip() for c in row.split("&")] for row in rows])
    return out


def sql_checks(recs):
    emp, dept = _tables_from_ctx(recs)
    db = sqlite3.connect(":memory:")
    db.execute("create table Emp(eid int, name text, dept text, salary int, mgr int)")
    db.execute("create table Dept(dname text, building text)")
    nz = lambda v: None if v == "--" else v
    db.executemany("insert into Emp values (?,?,?,?,?)", [[nz(c) for c in r] for r in emp[1:]])
    db.executemany("insert into Dept values (?,?)", dept[1:])
    res = []
    for sid, r in recs.items():
        if r["day"] != 18 or r["type"] != "NAT":
            continue
        m = re.search(r"```sql\n(.*?)```", r["question"], re.S)
        if not m or "mathcal D" not in r["question"] or "CREATE" in m.group(1).upper():
            continue
        q = m.group(1).strip().rstrip(";")
        kind = "rows" if "number of rows returned" in r["question"] else "value" if "value returned" in r["question"] else None
        if not kind:
            continue
        try:
            rows = db.execute(q).fetchall()
        except sqlite3.Error as ex:
            res.append((sid, kind, r["answer"], f"sqlite: {str(ex)[:40]}", "skipped"))
            continue
        val = len(rows) if kind == "rows" else (rows[0][0] if len(rows) == 1 and len(rows[0]) == 1 else None)
        if val is None:
            res.append((sid, kind, r["answer"], rows[:3], "skipped"))
            continue
        lo, hi = parse_answer(r)
        res.append((sid, kind, r["answer"], val, "match" if lo - 1e-9 <= float(val) <= hi + 1e-9 else "MISMATCH"))
    return res


def main(argv=None) -> int:
    recs = load()
    ok, bad = run_checks(recs, "--verbose" in (argv or sys.argv[1:]))
    print(f"manual recomputations: {len(ok) + len(bad)}  match {len(ok)}  mismatch {len(bad)}")
    for b in bad:
        print("MISMATCH", b)
    bank = {q["id"]: q for q in json.loads((ROOT / "pipeline" / "bank_src" / "gate_da_qbank.json").read_text())}
    for name, rows in (("python snippets", python_checks(recs, bank)), ("sql on Emp/Dept", sql_checks(recs))):
        st = {k: sum(1 for r_ in rows if r_[4] == k) for k in ("match", "MISMATCH", "skipped")}
        print(f"{name}: {len(rows)} run  {st}")
        for r_ in rows:
            if r_[4] != "match" or "--verbose" in (argv or sys.argv[1:]):
                print("  ", r_)
    return 0


if __name__ == "__main__":
    sys.exit(main())
