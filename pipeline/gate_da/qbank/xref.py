r"""Manual self-containment fixes for the owner's workbook (all strings are RAW source LaTeX, before conversion).

STEM_FIX[id]    = [(old, new), ...]  replaces a "see Q<d>.<n>" reference by the referenced text (old must occur).
SOL_FIX[id]     = [(old, new), ...]  removes/rewrites references to other questions inside a worked solution.
DROP_FIG_CAPTION = ids whose in-stem [FIGURE]+caption block belongs to other questions (removed here, re-attached below).
VIRTUAL[id]     = raw preamble (figure + caption) prepended to a stem that refers to a figure defined in another record.
TABLE tokens    = {{TABLE:Qx.y}} is replaced by the first tabular of that record's stem.
"""

S26 = (r"MAX chooses among three actions, each leading to a chance node: $a_1$: 10 w.p. 0.5, 0 w.p. 0.5; "
       r"$a_2$: 20 w.p. 0.25, 2 w.p. 0.75; $a_3$: 6 w.p. 0.8, 4 w.p. 0.2.")
FILE20 = r"A file has 30\,000 fixed-length records of 100 bytes, stored unspanned in 1024-byte blocks"
BINS20 = r"$5,7,12,15,18,20,26,30,31,40,41,48$"
FIT21 = r"The least-squares line $y=\beta_0+\beta_1x$ is fitted to $(1,2),(2,4),(3,5),(4,4),(5,5)$."
FIG_G = "[FIGURE 1: figures/Q16_11_q_f1_ff5bef33.png]\n\nGraph $G$ (adjacency lists in alphabetical order)."
FIG_T3 = "[FIGURE 1: figures/Q26_08_q_f1_8c066a57.png]\n\nTree $\\mathcal T_3$: MAX, MIN, MAX, then leaves."
TAB_T = "{{TABLE:Q22.30}}\n\nTable $\\mathcal T$."
FIG_T2 = "[FIGURE 1: figures/Q26_15_q_f1_d165b8db.png]\n\nTree $\\mathcal T_2$."

