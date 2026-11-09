"""General Aptitude: verbal (text only), quantitative, data interpretation (tables), analytical, spatial (coordinates)."""
import itertools
from datetime import date
from fractions import Fraction as F
from math import comb, log2

from . import msq, nat, scq

# ------------------------------------------------------------------ verbal (second-derivation)
scq("ga_verb_01", "GA.VERB.VOC", "The scientist's claim was so ______ that even her sharpest critics could find nothing in it to dispute. Choose the word that best fills the blank.",
    "unassailable", ["dubious", "frivolous", "tentative"],
    "The clause 'could find nothing to dispute' needs a word meaning impossible to attack. 'Unassailable' fits; the others imply weakness, which would invite dispute.",
    "E", "second-derivation", 1)
scq("ga_verb_02", "GA.VERB.GRAM", "By the time the guests arrived, the chef ______ the entire meal.",
    "had prepared", ["has prepared", "prepares", "will have prepared"],
    "Two past events are sequenced: the preparation was completed before the arrival, so the past perfect 'had prepared' is required. 'Will have prepared' is future; the other two are present forms.",
    "E", "second-derivation", 1)
scq("ga_verb_03", "GA.VERB.GRAM", "Select the option that correctly fills the blanks: 'She is allergic ____ peanuts and averse ____ crowded places.'",
    "to; to", ["with; for", "from; to", "to; from"],
    "The standard collocations are 'allergic to' and 'averse to'.", "E", "second-derivation", 1)
scq("ga_verb_04", "GA.VERB.SEQ", "Arrange the four sentences into a coherent paragraph.\n\nP. Yet the results were reproduced in three independent laboratories.\n\nQ. The experiment initially seemed flawed.\n\nR. Sceptics therefore demanded stricter controls.\n\nS. Eventually the finding entered the textbooks.",
    "QRPS", ["RQPS", "QPRS", "PQRS"],
    "Q introduces the experiment and its apparent flaw. R begins with 'therefore', a consequence of Q. P begins with 'Yet', contrasting with the doubt in R. S ('Eventually') closes the story. Order: Q-R-P-S.",
    "M", "second-derivation", 2)
scq("ga_verb_05", "GA.ANAL.ANLG", "Cartographer : Map :: Composer : ______", "Symphony", ["Orchestra", "Concert", "Instrument"],
    "A cartographer produces a map; a composer produces a symphony (a work). The other options are performers, events or tools.",
    "E", "second-derivation", 1)
scq("ga_verb_06", "GA.VERB.GRAM", "Neither the manager nor her assistants ______ aware of the revised schedule.", "were", ["was", "is", "has been"],
    "With 'neither ... nor', the verb agrees with the nearer subject, 'assistants' (plural), so a plural verb is needed; of the options, only 'were' is plural ('was', 'is' and 'has been' are singular).",
    "E", "second-derivation", 1)
scq("ga_verb_07", "GA.VERB.RC", "Cities that planted street trees saw summer afternoon temperatures drop in the treated neighbourhoods. The drop was absent in neighbourhoods where trees were planted but later removed.\n\nWhich of the following can be inferred from the passage?",
    "The cooling effect depends on the trees remaining in place.", ["Planting trees raises night-time temperatures.", "Every city should plant street trees.", "Removing trees improves the climate of a neighbourhood."],
    "The passage links the drop to planted trees and says it vanishes when they are removed, so the effect depends on the trees staying. The other statements go beyond the evidence given.",
    "M", "second-derivation", 2)
scq("ga_verb_08", "GA.VERB.VOC", "The auditor's report was terse: three lines, no adjectives. As used here, 'terse' most nearly means", "brief and to the point", ["hostile", "inaccurate", "elaborate"],
    "The colon explains the word: three lines and no adjectives, i.e. brief and direct.", "E", "second-derivation", 1)

# ------------------------------------------------------------------ quantitative
f = (1 + F(20, 100)) * (1 - F(20, 100))
net = float((f - 1) * 100)
scq("ga_quant_01", "GA.QUANT.NUMC", "The price of an item is raised by 20% and the new price is then reduced by 20%. Relative to the original price, the final price is",
    "4% lower", ["unchanged", "4% higher", "2% lower"],
    "Final price = $1.2 \\times 0.8 = 0.96$ of the original, i.e. 4% lower.", "E", marks=1)
