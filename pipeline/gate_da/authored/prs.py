"""Probability and Statistics."""
import itertools
from fractions import Fraction as F
from math import comb, erf, exp, sqrt, factorial

from . import msq, nat, scq


def phi(z):  # standard normal CDF
    return 0.5 * (1 + erf(z / sqrt(2)))


# 1 Bayes: screening test
prev, sens, spec = F(2, 100), F(95, 100), F(90, 100)
post = prev * sens / (prev * sens + (1 - prev) * (1 - spec))
assert abs(float(post) - 0.16239) < 1e-4
# independent check by enumeration of a population of 10000
pop = 10000
sick = pop * 2 // 100
tp = sick * 95 // 100
fp = (pop - sick) * 10 // 100
assert abs(tp / (tp + fp) - float(post)) < 1e-3
nat("prs_bayes_01", "PRS.PROB.BAYES", r"""A screening test for a condition that affects 2% of a population has sensitivity 95% (positive given condition) and specificity 90% (negative given no condition). A randomly chosen person tests positive. The probability that the person actually has the condition is ______. (Round off to two decimal places)""",
    float(post), r"""$P(D|+)=\frac{0.02\cdot0.95}{0.02\cdot0.95+0.98\cdot0.10}=\frac{0.019}{0.117}\approx0.162$.""", tol=0.005, dec=3, diff="M", marks=2)

# 2 Bayes three machines
w = [F(50, 100), F(30, 100), F(20, 100)]
dfc = [F(2, 100), F(3, 100), F(5, 100)]
tot = sum(a * b for a, b in zip(w, dfc))
p3 = w[2] * dfc[2] / tot
assert p3 == F(10, 29) and abs(float(p3) - 0.3448) < 1e-4
nat("prs_bayes_02", "PRS.PROB.BAYES", r"""Machines M1, M2 and M3 produce 50%, 30% and 20% of the items in a factory, and 2%, 3% and 5% of their respective items are defective. An item picked at random is found defective. The probability that it was produced by M3 is ______. (Round off to two decimal places)""",
    float(p3), r"""Defective total: $0.5(0.02)+0.3(0.03)+0.2(0.05)=0.010+0.009+0.010=0.029$. $P(M_3|\text{def})=0.010/0.029=10/29\approx0.34$.""", tol=0.005, dec=3, diff="M", marks=2)

# 3 conditional probability cards (enumeration)
deck = [(r, s) for r in range(13) for s in range(4)]
pairs = list(itertools.combinations(deck, 2))
both = sum(1 for a, b in pairs if a[0] == 0 and b[0] == 0)
atleast = sum(1 for a, b in pairs if a[0] == 0 or b[0] == 0)
assert (both, atleast) == (6, 198)
nat("prs_cond_01", "PRS.PROB.COND", r"""Two cards are drawn without replacement from a standard deck of 52 cards. Given that at least one of the two cards is an ace, the probability that both are aces is ______. (Round off to three decimal places)""",
    both / atleast, r"""Unordered pairs: both aces $\binom42=6$. At least one ace: $\binom{52}{2}-\binom{48}{2}=1326-1128=198$. Probability $=6/198=1/33\approx0.030$.""", tol=0.0005, dec=4, diff="M", marks=2)

# 4 counting: divisible by 3 or 5 but not both
c = sum(1 for n in range(1, 1001) if (n % 3 == 0) != (n % 5 == 0))
assert c == 333 + 200 - 2 * 66 == 401
nat("prs_cnt_01", "PRS.CNT.PC", r"""The number of integers in $\{1,2,\ldots,1000\}$ that are divisible by exactly one of 3 and 5 is ______.""", 401,
    r"""Divisible by 3: 333; by 5: 200; by both (15): 66. Exactly one: $333+200-2\cdot 66=401$.""", diff="M", marks=2)

# 5 counting with upper bounds
cnt = sum(1 for t in itertools.product(range(6), repeat=4) if sum(t) == 12)
inc = sum((-1) ** k * comb(4, k) * comb(12 - 6 * k + 3, 3) for k in range(0, 3) if 12 - 6 * k >= 0)
assert cnt == inc == 125
nat("prs_cnt_02", "PRS.CNT.PC", r"""The number of integer solutions of $x_1+x_2+x_3+x_4=12$ with $0\le x_i\le 5$ for every $i$ is ______.""", 125,
    r"""Inclusion-exclusion over variables exceeding 5: $\binom{15}{3}-4\binom{9}{3}+6\binom{3}{3}=455-336+6=125$.""", diff="H", marks=2)

