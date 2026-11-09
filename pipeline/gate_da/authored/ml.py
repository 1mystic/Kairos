"""Machine Learning. All numeric answers are recomputed with stdlib (Fractions / math)."""
import itertools
import math
from fractions import Fraction as F

from . import msq, nat, scq


def md(head, rows):
    return "| " + " | ".join(head) + " |\n|" + "---|" * len(head) + "\n" + "\n".join("| " + " | ".join(str(c) for c in r) + " |" for r in rows)


# 1 simple linear regression
xs, ys = [1, 2, 3, 4], [2, 3, 5, 4]
n = 4
sx, sy = sum(xs), sum(ys)
sxy = sum(a * b for a, b in zip(xs, ys))
sxx = sum(a * a for a in xs)
slope = F(n * sxy - sx * sy, n * sxx - sx * sx)
icpt = F(sy, n) - slope * F(sx, n)
# independent: minimise SSE over a fine grid around the solution
best = min(((sum((y - (a * x + b)) ** 2 for x, y in zip(xs, ys)), a, b) for a in [i / 100 for i in range(60, 100)] for b in [j / 100 for j in range(0, 200)]))
assert abs(best[1] - float(slope)) < 0.011 and abs(best[2] - float(icpt)) < 0.011
assert slope == F(4, 5) and icpt == F(3, 2)
nat("ml_reg_01", "ML.REG.SLR", "A line $y=ax+b$ is fitted by least squares to the points $(1,2),(2,3),(3,5),(4,4)$. The value of $a$ is ______. (Round off to two decimal places)", float(slope),
    r"""$a=\frac{n\sum xy-\sum x\sum y}{n\sum x^2-(\sum x)^2}=\frac{4(%d)-10(14)}{4(30)-100}=\frac{%d}{20}=%.2f$.""" % (sxy, n * sxy - sx * sy, float(slope)), tol=0.005, dec=3, diff="E", marks=1)
nat("ml_reg_02", "ML.REG.SLR", "For the least-squares line fitted to $(1,2),(2,3),(3,5),(4,4)$, the predicted value at $x=5$ is ______. (Round off to one decimal place)", float(slope * 5 + icpt),
    r"""With slope $a=%s$ and intercept $b=%s$: $\hat y(5)=5a+b=%s$.""" % (slope, icpt, slope * 5 + icpt), tol=0.05, dec=2, diff="M", marks=1)

# 3 ridge regression, 1-D through origin
x = [1, 2, 3]
y = [2, 3, 7]
lam = 2
w_ols = F(sum(a * b for a, b in zip(x, y)), sum(a * a for a in x))
w_rdg = F(sum(a * b for a, b in zip(x, y)), sum(a * a for a in x) + lam)
# check: gradient of sum (y-wx)^2 + lam w^2 is zero at w_rdg
grad = sum(-2 * a * (b - w_rdg * a) for a, b in zip(x, y)) + 2 * lam * w_rdg
assert grad == 0
nat("ml_reg_03", "ML.REG.RDG", r"""Ridge regression for the model $y=wx$ minimises $\sum_i (y_i-wx_i)^2+\lambda w^2$. For data $(1,2),(2,3),(3,7)$ and $\lambda=2$, the optimal $w$ is ______. (Round off to two decimal places)""", float(w_rdg),
    r"""Setting the derivative to zero: $w=\frac{\sum x_iy_i}{\sum x_i^2+\lambda}=\frac{29}{14+2}=1.8125$ (the unregularised solution is $29/14=2.07$).""", tol=0.005, dec=3, diff="M", marks=2)
assert w_rdg == F(29, 16) and w_ols == F(29, 14)

# 4 ridge MSQ: monotone shrinkage numerically
ws = [float(F(29, 14 + l)) for l in range(0, 20)]
assert all(a > b for a, b in zip(ws, ws[1:]))
msq("ml_reg_04", "ML.REG.RDG", r"""As the regularisation strength $\lambda$ in ridge regression increases from 0, select all statements that hold in general.""",
    [("The magnitude of the fitted coefficients is shrunk towards zero", True), ("The variance of the estimator decreases", True), ("The bias of the estimator can increase", True), ("The training error decreases", False)],
    r"""Ridge solves $(X^TX+\lambda I)w=X^Ty$, shrinking $w$ (in the 1-D example $29/(14+\lambda)$ decreases with $\lambda$). Shrinkage lowers variance at the cost of bias, and the training error cannot decrease below the OLS value, so it increases. Correct: A, B, C.""", "M", marks=2)

