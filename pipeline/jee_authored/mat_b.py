"""Maths: 3D geometry basics, statistics, relations (class 12), linear programming (exact arithmetic / brute force)."""
import itertools
import math
from fractions import Fraction as F

from . import intq, msq, nvq, scq, scqn

# ------------------------------------------------------------------ MAT.TDI
dd = math.dist((1, -2, 3), (4, 2, 3))
assert dd == 5
intq("tdi_distance", "MAT.TDI",
     "The distance between the points $(1,-2,3)$ and $(4,2,3)$ is",
     5,
     "$d=\\sqrt{(4-1)^2+(2+2)^2+(3-3)^2}=\\sqrt{9+16}=5$.", diff="E")

P, Q, m, n = (1, 2, 3), (7, 8, 9), 2, 1
pt = tuple(F(m * q + n * p, m + n) for p, q in zip(P, Q))
assert pt == (5, 6, 7) and sum(pt) == 18
intq("tdi_section", "MAT.TDI",
     "The point $R$ divides the segment joining $A(1,2,3)$ and $B(7,8,9)$ internally in the ratio $2:1$. The sum of the coordinates of $R$ is",
     18,
     "$R=\\left(\\dfrac{2\\cdot7+1\\cdot1}{3},\\dfrac{2\\cdot8+2}{3},\\dfrac{2\\cdot9+3}{3}\\right)=(5,6,7)$ (the ratio weights the far point $B$ by $2$). Sum $=18$.", diff="M")

dx = math.sqrt(3 ** 2 + 5 ** 2)
assert abs(dx ** 2 - 34) < 1e-12
scq("tdi_axis", "MAT.TDI",
    "The perpendicular distance of the point $(-2,3,-5)$ from the $x$-axis is",
    "$\\sqrt{34}$", ["$\\sqrt{29}$", "$\\sqrt{13}$", "$\\sqrt{38}$"],
    "The foot of the perpendicular on the $x$-axis is $(-2,0,0)$, so the distance is $\\sqrt{y^2+z^2}=\\sqrt{9+25}=\\sqrt{34}$. "
    "($\\sqrt{x^2+z^2}=\\sqrt{29}$ would be the distance from the $y$-axis and $\\sqrt{x^2+y^2}=\\sqrt{13}$ from the $z$-axis.)", diff="M")

V = [(1, 2, 3), (3, 4, 5), (2, 0, 1)]
cen = tuple(F(sum(v[i] for v in V), 3) for i in range(3))
assert cen == (2, 2, 3) and sum(cen) == 7
intq("tdi_centroid", "MAT.TDI",
     "The centroid of the triangle with vertices $(1,2,3)$, $(3,4,5)$ and $(2,0,1)$ is $(a,b,c)$. The value of $a+b+c$ is",
     7,
     "$G=\\left(\\dfrac{1+3+2}{3},\\dfrac{2+4+0}{3},\\dfrac{3+5+1}{3}\\right)=(2,2,3)$, so $a+b+c=7$.", diff="E")

A_, B_ = (1, 2, 3), (3, 2, 1)
ok = all(abs(math.dist(p, A_) - math.dist(p, B_)) < 1e-9 for p in [(t, y, t) for t in (-2, 0, 1.5, 4) for y in (-1, 3)])
bad = any(abs(math.dist(p, A_) - math.dist(p, B_)) < 1e-9 for p in [(1, 0, 2), (3, 1, 1)])
assert ok and not bad
scq("tdi_locus", "MAT.TDI",
    "The locus of a point equidistant from $A(1,2,3)$ and $B(3,2,1)$ is the plane",
    "$x-z=0$", ["$x+z=4$", "$x-z=2$", "$y=2$"],
    "$(x-1)^2+(y-2)^2+(z-3)^2=(x-3)^2+(y-2)^2+(z-1)^2\\Rightarrow-2x-6z+10=-6x-2z+10\\Rightarrow4x=4z$, i.e. $x=z$. "
    "It passes through the midpoint $(2,2,2)$ and is perpendicular to $AB$.", diff="M")

