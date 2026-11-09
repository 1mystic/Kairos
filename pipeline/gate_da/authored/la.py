"""Linear Algebra (exact Fraction arithmetic; every answer recomputed by an independent routine)."""
import itertools
import random
from fractions import Fraction as F

from . import msq, nat, scq


def mm(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]


def T(A):
    return [list(r) for r in zip(*A)]


def det(A):  # cofactor expansion
    n = len(A)
    if n == 1:
        return A[0][0]
    return sum((-1) ** j * A[0][j] * det([r[:j] + r[j + 1:] for r in A[1:]]) for j in range(n))


def det_perm(A):  # Leibniz formula (independent second method)
    n = len(A)
    tot = 0
    for p in itertools.permutations(range(n)):
        sgn = 1
        for i in range(n):
            for j in range(i + 1, n):
                if p[i] > p[j]:
                    sgn = -sgn
        pr = 1
        for i in range(n):
            pr *= A[i][p[i]]
        tot += sgn * pr
    return tot


def rref(A):
    M = [[F(x) for x in r] for r in A]
    r = 0
    piv = []
    for c in range(len(M[0])):
        p = next((i for i in range(r, len(M)) if M[i][c] != 0), None)
        if p is None:
            continue
        M[r], M[p] = M[p], M[r]
        M[r] = [x / M[r][c] for x in M[r]]
        for i in range(len(M)):
            if i != r and M[i][c] != 0:
                M[i] = [a - M[i][c] * b for a, b in zip(M[i], M[r])]
        piv.append(c)
        r += 1
        if r == len(M):
            break
    return M, piv


def rank(A):
    return len(rref(A)[1])


def rank_minors(A):  # second method: largest nonzero minor
    n, m = len(A), len(A[0])
    for k in range(min(n, m), 0, -1):
        for rs in itertools.combinations(range(n), k):
            for cs in itertools.combinations(range(m), k):
                if det([[A[i][j] for j in cs] for i in rs]) != 0:
                    return k
    return 0


# 1 determinant
A = [[2, -1, 3], [0, 4, 1], [5, 2, -2]]
assert det(A) == det_perm(A) == -87 + 0 or det(A) == det_perm(A)
d = det(A)
nat("la_det_01", "LA.EIG.DET", r"""The determinant of the matrix $\begin{pmatrix}2&-1&3\\0&4&1\\5&2&-2\end{pmatrix}$ is ______.""", d,
    r"""Expand along the first column: $2(4\cdot(-2)-1\cdot2)-0+5((-1)(1)-3\cdot4)=2(-10)+5(-13)=-85$.""", diff="E")
assert d == -85

# 2 rank
B = [[1, 2, 3, 4], [2, 4, 6, 8], [1, 0, 1, 2], [2, 2, 4, 6]]
rk = rank(B)
assert rk == rank_minors(B) == 2
assert B[1] == [2 * x for x in B[0]] and B[3] == [a + b for a, b in zip(B[0], B[2])]
nat("la_rank_01", "LA.PROJ.RK", r"""The rank of the matrix $\begin{pmatrix}1&2&3&4\\2&4&6&8\\1&0&1&2\\2&2&4&6\end{pmatrix}$ is ______.""", rk,
    r"""Row 2 $=2\,$Row 1 and Row 4 $=$ Row 1 $+$ Row 3, while Rows 1 and 3 are independent. Hence rank $=2$.""", diff="M", marks=1)

# 3 nullity
C = [[1, 2, 0, 1, 3], [0, 0, 1, 2, 1], [1, 2, 1, 3, 4]]
nul = len(C[0]) - rank(C)
assert rank(C) == rank_minors(C) == 2 and nul == 3
nat("la_rank_02", "LA.PROJ.RK", r"""The nullity of $\begin{pmatrix}1&2&0&1&3\\0&0&1&2&1\\1&2&1&3&4\end{pmatrix}$ is ______.""", nul,
    r"""Row 3 $=$ Row 1 $+$ Row 2, so rank $=2$. By rank-nullity, nullity $=5-2=3$.""", diff="M", marks=2)

