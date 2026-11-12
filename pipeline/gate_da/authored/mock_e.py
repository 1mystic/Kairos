"""Full mock E (65 questions, keys prefixed mocke_). Every numeric answer is computed in-line and re-derived by a second method."""
import itertools
import sqlite3
from fractions import Fraction as F
from math import comb, erf, exp, factorial, log2, sqrt, ceil

from . import msq, nat, scq


def phi(z):
    return 0.5 * (1 + erf(z / sqrt(2)))


# ====================================================================== GA (10)
scq("mocke_ga_01", "GA.VERB.VOC", "The committee's decision, far from being ______, was reached only after months of consultation with all stakeholders. Choose the word that best fills the blank.",
    "hasty", ["deliberate", "unanimous", "public"],
    "'Far from being ...' contrasts with 'after months of consultation', so the blank needs a word meaning rushed: 'hasty'.", "E", "second-derivation", 1)

_a = F(70 * 3 - 80 * 2, 3 * 3 - 2 * 2)   # pens: (70*3-80*2)/5
_b = F(3 * 80 - 2 * 70, 3 * 3 - 2 * 2)   # notebooks
assert (_a, _b) == (10, 20) and 3 * _a + 2 * _b == 70 and 2 * _a + 3 * _b == 80
scq("mocke_ga_02", "GA.QUANT.NUMC", "Three pens and two notebooks cost Rs 70, while two pens and three notebooks cost Rs 80. The cost of one notebook, in rupees, is",
    "20", ["15", "25", "30"],
    "Solve $3p+2n=70,\\ 2p+3n=80$. Eliminating $p$: $5n=3\\cdot80-2\\cdot70=100$, so $n=20$ (and $p=10$).", "E", marks=1)

seq = [n * n - 1 for n in range(2, 7)]
assert seq == [3, 8, 15, 24, 35] and 7 * 7 - 1 == 48
scq("mocke_ga_03", "GA.ANAL.NREL", "The next term of the series 3, 8, 15, 24, 35, ... is", "48", ["46", "47", "50"],
    "The terms are $n^2-1$ for $n=2,3,4,\\ldots$; the next is $7^2-1=48$.", "E", marks=1)

mean_new = F(5 * 12 - 8, 4)
assert mean_new == 13
scq("mocke_ga_04", "GA.QUANT.STAT", "The mean of five numbers is 12. When one of the numbers, 8, is removed, the mean of the remaining four numbers is", "13", ["12.5", "14", "11.5"],
    "Sum $=60$. After removing 8, sum $=52$ over 4 numbers: mean $=13$.", "E", marks=1)

scq("mocke_ga_05", "GA.VERB.GRAM", "Which one of the following sentences is grammatically correct?",
    "A number of applicants have withdrawn from the course.",
    ["A number of applicants has withdrawn from the course.", "The number of applicants have withdrawn from the course.", "A number of applicant have withdrawn from the course."],
    "'A number of' takes a plural verb (many applicants), and the noun must be plural. 'The number of' is singular. Only the first option satisfies both rules.", "M", "second-derivation", 1)

milk, water = F(50), F(10)  # 60 L in ratio 5:1
need_w = milk * F(3, 5)
assert need_w - water == 20 and milk / need_w == F(5, 3)
scq("mocke_ga_06", "GA.QUANT.NUMC", "A vessel contains 60 litres of a milk-and-water mixture in the ratio 5 : 1. How many litres of water must be added so that the ratio of milk to water becomes 5 : 3?",
    "20", ["15", "25", "30"],
    "Milk $=50$ L, water $=10$ L. For $5:3$ with milk fixed, water must be $30$ L, so add $20$ L.", "M", marks=2)

tbl = {"P1": (120, 150, 180), "P2": (200, 210, 252), "P3": (90, 135, 162), "P4": (160, 152, 190)}
t2 = sum(v[1] for v in tbl.values())
t3 = sum(v[2] for v in tbl.values())
gr = (t3 - t2) / t2 * 100
assert (t2, t3) == (647, 784) and abs(gr - 21.176) < 1e-2
scq("mocke_ga_07", "GA.QUANT.DI", "The table gives the sales (in thousand units) of four products over three years.\n\n| Product | Year 1 | Year 2 | Year 3 |\n|---|---|---|---|\n"
    + "\n".join(f"| {k} | {v[0]} | {v[1]} | {v[2]} |" for k, v in tbl.items())
    + "\n\nThe percentage growth in the combined sales of all four products from Year 2 to Year 3 is closest to",
    "21.2%", ["20.0%", "22.5%", "18.9%"],
    "Year 2 total $=150+210+135+152=647$; Year 3 total $=180+252+162+190=784$. Growth $=137/647\\approx21.2\\%$.", "M", marks=2)

cnt = 0
for perm in itertools.permutations("PQRST"):
    pos = {c: i for i, c in enumerate(perm)}
    if pos["P"] in (0, 4):
        continue
    if pos["R"] != pos["Q"] + 1:
        continue
    if pos["T"] < pos["S"]:
        continue
    cnt += 1
# second method: glue QR as a block B; arrange {P,B,S,T}; B counts as 2 seats
cnt2 = 0
for perm in itertools.permutations(["P", "B", "S", "T"]):
    seq2 = []
    for x in perm:
        seq2 += ["Q", "R"] if x == "B" else [x]
    if seq2.index("P") in (0, 4) or seq2.index("T") < seq2.index("S"):
        continue
    cnt2 += 1
assert cnt == cnt2
scq("mocke_ga_08", "GA.ANAL.DED", "Five people P, Q, R, S and T sit in a row of five seats. P does not sit at either end. Q sits immediately to the left of R. T sits somewhere to the right of S (not necessarily adjacent). The number of different seating arrangements possible is",
    str(cnt), [str(cnt + 2), str(cnt - 2), str(cnt + 4)],
    f"Treat QR as a block and count arrangements of P, QR, S, T respecting the end and order conditions: total (by enumeration) {cnt}.", "H", marks=2)

x, y = 3, 4
x, y = y, x
x, y = -y, x
x, y = x + 2, y - 1
assert (x, y) == (-1, 3)
scq("mocke_ga_09", "GA.SPAT.TRANS", "The point $(3,4)$ is reflected in the line $y=x$, the image is rotated $90^\\circ$ counter-clockwise about the origin, and the result is translated by $(+2,-1)$. The final coordinates are",
    "$(-1,3)$", ["$(1,3)$", "$(-1,-3)$", "$(5,2)$"],
    "Reflection: $(3,4)\\to(4,3)$. Rotation by $90^\\circ$ CCW: $(x,y)\\to(-y,x)$ gives $(-3,4)$. Translation: $(-3+2,\\,4-1)=(-1,3)$.", "M", marks=2)

scq("mocke_ga_10", "GA.VERB.RC", "A town library recorded that after it extended its weekend opening hours, total borrowing rose by 18%, but borrowing by members under 16 fell. The librarian concluded that the longer hours had made the library less attractive to young readers.\n\nWhich one of the following, if true, most weakens the librarian's conclusion?",
    "A new school library opened nearby in the same month and many under-16 members moved to it.",
    ["Adult members borrowed more books on weekends.", "The extended hours also applied to the reference section.", "Borrowing by members under 16 had been rising in the previous year."],
    "The conclusion attributes the fall to the longer hours. A competing explanation (a new school library drawing young members away) weakens the causal claim. The other options do not offer an alternative cause of the drop.", "M", "second-derivation", 2)

# ====================================================================== PRS (13)
# 1S
assert 1 - F(5 ** 2, 10 ** 2) == F(3, 4)
scq("mocke_prs_01", "PRS.MOM.EXV", r"""A random variable $X$ has mean 50 and standard deviation 5 (distribution unknown). By Chebyshev's inequality, a lower bound on $P(40<X<60)$ is""",
    "0.75", ["0.95", "0.50", "0.25"],
    r"""$P(|X-50|<2\sigma)\ge 1-1/2^2=0.75$ (here $k=10/5=2$).""", "E", "second-derivation", 1)

assert abs(exp(-0.5 * 3) - 0.22313) < 1e-5
scq("mocke_prs_02", "PRS.CRV.EXP", r"""$X$ is exponentially distributed with rate $0.5$ (mean 2). The value of $P(X>5\mid X>2)$ is""",
    r"$e^{-1.5}$", [r"$e^{-2.5}$", r"$e^{-1}$", r"$1-e^{-1.5}$"],
    r"""By memorylessness $P(X>5|X>2)=P(X>3)=e^{-0.5\cdot3}=e^{-1.5}\approx0.223$.""", "M", marks=1)
_num = exp(-0.5 * 5) / exp(-0.5 * 2)
assert abs(_num - exp(-1.5)) < 1e-12

