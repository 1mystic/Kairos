"""In-line recomputation of numeric answers in the GATE DA fresh set (part A). Each entry: n -> computed value."""
from fractions import Fraction as F
from itertools import combinations, product
from math import comb, sqrt, erf
from statistics import median
from . import la

def phi(z): return 0.5 * (1 + erf(z / sqrt(2)))

def stirling2(n, k):
    return sum((-1) ** (k - j) * comb(k, j) * j ** n for j in range(k + 1)) // __import__("math").factorial(k)

def c():
    out = {}
    out[10] = float(F(4, 9) * 27)
    out[11] = (140 * .9 * .85 - 100)
    out[12] = pow(2, 2027, 9)
    # 14: inclusion-exclusion
    out[14] = (60 + 50 + 40 + 8 - 90) - 3 * 8
    x, y = 0, 0; out[15] = sqrt(7 ** 2 + 1 ** 2)
    out[18] = sum((6 - k) * (9 - k) for k in range(1, 6))
    # 20: brute force cube, faces top(z=3), front(y=0), right(x=3)
    cnt = 0
    for x, y, z in product(range(4), repeat=3):
        f = (z == 3) + (y == 0) + (x == 3)
        cnt += f == 1
    out[20] = cnt
    out[21] = sum(stirling2(6, k) for k in range(1, 5))
    # 22 brute: 8 people circular, fix A at position 0
    import itertools
    n = 0
    for p in itertools.permutations(range(1, 8)):
        seat = (0,) + p  # A=0,B=1,C=2,D=3 labels are people ids
        pos = {v: i for i, v in enumerate(seat)}
        adj = lambda a, b: (pos[a] - pos[b]) % 8 in (1, 7)
        n += adj(0, 1) and not adj(2, 3)
    out[22] = n
    out[23] = comb(10, 4) - comb(5, 2) * comb(5, 2)
    pr, f1, f2 = [.5, .3, .2], [.1, .2, .4], [.2, .3, .5]
    u = [a * b * (1 - c_) for a, b, c_ in zip(pr, f1, f2)]
    out[25] = u[2] / sum(u)
    out[26] = sum(all(b - a > 1 for a, b in zip(s, s[1:])) for s in combinations(range(1, 11), 3)) / comb(10, 3)
    v = [3, 14, 17, 19, 20, 22, 24, 25, 27, 30, 44, 61]
    q1 = median(v[:6]); q3 = median(v[6:]); iqr = q3 - q1
    out[27] = sum(a for a in v if a < q1 - 1.5 * iqr or a > q3 + 1.5 * iqr)
    out[30] = 20 + (20 - 13) / 12 * 10
    out[31] = sum(max(a, b) for a in range(1, 6) for b in range(1, 6)) / 25
    out[32] = sum(__import__('math').prod([p if s else 1 - p for s, p in zip(bits, (.2, .5, .7))]) for bits in product([0, 1], repeat=3) if sum(bits) == 1)
    out[33] = comb(5, 2) * .3 ** 2 * .7 ** 3 / (1 - .7 ** 5)
    row = [F(1, 8), F(3, 8), F(4, 8)]  # row Y=1 of the table renormalised (1,3,4)/8
    assert row == [F(x, 8) for x in (1, 3, 4)]
    out[34] = float(sum(p * x * x for p, x in zip(row, range(3))) - sum(p * x for p, x in zip(row, range(3))) ** 2)
    out[35] = .3 * 4 + .7 * 3 + .3 * .7 * (10 - 3) ** 2
    out[36] = .25 * (6 + 36)
    out[38] = 3 - sqrt(3)
    out[39] = 0.09 / 0.25
    out[42] = 1 - 0.8686
    out[43] = int(__import__('math').ceil(1.96 ** 2 * 12 / .25))
    A = [12, 15, 11, 14, 13]; B = [9, 12, 10, 8, 11, 10]
    ma, mb = sum(A) / 5, sum(B) / 6
    sp2 = (sum((x - ma) ** 2 for x in A) + sum((x - mb) ** 2 for x in B)) / 9
    out[44] = (ma - mb) / sqrt(sp2 * (1 / 5 + 1 / 6))
    out[46] = 1 - 0.7549
    U = [[1, 0, 1, 0], [0, 1, 0, 1], [1, 1, 0, 0]]; W = [[1, 1, 1, 1], [1, 0, 0, 1], [0, 0, 1, 1]]
    out[48] = la.rank(U) + la.rank(W) - la.rank(U + W)
    out[49] = float(la.solve([[1, 0, 1], [1, 1, 0], [0, 1, 1]], [2, 5, 4])[1])
    out[52] = float(la.det([[2, 1, 1, 0], [1, 2, 0, 1], [1, 1, 3, 1], [0, 1, 1, 4]]))
    out[53] = sum(1 for k in range(-5, 6) if 1 > 0 and 2 - k * k > 0 and la.det([[1, k, 0], [k, 2, 1], [0, 1, 3]]) > 0)
    out[54] = 3 + 10  # a=3,b=10 from eq3-eq2
    out[55] = 6 - la.rank([[1, 2, 0, 1, 0, 3], [2, 4, 1, 4, 1, 9], [0, 0, 1, 2, 0, 1], [0, 0, 0, 0, 1, 2]])
    return out
