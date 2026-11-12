"""Full GATE DA mock D (65 questions: GA 10 + DA 55). Keys are prefixed ``mockd_``.

Order of the paper (see pipeline/fixtures/papers/gate_da_mock_d.json) is rebuilt from ITEMS by key prefix, so the
numeric/combinatorial answers below are all recomputed in-line by independent routines (asserts).
"""
import itertools
import sqlite3
from fractions import Fraction as F
from math import comb, erf, exp, log, log2, sqrt

from . import msq, nat, scq


def phi(z):
    return 0.5 * (1 + erf(z / sqrt(2)))


def det(A):
    n = len(A)
    if n == 1:
        return A[0][0]
    return sum((-1) ** j * A[0][j] * det([r[:j] + r[j + 1:] for r in A[1:]]) for j in range(n))


def rank(M):
    M = [[F(x) for x in r] for r in M]
    rk, rows, cols = 0, len(M), len(M[0])
    for c in range(cols):
        p = next((r for r in range(rk, rows) if M[r][c] != 0), None)
        if p is None:
            continue
        M[rk], M[p] = M[p], M[rk]
        for r in range(rows):
            if r != rk and M[r][c] != 0:
                f = M[r][c] / M[rk][c]
                M[r] = [a - f * b for a, b in zip(M[r], M[rk])]
        rk += 1
    return rk


# =========================================================================================== GA (10)
# --- GA 1 mark (5)
scq("mockd_ga_01", "GA.VERB.VOC", "The minister's reply was deliberately ______, offering the reporters neither a clear yes nor a clear no. Choose the word that best fills the blank.",
    "equivocal", ["emphatic", "candid", "exuberant"],
    "A reply that gives neither yes nor no is deliberately ambiguous. 'Equivocal' means open to more than one interpretation; the other words describe clarity or enthusiasm.", "E", "second-derivation", 1)
scq("mockd_ga_02", "GA.VERB.GRAM", "Each of the committee members ______ asked to submit a separate written report before the meeting.",
    "was", ["were", "have been", "are"],
    "'Each' is singular and the event is in the past, so the singular past form 'was' is correct.", "E", "second-derivation", 1)

# tank
r = 1 / (F(1, 6) + F(1, 9) - F(1, 18))
assert r == F(9, 2)
assert abs(sum([1 / 6, 1 / 9, -1 / 18]) * 4.5 - 1) < 1e-12
scq("mockd_ga_03", "GA.QUANT.NUMC", "Pipe A fills an empty tank in 6 hours and pipe B fills it in 9 hours. A drain pipe C empties a full tank in 18 hours. If all three are opened together on the empty tank, the tank is full after",
    "4.5 hours", ["3 hours", "6 hours", "9 hours"],
    r"""Net rate $=\frac16+\frac19-\frac1{18}=\frac{3+2-1}{18}=\frac{4}{18}=\frac29$ tank/hour, so the time is $9/2=4.5$ hours.""", "E", "recomputed-by-code", 1)
scq("mockd_ga_04", "GA.ANAL.DED", "No reptile is warm-blooded. All snakes are reptiles. Which one of the following statements MUST be true?",
    "No snake is warm-blooded.", ["Some snakes are warm-blooded.", "All reptiles are snakes.", "Some warm-blooded animals are snakes."],
    "Snakes are a subset of reptiles; reptiles and warm-blooded animals are disjoint, hence snakes and warm-blooded animals are disjoint. The other statements contradict this or do not follow from the premises.", "E", "second-derivation", 1)
s = [3]
for _ in range(5):
    s.append(2 * s[-1] + 2)
assert s == [3, 8, 18, 38, 78, 158]
scq("mockd_ga_05", "GA.QUANT.NUMC", "What is the next term in the sequence 3, 8, 18, 38, 78, ... ?", "158", ["156", "160", "168"],
    r"""Each term is twice the previous term plus 2: $3\to8\to18\to38\to78\to 2(78)+2=158$.""", "E", "recomputed-by-code", 1)

# --- GA 2 marks (5)
tab = {2023: (120, 80, 150), 2024: (150, 100, 165), 2025: (135, 130, 198)}
inc = (sum(tab[2025]) - sum(tab[2023])) / sum(tab[2023]) * 100
assert round(inc, 1) == 32.3 and sum(tab[2023]) == 350 and sum(tab[2025]) == 463
assert [round((b - a) / a * 100, 1) for a, b in zip(tab[2023], tab[2025])] == [12.5, 62.5, 32.0]
scq("mockd_ga_06", "GA.QUANT.DI", """The table gives the annual sales (in thousand units) of three products X, Y and Z.

| Year | X | Y | Z |
|---|---|---|---|
| 2023 | 120 | 80 | 150 |
| 2024 | 150 | 100 | 165 |
| 2025 | 135 | 130 | 198 |

By what percentage did the TOTAL sales of the three products in 2025 exceed their total sales in 2023?""",
    "32.3%", ["12.5%", "62.5%", "29.3%"],
    r"""Totals: 2023 $=120+80+150=350$; 2025 $=135+130+198=463$. Increase $=\frac{463-350}{350}\times100=32.29\approx32.3\%$. The values 12.5% and 62.5% are the growths of X and Y alone.""", "M", "recomputed-by-code", 2)
x = F(3, 4)
assert x * F(3, 5) + (1 - x) * F(1, 5) == F(1, 2)
scq("mockd_ga_07", "GA.QUANT.NUMC", "Alloy A has copper and zinc in the ratio 3 : 2 and alloy B has copper and zinc in the ratio 1 : 4. In what ratio (A : B) must the two alloys be melted together to obtain an alloy with equal amounts of copper and zinc?",
    "3 : 1", ["1 : 1", "2 : 1", "3 : 2"],
    r"""Copper fraction: A $=3/5$, B $=1/5$, target $=1/2$. If a fraction $x$ is taken from A, $\frac35x+\frac15(1-x)=\frac12\Rightarrow \frac25x=\frac3{10}\Rightarrow x=\frac34$. So A : B $=3:1$.""", "M", "recomputed-by-code", 2)
cnt = 0
for p in itertools.permutations("PQRST"):
    if abs(p.index("P") - p.index("Q")) == 1 and p.index("R") not in (0, 4):
        cnt += 1
# independent count: adjacent arrangements 48; those with R at an end
adj = [p for p in itertools.permutations("PQRST") if abs(p.index("P") - p.index("Q")) == 1]
rend = [p for p in adj if p.index("R") in (0, 4)]
assert len(adj) == 48 and cnt == len(adj) - len(rend) == 24
scq("mockd_ga_08", "GA.ANAL.NREL", "Five friends P, Q, R, S and T sit in a row of five chairs. P and Q must sit next to each other, and R must not sit on either end chair. In how many different ways can they be seated?",
    "24", ["32", "36", "48"],
    r"""Treat P and Q as one block: $4!\times2=48$ arrangements with P, Q adjacent. Count those with R on an end: R at an end (2 ways) and the block with S, T in the remaining 4 chairs: the block has 3 positions among 4 chairs, so $2\cdot 3\cdot 2\cdot 2 = 24$ arrangements. Hence $48-24=24$.""", "M", "recomputed-by-code", 2)
cube = sum(1 for c in itertools.product(range(5), repeat=3) if sum(1 for v in c if v in (0, 4)) == 2)
assert cube == 12 * 3 == 36
scq("mockd_ga_09", "GA.SPAT.ASSM", "A solid cube of side 5 cm is painted red on all six faces and then cut into 125 unit cubes of side 1 cm. How many of the unit cubes have exactly two faces painted?",
    "36", ["24", "54", "12"],
    r"""Cubes with exactly two painted faces lie along the 12 edges, excluding the two corner cubes at each end: $12\times(5-2)=36$.""", "M", "recomputed-by-code", 2)
scq("mockd_ga_10", "GA.VERB.RC", """Read the passage and answer.

"Green roofs reduce stormwater runoff and insulate the building below, but they add structural load and need maintenance. A city retrofitted 40 buildings; in those that also installed pumped irrigation, the energy saved by insulation was almost entirely cancelled by the energy used for pumping water."

Which one of the following can be inferred from the passage?""",
    "Pumped irrigation can offset the energy benefit of the insulation a green roof provides.",
    ["Green roofs should never be irrigated.", "Green roofs increase the stormwater runoff of a building.", "All 40 retrofitted buildings used no more energy than before."],
    "The passage states that in irrigated buildings the energy saved by insulation was almost cancelled by pumping energy. 'Never' and 'all 40' overreach; runoff is said to be reduced, not increased.", "M", "second-derivation", 2)

# =========================================================================================== PRS (12)
# 1-mark SCQ
EX2 = F(1, 6) * (F(8) ** 3 - F(2) ** 3) / 3
assert EX2 == 28 and F(6 ** 2, 12) + 25 == 28
scq("mockd_prs_01", "PRS.CRV.UNI", r"""A random variable $X$ is uniformly distributed on the interval $[2, 8]$. The value of $E[X^2]$ is""",
    "28", ["25", "3", "36"],
    r"""$E[X]=5$ and $\mathrm{Var}(X)=\frac{(8-2)^2}{12}=3$, so $E[X^2]=3+25=28$. (Direct: $\frac16\int_2^8x^2dx=\frac{512-8}{18}=28$.)""", "E", "recomputed-by-code", 1)
v = 4 * 4 + 9 * 9 - 2 * 2 * 3 * 1
assert v == 85
scq("mockd_prs_02", "PRS.MOM.JNT", r"""Random variables $X$ and $Y$ have $\mathrm{Var}(X)=4$, $\mathrm{Var}(Y)=9$ and $\mathrm{Cov}(X,Y)=1$. Then $\mathrm{Var}(2X-3Y)$ equals""",
    "85", ["109", "73", "97"],
    r"""$\mathrm{Var}(2X-3Y)=4\mathrm{Var}(X)+9\mathrm{Var}(Y)-2\cdot2\cdot3\,\mathrm{Cov}(X,Y)=16+81-12=85$.""", "M", "recomputed-by-code", 1)
