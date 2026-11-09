"""Chemistry (organic + biomolecules; no structure diagrams): GOC, hydrocarbons, halides, alcohols, carbonyls, amines, biomolecules."""
import itertools
import math

from . import intq, msq, nvq, scq

M = {"C": 12, "H": 1, "N": 14, "O": 16, "Br": 80, "Ag": 108, "Na": 23}


# ---- tree helpers (alkane skeletons) used for isomer counting -------------------------------------------------
def prufer_trees(n):
    for seq in itertools.product(range(n), repeat=n - 2):
        deg = [1] * n
        for x in seq:
            deg[x] += 1
        edges = []
        for x in seq:
            leaf = min(i for i in range(n) if deg[i] == 1)
            edges.append((leaf, x))
            deg[leaf] -= 1
            deg[x] -= 1
        u, v = [i for i in range(n) if deg[i] == 1]
        edges.append((u, v))
        yield edges


def adj(n, edges):
    a = [[] for _ in range(n)]
    for u, v in edges:
        a[u].append(v)
        a[v].append(u)
    return a


def canon(a, labels=None):
    """Canonical string of a labelled tree: minimum AHU encoding over all roots."""
    labels = labels or [""] * len(a)

    def enc(v, p):
        return "(" + labels[v] + "".join(sorted(enc(c, v) for c in a[v] if c != p)) + ")"
    return min(enc(r, -1) for r in range(len(a)))


def alkane_isomers(n):
    seen = set()
    for e in prufer_trees(n):
        a = adj(n, e)
        if max(len(x) for x in a) <= 4:
            seen.add(canon(a))
    return seen


def substituted(n, mark="X"):
    """Distinct mono-substituted alkane constitutions (substituent on one carbon) over all skeletons."""
    out = set()
    for e in prufer_trees(n):
        a = adj(n, e)
        if max(len(x) for x in a) > 4:
            continue
        for i in range(n):
            lab = [""] * n
            lab[i] = mark
            out.add(canon(a, lab))
    return out


def skeleton_substituted(edges, n):
    a = adj(n, edges)
    out = set()
    for i in range(n):
        lab = [""] * n
        lab[i] = "X"
        out.add(canon(a, lab))
    return len(out)


# ------------------------------------------------------------------ CHE.GOC
C, H = 9, 8
dbe = (2 * C + 2 - H) // 2
assert dbe == 6
intq("goc_dbe", "CHE.GOC",
     "The degree of unsaturation (number of rings plus $\\pi$ bonds) of a hydrocarbon of molecular formula $\\ce{C9H8}$ is",
     6,
     "$\\mathrm{DBE}=\\dfrac{2C+2-H}{2}=\\dfrac{20-8}{2}=6$.", diff="E")

scq("goc_iupac", "CHE.GOC",
    "The IUPAC name of $\\ce{(CH3)2CH-CH2-CH(CH3)-CH2CH3}$ is",
    "2,4-dimethylhexane", ["3,5-dimethylhexane", "2-ethyl-4-methylpentane", "2,4-dimethylheptane"],
    "Longest chain: $\\ce{CH3-CH(CH3)-CH2-CH(CH3)-CH2-CH3}$ has $6$ carbons (hexane) with methyl groups at C2 and C4 numbering from the left "
    "(locants $\\{2,4\\}$ against $\\{3,5\\}$ from the right; the lowest set wins). The $7$-carbon name is wrong because the formula has only $8$ carbons in total "
    "(hexane $+$ two methyls).", diff="M", via="second-derivation")

stab = {"CH3+": 0, "C2H5+": 1, "iPr+": 2, "tBu+": 3}  # number of alkyl (hyperconjugating/inductive) substituents
assert max(stab, key=stab.get) == "tBu+"
scq("goc_carbocation", "CHE.GOC",
    "The most stable carbocation among the following is",
    "$\\ce{(CH3)3C+}$", ["$\\ce{CH3+}$", "$\\ce{CH3CH2+}$", "$\\ce{(CH3)2CH+}$"],
    "Stability increases with the number of alkyl groups (inductive effect and hyperconjugation: $9$ $\\alpha$-C-H bonds in $t$-butyl): "
    "$3^\\circ>2^\\circ>1^\\circ>\\text{methyl}$.", diff="E", via="second-derivation")