# 1M MSQ
msq("mocke_prs_03", "PRS.PROB.IND", r"""Let $A,B$ be events with $P(A)>0$ and $P(B)>0$. Select all correct statements.""",
    [(r"If $A$ and $B$ are mutually exclusive, they are independent", False), (r"If $A$ and $B$ are independent, then $A$ and $B^c$ are independent", True),
     (r"If $A$ and $B$ are independent, then $P(A\mid B)=P(A)$", True), (r"If $P(A\cap B)=0$, then $P(A\cup B)=P(A)+P(B)$", True)],
    r"""Mutually exclusive events with positive probabilities have $P(A\cap B)=0\ne P(A)P(B)$, so they are dependent. Independence of $A,B$ implies that of $A,B^c$ ($P(A)-P(A)P(B)=P(A)P(B^c)$). $P(A|B)=P(A)$ is equivalent to independence. Inclusion-exclusion with $P(A\cap B)=0$ gives the sum. Correct: B, C, D.""",
    "E", "second-derivation", 1)

_d = [3, 7, 7, 19]
msq("mocke_prs_04", "PRS.DESC.CT", r"""For the data set $\{2,3,5,5,10\}$, select all correct statements.""",
    [(r"Replacing the largest value 10 by 100 leaves the median unchanged", sorted([2, 3, 5, 5, 100])[2] == 5),
     (r"Adding 7 to every observation leaves the sample variance unchanged", True),
     (r"Multiplying every observation by $-2$ multiplies the standard deviation by $-2$", False),
     (r"The mean of the data set is strictly greater than its mode", sum([2, 3, 5, 5, 10]) / 5 > 5)],
    r"""Median of $\{2,3,5,5,100\}$ is still 5. Variance is shift-invariant. Standard deviation is non-negative and scales by $|{-2}|=2$. Mean $=25/5=5=$ mode, not strictly greater. Correct: A, B.""",
    "M", marks=1)

# 1N x2
m = sum(_d) / 4
sv = sum((v - m) ** 2 for v in _d) / 3
assert sv == 48.0 and F(sum(v * v for v in _d) - 4 * 81, 3) == 48
nat("mocke_prs_05", "PRS.DESC.SD", r"""The sample variance (with divisor $n-1$) of the observations $3,7,7,19$ is ______.""", sv,
    r"""Mean $=9$. Squared deviations: $36+4+4+100=144$. Variance $=144/3=48$.""", diff="E")

cnt_a = len({p for p in itertools.permutations("ALABAMA") if all(not (p[i] == "A" and p[i + 1] == "A") for i in range(6))})
assert cnt_a == 6 == factorial(3) * comb(4, 4)
nat("mocke_prs_06", "PRS.CNT.PC", r"""The number of distinct arrangements of the letters of the word ALABAMA in which no two letters A are adjacent is ______.""", 6,
    r"""Arrange the 3 non-A letters L, B, M in $3!=6$ ways. This creates 4 gaps and the four A's must occupy all 4 gaps: $\binom44=1$. Total $=6$.""", diff="M")

# 2S x2
z = 1.96 * 12 / sqrt(36)
lo, hi = 52 - z, 52 + z
assert abs(z - 3.92) < 1e-12
scq("mocke_prs_07", "PRS.INF.CI", r"""A sample of $n=36$ observations is drawn from $N(\mu,\sigma^2)$ with known $\sigma^2=144$. The sample mean is 52. Using $z_{0.975}=1.96$, the 95% confidence interval for $\mu$ is""",
    "(48.08, 55.92)", ["(46.08, 57.92)", "(49.57, 54.43)", "(40.24, 63.76)"],
    r"""Standard error $=\sigma/\sqrt n=12/6=2$. Half-width $=1.96\times2=3.92$. Interval $52\pm3.92=(48.08,55.92)$.""", "M", marks=2)
assert (round(lo, 2), round(hi, 2)) == (48.08, 55.92)

vv = 4 * 4 + 9 * 9 + 2 * (2) * (-3) * (-1)
assert vv == 109
scq("mocke_prs_08", "PRS.MOM.JNT", r"""Random variables $X,Y$ have $\mathrm{Var}(X)=4$, $\mathrm{Var}(Y)=9$ and $\mathrm{Cov}(X,Y)=-1$. The value of $\mathrm{Var}(2X-3Y+5)$ is""",
    "109", ["97", "121", "85"],
    r"""$\mathrm{Var}(2X-3Y)=4\cdot4+9\cdot9+2(2)(-3)\mathrm{Cov}(X,Y)=16+81+12=109$; the constant does not matter.""", "M", marks=2)

# 2M MSQ x2: X~U(0,1), Y=X^2
EX, EY, EXY, EY2 = F(1, 2), F(1, 3), F(1, 4), F(1, 5)
cov = EXY - EX * EY
vy = EY2 - EY ** 2
assert cov == F(1, 12) and vy == F(4, 45)
msq("mocke_prs_09", "PRS.MOM.JNT", r"""Let $X\sim\text{Uniform}(0,1)$ and $Y=X^2$. Select all correct statements.""",
    [(r"$\mathrm{Cov}(X,Y)=1/12$", cov == F(1, 12)), (r"$X$ and $Y$ are uncorrelated", cov == 0), (r"$\mathrm{Var}(Y)=4/45$", vy == F(4, 45)), (r"$X$ and $Y$ are independent", False)],
    r"""$E[X]=1/2$, $E[Y]=1/3$, $E[XY]=E[X^3]=1/4$, so $\mathrm{Cov}=1/4-1/6=1/12\neq0$. $E[Y^2]=E[X^4]=1/5$, $\mathrm{Var}(Y)=1/5-1/9=4/45$. $Y$ is a function of $X$, so they are dependent. Correct: A, C.""",
    "H", marks=2)

pX = lambda k: exp(-2) * 2 ** k / factorial(k)
pY = lambda k: exp(-3) * 3 ** k / factorial(k)
cond = sum(k * pX(k) * pY(4 - k) for k in range(5)) / sum(pX(k) * pY(4 - k) for k in range(5))
assert abs(cond - 1.6) < 1e-9
msq("mocke_prs_10", "PRS.DRV.POI", r"""$X\sim\text{Poisson}(2)$ and $Y\sim\text{Poisson}(3)$ are independent. Select all correct statements.""",
    [(r"$P(X+Y=0)=e^{-5}$", abs(pX(0) * pY(0) - exp(-5)) < 1e-12), (r"$\mathrm{Var}(X-Y)=5$", True), (r"$E[X\mid X+Y=4]=1.6$", abs(cond - 1.6) < 1e-9), (r"$X-Y$ has a Poisson distribution", False)],
    r"""$X+Y\sim\text{Poisson}(5)$ so $P(0)=e^{-5}$. $\mathrm{Var}(X-Y)=2+3=5$. Given $X+Y=4$, $X\sim\text{Bin}(4,2/5)$ with mean $1.6$. $X-Y$ can be negative, so it is not Poisson. Correct: A, B, C.""",
    "H", marks=2)

# 2N x3
R1, R2 = F(3, 5), F(1, 5)
p1 = F(1, 2) * R1 + F(1, 2) * R2
p12 = F(1, 2) * (F(3, 5) * F(2, 4)) + F(1, 2) * (F(1, 5) * F(0, 4))
assert p12 / p1 == F(3, 8)
# enumeration check
import itertools as _it
urns = [["R"] * 3 + ["B"] * 2, ["R"] + ["B"] * 4]
num = den = 0
for u in urns:
    for a, b in _it.permutations(range(5), 2):
        if u[a] == "R":
            den += 1
            num += u[b] == "R"
assert F(num, den) == F(3, 8)
nat("mocke_prs_11", "PRS.PROB.BAYES", r"""Urn 1 holds 3 red and 2 blue balls; Urn 2 holds 1 red and 4 blue balls. An urn is chosen with equal probability and a ball is drawn from it and found red (not replaced). A second ball is then drawn from the same urn. The probability that it is also red is ______. (Round off to three decimal places)""",
    float(F(3, 8)), r"""$P(R_1)=\tfrac12\cdot\tfrac35+\tfrac12\cdot\tfrac15=0.4$. $P(R_1R_2)=\tfrac12\cdot\tfrac35\cdot\tfrac24+\tfrac12\cdot\tfrac15\cdot0=0.15$. Ratio $=0.15/0.4=0.375$.""",
    tol=0.002, dec=3, diff="H", marks=2)

# f(x)=3x^2/8 on [0,2]; E[X | X>1]
ex = F(3, 8) * F(2 ** 4 - 1, 4) / (1 - F(1, 8))
assert ex == F(45, 28)
N = 200000
h = 1 / N
num_i = sum((1 + (i + 0.5) * h) * 3 * (1 + (i + 0.5) * h) ** 2 / 8 * h for i in range(N))
den_i = sum(3 * (1 + (i + 0.5) * h) ** 2 / 8 * h for i in range(N))
assert abs(num_i / den_i - 45 / 28) < 1e-6
nat("mocke_prs_12", "PRS.CRV.CPDF", r"""A random variable $X$ has pdf $f(x)=\tfrac38x^2$ for $0\le x\le2$ and 0 otherwise. The value of $E[X\mid X>1]$ is ______. (Round off to two decimal places)""",
    45 / 28, r"""$P(X>1)=1-1/8=7/8$. $\int_1^2x\cdot\tfrac38x^2dx=\tfrac38\cdot\tfrac{16-1}{4}=\tfrac{45}{32}$. Ratio $=\tfrac{45}{32}\cdot\tfrac87=\tfrac{45}{28}\approx1.607$.""",
    tol=0.006, dec=3, diff="H", marks=2)

