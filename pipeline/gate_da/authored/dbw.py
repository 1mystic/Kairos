"""Database Management and Warehousing. SQL is executed on sqlite3 (stdlib); FD questions use attribute closure."""
import itertools
import sqlite3
from math import floor, log, prod

from . import msq, nat, scq


def sql(setup, query):
    con = sqlite3.connect(":memory:")
    con.executescript(setup)
    rows = con.execute(query).fetchall()
    con.close()
    return rows


def md_table(head, rows):
    return "| " + " | ".join(head) + " |\n|" + "---|" * len(head) + "\n" + "\n".join("| " + " | ".join(str(c) for c in r) + " |" for r in rows)


EMP = [(1, "Asha", 10, 50000), (2, "Bhanu", 10, 60000), (3, "Chitra", 20, 45000), (4, "Dev", 20, None), (5, "Esha", 30, 70000), (6, "Farid", None, 40000)]
DEPT = [(10, "Sales"), (20, "Tech"), (30, "HR"), (40, "Ops")]
SETUP = ("CREATE TABLE Emp(id INT, name TEXT, dept INT, sal INT);CREATE TABLE Dept(did INT, dname TEXT);"
         + "".join(f"INSERT INTO Emp VALUES({a},'{b}',{'NULL' if c is None else c},{'NULL' if d is None else d});" for a, b, c, d in EMP)
         + "".join(f"INSERT INTO Dept VALUES({a},'{b}');" for a, b in DEPT))
TABLES = ("Emp\n\n" + md_table(["id", "name", "dept", "sal"], [[("NULL" if x is None else x) for x in r] for r in EMP])
          + "\n\nDept\n\n" + md_table(["did", "dname"], DEPT))

# 1 inner join count
q = "SELECT COUNT(*) FROM Emp, Dept WHERE Emp.dept = Dept.did AND Emp.sal > 45000"
r = sql(SETUP, q)[0][0]
assert r == sum(1 for e in EMP for d in DEPT if e[2] == d[0] and e[3] is not None and e[3] > 45000) == 3
nat("dbw_sql_01", "DBW.REL.SQL", "Consider the tables\n\n" + TABLES + "\n\nThe query\n\n```sql\nSELECT COUNT(*) FROM Emp, Dept WHERE Emp.dept = Dept.did AND Emp.sal > 45000;\n```\n\nreturns the value ______.", r,
    r"""Matching rows with sal > 45000: Asha (Sales, 50000), Bhanu (Sales, 60000), Esha (HR, 70000). Dev's salary is NULL and Farid's dept is NULL (never equal to a key), so the count is 3.""", diff="E")

# 2 AVG/COUNT with NULL
a = sql(SETUP, "SELECT AVG(sal) FROM Emp")[0][0]
c1 = sql(SETUP, "SELECT COUNT(*) FROM Emp")[0][0]
c2 = sql(SETUP, "SELECT COUNT(sal) FROM Emp")[0][0]
assert (a, c1, c2) == (53000.0, 6, 5)
nat("dbw_sql_02", "DBW.REL.SQL", "Using the same Emp table as below, the value of `SELECT AVG(sal) FROM Emp` is ______.\n\n" + TABLES.split("\n\nDept")[0], a,
    r"""Aggregates ignore NULL: the average is over the five non-NULL salaries: $(50000+60000+45000+70000+40000)/5=53000$.""", diff="M", marks=1)