# 6 birthday-month
p = 1 - F(12 * 11 * 10 * 9 * 8, 12 ** 5)
assert abs(float(p) - 0.6181) < 1e-3
nat("prs_cnt_03", "PRS.CNT.PC", r"""Five people each independently have a birth month chosen uniformly from the 12 months. The probability that at least two of them share a birth month is ______. (Round off to two decimal places)""",
    float(p), r"""Complement: all months distinct: $\frac{12\cdot11\cdot10\cdot9\cdot8}{12^5}=\frac{95040}{248832}\approx0.382$. So $P\approx0.618$.""", tol=0.005, dec=3, diff="M", marks=2)

# 7 binomial
pb = sum(comb(5, k) * 0.3 ** k * 0.7 ** (5 - k) for k in range(2, 6))
assert abs(pb - (1 - 0.7 ** 5 - 5 * 0.3 * 0.7 ** 4)) < 1e-12 and abs(pb - 0.47178) < 1e-4
nat("prs_drv_01", "PRS.DRV.BIN", r"""$X\sim\text{Binomial}(n=5,\,p=0.3)$. The value of $P(X\ge 2)$ is ______. (Round off to two decimal places)""",
    pb, r"""$P(X\ge2)=1-P(0)-P(1)=1-0.7^5-5(0.3)(0.7^4)=1-0.16807-0.36015=0.47178$.""", tol=0.005, dec=3, diff="E")

# 8 Poisson
pp = exp(-3) * 3 ** 2 / factorial(2)
assert abs(pp - 0.2240418) < 1e-6
nat("prs_drv_02", "PRS.DRV.POI", r"""The number of calls received per minute by a helpline is Poisson with mean 3. The probability that exactly 2 calls arrive in a given minute is ______. (Round off to two decimal places)""",
    pp, r"""$P(2)=e^{-3}\,3^2/2!=4.5e^{-3}\approx0.224$.""", tol=0.005, dec=3, diff="E")

# 9 expected tosses to HH: Markov chain solved exactly
# states: 0 (no progress), 1 (last was H). E0 = 1 + .5 E1 + .5 E0; E1 = 1 + .5*0 + .5 E0
# E0 = 2 + E1 ; E1 = 1 + .5 E0 -> E0 = 2 + 1 + .5 E0 -> E0 = 6
E0 = F(6)
E1 = 1 + F(1, 2) * E0
assert E0 == 1 + F(1, 2) * E1 + F(1, 2) * E0
import random
rnd = random.Random(11)
tot_t = 0
N = 40000
for _ in range(N):
    last, t = 0, 0
    while True:
        t += 1
        h = rnd.random() < 0.5
        if h and last:
            break
        last = 1 if h else 0
    tot_t += t
assert abs(tot_t / N - 6) < 0.1
nat("prs_mom_01", "PRS.MOM.CEX", r"""A fair coin is tossed repeatedly until two heads occur in succession (HH). The expected number of tosses is ______.""", 6,
    r"""Let $E_0$ be the expected remaining tosses with no progress and $E_1$ with the last toss a head. $E_0=1+\tfrac12E_1+\tfrac12E_0$ and $E_1=1+\tfrac12\cdot0+\tfrac12E_0$. Hence $E_0=2+E_1$ and $E_1=1+E_0/2$, so $E_0=3+E_0/2$, $E_0=6$.""", diff="H", marks=2)

# 10 exponential memoryless
mean = 4
pm = exp(-6 / mean) / exp(-2 / mean)
assert abs(pm - exp(-1)) < 1e-12
nat("prs_crv_01", "PRS.CRV.EXP", r"""The lifetime $T$ of a device is exponentially distributed with mean 4 years. Given that the device has already survived 2 years, the probability that it survives at least 4 more years is ______. (Round off to two decimal places)""",
    exp(-1), r"""Memorylessness: $P(T>6\mid T>2)=P(T>4)=e^{-4/4}=e^{-1}\approx0.368$.""", tol=0.005, dec=3, diff="E")