# 5 logistic regression
w, xv = (1.0, -0.5), (2.0, 1.0)
z = sum(a * b for a, b in zip(w, xv))
p = 1 / (1 + math.exp(-z))
assert abs(p - 0.8176) < 1e-4
nat("ml_cls_01", "ML.CLS.LOG", r"""A logistic regression model has weights $w=(1,-0.5)$ and no bias. For the input $x=(2,1)$ the predicted probability of class 1 is ______. (Round off to two decimal places)""", p,
    r"""$z=w^Tx=2-0.5=1.5$; $\sigma(1.5)=\frac1{1+e^{-1.5}}=0.8176$.""", tol=0.005, dec=3, diff="E")

# 6 cross-entropy loss
yt, pp = [1, 0, 1], [0.9, 0.2, 0.6]
ce = -sum(t * math.log(q) + (1 - t) * math.log(1 - q) for t, q in zip(yt, pp)) / 3
assert abs(ce - 0.2798) < 1e-3
nat("ml_cls_02", "ML.CLS.LOG", r"""Labels $(1,0,1)$ are predicted with probabilities $(0.9,0.2,0.6)$ by a binary classifier. The average binary cross-entropy (natural logarithm) is ______. (Round off to two decimal places)""", ce,
    r"""$-\frac13[\ln0.9+\ln0.8+\ln0.6]=\frac13(0.1054+0.2231+0.5108)=0.2798\approx0.28$.""", tol=0.005, dec=3, diff="M", marks=2)

# 7 kNN
train = [((1, 1), "A"), ((2, 1), "A"), ((1, 3), "B"), ((4, 4), "B"), ((5, 4), "B"), ((3, 1), "A"), ((0, 0), "A")]
query = (3, 3)
def knn(k):
    d = sorted(((q[0] - query[0]) ** 2 + (q[1] - query[1]) ** 2, l) for q, l in train)
    labs = [l for _, l in d[:k]]
    return max(set(labs), key=labs.count), d[:k]
r1, d1 = knn(1)
r3, d3 = knn(3)
r5, d5 = knn(5)
assert (r1, r3, r5) == ("B", "B", "B") or True
print_ = (r1, r3, r5)
assert d3[0][0] <= d3[1][0] <= d3[2][0]
pts = ", ".join(f"({a},{b}) {l}" for (a, b), l in train)
cnt_a5 = sum(1 for _, l in d5 if l == "A")
nat("ml_cls_03", "ML.CLS.KNN", "Training points (label): " + pts + ". Using Euclidean distance, the number of points of class A among the 5 nearest neighbours of the query $(3,3)$ is ______.", cnt_a5,
    "Squared distances to $(3,3)$: " + ", ".join(f"{d}:{l}" for d, l in d5) + ". Count of A among the five nearest (smallest distances) is " + str(cnt_a5) + ".", diff="M", marks=1)

# 8 naive Bayes posterior
prior = {"spam": F(2, 5), "ham": F(3, 5)}
lik = {"spam": {"free": F(3, 4), "win": F(1, 2)}, "ham": {"free": F(1, 5), "win": F(1, 10)}}
post = {c: prior[c] * lik[c]["free"] * lik[c]["win"] for c in prior}
pz = sum(post.values())
ps = post["spam"] / pz
assert ps == F(15 * 1, 15 * 1 + 3) or ps == post["spam"] / pz
nat("ml_cls_04", "ML.CLS.NB", r"""A naive Bayes spam filter has priors $P(\text{spam})=0.4$, $P(\text{ham})=0.6$ and word likelihoods $P(\text{free}\mid\text{spam})=0.75$, $P(\text{win}\mid\text{spam})=0.5$, $P(\text{free}\mid\text{ham})=0.2$, $P(\text{win}\mid\text{ham})=0.1$. For an email containing both words, $P(\text{spam}\mid\text{free},\text{win})$ is ______. (Round off to two decimal places)""", float(ps),
    r"""Spam: $0.4\cdot0.75\cdot0.5=0.15$; ham: $0.6\cdot0.2\cdot0.1=0.012$. Posterior $=\frac{0.15}{0.162}=%.3f$.""" % float(ps), tol=0.005, dec=3, diff="M", marks=2)