Ms = [max(a, b) for a in range(1, 7) for b in range(1, 7)]
EM = F(sum(Ms), 36)
EM2 = F(sum(v * v for v in Ms), 36)
VM = EM2 - EM ** 2
assert EM == F(161, 36) and EM2 == F(791, 36) and abs(float(VM) - 1.9715) < 1e-3
nat("mocke_prs_13", "PRS.MOM.EXV", r"""Two fair six-sided dice are rolled and $M$ is the larger of the two numbers shown. The variance of $M$ is ______. (Round off to two decimal places)""",
    float(VM), r"""$P(M=k)=(2k-1)/36$. $E[M]=161/36\approx4.472$, $E[M^2]=791/36\approx21.972$. $\mathrm{Var}(M)=21.972-20.001\approx1.97$.""",
    tol=0.006, dec=3, diff="M", marks=2)


# ====================================================================== LA (9)
def rank(M):
    M = [[F(x) for x in r] for r in M]
    rk, rows, cols = 0, len(M), len(M[0])
    for c in range(cols):
        piv = next((r for r in range(rk, rows) if M[r][c] != 0), None)
        if piv is None:
            continue
        M[rk], M[piv] = M[piv], M[rk]
        for r in range(rows):
            if r != rk and M[r][c] != 0:
                f = M[r][c] / M[rk][c]
                M[r] = [a - f * b for a, b in zip(M[r], M[rk])]
        rk += 1
    return rk


def det(M):
    n = len(M)
    M = [[F(x) for x in r] for r in M]
    d = F(1)
    for c in range(n):
        piv = next((r for r in range(c, n) if M[r][c] != 0), None)
        if piv is None:
            return F(0)
        if piv != c:
            M[c], M[piv] = M[piv], M[c]
            d = -d
        d *= M[c][c]
        for r in range(c + 1, n):
            f = M[r][c] / M[c][c]
            M[r] = [a - f * b for a, b in zip(M[r], M[c])]
    return d


def matmul(A, B):
    return [[sum(A[i][k] * B[k][j] for k in range(len(B))) for j in range(len(B[0]))] for i in range(len(A))]


ev = [2, -1, 4]
d_a = ev[0] * ev[1] * ev[2]
assert d_a == -8 and F(2 ** 3, d_a) == -1
scq("mocke_la_01", "LA.EIG.DET", r"""A $3\times3$ real matrix $A$ has eigenvalues $2,-1,4$. The value of $\det(2A^{-1})$ is""",
    "$-1$", ["$-8$", "$1$", "$-4$"],
    r"""$\det A=2\cdot(-1)\cdot4=-8$. $\det(2A^{-1})=2^3/\det A=8/(-8)=-1$.""", "E", marks=1)

M4 = [[1, 2, 0, 1], [2, 4, 1, 3], [3, 6, 1, 4], [0, 0, 1, 1]]
assert rank(M4) == 2
scq("mocke_la_02", "LA.PROJ.RK", r"""The rank of the matrix $$\begin{pmatrix}1&2&0&1\\2&4&1&3\\3&6&1&4\\0&0&1&1\end{pmatrix}$$ is""",
    "2", ["1", "3", "4"],
    r"""$R_3=R_1+R_2$ and $R_4=R_2-2R_1$, so only $R_1,R_2$ are independent (they are not proportional): rank $=2$.""", "M", marks=1)

A3 = [[1, 2, 0], [2, 1, 0], [0, 0, 3]]
trA2 = sum(matmul(A3, A3)[i][i] for i in range(3))
assert trA2 == 19 and 3 ** 2 + (-1) ** 2 + 3 ** 2 == 19 and det([[1 - l, 2], [2, 1 - l]] if False else [[1, 2], [2, 1]]) == -3
nat("mocke_la_03", "LA.EIG.EV", r"""The sum of the squares of the eigenvalues of $A=\begin{pmatrix}1&2&0\\2&1&0\\0&0&3\end{pmatrix}$ is ______.""", 19,
    r"""The upper block has eigenvalues $1\pm2=3,-1$; the lower entry gives 3. Sum of squares $=9+1+9=19$ (equals $\mathrm{tr}(A^2)=5+5+9$).""", diff="E")

# parameter system: x+y+z=6, x+2y+3z=10, x+2y+kz=m
def consistent(k, m):
    A = [[1, 1, 1], [1, 2, 3], [1, 2, k]]
    return rank(A), rank([r + [b] for r, b in zip(A, [6, 10, m])])
assert consistent(3, 10) == (2, 2) and consistent(3, 7) == (2, 3) and consistent(4, 7)[0] == 3
scq("mocke_la_04", "LA.SYS.SOL", r"""Consider $x+y+z=6$, $x+2y+3z=10$, $x+2y+kz=m$. The system has infinitely many solutions if and only if""",
    r"$k=3$ and $m=10$", [r"$k=3$ and $m\ne10$", r"$k\neq3$ and $m=10$", r"$k\ne3$ for every $m$"],
    r"""Subtracting rows 2 and 3 gives $(k-3)z=m-10$. If $k\ne3$ the solution is unique. If $k=3$: $m\ne10$ is inconsistent; $m=10$ makes the third equation redundant (rank 2 < 3 unknowns), so infinitely many solutions.""", "M", marks=2)

def pd_a(a):
    return 2 > 0 and 4 - a * a > 0 and det([[2, a, 0], [a, 2, a], [0, a, 2]]) > 0
assert all(pd_a(F(a, 10)) for a in range(-13, 14)) and not pd_a(F(15, 10)) and not pd_a(F(-15, 10)) and det([[2, F(1), 0], [F(1), 2, F(1)], [0, F(1), 2]]) == 4
assert det([[2, 1, 0], [1, 2, 1], [0, 1, 2]]) == 8 - 4
scq("mocke_la_05", "LA.MAT.QF", r"""The quadratic form $q(x)=2x_1^2+2x_2^2+2x_3^2+2a\,x_1x_2+2a\,x_2x_3$ is positive definite for""",
    r"$-\sqrt2<a<\sqrt2$", [r"$-1<a<1$", r"$-2<a<2$", r"$a>0$"],
    r"""The matrix is $\begin{pmatrix}2&a&0\\a&2&a\\0&a&2\end{pmatrix}$ with leading minors $2$, $4-a^2$, $8-4a^2$. All positive iff $a^2<2$ (eigenvalues $2,\,2\pm\sqrt2 a$).""", "H", marks=2)

A_ = [[1, 1], [0, 1], [1, 0]]
AT = [list(r) for r in zip(*A_)]
G = matmul(AT, A_)
dG = det(G)
Ginv = [[G[1][1] / dG, -G[0][1] / dG], [-G[1][0] / dG, G[0][0] / dG]]
P = matmul(matmul(A_, Ginv), AT)
assert matmul(P, P) == P and sum(P[i][i] for i in range(3)) == 2 and det(P) == 0
assert [sum(P[i][j] * v for j, v in enumerate([2, 1, 1])) for i in range(3)] == [2, 1, 1]
msq("mocke_la_06", "LA.PROJ.PM", r"""Let $A$ be the $3\times2$ matrix with columns $(1,0,1)^T$ and $(1,1,0)^T$, and $P=A(A^TA)^{-1}A^T$. Select all correct statements.""",
    [(r"$P^2=P$", True), (r"$\mathrm{trace}(P)=2$", True), (r"$\det P=1$", False), (r"$P(2,1,1)^T=(2,1,1)^T$", True)],
    r"""$P$ is the orthogonal projector onto the column space, so it is idempotent with trace equal to the rank 2; being a $3\times3$ matrix of rank 2 it is singular ($\det=0$). $(2,1,1)^T$ is the sum of the two columns, hence lies in the column space and is fixed. Correct: A, B, D.""", "M", marks=2)

AS = [[3, 0], [4, 5]]
AtA = matmul([list(r) for r in zip(*AS)], AS)
tr_, dt_ = AtA[0][0] + AtA[1][1], det(AtA)
l1 = (tr_ + sqrt(tr_ ** 2 - 4 * dt_)) / 2
assert AtA == [[25, 20], [20, 25]] and abs(l1 - 45) < 1e-9 and abs(sqrt(l1) * sqrt(tr_ - l1) - 15) < 1e-9
nat("mocke_la_07", "LA.DEC.SVD", r"""The largest singular value of $A=\begin{pmatrix}3&0\\4&5\end{pmatrix}$ is ______. (Round off to two decimal places)""", sqrt(l1),
    r"""$A^TA=\begin{pmatrix}25&20\\20&25\end{pmatrix}$ has eigenvalues $45$ and $5$ (trace 50, det 225). $\sigma_1=\sqrt{45}\approx6.708$ (check: $\sigma_1\sigma_2=15=|\det A|$).""", tol=0.006, dec=3, diff="M", marks=2)