a, b = (1, 2, 3), (3, -2, 7)
v = tuple(q - p for p, q in zip(a, b))
L = math.sqrt(sum(c * c for c in v))
dc = [c / L for c in v]
assert L == 6 and abs(sum(c * c for c in dc) - 1) < 1e-12 and abs(dc[1] + 2 / 3) < 1e-12
scq("tdi_dc", "MAT.TDI",
    "The direction cosine $m$ (with respect to the $y$-axis) of the line from $A(1,2,3)$ to $B(3,-2,7)$ is",
    "$-\\dfrac23$", ["$\\dfrac23$", "$-\\dfrac13$", "$-\\dfrac12$"],
    "Direction ratios $\\overrightarrow{AB}=(2,-4,4)$, length $\\sqrt{4+16+16}=6$. Direction cosines $\\left(\\tfrac13,-\\tfrac23,\\tfrac23\\right)$; "
    "$m=-\\dfrac23$. Check: $\\tfrac19+\\tfrac49+\\tfrac49=1$.", diff="M")

# ------------------------------------------------------------------ MAT.STAT
data = [3, 5, 5, 7, 10]
mu = F(sum(data), len(data))
var = sum((F(x) - mu) ** 2 for x in data) / len(data)
assert mu == 6 and var == F(28, 5)
scq("stat_variance", "MAT.STAT",
    "The variance of the observations $3,5,5,7,10$ is",
    "$5.6$", ["$4.5$", "$7.0$", "$2.4$"],
    "Mean $=\\dfrac{30}{5}=6$. Squared deviations: $9,1,1,1,16$, sum $28$. Variance $=\\dfrac{28}{5}=5.6$ (dividing by $n-1=4$ gives $7.0$, "
    "which is the sample variance, not the population variance used here).", diff="E")

mean_c = (20 * 15 - 31 + 13) / 20
assert abs(mean_c - 14.1) < 1e-12
nvq("stat_correct_mean", "MAT.STAT",
    "The mean of $20$ observations was computed as $15$. Later it was found that the value $13$ had been wrongly recorded as $31$. "
    "The correct mean is",
    14.1, 0.01,
    "Wrong total $=20\\times15=300$. Correct total $=300-31+13=282$. Correct mean $=\\dfrac{282}{20}=14.1$.", diff="E")

xs = [1, 2, 4, 7, 8]
v0 = F(sum((F(x) - F(sum(xs), 5)) ** 2 for x in xs), 5)
ys = [2 * x + 5 for x in xs]
vy = F(sum((F(y) - F(sum(ys), 5)) ** 2 for y in ys), 5)
assert vy == 4 * v0
sd_x = 3
assert 2 * sd_x == 6
intq("stat_sd_transform", "MAT.STAT",
     "A set of observations $x_i$ has standard deviation $3$. The standard deviation of the observations $y_i=2x_i+5$ is",
     6,
     "Adding a constant does not change spread; multiplying by $2$ multiplies the standard deviation by $|2|$: $\\sigma_y=2\\times3=6$ "
     "(the variance becomes $4\\times9=36$).", diff="E")

d5 = [5, 9, 11, 15, 20]
mean5 = F(sum(d5), 5)
md = sum(abs(F(x) - mean5) for x in d5) / 5
assert mean5 == 12 and md == F(22, 5)
nvq("stat_meandev", "MAT.STAT",
    "The mean deviation about the mean of the data $5,9,11,15,20$ is",
    4.4, 0.01,
    "Mean $=\\dfrac{60}{5}=12$. $|x-12|$: $7,3,1,3,8$, sum $22$. Mean deviation $=\\dfrac{22}{5}=4.4$.", diff="M")

comb_mean = F(30 * 60 + 20 * 75, 50)
assert comb_mean == 66
intq("stat_combined_mean", "MAT.STAT",
     "A class has $30$ students with average marks $60$ and another has $20$ students with average marks $75$. The mean marks of all $50$ students together is",
     66,
     "Total $=30\\times60+20\\times75=1800+1500=3300$; mean $=3300/50=66$.", diff="E")

