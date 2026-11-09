"""Chemistry (physical + inorganic basics): atomic structure, periodicity, chemical equilibrium, kinetics."""
import math
from fractions import Fraction as F

from . import fmt, intq, msq, nvq, scq, scqn

# ------------------------------------------------------------------ CHE.ATOM
a0 = 0.529
r3 = 9 * a0
assert abs(r3 - 4.761) < 1e-3
scqn("atom_bohr_r", "CHE.ATOM",
     "Taking the Bohr radius $a_0=0.529\\ \\mathrm{\\AA}$, the radius of the $n=3$ orbit of the hydrogen atom (in $\\mathrm{\\AA}$) is",
     r3, [3 * a0, a0 / 9, 9 * a0 / 3 * 2],
     "$r_n=n^2a_0\\,\\dfrac{1}{Z}$ with $Z=1$: $r_3=9\\times0.529=4.76\\ \\mathrm{\\AA}$ (the radius goes as $n^2$, not $n$).", diff="E",
     f=lambda x: fmt(x, 3))

R = 1.097e7
lam_ly = 1 / (R * (1 - 1 / 4)) * 1e9
assert abs(lam_ly - 121.5) < 0.1
nvq("atom_lyman", "CHE.ATOM",
    "Using the Rydberg constant $R_H=1.097\\times10^{7}\\ \\mathrm{m^{-1}}$, the wavelength (in nm) of the first line of the Lyman series of hydrogen "
    "($n=2\\to n=1$) is approximately",
    121.5, 0.5,
    "$\\dfrac1\\lambda=R_H\\left(\\dfrac1{1^2}-\\dfrac1{2^2}\\right)=\\dfrac{3R_H}{4}\\Rightarrow\\lambda=\\dfrac{4}{3\\times1.097\\times10^7}=1.215\\times10^{-7}\\ \\mathrm{m}=121.5\\ \\mathrm{nm}$.",
    diff="M")

n_, l_ = 4, 2
radial, angular = n_ - l_ - 1, l_
assert radial == 1 and radial + angular == n_ - 1 == 3
intq("atom_nodes", "CHE.ATOM",
     "The total number of nodes (radial plus angular) in a $4d$ orbital is",
     3,
     "Radial nodes $=n-l-1=4-2-1=1$; angular nodes $=l=2$. Total $=n-1=3$ (both routes agree).", diff="M")

# ------------------------------------------------------------------ CHE.PERIO
ie1 = {"Mg": 738, "Al": 578, "Si": 786, "P": 1012}
assert min(ie1, key=ie1.get) == "Al"
scq("perio_ie", "CHE.PERIO",
    "Among Mg, Al, Si and P, the element with the lowest first ionisation enthalpy is",
    "Al", ["Mg", "Si", "P"],
    "Across period 3 $\\mathrm{IE_1}$ rises overall, but there is a dip at Al: the $3p^1$ electron is further out and better shielded by the filled $3s^2$ "
    "than a $3s$ electron of Mg. Values (kJ/mol): Mg $738$, Al $578$, Si $786$, P $1012$. Al is lowest.", diff="M", via="second-derivation")

Zs = {"O2-": 8, "F-": 9, "Na+": 11, "Mg2+": 12}
assert all(Z - q == 10 for Z, q in [(8, -2), (9, -1), (11, 1), (12, 2)])
assert max(Zs, key=lambda k: 1 / Zs[k]) == "O2-"
scq("perio_isoelec", "CHE.PERIO",
    "Which of the following isoelectronic species has the largest ionic radius?",
    "$\\ce{O^{2-}}$", ["$\\ce{F-}$", "$\\ce{Na+}$", "$\\ce{Mg^{2+}}$"],
    "All have $10$ electrons. For the same electron count the radius falls as nuclear charge rises: $Z=8,9,11,12$. "
    "So $\\ce{O^{2-}}>\\ce{F-}>\\ce{Na+}>\\ce{Mg^{2+}}$.", diff="E")


def fill(Z):
    """Aufbau (Madelung) fill; returns (period, group) for Z up to 54 (no exceptions in range used)."""
    order = [(1, 0), (2, 0), (2, 1), (3, 0), (3, 1), (4, 0), (3, 2), (4, 1), (5, 0), (4, 2), (5, 1)]
    cap = lambda l: 2 * (2 * l + 1)
    conf = {}
    left = Z
    for n, l in order:
        e = min(left, cap(l))
        conf[(n, l)] = e
        left -= e
        if left == 0:
            break
    nmax = max(n for (n, l), e in conf.items() if e)
    ve = conf.get((nmax, 0), 0) + conf.get((nmax, 1), 0) + sum(e for (n, l), e in conf.items() if l == 2 and n == nmax - 1 and n >= 3 and e and (nmax, 1) not in conf)
    if conf.get((nmax, 1), 0) or Z in (30, 48):
        grp = 10 + conf.get((nmax, 0), 0) + conf.get((nmax, 1), 0) if conf.get((nmax, 1), 0) else 12
    else:
        grp = conf.get((nmax, 0), 0) + conf.get((nmax - 1, 2), 0)
    return nmax, grp