# 3 NOT IN with NULL trap
q = "SELECT COUNT(*) FROM Dept WHERE did NOT IN (SELECT dept FROM Emp)"
r3 = sql(SETUP, q)[0][0]
q2 = "SELECT COUNT(*) FROM Dept d WHERE NOT EXISTS (SELECT 1 FROM Emp e WHERE e.dept = d.did)"
r3b = sql(SETUP, q2)[0][0]
assert r3 == 0 and r3b == 1
scq("dbw_sql_03", "DBW.REL.SQL", "Using the Emp and Dept tables below, which statement about the two queries is correct?\n\n" + TABLES + "\n\n(Q1) `SELECT COUNT(*) FROM Dept WHERE did NOT IN (SELECT dept FROM Emp);`\n\n(Q2) `SELECT COUNT(*) FROM Dept d WHERE NOT EXISTS (SELECT 1 FROM Emp e WHERE e.dept = d.did);`",
    "Q1 returns 0 and Q2 returns 1", ["Both return 1", "Q1 returns 1 and Q2 returns 0", "Both return 0"],
    r"""`Emp.dept` contains NULL (Farid). For every `did`, `did NOT IN (10,20,30,NULL)` evaluates to UNKNOWN or FALSE, never TRUE, so Q1 counts 0 rows. Q2 uses `NOT EXISTS`, which is not affected by NULL: only department 40 (Ops) has no employee, so it returns 1.""", "H", marks=2)

# 4 group by having
q = "SELECT COUNT(*) FROM (SELECT dept FROM Emp WHERE dept IS NOT NULL GROUP BY dept HAVING COUNT(*) >= 2 AND SUM(sal) > 100000)"
r4 = sql(SETUP, q)[0][0]
assert r4 == 1
nat("dbw_sql_04", "DBW.REL.SQL", "For the Emp table below, the query\n\n```sql\nSELECT COUNT(*) FROM (\n  SELECT dept FROM Emp WHERE dept IS NOT NULL\n  GROUP BY dept HAVING COUNT(*) >= 2 AND SUM(sal) > 100000);\n```\n\nreturns ______.\n\n" + TABLES.split("\n\nDept")[0], r4,
    r"""Dept 10: 2 employees, sum 110000 (qualifies). Dept 20: 2 employees but SUM ignores the NULL: 45000 (fails). Dept 30: 1 employee. Count $=1$.""", diff="M", marks=2)

# 5 outer join rows
r5 = sql(SETUP, "SELECT COUNT(*) FROM Dept LEFT JOIN Emp ON Emp.dept = Dept.did")[0][0]
assert r5 == 6
nat("dbw_sql_05", "DBW.REL.SQL", "For the tables below, the number of rows returned by `SELECT * FROM Dept LEFT OUTER JOIN Emp ON Emp.dept = Dept.did` is ______.\n\n" + TABLES, r5,
    r"""Matched pairs: Sales 2, Tech 2, HR 1 = 5 rows; Ops has no employee and appears once with NULLs: 6 rows. (Farid, with NULL dept, is not preserved by a LEFT join on Dept.)""", diff="M", marks=2)

# 6 SQL semantic MSQ checked on sqlite
t1 = sql(SETUP, "SELECT COUNT(*) FROM Emp WHERE sal > 40000 OR sal <= 40000")[0][0] == 5  # NULL excluded
t2 = sql(SETUP, "SELECT COUNT(DISTINCT dept) FROM Emp")[0][0] == 3
t3 = sql(SETUP, "SELECT COUNT(*) FROM Emp WHERE dept = NULL")[0][0] == 0
t4 = sql(SETUP, "SELECT COUNT(*) FROM Emp WHERE dept IS NULL")[0][0] == 1
assert t1 and t2 and t3 and t4
msq("dbw_sql_06", "DBW.REL.SQL", "For the Emp table below, select all TRUE statements.\n\n" + TABLES.split("\n\nDept")[0],
    [("`SELECT COUNT(*) FROM Emp WHERE sal > 40000 OR sal <= 40000` returns 6", False), ("`SELECT COUNT(DISTINCT dept) FROM Emp` returns 3", True),
     ("`SELECT COUNT(*) FROM Emp WHERE dept = NULL` returns 0", True), ("`SELECT COUNT(*) FROM Emp WHERE dept IS NULL` returns 1", True)],
    r"""The first predicate is UNKNOWN for Dev's NULL salary, so 5 rows pass, not 6. `COUNT(DISTINCT)` skips NULL (10, 20, 30). `= NULL` is never true; `IS NULL` finds Farid only.""", "M", marks=2)