atoms = ["C1", "C2", "C3", "C4", "H1", "H2", "H3", "H4"]  # CH2=CH-C≡CH
n_atoms = 4 + 4
sigma = n_atoms - 1
pi_ = (2 * 4 + 2 - 4) // 2
assert sigma == 7 and pi_ == 3
intq("goc_sigma", "CHE.GOC",
     "The number of $\\sigma$ bonds in the molecule $\\ce{CH2=CH-C#CH}$ is",
     7,
     "$\\sigma$ bonds: $4$ C-H $+$ $3$ C-C (one in each of $\\mathrm{C=C}$, the single bond and $\\mathrm{C\\equiv C}$) $=7$. "
     "Check: the molecule has $8$ atoms and no ring, so $8-1=7$ $\\sigma$ bonds; the $3$ remaining bonds are $\\pi$ (DBE of $\\ce{C4H4}=3$).", diff="E")

# ------------------------------------------------------------------ CHE.HC
n7 = len(alkane_isomers(7))
assert n7 == 9 and len(alkane_isomers(5)) == 3 and len(alkane_isomers(6)) == 5
intq("hc_isomers", "CHE.HC",
     "The number of structural (chain) isomers of the alkane $\\ce{C7H16}$ is",
     9,
     "Enumerate by longest chain: heptane $(1)$; hexane with one methyl at C2 or C3 $(2)$; pentane with two methyls "
     "($2,2$-, $2,3$-, $2,4$-, $3,3$-) $(4)$; pentane with $3$-ethyl $(1)$; butane with $2,2,3$-trimethyl $(1)$. Total $1+2+4+1+1=9$. "
     "(Also confirmed by exhaustive enumeration of the $7$-vertex trees with maximum degree $4$.)", diff="M")

mL_C3H8 = 20 * 3
assert mL_C3H8 == 60
intq("hc_combustion", "CHE.HC",
     "$20\\ \\mathrm{mL}$ of ethene is burnt completely in excess oxygen at constant temperature and pressure. The volume of $\\ce{O2}$ consumed in mL is",
     60,
     "$\\ce{C2H4 + 3O2 -> 2CO2 + 2H2O}$. By Avogadro's law gas volumes are in mole ratio: $20\\times3=60\\ \\mathrm{mL}$.", diff="E")

scq("hc_peroxide", "CHE.HC",
    "Propene reacts with $\\ce{HBr}$ in the presence of an organic peroxide. The major product is",
    "1-bromopropane", ["2-bromopropane", "1,2-dibromopropane", "2-bromopropene"],
    "In the presence of peroxides $\\ce{HBr}$ adds by a free-radical chain (anti-Markovnikov): $\\ce{Br.}$ attacks the terminal carbon to give the more stable "
    "secondary radical $\\ce{CH3-CH.-CH2Br}$, which abstracts H from $\\ce{HBr}$: $\\ce{CH3CH2CH2Br}$. Without peroxide the product would be $2$-bromopropane.",
    diff="M", via="second-derivation")

dbe5 = (2 * 5 + 2 - 6) // 2
assert dbe5 == 3 and 2 * 1 + 1 == 3  # C≡C needs 2 H2, C=C needs 1
intq("hc_hydrogenation", "CHE.HC",
     "How many moles of $\\ce{H2}$ are needed to hydrogenate $1$ mol of $\\ce{CH2=CH-C#C-CH3}$ completely to pentane?",
     3,
     "The $\\ce{C#C}$ bond takes $2$ mol $\\ce{H2}$ and the $\\ce{C=C}$ takes $1$: total $3$ mol. Check by DBE: $\\ce{C5H6}$ has $(12-6)/2=3$ units of unsaturation; "
     "each consumes one $\\ce{H2}$ giving $\\ce{C5H12}$.", diff="E")

iso = [(0, 1), (1, 2), (2, 3), (1, 4)]  # 2-methylbutane: C1-C2(C5)-C3-C4
assert skeleton_substituted(iso, 5) == 4
intq("hc_chlorination", "CHE.HC",
     "The number of different monochloro structural isomers obtainable by free-radical chlorination of $2$-methylbutane is",
     4,
     "$2$-Methylbutane $\\ce{(CH3)2CH-CH2-CH3}$ has $4$ types of C-H: the two equivalent $\\ce{CH3}$ on C2, the C2-H, the $\\ce{CH2}$, "
     "and the terminal $\\ce{CH3}$. So $4$ constitutional products (stereoisomers not counted). Confirmed by symmetry-class enumeration of the carbon skeleton.",
     diff="M")