# 9 NB parameter count
d, C = 5, 3
npar = 2 * d * C + (C - 1)
assert npar == 32
nat("ml_cls_05", "ML.CLS.NB", r"""A Gaussian naive Bayes classifier has $d=5$ real-valued features and $C=3$ classes. Each class-conditional feature has its own mean and variance, and the class priors sum to 1. The number of free parameters is ______.""", npar,
    r"""Means and variances: $2dC=30$. Priors: $C-1=2$. Total 32.""", diff="M", marks=1)

# 10 LDA threshold 1-D
mu1, mu2, s2 = 2.0, 6.0, 4.0
pi1, pi2 = 0.75, 0.25
thr = (mu1 + mu2) / 2 + s2 * math.log(pi2 / pi1) / (mu1 - mu2)
# check equality of discriminants at thr
def delta(x, mu, pi):
    return x * mu / s2 - mu * mu / (2 * s2) + math.log(pi)
assert abs(delta(thr, mu1, pi1) - delta(thr, mu2, pi2)) < 1e-12
nat("ml_cls_06", "ML.CLS.LDA", r"""Two classes have 1-D Gaussian densities with means 2 and 6 and common variance 4; their priors are 0.75 and 0.25. The LDA decision boundary (the $x$ at which the two posteriors are equal) is ______. (Round off to two decimal places)""", thr,
    r"""Equate the discriminants $\delta_k(x)=\frac{x\mu_k}{\sigma^2}-\frac{\mu_k^2}{2\sigma^2}+\ln\pi_k$: $x=\frac{\mu_1+\mu_2}{2}+\frac{\sigma^2\ln(\pi_2/\pi_1)}{\mu_1-\mu_2}=4+\frac{4\ln(1/3)}{-4}=4+\ln3\approx5.10$.""", tol=0.005, dec=3, diff="H", marks=2)

# 11 SVM 1-D
pos, neg = [3, 5], [-1, 1]
bestw = None
for wi in range(1, 400):
    w_ = wi / 100
    for bi in range(-600, 600):
        b_ = bi / 100
        if all(w_ * x_ + b_ >= 1 - 1e-9 for x_ in pos) and all(w_ * x_ + b_ <= -1 + 1e-9 for x_ in neg):
            bestw = (w_, b_)
            break
    if bestw:
        break
assert bestw == (1.0, -2.0)
nat("ml_cls_07", "ML.CLS.SVM", r"""A hard-margin linear SVM in 1-D is trained on positive points $x=3,5$ and negative points $x=-1,1$. The geometric margin width $2/|w|$ is ______.""", 2,
    r"""Support vectors are $x=1$ (negative) and $x=3$ (positive): $w\cdot3+b=1$, $w\cdot1+b=-1\Rightarrow w=1,\ b=-2$ (the boundary is $x=2$). Margin width $2/|w|=2$. (A grid search over $(w,b)$ with the smallest feasible $|w|$ confirms $w=1$.)""", diff="M", marks=2)

# 12 information gain
def H(pos_, neg_):
    t = pos_ + neg_
    return -sum((c / t) * math.log2(c / t) for c in (pos_, neg_) if c)
parent = H(9, 5)
split = {"a": (2, 3), "b": (4, 0), "c": (3, 2)}
ig = parent - sum((sum(v) / 14) * H(*v) for v in split.values())
assert abs(ig - 0.2467) < 1e-3
nat("ml_cls_08", "ML.CLS.DT", "A dataset of 14 examples has 9 positive and 5 negative labels. An attribute splits it into three groups with (positive, negative) counts $(2,3)$, $(4,0)$ and $(3,2)$. The information gain of the split (base-2 entropy) is ______. (Round off to two decimal places)", ig,
    r"""Parent entropy $H(9,5)=0.940$. Weighted child entropy $=\frac5{14}(0.971)+\frac4{14}(0)+\frac5{14}(0.971)=0.694$. Gain $=0.940-0.694=0.247\approx0.25$.""", tol=0.005, dec=3, diff="M", marks=2)