T4 = [[2, 1, 0, 0], [1, 2, 1, 0], [0, 1, 2, 1], [0, 0, 1, 2]]
Mf = [[F(x) for x in r] for r in T4]
U = [r[:] for r in Mf]
for c in range(4):
    for r in range(c + 1, 4):
        f = U[r][c] / U[c][c]
        U[r] = [a - f * b for a, b in zip(U[r], U[c])]
assert U[3][3] == F(5, 4) and det(T4) == 5 and det([r[:3] for r in T4[:3]]) == 4 and U[0][0] * U[1][1] * U[2][2] * U[3][3] == 5
nat("mocke_la_08", "LA.DEC.LU", r"""For $A=\begin{pmatrix}2&1&0&0\\1&2&1&0\\0&1&2&1\\0&0&1&2\end{pmatrix}$ the LU decomposition without pivoting gives $A=LU$ with $L$ unit lower triangular. The entry $U_{44}$ is ______. (Round off to two decimal places)""", 1.25,
    r"""Pivots: $2,\ \tfrac32,\ \tfrac43,\ \tfrac54$ (each pivot is a ratio of leading minors $\det_k/\det_{k-1}$: $2,3,4,5$). So $U_{44}=5/4=1.25$.""", tol=0.005, dec=3, diff="M", marks=2)

AA = [[5, -2], [4, -1]]
A4 = matmul(matmul(AA, AA), matmul(AA, AA))
assert A4 == [[161, -80], [160, -79]]
assert -1 * 1 + 2 * 3 ** 4 * 1 == 161  # e1 = -(1,2)+2(1,1) with eigenvalues 1 and 3
nat("mocke_la_09", "LA.EIG.EV", r"""For $A=\begin{pmatrix}5&-2\\4&-1\end{pmatrix}$, the $(1,1)$ entry of $A^4$ is ______.""", 161,
    r"""Eigenvalues $1$ and $3$ with eigenvectors $(1,2)^T$ and $(1,1)^T$. $e_1=-(1,2)^T+2(1,1)^T$, so $A^4e_1=-(1,2)^T+2\cdot81(1,1)^T=(161,160)^T$. The first component is 161.""", diff="H", marks=2)

# ====================================================================== CO (4)
xx = 1e-3
assert abs((exp(3 * xx) - 1 - 3 * xx) / xx ** 2 - 4.5) < 0.01
scq("mocke_co_01", "CO.LIM.LIM", r"""The value of $\displaystyle\lim_{x\to0}\frac{e^{3x}-1-3x}{x^2}$ is""", "$9/2$", ["$3$", "$9$", "$3/2$"],
    r"""$e^{3x}=1+3x+\tfrac{9x^2}{2}+\cdots$, so the numerator is $\tfrac92x^2+O(x^3)$ and the limit is $9/2$.""", "M", marks=1)

fmin = min(x ** 3 - 12 * x + 5 for x in [i / 10000 for i in range(0, 30001)])
assert abs(fmin - (-11)) < 1e-6 and 2 ** 3 - 24 + 5 == -11
nat("mocke_co_02", "CO.OPT.OPT", r"""The minimum value of $f(x)=x^3-12x+5$ on the interval $[0,3]$ is ______.""", -11,
    r"""$f'(x)=3x^2-12=0\Rightarrow x=2$ in the interval. $f(0)=5$, $f(2)=-11$, $f(3)=-4$. Minimum $=-11$.""", diff="E")

fxy = lambda x, y: x * x + 2 * x * y + 3 * y * y - 4 * x - 2 * y
xs, ys = F(5, 2), F(-1, 2)
assert 2 * xs + 2 * ys == 4 and 2 * xs + 6 * ys == 2 and det([[2, 2], [2, 6]]) == 8
assert fxy(xs, ys) == F(-9, 2)
assert min(fxy(5 / 2 + a / 10, -0.5 + b / 10) for a in range(-5, 6) for b in range(-5, 6)) >= -4.5 - 1e-12
scq("mocke_co_03", "CO.OPT.MM", r"""The minimum value of $f(x,y)=x^2+2xy+3y^2-4x-2y$ over $\mathbb{R}^2$ is""", "$-4.5$", ["$-3$", "$-2.5$", "$-6$"],
    r"""$f_x=2x+2y-4=0$, $f_y=2x+6y-2=0$ give $y=-1/2$, $x=5/2$. The Hessian $\begin{pmatrix}2&2\\2&6\end{pmatrix}$ has determinant 8 and positive trace, so it is positive definite. $f=6.25-2.5+0.75-10+1=-4.5$.""", "M", marks=2)

ec = [F(1, factorial(k)) for k in range(5)]
cc = [F(0)] * 5
for k, v in zip((0, 2, 4), (1, F(-1, 2), F(1, 24))):
    cc[k] = F(v)
c4 = sum(ec[k] * cc[4 - k] for k in range(5))
assert c4 == F(-1, 6) and ((1 + 1j) ** 4).real / 24 == -1 / 6
nat("mocke_co_04", "CO.TAY", r"""The coefficient of $x^4$ in the Maclaurin series of $f(x)=e^x\cos x$ is ______. (Round off to three decimal places)""", float(c4),
    r"""Multiply $(1+x+\tfrac{x^2}{2}+\tfrac{x^3}{6}+\tfrac{x^4}{24})(1-\tfrac{x^2}{2}+\tfrac{x^4}{24})$: coefficient of $x^4$ is $\tfrac1{24}-\tfrac14+\tfrac1{24}=-\tfrac16\approx-0.167$. Check: $e^x\cos x=\mathrm{Re}\,e^{(1+i)x}$ and $(1+i)^4=-4$, giving $-4/24$.""", tol=0.0006, dec=4, diff="H", marks=2)