# 11 normal within one sd
pz = phi(1) - phi(-1)
assert abs(pz - 0.682689) < 1e-5
nat("prs_crv_02", "PRS.CRV.NOR", r"""$X$ is normally distributed with mean 10 and variance 4. $P(8<X<12)$ is ______. (Round off to two decimal places)""",
    pz, r"""$\sigma=2$, so $8<X<12$ is $\mu\pm\sigma$: $P=\Phi(1)-\Phi(-1)\approx0.683$.""", tol=0.005, dec=3, diff="E")

# 12 uniform conditional
cp = F(10 - 7, 10 - 4)
assert cp == F(1, 2)
nat("prs_crv_03", "PRS.CRV.PDF", r"""$X\sim\text{Uniform}(0,10)$. The conditional probability $P(X>7\mid X>4)$ is ______.""", 0.5,
    r"""Given $X>4$, $X$ is uniform on $(4,10)$; $P(X>7)=3/6=0.5$.""", diff="E")

# 13 variance of linear combination
vx, vy, cxy = 4, 9, 1
v = 9 * vx + 4 * vy - 2 * 3 * 2 * cxy
assert v == 60
nat("prs_mom_02", "PRS.MOM.EXV", r"""$\mathrm{Var}(X)=4$, $\mathrm{Var}(Y)=9$ and $\mathrm{Cov}(X,Y)=1$. The value of $\mathrm{Var}(3X-2Y)$ is ______.""", 60,
    r"""$\mathrm{Var}(3X-2Y)=9\,\mathrm{Var}X+4\,\mathrm{Var}Y-2(3)(2)\mathrm{Cov}(X,Y)=36+36-12=60$.""", diff="M", marks=1)

# 14 joint pmf: correlation & conditional expectation
pmf = {(0, 0): F(1, 8), (0, 1): F(3, 8), (1, 0): F(2, 8), (1, 1): F(2, 8)}
assert sum(pmf.values()) == 1
EX = sum(x * p for (x, y), p in pmf.items())
EY = sum(y * p for (x, y), p in pmf.items())
EXY = sum(x * y * p for (x, y), p in pmf.items())
cov = EXY - EX * EY
assert cov == F(1, 2) * F(5, 8) - F(1, 2) * F(5, 8) + F(1, 4) - F(1, 2) * F(5, 8) or True
ey_x1 = sum(y * p for (x, y), p in pmf.items() if x == 1) / sum(p for (x, y), p in pmf.items() if x == 1)
assert ey_x1 == F(1, 2)
nat("prs_mom_03", "PRS.MOM.JNT", "The joint pmf of $(X,Y)$ is\n\n| | $Y=0$ | $Y=1$ |\n|---|---|---|\n| $X=0$ | 1/8 | 3/8 |\n| $X=1$ | 2/8 | 2/8 |\n\n$E[Y\\mid X=1]$ is ______.", 0.5,
    r"""$P(X=1)=4/8$. $E[Y\mid X=1]=\frac{0\cdot 2/8+1\cdot2/8}{4/8}=\frac12$.""", diff="E")
assert cov == F(1, 4) - F(1, 2) * F(5, 8)  # EX=1/2, EY=5/8, EXY=2/8
scq("prs_mom_04", "PRS.MOM.JNT", "For the joint pmf below, which statement about $X$ and $Y$ is correct?\n\n| | $Y=0$ | $Y=1$ |\n|---|---|---|\n| $X=0$ | 1/8 | 3/8 |\n| $X=1$ | 2/8 | 2/8 |",
    r"$\mathrm{Cov}(X,Y)=-\tfrac1{16}$, so they are negatively correlated and not independent", [r"$X$ and $Y$ are independent", r"$\mathrm{Cov}(X,Y)=+\tfrac1{16}$", r"$\mathrm{Cov}(X,Y)=0$ but not independent"],
    r"""$E[X]=\frac12$, $E[Y]=\frac58$, $E[XY]=P(X=1,Y=1)=\frac14$. $\mathrm{Cov}=\frac14-\frac12\cdot\frac58=\frac14-\frac5{16}=-\frac1{16}\ne0$, hence not independent and negatively correlated.""", "M", marks=2)
assert cov == F(-1, 16)

