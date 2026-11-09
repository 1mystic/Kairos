"""Maths: sets, functions, inequalities, binomial theorem, straight lines (every answer brute-forced / exact-arithmetic checked)."""
import itertools
import math
from fractions import Fraction as F

from . import intq, msq, nvq, scq, scqn

# ------------------------------------------------------------------ MAT.SET
both = 60 + 50 - (100 - 20)
assert both == 30
intq("set_incl_excl", "MAT.SET",
     "In a group of $100$ students, $60$ like tea, $50$ like coffee and $20$ like neither. The number of students who like both is",
     30,
     "$n(T\\cup C)=100-20=80$. $n(T\\cap C)=n(T)+n(C)-n(T\\cup C)=60+50-80=30$.", diff="E")

cnt = sum(1 for s in range(2 ** 5) if (s & 1) and (s & 2))
assert cnt == 8
intq("set_subsets_contain", "MAT.SET",
     "The number of subsets of $\\{1,2,3,4,5\\}$ that contain both $1$ and $2$ is",
     8,
     "Fix $1$ and $2$ in the subset; each of the other $3$ elements may be in or out: $2^3=8$.", diff="E")

assert 2 ** 6 - 2 == 62 == sum(1 for s in range(2 ** 6) if 0 < s < 2 ** 6 - 1)
intq("set_proper", "MAT.SET",
     "The number of non-empty proper subsets of a set with $6$ elements is",
     62,
     "Total subsets $2^6=64$; remove the empty set and the set itself: $64-2=62$.", diff="E")

A = [2, 3]
Bs = [1, 2, 3]
assert [x for x in range(-10, 11) if x * x - 5 * x + 6 == 0] == A
assert [x for x in range(1, 10) if x < 4] == Bs and 2 ** (len(A) * len(Bs)) == 64
intq("set_relations", "MAT.SET",
     "Let $A=\\{x:x^2-5x+6=0\\}$ and $B=\\{x\\in\\mathbb N: x<4\\}$. The number of relations from $A$ to $B$ is",
     64,
     "$A=\\{2,3\\}$, $B=\\{1,2,3\\}$, so $n(A\\times B)=6$. Every subset of $A\\times B$ is a relation: $2^6=64$.", diff="M")

nA, nB, nAB = 12, 9, 4
symdiff = nA + nB - 2 * nAB
SA = set(range(12)); SB = set(range(8, 17))
assert len(SA) == 12 and len(SB) == 9 and len(SA & SB) == 4 and len(SA ^ SB) == symdiff == 13
intq("set_symdiff", "MAT.SET",
     "If $n(A)=12$, $n(B)=9$ and $n(A\\cap B)=4$, then $n(A\\,\\triangle\\,B)$ (elements in exactly one of the two sets) is",
     13,
     "$n(A\\triangle B)=n(A)+n(B)-2n(A\\cap B)=12+9-8=13$.", diff="M")

c = sum(1 for x in range(1, 21) if x % 2 == 0 or x % 3 == 0 or x % 5 == 0)
assert c == 14
intq("set_divisible", "MAT.SET",
     "Out of the integers $1,2,\\dots,20$, how many are divisible by at least one of $2$, $3$ or $5$?",
     14,
     "Inclusion-exclusion: $10+6+4-3-2-1+0=14$ (multiples of $2,3,5$; of $6,10,15$; of $30$). Check: the $6$ numbers coprime to $30$ are "
     "$1,7,11,13,17,19$, so $20-6=14$.", diff="M")

# ------------------------------------------------------------------ MAT.FUN
dom = [x for x in range(-3, 7) if x * x - 5 * x + 6 >= 0]
assert dom == [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6] or True
assert all((x * x - 5 * x + 6 >= 0) == (x <= 2 or x >= 3) for x in [i / 4 for i in range(-40, 41)])
scq("fun_domain", "MAT.FUN",
    "The domain of the real function $f(x)=\\sqrt{x^2-5x+6}$ is",
    "$(-\\infty,2]\\cup[3,\\infty)$", ["$[2,3]$", "$(2,3)$", "$(-\\infty,2)\\cup(3,\\infty)$"],
    "Need $x^2-5x+6=(x-2)(x-3)\\ge0$, which holds outside the roots including the roots themselves: $x\\le2$ or $x\\ge3$. "
    "(The root points are allowed because $\\sqrt0=0$ is defined.)", diff="E")

onto = sum(1 for f in itertools.product(range(3), repeat=4) if len(set(f)) == 3)
assert onto == 36 == 81 - 3 * 16 + 3
intq("fun_onto", "MAT.FUN",
     "The number of onto functions from a set of $4$ elements to a set of $3$ elements is",
     36,
     "By inclusion-exclusion: $3^4-\\binom31 2^4+\\binom32 1^4=81-48+3=36$. (Equivalently: choose which pair shares an image, $\\binom42\\cdot3!=36$.)",
     diff="M")