arom = {"benzene": (6, True), "cyclopentadienyl anion": (6, True), "cycloheptatrienyl cation": (6, True),
        "cyclooctatetraene": (8, False), "cyclobutadiene": (4, True)}
ans = {k: (e % 4 == 2 and planar) for k, (e, planar) in arom.items()}
assert ans == {"benzene": True, "cyclopentadienyl anion": True, "cycloheptatrienyl cation": True,
               "cyclooctatetraene": False, "cyclobutadiene": False}
msq("hc_huckel", "CHE.HC",
    "Select all species that are aromatic.",
    [("Benzene", True), ("Cyclopentadienyl anion, $\\ce{C5H5-}$", True), ("Cycloheptatrienyl cation, $\\ce{C7H7+}$", True),
     ("Cyclooctatetraene (tub-shaped, $\\ce{C8H8}$)", False), ("Cyclobutadiene, $\\ce{C4H4}$", False)],
    "Aromatic: planar, cyclic, fully conjugated with $(4n+2)\\,\\pi$ electrons (Hückel). Benzene $6$, $\\ce{C5H5-}$ $6$, $\\ce{C7H7+}$ $6$: aromatic. "
    "Cyclooctatetraene has $8\\,\\pi$ electrons and is non-planar; cyclobutadiene has $4\\,\\pi$ electrons ($4n$: antiaromatic).", diff="M")

# ------------------------------------------------------------------ CHE.HALO
rel = {"CH3Br": 4, "CH3CH2Br": 3, "(CH3)2CHBr": 2, "(CH3)3CBr": 1}  # SN2 steric rank
assert max(rel, key=rel.get) == "CH3Br"
scq("halo_sn2", "CHE.HALO",
    "Which bromide reacts fastest with $\\ce{NaOH}$ by the $\\mathrm{S_N2}$ mechanism?",
    "$\\ce{CH3Br}$", ["$\\ce{CH3CH2Br}$", "$\\ce{(CH3)2CHBr}$", "$\\ce{(CH3)3CBr}$"],
    "$\\mathrm{S_N2}$ needs backside attack, which is hindered by alkyl groups: methyl $>1^\\circ>2^\\circ>3^\\circ$. "
    "(The $3^\\circ$ bromide would prefer $\\mathrm{S_N1}$/elimination.)", diff="E", via="second-derivation")

stereo = 2 ** 2  # two non-equivalent stereocentres in CH3-CHBr-CHCl-CH3
assert stereo == 4
intq("halo_stereo", "CHE.HALO",
     "The total number of stereoisomers of $2$-bromo-$3$-chlorobutane is",
     4,
     "Both C2 (H, Br, $\\ce{CH3}$, $\\ce{CHClCH3}$) and C3 (H, Cl, $\\ce{CH3}$, $\\ce{CHBrCH3}$) are stereocentres. Because the molecule has no symmetry "
     "(Br $\\neq$ Cl) there is no meso form: $2^2=4$ stereoisomers (two enantiomeric pairs).", diff="M")

scq("halo_elim", "CHE.HALO",
    "$2$-Bromobutane is heated with alcoholic $\\ce{KOH}$. The major product is",
    "but-2-ene", ["but-1-ene", "butan-2-ol", "butan-1-ol"],
    "Alcoholic $\\ce{KOH}$ favours E2 elimination; by Saytzeff's rule the more substituted (more stable) alkene $\\ce{CH3CH=CHCH3}$ predominates over "
    "$\\ce{CH2=CHCH2CH3}$. Aqueous $\\ce{KOH}$ would give substitution (alcohol).", diff="M", via="second-derivation")

mAgBr = 0.94
pctBr = mAgBr * M["Br"] / (M["Ag"] + M["Br"]) / 0.5 * 100
assert abs(pctBr - 80) < 1e-9
intq("halo_carius", "CHE.HALO",
     "In a Carius estimation $0.50\\ \\mathrm{g}$ of an organic bromo compound gave $0.94\\ \\mathrm{g}$ of $\\ce{AgBr}$ (molar mass $188\\ \\mathrm{g/mol}$, $\\mathrm{Br}=80$). "
     "The percentage of bromine in the compound is",
     80,
     "Mass of Br $=0.94\\times\\dfrac{80}{188}=0.40\\ \\mathrm{g}$. $\\%\\mathrm{Br}=\\dfrac{0.40}{0.50}\\times100=80$.", diff="M")

