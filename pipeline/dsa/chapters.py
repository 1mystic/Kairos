"""DryRun problem -> Kairos ALG chapter map, and loader for the embedded DryRun data."""
from __future__ import annotations

import json
import subprocess

from ..paths import ROOT

DRYRUN_DIR = ROOT / "app" / "public" / "dryrun"

# chapter code -> (name, [slugs])
_CHAPTERS: dict[str, tuple[str, list[str]]] = {
    "ARR": ("Arrays & hashing", ["two-sum", "contains-duplicate", "valid-anagram", "group-anagrams",
            "top-k-frequent-elements", "product-of-array-except-self", "subarray-sum-equals-k",
            "longest-consecutive-sequence", "best-time-to-buy-and-sell-stock"]),
    "TWOP": ("Two pointers", ["3sum", "container-with-most-water", "valid-palindrome", "trapping-rain-water",
             "sort-colors"]),
    "SLIDE": ("Sliding window", ["longest-substring-without-repeating-characters", "minimum-window-substring",
              "sliding-window-maximum"]),
    "STACK": ("Stacks & monotonic stack", ["valid-parentheses", "daily-temperatures",
              "largest-rectangle-in-histogram", "min-stack", "evaluate-reverse-polish-notation", "decode-string",
              "simplify-path", "basic-calculator-ii"]),
    "BSEARCH": ("Binary search", ["binary-search", "find-peak-element", "sqrtx", "koko-eating-bananas",
                "search-in-rotated-sorted-array", "median-of-two-sorted-arrays"]),
    "LL": ("Linked lists", ["reverse-linked-list", "merge-two-sorted-lists", "linked-list-cycle",
           "merge-k-sorted-lists", "copy-list-with-random-pointer"]),
    "TREE": ("Trees", ["maximum-depth-of-binary-tree", "invert-binary-tree", "binary-tree-level-order-traversal",
             "validate-binary-search-tree", "lowest-common-ancestor-of-a-binary-tree",
             "serialize-and-deserialize-binary-tree"]),
    "GRAPH": ("Graphs (BFS, DFS, shortest paths)", ["number-of-islands", "flood-fill", "clone-graph",
              "course-schedule", "course-schedule-ii", "network-delay-time", "cheapest-flights-within-k-stops",
              "min-cost-to-connect-all-points"]),
    "UF": ("Union-find", ["redundant-connection", "accounts-merge"]),
    "HEAP": ("Heaps & top-k", ["kth-largest-element-in-an-array", "k-closest-points-to-origin",
             "find-median-from-data-stream"]),
    "DP": ("Dynamic programming", ["longest-common-subsequence", "edit-distance", "coin-change", "climbing-stairs",
           "house-robber", "maximum-subarray", "maximum-product-subarray", "longest-increasing-subsequence",
           "word-break", "burst-balloons", "regular-expression-matching", "longest-increasing-path-in-a-matrix"]),
    "BACK": ("Backtracking", ["generate-parentheses", "n-queens", "combination-sum", "word-search"]),
    "GREEDY": ("Greedy & intervals", ["merge-intervals", "meeting-rooms-ii", "task-scheduler"]),
    "TRIE": ("Tries", ["implement-trie-prefix-tree", "design-add-and-search-words-data-structure",
             "search-suggestions-system"]),
    "BIT": ("Bit manipulation", ["number-of-1-bits", "reverse-bits", "counting-bits", "single-number",
            "sum-of-two-integers"]),
    "MATH": ("Math & randomisation", ["powx-n", "count-primes", "shuffle-an-array", "random-pick-index",
             "random-pick-with-weight"]),
    "DESIGN": ("Data-structure design", ["lru-cache", "lfu-cache", "time-based-key-value-store",
               "design-hit-counter", "number-of-recent-calls", "design-browser-history", "design-hashmap",
               "design-twitter", "design-circular-queue", "snapshot-array", "insert-delete-getrandom-o1",
               "maximum-frequency-stack", "implement-queue-using-stacks"]),
    "STR": ("String algorithms", ["find-the-index-of-the-first-occurrence-in-a-string", "longest-common-prefix",
            "text-justification"]),
    "JS": ("JavaScript utilities & async", ["group-by", "memoize", "curry", "sort-by",
           "flatten-deeply-nested-array", "throttle", "debounce", "join-two-arrays-by-id", "event-emitter",
           "promise-time-limit", "cache-with-time-limit", "promise-pool", "function-composition", "chunk-array"]),
}

CHAPTER_NAMES = {f"ALG.{c}": n for c, (n, _) in _CHAPTERS.items()}
SLUG_CHAPTER = {s: f"ALG.{c}" for c, (_, slugs) in _CHAPTERS.items() for s in slugs}


def load_dryrun() -> dict:
    out = subprocess.run(["node", str(ROOT / "pipeline" / "dsa" / "dump.cjs"), str(DRYRUN_DIR)],
                         check=True, capture_output=True, text=True, timeout=60).stdout
    return json.loads(out)