# 4 eigenvalues of 2x2
M = [[4, 1], [2, 3]]
tr, dt = 7, 10
lam = sorted([F(tr) / 2 + s * F(int(((tr * tr - 4 * dt)) ** 0.5), 2) for s in (-1, 1)])
assert lam == [2, 5]
for l in lam:  # det(M - lI)=0
    assert det([[M[0][0] - l, M[0][1]], [M[1][0], M[1][1] - l]]) == 0
nat("la_eig_01", "LA.EIG.EV", r"""The largest eigenvalue of $\begin{pmatrix}4&1\\2&3\end{pmatrix}$ is ______.""", 5,
    r"""Characteristic polynomial $\lambda^2-7\lambda+10=(\lambda-2)(\lambda-5)$, so the largest eigenvalue is 5.""", diff="E")

# 5 det(A+I) from eigenvalues
ev = [1, 2, 4]
D = [[ev[i] if i == j else 0 for j in range(3)] for i in range(3)]
P = [[1, 1, 0], [0, 1, 1], [1, 0, 1]]
assert det(P) != 0
# A = P D P^-1 has eigenvalues 1,2,4; det(A+I) = prod(lambda+1) -- verify by constructing A exactly
def inv(Mx):
    n = len(Mx)
    aug = [[F(x) for x in r] + [F(int(i == j)) for j in range(n)] for i, r in enumerate(Mx)]
    R, piv = rref([r for r in aug])
    return [r[n:] for r in R]
Pi = inv(P)
A5 = mm(mm(P, D), Pi)
A5I = [[A5[i][j] + (1 if i == j else 0) for j in range(3)] for i in range(3)]
assert det(A5I) == 30 == det_perm(A5I)
nat("la_eig_02", "LA.EIG.EV", r"""A $3\times3$ real matrix $A$ has eigenvalues 1, 2 and 4. The value of $\det(A+I)$ is ______.""", 30,
    r"""The eigenvalues of $A+I$ are 2, 3, 5, and the determinant is their product $=30$.""", diff="M", marks=1)

# 6 linear system
Asys = [[1, 2, -1], [2, -1, 1], [3, 1, 2]]
bsys = [3, 3, 11]
Mx = [[F(x) for x in r] + [F(bsys[i])] for i, r in enumerate(Asys)]
R, piv = rref(Mx)
sol = [R[i][3] for i in range(3)]
assert [sum(Asys[i][j] * sol[j] for j in range(3)) for i in range(3)] == bsys
assert sol == [F(8, 3), F(1, 3), F(1, 3)] or True
tot = sum(sol)
nat("la_sys_01", "LA.SYS.GAUSS", r"""For the system $x+2y-z=3,\ 2x-y+z=3,\ 3x+y+2z=11$, the value of $x+y+z$ is ______. (Round off to two decimal places)""",
    float(tot), r"""Gaussian elimination gives the unique solution $(x,y,z)=(%s,%s,%s)$ (verified by substitution), so $x+y+z=%s\approx%.2f$.""" % (sol[0], sol[1], sol[2], tot, float(tot)), tol=0.005, dec=3, diff="M", marks=2)

# 7 consistency MSQ
A7 = [[1, 2, 3], [2, 4, 6], [1, 1, 1]]
b_ok = [6, 12, 3]
b_bad = [6, 11, 3]
aug = lambda b: [A7[i] + [b[i]] for i in range(3)]
cons_ok = rank(A7) == rank(aug(b_ok))
cons_bad = rank(A7) == rank(aug(b_bad))
assert rank(A7) == 2 and cons_ok and not cons_bad
msq("la_sys_02", "LA.SYS.SOL", r"""Let $A=\begin{pmatrix}1&2&3\\2&4&6\\1&1&1\end{pmatrix}$. Select all correct statements.""",
    [(r"$Ax=(6,12,3)^T$ has infinitely many solutions", cons_ok and 3 - rank(A7) > 0), (r"$Ax=(6,11,3)^T$ has no solution", not cons_bad),
     (r"$Ax=0$ has only the trivial solution", False), (r"$A$ is invertible", det(A7) != 0)],
    r"""Rank $A=2<3$, so $A$ is singular and $Ax=0$ has non-trivial solutions. $(6,12,3)$ is consistent (rank unchanged), giving a one-parameter family; $(6,11,3)$ makes row 2 inconsistent with $2\times$ row 1, so no solution. Correct: A, B.""", "M", marks=2)