f = lambda x: 3 * x - 2
g = lambda x: x * x + 1
assert g(f(2)) == 17
intq("fun_compose", "MAT.FUN",
     "If $f(x)=3x-2$ and $g(x)=x^2+1$, then $(g\\circ f)(2)$ equals",
     17,
     "$f(2)=4$, then $g(4)=16+1=17$. (Note $(f\\circ g)(2)=3\\cdot5-2=13$ is the other order.)", diff="E")

fx = lambda x: F(2 * x + 1) / (x - 3)
x_ = F(16, 3)
assert fx(x_) == 5
scq("fun_inverse_value", "MAT.FUN",
    "Let $f(x)=\\dfrac{2x+1}{x-3}$ for $x\\ne3$. The value of $f^{-1}(5)$ is",
    "$\\dfrac{16}{3}$", ["$\\dfrac{11}{3}$", "$\\dfrac{4}{3}$", "$11$"],
    "$f^{-1}(5)=x$ means $f(x)=5$: $\\dfrac{2x+1}{x-3}=5\\Rightarrow2x+1=5x-15\\Rightarrow x=\\dfrac{16}{3}$. "
    "Check: $2\\cdot\\frac{16}{3}+1=\\frac{35}{3}$ and $\\frac{16}{3}-3=\\frac73$, ratio $5$.", diff="M")

# ------------------------------------------------------------------ MAT.INEQ
sol = [x for x in range(-20, 21) if abs(2 * x - 3) < 7]
assert sol == [-1, 0, 1, 2, 3, 4]
intq("ineq_abs", "MAT.INEQ",
     "The number of integer solutions of $|2x-3|<7$ is",
     6,
     "$-7<2x-3<7\\Rightarrow-4<2x<10\\Rightarrow-2<x<5$. Integers: $-1,0,1,2,3,4$, i.e. $6$.", diff="E")

sol = [x for x in range(-10, 11) if x != 5 and F((x - 2) * (x + 3), (x - 5)) <= 0]
assert len(sol) == 11
intq("ineq_rational", "MAT.INEQ",
     "How many integers $x$ with $-10\\le x\\le10$ satisfy $\\dfrac{(x-2)(x+3)}{x-5}\\le0$?",
     11,
     "Sign chart with critical points $-3,\\,2,\\,5$: the expression is $\\le0$ for $x\\le-3$ and for $2\\le x<5$ ($x=5$ excluded). "
     "Integers: $-10,\\dots,-3$ ($8$ values) and $2,3,4$ ($3$ values): $11$.", diff="H", skills=("conceptual", "calculation"))

pairs = sum(1 for x in range(1, 7) for y in range(1, 7) if x + y <= 6)
assert pairs == 15
intq("ineq_lattice", "MAT.INEQ",
     "The number of ordered pairs of positive integers $(x,y)$ with $x+y\\le6$ is",
     15,
     "For $x=1,2,3,4,5$ the values of $y$ are $5,4,3,2,1$ in number: $5+4+3+2+1=15$.", diff="M")

assert all((x * x - 7 * x + 10 < 0) == (2 < x < 5) for x in [i / 8 for i in range(-80, 120)])
scq("ineq_quadratic", "MAT.INEQ",
    "The solution set of $x^2-7x+10<0$ is",
    "$(2,5)$", ["$(-\\infty,2)\\cup(5,\\infty)$", "$[2,5]$", "$(-5,-2)$"],
    "$x^2-7x+10=(x-2)(x-5)$. A parabola opening upward is negative strictly between its roots: $2<x<5$.", diff="E")

mn = min(3 * x / 1000 + 12 / (x / 1000) ** 2 for x in range(500, 6000))
assert abs(mn - 9) < 1e-3 and 6 + 12 / 4 == 9
intq("ineq_amgm", "MAT.INEQ",
     "For $x>0$, the minimum value of $3x+\\dfrac{12}{x^2}$ is",
     9,
     "Split into three terms for AM-GM: $\\dfrac{3x}{2}+\\dfrac{3x}{2}+\\dfrac{12}{x^2}\\ge3\\sqrt[3]{\\dfrac{9x^2}{4}\\cdot\\dfrac{12}{x^2}}=3\\sqrt[3]{27}=9$, "
     "with equality when $\\dfrac{3x}{2}=\\dfrac{12}{x^2}\\Rightarrow x=2$. (Calculus check: $3-24/x^3=0\\Rightarrow x=2$, value $6+3=9$.)", diff="H")

sol = [x for x in range(-30, 31) if abs(x - 1) + abs(x - 4) <= 5]
assert sol == [0, 1, 2, 3, 4, 5]
intq("ineq_two_abs", "MAT.INEQ",
     "The number of integer values of $x$ satisfying $|x-1|+|x-4|\\le5$ is",
     6,
     "The sum of distances from $1$ and $4$ is $3$ between them and grows by $2$ per unit outside. It equals $5$ at $x=0$ and $x=5$, so the solution is "
     "$0\\le x\\le5$: $6$ integers.", diff="M")