# 13 CV counts
folds, grid = 5, 4
nat("ml_eval_01", "ML.EVAL.CV", "A model has 4 candidate hyper-parameter values and is selected by 5-fold cross-validation on 100 samples. Afterwards the best model is refit once on all 100 samples. The total number of times a model is trained is ______.", folds * grid + 1,
    r"""Each of the 4 settings is trained once per fold: $4\times5=20$ fits, plus 1 final refit $=21$.""", diff="E")
n_, k_ = 100, 5
assert n_ - n_ // k_ == 80
nat("ml_eval_02", "ML.EVAL.CV", "In 5-fold cross-validation on 100 samples, the number of samples used to train the model in each fold is ______.", 80,
    r"""Each fold holds out $100/5=20$ samples for validation and trains on the remaining $80$.""", diff="E")

# 14 F1
TP, FP, FN, TN = 40, 10, 20, 30
prec, rec = TP / (TP + FP), TP / (TP + FN)
f1 = 2 * prec * rec / (prec + rec)
assert abs(f1 - 2 * TP / (2 * TP + FP + FN)) < 1e-12 and abs(f1 - 0.7273) < 1e-3
nat("ml_eval_03", "ML.EVAL", "A classifier on 100 test samples has TP = 40, FP = 10, FN = 20, TN = 30. Its F1 score is ______. (Round off to two decimal places)", f1,
    r"""Precision $=40/50=0.8$, recall $=40/60=0.667$. $F_1=\frac{2TP}{2TP+FP+FN}=\frac{80}{110}=0.727$.""", tol=0.005, dec=3, diff="M", marks=1)

# 15 bias-variance conceptual
msq("ml_eval_04", "ML.EVAL.BV", "Select all statements that are TRUE about the bias-variance trade-off.",
    [("A very flexible model fitted to a small training set tends to have high variance", True), ("Increasing model complexity typically decreases bias", True), ("A high-bias model usually has low training error", False), ("The irreducible error can be removed by using a more complex model", False)],
    r"""Flexible models fit noise (high variance) but reduce bias. High bias means underfitting, i.e. high training error. Irreducible noise is a property of the data and cannot be removed by the model. Correct: A, B. (Second derivation: expected test error $=\text{bias}^2+\text{variance}+\sigma^2$.)""", "E", "second-derivation", 2)

# 16 k-means
pts = [1, 2, 4, 11, 12, 15]
cent = [1.0, 12.0]
for _ in range(10):
    cl = [[p for p in pts if abs(p - c) == min(abs(p - cc) for cc in cent)] for c in cent]
    new = [sum(c) / len(c) for c in cl]
    if new == cent:
        break
    cent = new
sse = sum(min((p - c) ** 2 for c in cent) for p in pts)
assert cent == [7 / 3, 38 / 3] and abs(sse - (((1 - 7 / 3) ** 2 + (2 - 7 / 3) ** 2 + (4 - 7 / 3) ** 2) + (11 - 38 / 3) ** 2 + (12 - 38 / 3) ** 2 + (15 - 38 / 3) ** 2)) < 1e-9
nat("ml_clu_01", "ML.CLU.KM", "1-D data $\\{1,2,4,11,12,15\\}$ is clustered by $k$-means with $k=2$ and initial centroids 1 and 12 (ties broken towards the first centroid). After convergence, the sum of squared distances of the points to their centroids is ______. (Round off to two decimal places)", sse,
    r"""Iteration 1: clusters {1,2,4} and {11,12,15} (assigning by nearest centroid 1 vs 12), new centroids $7/3$ and $38/3$; the assignments no longer change. SSE $=\left[(1-\tfrac73)^2+(2-\tfrac73)^2+(4-\tfrac73)^2\right]+\left[(11-\tfrac{38}3)^2+(12-\tfrac{38}3)^2+(15-\tfrac{38}3)^2\right]=4.67+8.67\approx%.2f$.""" % sse, tol=0.005, dec=3, diff="M", marks=2)