n1, m1, v1, n2, m2, v2 = 10, 4, 2, 10, 8, 4
sx = n1 * (v1 + m1 ** 2) + n2 * (v2 + m2 ** 2)
Nn = n1 + n2
cm = F(n1 * m1 + n2 * m2, Nn)
cv = F(sx, Nn) - cm ** 2
alt = F(n1 * v1 + n2 * v2, Nn) + F(n1 * n2 * (m1 - m2) ** 2, Nn ** 2)
assert cv == alt == 7 and cm == 6
intq("stat_combined_var", "MAT.STAT",
     "Two groups of $10$ observations each have means $4$ and $8$ and variances $2$ and $4$ respectively. The variance of the combined $20$ observations is",
     7,
     "Combined mean $=6$. Use $\\sum x^2=n(\\sigma^2+\\bar x^2)$: group 1 gives $10(2+16)=180$, group 2 gives $10(4+64)=680$. "
     "$\\sigma^2=\\dfrac{860}{20}-6^2=43-36=7$. (Equivalently: within-group $3$ plus between-group $\\dfrac{n_1n_2(\\Delta\\mu)^2}{N^2}=4$.)", diff="H")

# ------------------------------------------------------------------ MAT.RELF
pairs = [(i, j) for i in range(3) for j in range(3)]
refl = sum(1 for mask in range(2 ** 9) if all((mask >> pairs.index((i, i))) & 1 for i in range(3)))
assert refl == 2 ** 6 == 64
intq("relf_reflexive", "MAT.RELF",
     "The number of reflexive relations on a set of $3$ elements is",
     64,
     "A relation is a subset of the $9$ ordered pairs. Reflexivity forces the $3$ pairs $(a,a)$ in; each of the other $6$ pairs is free: $2^6=64$.", diff="M")

n4 = 4
pr = [(i, j) for i in range(n4) for j in range(n4)]
idx = {p: k for k, p in enumerate(pr)}
eq = 0
for mask in range(2 ** 16):
    R = lambda i, j: (mask >> idx[(i, j)]) & 1
    if not all(R(i, i) for i in range(n4)):
        continue
    if any(R(i, j) != R(j, i) for i in range(n4) for j in range(i)):
        continue
    if all(not (R(i, j) and R(j, k)) or R(i, k) for i in range(n4) for j in range(n4) for k in range(n4)):
        eq += 1
assert eq == 15
intq("relf_equiv", "MAT.RELF",
     "The number of equivalence relations on a set with $4$ elements is",
     15,
     "Equivalence relations correspond to partitions of the set: $1$ block ($1$) $+$ $2$ blocks ($\\binom41{+}\\binom42/2=4+3=7$) $+$ $3$ blocks ($\\binom42=6$) "
     "$+$ $4$ blocks ($1$): $1+7+6+1=15$ (the Bell number $B_4$). Confirmed by exhaustive check of all $2^{16}$ relations.", diff="H")

Z = range(-50, 51)
f_ = lambda n: 2 * n + 1
img = {f_(n) for n in Z}
assert len(img) == len(list(Z)) and 2 not in img and 0 not in img
scq("relf_inj", "MAT.RELF",
    "The function $f:\\mathbb Z\\to\\mathbb Z$, $f(n)=2n+1$, is",
    "one-one but not onto", ["onto but not one-one", "both one-one and onto", "neither one-one nor onto"],
    "$2n_1+1=2n_2+1\\Rightarrow n_1=n_2$: one-one. The image consists only of odd integers, so even integers such as $0$ have no pre-image: not onto.",
    diff="E")