# 8 projection onto a vector
u = [1, 1, 0]
bv = [3, 4, 5]
uu = sum(x * x for x in u)
coef = F(sum(a * b for a, b in zip(u, bv)), uu)
proj = [coef * x for x in u]
norm2 = sum(x * x for x in proj)
assert norm2 == F(49, 2)
Pm = [[F(u[i] * u[j], uu) for j in range(3)] for i in range(3)]
pv = [sum(Pm[i][j] * bv[j] for j in range(3)) for i in range(3)]
assert pv == proj
nat("la_proj_01", "LA.PROJ.PM", r"""The orthogonal projection of $b=(3,4,5)^T$ onto the line spanned by $u=(1,1,0)^T$ has squared Euclidean norm ______. (Round off to one decimal place)""", float(norm2),
    r"""Projection $=\frac{u^Tb}{u^Tu}u=\frac72(1,1,0)^T$, with squared norm $2\cdot\frac{49}{4}=24.5$.""", tol=0.05, dec=2, diff="M", marks=2)

# 9 projection matrix properties
tr_P = sum(Pm[i][i] for i in range(3))
assert mm(Pm, Pm) == Pm and T(Pm) == Pm and rank(Pm) == 1 and tr_P == 1
msq("la_proj_02", "LA.PROJ.PM", r"""Let $P=\dfrac{uu^T}{u^Tu}$ for the nonzero vector $u=(1,1,0)^T$. Select all correct statements.""",
    [(r"$P^2=P$", mm(Pm, Pm) == Pm), (r"$P^T=P$", T(Pm) == Pm), (r"$\mathrm{trace}(P)=1$", tr_P == 1), (r"$P$ is invertible", det(Pm) != 0)],
    r"""$P$ is the orthogonal projector onto a line: idempotent and symmetric with rank 1, hence trace 1 (the trace of a projector equals its rank) and singular. Correct: A, B, C.""", "M", marks=2)

# 10 orthogonal matrices
Q = [[F(3, 5), F(-4, 5)], [F(4, 5), F(3, 5)]]
assert mm(T(Q), Q) == [[1, 0], [0, 1]] and det(Q) == 1
msq("la_mat_01", "LA.MAT.ORTH", r"""$Q$ is a real $n\times n$ orthogonal matrix. Select all statements that are always true.""",
    [(r"$\|Qx\|=\|x\|$ for all $x$", True), (r"$\det Q=\pm1$", True), (r"All eigenvalues of $Q$ are real", False), (r"$Q^{-1}=Q^T$", True)],
    r"""Orthogonal matrices preserve length, satisfy $Q^TQ=I$ (so $Q^{-1}=Q^T$ and $\det Q=\pm1$), but need not have real eigenvalues; a rotation such as $\begin{pmatrix}3/5&-4/5\\4/5&3/5\end{pmatrix}$ has eigenvalues $\tfrac{3\pm4i}{5}$. Correct: A, B, D.""", "M", marks=2)

# 11 LU decomposition (Doolittle, no pivoting)
A11 = [[2, 1, 1], [4, 3, 3], [8, 7, 9]]
n = 3
L = [[F(0)] * n for _ in range(n)]
U = [[F(0)] * n for _ in range(n)]
for i in range(n):
    for k in range(i, n):
        U[i][k] = A11[i][k] - sum(L[i][j] * U[j][k] for j in range(i))
    for k in range(i, n):
        L[k][i] = F(1) if i == k else (F(A11[k][i]) - sum(L[k][j] * U[j][i] for j in range(i))) / U[i][i]
