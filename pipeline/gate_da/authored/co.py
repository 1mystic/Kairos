"""Calculus and Optimization (single variable). Numeric/series verification with stdlib."""
import math
from fractions import Fraction as F

from . import msq, nat, scq


def series_mul(a, b, n):
    return [sum(a[i] * b[k - i] for i in range(k + 1)) for k in range(n)]


def exp_series(c, n):  # e^{c x}
    return [F(c) ** k / math.factorial(k) for k in range(n)]


# 1 limit via series
for h in (1e-3, 1e-4):
    assert abs((math.exp(2 * h) - 1 - 2 * h) / h ** 2 - 2) < 1e-2
nat("co_lim_01", "CO.LIM.LIM", r"""$\displaystyle\lim_{x\to0}\frac{e^{2x}-1-2x}{x^2}=$ ______.""", 2,
    r"""$e^{2x}=1+2x+\frac{(2x)^2}{2}+\cdots$, so the numerator is $2x^2+O(x^3)$ and the limit is 2 (also by L'Hospital twice: $\frac{4e^{2x}}{2}\to2$).""", diff="M")

# 2 limit at infinity
assert abs((3 * 1e8 ** 2 + 5 * 1e8) / (1e8 ** 2 - 2) - 3) < 1e-6
nat("co_lim_02", "CO.LIM.LIM", r"""$\displaystyle\lim_{x\to\infty}\frac{3x^2+5x}{x^2-2}=$ ______.""", 3, r"""Divide by $x^2$: $\frac{3+5/x}{1-2/x^2}\to3$.""", diff="E")

# 3 continuity parameter
for h in (1e-3, 1e-5):
    assert abs(math.sin(2 * h) / h - 2) < 1e-4
nat("co_lim_03", "CO.LIM.CNT", r"""The function $f(x)=\dfrac{\sin 2x}{x}$ for $x\ne0$ and $f(0)=a$ is continuous at $x=0$. The value of $a$ is ______.""", 2,
    r"""Continuity requires $a=\lim_{x\to0}\frac{\sin2x}{x}=2\lim\frac{\sin 2x}{2x}=2$.""", diff="E")

# 4 differentiability at 0 (numeric one-sided difference quotients)
def dq(f, h):
    return (f(h) - f(0)) / h
fs = {
    "abs": lambda x: abs(x), "xabs": lambda x: x * abs(x), "cbrt": lambda x: math.copysign(abs(x) ** (1 / 3), x),
    "osc": lambda x: x * x * math.sin(1 / x) if x != 0 else 0.0,
}
def diffble(f):
    r, l = [dq(f, 10.0 ** -k) for k in (4, 5, 6)], [dq(f, -(10.0 ** -k)) for k in (4, 5, 6)]
    return abs(r[-1] - l[-1]) < 1e-3 and abs(r[-1]) < 10
res = {k: diffble(f) for k, f in fs.items()}
assert res == {"abs": False, "xabs": True, "cbrt": False, "osc": True}
msq("co_lim_04", "CO.LIM.DIF", r"""Which of the following functions are differentiable at $x=0$? (Take $f(0)=0$ wherever needed.)""",
    [(r"$f(x)=|x|$", False), (r"$f(x)=x|x|$", True), (r"$f(x)=x^{1/3}$ (real cube root)", False), (r"$f(x)=x^2\sin(1/x)$ for $x\ne0$", True)],
    r"""$|x|$ has a corner; $x^{1/3}$ has an infinite slope at 0; $x|x|$ has derivative $\lim h|h|/h=0$; for $x^2\sin(1/x)$ the quotient $h\sin(1/h)\to0$. Correct: B, D.""", "M", marks=2)

# 5 Maclaurin coefficient
sin2 = [F(0)] * 6
for k in range(0, 6, 2):
    pass