fv = lambda x: x * x - 2 * x + 4
assert fv(1) == 3 and all(fv(x / 10) < fv(x / 10 + 0.1) for x in range(10, 100))
finv7 = 1 + math.sqrt(7 - 3)
assert fv(finv7) == 7 and finv7 == 3
intq("relf_inverse", "MAT.RELF",
     "Let $f:[1,\\infty)\\to[3,\\infty)$ be given by $f(x)=x^2-2x+4$, which is a bijection. The value of $f^{-1}(7)$ is",
     3,
     "$f(x)=(x-1)^2+3$. Setting $(x-1)^2+3=7\\Rightarrow x-1=\\pm2$; the domain $x\\ge1$ picks $x=3$. Check: $f(3)=9-6+4=7$.", diff="M")

S = range(1, 7)
cnt = sum(1 for a in S for b in S if (a - b) % 3 == 0)
assert cnt == 12
intq("relf_mod3", "MAT.RELF",
     "On $\\{1,2,3,4,5,6\\}$ define $R=\\{(a,b): a-b\\text{ is divisible by }3\\}$. The number of ordered pairs in $R$ is",
     12,
     "$R$ is an equivalence relation with classes $\\{1,4\\},\\{2,5\\},\\{3,6\\}$. Each class of size $2$ contributes $2^2=4$ pairs: $3\\times4=12$.", diff="M")


# ------------------------------------------------------------------ MAT.LP
def lp(cons, obj, maximize=True):
    """cons: list of (a, b, c, '<=' or '>=') meaning a x + b y (op) c ; x,y>=0 added. Return (best value, vertices)."""
    lines = [(F(a), F(b), F(c)) for a, b, c, _ in cons] + [(F(1), F(0), F(0)), (F(0), F(1), F(0))]
    allc = [(F(a), F(b), F(c), op) for a, b, c, op in cons] + [(F(1), F(0), F(0), ">="), (F(0), F(1), F(0), ">=")]
    verts = set()
    for (a1, b1, c1), (a2, b2, c2) in itertools.combinations(lines, 2):
        det = a1 * b2 - a2 * b1
        if det == 0:
            continue
        x = (c1 * b2 - c2 * b1) / det
        y = (a1 * c2 - a2 * c1) / det
        if all((a * x + b * y <= c) if op == "<=" else (a * x + b * y >= c) for a, b, c, op in allc):
            verts.add((x, y))
    vals = {v: obj[0] * v[0] + obj[1] * v[1] for v in verts}
    best = (max if maximize else min)(vals.values())
    return best, verts, vals


def brute(cons, obj, maximize=True, grid=range(0, 41)):
    best = None
    for x in grid:
        for y in grid:
            if all((a * x + b * y <= c) if op == "<=" else (a * x + b * y >= c) for a, b, c, op in cons):
                z = obj[0] * x + obj[1] * y
                best = z if best is None else (max(best, z) if maximize else min(best, z))
    return best


def solve_all(cons, obj, maximize, grid):
    best, verts, vals = lp(cons, obj, maximize)
    assert all(v[0].denominator == 1 and v[1].denominator == 1 for v in verts), "integral vertices needed for brute check"
    assert best == brute(cons, obj, maximize, grid), "corner-point optimum disagrees with lattice brute force"
    txt = ", ".join(f"$({v[0]},{v[1]})\\to{z}$" for v, z in sorted(vals.items()))
    return int(best), verts, txt


G = range(0, 61)
c1 = [(1, 2, 10, "<="), (3, 1, 15, "<="), (1, 1, 8, "<=")]
best, verts, txt = solve_all(c1, (3, 2), True, G)
intq("lp_max1", "MAT.LP",
     "Maximise $Z=3x+2y$ subject to $x+2y\\le10$, $3x+y\\le15$, $x+y\\le8$, $x,y\\ge0$. The maximum value of $Z$ is",
     best,
     "Corner points of the feasible region (intersections of boundary lines satisfying every constraint) with $Z$ at each: " + txt +
     f". The maximum is ${best}$ (Corner Point Theorem). A lattice search over all feasible integer points gives the same value.",
     diff="M")