assert fill(34) == (4, 16) and fill(8) == (2, 16) and fill(26) == (4, 8) and fill(31) == (4, 13)
intq("perio_group", "CHE.PERIO",
     "An element has atomic number $34$. Its group number in the long form of the periodic table is",
     16,
     "$Z=34$: $[\\mathrm{Ar}]\\,3d^{10}4s^24p^4$. The $p$-block group number is $10+(\\text{electrons in the outermost }s\\text{ and }p)=10+2+4=16$ "
     "(period $4$): selenium, a chalcogen.", diff="M")

EN = {"F": 3.98, "O": 3.44, "N": 3.04, "C": 2.55}
assert sorted(EN, key=EN.get, reverse=True) == ["F", "O", "N", "C"]
scq("perio_en", "CHE.PERIO",
    "The correct order of Pauling electronegativity among C, N, O and F is",
    "$\\ce{C}<\\ce{N}<\\ce{O}<\\ce{F}$", ["$\\ce{N}<\\ce{C}<\\ce{O}<\\ce{F}$", "$\\ce{C}<\\ce{N}<\\ce{F}<\\ce{O}$", "$\\ce{F}<\\ce{O}<\\ce{N}<\\ce{C}$"],
    "Electronegativity increases across a period as effective nuclear charge rises: C $2.55$, N $3.04$, O $3.44$, F $3.98$.", diff="E")

msq("perio_msq", "CHE.PERIO",
    "Select all correct statements about periodic properties of elements.",
    [("The electron gain enthalpy of chlorine is more negative than that of fluorine.", True),
     ("The first ionisation enthalpy of nitrogen is higher than that of oxygen.", True),
     ("$\\ce{Be(OH)2}$ is amphoteric.", True),
     ("Electronegativity increases on moving down group 17.", False),
     ("The ionic radius of $\\ce{Na+}$ is larger than that of $\\ce{Mg^{2+}}$.", True)],
    "A: the small $2p$ subshell of F has strong inter-electronic repulsion, so Cl ($-349$ kJ/mol) beats F ($-328$). "
    "B: half-filled $2p^3$ of N is extra stable. C: Be shows diagonal similarity with Al. D false: it decreases down the group. "
    "E: isoelectronic, so smaller $Z$ gives larger radius.", diff="M", via="second-derivation")

# ------------------------------------------------------------------ CHE.CHEQ
Kc = F(4, 5) / (F(1, 5)) ** 2 if False else F(8, 10) / F(2, 10) ** 2
assert Kc == 20
intq("cheq_kc", "CHE.CHEQ",
     "For $\\ce{2A <=> B}$ the equilibrium concentrations are $[\\mathrm{A}]=0.2\\ \\mathrm{M}$ and $[\\mathrm{B}]=0.8\\ \\mathrm{M}$. The value of $K_c$ is",
     20,
     "$K_c=\\dfrac{[\\mathrm B]}{[\\mathrm A]^2}=\\dfrac{0.8}{(0.2)^2}=\\dfrac{0.8}{0.04}=20$ (the stoichiometric coefficient $2$ appears as a square).", diff="E")

Kc2, Rg, T = 0.005, 0.0821, 300
Kp = Kc2 * (Rg * T) ** (2 - 1)
assert abs(Kp - 0.1232) < 1e-4
scqn("cheq_kp", "CHE.CHEQ",
     "For $\\ce{N2O4(g) <=> 2NO2(g)}$ at $300\\ \\mathrm{K}$, $K_c=5.0\\times10^{-3}$ (concentrations in $\\mathrm{mol\\,L^{-1}}$). "
     "Taking $R=0.0821\\ \\mathrm{L\\,atm\\,K^{-1}mol^{-1}}$, $K_p$ in atm is approximately",
     Kp, [Kc2, Kc2 / (Rg * T), Kc2 * (Rg * T) ** 2],
     "$K_p=K_c(RT)^{\\Delta n_g}$ with $\\Delta n_g=2-1=1$: $K_p=5\\times10^{-3}\\times0.0821\\times300=0.123\\ \\mathrm{atm}$.", diff="M",
     f=lambda x: fmt(x, 3))

n0, Vv, alpha = F(1), 2, F(2, 5)
Kc3 = (n0 * alpha / Vv) ** 2 / (n0 * (1 - alpha) / Vv)
assert Kc3 == F(2, 15)
scq("cheq_pcl5", "CHE.CHEQ",
    "$1$ mol of $\\ce{PCl5}$ is heated in a closed $2\\ \\mathrm{L}$ vessel: $\\ce{PCl5(g) <=> PCl3(g) + Cl2(g)}$. At equilibrium it is $40\\%$ dissociated. "
    "$K_c$ (in $\\mathrm{mol\\,L^{-1}}$) is",
    "$\\dfrac{2}{15}$", ["$\\dfrac{4}{15}$", "$\\dfrac{2}{5}$", "$\\dfrac{4}{25}$"],
    "At equilibrium: $\\ce{PCl5}=0.6$ mol, $\\ce{PCl3}=\\ce{Cl2}=0.4$ mol; concentrations $0.3,\\,0.2,\\,0.2\\ \\mathrm{M}$. "
    "$K_c=\\dfrac{0.2\\times0.2}{0.3}=\\dfrac{2}{15}$ (using moles instead of concentrations ignores the $2\\ \\mathrm{L}$ volume).", diff="M")