sinx = [F(0), F(1), F(0), F(-1, 6), F(0), F(1, 120)]
cosx = [F(1), F(0), F(-1, 2), F(0), F(F(1), 24), F(0)]
prod = series_mul(sinx, cosx, 5)
assert prod[3] == F(-2, 3)
nat("co_tay_01", "CO.TAY", r"""The coefficient of $x^3$ in the Maclaurin series of $f(x)=\sin x\cos x$ is ______. (Round off to two decimal places)""", -2 / 3,
    r"""$\sin x\cos x=\tfrac12\sin2x=\tfrac12\left(2x-\tfrac{(2x)^3}{6}+\cdots\right)=x-\tfrac23x^3+\cdots$. Coefficient $=-\tfrac23\approx-0.67$.""", tol=0.005, dec=3, diff="M", marks=1)

# 6 derivative from Taylor series
ex = exp_series(1, 8)
x2ex = [F(0), F(0)] + ex[:6]
f5 = x2ex[5] * math.factorial(5)
assert f5 == 20
# numeric check by finite differences of g(x)=x^2 e^x, 5th derivative at 0 via exact Leibniz
leib = sum(math.comb(5, k) * ({0: 0, 1: 0, 2: 2}.get(k, 0)) * 1 for k in range(6))
assert leib == 20
nat("co_tay_02", "CO.TAY", r"""Let $f(x)=x^2e^{x}$. The value of $f^{(5)}(0)$, the fifth derivative at 0, is ______.""", 20,
    r"""$f(x)=x^2\sum_k\frac{x^k}{k!}$; the $x^5$ coefficient is $\frac1{3!}$, so $f^{(5)}(0)=5!\cdot\frac1{3!}=20$. (Leibniz check: $\binom52\cdot(x^2)''\cdot e^x|_0=10\cdot2=20$.)""", diff="M", marks=2)

# 7 max on closed interval
f7 = lambda x: 2 * x ** 3 - 9 * x ** 2 + 12 * x + 1
grid = max(f7(i / 10000) for i in range(0, 30001))
assert abs(grid - 10) < 1e-9
nat("co_opt_01", "CO.OPT.MM", r"""The maximum value of $f(x)=2x^3-9x^2+12x+1$ on the interval $[0,3]$ is ______.""", 10,
    r"""$f'(x)=6(x-1)(x-2)$. Candidates: $f(0)=1$, $f(1)=6$, $f(2)=5$, $f(3)=10$. The maximum is 10 (at the endpoint $x=3$).""", diff="M", marks=2)

# 8 open box
vol = lambda x: x * (12 - 2 * x) ** 2
best = max(range(0, 6001), key=lambda i: vol(i / 1000))
assert best == 2000 and vol(2.0) == 128
nat("co_opt_02", "CO.OPT.OPT", r"""A square sheet of side 12 cm has squares of side $x$ cut from its four corners and the sides are folded up to form an open box. The maximum possible volume of the box, in cm$^3$, is ______.""", 128,
    r"""$V=x(12-2x)^2$, $V'=(12-2x)(12-6x)=0\Rightarrow x=2$ (since $x=6$ gives $V=0$). $V(2)=2\cdot8^2=128$.""", diff="M", marks=2)

# 9 convexity (midpoint test)
def convex(f, lo, hi, n=200):
    xs = [lo + (hi - lo) * i / n for i in range(n + 1)]
    return all(f((a + b) / 2) <= (f(a) + f(b)) / 2 + 1e-12 for a in xs[::7] for b in xs[::5])
cv = {"x4": convex(lambda x: x ** 4, -3, 3), "exp": convex(lambda x: math.exp(-x), -3, 3), "ln": convex(math.log, 0.1, 5),
      "abs": convex(abs, -3, 3)}
assert cv == {"x4": True, "exp": True, "ln": False, "abs": True}
msq("co_opt_03", "CO.OPT.MM", r"""Select all functions that are convex on their stated domains.""",
    [(r"$x^4$ on $\mathbb{R}$", True), (r"$e^{-x}$ on $\mathbb{R}$", True), (r"$\ln x$ on $(0,\infty)$", False), (r"$|x|$ on $\mathbb{R}$", True)],
    r"""$(x^4)''=12x^2\ge0$; $(e^{-x})''=e^{-x}>0$; $(\ln x)''=-1/x^2<0$ (concave); $|x|$ satisfies the triangle inequality, hence convex. Correct: A, B, D.""", "E", marks=2)

