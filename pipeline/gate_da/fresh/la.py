"""Tiny exact linear algebra on Fractions (no numpy in the pipeline venv)."""
from fractions import Fraction as F
from statistics import median


def rref(M):
    M = [[F(x) for x in r] for r in M]
    r = 0; piv = []
    for c in range(len(M[0])):
        p = next((i for i in range(r, len(M)) if M[i][c] != 0), None)
        if p is None: continue
        M[r], M[p] = M[p], M[r]
        M[r] = [x / M[r][c] for x in M[r]]
        for i in range(len(M)):
            if i != r and M[i][c] != 0:
                f = M[i][c]; M[i] = [a - f * b for a, b in zip(M[i], M[r])]
        piv.append(c); r += 1
        if r == len(M): break
    return M, piv


def rank(M): return len(rref(M)[1])


def det(M):
    M = [[F(x) for x in r] for r in M]; n = len(M); d = F(1)
    for c in range(n):
        p = next((i for i in range(c, n) if M[i][c] != 0), None)
        if p is None: return F(0)
        if p != c: M[c], M[p] = M[p], M[c]; d = -d
        d *= M[c][c]
        for i in range(c + 1, n):
            f = M[i][c] / M[c][c]; M[i] = [a - f * b for a, b in zip(M[i], M[c])]
    return d


def solve(A, b):
    aug = [list(r) + [x] for r, x in zip(A, b)]
    R, piv = rref(aug)
    return [R[i][-1] for i in range(len(A))]


def matmul(A, B): return [[sum(F(a) * F(b) for a, b in zip(r, c)) for c in zip(*B)] for r in A]
def T(A): return [list(r) for r in zip(*A)]