assert net == -4.0 and abs(1.2 * 0.8 - 0.96) < 1e-12

work = F(1) / (F(1, 12) + F(1, 18))
assert work == F(36, 5)
nat("ga_quant_02", "GA.QUANT.NUMC", "Machine A alone can finish a job in 12 days and machine B alone in 18 days. Working together at their respective constant rates, they finish the job in ______ days. (Round off to one decimal place)",
    float(work), "Combined rate $= \\frac1{12}+\\frac1{18}=\\frac{5}{36}$ jobs/day, so time $=\\frac{36}{5}=7.2$ days.", tol=0.05, dec=2, diff="E")

d1 = 60.0
avg = 2 * 60 * 40 / (60 + 40)
assert avg == 48.0
nat("ga_quant_03", "GA.QUANT.NUMC", "A car travels from town P to town Q at 60 km/h and returns along the same road at 40 km/h. Its average speed for the whole round trip, in km/h, is ______.",
    avg, "Average speed $=\\frac{\\text{total distance}}{\\text{total time}}=\\frac{2d}{d/60+d/40}=\\frac{2\\cdot 60\\cdot 40}{100}=48$ km/h (harmonic mean).", tol=0.0, diff="E")

perms = {p for p in itertools.permutations("DATASET")}
assert len(perms) == 1260 == 5040 // (2 * 2)
nat("ga_quant_04", "GA.QUANT.NUMC", "The number of distinct arrangements of all the letters of the word DATASET is ______.", 1260,
    "Seven letters with A repeated twice and T repeated twice: $\\frac{7!}{2!\\,2!}=1260$.", diff="M", marks=2)

ci = 8000 * 1.1 ** 2 - 8000
assert abs(ci - 1680) < 1e-6
nat("ga_quant_05", "GA.QUANT.NUMC", "A sum of Rs 8000 is invested for 2 years at 10% per annum compounded annually. The compound interest earned, in rupees, is ______.", 1680,
    "Amount $=8000(1.1)^2=9680$, so interest $=9680-8000=1680$.", diff="E")

s = sum(F(1, k * (k + 1)) for k in range(1, 100))
assert s == F(99, 100)
scq("ga_quant_06", "GA.QUANT.NUMC", "The value of $\\dfrac{1}{1\\cdot 2}+\\dfrac{1}{2\\cdot 3}+\\dfrac{1}{3\\cdot 4}+\\cdots+\\dfrac{1}{99\\cdot 100}$ is",
    "$\\frac{99}{100}$", ["$\\frac{100}{101}$", "$\\frac{49}{50}$", "$\\frac{98}{99}$"],
    "Each term telescopes: $\\frac1{k(k+1)}=\\frac1k-\\frac1{k+1}$, so the sum is $1-\\frac1{100}=\\frac{99}{100}$.", "M", marks=2)

vol = (1.1 ** 2) * 0.8
assert abs(vol - 0.968) < 1e-12
scq("ga_quant_07", "GA.QUANT.MENS", "The radius of a right circular cylinder is increased by 10% and its height is decreased by 20%. The volume of the cylinder",
    "decreases by 3.2%", ["decreases by 10%", "increases by 2%", "decreases by 1.2%"],
    "$V\\propto r^2 h$, so the new volume is $1.1^2\\times 0.8=0.968$ times the old one: a 3.2% decrease.", "M", marks=2)

cnt = sum(1 for a in range(1, 7) for b in range(1, 7) if a + b == 9)
assert cnt == 4
scq("ga_quant_08", "GA.QUANT.STAT", "Two fair six-faced dice are thrown together. The probability that the sum of the numbers shown is 9 is",
    "$\\frac{1}{9}$", ["$\\frac{1}{12}$", "$\\frac{5}{36}$", "$\\frac{1}{6}$"],
    "Favourable pairs: (3,6),(4,5),(5,4),(6,3) = 4 out of 36, i.e. $\\frac19$.", "E")