# 10 gradient descent iterations
x = 0.0
for _ in range(2):
    x -= 0.25 * (2 * x - 4)
assert x == 1.5
nat("co_opt_04", "CO.OPT.OPT", r"""Gradient descent with step size $0.25$ is applied to $f(x)=x^2-4x$ starting at $x_0=0$. The value of $x_2$ after two iterations is ______.""", 1.5,
    r"""$f'(x)=2x-4$. $x_1=0-0.25(-4)=1$; $x_2=1-0.25(2-4)=1.5$ (the minimiser is $x=2$).""", diff="E")

# 11 critical points of x^3 e^{-x}
g = lambda x: x ** 3 * math.exp(-x)
dg = lambda x: (3 * x * x - x ** 3) * math.exp(-x)
roots = [x for x in (i / 100 for i in range(-500, 800)) if abs(dg(x)) < 1e-12]
assert [0.0, 3.0] == roots
assert dg(2.9) > 0 > dg(3.1) and dg(-0.1) > 0 and dg(0.1) > 0
msq("co_opt_05", "CO.OPT.MM", r"""For $f(x)=x^3e^{-x}$, select all correct statements.""",
    [(r"$x=3$ is a local maximum", True), (r"$x=0$ is a local minimum", False), (r"$x=0$ is a critical point that is neither a local maximum nor a local minimum", True), (r"$f$ has exactly one local minimum", False)],
    r"""$f'(x)=x^2(3-x)e^{-x}$, zero at $x=0$ and $x=3$. The sign of $f'$ is $+$ on both sides of 0 (no extremum, an inflection) and changes from $+$ to $-$ at 3 (local maximum). There is no local minimum. Correct: A, C.""", "M", marks=2)

# 12 series sum
s = sum(F(n, 2 ** n) for n in range(1, 80))
assert abs(float(s) - 2) < 1e-12
nat("co_lim_05", "CO.LIM.LIM", r"""The value of $\displaystyle\sum_{n=1}^{\infty}\frac{n}{2^n}$ is ______.""", 2,
    r"""With $S=\sum nx^n=\frac{x}{(1-x)^2}$ at $x=\tfrac12$: $S=\frac{1/2}{1/4}=2$.""", diff="M", marks=1)

# 13 mean value theorem
c = math.sqrt(4 / 3)
assert abs(3 * c * c - (8 - 0) / 2) < 1e-12
nat("co_lim_06", "CO.LIM.DIF", r"""By the Mean Value Theorem applied to $f(x)=x^3$ on $[0,2]$, the point $c\in(0,2)$ with $f'(c)=\frac{f(2)-f(0)}{2}$ equals ______. (Round off to two decimal places)""", c,
    r"""$f'(c)=3c^2=\frac{8}{2}=4\Rightarrow c=\sqrt{4/3}\approx1.155$.""", tol=0.005, dec=3, diff="M", marks=1)

# 14 series convergence MSQ
partial = lambda f, N: sum(f(n) for n in range(1, N + 1))
assert abs(partial(lambda n: 1 / n ** 2, 200000) - math.pi ** 2 / 6) < 1e-4
assert partial(lambda n: n / (n * n + 1), 2000000) > 7  # keeps growing like ln N
assert abs(partial(lambda n: (-1) ** n / n, 200000) + math.log(2)) < 1e-4
msq("co_lim_07", "CO.LIM.LIM", r"""Select all series that converge.""",
    [(r"$\sum_{n\ge1}\frac1{n^2}$", True), (r"$\sum_{n\ge1}\frac{n}{n^2+1}$", False), (r"$\sum_{n\ge1}\frac{(-1)^n}{n}$", True), (r"$\sum_{n\ge1}\frac{1}{\sqrt n}$", False)],
    r"""p-series with $p=2>1$ converges. $\frac{n}{n^2+1}\sim\frac1n$ diverges (limit comparison). The alternating harmonic series converges (Leibniz). $\sum n^{-1/2}$ is a p-series with $p\le1$: diverges. Correct: A, C.""", "M", marks=2)