# 1-mark MSQ
pm = {-1: F(1, 3), 0: F(1, 3), 1: F(1, 3)}
EX = sum(k * p for k, p in pm.items())
EY = sum(k * k * p for k, p in pm.items())
EXY = sum(k * k * k * p for k, p in pm.items())
VY = sum(k ** 4 * p for k, p in pm.items()) - EY ** 2
assert EX == 0 and EXY - EX * EY == 0 and EY == F(2, 3) and VY == F(2, 9)
assert F(1, 3) * 1 != F(1, 3) * F(2, 3)  # P(X=1,Y=1)=1/3 vs P(X=1)P(Y=1)=1/3*2/3
msq("mockd_prs_03", "PRS.DESC.COR", r"""$X$ takes the values $-1, 0, 1$ with equal probability, and $Y=X^2$. Which of the following statements is/are TRUE?""",
    [(r"$\mathrm{Cov}(X,Y)=0$", True), (r"$X$ and $Y$ are independent", False), (r"$E[Y]=2/3$", True), (r"$\mathrm{Var}(Y)=1/3$", False)],
    r"""$E[X]=0$, $E[XY]=E[X^3]=0$, so the covariance is 0. But $P(X=1,Y=1)=1/3\ne P(X=1)P(Y=1)=\frac13\cdot\frac23$, so they are dependent. $E[Y]=\frac23$; $\mathrm{Var}(Y)=E[Y^2]-E[Y]^2=\frac23-\frac49=\frac29\ne\frac13$.""", "M", "recomputed-by-code", 1)
# 1-mark NAT
med = log(2) / 0.25
assert abs(med - 2.7726) < 1e-4 and abs(1 - exp(-0.25 * med) - 0.5) < 1e-12
nat("mockd_prs_04", "PRS.CRV.EXP", r"""The lifetime (in years) of a component follows an exponential distribution with rate $\lambda=0.25$ per year. The median lifetime, in years, is ______. (Round off to two decimal places)""",
    med, r"""Median $m$: $1-e^{-\lambda m}=\tfrac12\Rightarrow m=\ln2/\lambda=0.6931/0.25=2.77$.""", tol=0.01, dec=3, diff="E", marks=1)
pb = comb(6, 2) * F(1, 3) ** 2 * F(2, 3) ** 4
assert pb == F(240, 729) and abs(float(pb) - 0.32922) < 1e-5
nat("mockd_prs_05", "PRS.DRV.BIN", r"""A fair three-sided spinner lands on a shaded sector with probability $1/3$ in each independent spin. In 6 spins, the probability of exactly 2 shaded outcomes is ______. (Round off to two decimal places)""",
    float(pb), r"""$X\sim\mathrm{Bin}(6,\frac13)$: $P(X=2)=\binom62(\frac13)^2(\frac23)^4=15\cdot\frac{16}{729}=\frac{240}{729}\approx0.33$.""", tol=0.005, dec=3, diff="M", marks=1)
# 2-mark SCQ
w = {"fair": F(1, 2), "two": F(1), "bias": F(1, 4)}
lik = {k: p ** 2 for k, p in w.items()}
post = lik["two"] / sum(lik.values())
assert post == F(16, 21) and lik["fair"] == F(1, 4) and lik["bias"] == F(1, 16)
# independent enumeration with 21 equally likely weights (x16)
tot16 = 4 + 16 + 1
assert F(16, tot16) == post
scq("mockd_prs_06", "PRS.PROB.BAYES", r"""A box holds three coins: a fair coin, a two-headed coin, and a biased coin with $P(\text{head})=1/4$. A coin is picked uniformly at random and tossed twice; both tosses show heads. The probability that the two-headed coin was picked is""",
    "16/21", ["1/3", "4/7", "4/5"],
    r"""Likelihood of HH: fair $\frac14$, two-headed $1$, biased $\frac1{16}$. Posterior $=\frac{1}{\frac14+1+\frac1{16}}=\frac{16}{4+16+1}=\frac{16}{21}$.""", "M", "recomputed-by-code", 2)
pc = 2 * (1 - phi(1.5))
assert abs(pc - 0.13361) < 1e-4 and abs((1 - phi(1.5)) / 0.5 - pc) < 1e-12
scq("mockd_prs_07", "PRS.CRV.NOR", r"""$X\sim N(50, 10^2)$. Then $P(X>65\mid X>50)$ is approximately (use $\Phi(1.5)=0.9332$)""",
    "0.134", ["0.067", "0.866", "0.250"],
    r"""$P(X>65)=1-\Phi(1.5)=0.0668$ and $P(X>50)=0.5$. The ratio is $0.0668/0.5=0.1336\approx0.134$.""", "M", "recomputed-by-code", 2)
# 2-mark MSQ (CI)
se = 12 / sqrt(36)
lo, hi = 80 - 1.96 * se, 80 + 1.96 * se
assert (round(lo, 2), round(hi, 2)) == (76.08, 83.92) and round(hi - lo, 2) == 7.84
assert 2 * 2.576 * se > hi - lo and not (lo <= 84 <= hi)
se144 = 12 / sqrt(144)
assert abs(2 * 1.96 * se144 - (hi - lo) / 2) < 1e-9
msq("mockd_prs_08", "PRS.INF.CI", r"""A sample of $n=36$ observations from a population with known $\sigma=12$ has mean 80. A 95% confidence interval for the population mean is computed using $z_{0.975}=1.96$. Which of the following statements is/are TRUE?""",
    [("The width of the interval is 7.84", True), ("A 99% interval computed from the same data is wider than this interval", True),
     ("The interval contains the value 84", False), ("If $n$ is increased to 144 (same $\\sigma$), the width of the interval becomes one quarter of its present value", False)],
    r"""Standard error $=12/6=2$; interval $80\pm1.96\cdot2=(76.08,83.92)$, width $7.84$. A 99% interval uses $z=2.576$ and is wider. 84 lies outside. With $n=144$ the standard error halves to 1, so the width halves (3.92), it does not become a quarter.""", "M", "recomputed-by-code", 2)
# 2-mark NAT
P = {(0, 0): 3, (0, 1): 2, (1, 0): 4, (1, 1): 5, (2, 0): 1, (2, 1): 5}
assert sum(P.values()) == 20
EXv = F(sum(x * p for (x, y), p in P.items()), 20)
EYv = F(sum(y * p for (x, y), p in P.items()), 20)
EXYv = F(sum(x * y * p for (x, y), p in P.items()), 20)
cov = EXYv - EXv * EYv
assert (EXv, EYv, EXYv, cov) == (F(21, 20), F(3, 5), F(3, 4), F(3, 25))
nat("mockd_prs_09", "PRS.MOM.JNT", r"""The joint probability mass function of $X\in\{0,1,2\}$ and $Y\in\{0,1\}$ is $P(X,Y)=n(x,y)/20$ with

| $n(x,y)$ | $Y=0$ | $Y=1$ |
|---|---|---|
| $X=0$ | 3 | 2 |
| $X=1$ | 4 | 5 |
| $X=2$ | 1 | 5 |

$\mathrm{Cov}(X,Y)$ is ______. (Round off to two decimal places)""", float(cov),
    r"""$\sum xn=1\cdot9+2\cdot6=21$, so $E[X]=21/20=1.05$. $E[Y]=\frac{2+5+5}{20}=0.6$. $E[XY]=\frac{5+10}{20}=0.75$. $\mathrm{Cov}=0.75-1.05\times0.6=0.12$.""", tol=0.005, dec=3, diff="M", marks=2)


def pint(coef, a, b):  # integrate polynomial {power: coeff} on [a,b] exactly
    return sum(F(c) * (F(b) ** (k + 1) - F(a) ** (k + 1)) / (k + 1) for k, c in coef.items())


f0 = {0: 4, 2: -1}
k = 1 / pint(f0, 0, 2)
assert k == F(3, 16)
m1 = k * pint({1: 4, 3: -1}, 0, 2)
m2 = k * pint({2: 4, 4: -1}, 0, 2)
var = m2 - m1 ** 2
assert (m1, m2, var) == (F(3, 4), F(4, 5), F(19, 80)) and float(var) == 0.2375
# numeric cross-check (midpoint rule)
N = 20000
xs = [(i + 0.5) * 2 / N for i in range(N)]
mm1 = sum(x * float(k) * (4 - x * x) for x in xs) * 2 / N
mm2 = sum(x * x * float(k) * (4 - x * x) for x in xs) * 2 / N
assert abs(mm2 - mm1 ** 2 - 0.2375) < 1e-6
nat("mockd_prs_10", "PRS.CRV.PDF", r"""A continuous random variable $X$ has density $f(x)=k(4-x^2)$ for $0\le x\le2$ and $f(x)=0$ otherwise. The variance of $X$ is ______. (Round off to three decimal places)""",
    float(var), r"""$\int_0^2(4-x^2)dx=\frac{16}{3}$, so $k=\frac3{16}$. $E[X]=\frac3{16}\int_0^2(4x-x^3)dx=\frac3{16}\cdot4=\frac34$. $E[X^2]=\frac3{16}\int_0^2(4x^2-x^4)dx=\frac3{16}\cdot\frac{64}{15}=\frac45$. $\mathrm{Var}=\frac45-\frac9{16}=\frac{19}{80}=0.2375\approx0.238$.""", tol=0.001, dec=4, diff="H", marks=2)