c2 = [(1, 1, 7, ">="), (1, 3, 9, ">="), (2, 1, 8, ">=")]
best, verts, txt = solve_all(c2, (5, 4), False, G)
intq("lp_min1", "MAT.LP",
     "Minimise $Z=5x+4y$ subject to $x+y\\ge7$, $x+3y\\ge9$, $2x+y\\ge8$, $x,y\\ge0$. The minimum value of $Z$ is",
     best,
     "The region is unbounded, but $Z$ has positive coefficients so the minimum is at a corner. Corners and values: " + txt +
     f". Minimum $={best}$. (A lattice search agrees.)", diff="M")

c3 = [(2, 1, 100, "<="), (1, 2, 80, "<="), (1, 1, 60, "<=")]
best, verts, txt = solve_all(c3, (40, 50), True, range(0, 101))
wrong = [w for w in (2400, 2000, 2800, 2100, 1900) if w != best][:3]
scq("lp_profit", "MAT.LP",
    "A factory makes products P and Q. P needs $2$ h on machine 1 and $1$ h on machine 2; Q needs $1$ h on machine 1 and $2$ h on machine 2. "
    "Machine 1 is available $100$ h and machine 2 $80$ h per week, and at most $60$ units in total can be packed. Profit is $\\mathrm{Rs}\\,40$ per P and "
    "$\\mathrm{Rs}\\,50$ per Q. The maximum weekly profit is",
    f"$\\mathrm{{Rs}}\\,{best}$", [f"$\\mathrm{{Rs}}\\,{w}$" for w in wrong],
    "Let $x$ = units of P and $y$ = units of Q: maximise $40x+50y$ with $2x+y\\le100$, $x+2y\\le80$, $x+y\\le60$, $x,y\\ge0$. Corner values: " + txt +
    f". Maximum profit $=\\mathrm{{Rs}}\\,{best}$.", diff="M")

c4 = [(1, 2, 10, "<="), (1, 0, 8, "<=")]
best, verts, txt = solve_all(c4, (2, 4), True, G)
assert best == 20
intq("lp_multiple", "MAT.LP",
     "Maximise $Z=2x+4y$ subject to $x+2y\\le10$, $x\\le8$, $x,y\\ge0$. The maximum value of $Z$ is",
     best,
     "Since $Z=2(x+2y)$ is parallel to the constraint $x+2y\\le10$, $Z\\le20$, and $20$ is attained at every point of the segment from $(0,5)$ to $(8,1)$: "
     "multiple optimal solutions. Corners and values: " + txt + ".", diff="H", skills=("conceptual", "calculation"))

c5 = [(1, 1, 5, ">="), (1, 0, 4, "<="), (0, 1, 4, "<=")]
_, vv, _v = lp(c5, (1, 1), False)
assert sorted(vv) == [(1, 4), (4, 1), (4, 4)]
intq("lp_corners", "MAT.LP",
     "The feasible region of $x+y\\ge5$, $x\\le4$, $y\\le4$, $x,y\\ge0$ is a polygon. The number of its corner points is",
     3,
     "The line $x+y=5$ meets $x=4$ at $(4,1)$ and $y=4$ at $(1,4)$ (it would meet the axes at $(5,0)$ and $(0,5)$, but those violate $x\\le4$, $y\\le4$). "
     "With $(4,4)$ the feasible region is the triangle with vertices $(4,1),(4,4),(1,4)$: $3$ corner points.", diff="E")

c6 = [(1, 1, 4, "<="), (1, 3, 6, "<=")]
best, verts, txt = solve_all(c6, (1, 1), True, G)
intq("lp_max2", "MAT.LP",
     "Maximise $Z=x+y$ subject to $x+y\\le4$, $x+3y\\le6$, $x,y\\ge0$. The maximum value of $Z$ is",
     best,
     "The objective equals the left side of the first constraint, so $Z\\le4$; it is attained e.g. at $(4,0)$ and $(3,1)$ (both feasible), so $Z_{max}=4$. "
     "Corners: " + txt + ".", diff="M")
