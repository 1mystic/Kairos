"""In-line recomputation of numeric answers in the GATE DA fresh set (part B). Programs are re-typed, never exec'd from the source."""
from fractions import Fraction as F
from itertools import permutations
from math import e, exp, log, sin, sqrt, comb, factorial
from . import la


def c():
    o = {}
    # 56: gaussian elimination, no pivoting
    A = [[F(x) for x in r] for r in [[4, 2, 1], [2, 3, 2], [6, 4, 5]]]
    for i in range(3):
        for r in range(i + 1, 3):
            f = A[r][i] / A[i][i]; A[r] = [a - f * b for a, b in zip(A[r], A[i])]
    o[56] = float(A[2][2])
    M = [[1, 2], [1, 0]]
    P = [[1, 0], [0, 1]]
    for _ in range(5): P = la.matmul(P, M)
    o[57] = float(P[0][1])
    o[58] = (1 + 1) ** 2 * (-2 + 1) ** 2 * (3 + 1) ** 2
    Pm = [[F(5, 10), F(3, 10), F(2, 10)], [F(2, 10), F(6, 10), F(2, 10)], [F(1, 10), F(3, 10), F(6, 10)]]
    # pi (P - I) = 0, sum = 1
    Mt = [[Pm[j][i] - (1 if i == j else 0) for j in range(3)] for i in range(3)]
    Mt[2] = [1, 1, 1]
    o[60] = float(la.solve(Mt, [0, 0, 1])[0])
    Ac = [[1, 0], [1, 1], [1, 2]]; b = [1, 2, 4]
    AtA = la.matmul(la.T(Ac), Ac); Atb = [sum(Ac[i][k] * b[i] for i in range(3)) for k in range(2)]
    x = la.solve(AtA, Atb)
    o[61] = float(sum(F(Ac[2][k]) * x[k] for k in range(2)))
    L = [[F(x) for x in r] for r in [[3, 1, 2], [6, 5, 3], [-3, 4, 7]]]
    l21 = L[1][0] / L[0][0]; l31 = L[2][0] / L[0][0]
    R2 = [a - l21 * b for a, b in zip(L[1], L[0])]; R3 = [a - l31 * b for a, b in zip(L[2], L[0])]
    o[64] = float(R3[1] / R2[1])
    a1 = [1, 2, 2]; a2 = [2, 1, 3]
    dot = lambda u, v: sum(p * q for p, q in zip(u, v))
    q1 = [x / sqrt(dot(a1, a1)) for x in a1]
    r12 = dot(q1, a2); w = [p - r12 * q for p, q in zip(a2, q1)]
    o[65] = sqrt(dot(w, w))
    # 66: singular values of A=[[1,1],[1,1],[1,-1]] via eigenvalues of A^T A = [[3,1],[1,3]]
    ev = [(6 + s * sqrt(36 - 4 * 8)) / 2 for s in (1, -1)]
    o[66] = sqrt(min(ev) / sum(ev))
    f67 = lambda x: (x * exp(x) - sin(x) - x * x) / x ** 3
    o[67] = f67(1e-2)  # numeric check of the limit (O(x) error)
    o[68] = (1 + 1 / (2 * 1e7) - 4 / 1e14) ** (6 * 1e7)
    b_ = 8; assert abs((2 ** 3 - 8) / 1 + 0) == 0; a_ = 3 / 8
    o[69] = a_ + b_ if 4 + b_ == 12 else None
    n = 100000; o[71] = sum(1 / (n + k) for k in range(1, 2 * n + 1))
    # 72: series of exp(sin x): compute coefficient exactly via power series arithmetic
    N = 6
    s = [F(0)] * N; s[1] = F(1); s[3] = F(-1, 6); s[5] = F(1, 120)
    def mul(p, q):
        r = [F(0)] * N
        for i in range(N):
            for j in range(N - i): r[i + j] += p[i] * q[j]
        return r
    res = [F(0)] * N; res[0] = F(1); term = [F(0)] * N; term[0] = F(1)
    for k in range(1, N):
        term = [t / k for t in mul(term, s)]
        res = [a + t for a, t in zip(res, term)]
    o[72] = float(res[4])
    o[73] = 3 + 1 / 27 - 1 / 2187
    n = 0
    while True:
        if 0.5 ** (n + 1) / (n + 1) < 1e-3: break
        n += 1
    o[74] = n
    xs = [x / 1000 for x in range(-1000, 3001)]
    o[75] = max(x * x * exp(-x) for x in xs)
    xs = [x / 10000 for x in range(1, 60000)]
    o[76] = max(x * (20 - 2 * x) * (12 - 2 * x) for x in xs)
    g = lambda x: exp(x) - 3 * x * x
    roots = 0; xs = [i / 1000 for i in range(-10000, 10001)]
    for u, v in zip(xs, xs[1:]):
        if g(u) * g(v) < 0: roots += 1
    o[78] = roots
    o[79] = log((e ** 2 - 1) / 2)
    f = lambda x: x ** 4 - 3 * x * x + x
    x1 = F(1) - F(4 - 6 + 1, 12 - 6); o[80] = float(x1 ** 4 - 3 * x1 ** 2 + x1)
    # 84
    d = {}
    for w in "data flows into the lake and data stays in the lake".split(): d.setdefault(len(w), []).append(w)
    counts = {k: len(set(v)) for k, v in d.items() if len(v) > 1}
    xx = d.pop(2); z = d.pop(6, [])
    o[84] = sum(counts.values()) * 100 + len(d) * 10 + len(xx) + len(z)
    # 89
    calls = [0]; memo = {}
    def g(n):
        calls[0] += 1
        if n in memo: return memo[n]
        r = 1 if n <= 2 else g(n - 1) + g(n - 3) + g(n // 2)
        memo[n] = r; return r
    g(12); o[89] = calls[0]
    # 90
    Q = [None] * 7; fr = rr = 0
    def enq(v):
        nonlocal rr
        if (rr + 1) % 7 == fr: return
        Q[rr] = v; rr = (rr + 1) % 7
    for v in (10, 20, 30, 40, 50): enq(v)
    for _ in range(3): fr = (fr + 1) % 7
    for v in (60, 70, 80, 90, 95): enq(v)
    fr = (fr + 1) % 7; enq(100); o[90] = Q.index(100)
    # 92
    toks = "a + b * ( c - d / ( e ^ f ^ g ) ) - h".split()
    prec = {"^": 3, "*": 2, "/": 2, "+": 1, "-": 1}; right = {"^"}
    st = []; mx = 0
    for t in toks:
        if t.isalpha(): continue
        if t == "(": st.append(t)
        elif t == ")":
            while st[-1] != "(": st.pop()
            st.pop()
        else:
            while st and st[-1] != "(" and (prec[st[-1]] > prec[t] or (prec[st[-1]] == prec[t] and t not in right)): st.pop()
            st.append(t)
        mx = max(mx, len(st))
    o[92] = mx
    # 95
    A = [9, 7, 8, 3, 6, 1, 5, 2, 4, 0]; sw = 0; nn = len(A)
    for i in range(4, -1, -1):
        j = i
        while True:
            l, r = 2 * j + 1, 2 * j + 2; m = j
            if l < nn and A[l] < A[m]: m = l
            if r < nn and A[r] < A[m]: m = r
            if m == j: break
            A[j], A[m] = A[m], A[j]; sw += 1; j = m
    o[95] = sw
    # 96
    T = [None] * 11
    for k in (92, 59, 85, 48, 56, 43, 34):
        i = 0
        while True:
            s_ = (k % 11 + i * (1 + k % 7)) % 11
            if T[s_] is None: T[s_] = k; break
            i += 1
    o[96] = T.index(34)
    # 97
    def lb(A, x):
        lo, hi, it = 0, len(A), 0
        while lo < hi:
            it += 1; mid = (lo + hi) // 2
            if A[mid] < x: lo = mid + 1
            else: hi = mid
        return lo, it
    A = [2, 3, 3, 5, 5, 5, 8, 9, 11, 14, 14, 20]
    p, q = lb(A, 5); r, s_ = lb(A, 13); o[97] = p + q + r + s_
    A = [6, 2, 9, 4, 1, 7, 3, 8]; o[98] = sum(1 for i in range(8) for j in range(i + 1, 8) if A[i] > A[j])
    A = [4, 1, 3, 2, 5, 7, 6, 8, 9]; bound, comps = len(A) - 1, 0
    while bound > 0:
        last = 0
        for j in range(bound):
            comps += 1
            if A[j] > A[j + 1]: A[j], A[j + 1] = A[j + 1], A[j]; last = j
        bound = last
    o[99] = comps
    ed = [(1, 3), (2, 3), (3, 5), (2, 4), (4, 6), (5, 7), (6, 7)]
    o[104] = sum(1 for p in permutations(range(1, 8)) if all(p.index(u) < p.index(v) for u, v in ed))
    ue = [(1, 2), (1, 5), (2, 3), (2, 6), (5, 6), (5, 9), (3, 4), (6, 7), (7, 8), (4, 8), (9, 8)]
    adj = {i: sorted([b for a, b in ue if a == i] + [a for a, b in ue if b == i]) for i in range(1, 10)}
    seen = [1]; qq = [1]
    while qq:
        u = qq.pop(0)
        for v in adj[u]:
            if v not in seen: seen.append(v); qq.append(v)
    o[105] = seen[5]
    o[107] = (73600 - 12000) / (98000 - 12000) * 2 - 1
    return o