STEM_FIX = {
    "Q1.31": [("In Q1.30, a person is tested twice",
               r"A disease affects 1\% of a population. A test detects it with probability 0.95 when present and gives a false positive "
               r"with probability 0.10 when absent. A person is tested twice")],
    "Q8.11": [("For the fit in Q8.10, the sum of squared residuals is",
               r"The least-squares line $y=C+Dt$ is fitted through $(0,6)$, $(1,0)$, $(2,0)$. The sum of squared residuals is")],
    "Q16.36": [("Prim's algorithm is run on the graph of Q16.33 starting from A.",
                "An undirected graph on A--E has edge weights AB 4, AC 1, BC 2, BD 5, CD 8, CE 10, DE 2, BE 6. "
                "Prim's algorithm is run on it starting from A.")],
    "Q19.02": [(r"For $F$ of Q19.01, the number",
                r"On $R(A,B,C,D,E,G)$ the set $F=\{A\to BC,\ C\to D,\ BD\to E,\ E\to G\}$ holds. The number")],
    "Q19.12": [(r"For $R$ and $\mathcal F$ of Q19.03, the number",
                r"On $R(A,B,C,D,E,F)$ let $\mathcal F=\{AB\to C,\ C\to D,\ D\to E,\ E\to B,\ AE\to F\}$. The number")],
    "Q19.29": [("Of the five decompositions in Q19.28, the number",
                r"$R(A,B,C,D)$ has $F=\{A\to B,\ B\to C,\ C\to D\}$. Of the decompositions "
                r"$\{AB,BCD\}$, $\{ABC,CD\}$, $\{AB,CD\}$, $\{AD,BCD\}$, $\{ABD,BC\}$, the number")],
    "Q20.02": [("For the file of Q20.01, an index entry", FILE20 + ". An index entry")],
    "Q20.03": [("The file of Q20.01 is sorted on its key, and a \\emph{sparse} primary index (one entry per data block) is built with the entry size of Q20.02.",
                FILE20 + ", and is sorted on its key. A \\emph{sparse} primary index (one entry per data block) is built; "
                "an index entry is a 9-byte search key and a 6-byte pointer.")],
    "Q20.04": [("A multilevel index is built on top of the sparse index of Q20.03 until",
                FILE20 + ", and is sorted on its key. A sparse primary index (one entry per data block; an entry is a 9-byte search key "
                "and a 6-byte pointer) is built, and a multilevel index is built on top of it until")],
    "Q20.10": [("With the sizes of Q20.09, each leaf",
                "A B$^+$ tree index is built on a key field. Node size is 2048 bytes, a node (child) pointer is 8 bytes, the key is 12 bytes "
                "and a data record pointer is 10 bytes. Each leaf")],
    "Q20.15": [("For the B-tree of Q20.14 (non-root nodes at least half full: at least 3 children; the root has at least 2 children), the maximum",
                "A B-tree of order 5 (at most 5 children, so at most 4 keys per node) stores 400 distinct keys. Non-root nodes are at least "
                "half full (at least 3 children) and the root has at least 2 children. The maximum")],
    "Q20.21": [("For the bins of Q20.20, smoothing",
                "The sorted data " + BINS20 + " is split into 3 equal-frequency (equal-depth) bins. Smoothing")],
    "Q20.22": [("The data of Q20.20 is split into 4", "The sorted data " + BINS20 + " is split into 4")],
    "Q21.02": [("For the fit of Q21.01, the coefficient", FIT21 + " The coefficient")],
    "Q21.03": [("For the fit of Q21.01, the unbiased", FIT21 + " The unbiased")],
    "Q21.09": [("the data of Q21.01", "the data $(1,2),(2,4),(3,5),(4,4),(5,5)$")],
    "Q22.13": [("Repeat Q22.12 with Laplace (add-one) smoothing on each conditional probability (each feature has 2 values; priors unsmoothed).",
                "{{TABLE:Q22.12}}\n\nNaive Bayes is trained on the table with Laplace (add-one) smoothing on each conditional probability "
                "(each feature has 2 values; priors unsmoothed). For Outlook $=$ R and Wind $=$ W,")],
    "Q23.13": [("Continuing Q23.12, one gradient-descent",
                r"A single neuron $y=\sigma(wx+b)$ with loss $L=\frac12(y-t)^2$ starts at $w=b=0$. For $x=1$, $t=1$, one gradient-descent")],
    "Q24.02": [("In Q24.01, the final centroid of the cluster that contains the point 4 is",
                r"k-means with $k=2$ runs on $1,2,4,7,8,10$ from initial centroids $1$ and $4$ until the assignments stop changing. "
                "The final centroid of the cluster that contains the point 4 is")],
    "Q24.12": [("In Q24.11, PAM considers swapping medoid 9 with the non-medoid 15.",
                r"For the points $1,2,3,8,9,15$ with absolute distance and medoids $\{2,9\}$, PAM considers swapping medoid 9 with the non-medoid 15.")],
    "Q24.26": [("For the covariance matrix of Q24.25, the first",
                r"For the covariance matrix $\begin{pmatrix}5&2\\2&2\end{pmatrix}$, the first")],
    "Q25.35": [(r"run on $\mathcal J$ of Q25.25 from S to G.",
                r"run from S to G on the undirected graph $\mathcal J$ with edges S--A (1), S--B (1), A--C (3), B--C (1), C--G (3), and "
                r"$h(\text{S})=0$, $h(\text{A})=1$, $h(\text{B})=4$, $h(\text{C})=0$, $h(\text{G})=0$.")],
    "Q25.37": [("In Q25.36, the $f$-value of G when it is expanded is",
                "[FIGURE 1: figures/Q25_36_q_f1_dc8f952e.png]\n\nA* with a priority queue is run on the directed graph above from S to G. "
                "The $f$-value of G when it is expanded is")],
    "Q26.27": [("In Q26.26, expectimax chooses", S26 + " Expectimax chooses")],
    "Q26.28": [("In Q26.26, if each chance node", S26 + " If each chance node")],
    "Q26.29": [("In Q26.26, every utility", S26 + " Every utility")],
    "Q26.32": [("In Q26.31, MAX chooses",
                r"MAX has actions $a_1,a_2$. Each leads to a fair coin flip, after which MIN chooses between two leaves: "
                r"$a_1$: heads $\{3,9\}$, tails $\{8,4\}$; $a_2$: heads $\{6,2\}$, tails $\{7,9\}$. MAX chooses")],
    "Q28.32": [("With 10\\,000 prior samples, the expected number kept in Q28.31 is",
                r"Rejection sampling estimates $P(R\mid+w)$ in $\mathcal N$ from prior samples. With 10\,000 prior samples, the expected number kept (not rejected) is")],
    "Q29.34": [("In Q29.33, the number of unit cubes with no painted face is",
                r"A $5\times5\times5$ cube is painted on all faces and cut into unit cubes. The number of unit cubes with no painted face is")],
    "Q30.27": [(r"For $R$ and $F$ of Q30.26, the highest",
                r"$R(A,B,C,D,E)$ has $F=\{A\to B,\ BC\to E,\ ED\to A\}$. The highest")],
    "Q32.26": [("With $O$ of Q32.25:",
                r"$O(oid,cid,amt)$ has rows $(10,1,50)$, $(11,1,\texttt{NULL})$, $(12,2,30)$, $(13,5,20)$. Consider")],
    "Q32.40": [("For the chain of Q32.39, Gibbs",
                r"In the chain $A\to B\to C$, $P(+a)=0.4$, $P(+b\mid+a)=0.7$, $P(+b\mid\neg a)=0.2$, $P(+c\mid+b)=0.9$, $P(+c\mid\neg b)=0.3$. Gibbs")],
}