msq("halo_msq", "CHE.HALO",
    "Select all correct statements.",
    [("$\\mathrm{S_N2}$ substitution at a chiral carbon of an alkyl halide proceeds with inversion of configuration.", True),
     ("$\\mathrm{S_N1}$ substitution at a chiral carbon leads largely to racemisation.", True),
     ("Chlorobenzene is less reactive than cyclohexyl chloride towards nucleophilic substitution because the C-Cl bond has partial double-bond character.", True),
     ("An alkyl halide treated with alcoholic $\\ce{KOH}$ gives mainly the alcohol.", False),
     ("$\\ce{CH3CH2Cl}$ with $\\ce{NaI}$ in dry acetone gives $\\ce{CH3CH2I}$ and a precipitate of $\\ce{NaCl}$.", True)],
    "A and B are the standard stereochemical outcomes (backside attack; planar carbocation). C: lone pair delocalisation into the ring and sp$^2$ carbon shorten the C-Cl bond. "
    "D false: alcoholic $\\ce{KOH}$ gives elimination (alkene). E: Finkelstein reaction; $\\ce{NaCl}$ is insoluble in acetone and drives the equilibrium.",
    diff="M", via="second-derivation")

bp = {"n-butyl bromide": 102, "isobutyl bromide": 91, "tert-butyl bromide": 73, "n-butyl chloride": 78}
assert max(bp, key=bp.get) == "n-butyl bromide"
scq("halo_bp", "CHE.HALO",
    "Which compound has the highest boiling point?",
    "$\\ce{CH3CH2CH2CH2Br}$", ["$\\ce{(CH3)2CHCH2Br}$", "$\\ce{(CH3)3CBr}$", "$\\ce{CH3CH2CH2CH2Cl}$"],
    "For the same alkyl group boiling point rises $\\ce{RCl}<\\ce{RBr}<\\ce{RI}$ (larger, more polarisable halogen). Among isomers branching lowers the "
    "boiling point (less surface area). $n$-Butyl bromide ($102^\\circ$C) beats isobutyl ($91$), $t$-butyl ($73$) and $n$-butyl chloride ($78$).",
    diff="M", via="second-derivation")

# ------------------------------------------------------------------ CHE.ALC
scq("alc_lucas", "CHE.ALC",
    "With Lucas reagent ($\\ce{ZnCl2}$ in conc. $\\ce{HCl}$) at room temperature, turbidity appears immediately for",
    "$\\ce{(CH3)3C-OH}$", ["$\\ce{CH3CH2CH2OH}$", "$\\ce{CH3CH(OH)CH3}$", "$\\ce{CH3OH}$"],
    "The reaction goes through a carbocation, so reactivity is $3^\\circ>2^\\circ>1^\\circ$. The tertiary alcohol gives the cloudy alkyl chloride immediately; "
    "the secondary one takes about $5$ minutes; primary alcohols (and methanol) show no turbidity at room temperature.", diff="E", via="second-derivation")

scq("alc_dehyd", "CHE.ALC",
    "Ethanol is heated with excess conc. $\\ce{H2SO4}$ at $443\\ \\mathrm{K}$. The main product is",
    "$\\ce{CH2=CH2}$", ["$\\ce{CH3CH2OCH2CH3}$", "$\\ce{CH3CHO}$", "$\\ce{CH3COOH}$"],
    "Excess acid at $443$ K dehydrates ethanol intramolecularly to ethene. At $413$ K with excess alcohol, the intermolecular product diethyl ether predominates. "
    "$\\ce{H2SO4}$ is not an oxidising agent here for aldehyde/acid formation.", diff="E", via="second-derivation")

