"""Extra conceptual items for thinly covered chapters (second-derivation unless a code check is shown)."""
import math
import random

from . import msq, nat, scq

# CLT
rnd = random.Random(3)
means = [sum(rnd.expovariate(1.0) for _ in range(50)) / 50 for _ in range(4000)]
m = sum(means) / len(means)
sd = (sum((x - m) ** 2 for x in means) / len(means)) ** 0.5
assert abs(m - 1) < 0.02 and abs(sd - 1 / math.sqrt(50)) < 0.01
scq("x_clt_01", "PRS.CLT", r"""$X_1,\ldots,X_{50}$ are i.i.d. exponential with mean 1 (variance 1). By the Central Limit Theorem, the sample mean $\bar X$ is approximately normal with""", r"mean 1 and standard deviation $1/\sqrt{50}$", [r"mean 1 and standard deviation $1$", r"mean $1/50$ and standard deviation $1/\sqrt{50}$", r"mean 50 and standard deviation $\sqrt{50}$"],
    r"""$E[\bar X]=\mu=1$ and $\mathrm{sd}(\bar X)=\sigma/\sqrt n=1/\sqrt{50}\approx0.141$. (A simulation of 4000 sample means gave mean 1.00 and sd 0.14.)""", "E", "recomputed-by-code (simulation)", 1)
msq("x_clt_02", "PRS.CLT", r"""Select all statements that are consequences of the Central Limit Theorem for i.i.d. samples with finite mean $\mu$ and variance $\sigma^2>0$.""",
    [(r"The standardised sample mean $\sqrt n(\bar X-\mu)/\sigma$ converges in distribution to $N(0,1)$", True), (r"The individual observations $X_i$ become normally distributed as $n$ grows", False),
     (r"The standard deviation of $\bar X$ decreases like $1/\sqrt n$", True), (r"The result requires the $X_i$ to be normally distributed", False)],
    r"""The CLT concerns the distribution of the (standardised) mean, not of individual observations, and needs no normality assumption; $\mathrm{sd}(\bar X)=\sigma/\sqrt n$. Correct: A, C.""", "E", "second-derivation", 2)

# Taylor
scq("x_tay_01", "CO.TAY", r"""The second-order Taylor polynomial of $f(x)=\ln(1+x)$ about $x=0$, evaluated at $x=0.2$, is""", "0.18", ["0.20", "0.22", "0.16"],
    r"""$\ln(1+x)\approx x-\frac{x^2}{2}$, so at $x=0.2$: $0.2-0.02=0.18$ (true value $0.1823$).""", "E", "recomputed-by-code", 1)
assert abs(0.2 - 0.2 ** 2 / 2 - 0.18) < 1e-12 and abs(math.log(1.2) - 0.18) < 0.003
msq("x_tay_02", "CO.TAY", r"""Select all correct Maclaurin series statements.""",
    [(r"$e^x=1+x+\frac{x^2}{2!}+\cdots$", True), (r"$\cos x=1-\frac{x^2}{2!}+\frac{x^4}{4!}-\cdots$", True), (r"$\sin x=x-\frac{x^2}{2!}+\frac{x^3}{3!}-\cdots$", False), (r"$\frac1{1-x}=1+x+x^2+\cdots$ for $|x|<1$", True)],
    r"""$\sin x$ has only odd powers: $x-\frac{x^3}{3!}+\frac{x^5}{5!}-\cdots$, so C is wrong; the others are standard.""", "E", "second-derivation", 2)

# ER / DW / thin chapters
scq("x_er_01", "DBW.ER", "In an ER diagram, a weak entity set", "has no primary key of its own and depends on an owner entity set through an identifying relationship", ["always has a primary key of its own", "can exist without any owner entity", "is represented by a many-to-many relationship only"],
    "A weak entity is identified only by a partial key together with the key of its owner entity via an identifying relationship (total participation).", "E", "second-derivation", 1)