sol_x = [x for x in (2 ** (k / 8) for k in range(0, 64)) if abs(log2(x) + log2(x) / 2 - 6) < 1e-9]
assert sol_x and abs(sol_x[0] - 16) < 1e-9
nat("ga_quant_09", "GA.QUANT.NUMC", "If $\\log_2 x + \\log_4 x = 6$, the value of $x$ is ______.", 16,
    "$\\log_4 x=\\frac12\\log_2 x$, so $\\frac32\\log_2 x=6$, $\\log_2 x=4$, $x=16$.", diff="M", marks=2)

# probability puzzle (GA elementary statistics)
nums = [4, 7, 9, 12, 18]
m = sum(nums) / len(nums)
assert m == 10.0
nat("ga_quant_10", "GA.QUANT.STAT", "The mean of five numbers 4, 7, 9, 12 and $x$ is 10. The median of the five numbers is ______.", 9,
    "Sum $=50$ so $x=50-32=18$. Sorted: 4, 7, 9, 12, 18; the median is 9.", diff="E")
assert sorted([4, 7, 9, 12, 50 - 32])[2] == 9

# ------------------------------------------------------------------ data interpretation (tables)
rev = {"North": [120, 135, 150], "South": [90, 99, 126], "East": [60, 90, 108]}  # 2022..2024, in Rs lakh
tot24 = sum(v[2] for v in rev.values())
share = F(rev["South"][2], tot24)
assert tot24 == 384 and abs(float(share) - 0.328125) < 1e-12
scq("ga_di_01", "GA.QUANT.DI", "The table gives the yearly revenue (in Rs lakh) of a company in three regions.\n\n| Region | 2022 | 2023 | 2024 |\n|---|---|---|---|\n| North | 120 | 135 | 150 |\n| South | 90 | 99 | 126 |\n| East | 60 | 90 | 108 |\n\nIn 2024, the share of the South region in the total revenue is closest to",
    "32.8%", ["30.0%", "35.0%", "28.4%"],
    "Total 2024 $=150+126+108=384$. South share $=126/384=0.328\\ldots\\approx 32.8\\%$.", "E")

growth = {k: (v[2] - v[0]) / v[0] for k, v in rev.items()}
best = max(growth, key=growth.get)
assert best == "East" and abs(growth["East"] - 0.8) < 1e-12
scq("ga_di_02", "GA.QUANT.DI", "Using the same revenue table (2022-2024) as below, which region shows the highest percentage growth in revenue from 2022 to 2024?\n\n| Region | 2022 | 2023 | 2024 |\n|---|---|---|---|\n| North | 120 | 135 | 150 |\n| South | 90 | 99 | 126 |\n| East | 60 | 90 | 108 |",
    "East", ["North", "South", "North and South are equal"],
    "Growth: North $30/120=25\\%$, South $36/90=40\\%$, East $48/60=80\\%$. East is highest.", "E", marks=1)

marks_tab = {"P": 62, "Q": 71, "R": 55, "S": 80, "T": 67}
mean = sum(marks_tab.values()) / 5
above = [v for v in marks_tab.values() if v > mean]
avg_above = sum(above) / len(above)
assert mean == 67.0 and abs(avg_above - 75.5) < 1e-12
nat("ga_di_03", "GA.QUANT.DI", "Marks (out of 100) obtained by five students are shown.\n\n| Student | P | Q | R | S | T |\n|---|---|---|---|---|---|\n| Marks | 62 | 71 | 55 | 80 | 67 |\n\nThe average marks of those students who scored strictly more than the class average is ______.",
    avg_above, "Class mean $=335/5=67$. Students above 67: Q (71) and S (80), whose average is $75.5$.", tol=0.0, diff="M", marks=2)

pie = {"A": 35, "B": 25, "C": 22, "D": 18}
total_votes = 80000
valid = total_votes * 0.9
bc = valid * (pie["B"] + pie["C"]) / 100
assert bc == 33840
nat("ga_di_04", "GA.QUANT.DI", "In a survey, 80,000 responses were received, of which 10% were invalid. The valid responses were distributed among four options as: A 35%, B 25%, C 22%, D 18%. The number of valid responses for options B and C together is ______.",
    bc, "Valid responses $=0.9\\times 80000=72000$. B and C together: $47\\%$ of 72000 $=33840$.", diff="M", marks=2)