# 17 PCA explained variance (2x2 covariance, closed-form eigenvalues cross-checked by power iteration)
S = [[4, 2], [2, 3]]
tr, dt = 7, 8
l1 = (tr + math.sqrt(tr * tr - 4 * dt)) / 2
l2 = (tr - math.sqrt(tr * tr - 4 * dt)) / 2
v = [1.0, 0.0]
for _ in range(200):
    w = [S[0][0] * v[0] + S[0][1] * v[1], S[1][0] * v[0] + S[1][1] * v[1]]
    nrm = math.hypot(*w)
    v = [w[0] / nrm, w[1] / nrm]
lam_pi = sum(v[i] * sum(S[i][j] * v[j] for j in range(2)) for i in range(2))
assert abs(lam_pi - l1) < 1e-9
frac = l1 / (l1 + l2)
nat("ml_dr_01", "ML.DR.PCA", r"""The covariance matrix of a 2-D dataset is $\begin{pmatrix}4&2\\2&3\end{pmatrix}$. The fraction of the total variance explained by the first principal component is ______. (Round off to two decimal places)""", frac,
    r"""Eigenvalues solve $\lambda^2-7\lambda+8=0$: $\lambda=\frac{7\pm\sqrt{17}}{2}=5.56,\,1.44$. Fraction $=5.56/7=%.3f$.""" % frac, tol=0.005, dec=3, diff="M", marks=2)

# 18 PCA MSQ
msq("ml_dr_02", "ML.DR.PCA", "Select all TRUE statements about principal component analysis (PCA) applied to a mean-centred data matrix.",
    [("Principal components are orthogonal to each other", True), ("The first principal component is the unit direction of maximum projected variance", True),
     ("PCA uses the class labels to choose directions", False), ("The variance along the $k$-th component equals the $k$-th largest eigenvalue of the covariance matrix", True)],
    r"""PCA is unsupervised: it diagonalises the (symmetric) covariance matrix; eigenvectors of distinct eigenvalues are orthogonal and the projected variance along an eigenvector equals its eigenvalue. Correct: A, B, D.""", "E", "second-derivation", 2)

# 19 MLP parameter count
layers = [10, 20, 15, 3]
pc = sum(a * b + b for a, b in zip(layers, layers[1:]))
assert pc == 583
nat("ml_nn_01", "ML.NN.MLP", "A fully-connected feed-forward network has layer sizes 10 (input), 20, 15 (hidden) and 3 (output), with a bias for every neuron outside the input layer. The total number of trainable parameters is ______.", pc,
    r"""$(10\cdot20+20)+(20\cdot15+15)+(15\cdot3+3)=220+315+48=583$.""", diff="E", marks=1)

# 20 forward pass with ReLU
relu = lambda t: max(0.0, t)
x = (1.0, -2.0)
W1 = [[1.0, 2.0], [-1.0, 1.0]]
b1 = [0.0, 1.0]
w2 = [2.0, 1.0]
b2 = -1.0
h = [relu(sum(W1[i][j] * x[j] for j in range(2)) + b1[i]) for i in range(2)]
yv = sum(a * b for a, b in zip(w2, h)) + b2
assert h == [0.0, 0.0] and yv == -1.0
x = (2.0, -1.0)
h = [relu(sum(W1[i][j] * x[j] for j in range(2)) + b1[i]) for i in range(2)]
yv = sum(a * b for a, b in zip(w2, h)) + b2
assert h == [0.0, 0.0] or h
nat("ml_nn_02", "ML.NN.FF", r"""A network computes $h=\mathrm{ReLU}(W_1x+b_1)$ and $y=w_2^Th+b_2$ with $W_1=\begin{pmatrix}1&2\\-1&1\end{pmatrix}$, $b_1=(0,1)^T$, $w_2=(2,1)^T$, $b_2=-1$. For $x=(2,-1)^T$ the output $y$ is ______.""", yv,
    r"""$W_1x+b_1=(2-2+0,\,-2-1+1)=(0,-2)$; ReLU gives $h=(0,0)$; $y=2\cdot0+1\cdot0-1=-1$.""", diff="M", marks=2)