# 15 MSQ independence of events
PA, PB, PU = F(1, 2), F(2, 5), F(7, 10)
PI = PA + PB - PU
msq("prs_prob_01", "PRS.PROB.IND", r"""For events $A,B$: $P(A)=0.5$, $P(B)=0.4$ and $P(A\cup B)=0.7$. Select all correct statements.""",
    [(r"$A$ and $B$ are independent", PI == PA * PB), (r"$A$ and $B$ are mutually exclusive", PI == 0), (r"$P(A\mid B)=0.5$", PI / PB == F(1, 2)), (r"$P(A^c\cap B^c)=0.4$", 1 - PU == F(2, 5))],
    r"""$P(A\cap B)=0.5+0.4-0.7=0.2=P(A)P(B)$, so independent (not mutually exclusive). $P(A|B)=0.2/0.4=0.5$. $P(A^c\cap B^c)=1-0.7=0.3\neq0.4$. Correct: A, C.""", "M", marks=2)
assert PI == F(1, 5)

# 16 MSQ distributions facts
var_bin_le_mean = all(n * p * (1 - p) <= n * p for n in range(1, 20) for p in (F(1, 10) * k for k in range(1, 10)))
msq("prs_drv_03", "PRS.DRV.BIN", r"""Select all true statements.""",
    [(r"For a Poisson random variable the mean equals the variance", True), (r"For $\text{Binomial}(n,p)$ the variance never exceeds the mean", var_bin_le_mean),
     (r"An exponential random variable is memoryless", True), (r"$\text{Uniform}(0,1)$ has variance $1/4$", F(1, 12) == F(1, 4))],
    r"""Poisson: mean = variance = $\lambda$. Binomial: $np(1-p)\le np$. Exponential: $P(X>s+t|X>s)=P(X>t)$. Uniform(0,1): variance $=1/12$, not $1/4$. Correct: A, B, C.""", "E", marks=1)

# 17 CLT
mu, sd, n = 2, 3, 100
z = (230 - n * mu) / (sd * sqrt(n))
pc = 1 - phi(z)
assert z == 1.0 and abs(pc - 0.158655) < 1e-5
nat("prs_clt_01", "PRS.CLT", r"""$X_1,\ldots,X_{100}$ are i.i.d. with mean 2 and standard deviation 3. Using the Central Limit Theorem, $P\left(\sum_{i=1}^{100}X_i>230\right)\approx$ ______. (Round off to two decimal places)""",
    pc, r"""$S\approx N(200,\,900)$; $z=(230-200)/30=1$; $P(Z>1)=0.1587$.""", tol=0.005, dec=3, diff="M", marks=2)

# 18 CI
half = 1.96 * 10 / sqrt(25)
assert abs(half - 3.92) < 1e-12
nat("prs_inf_01", "PRS.INF.CI", r"""A sample of $n=25$ observations from a population with known standard deviation 10 has mean 52. The upper limit of the 95% confidence interval for the population mean (use $z_{0.975}=1.96$) is ______. (Round off to two decimal places)""",
    52 + half, r"""Half-width $=1.96\times10/\sqrt{25}=3.92$. Upper limit $=52+3.92=55.92$.""", tol=0.005, dec=3, diff="E")

# 19 t statistic
t = (24 - 21) / (6 / sqrt(9))
assert t == 1.5
nat("prs_inf_02", "PRS.INF.TT", r"""To test $H_0:\mu=21$, a sample of size 9 gives mean 24 and standard deviation 6. The value of the one-sample $t$ statistic is ______.""", 1.5,
    r"""$t=\frac{\bar x-\mu_0}{s/\sqrt n}=\frac{3}{6/3}=1.5$ with 8 degrees of freedom.""", diff="E")

# 20 chi-square statistic
obs = [18, 22, 20, 40]
exp_ = [25] * 4
chi = sum((o - e) ** 2 / e for o, e in zip(obs, exp_))
assert chi == 12.32
nat("prs_inf_03", "PRS.INF.CHI", r"""100 observations fall into four categories with observed counts 18, 22, 20 and 40. Under the null hypothesis that all four categories are equally likely, the chi-squared test statistic is ______.""",
    chi, r"""Expected 25 each: $\frac{(-7)^2+(-3)^2+(-5)^2+15^2}{25}=\frac{49+9+25+225}{25}=12.32$ (3 degrees of freedom).""", tol=0.005, dec=3, diff="M", marks=1)

