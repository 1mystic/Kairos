"""Programming, Data Structures and Algorithms. Code in questions is EXECUTED to obtain/verify answers."""
import contextlib
import io
import itertools
import math
from collections import deque

from . import msq, nat, scq


def run(code):
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        exec(code, {})
    return buf.getvalue().strip()


def fence(code):
    return "```python\n" + code.strip("\n") + "\n```"


# 1 mutable default / aliasing
code = '''
def add(x, acc=[]):
    acc.append(x * 2)
    return acc
a = add(1)
b = add(2)
c = add(3, [])
print(len(a), len(b), len(c))
'''
out = run(code)
assert out == "2 2 1"
scq("pds_py_01", "PDS.PY", "What does the following Python program print?\n\n" + fence(code), "2 2 1", ["1 1 1", "1 2 1", "2 2 3"],
    "The default list `acc` is created once, so the first two calls share it: after them it has two elements, and `a` and `b` are the same list (length 2 each). The third call passes a fresh list, so `c` has length 1.", "M", marks=2)

# 2 slicing
code = '''
a = [3, 1, 4, 1, 5, 9, 2, 6]
b = a[::-2]
print(sum(b) + b[1])
'''
out = int(run(code))
assert out == 6 + 9 + 1 + 1 + 9 - 0 + 0 or True
b = [3, 1, 4, 1, 5, 9, 2, 6][::-2]
assert b == [6, 9, 1, 1] and out == 17 + 9
nat("pds_py_02", "PDS.PY", "The following Python program prints an integer.\n\n" + fence(code) + "\n\nThe value printed is ______.", out,
    r"""`a[::-2]` takes every second element from the end: $[6,9,1,1]$. Sum $=17$, `b[1]` $=9$, total $26$.""", diff="E")

# 3 recursion call count
code = '''
calls = 0
def f(n):
    global calls
    calls += 1
    if n <= 1:
        return n
    return f(n - 1) + f(n - 2)
f(6)
print(calls)
'''
out = int(run(code))
assert out == 25
nat("pds_py_03", "PDS.PY", "For the program below, the value printed is ______.\n\n" + fence(code), out,
    r"""Calls $C(n)=1+C(n-1)+C(n-2)$ with $C(0)=C(1)=1$: $C(2)=3,C(3)=5,C(4)=9,C(5)=15,C(6)=25$.""", diff="M", marks=2)

# 4 Python semantics MSQ
checks = {
    "a": run("a=[1,2,3]\nb=a\nb.append(4)\nprint(a==[1,2,3,4])") == "True",
    "b": run("t=(1,2)\ntry:\n    t[0]=5\n    print('ok')\nexcept TypeError:\n    print('err')") == "err",
    "c": run("s={1,2,2,3}\nprint(len(s))") == "3",
    "d": run("d={'x':1}\nprint(d.get('y',0)+d['x'])") == "1",
}
assert all(checks.values())
msq("pds_py_04", "PDS.PY", r"""Select all TRUE statements about Python 3.""",
    [("After `b = a` for a list `a`, `b.append(4)` also changes `a`", True), ("A tuple's elements can be reassigned with `t[0] = 5`", False),
     ("`len({1, 2, 2, 3})` is 3", True), ("`d.get('y', 0)` raises `KeyError` when the key `'y'` is absent", False)],
    r"""Assignment copies the reference, tuples are immutable (TypeError), sets drop duplicates, and `dict.get` returns the default instead of raising.""", "E", marks=1)

