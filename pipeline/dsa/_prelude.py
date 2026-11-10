"""Test prelude copied from DryRun tools/check.py (helpers used by the embedded python tests)."""
PRELUDE = '''
from typing import *
from collections import *
from heapq import *
from bisect import *
import heapq, bisect, collections, math, itertools, functools, random, string, re
class ListNode:
    def __init__(self, val=0, next=None): self.val = val; self.next = next
class TreeNode:
    def __init__(self, val=0, left=None, right=None): self.val = val; self.left = left; self.right = right
class Node:
    def __init__(self, val=0, *a, **k):
        self.val = val; self.next = None; self.random = None; self.neighbors = []
def L(a):
    d = ListNode(0); c = d
    for x in a: c.next = ListNode(x); c = c.next
    return d.next
def LL(h):
    r = []
    while h: r.append(h.val); h = h.next
    return r
def T(a):
    if not a or a[0] is None: return None
    ns = [None if v is None else TreeNode(v) for v in a]; q = [ns[0]]; j = 1
    for n in q:
        if j < len(a): n.left = ns[j]; j += 1
        if j < len(a): n.right = ns[j]; j += 1
        q += [c for c in (n.left, n.right) if c]
    return ns[0]
def TT(root):
    out, q = [], [root]
    for n in q:
        if n is None: out.append(None); continue
        out.append(n.val); q += [n.left, n.right]
    while out and out[-1] is None: out.pop()
    return out
'''