mNa = 4.6
molH2 = mNa / 23 / 2
V = molH2 * 22.4
assert abs(V - 2.24) < 1e-12
nvq("alc_na", "CHE.ALC",
    "$4.6\\ \\mathrm{g}$ of sodium ($\\mathrm{Na}=23$) reacts completely with excess ethanol: $\\ce{2C2H5OH + 2Na -> 2C2H5ONa + H2}$. "
    "The volume of $\\ce{H2}$ evolved at STP (molar volume $22.4\\ \\mathrm{L}$) in litres is",
    2.24, 0.01,
    "$n(\\mathrm{Na})=\\dfrac{4.6}{23}=0.2$ mol. $2$ mol Na gives $1$ mol $\\ce{H2}$, so $n(\\ce{H2})=0.1$ mol and $V=0.1\\times22.4=2.24\\ \\mathrm{L}$.", diff="E")

pka = {"phenol": 10.0, "ethanol": 15.9, "water": 15.7, "p-nitrophenol": 7.15}
assert min(pka, key=pka.get) == "p-nitrophenol"
scq("alc_acidity", "CHE.ALC",
    "The most acidic compound among the following is",
    "$p$-nitrophenol", ["phenol", "ethanol", "water"],
    "Approximate $\\mathrm{p}K_a$: $p$-nitrophenol $7.2$, phenol $10.0$, water $15.7$, ethanol $15.9$. The $-\\mathrm{NO_2}$ group stabilises the phenoxide ion "
    "by $-M$ and $-I$ effects, and phenoxide itself is resonance stabilised, unlike alkoxide or hydroxide.", diff="M", via="second-derivation")

scq("alc_williamson", "CHE.ALC",
    "The best Williamson synthesis of $t$-butyl methyl ether, $\\ce{(CH3)3C-O-CH3}$, uses",
    "$\\ce{(CH3)3CONa + CH3Br}$", ["$\\ce{CH3ONa + (CH3)3CBr}$", "$\\ce{(CH3)3CONa + (CH3)3CBr}$", "$\\ce{CH3ONa + CH3OH}$"],
    "Williamson synthesis is $\\mathrm{S_N2}$, which needs an unhindered primary (or methyl) halide. A $3^\\circ$ halide with a strongly basic alkoxide "
    "undergoes E2 elimination to give isobutene instead. So use sodium $t$-butoxide with methyl bromide.", diff="M", via="second-derivation")

sk_alc = skeleton_substituted([(0, 1), (1, 2), (2, 3)], 4) + skeleton_substituted([(0, 1), (1, 2), (1, 3)], 4)
assert sk_alc == 4 and 2 + 2 == 4
intq("alc_isomers", "CHE.ALC",
     "The number of structural isomers of $\\ce{C4H9OH}$ that are alcohols is",
     4,
     "Two carbon skeletons: $n$-butane (OH on C1 or C2: butan-1-ol, butan-2-ol) and isobutane (OH on C1 or C2: $2$-methylpropan-1-ol, $2$-methylpropan-2-ol). "
     "Total $4$ (stereoisomers of butan-2-ol not counted). Verified by enumerating symmetry-distinct OH positions on each skeleton.", diff="M")

# ------------------------------------------------------------------ CHE.CARB
scq("carb_iodoform", "CHE.CARB",
    "Which of the following gives a yellow precipitate of iodoform with $\\ce{I2}$/$\\ce{NaOH}$?",
    "$\\ce{CH3CH2COCH3}$ (butan-2-one)", ["$\\ce{CH3CH2COCH2CH3}$ (pentan-3-one)", "$\\ce{CH3CH2CHO}$ (propanal)", "$\\ce{C6H5CHO}$ (benzaldehyde)"],
    "The haloform test needs a $\\ce{CH3-CO-}$ group or a $\\ce{CH3-CH(OH)-}$ group. Only butan-2-one has $\\ce{CH3CO-}$. "
    "Pentan-3-one has $\\ce{CH3CH2CO-}$ on both sides (no methyl ketone), propanal and benzaldehyde have no $\\ce{CH3CO}$.", diff="M", via="second-derivation")

cands = {"HCHO": False, "C6H5CHO": False, "CH3CHO": True, "(CH3)3CCHO": False, "CH3COCH3": True}  # has alpha-H?
msq("carb_cannizzaro", "CHE.CARB",
    "Select all compounds that undergo the Cannizzaro reaction with concentrated alkali.",
    [("$\\ce{HCHO}$", not cands["HCHO"]), ("$\\ce{C6H5CHO}$", not cands["C6H5CHO"]), ("$\\ce{CH3CHO}$", not cands["CH3CHO"]),
     ("$\\ce{(CH3)3C-CHO}$", not cands["(CH3)3CCHO"]), ("$\\ce{CH3COCH3}$", False)],
    "Cannizzaro disproportionation occurs for aldehydes with no $\\alpha$-hydrogen: $\\ce{HCHO}$, benzaldehyde and $2,2$-dimethylpropanal. "
    "$\\ce{CH3CHO}$ has $\\alpha$-H and undergoes aldol condensation instead; acetone is a ketone.", diff="M")