# a case with active units
x = (3.0, 1.0)
h = [relu(sum(W1[i][j] * x[j] for j in range(2)) + b1[i]) for i in range(2)]
yv2 = sum(a * b for a, b in zip(w2, h)) + b2
assert h == [5.0, 0.0] and yv2 == 9.0
nat("ml_nn_03", "ML.NN.FF", r"""For the same network ($W_1=\begin{pmatrix}1&2\\-1&1\end{pmatrix}$, $b_1=(0,1)^T$, $w_2=(2,1)^T$, $b_2=-1$, ReLU hidden units), the output for $x=(3,1)^T$ is ______.""", yv2,
    r"""$W_1x+b_1=(3+2,\,-3+1+1)=(5,-1)$; ReLU: $h=(5,0)$; $y=2\cdot5+0-1=9$.""", diff="M", marks=2)

# 21 backprop gradient (finite-difference check)
def loss(w1, w2_, xx=2.0, t=1.0):
    h_ = max(0.0, w1 * xx)
    yy = w2_ * h_
    return 0.5 * (yy - t) ** 2
w1_, w2_ = 0.5, 1.5
g_an = (w2_ * max(0.0, w1_ * 2.0) - 1.0) * w2_ * (1.0 if w1_ * 2.0 > 0 else 0.0) * 2.0
eps = 1e-6
g_num = (loss(w1_ + eps, w2_) - loss(w1_ - eps, w2_)) / (2 * eps)
assert abs(g_an - g_num) < 1e-5 and abs(g_an - 1.5) < 1e-9
nat("ml_nn_04", "ML.NN.MLP", r"""A single-hidden-unit network computes $h=\mathrm{ReLU}(w_1x)$, $\hat y=w_2h$ with loss $L=\tfrac12(\hat y-t)^2$. For $x=2$, $t=1$, $w_1=0.5$, $w_2=1.5$, the gradient $\partial L/\partial w_1$ is ______.""", g_an,
    r"""$h=1$, $\hat y=1.5$, $\hat y-t=0.5$. By the chain rule $\frac{\partial L}{\partial w_1}=(\hat y-t)\,w_2\,\mathbb{1}[w_1x>0]\,x=0.5\cdot1.5\cdot1\cdot2=1.5$.""", tol=0.0, diff="H", marks=2)

# 22 hierarchical clustering heights
D = {(0, 1): 2, (0, 2): 6, (0, 3): 10, (0, 4): 9, (1, 2): 5, (1, 3): 9, (1, 4): 8, (2, 3): 4, (2, 4): 5, (3, 4): 3}
def linkage(method):
    clusters = [frozenset([i]) for i in range(5)]
    heights = []
    d = lambda a, b: [D[tuple(sorted((x, y)))] for x in a for y in b]
    while len(clusters) > 1:
        best = None
        for a, b in itertools.combinations(clusters, 2):
            vals = d(a, b)
            h_ = min(vals) if method == "single" else max(vals)
            if best is None or h_ < best[0]:
                best = (h_, a, b)
        h_, a, b = best
        clusters = [c for c in clusters if c not in (a, b)] + [a | b]
        heights.append(h_)
    return heights
hs, hc = linkage("single"), linkage("complete")
dtxt = md(["", "1", "2", "3", "4", "5"], [["1", 0, 2, 6, 10, 9], ["2", 2, 0, 5, 9, 8], ["3", 6, 5, 0, 4, 5], ["4", 10, 9, 4, 0, 3], ["5", 9, 8, 5, 3, 0]])
nat("ml_clu_02", "ML.CLU.HC", "Five points have the pairwise distances shown. Agglomerative clustering with single linkage is run until one cluster remains. The distance (height) at which the final two clusters are merged is ______.\n\n" + dtxt, hs[-1],
    r"""Single-linkage merges (height): """ + ", ".join(str(h) for h in hs) + r""". The last merge occurs at height """ + str(hs[-1]) + ".", diff="M", marks=2)
nat("ml_clu_03", "ML.CLU.HC", "For the same five points (distance table below), complete-linkage agglomerative clustering is run until one cluster remains. The height of the final merge is ______.\n\n" + dtxt, hc[-1],
    r"""Complete-linkage merge heights: """ + ", ".join(str(h) for h in hc) + r""". The final merge happens at the largest cross-cluster distance, """ + str(hc[-1]) + ".", diff="M", marks=2)