# Wald / first-step analysis
Ew = sum((F(5, 6)) ** (n - 1) * F(1, 6) * (6 + 3 * (n - 1)) for n in range(1, 400))
assert abs(float(Ew) - 21) < 1e-9
E = F(1, 6) * 6 + F(5, 6) * (3 + 0)  # constant part of the recursion E = 1 + 5/2 + (5/6)E
assert E / (1 - F(5, 6)) == 21
nat("mockd_prs_11", "PRS.MOM.EXV", r"""A fair six-faced die is rolled repeatedly until the first 6 appears (that roll included). The expected value of the SUM of all the numbers rolled is ______.""",
    21, r"""First-step analysis: $E=\frac16\cdot6+\frac56\left(3+E\right)$ since a non-6 roll averages $(1+2+3+4+5)/5=3$. So $\frac E6=1+\frac52$, giving $E=21$. (Wald: $E[N]E[X]=6\times3.5=21$.)""", diff="H", marks=2)
sd = sqrt(100 / 12)
pz = 1 - phi(5 / sd)
assert abs(pz - 0.04163) < 2e-4
nat("mockd_prs_12", "PRS.CLT", r"""$S$ is the sum of 100 independent random variables, each uniformly distributed on $[0,1]$. Using the central limit theorem, $P(S>55)$ is ______. (Round off to three decimal places)""",
    pz, r"""Mean $=100\cdot\frac12=50$, variance $=100\cdot\frac1{12}=8.333$, sd $=2.887$. $z=\frac{55-50}{2.887}=1.732$, $P(Z>1.732)=0.0416\approx0.042$.""", tol=0.002, dec=4, diff="M", marks=2)

# =========================================================================================== LA (8)
tr, dt = 4 + 3, 4 * 3 - 1 * 2
ev = [(tr + sqrt(tr * tr - 4 * dt)) / 2, (tr - sqrt(tr * tr - 4 * dt)) / 2]
assert [round(e, 9) for e in ev] == [5, 2] and sum(e * e for e in ev) == tr * tr - 2 * dt == 29
scq("mockd_la_01", "LA.EIG.EV", r"""The sum of the squares of the eigenvalues of $A=\begin{pmatrix}4&1\\2&3\end{pmatrix}$ is""", "29", ["49", "21", "25"],
    r"""$\mathrm{tr}A=7$, $\det A=10$. Eigenvalues solve $\lambda^2-7\lambda+10=0$: $5,2$. Sum of squares $=25+4=29=\mathrm{tr}^2-2\det$.""", "E", "recomputed-by-code", 1)
v1, v2, v3, v4 = (1, 0, 2), (0, 1, 1), (2, 1, 5), (1, 1, 0)
assert rank([v1, v2, v3]) == 2 and rank([v1, v2, v4]) == 3 and det([v1, v2, v4]) == -3
assert tuple(2 * a + b for a, b in zip(v1, v2)) == v3
msq("mockd_la_02", "LA.VS.LIN", r"""Let $v_1=(1,0,2)$, $v_2=(0,1,1)$, $v_3=(2,1,5)$, $v_4=(1,1,0)$ in $\mathbb{R}^3$. Which of the following statements is/are TRUE?""",
    [(r"$\{v_1,v_2,v_3\}$ is linearly independent", False), (r"$\{v_1,v_2,v_4\}$ is linearly independent", True),
     (r"$v_3$ lies in the span of $\{v_1,v_2\}$", True), (r"The span of $\{v_1,v_2,v_3\}$ is all of $\mathbb{R}^3$", False)],
    r"""$v_3=2v_1+v_2$, so $\{v_1,v_2,v_3\}$ is dependent with rank 2 and does not span $\mathbb R^3$. $\det[v_1;v_2;v_4]=-3\ne0$, so $\{v_1,v_2,v_4\}$ is independent.""", "M", "recomputed-by-code", 1)
Am = [[2, 0, 1], [1, 3, 2], [1, 1, 4]]
import itertools as _it
leib = 0
for p in _it.permutations(range(3)):
    sg = (-1) ** sum(1 for i in range(3) for j in range(i + 1, 3) if p[i] > p[j])
    leib += sg * Am[0][p[0]] * Am[1][p[1]] * Am[2][p[2]]
assert det(Am) == leib == 18
nat("mockd_la_03", "LA.EIG.DET", r"""The determinant of $\begin{pmatrix}2&0&1\\1&3&2\\1&1&4\end{pmatrix}$ is ______.""", 18,
    r"""Expand along the first row: $2(12-2)-0+1(1-3)=20-2=18$.""", diff="E", marks=1)
Ap = [[1, 0], [1, 1], [1, 2]]
bp = [1, 3, 2]
AtA = [[sum(Ap[k][i] * Ap[k][j] for k in range(3)) for j in range(2)] for i in range(2)]
Atb = [sum(Ap[k][i] * bp[k] for k in range(3)) for i in range(2)]
dd = AtA[0][0] * AtA[1][1] - AtA[0][1] * AtA[1][0]
xh = [F(AtA[1][1] * Atb[0] - AtA[0][1] * Atb[1], dd), F(AtA[0][0] * Atb[1] - AtA[1][0] * Atb[0], dd)]
res = [bp[k] - (Ap[k][0] * xh[0] + Ap[k][1] * xh[1]) for k in range(3)]
assert xh == [F(3, 2), F(1, 2)] and res == [F(-1, 2), 1, F(-1, 2)]
assert sum(res) == 0 and sum(Ap[k][1] * res[k] for k in range(3)) == 0
assert sum(r_ * r_ for r_ in res) == F(3, 2)
scq("mockd_la_04", "LA.PROJ.PM", r"""Let $A=\begin{pmatrix}1&0\\1&1\\1&2\end{pmatrix}$ and $b=(1,3,2)^T$. If $p$ is the orthogonal projection of $b$ onto the column space of $A$, then $\|b-p\|^2$ equals""",
    "3/2", ["1/2", "3", "7/2"],
    r"""Normal equations: $A^TA=\begin{pmatrix}3&3\\3&5\end{pmatrix}$, $A^Tb=(6,7)^T$, giving $\hat x=(3/2,1/2)$. Then $p=(3/2,2,5/2)$, residual $=(-\tfrac12,1,-\tfrac12)$, which is orthogonal to both columns. $\|b-p\|^2=\frac14+1+\frac14=\frac32$.""", "M", "recomputed-by-code", 2)
d2 = 1
for l in (1, 2, 4):
    d2 *= l * l + 1
assert d2 == 170 and (1 + 1) * (2 + 1) * (4 + 1) == 30
scq("mockd_la_05", "LA.EIG.EV", r"""$A$ is a real symmetric $3\times3$ matrix with eigenvalues $1$, $2$ and $4$. Then $\det(A^2+I)$ equals""", "170", ["30", "85", "340"],
    r"""$A^2+I$ has eigenvalues $\lambda^2+1=2,5,17$ (same eigenvectors), so $\det=2\cdot5\cdot17=170$. The value 30 would be $\det(A+I)$.""", "M", "recomputed-by-code", 2)
B = [[2, 6], [1, 3]]
mmB = lambda X, Y: [[sum(X[i][k_] * Y[k_][j] for k_ in range(2)) for j in range(2)] for i in range(2)]
assert mmB(B, B) == [[5 * x for x in r] for r in B] and det(B) == 0 and rank(B) == 1 and rank(mmB(B, B)) == 1 and 2 + 3 == 5
msq("mockd_la_06", "LA.MAT.PROP", r"""Let $B=\begin{pmatrix}2&6\\1&3\end{pmatrix}$. Which of the following statements is/are TRUE?""",
    [(r"$B^2=5B$", True), (r"The eigenvalues of $B$ are $0$ and $5$", True), (r"$B$ is invertible", False), (r"$\mathrm{rank}(B^2)=2$", False)],
    r"""$\mathrm{tr}B=5$, $\det B=0$, so eigenvalues are $0,5$ and $B$ is singular. $B^2=\begin{pmatrix}10&30\\5&15\end{pmatrix}=5B$, which has rank 1.""", "M", "recomputed-by-code", 2)
AS = [[2, 1, 3], [4, -1, 1], [1, 2, -2]]
bS = [7, 5, 1]
dS = det(AS)
def cram(i):
    M = [r[:] for r in AS]
    for r_ in range(3):
        M[r_][i] = bS[r_]
    return F(det(M), dS)
xs3 = [cram(i) for i in range(3)]
assert all(sum(AS[r_][c] * xs3[c] for c in range(3)) == bS[r_] for r_ in range(3))
# Gauss-Jordan independent
Mg = [[F(v) for v in AS[i]] + [F(bS[i])] for i in range(3)]
for c in range(3):
    pv = next(r_ for r_ in range(c, 3) if Mg[r_][c] != 0)
    Mg[c], Mg[pv] = Mg[pv], Mg[c]
    Mg[c] = [v / Mg[c][c] for v in Mg[c]]
    for r_ in range(3):
        if r_ != c:
            Mg[r_] = [a - Mg[r_][c] * b for a, b in zip(Mg[r_], Mg[c])]
assert [Mg[i][3] for i in range(3)] == xs3
tgt = xs3[0] + 2 * xs3[1] - xs3[2]
nat("mockd_la_07", "LA.SYS.GAUSS", r"""Consider the system $2x_1+x_2+3x_3=7$, $4x_1-x_2+x_3=5$, $x_1+2x_2-2x_3=1$. The value of $x_1+2x_2-x_3$ is ______. (Round off to two decimal places)""",
    float(tgt), rf"""$\det A={dS}$. Gaussian elimination (or Cramer's rule) gives $x_1={xs3[0]}$, $x_2={xs3[1]}$, $x_3={xs3[2]}$, so $x_1+2x_2-x_3={tgt}\approx{float(tgt):.2f}$.""", tol=0.005, dec=3, diff="H", marks=2)