# 21 chi-square variance
nat("prs_crv_04", "PRS.CRV.TCH", r"""$Z_1,\ldots,Z_4$ are independent standard normal variables and $Y=Z_1^2+Z_2^2+Z_3^2+Z_4^2$. The value of $\mathrm{Var}(Y)$ is ______.""", 8,
    r"""$Y\sim\chi^2_4$ and $\mathrm{Var}(\chi^2_k)=2k=8$. (Check: $\mathrm{Var}(Z^2)=E[Z^4]-1=3-1=2$, times 4 independent terms.)""", diff="M", marks=1)

# 22 joint pdf
# f(x,y)=k(x+y) on unit square; integrals of monomials
def integ(f_terms):  # list of (coef, px, py) integrated over unit square
    return sum(F(c) / ((px + 1) * (py + 1)) for c, px, py in f_terms)
k = 1 / integ([(1, 1, 0), (1, 0, 1)])
assert k == 1
EXf = integ([(1, 2, 0), (1, 1, 1)])
assert EXf == F(7, 12)
nat("prs_mom_05", "PRS.MOM.JNT", r"""The joint density of $(X,Y)$ is $f(x,y)=k(x+y)$ for $0<x<1,\,0<y<1$ and 0 elsewhere. $E[X]$ is ______. (Round off to two decimal places)""",
    float(EXf), r"""$\int\!\!\int k(x+y)=k(\tfrac12+\tfrac12)=k\Rightarrow k=1$. $E[X]=\int_0^1\!\int_0^1 x(x+y)\,dy\,dx=\tfrac13+\tfrac14=\tfrac7{12}\approx0.58$.""", tol=0.005, dec=3, diff="M", marks=2)

# 23 descriptive statistic
data = [3, 5, 5, 7, 10]
m = sum(data) / 5
s2 = sum((x - m) ** 2 for x in data) / 4
assert m == 6 and s2 == 7.0
nat("prs_desc_01", "PRS.DESC.SD", r"""The sample variance (with divisor $n-1$) of the data 3, 5, 5, 7, 10 is ______.""", 7,
    r"""Mean $=6$. Squared deviations: $9,1,1,1,16$, sum $=28$. Variance $=28/4=7$.""", diff="E")

# 24 correlation MSQ
msq("prs_desc_02", "PRS.DESC.COR", r"""Let $X$ be a random variable with finite non-zero variance. Select all correct statements.""",
    [(r"$\mathrm{Corr}(X,-3X+2)=-1$", True), (r"$\mathrm{Corr}(X,X^2)=0$ for every $X$ symmetric about 0", True),
     (r"$\mathrm{Cov}(X,Y)=0$ implies $X$ and $Y$ are independent", False), (r"$|\mathrm{Corr}(X,Y)|\le1$", True)],
    r"""Linear map with negative slope gives $-1$. For $X$ symmetric about 0 (with finite third moment), $\mathrm{Cov}(X,X^2)=E[X^3]-E[X]E[X^2]=0$. Zero covariance does not imply independence (e.g. $X$ and $X^2$). Cauchy-Schwarz gives $|\rho|\le1$. Correct: A, B, D.""", "M", marks=2)

# 25 total probability with dice then coins
pr = sum(F(1, 6) * F(comb(k, 2), 2 ** k) for k in range(1, 7))
# independent: enumerate all outcomes
tot = F(0)
for die in range(1, 7):
    for flips in itertools.product([0, 1], repeat=die):
        if sum(flips) == 2:
            tot += F(1, 6) * F(1, 2 ** die)
assert pr == tot
nat("prs_prob_02", "PRS.PROB.COND", r"""A fair die is rolled and then a fair coin is tossed as many times as the number shown on the die. The probability of getting exactly two heads is ______. (Round off to two decimal places)""",
    float(pr), r"""$P=\frac16\sum_{k=1}^6\binom k2 2^{-k}=\frac16\left(0+\frac14+\frac38+\frac38+\frac{5}{16}+\frac{15}{64}\right)=%s\approx%.3f$.""" % (pr, float(pr)), tol=0.005, dec=3, diff="H", marks=2)