# 7 relational algebra: division
supply = {("s1", "p1"), ("s1", "p2"), ("s1", "p3"), ("s2", "p1"), ("s2", "p2"), ("s3", "p2"), ("s3", "p3"), ("s4", "p1"), ("s4", "p2"), ("s4", "p3"), ("s4", "p4")}
parts = {"p1", "p2", "p3"}
sup = {s for s, _ in supply}
div = {s for s in sup if parts <= {p for t, p in supply if t == s}}
assert div == {"s1", "s4"}
nat("dbw_ra_01", "DBW.REL.ALGB", "The relation Supplies(supplier, part) and Needed(part) are\n\n" + md_table(["supplier", "part"], sorted(supply)) + "\n\n" + md_table(["part"], sorted((p,) for p in parts)) + "\n\nThe number of tuples in Supplies $\\div$ Needed is ______.", len(div),
    r"""The division returns suppliers that supply every needed part $\{p_1,p_2,p_3\}$: s1 and s4 (s2 lacks p3, s3 lacks p1). Answer 2.""", diff="M", marks=2)

# 8 candidate keys / closure
def closure(attrs, fds):
    c = set(attrs)
    ch = True
    while ch:
        ch = False
        for l, r in fds:
            if set(l) <= c and not set(r) <= c:
                c |= set(r)
                ch = True
    return c
U = set("ABCDE")
fds = [("AB", "C"), ("C", "D"), ("D", "E"), ("E", "A")]
keys = []
for k in range(1, 6):
    for comb in itertools.combinations("ABCDE", k):
        if closure(comb, fds) == U and not any(set(x) < set(comb) for x in keys):
            keys.append("".join(comb))
assert sorted(keys) == ["AB", "BC", "BD", "BE"]
nat("dbw_nf_01", "DBW.NF.NF", r"""$R(A,B,C,D,E)$ has functional dependencies $AB\to C,\ C\to D,\ D\to E,\ E\to A$. The number of candidate keys of $R$ is ______.""", len(keys),
    r"""$B$ is in no right-hand side, so every key contains $B$. $\{B\}^+=\{B\}$ is not enough. $AB^+=ABCDE$; $BC^+$: $C\to D\to E\to A$, then $AB\to C$: all attributes; similarly $BD$ and $BE$. Candidate keys: AB, BC, BD, BE: 4.""", diff="H", marks=2)

# 9 closure size
fds2 = [("A", "B"), ("B", "CD"), ("DE", "F"), ("C", "E")]
cl = closure("A", fds2)
assert cl == set("ABCDEF")
nat("dbw_nf_02", "DBW.NF.NF", r"""For $R(A,B,C,D,E,F)$ with $A\to B,\ B\to CD,\ DE\to F,\ C\to E$, the number of attributes in the closure $\{A\}^+$ is ______.""", len(cl),
    r"""$A\to B\to CD$ gives $\{A,B,C,D\}$; $C\to E$ adds $E$; $DE\to F$ adds $F$. So $A^+=\{A,B,C,D,E,F\}$: 6 attributes (A is a key).""", diff="M", marks=1)

# 10 BCNF / 3NF classification
def is_bcnf(U, fds):
    return all(closure(l, fds) >= U for l, r in fds if not set(r) <= set(l))
def prime_attrs(U, fds):
    ks = []
    for k in range(1, len(U) + 1):
        for comb in itertools.combinations(sorted(U), k):
            if closure(comb, fds) == U and not any(set(x) <= set(comb) for x in ks):
                ks.append(comb)
    return {a for k in ks for a in k}
def is_3nf(U, fds):
    pr = prime_attrs(U, fds)
    return all(closure(l, fds) >= U or set(r) - set(l) <= pr for l, r in fds)