# 5 stack: postfix evaluation
def postfix(tokens):
    st = []
    for t in tokens.split():
        if t.lstrip("-").isdigit():
            st.append(int(t))
        else:
            b, a = st.pop(), st.pop()
            st.append({"+": a + b, "-": a - b, "*": a * b, "/": a // b}[t])
    return st[0]
expr = "6 2 3 + * 4 2 / -"
infix = "6 * (2 + 3) - 4 / 2"
assert postfix(expr) == 28 == int(eval(infix.replace("/", "//")))
nat("pds_ds_01", "PDS.DS.STK", "The postfix expression `6 2 3 + * 4 2 / -` is evaluated using a stack (operators $+,-,*,/$ with integer division). The result is ______.", 28,
    r"""Push 6,2,3; `+` gives 5; `*` gives $6\times5=30$; push 4,2; `/` gives 2; `-` gives $30-2=28$.""", diff="E")

# 6 stack depth for parentheses
def maxdepth(s):
    d = m = 0
    for ch in s:
        d += ch == "("
        d -= ch == ")"
        m = max(m, d)
        assert d >= 0
    assert d == 0
    return m
s = "(()(()))((()))()"
assert maxdepth(s) == 3
nat("pds_ds_02", "PDS.DS.STK", "A balanced-parenthesis checker pushes each `(` on a stack and pops on `)`. For the input `" + s + "`, the maximum number of elements simultaneously on the stack is ______.", 3,
    r"""Tracking depth: the deepest nesting occurs in `(()(()))` (depth 3) and in `((()))` (depth 3). Maximum $=3$.""", diff="E")

# 7 circular queue simulation
def sim():
    q = deque()
    log = []
    ops = [("e", 5), ("e", 8), ("d", 0), ("e", 1), ("e", 9), ("d", 0), ("d", 0), ("e", 4), ("e", 7)]
    for op, v in ops:
        if op == "e":
            q.append(v)
        else:
            log.append(q.popleft())
    return list(q), log
rem, log = sim()
assert rem == [9, 4, 7] and log == [5, 8, 1]
nat("pds_ds_03", "PDS.DS.QUE", "An initially empty queue undergoes the operations enqueue(5), enqueue(8), dequeue, enqueue(1), enqueue(9), dequeue, dequeue, enqueue(4), enqueue(7). The sum of the elements remaining in the queue is ______.", sum(rem),
    r"""Dequeues remove 5, 8, 1 in FIFO order. The queue then holds 9, 4, 7 with sum 20.""", diff="E")

# 8 linked list reversal code
code = '''
class Node:
    def __init__(self, v, nxt=None):
        self.v, self.nxt = v, nxt
head = None
for x in [1, 2, 3, 4, 5]:
    head = Node(x, head)          # inserts at the front
prev = None
cur = head
while cur:
    cur.nxt, prev, cur = prev, cur, cur.nxt
out = []
n = prev
while n:
    out.append(n.v)
    n = n.nxt
print(out[1] * 10 + out[-1])
'''
out = int(run(code))
assert out == 25
nat("pds_ds_04", "PDS.DS.LL", "The Python program below builds a singly linked list and then reverses it in place; the final value printed is ______.\n\n" + fence(code), out,
    r"""Inserting 1..5 at the front gives the list 5,4,3,2,1. Reversal yields 1,2,3,4,5, """, diff="M", marks=2)

# 9 BST height and traversal
class N:
    def __init__(self, k):
        self.k, self.l, self.r = k, None, None
def ins(root, k):
    if root is None:
        return N(k)
    if k < root.k:
        root.l = ins(root.l, k)
    else:
        root.r = ins(root.r, k)
    return root
def height(n):
    return -1 if n is None else 1 + max(height(n.l), height(n.r))
def post(n):
    return [] if n is None else post(n.l) + post(n.r) + [n.k]
def inord(n):
    return [] if n is None else inord(n.l) + [n.k] + inord(n.r)
keys = [50, 30, 70, 20, 40, 60, 80, 35]
root = None
for k in keys:
    root = ins(root, k)
assert height(root) == 3 and inord(root) == sorted(keys)
nat("pds_ds_05", "PDS.DS.TREE", "The keys 50, 30, 70, 20, 40, 60, 80, 35 are inserted in this order into an initially empty binary search tree. The height of the tree (the number of edges on the longest root-to-leaf path) is ______.", 3,
    r"""35 goes 50 $\to$ 30 $\to$ 40 $\to$ left child of 40, giving the path 50-30-40-35 with 3 edges. All other leaves are at depth 2.""", diff="E")
pw = post(root)
assert pw == [20, 35, 40, 30, 60, 80, 70, 50]
scq("pds_ds_06", "PDS.DS.TREE", "For the binary search tree built by inserting 50, 30, 70, 20, 40, 60, 80, 35 (in this order), the postorder traversal is",
    "20, 35, 40, 30, 60, 80, 70, 50", ["20, 30, 35, 40, 50, 60, 70, 80", "50, 30, 20, 40, 35, 70, 60, 80", "20, 40, 35, 30, 60, 80, 70, 50"],
    r"""Postorder visits left subtree, right subtree, then the root. Left subtree of 50 (rooted at 30): 20, then right subtree of 30 (rooted at 40: its left child 35, then 40), then 30. Right subtree: 60, 80, 70. Then 50.""", "M", marks=2)

# 10 hashing with chaining and probing
def chains(keys, m):
    t = [[] for _ in range(m)]
    for k in keys:
        t[k % m].append(k)
    return t
ks = [15, 22, 9, 36, 12, 29, 5, 64]
ch = chains(ks, 7)
assert [len(c) for c in ch] == [0, 5, 1, 0, 0, 2, 0] and max(map(len, ch)) == 5
nat("pds_ds_07", "PDS.DS.HASH", r"""Keys 15, 22, 9, 36, 12, 29, 5, 64 are inserted into a hash table of 7 slots with $h(k)=k\bmod7$ and separate chaining. The length of the longest chain is ______.""", max(map(len, ch)),
    r"""Residues mod 7: 15→1, 22→1, 9→2, 36→1, 12→5, 29→1, 5→5, 64→1. Slot 1 holds 15, 22, 36, 29, 64 (length 5), slot 5 holds 12, 5, slot 2 holds 9. The longest chain has length 5.""", diff="E")

def probe(keys, m):
    t = [None] * m
    pos = {}
    for k in keys:
        i = k % m
        while t[i] is not None:
            i = (i + 1) % m
        t[i] = k
        pos[k] = i
    return t, pos
t, pos = probe([27, 18, 29, 28, 39, 13, 16], 11)
assert pos == {27: 5, 18: 7, 29: 8, 28: 6, 39: 9, 13: 2, 16: 10}
nat("pds_ds_08", "PDS.DS.HASH", r"""Keys 27, 18, 29, 28, 39, 13, 16 are inserted in this order into an empty hash table with 11 slots (indices 0-10), $h(k)=k\bmod 11$, with linear probing. The index at which key 16 is stored is ______.""", pos[16],
    "Insertions (home slot, final slot): 27: 5,5; 18: 7,7; 29: 7,8; 28: 6,6; 39: 6, then 7, 8 taken, so 9; 13: 2,2; 16: 5, then 6, 7, 8, 9 taken, so 10. Key 16 is stored at index " + str(pos[16]) + ".", diff="M", marks=2)

# 11 binary search probes
def bs_iters(a, x):
    lo, hi, it = 0, len(a) - 1, 0
    while lo <= hi:
        it += 1
        mid = (lo + hi) // 2
        if a[mid] == x:
            return it
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return it
a100 = list(range(0, 200, 2))
worst = max(bs_iters(a100, x) for x in range(-1, 201))
assert worst == math.floor(math.log2(100)) + 1 == 7
nat("pds_alg_01", "PDS.ALG.SRCH", "Binary search (loop `while lo <= hi`, compare once per iteration) is run on a sorted array of 100 distinct integers. The maximum number of loop iterations over all possible search keys (present or absent) is ______.", worst,
    r"""The interval shrinks as $100\to49\to24\to11\to5\to2\to0$ in the worst case: $\lfloor\log_2100\rfloor+1=7$ iterations (also confirmed by trying every key).""", diff="M", marks=2)

a15 = list(range(1, 16))
it = bs_iters(a15, 11)
assert it == 4
nat("pds_alg_02", "PDS.ALG.SRCH", "Binary search with `mid = (lo + hi) // 2` is run on the sorted array $[1,2,\\ldots,15]$ (0-indexed) to find the key 11. The number of elements compared with the key (including the successful comparison) is ______.", it,
    r"""Indices 0-14: mid=7 (value 8) $<11$; lo=8, hi=14, mid=11 (value 12) $>11$; hi=10, mid=9 (value 10) $<11$; lo=10, mid=10 (value 11) found. That is 4 comparisons (the program counts the loop iterations).""", diff="M", marks=1)

# 12 sorting counts
def selection_swaps(a):
    a = a[:]
    sw = 0
    for i in range(len(a) - 1):
        m = min(range(i, len(a)), key=lambda j: (a[j], j))
        if m != i:
            a[i], a[m] = a[m], a[i]
            sw += 1
    return sw
def inversions(a):
    return sum(1 for i in range(len(a)) for j in range(i + 1, len(a)) if a[i] > a[j])
def bubble_swaps(a):
    a = a[:]
    sw = 0
    for i in range(len(a)):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                sw += 1
    return sw
def insertion_shifts(a):
    a = a[:]
    sh = 0
    for i in range(1, len(a)):
        k, j = a[i], i - 1
        while j >= 0 and a[j] > k:
            a[j + 1] = a[j]
            j -= 1
            sh += 1
        a[j + 1] = k
    return sh

# 12 sorting counts (values computed by the functions above, cross-checked with inversion counts)
arr = [5, 2, 4, 6, 1, 3]
ss = selection_swaps(arr)
assert ss == 3
nat("pds_alg_03", "PDS.ALG.SORT", "Selection sort (find the minimum of the unsorted part and swap it into place only when it is not already there) sorts $[5,2,4,6,1,3]$. The number of swaps performed is ______.", ss,
    r"""i=0: min is 1 (index 4): swap → [1,2,4,6,5,3]. i=1: 2 already in place. i=2: min is 3 (index 5): swap → [1,2,3,6,5,4]. i=3: min is 4 (index 5): swap → [1,2,3,4,5,6]. i=4: 5 in place. Total 3 swaps.""", diff="M", marks=1)
b = [7, 3, 5, 1, 2]
bs_ = bubble_swaps(b)
assert bs_ == inversions(b) == 8
nat("pds_alg_04", "PDS.ALG.SORT", "Bubble sort (adjacent swaps, no early exit) is applied to $[7,3,5,1,2]$. The total number of swaps performed is ______.", bs_,
    r"""Every adjacent swap removes exactly one inversion, so the number of swaps equals the number of inversions: $(7,3),(7,5),(7,1),(7,2),(3,1),(3,2),(5,1),(5,2)=8$.""", diff="M", marks=2)
c = [4, 3, 2, 5, 1]
sh = insertion_shifts(c)
assert sh == inversions(c) == 7
nat("pds_alg_05", "PDS.ALG.SORT", "Insertion sort is applied to $[4,3,2,5,1]$. The total number of element shifts (moves of an element one place to the right) is ______.", sh,
    r"""Each shift removes one inversion. Inversions: $(4,3),(4,2),(4,1),(3,2),(3,1),(2,1),(5,1)=7$.""", diff="M", marks=2)

def merge_cmp(x, y):
    i = j = cnt = 0
    while i < len(x) and j < len(y):
        cnt += 1
        if x[i] <= y[j]:
            i += 1
        else:
            j += 1
    return cnt
mc = merge_cmp([3, 5, 8, 12], [1, 4, 9, 10])
assert mc == 7
nat("pds_alg_06", "PDS.ALG.DC", "In the merge step of mergesort, the sorted lists $[3,5,8,12]$ and $[1,4,9,10]$ are merged by repeatedly comparing the two front elements until one list is exhausted. The number of element comparisons made is ______.", mc,
    r"""Comparisons: 3-1, 3-4, 5-4, 5-9, 8-9, 12-9, 12-10 (then the second list is exhausted and the remaining 12 is copied): 7 comparisons.""", diff="M", marks=1)

def lomuto(a):
    a = a[:]
    p, i = a[-1], -1
    for j in range(len(a) - 1):
        if a[j] <= p:
            i += 1
            a[i], a[j] = a[j], a[i]
    a[i + 1], a[-1] = a[-1], a[i + 1]
    return a, i + 1
res, pi = lomuto([7, 2, 9, 4, 6, 3, 8, 5])
assert res == [2, 4, 3, 5, 6, 9, 8, 7] and pi == 3
scq("pds_alg_07", "PDS.ALG.DC", "Quicksort with the last element as pivot uses the Lomuto partition scheme (scan $j$ from the left, move elements $\\le$ pivot to the front, finally swap the pivot into position). After the first partition of $[7,2,9,4,6,3,8,5]$ the array is",
    "[2, 4, 3, 5, 6, 9, 8, 7]", ["[2, 4, 3, 5, 7, 9, 8, 6]", "[7, 2, 4, 3, 5, 6, 9, 8]", "[2, 4, 3, 5, 9, 6, 8, 7]"],
    r"""Pivot 5. Elements $\le5$ are 2, 4, 3 and are moved to the front in scan order; the pivot is swapped to index 3. Intermediate swaps displace 7 and 9 to give $[2,4,3,5,6,9,8,7]$.""", "M", marks=2)

# recurrences: T(n)=2T(n/2)+n  and T(n)=T(n-1)+n
from functools import lru_cache
@lru_cache(None)
def T1(n):
    return 1 if n <= 1 else 2 * T1(n // 2) + n
def T2(n):
    t = 1
    for k in range(2, n + 1):
        t += k
    return t
r1 = T1(2 ** 20) / (2 ** 20 * 20)
r2 = T2(2000) / (2000 ** 2)
assert 0.99 < r1 < 1.2 and abs(r2 - 0.5) < 0.01
msq("pds_alg_08", "PDS.ALG.CPX", r"""Consider $T_1(n)=2T_1(n/2)+n$ and $T_2(n)=T_2(n-1)+n$ with $T(1)=1$. Select all correct statements.""",
    [(r"$T_1(n)=\Theta(n\log n)$", True), (r"$T_2(n)=\Theta(n^2)$", True), (r"$T_1(n)=O(n)$", False), (r"$T_2(n)=\Theta(n\log n)$", False)],
    r"""$T_1$ has $\log n$ levels each costing $n$ (master theorem case 2), so $\Theta(n\log n)$. $T_2(n)=n(n+1)/2=\Theta(n^2)$. (Numerically $T_1(2^{20})/(2^{20}\cdot20)\approx1.05$ and $T_2(2000)/2000^2\approx0.5$.)""", "M", marks=2)

# complexity statements (insertion sort best case counted)
def ins_cmp(a):
    a = a[:]
    cnt = 0
    for i in range(1, len(a)):
        k, j = a[i], i - 1
        while j >= 0:
            cnt += 1
            if a[j] > k:
                a[j + 1] = a[j]
                j -= 1
            else:
                break
        a[j + 1] = k
    return cnt
assert ins_cmp(list(range(50))) == 49 and ins_cmp(list(range(50, 0, -1))) == 50 * 49 // 2
msq("pds_alg_09", "PDS.ALG.CPX", r"""Select all correct statements about comparison-based algorithms on $n$ elements.""",
    [("Insertion sort needs only $n-1$ comparisons on an already sorted input", True), ("Mergesort always makes $\\Theta(n\\log n)$ comparisons", True),
     ("Quicksort with the first element as pivot takes $\\Theta(n^2)$ time on an already sorted input", True), ("Selection sort is $O(n)$ on an already sorted input", False)],
    r"""Insertion sort stops each inner loop after one comparison on sorted input ($n-1$ total). Mergesort splits evenly regardless of input. A sorted input with first-element pivot gives splits of sizes $0$ and $n-1$, so $\Theta(n^2)$. Selection sort always scans the remainder: $\Theta(n^2)$ comparisons.""", "M", marks=2)

# graph traversals
adj = {'A': ['B', 'C', 'D'], 'B': ['A', 'E'], 'C': ['A', 'E', 'F'], 'D': ['A', 'F'], 'E': ['B', 'C', 'G'], 'F': ['C', 'D', 'G'], 'G': ['E', 'F']}
def bfs(s):
    seen, q = [s], deque([s])
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in seen:
                seen.append(v)
                q.append(v)
    return seen
def dfs(s):
    seen = []
    def go(u):
        seen.append(u)
        for v in adj[u]:
            if v not in seen:
                go(v)
    go(s)
    return seen
gtxt = "A: B, C, D; B: A, E; C: A, E, F; D: A, F; E: B, C, G; F: C, D, G; G: E, F"
bo, do = bfs('A'), dfs('A')
assert bo == list("ABCDEFG") and do == list("ABECFDG")
scq("pds_gr_01", "PDS.GRAPH.TRAV", "An undirected graph has adjacency lists (neighbours listed in this order): " + gtxt + ". The order in which depth-first search from A visits the vertices (visiting neighbours in list order) is",
    "A B E C F D G", ["A B C D E F G", "A B E G F C D", "A C F G E B D"],
    r"""From A take B; B's first unvisited neighbour is E; E's first unvisited neighbour is C (B is visited); C's first unvisited neighbour is F; F's first unvisited neighbour is D (C is visited); D has no unvisited neighbours, so return to F, whose next neighbour G is unvisited. Visit order: A B E C F D G.""", "M", marks=2)
scq("pds_gr_02", "PDS.GRAPH.TRAV", "For the same graph (" + gtxt + "), the order in which breadth-first search from A visits the vertices (neighbours in list order) is",
    "A B C D E F G", ["A B E G C F D", "A D C B F E G", "A B C E D F G"],
    r"""Level 0: A. Level 1: B, C, D. Level 2: from B: E; from C: F (E already seen); Level 3: G. So A B C D E F G.""", "E", marks=1)

# shortest path (Dijkstra, verified with Bellman-Ford)
import heapq
edges = [("S", "A", 7), ("S", "B", 2), ("B", "A", 3), ("A", "C", 1), ("B", "C", 8), ("B", "D", 5), ("C", "T", 4), ("D", "T", 9), ("D", "C", 2)]
def dijkstra(src):
    g = {}
    for u, v, w in edges:
        g.setdefault(u, []).append((v, w))
    dist = {src: 0}
    pq = [(0, src)]
    while pq:
        d, u = heapq.heappop(pq)
        if d > dist.get(u, 1e9):
            continue
        for v, w in g.get(u, []):
            if d + w < dist.get(v, 1e9):
                dist[v] = d + w
                heapq.heappush(pq, (d + w, v))
    return dist
def bellman(src):
    dist = {x: 1e9 for e in edges for x in e[:2]}
    dist[src] = 0
    for _ in range(len(dist)):
        for u, v, w in edges:
            dist[v] = min(dist[v], dist[u] + w)
    return dist
dj, bf = dijkstra("S"), bellman("S")
assert all(dj[k] == bf[k] for k in dj)
etxt = ", ".join(f"{u}→{v} ({w})" for u, v, w in edges)
nat("pds_gr_03", "PDS.GRAPH.SP", "A directed graph has the weighted edges: " + etxt + ". The length of a shortest path from S to T is ______.", dj["T"],
    r"""Dijkstra from S gives distances """ + ", ".join(f"{k}={v}" for k, v in sorted(dj.items())) + r""". The shortest path to T has length """ + str(dj["T"]) + r""" (e.g. S→B→A→C→T $=2+3+1+4$).""", diff="M", marks=2)

# spanning trees of K4 by enumeration
def is_tree(es, n):
    p = list(range(n))
    def f(x):
        while p[x] != x:
            p[x] = p[p[x]]
            x = p[x]
        return x
    for u, v in es:
        a, b = f(u), f(v)
        if a == b:
            return False
        p[a] = b
    return True
alle = list(itertools.combinations(range(4), 2))
nt = sum(1 for es in itertools.combinations(alle, 3) if is_tree(es, 4))
assert nt == 16 == 4 ** 2
nat("pds_gr_04", "PDS.GRAPH.BASIC", "The number of distinct spanning trees of the complete graph $K_4$ on 4 labelled vertices is ______.", nt,
    r"""Cayley's formula: $n^{n-2}=4^2=16$ (confirmed by checking all $\binom63=20$ three-edge subsets: 16 are acyclic, hence trees).""", diff="M", marks=1)

# topological orders
dag = [("P", "Q"), ("P", "R"), ("Q", "S"), ("R", "S"), ("R", "T"), ("S", "U"), ("T", "U")]
cnt = 0
for perm in itertools.permutations("PQRSTU"):
    pos = {v: i for i, v in enumerate(perm)}
    if all(pos[u] < pos[v] for u, v in dag):
        cnt += 1
nat("pds_gr_05", "PDS.GRAPH.TRAV", "A directed acyclic graph has vertices P, Q, R, S, T, U and edges " + ", ".join(f"{u}→{v}" for u, v in dag) + ". The number of distinct topological orderings is ______.", cnt,
    r"""P must come first and U last. The middle four vertices Q, R, S, T are ordered subject to Q<S, R<S and R<T (Q and R are unconstrained with each other and with T apart from these). Counting all valid permutations of the middle four gives """ + str(cnt) + r""" (verified by enumerating all 720 permutations).""", diff="H", marks=2)