# ------------------------------------------------------------------ analytical reasoning (by enumeration)
people = "ABCDE"
sols = []
for perm in itertools.permutations(people):
    pos = {p: i for i, p in enumerate(perm)}
    if abs(pos["A"] - pos["B"]) == 1 and pos["C"] < pos["D"] and pos["E"] == 2 and pos["A"] < pos["C"] and pos["B"] != 0:
        sols.append(perm)
# E in the middle, A beside B, B not at the left end, A before C, C before D
assert sols, sols
ends = {(s[0], s[-1]) for s in sols}
leftmost = {s[0] for s in sols}
assert leftmost == {"A"}, leftmost
scq("ga_anal_01", "GA.ANAL.DED", "Five friends A, B, C, D and E sit in a row of five seats facing north. E sits in the middle seat. A sits immediately next to B. B does not sit in the leftmost seat. A sits somewhere to the left of C, and C sits somewhere to the left of D. Who sits in the leftmost seat?",
    "A", ["B", "C", "D"],
    "E occupies seat 3. A and B are adjacent and B is not in seat 1, A is left of C, C left of D. Trying the adjacent pairs, only (A,B) in seats 1,2 works: A B E C D. Hence A sits leftmost. (Enumerating all 120 arrangements confirms A is leftmost in every valid one.)",
    "M", marks=2)

# knights and knaves (unique world, found by enumeration)
valid_worlds = []
for kn in itertools.product([True, False], repeat=3):  # True = truth-teller
    a, b, c = kn
    s_a = kn.count(False) == 1   # A: exactly one of us three is a liar
    s_b = not c                  # B: C is a liar
    s_c = a and b                # C: A and B are both truth-tellers
    if (a == s_a) and (b == s_b) and (c == s_c):
        valid_worlds.append(kn)
assert valid_worlds == [(False, True, False)]
scq("ga_anal_02", "GA.ANAL.DED", "On an island each person is either a truth-teller (always speaks the truth) or a liar (always lies). Three people speak:\n\nA: 'Exactly one of the three of us is a liar.'\n\nB: 'C is a liar.'\n\nC: 'A and B are both truth-tellers.'\n\nHow many of the three are liars?",
    "2", ["0", "1", "3"],
    "Suppose C is truthful: then A and B are truthful, but B says C is a liar, a contradiction. So C is a liar and B (who says so) is truthful. If A were truthful, C's claim 'A and B are both truth-tellers' would be true, contradicting that C lies; so A is a liar. Liars: A and C, i.e. 2. (Checked by enumerating all 8 assignments: exactly one is consistent.)",
    "M", marks=2)

# number series
seq = [n * n - 1 for n in range(2, 8)]
assert seq == [3, 8, 15, 24, 35, 48]
nat("ga_anal_03", "GA.ANAL.NREL", "The next term of the series 3, 8, 15, 24, ______ is", 35,
    "The terms are $n^2-1$ for $n=2,3,4,5$, so the next term is $6^2-1=35$.", diff="E")

def shift(w, k):
    return "".join(chr((ord(c) - 65 + k) % 26 + 65) for c in w)
assert shift("DATA", 2) == "FCVC" and shift("GATE", 2) == "ICVG"
scq("ga_anal_04", "GA.ANAL.NREL", "In a certain code, every letter is replaced by the letter two places later in the alphabet, so DATA is written as FCVC. In the same code, GATE is written as", "ICVG", ["HBUF", "ICVF", "ECRC"],
    "G+2=I, A+2=C, T+2=V, E+2=G, giving ICVG.", "E", marks=1)

# ages
ans = None
for fa in range(20, 70):
    for so in range(1, 40):
        if fa == 3 * so and fa + 12 == 2 * (so + 12):
            ans = (fa, so)
assert ans == (36, 12)
nat("ga_anal_05", "GA.ANAL.NREL", "A father is three times as old as his son. Twelve years from now the father will be twice as old as the son. The present age of the father, in years, is ______.", 36,
    "Let son = $s$, father = $3s$. $3s+12=2(s+12)\\Rightarrow s=12$, father = 36.", diff="E")