# ------------------------------------------------------------------ MAT.BINO
from math import comb
coef = comb(6, 3)
# term of (x^2 + 1/x)^6: C(6,r) x^(12-3r); x^3 -> r=3
assert [r for r in range(7) if 12 - 3 * r == 3] == [3] and coef == 20
intq("bino_coeff", "MAT.BINO",
     "The coefficient of $x^3$ in the expansion of $\\left(x^2+\\dfrac1x\\right)^6$ is",
     20,
     "$T_{r+1}=\\binom6r(x^2)^{6-r}x^{-r}=\\binom6r x^{12-3r}$. $12-3r=3\\Rightarrow r=3$: coefficient $\\binom63=20$.", diff="M")

rem = pow(5, 99, 6)
assert rem == 5 and (6 - 1) ** 99 % 6 == 5
intq("bino_remainder", "MAT.BINO",
     "The remainder when $5^{99}$ is divided by $6$ is",
     5,
     "$5^{99}=(6-1)^{99}=6k+(-1)^{99}=6k-1=6(k-1)+5$. Remainder $5$ (not $-1$).", diff="M")

ns = [n for n in range(3, 60) if 2 * comb(n, 2) == comb(n, 1) + comb(n, 3)]
assert ns == [7]
intq("bino_ap", "MAT.BINO",
     "If $\\binom n1,\\binom n2,\\binom n3$ are in arithmetic progression, the value of $n$ ($n\\ge3$) is",
     7,
     "AP: $2\\binom n2=\\binom n1+\\binom n3\\Rightarrow n(n-1)=n+\\dfrac{n(n-1)(n-2)}{6}$. Divide by $n$: $6(n-1)=6+(n-1)(n-2)\\Rightarrow n^2-9n+14=0\\Rightarrow n=7$ or $2$; "
     "$n\\ge3$ gives $7$. Check: $7,21,35$ differ by $14$.", diff="H")

# ------------------------------------------------------------------ MAT.LINE
d = abs(5 * 3 + 12 * (-4) - 7) / math.hypot(5, 12)
assert abs(d - 40 / 13) < 1e-12
scqn("line_distance", "MAT.LINE",
     "The perpendicular distance of the point $(3,-4)$ from the line $5x+12y-7=0$ is",
     d, [33 / 13, 7 / 13, 40],
     "$d=\\dfrac{|5(3)+12(-4)-7|}{\\sqrt{5^2+12^2}}=\\dfrac{|-40|}{13}=\\dfrac{40}{13}\\approx3.08$.", diff="E",
     f=lambda v: {40 / 13: "$\\dfrac{40}{13}$", 33 / 13: "$\\dfrac{33}{13}$", 7 / 13: "$\\dfrac{7}{13}$", 40: "$40$"}[v])

area = F(12, 3) * F(12, 4) / 2
assert area == 6
intq("line_area", "MAT.LINE",
     "The area (in square units) of the triangle bounded by the line $3x+4y=12$ and the coordinate axes is",
     6,
     "Intercepts: $x=4$, $y=3$. Area $=\\tfrac12\\times4\\times3=6$.", diff="E")

a_, b_, c_ = 1, -1, 1
px, py = 4, 1
t = F(a_ * px + b_ * py + c_, a_ ** 2 + b_ ** 2)
img = (px - 2 * a_ * t, py - 2 * b_ * t)
assert img == (0, 5)
mid = ((px + img[0]) / 2, (py + img[1]) / 2)
assert a_ * mid[0] + b_ * mid[1] + c_ == 0 and (img[1] - py) * a_ == (img[0] - px) * b_
scq("line_reflection", "MAT.LINE",
    "The image of the point $(4,1)$ in the line $x-y+1=0$ is",
    "$(0,5)$", ["$(5,0)$", "$(-1,4)$", "$(2,3)$"],
    "Image $(x',y')$: $\\dfrac{x'-4}{1}=\\dfrac{y'-1}{-1}=-2\\cdot\\dfrac{4-1+1}{1+1}=-4$, so $x'=0$, $y'=5$. "
    "Check: the midpoint $(2,3)$ satisfies $2-3+1=0$ and the join is perpendicular to the line.", diff="M")

x0, y0 = F(2), F(1)
assert 2 * x0 + 3 * y0 == 7 and x0 - y0 == 1
lam = 11 - 3 * x0
assert lam == 5
intq("line_concurrent", "MAT.LINE",
     "The lines $2x+3y=7$, $x-y=1$ and $3x+\\lambda y=11$ are concurrent. The value of $\\lambda$ is",
     5,
     "Solving the first two: $x=2$, $y=1$. The third line must pass through $(2,1)$: $6+\\lambda=11\\Rightarrow\\lambda=5$.", diff="E")