U2 = set("ABCD")
f2 = [("AB", "C"), ("C", "D"), ("D", "A")]   # keys: AB, BC, BD ; A is prime
assert is_3nf(U2, f2) and not is_bcnf(U2, f2)
f3 = [("AB", "C"), ("C", "D")]
assert not is_3nf(set("ABCD"), f3)
scq("dbw_nf_03", "DBW.NF.NF", r"""$R(A,B,C,D)$ has functional dependencies $AB\to C,\ C\to D,\ D\to A$. The highest normal form satisfied by $R$ is""", "3NF but not BCNF", ["BCNF", "2NF but not 3NF", "1NF but not 2NF"],
    r"""Candidate keys: AB, BC, BD (B is in no right-hand side), so every attribute is prime. Hence no non-prime attribute exists and $R$ is in 3NF. But $C\to D$ and $D\to A$ have non-superkey determinants ($C^+=\{A,C,D\}\ne R$), so $R$ is not in BCNF.""", "H", marks=2)

# 11 B+ tree order and levels
block, keysz, ptrsz = 4096, 12, 8
n = floor((block + keysz) / (keysz + ptrsz))
assert n == 205 or n == floor((block + keysz) / (keysz + ptrsz))
nat("dbw_idx_01", "DBW.NF.IDX", r"""A B+ tree node occupies one 4096-byte block. A key takes 12 bytes and a pointer 8 bytes. An internal node with $p$ pointers holds $p-1$ keys. The maximum possible $p$ (order of the internal node) is ______.""", n,
    r"""Need $8p+12(p-1)\le4096\Rightarrow 20p\le4108\Rightarrow p\le205.4$, so $p=205$.""", diff="M", marks=2)
assert 8 * 205 + 12 * 204 <= 4096 < 8 * 206 + 12 * 205

# 12 cuboid count with hierarchies
levels = [3, 2, 2]
cub = prod(l + 1 for l in levels)
brute = sum(1 for _ in itertools.product(*[range(l + 1) for l in levels]))
assert cub == brute == 36
nat("dbw_dw_01", "DBW.DW.MEAS", "A data cube has three dimensions with concept hierarchies having 3, 2 and 2 levels respectively (excluding the virtual top level 'all'). The total number of cuboids that can be formed (each dimension at one of its levels or at 'all') is ______.", cub,
    r"""Each dimension can be aggregated at $L_i$ levels or at 'all': $\prod(L_i+1)=4\cdot3\cdot3=36$.""", diff="M", marks=2)

# 13 cells in full cube
card = [4, 5, 3]
cells = prod(c + 1 for c in card)
assert cells == 120 == sum(prod(card[i] for i in s) for k in range(4) for s in itertools.combinations(range(3), k))
nat("dbw_dw_02", "DBW.DW.SCH", "A fact table has three dimensions with 4, 5 and 3 distinct values. The total number of cells in the complete data cube (all $2^3$ cuboids, counting the apex cell) is ______.", cells,
    r"""Cells $=\prod(c_i+1)=5\cdot6\cdot4=120$ (equivalently $\sum_{S\subseteq\{1,2,3\}}\prod_{i\in S}c_i$).""", diff="M", marks=2)

# 14 normalisation
mu, sd, x = 65, 10, 80
z = (x - mu) / sd
assert z == 1.5
nat("dbw_xfm_01", "DBW.XFM.NORM", "A score of 80 is z-score normalised with attribute mean 65 and standard deviation 10. The normalised value is ______.", z,
    r"""$z=\frac{80-65}{10}=1.5$.""", tol=0.0, diff="E")
mn, mx = 20, 120
v = (45 - mn) / (mx - mn)
assert v == 0.25
nat("dbw_xfm_02", "DBW.XFM.NORM", "An attribute has minimum 20 and maximum 120. Min-max normalisation to $[0,1]$ maps the value 45 to ______.", v,
    r"""$\frac{45-20}{120-20}=0.25$.""", diff="E")