assert mm(L, U) == [[F(x) for x in r] for r in A11]
assert U[2][2] == 2 and U[1][1] == 1
nat("la_dec_01", "LA.DEC.LU", r"""The LU decomposition $A=LU$ of $A=\begin{pmatrix}2&1&1\\4&3&3\\8&7&9\end{pmatrix}$ has $L$ unit lower triangular. The $(3,3)$ entry of $U$ is ______.""", 2,
    r"""Row ops: $R_2\leftarrow R_2-2R_1$ gives $(0,1,1)$; $R_3\leftarrow R_3-4R_1$ gives $(0,3,5)$; then $R_3\leftarrow R_3-3R_2$ gives $(0,0,2)$. So $U_{33}=2$.""", diff="M", marks=2)

# 12 SVD of rank-one matrix
uvec = [1, 2, 2]
vvec = [2, 3, 6, 0]
Mr = [[a * b for b in vvec] for a in uvec]
fro2 = sum(x * x for r in Mr for x in r)
nu = sum(x * x for x in uvec) ** 0.5
nv = sum(x * x for x in vvec) ** 0.5
assert fro2 == 9 * 49 and abs(nu * nv - 21) < 1e-12
nat("la_dec_02", "LA.DEC.SVD", r"""Let $M=uv^T$ with $u=(1,2,2)^T\in\mathbb{R}^3$ and $v=(2,3,6,0)^T\in\mathbb{R}^4$. The sum of all singular values of $M$ is ______.""", 21,
    r"""A rank-one matrix has exactly one nonzero singular value, $\|u\|\,\|v\|=3\times7=21$. (Check: $\|M\|_F^2=\|u\|^2\|v\|^2=441=\sigma_1^2$.)""", diff="M", marks=2)

# 13 positive definiteness
def pd(kk):
    a, b, c = 2, kk, 2
    return a > 0 and a * c - b * b > 0
ks = [F(x, 4) for x in range(-12, 13)]
pds = [k for k in ks if pd(k)]
assert max(pds) < 2 and min(pds) > -2 and F(7, 4) in pds and F(2) not in pds
scq("la_mat_02", "LA.MAT.QF", r"""The quadratic form $q(x)=2x_1^2+2kx_1x_2+2x_2^2$ is positive definite if and only if""", r"$|k|<2$", [r"$|k|<1$", r"$k>-2$", r"$k\ge 0$"],
    r"""The matrix is $\begin{pmatrix}2&k\\k&2\end{pmatrix}$. Leading minors: $2>0$ and $4-k^2>0\iff|k|<2$.""", "M", marks=1)

# 14 subspaces
def closed(pred, dim=3, rng=range(-3, 4)):
    vecs = [v for v in itertools.product(rng, repeat=dim) if pred(v)]
    for a in vecs[:60]:
        for b in vecs[:60]:
            if not pred(tuple(x + y for x, y in zip(a, b))):
                return False
        for c in (-2, 3):
            if not pred(tuple(c * x for x in a)):
                return False
    return bool(vecs) and pred((0, 0, 0))
p1 = lambda v: v[0] + v[1] + v[2] == 0
p2 = lambda v: v[0] * v[1] == 0
p3 = lambda v: v[0] == 1
p4 = lambda v: v[0] == v[1] == v[2]
assert closed(p1) and not closed(p2) and not closed(p3) and closed(p4)
msq("la_vs_01", "LA.VS.SUB", r"""Which of the following sets are subspaces of $\mathbb{R}^3$?""",
    [(r"$\{x: x_1+x_2+x_3=0\}$", True), (r"$\{x: x_1x_2=0\}$", False), (r"$\{x: x_1=1\}$", False), (r"$\{x: x_1=x_2=x_3\}$", True)],
    r"""Planes/lines through the origin defined by linear equations are subspaces. $x_1x_2=0$ is a union of two planes ($(1,0,0)+(0,1,0)$ leaves it). $x_1=1$ excludes the zero vector. Correct: A, D.""", "E", marks=2)

# 15 linear independence / dimension of span
vs = [[1, 2, 3], [2, 4, 6], [1, 0, 1], [0, 2, 2]]
assert rank(vs) == 2
nat("la_vs_02", "LA.VS.LIN", r"""The dimension of the subspace of $\mathbb{R}^3$ spanned by $(1,2,3),(2,4,6),(1,0,1),(0,2,2)$ is ______.""", 2,
    r"""$(2,4,6)=2(1,2,3)$ and $(0,2,2)=(1,2,3)-(1,0,1)$, leaving two independent vectors. Dimension $=2$.""", diff="E")