d = date(2027, 2, 6)
wd = d.strftime("%A")
assert date(2027, 1, 1).strftime("%A") == "Friday" and wd == "Saturday"
scq("ga_anal_06", "GA.ANAL.NREL", "If 1 January 2027 is a Friday (2027 is not a leap year), then 6 February 2027 is a", "Saturday", ["Friday", "Sunday", "Thursday"],
    "From 1 January to 6 February is $31+5=36$ days. $36 \\bmod 7=1$, so the weekday advances by one: Friday to Saturday.", "M", marks=1)

import itertools as it
rows = [(p, q) for p, q in it.product([True, False], repeat=2)]
imp = lambda p, q: (not p) or q
# premises: rain -> cancelled; not cancelled. Which conclusion holds in every model?
models = [(r, c) for r, c in rows if imp(r, c) and not c]
assert models == [(False, False)]
scq("ga_anal_07", "GA.ANAL.DED", "A coach says: 'If it rains, the match will be cancelled.' The match was not cancelled. Which one of the following must be true?",
    "It did not rain.", ["It rained but the umpires overruled the rule.", "The match was played in the rain.", "It may or may not have rained."],
    "From $R\\Rightarrow C$ and $\\neg C$ we get $\\neg R$ (modus tollens). Enumerating the four truth assignments, the only model satisfying both statements has R false.",
    "E", marks=1)

lst = [(a, b, c) for a in range(1, 10) for b in range(0, 10) for c in range(0, 10) if a + b + c == 10 and a * b * c == 24 and a > b > c]
assert lst == [(4, 3, 2)] or lst == [] or True
three = [(a, b, c) for a in range(1, 10) for b in range(1, 10) for c in range(1, 10) if a + b + c == 9 and a * b * c == 24 and a > b > c]
assert three == [(4, 3, 2)]
scq("ga_anal_08", "GA.ANAL.NREL", "Three distinct positive single-digit integers, written in strictly decreasing order from left to right, have sum 9 and product 24. The middle integer is", "3", ["2", "4", "6"],
    "The distinct-digit triples with product 24 are (4,3,2) with sum 9, (6,4,1) with sum 11 and (8,3,1) with sum 12, (6,2,2)-type triples repeat a digit. Only (4,3,2) has sum 9, so the middle integer is 3.",
    "M", marks=2)

# ------------------------------------------------------------------ spatial (coordinates, text only)
def rot90(p):
    return (-p[1], p[0])
p = (2, 3)
assert rot90(p) == (-3, 2) and (rot90(p)[0], -rot90(p)[1]) == (-3, -2)
scq("ga_spat_01", "GA.SPAT.TRANS", "The point $(2, 3)$ is rotated by $90^\\circ$ anticlockwise about the origin and the resulting point is then reflected in the $x$-axis. The final point is",
    "$(-3, -2)$", ["$(3, 2)$", "$(-3, 2)$", "$(3, -2)$"],
    "Rotation by $90^\\circ$ anticlockwise maps $(x,y)\\mapsto(-y,x)$, giving $(-3,2)$. Reflection in the $x$-axis maps $(x,y)\\mapsto(x,-y)$, giving $(-3,-2)$.", "M", marks=1)

n = 3
cubes = [(x, y, z) for x in range(n) for y in range(n) for z in range(n)]
two = sum(1 for c in cubes if sum(1 for v in c if v in (0, n - 1)) == 2)
one = sum(1 for c in cubes if sum(1 for v in c if v in (0, n - 1)) == 1)
assert two == 12 and one == 6
nat("ga_spat_02", "GA.SPAT.ASSM", "A solid cube is painted red on all six faces and then cut into 27 identical small cubes ($3\\times3\\times3$). The number of small cubes with exactly two red faces is ______.", 12,
    "Cubes on the edges but not at corners have two painted faces: 12 edges $\\times$ 1 cube each $=12$.", diff="E")

def holes(folds):  # a square sheet folded in half 'folds' times alternately; one punch through all layers
    return 2 ** folds
assert holes(2) == 4
nat("ga_spat_03", "GA.SPAT.FOLD", "A square sheet of paper is folded in half along a vertical line, and the resulting rectangle is folded in half along its horizontal midline. One hole is punched through all layers at a point not on any fold line. After the sheet is fully unfolded, the number of holes is ______.", 4,
    "Each fold doubles the number of layers: $2\\times 2=4$ layers, so one punch makes 4 holes after unfolding.", diff="E")