# 15 foreign-key integrity (executed with sqlite foreign keys ON)
def fk_ok(stmt):
    con = sqlite3.connect(":memory:")
    con.execute("PRAGMA foreign_keys=ON")
    con.executescript("CREATE TABLE P(id INTEGER PRIMARY KEY);CREATE TABLE C(cid INTEGER PRIMARY KEY, pid INTEGER REFERENCES P(id));"
                      "INSERT INTO P VALUES(1),(2);INSERT INTO C VALUES(10,1),(11,NULL);")
    try:
        con.execute(stmt)
        return True
    except sqlite3.IntegrityError:
        return False
t = {"ins_c_bad": fk_ok("INSERT INTO C VALUES(12, 9)"), "ins_c_null": fk_ok("INSERT INTO C VALUES(12, NULL)"), "del_p_used": fk_ok("DELETE FROM P WHERE id=1"),
     "del_p_free": fk_ok("DELETE FROM P WHERE id=2"), "del_c": fk_ok("DELETE FROM C WHERE cid=10")}
assert t == {"ins_c_bad": False, "ins_c_null": True, "del_p_used": False, "del_p_free": True, "del_c": True}
msq("dbw_ic_01", "DBW.REL.IC", "Relation Child(cid, pid) has `pid` as a foreign key referencing the primary key `id` of Parent, with no ON DELETE action (default NO ACTION). Parent holds ids 1 and 2; Child has rows (10, 1) and (11, NULL). Select all operations that are accepted without violating integrity constraints.",
    [("Insert Child row (12, 9)", t["ins_c_bad"]), ("Insert Child row (12, NULL)", t["ins_c_null"]), ("Delete Parent row with id = 1", t["del_p_used"]), ("Delete Parent row with id = 2", t["del_p_free"])],
    r"""A foreign key must match an existing parent key or be NULL. (12, 9) has no parent (violation); (12, NULL) is allowed; deleting parent 1 would orphan Child row (10, 1) (violation); parent 2 is unreferenced so deleting it is fine. (Each operation was executed on SQLite with foreign keys enforced.) Correct: B, D.""", "M", marks=2)

# 16 tuple relational calculus
R_ = [("a", 1), ("a", 2), ("b", 3), ("c", 3), ("c", 4)]
S_ = [(1, "x"), (3, "y"), (4, "z"), (5, "w")]
res = {r for r in R_ if any(r[1] == s[0] and s[1] != "y" for s in S_)}
assert res == {("a", 1), ("c", 4)}
nat("dbw_tup_01", "DBW.REL.TUP", "Relations $R(A,B)=\\{(a,1),(a,2),(b,3),(c,3),(c,4)\\}$ and $S(B,C)=\\{(1,x),(3,y),(4,z),(5,w)\\}$. The tuple relational calculus expression $\\{t\\mid t\\in R\\wedge\\exists s\\in S\\,(s[B]=t[B]\\wedge s[C]\\neq 'y')\\}$ returns ______ tuples.", len(res),
    r"""For each $R$ tuple look for an $S$ tuple with equal $B$ and $C\ne y$: $(a,1)$ matches $(1,x)$; $(a,2)$ has no match; $(b,3)$ and $(c,3)$ match only $(3,y)$ (excluded); $(c,4)$ matches $(4,z)$. Two tuples.""", diff="M", marks=2)

# 17 ER to relational
nat("dbw_er_01", "DBW.ER", "An ER diagram has entities E1 (key k1, attribute a) and E2 (key k2, attributes b and a multivalued attribute m), and a many-to-many relationship R between E1 and E2 with a descriptive attribute d. The minimum number of relations in the standard relational mapping (one relation per entity, one per multivalued attribute, one per many-to-many relationship) is ______.", 4,
    r"""E1 → 1 relation; E2 → 1 relation; multivalued attribute $m$ → 1 separate relation (k2, m); relationship R (many-to-many with attribute d) → 1 relation (k1, k2, d). Total 4.""", diff="E", via="second-derivation")