pKa = {"CH3COOH": 4.76, "ClCH2COOH": 2.86, "Cl2CHCOOH": 1.29, "FCH2COOH": 2.59}
assert min(pKa, key=pKa.get) == "Cl2CHCOOH"
scq("carb_acid", "CHE.CARB",
    "The strongest acid among the following is",
    "$\\ce{Cl2CHCOOH}$", ["$\\ce{CH3COOH}$", "$\\ce{ClCH2COOH}$", "$\\ce{FCH2COOH}$"],
    "Electron-withdrawing halogens stabilise the carboxylate ($-I$ effect); two chlorines outweigh one fluorine. Approximate $\\mathrm{p}K_a$: "
    "$\\ce{Cl2CHCOOH}$ $1.29$, $\\ce{FCH2COOH}$ $2.59$, $\\ce{ClCH2COOH}$ $2.86$, $\\ce{CH3COOH}$ $4.76$.", diff="M", via="second-derivation")

mol = 25e-3 * 0.2
Mw = 0.3 / mol
assert abs(Mw - 60) < 1e-9 and 2 * 12 + 4 + 2 * 16 == 60
intq("carb_equiv", "CHE.CARB",
     "$0.30\\ \\mathrm{g}$ of a monobasic carboxylic acid is neutralised by $25\\ \\mathrm{mL}$ of $0.20\\ \\mathrm{M}$ $\\ce{NaOH}$. Its molar mass in g/mol is",
     60,
     "$n(\\ce{NaOH})=0.025\\times0.20=0.005$ mol $=n(\\text{acid})$ (monobasic). $M=\\dfrac{0.30}{0.005}=60\\ \\mathrm{g/mol}$ "
     "(ethanoic acid, $\\ce{CH3COOH}$: $2(12)+4(1)+2(16)=60$).", diff="M")

mC4H10 = 4 * M["C"] + 10 * M["H"]
assert mC4H10 == 58
intq("carb_clemmensen", "CHE.CARB",
     "Butan-2-one is reduced with $\\ce{Zn-Hg}$/conc. $\\ce{HCl}$ (Clemmensen reduction). The molar mass of the hydrocarbon formed, in g/mol "
     "($\\mathrm{C}=12$, $\\mathrm{H}=1$), is",
     58,
     "$\\ce{CH3COCH2CH3 -> CH3CH2CH2CH3}$ ($\\ce{C=O}\\to\\ce{CH2}$): butane, $\\ce{C4H10}$, $M=4(12)+10(1)=58$.", diff="M")

# ------------------------------------------------------------------ CHE.AMN
pkb = {"aniline": 9.38, "methylamine": 3.38, "dimethylamine": 3.27, "trimethylamine": 4.22}
assert min(pkb, key=pkb.get) == "dimethylamine"
scq("amn_basic", "CHE.AMN",
    "In aqueous solution the strongest base among the following is",
    "$\\ce{(CH3)2NH}$", ["$\\ce{CH3NH2}$", "$\\ce{(CH3)3N}$", "$\\ce{C6H5NH2}$"],
    "In water, alkyl amines are stronger bases than ammonia; the order balances the $+I$ effect with solvation of the ammonium ion: "
    "$\\ce{(CH3)2NH}>\\ce{CH3NH2}>\\ce{(CH3)3N}>\\ce{NH3}>\\ce{C6H5NH2}$ ($\\mathrm{p}K_b$: $3.27,\\ 3.38,\\ 4.22,\\ 4.75,\\ 9.38$). "
    "Aniline's lone pair is delocalised into the ring.", diff="M", via="second-derivation")