msq("cheq_lechatelier", "CHE.CHEQ",
    "For $\\ce{N2(g) + 3H2(g) <=> 2NH3(g)}$, $\\Delta H<0$, select all correct statements.",
    [("Increasing the total pressure (by compression) shifts the equilibrium to the right.", True),
     ("Raising the temperature lowers the value of $K_c$.", True),
     ("A catalyst changes the time to reach equilibrium but not $K_c$.", True),
     ("Adding argon at constant volume shifts the equilibrium to the right.", False),
     ("Removing $\\ce{NH3}$ as it forms shifts the equilibrium to the right.", True)],
    "Fewer gas moles on the right ($4\\to2$) so higher pressure favours products (A). Exothermic: higher $T$ lowers $K$ (B). A catalyst speeds both directions equally (C). "
    "Argon at constant volume leaves partial pressures unchanged, so no shift (D false). Removing a product drives the forward reaction (E).", diff="M",
    via="second-derivation")

Qv = F(4, 10) ** 2 / (F(1, 10) * F(1, 10))
assert Qv == 16 < 50
intq("cheq_q", "CHE.CHEQ",
     "For $\\ce{H2(g) + I2(g) <=> 2HI(g)}$, $K_c=50$ at $700\\ \\mathrm{K}$. In a mixture with $[\\ce{H2}]=[\\ce{I2}]=0.1\\ \\mathrm{M}$ and $[\\ce{HI}]=0.4\\ \\mathrm{M}$ "
     "the reaction quotient $Q_c$ is $x$. The value of $x$ is",
     16,
     "$Q_c=\\dfrac{[\\mathrm{HI}]^2}{[\\mathrm{H_2}][\\mathrm{I_2}]}=\\dfrac{0.16}{0.01}=16<K_c=50$, so the mixture proceeds in the forward direction.", diff="E")

# ------------------------------------------------------------------ CHE.KIN
t_half = 15
assert t_half * 3 == 45 and 1 - 0.5 ** 3 == 0.875
intq("kin_halflife", "CHE.KIN",
     "A first-order reaction has a half-life of $15$ minutes. The time (in minutes) taken for $87.5\\%$ of the reactant to decompose is",
     45,
     "$87.5\\%$ decomposed means $12.5\\%=\\left(\\tfrac12\\right)^3$ remains, i.e. $3$ half-lives: $3\\times15=45$ minutes. "
     "Check: $t=\\dfrac{\\ln 8}{k}=\\dfrac{3\\ln2}{k}=3t_{1/2}$.", diff="E")

R_ = 8.314
Ea = R_ * math.log(2) / (1 / 300 - 1 / 310)
assert abs(Ea / 1000 - 53.6) < 0.1
scq("kin_arrhenius", "CHE.KIN",
    "The rate of a reaction doubles when the temperature is raised from $300\\ \\mathrm{K}$ to $310\\ \\mathrm{K}$. The activation energy is approximately "
    "($R=8.314\\ \\mathrm{J\\,K^{-1}mol^{-1}}$, $\\ln2=0.693$)",
    "$53.6\\ \\mathrm{kJ\\,mol^{-1}}$", ["$5.36\\ \\mathrm{kJ\\,mol^{-1}}$", "$107\\ \\mathrm{kJ\\,mol^{-1}}$", "$26.8\\ \\mathrm{kJ\\,mol^{-1}}$"],
    "$\\ln\\dfrac{k_2}{k_1}=\\dfrac{E_a}{R}\\left(\\dfrac1{T_1}-\\dfrac1{T_2}\\right)\\Rightarrow E_a=\\dfrac{8.314\\times0.693}{1.075\\times10^{-4}}=5.36\\times10^4\\ \\mathrm{J/mol}$.",
    diff="M")

c0, c1, tt = 0.8, 0.2, 30
kz = (c0 - c1) / tt
th = c0 / (2 * kz)
assert abs(kz - 0.02) < 1e-12 and abs(th - 20) < 1e-9
intq("kin_zero", "CHE.KIN",
     "For a zero-order reaction the concentration of the reactant falls from $0.8\\ \\mathrm{M}$ to $0.2\\ \\mathrm{M}$ in $30$ minutes. "
     "The half-life (in minutes) for the initial concentration of $0.8\\ \\mathrm{M}$ is",
     20,
     "Zero order: $k=\\dfrac{\\Delta c}{\\Delta t}=\\dfrac{0.6}{30}=0.02\\ \\mathrm{M\\,min^{-1}}$. $t_{1/2}=\\dfrac{[A]_0}{2k}=\\dfrac{0.8}{0.04}=20\\ \\mathrm{min}$.", diff="M")