SOL_FIX = {
    "Q1.31": [("use Q1.30's posterior as the new prior.", "use the single-test posterior $0.0876$ as the new prior.")],
    "Q4.26": [("Check Q4.25:", "Check:")],
    "Q12.17": [(" (from Q12.03)", "")],
    "Q18.13": [(" of Q18.12.", " of \\texttt{NOT IN}.")],
    "Q18.18": [(" Compare with Q18.10.", " Compare with \\texttt{AVG(salary)}, which ignores the \\texttt{NULL} and divides by 6.")],
    "Q18.23": [("and 7 in Q18.22;", "and 7 for the same query with \\texttt{dept = 'EE'};")],
    "Q19.23": [("(C) ✗ see Q19.22.", "(C) ✗.")],
    "Q19.33": [(", the same structure as Q19.22.", ".")],
    "Q22.02": [("From the list in Q22.01. ", "Read off from the majority-vote labels for increasing odd $k$. ")],
    "Q25.20": [(" (see Q25.15).", ".")],
    "Q25.27": [("(B) ✗ see Q25.25.", "(B) ✗.")],
    "Q25.33": [("See Q25.31.", "Six states are expanded: S, A, C, B, D, G (E is never expanded).")],
    "Q25.40": [("(C) ✗ see Q25.34.", "(C) ✗.")],
    "Q26.13": [("See Q26.12.", "The pruned leaves are the 7 and 8 under the second MIN node (its first leaf 3 is already $\\le\\alpha=4$).")],
    "Q26.19": [(" (Q26.18)", " (a MIN node can return only a bound after a cutoff)")],
    "Q26.33": [("(D) ✗ see Q26.29.", "(D) ✗.")],
    "Q27.27": [("(D) ✗ see Q27.23.", "(D) ✗.")],
}

DROP_FIG_CAPTION = {"Q16.11", "Q26.08"}
DROP_TABLE_CAPTION = {"Q22.30"}  # table T (+caption) belongs to Q22.31-33, re-attached via VIRTUAL

VIRTUAL = {
    "Q16.12": FIG_G, "Q16.13": FIG_G,
    "Q26.09": FIG_T3, "Q26.10": FIG_T3, "Q26.17": FIG_T3, "Q26.18": FIG_T3,
    "Q26.16": FIG_T2,
    "Q22.31": TAB_T, "Q22.32": TAB_T, "Q22.33": TAB_T,
}

# extra context attachments the symbol rules cannot see (record id -> context ids)
EXTRA_CTX = {"Q28.34": ["Day28-ctx5"]}