scq("x_dw_01", "DBW.DW.SCH", "In a star schema for a data warehouse,", "a central fact table is joined to denormalised dimension tables", ["dimension tables are linked to each other in a chain of normalised tables", "the fact table holds only descriptive text", "there is no fact table"],
    "A star schema has one central fact table (measures + foreign keys) and one denormalised table per dimension; normalised chains describe a snowflake schema.", "E", "second-derivation", 1)
msq("x_dw_02", "DBW.DW.HIER", "Select all correct statements about OLAP operations on a data cube.",
    [("Roll-up aggregates along a concept hierarchy, e.g. city to country", True), ("Drill-down moves to a finer level of detail", True), ("Slice fixes one dimension to a single value", True), ("Dice always reduces the number of dimensions by one", False)],
    "Roll-up and drill-down move up and down a hierarchy; slice selects one value of one dimension; dice selects a sub-cube by ranges on several dimensions without removing dimensions. Correct: A, B, C.", "E", "second-derivation", 2)

# LA thin
msq("x_vs_01", "LA.VS.LIN", r"""Select all true statements about vectors in $\mathbb{R}^3$.""",
    [("Any 4 vectors are linearly dependent", True), ("Any 2 vectors are linearly independent", False), ("Three vectors are a basis if and only if they are linearly independent", True), ("The zero vector can belong to a linearly independent set", False)],
    r"""$\dim\mathbb{R}^3=3$, so more than 3 vectors are dependent; two parallel vectors are dependent; 3 independent vectors span $\mathbb{R}^3$; a set containing 0 is dependent. Correct: A, C.""", "E", "second-derivation", 2)
scq("x_sys_01", "LA.SYS.SOL", r"""A homogeneous system $Ax=0$ with $A\in\mathbb{R}^{4\times6}$ of rank 4 has a solution space of dimension""", "2", ["0", "4", "6"],
    r"""Nullity $=n-\mathrm{rank}=6-4=2$.""", "E", "second-derivation", 1)

# ML thin
scq("x_clu_01", "ML.CLU.KM", "Which statement about $k$-means clustering is correct?", "The algorithm monotonically decreases the within-cluster sum of squares and may converge to a local optimum", ["It always finds the global optimum", "It requires labelled data", "It cannot be affected by the initial centroids"],
    "Each assignment and update step cannot increase the objective, so it converges, but only to a local optimum that depends on initialisation; it is unsupervised.", "E", "second-derivation", 1)
scq("x_dr_01", "ML.DR.PCA", "A dataset in $\\mathbb{R}^{10}$ is projected onto its first 3 principal components. The projected data has dimension", "3", ["10", "7", "13"],
    "Projection onto 3 principal directions gives a 3-dimensional representation.", "E", "second-derivation", 1)

# DESC
nat("x_desc_01", "PRS.DESC.CT", r"""The median of the data 7, 3, 9, 3, 12, 5 is ______.""", 6,
    r"""Sorted: 3, 3, 5, 7, 9, 12. Even count: median $=(5+7)/2=6$.""", diff="E")
assert sorted([7, 3, 9, 3, 12, 5])[2:4] == [5, 7]
xx_ = [1, 2, 3, 4]
yy_ = [2, 4, 5, 4]
mx_, my_ = sum(xx_) / 4, sum(yy_) / 4
sxy_ = sum((a - mx_) * (b - my_) for a, b in zip(xx_, yy_))
rr = sxy_ / math.sqrt(sum((a - mx_) ** 2 for a in xx_) * sum((b - my_) ** 2 for b in yy_))
assert abs(rr - 0.71818) < 1e-4
nat("x_desc_02", "PRS.DESC.COR", r"""For the pairs $(x,y)=(1,2),(2,4),(3,5),(4,4)$ the sample correlation coefficient is ______. (Round off to two decimal places)""", rr,
    r"""$\bar x=2.5,\bar y=3.75$; $S_{xy}=\sum(x-\bar x)(y-\bar y)=3.5$; $S_{xx}=5$, $S_{yy}=4.75$. $r=3.5/\sqrt{5\cdot4.75}=0.718$.""", tol=0.005, dec=3, diff="M", marks=2)