lst = {"CH3NH2": 1, "C2H5NH2": 1, "C6H5NH2": 1, "(CH3)2NH": 2, "(CH3)3N": 3}  # N-alkyl count
cnt = sum(1 for v in lst.values() if v == 1)
assert cnt == 3
intq("amn_carbylamine", "CHE.AMN",
     "Among $\\ce{CH3NH2}$, $\\ce{C2H5NH2}$, $\\ce{C6H5NH2}$, $\\ce{(CH3)2NH}$ and $\\ce{(CH3)3N}$, the number of compounds that give the carbylamine "
     "(isocyanide) test with $\\ce{CHCl3}$ and alcoholic $\\ce{KOH}$ is",
     3,
     "Only primary amines ($\\ce{R-NH2}$, aliphatic or aromatic) give the foul-smelling isocyanide. The three primary amines are "
     "$\\ce{CH3NH2}$, $\\ce{C2H5NH2}$ and $\\ce{C6H5NH2}$.", diff="E")

mPr = 3 * M["C"] + 9 * M["H"] + M["N"]
assert mPr == 59
intq("amn_hofmann", "CHE.AMN",
     "Butanamide, $\\ce{CH3CH2CH2CONH2}$, undergoes Hofmann bromamide degradation ($\\ce{Br2}$/$\\ce{NaOH}$). The molar mass of the amine formed in g/mol "
     "($\\mathrm{C}=12,\\ \\mathrm{H}=1,\\ \\mathrm{N}=14$) is",
     59,
     "Hofmann degradation removes the carbonyl carbon: $\\ce{RCONH2 -> RNH2}$ with one carbon fewer. The product is propan-1-amine $\\ce{CH3CH2CH2NH2}$, "
     "$\\ce{C3H9N}$: $36+9+14=59$.", diff="M")

scq("amn_sandmeyer", "CHE.AMN",
    "Aniline is converted into iodobenzene by the sequence",
    "$\\ce{NaNO2/HCl}$ at $273$-$278\\ \\mathrm{K}$, then $\\ce{KI}$",
    ["$\\ce{NaNO2/HCl}$ at $373\\ \\mathrm{K}$, then $\\ce{KI}$", "$\\ce{Sn/HCl}$, then $\\ce{KI}$", "$\\ce{CH3I}$, then $\\ce{NaOH}$"],
    "Diazotisation must be done at $0$-$5^\\circ$C because benzenediazonium chloride decomposes (to phenol) when warmed. The diazonium salt then reacts with "
    "$\\ce{KI}$ to give $\\ce{C6H5I}$ with loss of $\\ce{N2}$. $\\ce{Sn/HCl}$ is a reducing agent used to make aniline, not to convert it.",
    diff="M", via="second-derivation")

# ------------------------------------------------------------------ CHE.BIOM
n_stereo = 2 ** 4
assert n_stereo == 16
intq("biom_glucose", "CHE.BIOM",
     "Open-chain glucose, $\\ce{HOCH2-(CHOH)4-CHO}$, has $4$ chiral carbons (C2 to C5). The total number of stereoisomers possible for this aldohexose is",
     16,
     "Number of stereoisomers $=2^n=2^4=16$ (eight D- and eight L-aldohexoses).", diff="M")

aa = 25
peptide_bonds = aa - 1
assert peptide_bonds == 24
intq("biom_peptide", "CHE.BIOM",
     "The number of peptide bonds in a linear (unbranched) polypeptide made from $25$ amino acid residues is",
     24,
     "Each peptide bond joins two residues with loss of one water. A linear chain of $n$ residues has $n-1=24$ peptide bonds.", diff="E")

scq("biom_sucrose", "CHE.BIOM",
    "Which of the following is a non-reducing sugar?",
    "Sucrose", ["Glucose", "Maltose", "Lactose"],
    "In sucrose the anomeric carbons of glucose and fructose are joined through the glycosidic bond (C1 of $\\alpha$-D-glucose to C2 of $\\beta$-D-fructose), so neither "
    "can open to a free aldehyde/ketol group. Maltose and lactose retain one free hemiacetal group each.", diff="M", via="second-derivation")

A_pct = 30
T_pct = A_pct
G_pct = (100 - A_pct - T_pct) / 2
assert G_pct == 20
intq("biom_dna", "CHE.BIOM",
     "A double-stranded DNA contains $30\\%$ adenine. The percentage of guanine in it is",
     20,
     "Chargaff's rule: $A=T=30\\%$, so $G+C=40\\%$ and $G=C=20\\%$.", diff="E")