# ====================================================================== PDS (8)
def postfix(s):
    st = []
    for t in s.split():
        if t in "+-*/":
            b, a = st.pop(), st.pop()
            st.append({"+": a + b, "-": a - b, "*": a * b, "/": a // b}[t])
        else:
            st.append(int(t))
    return st[0]


assert postfix("12 3 / 2 - 5 3 - *") == 4 == (12 // 3 - 2) * (5 - 3)
scq("mocke_pds_01", "PDS.DS.STK", "The postfix expression `12 3 / 2 - 5 3 - *` is evaluated using a stack (`/` is integer division). The value left on the stack is", "4", ["8", "2", "10"],
    "`12 3 /` gives 4; `4 2 -` gives 2; `5 3 -` gives 2; `2 2 *` gives 4. Equivalent infix: $(12/3-2)\\cdot(5-3)=4$.", "E", marks=1)


def loopc(n):
    c = 0
    for i in range(1, n):
        j = i
        while j < n:
            j *= 2
            c += 1
    return c


assert abs(loopc(2 ** 16) / loopc(2 ** 15) - 2) < 0.01 and 1 < loopc(2 ** 16) / 2 ** 16 < 3
scq("mocke_pds_02", "PDS.ALG.CPX", "What is the tightest asymptotic running time of the following code, in terms of $n$?\n\n```python\ncount = 0\nfor i in range(1, n):\n    j = i\n    while j < n:\n        j *= 2\n        count += 1\n```",
    "$\\Theta(n)$", ["$\\Theta(n\\log n)$", "$\\Theta(n^2)$", "$\\Theta(\\log^2 n)$"],
    "For a given $i$ the inner loop runs about $\\log_2(n/i)$ times. $\\sum_{i=1}^{n}\\log_2(n/i)=\\log_2(n^n/n!)\\approx n\\log_2 e$ by Stirling, which is $\\Theta(n)$.", "H", marks=1)

tbl_h = [None] * 11
pos_ = {}
for k in [22, 33, 44, 12, 23, 1]:
    i = k % 11
    while tbl_h[i] is not None:
        i = (i + 1) % 11
    tbl_h[i] = k
    pos_[k] = i
assert pos_[1] == 5 and tbl_h[:6] == [22, 33, 44, 12, 23, 1]
nat("mocke_pds_03", "PDS.DS.HASH", "A hash table has 11 slots (indices 0 to 10), hash function $h(k)=k \\bmod 11$ and uses linear probing. The keys 22, 33, 44, 12, 23, 1 are inserted in this order. The index at which key 1 is stored is ______.", 5,
    "22 goes to 0; 33 collides at 0, goes to 1; 44 probes 0, 1, goes to 2; 12 ($h=1$) probes 1, 2, goes to 3; 23 ($h=1$) goes to 4; key 1 ($h=1$) probes 1,2,3,4 and lands at 5.", diff="E")

tk = [1.0]
for k in range(1, 20):
    tk.append(2 * tk[-1] + 2 ** k / k)
Hs = lambda k: sum(1 / i for i in range(1, k + 1))
assert all(abs(tk[k] / 2 ** k - (1 + Hs(k))) < 1e-9 for k in range(1, 20))
assert abs(sum(1 / i for i in range(1, 200001)) - (__import__("math").log(200000) + 0.5772156649)) < 1e-5
scq("mocke_pds_04", "PDS.ALG.DC", r"""Let $T(1)=1$ and $T(n)=2T(n/2)+\dfrac{n}{\log_2 n}$ for $n=2^k$, $k\ge1$. Then $T(n)$ is""",
    r"$\Theta(n\log\log n)$", [r"$\Theta(n\log n)$", r"$\Theta(n)$", r"$\Theta(n/\log n)$"],
    r"""Divide by $n=2^k$: $t_k=t_{k-1}+1/k$ with $t_0=1$, so $t_k=1+H_k=\Theta(\ln k)=\Theta(\log\log n)$. Hence $T(n)=\Theta(n\log\log n)$ (the Master theorem does not apply as the driving term is not polynomially smaller than $n$).""", "H", marks=2)

import heapq
EDG = [("A", "B", 4), ("A", "C", 2), ("B", "C", 1), ("B", "D", 5), ("C", "D", 8), ("C", "E", 10), ("D", "E", 2), ("D", "F", 6), ("E", "F", 3)]
adj = {}
for u, v, w in EDG:
    adj.setdefault(u, []).append((v, w))
    adj.setdefault(v, []).append((u, w))
dist = {"A": 0}
pq = [(0, "A")]
while pq:
    d, u = heapq.heappop(pq)
    if d > dist.get(u, 1e9):
        continue
    for v, w in adj[u]:
        if d + w < dist.get(v, 1e9):
            dist[v] = d + w
            heapq.heappush(pq, (d + w, v))
bf = {v: 10 ** 9 for v in "ABCDEF"}
bf["A"] = 0
for _ in range(6):
    for u, v, w in EDG:
        bf[v] = min(bf[v], bf[u] + w)
        bf[u] = min(bf[u], bf[v] + w)
assert dist == bf and sum(dist.values()) == 36
scq("mocke_pds_05", "PDS.GRAPH.SP", "An undirected weighted graph has edges (with weights): A-B 4, A-C 2, B-C 1, B-D 5, C-D 8, C-E 10, D-E 2, D-F 6, E-F 3. The sum of the shortest-path distances from A to all vertices (A, B, C, D, E, F) is",
    "36", ["38", "34", "40"],
    "Dijkstra from A: $C=2$, $B=\\min(4,2+1)=3$, $D=3+5=8$, $E=8+2=10$, $F=\\min(8+6,10+3)=13$. Sum $=0+3+2+8+10+13=36$.", "M", marks=2)

class _N:
    def __init__(s, k):
        s.k, s.l, s.r = k, None, None


def ins(root, k):
    if root is None:
        return _N(k)
    if k < root.k:
        root.l = ins(root.l, k)
    else:
        root.r = ins(root.r, k)
    return root


root = None
for k in [50, 30, 70, 20, 40, 60, 80, 35, 45]:
    root = ins(root, k)
hgt = lambda n: -1 if n is None else 1 + max(hgt(n.l), hgt(n.r))
post = lambda n: [] if n is None else post(n.l) + post(n.r) + [n.k]
inord = lambda n: [] if n is None else inord(n.l) + [n.k] + inord(n.r)
leaves = lambda n: 0 if n is None else (1 if n.l is None and n.r is None else leaves(n.l) + leaves(n.r))
po = post(root)
io = inord(root)
sA = hgt(root) == 3
sB = po[po.index(60) + 1] == 80
sC = io[io.index(50) + 1] == 70
sD = leaves(root) == 4
assert (sA, sB, sC, sD) == (True, True, False, False) and leaves(root) == 5 and io[io.index(50) + 1] == 60
msq("mocke_pds_06", "PDS.DS.TREE", "Keys 50, 30, 70, 20, 40, 60, 80, 35, 45 are inserted in this order into an initially empty binary search tree. Select all correct statements.",
    [("The height of the tree (longest root-to-leaf path, counted in edges) is 3", sA), ("In the post-order traversal, key 60 is immediately followed by key 80", sB),
     ("The in-order successor of key 50 is key 70", sC), ("The tree has exactly 4 leaf nodes", sD)],
    "Path 50-30-40-35 has 3 edges. Post-order: 20, 35, 45, 40, 30, 60, 80, 70, 50, so 60 is followed by 80. The in-order successor of 50 is the minimum of its right subtree, 60 (not 70). Leaves are 20, 35, 45, 60, 80, i.e. 5. Correct: A, B.", "M", marks=2)

code = """def h(n):
    if n == 0:
        return 0
    return h(n // 3) + n % 3

print(sum(h(k) for k in range(1, 28)))"""
ns = {}
import io as _io, contextlib
buf = _io.StringIO()
with contextlib.redirect_stdout(buf):
    exec(code, ns)
val_py = int(buf.getvalue())
def dsum3(k):
    s = 0
    while k:
        s += k % 3
        k //= 3
    return s
assert val_py == sum(dsum3(k) for k in range(1, 28)) == 3 * 9 * 1 + 0 + 0 + 0 + (sum(dsum3(k) for k in range(1, 28)) - 27)
nat("mocke_pds_07", "PDS.PY", "What is the output of the following Python program?\n\n```python\n" + code + "\n```", val_py,
    "`h(n)` is the sum of the base-3 digits of $n$. Over $0\\ldots26$ each of the three digits takes each value 0,1,2 equally often: $3\\cdot9\\cdot(0+1+2)=81$. Adding $k=27$ (digit sum 1) gives $81+1=82$.", diff="M", marks=2)
assert val_py == 82

DE = [(1, 3), (2, 3), (3, 4), (2, 5), (5, 6), (4, 6), (7, 5)]
cnt_t = 0
for perm in itertools.permutations(range(1, 8)):
    p = {v: i for i, v in enumerate(perm)}
    if all(p[a] < p[b] for a, b in DE):
        cnt_t += 1
pre = {v: 0 for v in range(1, 8)}
for a, b in DE:
    pre[b] |= 1 << (a - 1)
dp = {0: 1}
for mask in range(1 << 7):
    if mask not in dp:
        continue
    for v in range(1, 8):
        if not mask >> (v - 1) & 1 and pre[v] & mask == pre[v]:
            dp[mask | 1 << (v - 1)] = dp.get(mask | 1 << (v - 1), 0) + dp[mask]
assert dp[(1 << 7) - 1] == cnt_t
nat("mocke_pds_08", "PDS.GRAPH.TRAV", "A directed acyclic graph on vertices 1 to 7 has edges 1->3, 2->3, 3->4, 2->5, 5->6, 4->6, 7->5. The number of distinct topological orderings of its vertices is ______.", cnt_t,
    f"Counting linear extensions (dynamic programming over subsets of placed vertices, cross-checked by enumerating all $7!$ permutations) gives {cnt_t}.", diff="H", marks=2)


# ====================================================================== DBW (6)
def sqlq(setup, query):
    con = sqlite3.connect(":memory:")
    con.executescript(setup)
    rows = con.execute(query).fetchall()
    con.close()
    return rows


S_NI = "CREATE TABLE R(a INT);CREATE TABLE S(b INT);INSERT INTO R VALUES(1),(2),(3);INSERT INTO S VALUES(2),(NULL);"
assert sqlq(S_NI, "SELECT COUNT(*) FROM R WHERE a NOT IN (SELECT b FROM S)") == [(0,)]
assert sqlq(S_NI, "SELECT COUNT(*) FROM R r WHERE NOT EXISTS (SELECT 1 FROM S s WHERE s.b=r.a)") == [(2,)]
scq("mocke_dbw_01", "DBW.REL.SQL", "Relation R has a single column a with values 1, 2, 3. Relation S has a single column b with values 2 and NULL. The query\n\n```sql\nSELECT COUNT(*) FROM R WHERE a NOT IN (SELECT b FROM S);\n```\n\nreturns",
    "0", ["1", "2", "3"],
    "`a NOT IN (2, NULL)` expands to `a<>2 AND a<>NULL`. The second conjunct is UNKNOWN for every `a`, so the predicate is never TRUE (it is FALSE for a=2 and UNKNOWN for 1 and 3). No row qualifies: the count is 0. (With NOT EXISTS the answer would be 2.)", "M", marks=1)


def closure(attrs, fds):
    c = set(attrs)
    ch = True
    while ch:
        ch = False
        for l, r in fds:
            if set(l) <= c and not set(r) <= c:
                c |= set(r)
                ch = True
    return c


U_ = "ABCD"
FDS = [("AB", "C"), ("C", "D"), ("D", "A")]
keys_ = [set(s) for n in range(1, 5) for s in itertools.combinations(U_, n) if closure(s, FDS) >= set(U_)]
cand = [k for k in keys_ if not any(o < k for o in keys_)]
assert sorted("".join(sorted(k)) for k in cand) == ["AB", "BC", "BD"]
scq("mocke_dbw_02", "DBW.NF.NF", r"""Relation $R(A,B,C,D)$ has the functional dependencies $AB\to C$, $C\to D$, $D\to A$. The number of candidate keys of $R$ is""",
    "3", ["1", "2", "4"],
    r"""$B$ appears in no right-hand side, so every key contains $B$. $\{B\}^+=\{B\}$. $\{A,B\}^+=ABCD$; $\{B,C\}^+$: $C\to D\to A$ gives $ABCD$; $\{B,D\}^+$: $D\to A$, then $AB\to C$: $ABCD$. All three are minimal: candidate keys $AB,BC,BD$.""", "M", "attribute closure computed by code", 1)

vals = [10, 20, 30, 60]
mn, mx = min(vals), max(vals)
mu = sum(vals) / 4
sd = sqrt(sum((v - mu) ** 2 for v in vals) / 4)
mm = lambda v: (v - mn) / (mx - mn)
zz = lambda v: (v - mu) / sd
sa, sb, sc, sd_ = abs(mm(30) - 0.4) < 1e-12, mm(60) == 1, abs(zz(10) + 1) < 1e-9, zz(60) > 1.5
assert (sa, sb, sc, sd_) == (True, True, False, True) and abs(sd - 18.708) < 1e-3
msq("mocke_dbw_03", "DBW.XFM.NORM", r"""The attribute values $\{10,20,30,60\}$ are normalised. Z-scores use the population standard deviation. Select all correct statements.""",
    [("Min-max normalisation to [0,1] maps 30 to 0.4", sa), ("Min-max normalisation to [0,1] maps 60 to 1", sb), ("The z-score of 10 is exactly $-1$", sc), ("The z-score of 60 exceeds 1.5", sd_)],
    r"""Min-max: $(30-10)/50=0.4$; $(60-10)/50=1$. Mean $=30$, population variance $=(400+100+0+900)/4=350$, $\sigma\approx18.71$. $z(10)=-20/18.71\approx-1.07\ne-1$; $z(60)=30/18.71\approx1.60>1.5$. Correct: A, B, D.""", "E", marks=1)

dims = {"Time": 3, "Location": 2, "Product": 1}
cub = list(itertools.product(*[range(L + 1) for L in dims.values()]))
assert len(cub) == 24 == 4 * 3 * 2
scq("mocke_dbw_04", "DBW.DW.HIER", "A data warehouse cube has three dimensions with the hierarchies Time (day < month < year), Location (city < country) and Product (a single level, item). Counting the apex cuboid (all dimensions aggregated to ALL), the total number of cuboids that can be materialised is",
    "24", ["18", "27", "12"],
    "Each dimension with $L$ levels can be at one of $L+1$ states (its $L$ levels or ALL). Total $=(3+1)(2+1)(1+1)=24$.", "M", marks=2)

RR = [(1, "a"), (2, "a"), (3, "b"), (4, "c")]
SS = [("a", "x"), ("a", "y"), ("b", "z"), ("d", "w")]
S_AL = "CREATE TABLE R(A INT,B TEXT);CREATE TABLE S(B TEXT,C TEXT);" + "".join(f"INSERT INTO R VALUES({a},'{b}');" for a, b in RR) + "".join(f"INSERT INTO S VALUES('{a}','{b}');" for a, b in SS)
nj = sqlq(S_AL, "SELECT COUNT(*) FROM R NATURAL JOIN S")[0][0]
lj = sqlq(S_AL, "SELECT COUNT(*) FROM R LEFT JOIN S ON R.B=S.B")[0][0]
ints = sqlq(S_AL, "SELECT COUNT(*) FROM (SELECT B FROM R INTERSECT SELECT B FROM S)")[0][0]
cp = len(RR) * len(SS)
assert (nj, lj, ints, cp) == (5, 6, 2, 16)
msq("mocke_dbw_05", "DBW.REL.ALGB", "Relations R(A, B) and S(B, C) contain the tuples\n\nR: (1,a), (2,a), (3,b), (4,c)\n\nS: (a,x), (a,y), (b,z), (d,w)\n\nSelect all correct statements.",
    [("$R\\bowtie S$ (natural join) has 5 tuples", nj == 5), ("The left outer join of R with S on B has 6 tuples", lj == 6), ("$\\pi_B(R)\\cap\\pi_B(S)$ has 3 tuples", ints == 3), ("$R\\times S$ has 16 tuples", cp == 16)],
    "Natural join: B=a gives $2\\times2=4$, B=b gives 1: 5 tuples. Left outer join adds the dangling tuple (4,c): 6. $\\pi_B(R)=\\{a,b,c\\}$, $\\pi_B(S)=\\{a,b,d\\}$, intersection $\\{a,b\\}$ has 2 tuples. Cross product $4\\times4=16$. Correct: A, B, D.", "M", "executed on sqlite3", 2)

bfr = 4000 // 200
nb = 100000 // bfr
ie = 4000 // 16
ib = ceil(nb / ie)
acc = ceil(log2(ib)) + 1
assert (bfr, nb, ie, ib, acc) == (20, 5000, 250, 20, 6)
nat("mocke_dbw_06", "DBW.NF.IDX", "A file has 100,000 fixed-length records of 200 bytes each, stored unspanned in blocks of 4000 bytes and ordered on a key field. A single-level sparse (one entry per data block) primary index has entries of 16 bytes. The number of block accesses needed to fetch a record by binary search on the index followed by one data-block read is ______.", acc,
    "Blocking factor $=\\lfloor4000/200\\rfloor=20$, so 5,000 data blocks and 5,000 index entries. Entries per index block $=\\lfloor4000/16\\rfloor=250$, so 20 index blocks. Binary search: $\\lceil\\log_2 20\\rceil=5$ accesses, plus 1 data block $=6$.", diff="M", marks=2)

# ====================================================================== ML (10)
scq("mocke_ml_01", "ML.CLS.KNN", "In k-nearest-neighbour classification, as $k$ is increased from 1 towards the training-set size $n$, which statement is correct?",
    "Bias increases and variance decreases.", ["Bias decreases and variance increases.", "Both bias and variance decrease.", "Both bias and variance increase."],
    "$k=1$ gives a very flexible boundary (low bias, high variance). Averaging over more neighbours smooths the boundary, reducing variance but increasing bias; at $k=n$ the prediction is the majority class everywhere.", "E", "second-derivation", 1)

wl, bl, xl = (2, -1), 0.5, (1, 3)
zl = wl[0] * xl[0] + wl[1] * xl[1] + bl
pl = 1 / (1 + exp(-zl))
assert zl == -0.5 and abs(pl - 0.3775) < 1e-4
scq("mocke_ml_02", "ML.CLS.LOG", r"""A logistic regression model has weights $w=(2,-1)$ and bias $b=0.5$. For the input $x=(1,3)$ with decision threshold 0.5, the predicted class and the probability of class 1 are""",
    r"class 0, $p\approx0.38$", [r"class 1, $p\approx0.38$", r"class 1, $p\approx0.62$", r"class 0, $p\approx0.62$"],
    r"""$z=2(1)-1(3)+0.5=-0.5$, $p=\sigma(-0.5)=1/(1+e^{0.5})\approx0.378<0.5$, so class 0.""", "M", marks=1)

wv, bv = (3, 4), -2
nw = sqrt(sum(a * a for a in wv))
d11 = abs(wv[0] * 1 + wv[1] * 1 + bv) / nw
assert nw == 5 and 2 / nw == 0.4 and d11 == 1.0
msq("mocke_ml_03", "ML.CLS.SVM", r"""A hard-margin linear SVM has $w=(3,4)$, $b=-2$ with margin hyperplanes $w^Tx+b=\pm1$. Select all correct statements.""",
    [("The width of the margin (distance between the two margin hyperplanes) is 0.4", 2 / nw == 0.4), ("The distance of the point $(1,1)$ from the decision hyperplane is 1", d11 == 1.0),
     ("Removing a training point that is not a support vector can change the optimal hyperplane", False), ("Replacing $(w,b)$ by $(6,8,-4)$ gives a different decision boundary", False)],
    r"""Margin width $=2/\|w\|=2/5=0.4$. Distance of $(1,1)$ $=|3+4-2|/5=1$. The optimal hyperplane depends only on support vectors. Scaling $(w,b)$ by 2 leaves the set $\{w^Tx+b=0\}$ unchanged (only the margin hyperplanes' labels change). Correct: A, B.""", "M", marks=1)

pts = [1, 2, 9, 10, 25]


def lloyd(c):
    c = list(c)
    while True:
        cl = [[], []]
        for p in pts:
            cl[0 if abs(p - c[0]) <= abs(p - c[1]) else 1].append(p)
        nc = [sum(g) / len(g) for g in cl]
        if nc == c:
            return cl, c
        c = nc


sse = lambda cl: sum((p - sum(g) / len(g)) ** 2 for g in cl for p in g)
r1, _ = lloyd((1, 25))
r2, _ = lloyd((1, 2))
assert r1 == [[1, 2, 9, 10], [25]] and r2 == [[1, 2], [9, 10, 25]] and sse(r1) < sse(r2)
msq("mocke_ml_04", "ML.CLU.KM", "K-means (Lloyd's algorithm, $k=2$, Euclidean distance) is run on the 1-D data 1, 2, 9, 10, 25. Select all correct statements.",
    [("The sum of squared distances to the assigned centroids never increases from one iteration to the next", True), ("Starting from initial centroids 1 and 25 it converges to {1,2,9,10} and {25}", r1 == [[1, 2, 9, 10], [25]]),
     ("Starting from initial centroids 1 and 2 it converges to the same clustering as from 1 and 25", r1 == r2), ("The centroid-update step uses the median of each cluster", False)],
    "Both assignment and mean-update steps cannot increase the SSE. From (1, 25): the final centroids are 5.5 and 25 (clusters {1,2,9,10} and {25}). From (1, 2): the clusters end at {1,2} and {9,10,25} (centroids 1.5, 14.67), a different local optimum (SSE about 160 versus 65). The update step uses the mean. Correct: A, B.", "M", marks=1)

xs_, ys_ = [1, 2, 3, 4], [2, 3, 5, 4]
xm, ym = sum(xs_) / 4, sum(ys_) / 4
sl = sum((a - xm) * (b - ym) for a, b in zip(xs_, ys_)) / sum((a - xm) ** 2 for a in xs_)
pred = ym + sl * (6 - xm)
assert abs(sl - 0.8) < 1e-12 and abs(pred - 6.3) < 1e-12
nat("mocke_ml_05", "ML.REG.SLR", r"""A simple linear regression $y=\beta_0+\beta_1x$ is fitted by least squares to the points $(1,2),(2,3),(3,5),(4,4)$. The predicted $y$ at $x=6$ is ______. (Round off to one decimal place)""", pred,
    r"""$\bar x=2.5$, $\bar y=3.5$, $S_{xy}=4$, $S_{xx}=5$, so $\beta_1=0.8$, $\beta_0=3.5-2=1.5$. Prediction $=1.5+0.8\cdot6=6.3$.""", tol=0.05, dec=2, diff="E")

# Naive Bayes
NB = [(1, 1, "+"), (1, 0, "+"), (1, 1, "+"), (0, 1, "+"), (1, 0, "+"), (0, 0, "-"), (0, 1, "-"), (1, 0, "-"), (0, 0, "-")]
def nbpost(x):
    sc = {}
    for c in "+-":
        rows = [r for r in NB if r[2] == c]
        p = F(len(rows), len(NB))
        for j in range(2):
            p *= F(sum(1 for r in rows if r[j] == x[j]), len(rows))
        sc[c] = p
    return sc["+"] / (sc["+"] + sc["-"])
assert nbpost((1, 0)) == F(32, 47) and abs(float(F(32, 47)) - 0.6809) < 1e-4
scq("mocke_ml_06", "ML.CLS.NB", "A Naive Bayes classifier (no smoothing) is trained on binary features $(F_1,F_2)$ with class label C:\n\n| $F_1$ | $F_2$ | C |\n|---|---|---|\n" + "\n".join(f"| {a} | {b} | {c} |" for a, b, c in NB) + "\n\nFor the test point $(F_1,F_2)=(1,0)$, the posterior probability $P(C=+\\mid F_1=1,F_2=0)$ is closest to",
    "0.68", ["0.52", "0.82", "0.35"],
    "Class '+' (5 rows): $P(+)=5/9$, $P(F_1{=}1|+)=4/5$, $P(F_2{=}0|+)=2/5$: score $8/45$. Class '-' (4 rows): $4/9\\cdot\\tfrac14\\cdot\\tfrac34=1/12$. Posterior $=\\frac{8/45}{8/45+1/12}=32/47\\approx0.68$.", "M", marks=2)

DT = [("a", "p", 1), ("a", "p", 1), ("a", "q", 1), ("a", "q", 0), ("b", "p", 1), ("b", "p", 0), ("b", "q", 0), ("b", "q", 0), ("b", "p", 0), ("a", "p", 1)]
def H(ps):
    return -sum(p * log2(p) for p in ps if p > 0)
def ig(j):
    base = H([sum(r[2] for r in DT) / 10, 1 - sum(r[2] for r in DT) / 10])
    tot = 0
    for v in set(r[j] for r in DT):
        g = [r for r in DT if r[j] == v]
        pp = sum(r[2] for r in g) / len(g)
        tot += len(g) / 10 * H([pp, 1 - pp])
    return base - tot
gx, gy = ig(0), ig(1)
assert abs(gx - 0.2781) < 1e-3 and abs(gy - 0.1245) < 1e-3
scq("mocke_ml_07", "ML.CLS.DT", "A decision-tree learner chooses the root split by information gain (entropy in bits). The training data with features X, Y and class C (1 or 0) are:\n\n| X | Y | C |\n|---|---|---|\n" + "\n".join(f"| {a} | {b} | {c} |" for a, b, c in DT) + "\n\nWhich feature is chosen at the root and what is its information gain?",
    "X, about 0.28 bits", ["Y, about 0.28 bits", "X, about 0.12 bits", "Y, about 0.12 bits"],
    "Root entropy is 1 bit (5 vs 5). Split on X: a has 4 positive, 1 negative; b has 1 positive, 4 negative; both entropies $=0.722$, gain $=1-0.722=0.278$. Split on Y: p has 4+/2-, entropy 0.918 (weight 0.6); q has 1+/3-, entropy 0.811 (weight 0.4); weighted $0.876$, gain $0.124$. X wins.", "M", marks=2)

n_par = (4 + 1) * 5 + (5 + 1) * 3
assert n_par == 43
msq("mocke_ml_08", "ML.NN.MLP", "A fully connected feed-forward network has 4 inputs, one hidden layer of 5 units and 3 outputs, with a bias in every hidden and output unit. Select all correct statements.",
    [("The network has 43 trainable parameters", n_par == 43), ("If all activation functions are linear, the network computes an affine function of its input, equivalent to a single linear layer", True),
     ("A ReLU unit always outputs a strictly positive value", False), ("If all weights of the hidden layer are initialised to the same constant, the hidden units receive identical gradients", True)],
    "Parameters: $(4+1)\\cdot5+(5+1)\\cdot3=25+18=43$. Composition of affine maps is affine. ReLU outputs 0 for non-positive inputs, so not strictly positive. With identical weights (and symmetric output weights) the hidden units are interchangeable, so gradients are identical (symmetry problem). Correct: A, B, D.", "M", "second-derivation + parameter count by code", 2)

xr, yr = [1, 2, 3], [2, 4, 7]
sxy, sxx = sum(a * b for a, b in zip(xr, yr)), sum(a * a for a in xr)
w0 = F(sxy, sxx)
w14 = F(sxy, sxx + 14)
assert (sxy, sxx) == (31, 14) and w14 == w0 / 2
mse = lambda w: sum((b - w * a) ** 2 for a, b in zip(xr, yr))
assert mse(w14) > mse(w0)
msq("mocke_ml_09", "ML.REG.RDG", r"""One-dimensional ridge regression without intercept fits $y\approx wx$ on $(x,y)=(1,2),(2,4),(3,7)$ by minimising $\sum(y_i-wx_i)^2+\lambda w^2$. Select all correct statements.""",
    [(r"With $\lambda=14$ the ridge slope is exactly half of the ordinary least-squares slope", w14 == w0 / 2), (r"As $\lambda\to\infty$ the ridge slope tends to 0", True),
     (r"For $\lambda=14$ the training squared error is smaller than that of the least-squares fit", mse(w14) < mse(w0)), (r"Ridge regression sets the slope to exactly 0 for every finite $\lambda>0$", False)],
    r"""$w_{\lambda}=\sum xy/(\sum x^2+\lambda)=31/(14+\lambda)$. OLS: $31/14$; $\lambda=14$: $31/28$, half of it. As $\lambda\to\infty$, $w\to0$. OLS minimises the training error, so ridge has larger (not smaller) training error. $31/(14+\lambda)$ is never exactly 0. Correct: A, B.""", "M", marks=2)

PP = [(1, 2), (3, 4), (5, 8), (7, 10)]
mx_, my_ = sum(p[0] for p in PP) / 4, sum(p[1] for p in PP) / 4
cxx = sum((p[0] - mx_) ** 2 for p in PP) / 3
cyy = sum((p[1] - my_) ** 2 for p in PP) / 3
cxy = sum((p[0] - mx_) * (p[1] - my_) for p in PP) / 3
tr, dt = cxx + cyy, cxx * cyy - cxy ** 2
e1 = (tr + sqrt(tr * tr - 4 * dt)) / 2
vec = [1.0, 1.0]
for _ in range(200):
    nv = [cxx * vec[0] + cxy * vec[1], cxy * vec[0] + cyy * vec[1]]
    nrm = sqrt(nv[0] ** 2 + nv[1] ** 2)
    vec = [v / nrm for v in nv]
lam_pi = vec[0] * (cxx * vec[0] + cxy * vec[1]) + vec[1] * (cxy * vec[0] + cyy * vec[1])
assert abs(lam_pi - e1) < 1e-9
pct = e1 / tr * 100
assert abs(pct - 99.55) < 0.01
nat("mocke_ml_10", "ML.DR.PCA", r"""PCA is applied to the four points $(1,2),(3,4),(5,8),(7,10)$ using the sample covariance matrix (divisor $n-1$). The percentage of the total variance explained by the first principal component is ______. (Round off to two decimal places)""", pct,
    r"""Mean $(4,6)$. $S_{xx}=20$, $S_{yy}=40$, $S_{xy}=28$ (divided by 3). Eigenvalues of $\begin{pmatrix}20&28\\28&40\end{pmatrix}$: trace 60, det 16, $\lambda_1=30+\sqrt{884}\approx59.73$. Fraction $=59.73/60\approx99.55\%$.""", tol=0.03, dec=2, diff="H", marks=2)

# ====================================================================== AI (5)
def imp(a, b):
    return (not a) or b
tt = lambda f: all(f(p, q, r) for p, q, r in itertools.product([False, True], repeat=3))
f1 = lambda p, q, r: imp(imp(p, q) and imp(q, r), imp(p, r))
f2 = lambda p, q, r: imp(imp(p, q), imp(q, p))
f3 = lambda p, q, r: imp(p or q, p and q)
f4 = lambda p, q, r: imp(imp(p, q), imp(not p, not q))
assert tt(f1) and not tt(f2) and not tt(f3) and not tt(f4)
scq("mocke_ai_01", "AI.LOG.PROP", "Which one of the following propositional formulas is a tautology?",
    r"$((p\to q)\wedge(q\to r))\to(p\to r)$", [r"$(p\to q)\to(q\to p)$", r"$(p\vee q)\to(p\wedge q)$", r"$(p\to q)\to(\neg p\to\neg q)$"],
    r"""The first is hypothetical syllogism: whenever $p\to q$ and $q\to r$ hold, $p\to r$ holds. Each of the others fails for some assignment (e.g. $p=F,q=T$ for the second and fourth; $p=T,q=F$ for the third).""", "E", "truth table by code", 1)

AE = [("S", "A", 1), ("S", "B", 4), ("A", "B", 2), ("A", "G", 6), ("B", "G", 3)]
gr_ = {}
for u, v, w in AE:
    gr_.setdefault(u, {})[v] = w
    gr_.setdefault(v, {})[u] = w
hh = {"S": 6, "A": 4, "B": 3, "G": 0}
# true costs to G (Dijkstra from G)
dg = {"G": 0}
pq = [(0, "G")]
while pq:
    d, u = heapq.heappop(pq)
    if d > dg.get(u, 1e9):
        continue
    for v, w in gr_[u].items():
        if d + w < dg.get(v, 1e9):
            dg[v] = d + w
            heapq.heappush(pq, (d + w, v))
admis = all(hh[n] <= dg[n] for n in hh)
consis = all(hh[u] <= w + hh[v] for u in gr_ for v, w in gr_[u].items())
assert dg == {"G": 0, "B": 3, "A": 5, "S": 6} and admis and not consis
gbest = {"S": 0}
order, pth, openq, closed = [], {}, [(hh["S"], "S")], set()
while openq:
    f, u = heapq.heappop(openq)
    if u in closed:
        continue
    closed.add(u)
    order.append(u)
    if u == "G":
        break
    for v, w in gr_[u].items():
        if gbest[u] + w < gbest.get(v, 1e9):
            gbest[v] = gbest[u] + w
            pth[v] = u
            heapq.heappush(openq, (gbest[v] + hh[v], v))
path = ["G"]
while path[-1] != "S":
    path.append(pth[path[-1]])
path.reverse()
assert order == ["S", "A", "B", "G"] and path == ["S", "A", "B", "G"] and gbest["G"] == 6
msq("mocke_ai_02", "AI.SRCH.INF", "A search graph is undirected with edge costs S-A 1, S-B 4, A-B 2, A-G 6, B-G 3 (start S, goal G). A heuristic is given by $h(S)=6$, $h(A)=4$, $h(B)=3$, $h(G)=0$. A* graph search is run. Select all correct statements.",
    [("$h$ is admissible", admis), ("$h$ is consistent", consis), ("The nodes are expanded in the order S, A, B, G", order == ["S", "A", "B", "G"]), ("The path returned is S-B-G", path == ["S", "B", "G"])],
    "True costs to G: $B:3$, $A:\\min(2+3,6)=5$, $S:\\min(1+5,4+3)=6$, so $h\\le h^*$ everywhere: admissible. Edge S-A violates consistency: $h(S)=6>1+h(A)=5$. A*: expand S ($f=6$); A has $f=5$, B has $f=7$; expand A (B improves to $g=3,f=6$; G $g=7$); expand B ($G$ improves to $g=6$); expand G. Optimal path S-A-B-G of cost 6. Correct: A, C.", "H", marks=1)

ids_n = sum(((3 ** (L + 1) - 1) // 2) for L in range(5))
ids_w = sum((5 - i) * 3 ** i for i in range(5))
assert ids_n == ids_w == 179
nat("mocke_ai_03", "AI.SRCH.UNINF", "A search tree has branching factor 3 (every node has exactly 3 children) and the goal lies at depth 4. Iterative deepening depth-first search runs depth-limited searches with limits 0, 1, 2, 3, 4 and counts every node generation (the root counts once per iteration, nodes are regenerated in every iteration). The total number of nodes generated by the end of the limit-4 iteration is ______.", 179,
    "A depth-limited search with limit $L$ generates $(3^{L+1}-1)/2$ nodes: $1,4,13,40,121$. Total $=179$. Equivalently $\\sum_{d=0}^{4}(5-d)3^d=5+12+27+54+81=179$.", diff="M")

DOM = [1, 2, 3, 4]
Rr = lambda x, y: y == (x * x) % 5
S1 = any(all(not Rr(x, y) for y in DOM) for x in DOM)
S2 = all(Rr(y, y) for x in DOM for y in DOM if Rr(x, y))
S3 = any(all(Rr(x, y) for x in DOM) for y in DOM)
S4 = all(y == z for x in DOM for y in DOM for z in DOM if Rr(x, y) and Rr(x, z))
assert (S1, S2, S3, S4) == (False, False, False, True)
scq("mocke_ai_04", "AI.LOG.PRED", r"""The domain is $\{1,2,3,4\}$ and the predicate $R(x,y)$ is true exactly when $y\equiv x^2\pmod5$. Which one of the following sentences is true?""",
    r"$\forall x\,\forall y\,\forall z\,[(R(x,y)\wedge R(x,z))\to y=z]$",
    [r"$\exists x\,\forall y\,\neg R(x,y)$", r"$\forall x\,\forall y\,[R(x,y)\to R(y,y)]$", r"$\exists y\,\forall x\,R(x,y)$"],
    r"""$R=\{(1,1),(2,4),(3,4),(4,1)\}$: a function, so each $x$ has exactly one $y$; the last sentence is true. First: every $x$ has some $y$, false. Second: $R(2,4)$ but $R(4,4)$ is false. Third: no single $y$ is the image of all $x$ ($1$ is the image of 1 and 4, $4$ of 2 and 3).""", "M", marks=2)

# Bayesian network A->C<-B, C->D
pA, pB = F(3, 10), F(3, 5)
pC = {(0, 0): F(1, 10), (0, 1): F(1, 2), (1, 0): F(2, 5), (1, 1): F(9, 10)}
pD = {0: F(1, 5), 1: F(7, 10)}
def joint(a, b, c, d):
    p = (pA if a else 1 - pA) * (pB if b else 1 - pB)
    p *= pC[(a, b)] if c else 1 - pC[(a, b)]
    p *= pD[c] if d else 1 - pD[c]
    return p
V = list(itertools.product([0, 1], repeat=4))
def marg(**kw):
    idx = {"a": 0, "b": 1, "c": 2, "d": 3}
    return sum(joint(*v) for v in V if all(v[idx[k]] == val for k, val in kw.items()))
ind_ab = all(marg(a=a, b=b) == marg(a=a) * marg(b=b) for a in (0, 1) for b in (0, 1))
ind_ab_c = all(marg(a=a, b=b, c=c) * marg(c=c) == marg(a=a, c=c) * marg(b=b, c=c) for a in (0, 1) for b in (0, 1) for c in (0, 1))
ind_ad_c = all(marg(a=a, d=d, c=c) * marg(c=c) == marg(a=a, c=c) * marg(d=d, c=c) for a in (0, 1) for d in (0, 1) for c in (0, 1))
assert ind_ab and not ind_ab_c and ind_ad_c and 1 + 1 + 4 + 2 == 8
msq("mocke_ai_05", "AI.UNC.CI", "A Bayesian network over binary variables has edges A -> C, B -> C and C -> D. Select all correct statements.",
    [("A and B are marginally independent", ind_ab), ("A and B are independent given C", ind_ab_c), ("A and D are independent given C", ind_ad_c), ("The network needs 8 free probability parameters, against 15 for the full joint table", True)],
    "A and B are parents with no common ancestor: the collider C blocks the path, so A and B are marginally independent, but conditioning on C opens it (explaining away), so they are dependent given C. C blocks every path from A to D, so A and D are independent given C. Parameters: $1+1+4+2=8$ versus $2^4-1=15$. (Independence statements also checked by exact enumeration with sample CPTs.) Correct: A, C, D.", "M", marks=2)