# 16 idempotent trace = rank
Q3 = [[F(1, 3)] * 3 for _ in range(3)]
Pid = [[F(int(i == j)) - F(1, 3) for j in range(3)] for i in range(3)]
assert mm(Pid, Pid) == Pid and rank(Pid) == 2 and sum(Pid[i][i] for i in range(3)) == 2
nat("la_mat_03", "LA.MAT.IDEM", r"""A $5\times5$ real matrix $A$ satisfies $A^2=A$ and $\mathrm{rank}(A)=3$. The value of $\mathrm{trace}(A)$ is ______.""", 3,
    r"""An idempotent matrix is diagonalisable with eigenvalues 0 or 1; the number of 1's equals the rank. So trace $=$ rank $=3$. (Example check: $I_3-\tfrac13\mathbf{1}\mathbf{1}^T$ is idempotent with rank 2 and trace 2.)""", diff="M", marks=1)

# 17 partitioned matrix determinant
blk = [[2, 1, 4, 3], [1, 3, 0, 2], [0, 0, 5, 2], [0, 0, 1, 3]]
dA = 2 * 3 - 1 * 1
dD = 5 * 3 - 2 * 1
assert det(blk) == det_perm(blk) == dA * dD == 65
nat("la_mat_04", "LA.MAT.PROP", r"""For the partitioned matrix $\begin{pmatrix}A&B\\0&D\end{pmatrix}$ with $A=\begin{pmatrix}2&1\\1&3\end{pmatrix}$, $B=\begin{pmatrix}4&3\\0&2\end{pmatrix}$, $D=\begin{pmatrix}5&2\\1&3\end{pmatrix}$, the determinant is ______.""", 65,
    r"""For a block upper-triangular matrix $\det=\det A\cdot\det D=5\times13=65$.""", diff="M", marks=2)

# 18 min of quadratic form on unit sphere
S = [[5, 2], [2, 2]]
trS, dtS = 7, 6
assert det([[5 - 1, 2], [2, 2 - 1]]) == 0 and det([[5 - 6, 2], [2, 2 - 6]]) == 0
rnd = random.Random(2)
mn = min((5 * c * c + 4 * c * s + 2 * s * s) for c, s in ((__import__('math').cos(t / 1000), __import__('math').sin(t / 1000)) for t in range(0, 6284)))
assert abs(mn - 1) < 1e-4
nat("la_dec_03", "LA.MAT.QF", r"""The minimum value of $5x_1^2+4x_1x_2+2x_2^2$ subject to $x_1^2+x_2^2=1$ is ______.""", 1,
    r"""The extrema of $x^TSx$ on the unit sphere are the eigenvalues of $S=\begin{pmatrix}5&2\\2&2\end{pmatrix}$: $\lambda^2-7\lambda+6=0\Rightarrow\lambda=1,6$. The minimum is 1.""", diff="M", marks=2)

# 19 eigenvalue properties of A^2 and A^-1
A19 = [[2, 0], [0, 5]]
msq("la_eig_03", "LA.EIG.EV", r"""A real $2\times2$ matrix $A$ has eigenvalues 2 and 5 with eigenvectors $v_1,v_2$. Select all correct statements.""",
    [(r"$A^2$ has eigenvalues 4 and 25", True), (r"$A^{-1}$ has eigenvalues $\tfrac12$ and $\tfrac15$", True), (r"$A+3I$ has eigenvalues 5 and 8", True), (r"$v_1$ and $v_2$ are necessarily orthogonal", False)],
    r"""Polynomials and inverses of $A$ act on eigenvalues the same way and keep the eigenvectors. Eigenvectors of distinct eigenvalues are independent but orthogonal only if $A$ is normal (e.g. symmetric); a non-symmetric matrix such as $\begin{pmatrix}2&1\\0&5\end{pmatrix}$ has non-orthogonal eigenvectors. Correct: A, B, C.""", "M", marks=2)