# SVD: sigma_1 of [[3,0],[4,5]]
Asv = [[3, 0], [4, 5]]
AtAs = [[sum(Asv[k_][i] * Asv[k_][j] for k_ in range(2)) for j in range(2)] for i in range(2)]
assert AtAs == [[25, 20], [20, 25]]
lam1 = (25 + 25) / 2 + sqrt(((25 - 25) / 2) ** 2 + 20 ** 2)
assert lam1 == 45
vec = [1.0, 0.3]  # power iteration cross-check
for _ in range(200):
    w2 = [AtAs[0][0] * vec[0] + AtAs[0][1] * vec[1], AtAs[1][0] * vec[0] + AtAs[1][1] * vec[1]]
    nm = sqrt(w2[0] ** 2 + w2[1] ** 2)
    vec = [w2[0] / nm, w2[1] / nm]
assert abs(nm - 45) < 1e-9
sig = sqrt(45)
nat("mockd_la_08", "LA.DEC.SVD", r"""The largest singular value of $\begin{pmatrix}3&0\\4&5\end{pmatrix}$ is ______. (Round off to two decimal places)""",
    sig, r"""$A^TA=\begin{pmatrix}25&20\\20&25\end{pmatrix}$ with eigenvalues $25\pm20=45,5$. So $\sigma_1=\sqrt{45}=6.708\approx6.71$.""", tol=0.01, dec=3, diff="M", marks=2)

# =========================================================================================== CO (4)
from math import expm1
xx = 1e-3
assert abs(((expm1(3 * xx) - 3 * xx) / xx ** 2) - 4.5) < 0.01
scq("mockd_co_01", "CO.LIM.LIM", r"""$\displaystyle\lim_{x\to0}\frac{e^{3x}-1-3x}{x^2}$ equals""", "9/2", ["3", "0", "9"],
    r"""Using $e^{3x}=1+3x+\frac{9x^2}{2}+\cdots$, the numerator is $\frac92x^2+o(x^2)$, so the limit is $\frac92$.""", "M", "recomputed-by-code", 1)
fm = lambda x: x ** 3 - 6 * x ** 2 + 9 * x + 2
grid = [i / 1000 for i in range(0, 5001)]
mx = max(fm(x) for x in grid)
assert mx == fm(5) == 22 and fm(1) == 6 and fm(3) == 2
nat("mockd_co_02", "CO.OPT.MM", r"""The maximum value of $f(x)=x^3-6x^2+9x+2$ on the closed interval $[0,5]$ is ______.""", 22,
    r"""$f'(x)=3(x-1)(x-3)$: critical points $x=1$ ($f=6$) and $x=3$ ($f=2$). Endpoints: $f(0)=2$, $f(5)=125-150+45+2=22$. The maximum is 22.""", diff="E", marks=1)
x_, y_ = 2.0, 1.0
fv = []
for _ in range(2):
    x_, y_ = x_ - 0.1 * 2 * x_, y_ - 0.1 * 6 * y_
    fv.append(x_ ** 2 + 3 * y_ ** 2)
assert (round(x_, 6), round(y_, 6)) == (1.28, 0.16) and round(fv[0], 4) == 3.04 and round(fv[1], 4) == 1.7152
scq("mockd_co_03", "CO.OPT.OPT", r"""Gradient descent with step size $0.1$ is applied to $f(x,y)=x^2+3y^2$ starting at $(2,1)$. After exactly two iterations, the value of $f$ is""", "1.7152", ["3.0400", "1.6384", "0.5120"],
    r"""$\nabla f=(2x,6y)$. Step 1: $(2-0.4,\,1-0.6)=(1.6,0.4)$ with $f=3.04$. Step 2: $(1.6-0.32,\,0.4-0.24)=(1.28,0.16)$, $f=1.6384+3(0.0256)=1.7152$.""", "M", "recomputed-by-code", 2)
best = max(x * (9 - x) ** 2 for x in [i / 1000 for i in range(0, 9001)])
assert abs(best - 108) < 1e-3
nat("mockd_co_04", "CO.OPT.OPT", r"""The maximum value of $x\,y^2$ subject to $x+y=9$, $x\ge0$, $y\ge0$ is ______.""", 108,
    r"""Substitute $x=9-y$: $g(y)=(9-y)y^2$, $g'(y)=18y-3y^2=3y(6-y)$, so $y=6$, $x=3$ and the maximum is $3\cdot36=108$ (the endpoints give 0).""", diff="M", marks=2)

# =========================================================================================== PDS (8)
def cnt_iter(n):
    c, i = 0, 1
    while i < n:
        c += i
        i *= 2
    return c


for e_ in range(4, 16):
    assert cnt_iter(2 ** e_) == 2 ** e_ - 1  # Theta(n)
scq("mockd_pds_01", "PDS.ALG.CPX", """The time complexity (in terms of the number of calls to `work()`) of the following code, for an integer $n\\ge1$, is

```c
for (i = 1; i < n; i = i * 2)
    for (j = 0; j < i; j++)
        work();
```""", r"$\Theta(n)$", [r"$\Theta(n\log n)$", r"$\Theta(n^2)$", r"$\Theta(\log n)$"],
    r"""The inner loop runs $i=1,2,4,\dots$ times, a geometric series with total $1+2+\cdots+2^{\lceil\log_2 n\rceil-1}<2n$ and $\ge n-1$. So the total is $\Theta(n)$, not $\Theta(n\log n)$.""", "M", "recomputed-by-code", 1)


def postfix(tokens):
    st = []
    for t in tokens.split():
        if t in "+-*/":
            b, a = st.pop(), st.pop()
            st.append({"+": a + b, "-": a - b, "*": a * b, "/": a // b}[t])
        else:
            st.append(int(t))
    return st[0]


assert postfix("9 3 / 4 2 * + 5 -") == 6 == (9 // 3) + (4 * 2) - 5
scq("mockd_pds_02", "PDS.DS.STK", r"""The postfix expression `9 3 / 4 2 * + 5 -` is evaluated using a stack (integer operations). The value left on the stack is""", "6", ["-2", "14", "0"],
    r"""Push 9, 3; `/` gives 3. Push 4, 2; `*` gives 8. `+` gives 11. Push 5; `-` gives 6.""", "E", "recomputed-by-code", 1)


class N:
    def __init__(s, k):
        s.k, s.l, s.r = k, None, None


def ins(root, k_):
    if root is None:
        return N(k_)
    if k_ < root.k:
        root.l = ins(root.l, k_)
    else:
        root.r = ins(root.r, k_)
    return root


rt = None
for key_ in (40, 25, 60, 10, 30, 50, 70, 28, 35):
    rt = ins(rt, key_)
pre, ino, post_ = [], [], []
def walk(n_):
    if n_:
        pre.append(n_.k); walk(n_.l); ino.append(n_.k); walk(n_.r); post_.append(n_.k)
walk(rt)
def hgt(n_):
    return -1 if n_ is None else 1 + max(hgt(n_.l), hgt(n_.r))
def leaves(n_):
    return 0 if n_ is None else (1 if not n_.l and not n_.r else leaves(n_.l) + leaves(n_.r))
assert pre == [40, 25, 10, 30, 28, 35, 60, 50, 70] and ino == sorted(ino) and hgt(rt) == 3 and leaves(rt) == 5
assert ino[ino.index(40) - 1] == 35
msq("mockd_pds_03", "PDS.DS.TREE", r"""The keys 40, 25, 60, 10, 30, 50, 70, 28, 35 are inserted in this order into an initially empty binary search tree. Which of the following statements is/are TRUE?""",
    [("The height of the tree (number of edges on the longest root-to-leaf path) is 3", True),
     ("The preorder traversal begins 40, 25, 10, 30, 28", True),
     ("The tree has exactly 4 leaves", False),
     ("The inorder predecessor of 40 is 30", False)],
    r"""The tree: 40 has children 25, 60; 25 has 10, 30; 30 has 28 (left), 35 (right); 60 has 50, 70. Height 3 (40-25-30-28). Preorder: 40, 25, 10, 30, 28, 35, 60, 50, 70. Leaves: 10, 28, 35, 50, 70 (five). Inorder: 10, 25, 28, 30, 35, 40, ... so the predecessor of 40 is 35.""", "M", "recomputed-by-code", 1)
tbl = [None] * 11
coll = 0
for key_ in (12, 23, 5, 34, 16, 27, 38):
    h = key_ % 11
    while tbl[h] is not None:
        coll += 1
        h = (h + 1) % 11
    tbl[h] = key_
assert coll == 9 and tbl[8] == 38 and tbl[1:3] == [12, 23]
nat("mockd_pds_04", "PDS.DS.HASH", r"""An open-addressing hash table of size 11 uses $h(k)=k \bmod 11$ with linear probing (step +1, wrapping around). The keys 12, 23, 5, 34, 16, 27, 38 are inserted in this order. The total number of times an insertion probes a slot that is already occupied is ______.""",
    9, r"""Home slots: 12 to 1, 23 to 1, 5 to 5, 34 to 1, 16 to 5, 27 to 5, 38 to 5. Occupied probes: 12:0; 23:1 (slot 1); 5:0; 34:2 (slots 1,2); 16:1 (slot 5); 27:2 (slots 5,6); 38:3 (slots 5,6,7). Total $0+1+0+2+1+2+3=9$.""", diff="M", marks=1)

calls = [0]
def g(n):
    calls[0] += 1
    if n <= 1:
        return 1
    return g(n - 1) + g(n // 2)
g(8)
cc = {1: 1}
for n in range(2, 9):
    cc[n] = 1 + cc[n - 1] + cc[n // 2]
assert calls[0] == cc[8] == 35
scq("mockd_pds_05", "PDS.ALG.DC", """The following function is called as `g(8)`. How many calls to `g` are made in total, including the initial call?

```python
def g(n):
    if n <= 1:
        return 1
    return g(n - 1) + g(n // 2)
```""", "35", ["29", "25", "18"],
    r"""Let $c(n)$ be the number of calls: $c(1)=1$ and $c(n)=1+c(n-1)+c(\lfloor n/2\rfloor)$. $c(2)=3$, $c(3)=5$, $c(4)=9$, $c(5)=13$, $c(6)=19$, $c(7)=25$, $c(8)=1+25+9=35$. (The return value $g(8)=18$ is a different quantity.)""", "H", "recomputed-by-code", 2)

import heapq
GE = [("S", "A", 4), ("S", "B", 1), ("B", "A", 2), ("A", "C", 5), ("B", "C", 8), ("C", "D", 3), ("B", "D", 10), ("D", "E", 2), ("C", "E", 6)]
adj_ = {}
for a_, b_, w_ in GE:
    adj_.setdefault(a_, []).append((b_, w_))
    adj_.setdefault(b_, []).append((a_, w_))
dist = {"S": 0}
order = []
pq = [(0, "S")]
done = set()
while pq:
    d_, u_ = heapq.heappop(pq)
    if u_ in done:
        continue
    done.add(u_)
    order.append(u_)
    for v_, w_ in adj_[u_]:
        if d_ + w_ < dist.get(v_, 1e9):
            dist[v_] = d_ + w_
            heapq.heappush(pq, (d_ + w_, v_))
# independent: enumerate all simple paths
def simple_paths(u_, t_, seen):
    if u_ == t_:
        yield 0
        return
    for v_, w_ in adj_[u_]:
        if v_ not in seen:
            for rest in simple_paths(v_, t_, seen | {v_}):
                yield w_ + rest
allp = {t_: sorted(simple_paths("S", t_, {"S"})) for t_ in "ABCDE"}
assert all(allp[t_][0] == dist[t_] for t_ in "ABCDE")
npaths = {t_: allp[t_].count(dist[t_]) for t_ in "ABCDE"}
assert dist == {"S": 0, "B": 1, "A": 3, "C": 8, "D": 11, "E": 13} and npaths["D"] == 2 and order == list("SBACDE")
msq("mockd_pds_06", "PDS.GRAPH.SP", r"""Dijkstra's algorithm is run from vertex S on the undirected weighted graph with edges (weights in brackets): S-A (4), S-B (1), B-A (2), A-C (5), B-C (8), C-D (3), B-D (10), D-E (2), C-E (6). Which of the following statements is/are TRUE?""",
    [("The shortest distance from S to C is 8", True), ("The shortest distance from S to E is 14", False),
     ("There are exactly two different shortest paths from S to D", True), ("D is extracted from the priority queue before C", False)],
    r"""Distances: B=1, A=3 (via B), C=8 (via A), D=11 (via C: 8+3, or directly via B: 1+10: two shortest paths), E=13 (D+2, versus C+6=14). Extraction order S, B, A, C, D, E, so C comes before D.""", "M", "recomputed-by-code", 2)
arr = [7, 3, 9, 1, 8, 2, 6, 4, 5, 0]
inv_b = sum(1 for i in range(10) for j in range(i + 1, 10) if arr[i] > arr[j])
def msort(a):
    if len(a) <= 1:
        return a, 0
    m_ = len(a) // 2
    l_, x1 = msort(a[:m_]); r_, x2 = msort(a[m_:])
    out_, i, j, c = [], 0, 0, x1 + x2
    while i < len(l_) and j < len(r_):
        if l_[i] <= r_[j]:
            out_.append(l_[i]); i += 1
        else:
            out_.append(r_[j]); j += 1; c += len(l_) - i
    return out_ + l_[i:] + r_[j:], c
INV = inv_b
assert msort(arr)[1] == INV
nat("mockd_pds_07", "PDS.ALG.SORT", r"""The array $[7, 3, 9, 1, 8, 2, 6, 4, 5, 0]$ is to be sorted in ascending order. The number of inversions (pairs $i<j$ with $a_i>a_j$) in the array is ______. (This equals the number of swaps performed by bubble sort.)""",
    INV, rf"""For each element count the later elements that are smaller: {[sum(1 for j in range(i+1,10) if arr[i]>arr[j]) for i in range(10)]}; the sum is {INV}.""", diff="M", marks=2)
EDG = [(1, 2, 9), (1, 3, 4), (2, 3, 6), (2, 4, 3), (3, 4, 7), (3, 5, 8), (4, 5, 5), (4, 6, 10), (5, 6, 2), (5, 7, 11), (6, 7, 1), (2, 7, 12)]
par = list(range(8))
def fnd(x):
    while par[x] != x:
        par[x] = par[par[x]]; x = par[x]
    return x
kr = 0
used = []
for a_, b_, w_ in sorted(EDG, key=lambda e: e[2]):
    if fnd(a_) != fnd(b_):
        par[fnd(a_)] = fnd(b_); kr += w_; used.append((a_, b_, w_))
# Prim
inT, pr = {1}, 0
while len(inT) < 7:
    e_ = min((w_, a_, b_) for a_, b_, w_ in EDG if (a_ in inT) != (b_ in inT))
    pr += e_[0]; inT |= {e_[1], e_[2]}
# brute force over all 6-edge subsets
best_ = 10 ** 9
for sub in itertools.combinations(EDG, 6):
    pp = list(range(8))
    def ff(x):
        while pp[x] != x:
            x = pp[x]
        return x
    ok = True
    for a_, b_, w_ in sub:
        if ff(a_) == ff(b_):
            ok = False; break
        pp[ff(a_)] = ff(b_)
    if ok:
        best_ = min(best_, sum(e[2] for e in sub))
assert kr == pr == best_ == 21
nat("mockd_pds_08", "PDS.GRAPH.BASIC", r"""A connected undirected graph on vertices 1 to 7 has the weighted edges (u, v, w): (1,2,9), (1,3,4), (2,3,6), (2,4,3), (3,4,7), (3,5,8), (4,5,5), (4,6,10), (5,6,2), (5,7,11), (6,7,1), (2,7,12). The weight of a minimum spanning tree is ______.""",
    kr, rf"""Kruskal on sorted weights: 1 (6-7) take, 2 (5-6) take, 3 (2-4) take, 4 (1-3) take, 5 (4-5) take, 6 (2-3): connects {{1,3}} with {{2,4,5,6,7}} take. Six edges chosen: $1+2+3+4+5+6={kr}$. (Prim from vertex 1 gives the same weight.)""", diff="M", marks=2)

# =========================================================================================== DBW (6)
Rr = {(1, "a"), (2, "b"), (3, "a"), (4, "c")}
Ss = {("a", "x"), ("a", "y"), ("b", "z"), ("d", "w")}
jn = {(a_, b_, c_) for a_, b_ in Rr for b2, c_ in Ss if b_ == b2}
assert len(jn) == 5
con = sqlite3.connect(":memory:")
con.executescript("create table R(A,B); create table S(B,C);")
con.executemany("insert into R values (?,?)", sorted(Rr))
con.executemany("insert into S values (?,?)", sorted(Ss))
assert con.execute("select count(*) from R natural join S").fetchone()[0] == 5
scq("mockd_dbw_01", "DBW.REL.ALGB", r"""Relation $R(A,B)=\{(1,a),(2,b),(3,a),(4,c)\}$ and $S(B,C)=\{(a,x),(a,y),(b,z),(d,w)\}$. The number of tuples in the natural join $R\bowtie S$ is""", "5", ["4", "6", "16"],
    r"""Join on $B$: value $a$ appears in 2 tuples of $R$ and 2 of $S$ giving 4 tuples; value $b$ gives $1\times1=1$; $c$ and $d$ have no match. Total 5.""", "E", "recomputed-by-code", 1)


def closure(X, fds):
    X = set(X)
    ch = True
    while ch:
        ch = False
        for l_, r_ in fds:
            if set(l_) <= X and not set(r_) <= X:
                X |= set(r_)
                ch = True
    return X


def keys_of(attrs, fds):
    ks = []
    for n in range(1, len(attrs) + 1):
        for c_ in itertools.combinations(attrs, n):
            if closure(c_, fds) >= set(attrs) and not any(set(k_) <= set(c_) for k_ in ks):
                ks.append(c_)
    return ks


ATT = "ABCDE"
FD1 = [("A", "B"), ("B", "C"), ("CD", "E")]
K1 = keys_of(ATT, FD1)
prime = {a_ for k_ in K1 for a_ in k_}
assert K1 == [("A", "D")]
partial = any(set(l_) < set(k_) and set(r_) - prime for l_, r_ in FD1 for k_ in K1)
assert partial  # A->B: non-prime B depends on proper subset of key AD
scq("mockd_dbw_02", "DBW.NF.NF", r"""Relation $R(A,B,C,D,E)$ has the functional dependencies $A\to B$, $B\to C$ and $CD\to E$. The highest normal form that $R$ satisfies is""",
    "1NF", ["2NF", "3NF", "BCNF"],
    r"""$\{A,D\}^+=\{A,B,C,D,E\}$ and no proper subset is a key, so the only candidate key is $AD$. $A\to B$ makes the non-prime attribute $B$ depend on a proper part of the key (a partial dependency), so $R$ is not in 2NF. It is in 1NF only.""", "M", "recomputed-by-code", 1)
con.executescript("""create table Emp(id,dept,sal);
insert into Emp values (1,'A',50),(2,'A',70),(3,'A',NULL),(4,'B',40),(5,'B',40),(6,'B',90),(7,'C',60),(8,'C',NULL),(9,'D',55);""")
q_sql = "SELECT COUNT(*) FROM Emp e WHERE sal > (SELECT AVG(sal) FROM Emp WHERE dept = e.dept)"
sql_ans = con.execute(q_sql).fetchone()[0]
emp = [(1, "A", 50), (2, "A", 70), (3, "A", None), (4, "B", 40), (5, "B", 40), (6, "B", 90), (7, "C", 60), (8, "C", None), (9, "D", 55)]
py_ans = 0
for i_, d_, s_ in emp:
    vals = [x for _, dd2, x in emp if dd2 == d_ and x is not None]
    if s_ is not None and s_ > sum(vals) / len(vals):
        py_ans += 1
assert sql_ans == py_ans == 2
scq("mockd_dbw_03", "DBW.REL.SQL", """The table `Emp(id, dept, sal)` holds the rows (id, dept, sal): (1,A,50), (2,A,70), (3,A,NULL), (4,B,40), (5,B,40), (6,B,90), (7,C,60), (8,C,NULL), (9,D,55). What does the following query return?

```sql
SELECT COUNT(*) FROM Emp e
WHERE sal > (SELECT AVG(sal) FROM Emp WHERE dept = e.dept);
```""", "2", ["3", "4", "1"],
    r"""`AVG` ignores NULLs: dept A average $=60$, B $=56.67$, C $=60$, D $=55$. Rows with `sal` above their department average: id 2 (70>60) and id 6 (90>56.67). Row 7 (60) equals the average of C, id 9 (55) equals D's, so they fail; rows with NULL salary give an unknown comparison and are not counted. The count is 2.""", "H", "recomputed-by-code", 2)
FD2 = [("AB", "C"), ("C", "D"), ("D", "A")]
A4 = "ABCD"
K2 = keys_of(A4, FD2)
assert sorted(K2) == [("A", "B"), ("B", "C"), ("B", "D")]
prime2 = {a_ for k_ in K2 for a_ in k_}
is3nf = all(set(l_) >= set(A4) or set(closure(l_, FD2)) >= set(A4) or set(r_) <= prime2 for l_, r_ in FD2)
isbcnf = all(closure(l_, FD2) >= set(A4) for l_, r_ in FD2)
assert is3nf and not isbcnf
R1, R2 = set("CD"), set("ABC")
assert closure(R1 & R2, FD2) >= R1  # lossless
def preserved(fds, parts):
    for l_, r_ in fds:
        res = set(l_)
        ch = True
        while ch:
            ch = False
            for p_ in parts:
                add = closure(res & p_, fds) & p_
                if not add <= res:
                    res |= add; ch = True
        if not set(r_) <= res:
            return False
    return True
assert not preserved(FD2, [R1, R2])
msq("mockd_dbw_04", "DBW.NF.NF", r"""$R(A,B,C,D)$ satisfies $AB\to C$, $C\to D$ and $D\to A$. Which of the following statements is/are TRUE?""",
    [("$R$ has exactly three candidate keys", True), ("$R$ is in BCNF", False),
     (r"The decomposition $R_1(C,D)$, $R_2(A,B,C)$ is a lossless-join decomposition", True),
     (r"The decomposition $R_1(C,D)$, $R_2(A,B,C)$ preserves all the functional dependencies", False)],
    r"""Closures: $AB^+=BC^+=BD^+=ABCD$ and none of $A,B,C,D$ alone is a key, so the keys are $AB$, $BC$, $BD$. Every attribute is prime so $R$ is in 3NF, but $C\to D$ has a non-key determinant, so it is not in BCNF. $R_1\cap R_2=\{C\}$ and $C^+\supseteq R_1$, so the join is lossless. $D\to A$ cannot be checked within $R_1$ or $R_2$: starting from $D$ the closure computed inside the fragments never reaches $A$, so the dependency is lost.""", "H", "recomputed-by-code", 2)
dat = [12, 15, 18, 21, 24, 27, 30, 45]
mu = sum(dat) / 8
sg = sqrt(sum((x - mu) ** 2 for x in dat) / 8)
zz = (45 - mu) / sg
import statistics
assert abs(sg - statistics.pstdev(dat)) < 1e-12 and mu == 24 and zz > 2
nat("mockd_dbw_05", "DBW.XFM.NORM", r"""During preprocessing the attribute values $12, 15, 18, 21, 24, 27, 30, 45$ are z-score normalised using the mean and the POPULATION standard deviation of these eight values. The normalised value of 45 is ______. (Round off to two decimal places)""",
    zz, rf"""Mean $=24$. Squared deviations: $144+81+36+9+0+9+36+441=756$, variance $=94.5$, $\sigma={sg:.4f}$. $z=(45-24)/{sg:.4f}={zz:.3f}\approx{zz:.2f}$.""", tol=0.01, dec=3, diff="M", marks=2)
levels = {"Time (day < month < quarter < year)": 4, "Location (city < state < country)": 3, "Product (item < brand)": 2, "Supplier (no hierarchy)": 1}
ncub = 1
for L_ in levels.values():
    ncub *= L_ + 1
brute = len(list(itertools.product(*[range(L_ + 1) for L_ in levels.values()])))
assert ncub == brute == 120
nat("mockd_dbw_06", "DBW.DW.HIER", """A data warehouse has four dimensions: Time with the hierarchy day < month < quarter < year (4 levels), Location with city < state < country (3 levels), Product with item < brand (2 levels) and Supplier with a single level and no hierarchy. Counting the virtual level "all" of each dimension, the total number of cuboids in the full data cube lattice (including the apex and the base cuboid) is ______.""",
    120, r"""Each dimension with $L$ levels contributes $L+1$ choices (its $L$ levels or 'all'). Total $=(4+1)(3+1)(2+1)(1+1)=5\cdot4\cdot3\cdot2=120$.""", diff="M", marks=2)

# =========================================================================================== ML (11)
xr, yr = [1, 2, 3, 4, 5], [3, 5, 6, 9, 12]
mxr, myr = sum(xr) / 5, sum(yr) / 5
slope = sum((a_ - mxr) * (b_ - myr) for a_, b_ in zip(xr, yr)) / sum((a_ - mxr) ** 2 for a_ in xr)
icp = myr - slope * mxr
assert (mxr, myr, round(slope, 9), round(icp, 9)) == (3, 7, 2.2, 0.4) and round(slope * 6 + icp, 9) == 13.6
# independent: normal equations
n_ = 5
sx, sy, sxy_, sxx_ = sum(xr), sum(yr), sum(a_ * b_ for a_, b_ in zip(xr, yr)), sum(a_ * a_ for a_ in xr)
assert abs((n_ * sxy_ - sx * sy) / (n_ * sxx_ - sx * sx) - 2.2) < 1e-12
scq("mockd_ml_01", "ML.REG.SLR", r"""A simple linear regression $\hat y=\beta_0+\beta_1x$ is fitted by least squares to the points $(1,3),(2,5),(3,6),(4,9),(5,12)$. The predicted value at $x=6$ is""", "13.6", ["13.2", "12.0", "14.4"],
    r"""$\bar x=3$, $\bar y=7$, $S_{xy}=22$, $S_{xx}=10$, so $\beta_1=2.2$, $\beta_0=7-2.2\cdot3=0.4$. Prediction $=0.4+2.2\cdot6=13.6$ (13.2 would ignore the intercept).""", "E", "recomputed-by-code", 1)
tr_ = [((1, 1), "A"), ((2, 3), "A"), ((4, 2), "B"), ((5, 5), "B"), ((6, 1), "B"), ((3, 4), "A")]
qq = (4, 3)
dl = sorted((((p[0] - qq[0]) ** 2 + (p[1] - qq[1]) ** 2), l_) for p, l_ in tr_)
from collections import Counter as Ctr
pred1 = dl[0][1]
pred3 = Ctr(l_ for _, l_ in dl[:3]).most_common(1)[0][0]
assert (pred1, pred3) == ("B", "A") and [d for d, _ in dl[:3]] == [1, 2, 4]
scq("mockd_ml_02", "ML.CLS.KNN", r"""Training points $(x_1,x_2)$ with labels: $(1,1)$:A, $(2,3)$:A, $(4,2)$:B, $(5,5)$:B, $(6,1)$:B, $(3,4)$:A. Using Euclidean distance, the predicted classes for the query point $(4,3)$ by 1-NN and 3-NN (majority vote), respectively, are""",
    "B and A", ["A and B", "A and A", "B and B"],
    r"""Squared distances from $(4,3)$: $(4,2)$:1 (B), $(3,4)$:2 (A), $(2,3)$:4 (A), $(5,5)$:5 (B), $(6,1)$:8, $(1,1)$:13. The nearest neighbour is B; the three nearest are B, A, A, so the vote is A.""", "M", "recomputed-by-code", 1)
TP, FP, FN = 40, 10, 20
Pr, Rc = F(TP, TP + FP), F(TP, TP + FN)
F1 = 2 * Pr * Rc / (Pr + Rc)
assert F1 == F(8, 11) == F(2 * TP, 2 * TP + FP + FN) and round(float(F1), 3) == 0.727
scq("mockd_ml_03", "ML.EVAL", r"""A binary classifier produces $TP=40$, $FP=10$, $FN=20$ (and some true negatives). Its F1-score is approximately""", "0.727", ["0.733", "0.800", "0.667"],
    r"""Precision $=40/50=0.8$, recall $=40/60=0.667$. $F_1=\frac{2TP}{2TP+FP+FN}=\frac{80}{110}=0.727$. (0.733 is the arithmetic mean of precision and recall.)""", "E", "recomputed-by-code", 1)
msq("mockd_ml_04", "ML.CLS.LOG", r"""Which of the following statements is/are TRUE?""",
    [("The decision boundary of logistic regression with raw features is a hyperplane in the feature space", True),
     ("The cross-entropy loss of logistic regression is a convex function of the weights", True),
     ("In a hard-margin SVM, deleting a training point that is not a support vector can change the learned hyperplane", False),
     ("For linearly separable data, unregularised logistic regression always has a finite weight vector minimising the loss", False)],
    r"""$P(y=1|x)=\sigma(w^Tx+b)=\tfrac12$ exactly on $w^Tx+b=0$, a hyperplane; the negative log-likelihood is convex. The hard-margin hyperplane is fixed by the support vectors alone. On separable data the loss can be pushed towards 0 by scaling $w$ without limit, so no finite minimiser exists.""", "M", "second-derivation", 1)
msq("mockd_ml_05", "ML.CLU.KM", r"""Which of the following statements is/are TRUE?""",
    [("Across the iterations of Lloyd's k-means algorithm, the sum of squared distances to the assigned centroids never increases", True),
     ("k-means is guaranteed to reach the global minimum of its objective for any initialisation", False),
     ("Single-linkage agglomerative clustering can merge two clusters through a chain of intermediate points (the chaining effect)", True),
     ("A dendrogram can be built only if the number of clusters is specified in advance", False)],
    r"""Both the assignment and the update steps do not increase the SSE, but the final point is only a local minimum. Single linkage merges by the minimum pairwise distance, so a chain of points can join distinct groups. The number of clusters is chosen afterwards by cutting the dendrogram.""", "M", "second-derivation", 1)
prm = (10 * 8 + 8) + (8 * 6 + 6) + (6 * 2 + 2)
assert prm == 88 + 54 + 14 == 156
nat("mockd_ml_06", "ML.NN.MLP", r"""A fully connected feed-forward network has layer sizes 10 (input), 8, 6 (hidden) and 2 (output), with a bias term in every non-input unit. The total number of trainable parameters is ______.""", 156,
    r"""Layer 1: $10\cdot8+8=88$; layer 2: $8\cdot6+6=54$; layer 3: $6\cdot2+2=14$. Total $=156$.""", diff="E", marks=1)
yes = [("sunny", "F"), ("rain", "F"), ("rain", "T"), ("overcast", "F"), ("sunny", "F")]
no = [("sunny", "T"), ("sunny", "T"), ("rain", "T"), ("overcast", "T"), ("sunny", "F")]
py_, pn_ = F(5, 10), F(5, 10)
ly = F(sum(1 for o, w_ in yes if o == "sunny"), 5) * F(sum(1 for o, w_ in yes if w_ == "T"), 5)
ln = F(sum(1 for o, w_ in no if o == "sunny"), 5) * F(sum(1 for o, w_ in no if w_ == "T"), 5)
pst = py_ * ly / (py_ * ly + pn_ * ln)
assert (ly, ln, pst) == (F(2, 25), F(12, 25), F(1, 7))
scq("mockd_ml_07", "ML.CLS.NB", """A naive Bayes classifier (no smoothing) is trained on ten days with attributes (outlook, windy) and class "play".

| Play = yes | outlook | windy |
|---|---|---|
| 5 days | sunny, rain, rain, overcast, sunny | F, F, T, F, F |

| Play = no | outlook | windy |
|---|---|---|
| 5 days | sunny, sunny, rain, overcast, sunny | T, T, T, T, F |

(The k-th outlook value in a row goes with the k-th windy value.) For a new day (sunny, windy = T), the posterior probability $P(\\text{yes}\\mid\\text{sunny},T)$ is""",
    "1/7", ["2/7", "1/5", "1/3"],
    r"""Priors are $\frac12$ each. Yes: $P(\text{sunny}|y)=\frac25$, $P(T|y)=\frac15$, product $\frac2{25}$. No: $P(\text{sunny}|n)=\frac35$, $P(T|n)=\frac45$, product $\frac{12}{25}$. Posterior $=\frac{2/25}{2/25+12/25}=\frac17$.""", "M", "recomputed-by-code", 2)
PP = [(1, 3), (2, 1), (3, 5), (4, 2), (5, 4)]
npp = 5
mxp = sum(p[0] for p in PP) / npp
myp = sum(p[1] for p in PP) / npp
cx = sum((p[0] - mxp) ** 2 for p in PP) / (npp - 1)
cy = sum((p[1] - myp) ** 2 for p in PP) / (npp - 1)
cxy = sum((p[0] - mxp) * (p[1] - myp) for p in PP) / (npp - 1)
l1p = (cx + cy) / 2 + sqrt(((cx - cy) / 2) ** 2 + cxy ** 2)
fr = l1p / (cx + cy)
# independent: power iteration
vv = [1.0, 0.5]
for _ in range(500):
    u_ = [cx * vv[0] + cxy * vv[1], cxy * vv[0] + cy * vv[1]]
    lam_ = sqrt(u_[0] ** 2 + u_[1] ** 2)
    vv = [u_[0] / lam_, u_[1] / lam_]
assert abs(lam_ - l1p) < 1e-9 and (cx, cy, cxy) == (2.5, 2.5, 0.75) and abs(fr - 0.65) < 1e-12
scq("mockd_ml_08", "ML.DR.PCA", r"""PCA is applied to the five 2-D points $(1,3),(2,1),(3,5),(4,2),(5,4)$ (mean-centred, sample covariance with divisor $n-1$). The fraction of the total variance captured by the first principal component is""", "0.65", ["0.50", "0.75", "0.85"],
    r"""$\mathrm{Var}(x)=\mathrm{Var}(y)=2.5$, $\mathrm{Cov}(x,y)=0.75$. Eigenvalues: $2.5\pm0.75=3.25,1.75$. Fraction $=3.25/5=0.65$.""", "M", "recomputed-by-code", 2)
H2 = lambda p: 0 if p in (0, 1) else -(p * log2(p) + (1 - p) * log2(1 - p))
ig = H2(0.6) - 0.5 * H2(0.8) - 0.5 * H2(0.4)
ent = lambda c: -sum(x / sum(c) * log2(x / sum(c)) for x in c if x)
ig2 = ent([6, 4]) - 5 / 10 * ent([4, 1]) - 5 / 10 * ent([2, 3])
assert abs(ig - ig2) < 1e-12 and round(ig, 3) == 0.125 and round(H2(0.6), 3) == 0.971
scq("mockd_ml_09", "ML.CLS.DT", r"""A node of a decision tree holds 10 samples (6 positive, 4 negative). A binary test sends 5 samples to the left branch (4 positive, 1 negative) and 5 to the right branch (2 positive, 3 negative). The information gain (entropy, log base 2) of this split is approximately""", "0.125", ["0.971", "0.250", "0.0"],
    r"""$H(\text{parent})=H(0.6)=0.971$. $H(\text{left})=H(0.8)=0.722$, $H(\text{right})=H(0.4)=0.971$. Weighted child entropy $=\frac12(0.722+0.971)=0.846$. Gain $=0.971-0.846=0.125$.""", "M", "recomputed-by-code", 2)
xs_, ys_ = [1, 2, 3], [2, 3, 5]
sxx2, sxy2 = sum(x * x for x in xs_), sum(x * y for x, y in zip(xs_, ys_))
w_ols, w_r = F(sxy2, sxx2), F(sxy2, sxx2 + 2)
sse = lambda w_: sum((y - w_ * x) ** 2 for x, y in zip(xs_, ys_))
assert (sxx2, sxy2, w_ols, w_r) == (14, 23, F(23, 14), F(23, 16)) and sse(w_r) > sse(w_ols)
assert all(F(23, 14 + lam) < F(23, 14 + lam - 1) for lam in range(1, 50))
msq("mockd_ml_10", "ML.REG.RDG", r"""Ridge regression with one feature and no intercept minimises $\sum_i (y_i-wx_i)^2+\lambda w^2$ on the data $(x,y)=(1,2),(2,3),(3,5)$. Which of the following statements is/are TRUE?""",
    [(r"For $\lambda=2$ the fitted weight is $w=23/16$", True), (r"For $\lambda=2$ the training sum of squared errors is smaller than that of ordinary least squares", False),
     (r"As $\lambda\to\infty$ the fitted weight tends to 0", True), (r"$\lambda$ should be chosen by minimising the training error", False)],
    r"""$w=\frac{\sum xy}{\sum x^2+\lambda}=\frac{23}{14+\lambda}$: OLS $23/14$, ridge $23/16$. OLS minimises the training error, so ridge cannot have a smaller one (it is larger). $w\to0$ as $\lambda\to\infty$. Minimising the training error would always choose $\lambda=0$; $\lambda$ is selected by validation.""", "M", "recomputed-by-code", 2)
PTS = [((1, 1), 1), ((-1, 2), -1), ((2, -1), 1), ((-2, -2), -1), ((0, 3), 1), ((1, -3), -1)]
w_, b_, hist_ = [0, 0], 0, []
for _ in range(20):
    mist = 0
    for (x_, y_), lab in PTS:
        if lab * (w_[0] * x_ + w_[1] * y_ + b_) <= 0:
            w_ = [w_[0] + lab * x_, w_[1] + lab * y_]
            b_ += lab
            mist += 1
        if _ == 0 and (x_, y_) == PTS[-1][0]:
            first = (tuple(w_), b_)
    hist_.append(mist)
    if mist == 0:
        break
assert hist_ == [3, 2, 2, 1, 0] and first == ((2, 2), 1) and sum(hist_) == 8 and (tuple(w_), b_) == ((4, 2), -2)
assert 4 * 0 + 2 * 2 - 2 > 0 and 4 * -1 + 2 * 1 - 2 < 0
msq("mockd_ml_11", "ML.CLS.SVM", r"""The perceptron algorithm starts with $w=(0,0)$, $b=0$ and learning rate 1. It cycles, in the order given, through the points $(1,1;+1)$, $(-1,2;-1)$, $(2,-1;+1)$, $(-2,-2;-1)$, $(0,3;+1)$, $(1,-3;-1)$. On a point $(x;y)$ with $y(w\cdot x+b)\le0$ it updates $w\leftarrow w+yx$, $b\leftarrow b+y$. Which of the following statements is/are TRUE?""",
    [(r"After the first pass over the data, $w=(2,2)$ and $b=1$", True), ("The algorithm makes 9 mistakes in total before convergence", False),
     ("The first pass with no mistakes is the 5th pass", True), (r"The final classifier assigns the point $(-1,1)$ to class $+1$", False)],
    r"""Pass 1 makes 3 updates and ends with $w=(2,2)$, $b=1$. Mistakes per pass are $3,2,2,1,0$: 8 in total, converged in pass 5 with $w=(4,2)$, $b=-2$. For $(-1,1)$: $-4+2-2=-4<0$, so class $-1$.""", "H", "recomputed-by-code", 2)

# =========================================================================================== AI (6)
cnt_ = 0
for p_, q_, r2 in itertools.product([False, True], repeat=3):
    if ((not p_) or q_) and ((not q_) or r2) and ((not r2) or p_):
        cnt_ += 1
assert cnt_ == 2  # all-false and all-true
scq("mockd_ai_01", "AI.LOG.PROP", r"""The number of truth assignments to $p,q,r$ that satisfy $(p\to q)\wedge(q\to r)\wedge(r\to p)$ is""", "2", ["3", "4", "6"],
    r"""The implications form a cycle $p\to q\to r\to p$, forcing $p,q,r$ to have the same truth value. Only all-true and all-false satisfy it: 2 assignments.""", "E", "recomputed-by-code", 1)
msq("mockd_ai_02", "AI.SRCH.UNINF", r"""Which of the following statements about uninformed search is/are TRUE?""",
    [("Breadth-first search is complete when the branching factor is finite", True),
     ("Depth-first tree search without repeated-state checking is complete in a finite graph containing cycles", False),
     ("Uniform-cost search is optimal when every step cost is at least some constant $\\epsilon>0$", True),
     ("Iterative-deepening DFS needs $O(b^d)$ memory", False)],
    r"""BFS reaches any goal at finite depth. DFS without cycle checking can loop forever in a cycle. UCS expands nodes in order of path cost and is optimal for positive costs bounded below. IDDFS needs only $O(bd)$ memory.""", "M", "second-derivation", 1)
par_ = {"A": [], "B": ["A"], "C": ["A"], "D": ["B", "C"], "E": ["D"]}
npar = sum(2 ** len(v_) for v_ in par_.values())
assert npar == 1 + 2 + 2 + 4 + 2 == 11
nat("mockd_ai_03", "AI.UNC.CI", r"""A Bayesian network over binary variables $A,B,C,D,E$ has edges $A\to B$, $A\to C$, $B\to D$, $C\to D$, $D\to E$. The number of independent parameters needed to specify all the conditional probability tables is ______.""", 11,
    r"""One free parameter per parent configuration of each binary node: $A$: 1; $B$: 2; $C$: 2; $D$: 4; $E$: 2. Total $=1+2+2+4+2=11$.""", diff="E", marks=1)
EDG2 = {"S": [("A", 1), ("B", 2)], "A": [("D", 6)], "B": [("C", 3)], "C": [("D", 3)], "D": [("G", 2)], "G": []}
H_ = {"S": 9, "A": 12, "B": 1, "C": 1, "D": 2, "G": 0}
# A* graph search (closed set)
fr_ = [(H_["S"], 0, "S", ["S"])]
closed = set()
ret = None
expd = []
while fr_:
    f_, g_, u_, path = heapq.heappop(fr_)
    if u_ in closed:
        continue
    if u_ == "G":
        ret = (g_, path)
        break
    closed.add(u_)
    expd.append(u_)
    for v_, c_ in EDG2[u_]:
        heapq.heappush(fr_, (g_ + c_ + H_[v_], g_ + c_, v_, path + [v_]))
bestc = {"S": 0}
for u_ in ["S", "A", "B", "C", "D", "G"]:
    for v_, c_ in EDG2[u_]:
        bestc[v_] = min(bestc.get(v_, 99), bestc[u_] + c_)
assert ret == (10, ["S", "B", "C", "D", "G"]) and bestc["G"] == 9 and expd == ["S", "B", "C", "D"]
scq("mockd_ai_04", "AI.SRCH.INF", r"""A* graph search (with a closed set) is run from S to G on the directed graph with edge costs S-A 1, S-B 2, A-D 6, B-C 3, C-D 3, D-G 2, using the heuristic values $h(S)=9$, $h(A)=12$, $h(B)=1$, $h(C)=1$, $h(D)=2$, $h(G)=0$. The cost of the path returned is""", "10", ["9", "8", "11"],
    r"""$h(A)=12$ overestimates (true cost 8), so the heuristic is inadmissible. $f$ values: A $=1+12=13$, B $=2+1=3$. Expand S, then B ($f$ of C $=5+1=6$), C ($f$ of D $=8+2=10$), D (G has $f=10$). G (10) is popped before A (13), returning S-B-C-D-G with cost 10, although the optimum S-A-D-G costs $1+6+2=9$.""", "M", "recomputed-by-code", 2)
PA = {1: F(3, 10), 0: F(7, 10)}
PB = {1: {1: F(8, 10), 0: F(2, 10)}}
pB1 = {1: F(8, 10), 0: F(2, 10)}
pC1 = {1: F(6, 10), 0: F(1, 10)}
pD1 = {(1, 1): F(9, 10), (1, 0): F(5, 10), (0, 1): F(4, 10), (0, 0): F(5, 100)}
def jt(a, b, c, d):
    pb = pB1[a] if b else 1 - pB1[a]
    pc = pC1[a] if c else 1 - pC1[a]
    pd = pD1[(b, c)] if d else 1 - pD1[(b, c)]
    return PA[a] * pb * pc * pd
S4 = list(itertools.product([0, 1], repeat=4))
assert sum(jt(*t) for t in S4) == 1
def marg(fn):
    return sum(jt(*t) for t in S4 if fn(*t))
pd1 = marg(lambda a, b, c, d: d == 1)
pd1_alt = sum(sum(PA[a] * (pB1[a] if b else 1 - pB1[a]) * (pC1[a] if c else 1 - pC1[a]) for a in (0, 1)) * pD1[(b, c)] for b in (0, 1) for c in (0, 1))
assert pd1 == pd1_alt
# B indep C given A?  yes by construction; marginally no
pbc = marg(lambda a, b, c, d: b == 1 and c == 1)
assert pbc != marg(lambda a, b, c, d: b == 1) * marg(lambda a, b, c, d: c == 1)
for a_ in (0, 1):
    pa_ = marg(lambda a, b, c, d: a == a_)
    assert marg(lambda a, b, c, d: a == a_ and b == 1 and c == 1) / pa_ == (marg(lambda a, b, c, d: a == a_ and b == 1) / pa_) * (marg(lambda a, b, c, d: a == a_ and c == 1) / pa_)
# A indep D given B only? no
fail = False
for b_ in (0, 1):
    pb_ = marg(lambda a, b, c, d: b == b_)
    pad = marg(lambda a, b, c, d: a == 1 and d == 1 and b == b_) / pb_
    pa1 = marg(lambda a, b, c, d: a == 1 and b == b_) / pb_
    pd_ = marg(lambda a, b, c, d: d == 1 and b == b_) / pb_
    if pad != pa1 * pd_:
        fail = True
assert fail
PD_STR = f"{float(pd1):.4f}"
msq("mockd_ai_05", "AI.UNC.VE", rf"""In a Bayesian network over binary variables, $A\to B$, $A\to C$, $B\to D$, $C\to D$, with $P(A=1)=0.3$; $P(B=1|A=1)=0.8$, $P(B=1|A=0)=0.2$; $P(C=1|A=1)=0.6$, $P(C=1|A=0)=0.1$; $P(D=1|B,C)=0.9$ for $(1,1)$, $0.5$ for $(1,0)$, $0.4$ for $(0,1)$ and $0.05$ for $(0,0)$. Which of the following statements is/are TRUE?""",
    [(f"$P(D=1)={PD_STR}$ (to four decimal places)", True), (r"$B$ and $C$ are conditionally independent given $A$", True),
     (r"$B$ and $C$ are marginally independent", False), (r"$A$ and $D$ are conditionally independent given $B$", False)],
    rf"""Enumerating the joint distribution gives $P(D=1)={PD_STR}$. $B$ and $C$ are d-separated by $A$ (common parent) but dependent marginally through $A$. Given only $B$, the path $A\to C\to D$ is still open, so $A$ and $D$ are not independent given $B$ (checked numerically).""", "H", "recomputed-by-code", 2)
DOM = [1, 2, 3, 4]
LK = {(1, 2), (2, 3), (3, 1), (3, 3), (4, 3)}
s1 = all(any((x, y) in LK for y in DOM) for x in DOM)
s2 = any(all((x, y) in LK for x in DOM) for y in DOM)
s3 = all(((y, x) in LK) for (x, y) in LK)
s4 = any(not any((y, x) in LK for y in DOM) for x in DOM)
assert (s1, s2, s3, s4) == (True, False, False, True)
msq("mockd_ai_06", "AI.LOG.PRED", r"""The domain is $\{1,2,3,4\}$ and the binary predicate $L$ is true exactly for the pairs $(1,2),(2,3),(3,1),(3,3),(4,3)$. Which of the following first-order sentences is/are TRUE in this interpretation?""",
    [(r"$\forall x\,\exists y\,L(x,y)$", True), (r"$\exists y\,\forall x\,L(x,y)$", False), (r"$\forall x\,\forall y\,(L(x,y)\to L(y,x))$", False), (r"$\exists x\,\neg\exists y\,L(y,x)$", True)],
    r"""Every element has an outgoing pair (1 to 2, 2 to 3, 3 to 1, 4 to 3), so the first sentence holds. No element is the target of all four elements (3 is the target of 2, 3 and 4 but not of 1), so the second fails. $(1,2)$ is in $L$ but $(2,1)$ is not, so the third fails. Nothing points to 4, so the last holds.""", "M", "recomputed-by-code", 2)

# difficulty balance for the paper as a whole (E ~30%, M ~50%, H ~20%); applied after registration
_DIFF = {"mockd_la_04": "H", "mockd_ml_08": "H", "mockd_pds_08": "H", "mockd_co_04": "H", "mockd_prs_12": "H",
         "mockd_prs_02": "E", "mockd_pds_04": "E", "mockd_ml_02": "E"}
from . import ITEMS as _ITEMS
for _it in _ITEMS:
    if _it["key"] in _DIFF:
        _it["diff"] = _DIFF[_it["key"]]
