"""Second batch: extra medium/hard items for chapters that are still thin or lack hard questions."""
import itertools
import math
from fractions import Fraction as F

from . import fmt, intq, msq, nvq, scq, scqn
from .che_b import skeleton_substituted
from .phy_mech import sci

# ============================================================ Physics
# ELE H: null point of charges q and 4q, 60 cm apart (between them)
d = 60.0
best = min(range(1, 6000), key=lambda i: abs(1 / (i / 100) ** 2 - 4 / (d - i / 100) ** 2))
assert abs(best / 100 - 20) < 0.01
intq("x_ele_null", "PHY.ELE",
     "Point charges $+q$ and $+4q$ are fixed $60\\ \\mathrm{cm}$ apart. The net electric field is zero at a point on the line joining them, at a distance (in cm) from $+q$ equal to",
     20,
     "Between like charges the fields oppose: $\\dfrac{kq}{x^2}=\\dfrac{4kq}{(60-x)^2}\\Rightarrow60-x=2x\\Rightarrow x=20\\ \\mathrm{cm}$.", diff="M")

p_, r_ = 2e-9, 0.2
Eax = 2 * 9e9 * p_ / r_ ** 3
assert abs(Eax - 4500) < 1e-6
scq("x_ele_dipole", "PHY.ELE",
    "A small dipole of moment $2\\times10^{-9}\\ \\mathrm{C\\,m}$ is placed in air. The electric field on its axis at $20\\ \\mathrm{cm}$ from its centre is "
    "($k=9\\times10^9$ SI)",
    "$4500\\ \\mathrm{N/C}$", ["$2250\\ \\mathrm{N/C}$", "$450\\ \\mathrm{N/C}$", "$9000\\ \\mathrm{N/C}$"],
    "Axial field of a short dipole $E=\\dfrac{2kp}{r^3}=\\dfrac{2\\times9\\times10^9\\times2\\times10^{-9}}{(0.2)^3}=\\dfrac{36}{0.008}=4500\\ \\mathrm{N/C}$ "
    "(the equatorial value would be half, $2250$).", diff="M")

# CUR H: Wheatstone bridge with galvanometer by nodal analysis
def bridge(Rac, Rcb, Rad, Rdb, Rg):
    Rac, Rcb, Rad, Rdb, Rg = map(F, (Rac, Rcb, Rad, Rdb, Rg))
    g = lambda r: 1 / r
    # unknown Vc, Vd ; VA=1, VB=0
    a11 = g(Rac) + g(Rcb) + g(Rg); a12 = -g(Rg); b1 = g(Rac)
    a21 = -g(Rg); a22 = g(Rad) + g(Rdb) + g(Rg); b2 = g(Rad)
    det = a11 * a22 - a12 * a21
    Vc = (b1 * a22 - a12 * b2) / det
    Vd = (a11 * b2 - a21 * b1) / det
    I = (1 - Vc) * g(Rac) + (1 - Vd) * g(Rad)
    return 1 / I
Req = bridge(2, 3, 4, 6, 10)
assert Req == F(10, 3) == 1 / (F(1, 5) + F(1, 10))
nvq("x_cur_bridge", "PHY.CUR",
    "A bridge has arms $R_{AC}=2\\ \\Omega$, $R_{CB}=3\\ \\Omega$, $R_{AD}=4\\ \\Omega$, $R_{DB}=6\\ \\Omega$ and a $10\\ \\Omega$ resistor connected between C and D. "
    "The equivalent resistance between A and B in ohm is",
    3.33, 0.01,
    "$\\dfrac{R_{AC}}{R_{CB}}=\\dfrac23=\\dfrac{R_{AD}}{R_{DB}}$: the bridge is balanced, so C and D are at the same potential and the $10\\ \\Omega$ resistor carries no current. "
    "Remaining: $(2+3)\\parallel(4+6)=5\\parallel10=\\dfrac{10}{3}=3.33\\ \\Omega$. (Confirmed by full nodal analysis.)", diff="M")

I_, n_, A_, e_ = 2, 8.5e28, 1e-6, 1.6e-19
vd = I_ / (n_ * A_ * e_)
assert abs(vd - 1.47e-4) < 0.01e-4
scq("x_cur_drift", "PHY.CUR",
    "A copper wire of cross-section $1\\ \\mathrm{mm^2}$ carries $2\\ \\mathrm{A}$. With $n=8.5\\times10^{28}\\ \\mathrm{m^{-3}}$ free electrons and $e=1.6\\times10^{-19}\\ \\mathrm{C}$, "
    "the drift speed is approximately",
    sci(vd, 3) + "$\\ \\mathrm{m/s}$", [sci(vd * 1e3, 3) + "$\\ \\mathrm{m/s}$", sci(vd / 1e3, 3) + "$\\ \\mathrm{m/s}$", sci(vd * 2, 3) + "$\\ \\mathrm{m/s}$"],
    "$v_d=\\dfrac{I}{nAe}=\\dfrac{2}{8.5\\times10^{28}\\times10^{-6}\\times1.6\\times10^{-19}}=1.47\\times10^{-4}\\ \\mathrm{m/s}$ "
    "(remember $1\\ \\mathrm{mm^2}=10^{-6}\\ \\mathrm{m^2}$).", diff="M")

# KIN1D: last-second distance
g_ = 10
sol = [t for t in range(1, 20) if g_ * t * t / 2 - g_ * (t - 1) ** 2 / 2 == 25]
assert sol == [3] and g_ * 9 / 2 == 45
intq("x_kin_lastsec", "PHY.KIN1D",
     "A stone dropped from the top of a tower covers $25\\ \\mathrm{m}$ during the last second of its fall. Taking $g=10\\ \\mathrm{m/s^2}$, the height of the tower in metres is",
     45,
     "Distance in the $n^{th}$ second $=\\dfrac g2(2n-1)=5(2n-1)=25\\Rightarrow n=3$. Height $=\\tfrac12g(3)^2=45\\ \\mathrm{m}$.", diff="M")

# LOM banked curve
v_b = math.sqrt(50 * 10 * 0.8)
assert abs(v_b - 20) < 1e-12
intq("x_lom_bank", "PHY.LOM",
     "A frictionless banked road of radius $50\\ \\mathrm{m}$ is inclined at an angle $\\theta$ with $\\tan\\theta=0.8$. Taking $g=10\\ \\mathrm{m/s^2}$, the speed (in m/s) "
     "at which a car needs no friction to round the bend is",
     20,
     "$N\\sin\\theta=\\dfrac{mv^2}{r}$ and $N\\cos\\theta=mg\\Rightarrow v^2=rg\\tan\\theta=50\\times10\\times0.8=400$, so $v=20\\ \\mathrm{m/s}$.", diff="M")

# WEP elastic collision energy transfer
m1, m2, u1 = 2, 4, 6
v1 = F(m1 - m2, m1 + m2) * u1
v2 = F(2 * m1, m1 + m2) * u1
assert F(1, 2) * m1 * u1 ** 2 == F(1, 2) * m1 * v1 ** 2 + F(1, 2) * m2 * v2 ** 2
frac = (F(1, 2) * m2 * v2 ** 2) / (F(1, 2) * m1 * u1 ** 2)
assert frac == F(8, 9)
scq("x_wep_collision", "PHY.WEP",
    "A $2\\ \\mathrm{kg}$ ball moving at $6\\ \\mathrm{m/s}$ collides head-on elastically with a stationary $4\\ \\mathrm{kg}$ ball. The fraction of the initial kinetic energy transferred to the $4\\ \\mathrm{kg}$ ball is",
    "$\\dfrac89$", ["$\\dfrac12$", "$\\dfrac23$", "$\\dfrac19$"],
    "Elastic head-on: $v_2=\\dfrac{2m_1u_1}{m_1+m_2}=4\\ \\mathrm{m/s}$, $v_1=\\dfrac{m_1-m_2}{m_1+m_2}u_1=-2\\ \\mathrm{m/s}$. "
    "Energy to the heavy ball: $\\tfrac12(4)(16)=32\\ \\mathrm{J}$ out of $\\tfrac12(2)(36)=36\\ \\mathrm{J}$: $\\dfrac{32}{36}=\\dfrac89$ "
    "(the light ball keeps $\\tfrac19$).", diff="H")

# GRAV orbital speed
v0 = math.sqrt(10 * 6.4e6)
assert abs(v0 - 8000) < 1e-6
intq("x_grav_orbit", "PHY.GRAV",
     "Using $g=10\\ \\mathrm{m/s^2}$ and $R_E=6.4\\times10^6\\ \\mathrm{m}$, the orbital speed (in km/s) of a satellite orbiting very close to the Earth's surface is",
     8,
     "$\\dfrac{mv^2}{R}=mg\\Rightarrow v=\\sqrt{gR}=\\sqrt{10\\times6.4\\times10^6}=\\sqrt{6.4\\times10^{7}}=8\\times10^3\\ \\mathrm{m/s}=8\\ \\mathrm{km/s}$.", diff="E")

# OSC spring cut
f0 = 3
k_ratio = 4  # one quarter of the spring is 4x stiffer
assert f0 * math.sqrt(k_ratio) == 6
intq("x_osc_cut", "PHY.OSC",
     "A mass on a spring oscillates at $3\\ \\mathrm{Hz}$. The spring is cut into $4$ equal parts and the same mass is attached to one part. The new frequency in Hz is",
     6,
     "$k\\propto1/\\text{length}$: a quarter-length piece has $k'=4k$. $f\\propto\\sqrt k\\Rightarrow f'=3\\sqrt4=6\\ \\mathrm{Hz}$.", diff="M")

# SOL thermal stress
st = 2e11 * 1.2e-5 * 50
assert abs(st - 1.2e8) < 1
scq("x_sol_thermal", "PHY.SOL",
    "A steel rod ($Y=2\\times10^{11}\\ \\mathrm{N/m^2}$, $\\alpha=1.2\\times10^{-5}\\ \\mathrm{K^{-1}}$) is clamped rigidly between two walls and heated by $50\\ \\mathrm{K}$. "
    "The compressive stress developed is",
    "$1.2\\times10^{8}\\ \\mathrm{N/m^2}$", ["$1.2\\times10^{5}\\ \\mathrm{N/m^2}$", "$6\\times10^{6}\\ \\mathrm{N/m^2}$", "$2.4\\times10^{8}\\ \\mathrm{N/m^2}$"],
    "Free expansion would be $\\alpha\\Delta T=6\\times10^{-4}$ (strain); the walls prevent it, so stress $=Y\\alpha\\Delta T=2\\times10^{11}\\times6\\times10^{-4}=1.2\\times10^8\\ \\mathrm{N/m^2}$.",
    diff="M")

# KTG number density
nd = 1.013e5 / (1.38e-23 * 273)
assert abs(nd - 2.69e25) < 0.01e25
scq("x_ktg_loschmidt", "PHY.KTG",
    "At $0^\\circ\\mathrm{C}$ ($273\\ \\mathrm{K}$) and $1.013\\times10^5\\ \\mathrm{Pa}$ the number of molecules per cubic centimetre of an ideal gas is approximately "
    "($k_B=1.38\\times10^{-23}\\ \\mathrm{J/K}$)",
    "$2.7\\times10^{19}$", ["$2.7\\times10^{25}$", "$2.7\\times10^{22}$", "$6.0\\times10^{23}$"],
    "$n=\\dfrac{P}{k_BT}=\\dfrac{1.013\\times10^5}{1.38\\times10^{-23}\\times273}=2.69\\times10^{25}\\ \\mathrm{m^{-3}}=2.69\\times10^{19}\\ \\mathrm{cm^{-3}}$ "
    "(divide by $10^6$ to change $\\mathrm{m^{-3}}$ to $\\mathrm{cm^{-3}}$).", diff="M")

# ROP lens in water
nl, nw, R = 1.5, 4 / 3, 20
inv_f = (nl / nw - 1) * (2 / R)
fw = 1 / inv_f
assert abs(fw - 80) < 1e-9 and abs(1 / ((nl - 1) * 2 / R) - 20) < 1e-9
intq("x_rop_lens_water", "PHY.ROP",
     "A thin equi-convex glass lens ($n=1.5$, both radii $20\\ \\mathrm{cm}$) has focal length $20\\ \\mathrm{cm}$ in air. Its focal length in water ($n=4/3$), in cm, is",
     80,
     "Lens-maker: $\\dfrac1f=\\left(\\dfrac{n_l}{n_m}-1\\right)\\left(\\dfrac1{R_1}-\\dfrac1{R_2}\\right)=\\left(\\dfrac{1.5}{4/3}-1\\right)\\dfrac{2}{20}=\\dfrac18\\times\\dfrac1{10}=\\dfrac1{80}$. "
    "$f=80\\ \\mathrm{cm}$ (four times longer than in air).", diff="H")

u, f = -10.0, -15.0
v = 1 / (1 / f - 1 / u)
assert abs(v - 30) < 1e-9 and abs(-v / u - 3) < 1e-9
scq("x_rop_mirror", "PHY.ROP",
    "An object is $10\\ \\mathrm{cm}$ in front of a concave mirror of focal length $15\\ \\mathrm{cm}$. The image is",
    "virtual, erect, $30\\ \\mathrm{cm}$ behind the mirror", ["real, inverted, $30\\ \\mathrm{cm}$ in front of the mirror", "virtual, erect, $6\\ \\mathrm{cm}$ behind the mirror",
     "real, inverted, $6\\ \\mathrm{cm}$ in front of the mirror"],
    "$\\dfrac1v+\\dfrac1u=\\dfrac1f$ with $u=-10$, $f=-15$: $\\dfrac1v=-\\dfrac1{15}+\\dfrac1{10}=\\dfrac1{30}\\Rightarrow v=+30\\ \\mathrm{cm}$ (behind the mirror, virtual). "
    "$m=-v/u=+3$: erect and magnified, as expected for an object inside the focal length.", diff="M")

# DUAL Planck constant from stopping potentials
e = 1.6e-19
h_est = e * (1.2 - 0.4) / (8e14 - 6e14)
assert abs(h_est - 6.4e-34) < 1e-36
scq("x_dual_planck", "PHY.DUAL",
    "In a photoelectric experiment the stopping potential is $0.4\\ \\mathrm{V}$ for light of frequency $6\\times10^{14}\\ \\mathrm{Hz}$ and $1.2\\ \\mathrm{V}$ for $8\\times10^{14}\\ \\mathrm{Hz}$. "
    "The value of Planck's constant obtained is ($e=1.6\\times10^{-19}\\ \\mathrm{C}$)",
    "$6.4\\times10^{-34}\\ \\mathrm{J\\,s}$", ["$6.4\\times10^{-15}\\ \\mathrm{J\\,s}$", "$4.0\\times10^{-34}\\ \\mathrm{J\\,s}$", "$1.0\\times10^{-33}\\ \\mathrm{J\\,s}$"],
    "$eV_s=h\\nu-\\phi\\Rightarrow$ slope of $V_s$ versus $\\nu$ is $h/e$: $h=e\\dfrac{1.2-0.4}{(8-6)\\times10^{14}}=1.6\\times10^{-19}\\times4\\times10^{-15}=6.4\\times10^{-34}\\ \\mathrm{J\\,s}$.",
    diff="M")

# MAG cyclotron
mp = 1.67e-27
fc = e * 1.0 / (2 * math.pi * mp) / 1e6
assert abs(fc - 15.25) < 0.01
nvq("x_mag_cyclotron", "PHY.MAG",
    "The cyclotron frequency (in MHz) of a proton in a uniform magnetic field of $1.0\\ \\mathrm{T}$ is approximately ($m_p=1.67\\times10^{-27}\\ \\mathrm{kg}$, $e=1.6\\times10^{-19}\\ \\mathrm{C}$)",
    15.25, 0.1,
    "$f=\\dfrac{qB}{2\\pi m}=\\dfrac{1.6\\times10^{-19}\\times1}{2\\pi\\times1.67\\times10^{-27}}=1.525\\times10^{7}\\ \\mathrm{Hz}=15.25\\ \\mathrm{MHz}$, independent of the speed (non-relativistic).",
    diff="M")

# ============================================================ Chemistry
n_orb = sum(1 for l in range(3) for m in range(-l, l + 1))
assert n_orb == 9
intq("x_atom_orbitals", "CHE.ATOM",
     "The total number of orbitals associated with the principal quantum number $n=3$ is",
     9,
     "$l=0,1,2$ give $1+3+5=9=n^2$ orbitals ($2n^2=18$ electrons).", diff="E")

mu_B = math.sqrt(5 * 7)
assert abs(mu_B - 5.916) < 1e-3
scq("x_atom_magmoment", "CHE.ATOM",
    "The spin-only magnetic moment of $\\ce{Fe^{3+}}$ ($Z=26$) in $\\mathrm{BM}$ is",
    "$5.92$", ["$4.90$", "$3.87$", "$6.93$"],
    "$\\ce{Fe^{3+}}$: $[\\mathrm{Ar}]3d^5$, five unpaired electrons. $\\mu=\\sqrt{n(n+2)}=\\sqrt{35}=5.92\\ \\mathrm{BM}$ "
    "($4.90$ is for $n=4$, i.e. $\\ce{Fe^{2+}}$).", diff="M")

P_tot, alpha = 1, F(1, 2)
Kp = alpha ** 2 * P_tot / (1 - alpha ** 2)
assert Kp == F(1, 3)
# check by mole fractions: PCl5 = (1-a)/(1+a) P, PCl3 = Cl2 = a/(1+a) P
pp5, pp3 = (1 - alpha) / (1 + alpha) * P_tot, alpha / (1 + alpha) * P_tot
assert pp3 * pp3 / pp5 == Kp
scq("x_cheq_kp", "CHE.CHEQ",
    "$\\ce{PCl5(g) <=> PCl3(g) + Cl2(g)}$ is $50\\%$ dissociated at a total pressure of $1\\ \\mathrm{atm}$. $K_p$ (in atm) is",
    "$\\dfrac13$", ["$\\dfrac12$", "$\\dfrac14$", "$\\dfrac23$"],
    "Start with $1$ mol: at equilibrium $0.5$ mol $\\ce{PCl5}$, $0.5$ mol each product, total $1.5$ mol. Partial pressures: $\\ce{PCl5}=\\dfrac13$, $\\ce{PCl3}=\\ce{Cl2}=\\dfrac13$ atm. "
    "$K_p=\\dfrac{(1/3)(1/3)}{1/3}=\\dfrac13$. Formula check: $\\dfrac{\\alpha^2P}{1-\\alpha^2}=\\dfrac{0.25}{0.75}=\\dfrac13$.", diff="H")

rates = {(0.1, 0.1): 2e-3, (0.2, 0.1): 8e-3, (0.1, 0.2): 4e-3}
a_ord = math.log(rates[(0.2, 0.1)] / rates[(0.1, 0.1)]) / math.log(2)
b_ord = math.log(rates[(0.1, 0.2)] / rates[(0.1, 0.1)]) / math.log(2)
assert round(a_ord) == 2 and round(b_ord) == 1
intq("x_kin_order", "CHE.KIN",
     "For $\\ce{A + B -> products}$ the initial rates are $2\\times10^{-3}$ for $[\\mathrm A]=[\\mathrm B]=0.1\\ \\mathrm M$; $8\\times10^{-3}$ for $[\\mathrm A]=0.2$, $[\\mathrm B]=0.1$; "
     "and $4\\times10^{-3}$ for $[\\mathrm A]=0.1$, $[\\mathrm B]=0.2$ (all in $\\mathrm{M\\,s^{-1}}$). The overall order of the reaction is",
     3,
     "Doubling $[\\mathrm A]$ quadruples the rate: order in A $=2$. Doubling $[\\mathrm B]$ doubles the rate: order in B $=1$. Overall order $=2+1=3$.", diff="M")

assert len(skeleton_substituted([(0, 1), (1, 2)], 3)) if False else skeleton_substituted([(0, 1), (1, 2)], 3) == 2
prim = skeleton_substituted([(0, 1), (1, 2)], 3)  # NH2 on n-propyl (C1 or C2): propylamine, isopropylamine
amine_isomers = prim + 1 + 1  # + N-methylethylamine + trimethylamine
assert amine_isomers == 4
intq("x_amn_isomers", "CHE.AMN",
     "The number of structural isomers of the amine formula $\\ce{C3H9N}$ (primary, secondary and tertiary) is",
     4,
     "Primary: propan-1-amine, propan-2-amine ($2$). Secondary: $N$-methylethanamine ($1$). Tertiary: $N,N$-dimethylmethanamine ($1$). Total $4$.", diff="M")

pI = (2.34 + 9.60) / 2
assert abs(pI - 5.97) < 1e-9
nvq("x_biom_pi", "CHE.BIOM",
    "Glycine has $\\mathrm{p}K_{a1}=2.34$ ($-\\ce{COOH}$) and $\\mathrm{p}K_{a2}=9.60$ ($-\\ce{NH3+}$). Its isoelectric point is",
    5.97, 0.02,
    "A neutral amino acid is a zwitterion at the pH midway between its two $\\mathrm{p}K_a$ values: $\\mathrm{pI}=\\dfrac{2.34+9.60}{2}=5.97$.", diff="M")

isomers_c4h8 = ["but-1-ene", "but-2-ene", "2-methylpropene", "cyclobutane", "methylcyclopropane"]
assert len(isomers_c4h8) == 5 and (2 * 4 + 2 - 8) // 2 == 1
intq("x_goc_c4h8", "CHE.GOC",
     "The number of structural isomers (ignoring geometrical and optical isomerism) of the formula $\\ce{C4H8}$, counting alkenes and cycloalkanes, is",
     5,
     "One degree of unsaturation: either one $\\ce{C=C}$ or one ring. Alkenes: but-1-ene, but-2-ene, $2$-methylpropene ($3$). Rings: cyclobutane, methylcyclopropane ($2$). Total $5$.",
     diff="M", via="second-derivation")

t_ring = 4 * 2  # period 4: 4s(2)+3d(10)+4p(6)
assert 2 + 10 + 6 == 18
intq("x_perio_period4", "CHE.PERIO",
     "The number of elements in the fourth period of the periodic table is",
     18,
     "The fourth period fills $4s$ ($2$), $3d$ ($10$) and $4p$ ($6$): $2+10+6=18$ elements ($\\mathrm{K}$ to $\\mathrm{Kr}$).", diff="E")

# ============================================================ Maths
assert math.comb(8, 4) == 70 and [r for r in range(9) if 8 - 2 * r == 0] == [4]
intq("x_bino_const", "MAT.BINO",
     "The term independent of $x$ in the expansion of $\\left(x+\\dfrac1x\\right)^8$ is",
     70,
     "$T_{r+1}=\\binom8rx^{8-r}x^{-r}=\\binom8rx^{8-2r}$; $8-2r=0\\Rightarrow r=4$: $\\binom84=70$.", diff="E")

# LINE H: minimum-area line through (3,2) with positive intercepts
best = min(((3 * b) / (b - 2) if False else (a * b / 2), a, b) for a in [x / 20 for x in range(61, 600)]
           for b in [2 * a / (a - 3)])
assert abs(best[0] - 12) < 1e-3 and abs(best[1] - 6) < 0.05
intq("x_line_minarea", "MAT.LINE",
     "A line through $(3,2)$ cuts the positive axes at $A$ and $B$. The minimum possible area (in square units) of triangle $OAB$ is",
     12,
     "Line $\\dfrac xa+\\dfrac yb=1$ through $(3,2)$: $\\dfrac3a+\\dfrac2b=1$. AM-GM: $1\\ge2\\sqrt{\\dfrac6{ab}}\\Rightarrow ab\\ge24$, so area $\\tfrac12ab\\ge12$, "
     "with equality when $\\dfrac3a=\\dfrac2b=\\dfrac12$, i.e. $a=6$, $b=4$. (A numerical scan over slopes gives the same minimum.)", diff="H")

tan_ang = abs(F(2) - F(-1, 3)) / (1 + F(2) * F(-1, 3))
assert tan_ang == 7
intq("x_line_angle", "MAT.LINE",
     "The tangent of the acute angle between the lines $2x-y=3$ and $x+3y=7$ is",
     7,
     "Slopes $m_1=2$, $m_2=-\\tfrac13$. $\\tan\\theta=\\left|\\dfrac{m_1-m_2}{1+m_1m_2}\\right|=\\dfrac{7/3}{1/3}=7$.", diff="M")

vals = [3 * math.sin(t / 1000) + 4 * math.cos(t / 1000) + 2 for t in range(0, 6300)]
lo, hi = min(vals), max(vals)
assert abs(lo + 3) < 1e-3 and abs(hi - 7) < 1e-3
assert len([k for k in range(-3, 8)]) == 11
intq("x_fun_range", "MAT.FUN",
     "The number of integers in the range of $f(x)=3\\sin x+4\\cos x+2$ is",
     11,
     "$3\\sin x+4\\cos x$ ranges over $[-5,5]$ (amplitude $\\sqrt{9+16}=5$), so $f$ ranges over $[-3,7]$, which contains $11$ integers.", diff="M")

# TDI: xy-plane section
Pa, Pb = (2, -1, 3), (4, 5, -6)
lam = F(-Pa[2], Pb[2] - 0) if False else F(Pa[2], -Pb[2])  # ratio m:n with z = (m*zb + n*za)/(m+n) = 0
assert lam == F(1, 2)
pt = [(lam * b + a) / (lam + 1) for a, b in zip(Pa, Pb)]
assert pt[2] == 0
scq("x_tdi_plane", "MAT.TDI",
    "The $xy$-plane divides the join of $A(2,-1,3)$ and $B(4,5,-6)$ in the ratio",
    "$1:2$ internally", ["$2:1$ internally", "$1:2$ externally", "$3:2$ internally"],
    "Let the dividing point be at ratio $\\lambda:1$ from $A$: $z=\\dfrac{\\lambda(-6)+3}{\\lambda+1}=0\\Rightarrow\\lambda=\\dfrac12$, i.e. $AP:PB=1:2$ (positive, so internal). "
    "The point of division is $\\left(\\tfrac83,\\,1,\\,0\\right)$.", diff="H")

stats = [4, 8, 6, 5, 3, 2, 8, 9, 2, 5]
mean = sum(stats) / len(stats)
srt = sorted(stats)
med = (srt[4] + srt[5]) / 2
assert mean == 5.2 and med == 5
scq("x_stat_median", "MAT.STAT",
    "The median of the observations $4,8,6,5,3,2,8,9,2,5$ is",
    "$5$", ["$5.2$", "$4.5$", "$6$"],
    "Arrange: $2,2,3,4,5,5,6,8,8,9$. With $n=10$ the median is the mean of the $5^{th}$ and $6^{th}$ values: $\\dfrac{5+5}{2}=5$. "
    "($5.2$ is the mean, not the median.)", diff="E")

def count_antisym(n):
    pairs = [(i, j) for i in range(n) for j in range(n)]
    c = 0
    for mask in range(2 ** (n * n)):
        R = {p for k, p in enumerate(pairs) if (mask >> k) & 1}
        if all(not ((i, j) in R and (j, i) in R) or i == j for i in range(n) for j in range(n)):
            c += 1
    return c
assert count_antisym(3) == 2 ** 3 * 3 ** 3 == 216
scq("x_relf_antisym", "MAT.RELF",
    "The number of antisymmetric relations on a set with $3$ elements is",
    "$216$", ["$512$", "$64$", "$729$"],
    "For each of the $3$ diagonal pairs $(a,a)$: in or out, $2$ choices each ($2^3$). For each of the $3$ unordered pairs $\\{a,b\\}$, $a\\neq b$, the options are: none, $(a,b)$ only, "
    "$(b,a)$ only ($3$ choices; both is forbidden): $3^3$. Total $2^3\\cdot3^3=216$. Verified by checking all $2^9$ relations.", diff="H")

# SET: Venn three sets
tot, A_, B_, C_, AB, BC, CA, ABC = 100, 50, 45, 40, 20, 15, 12, 8
union = A_ + B_ + C_ - AB - BC - CA + ABC
assert union == 96
intq("x_set_three", "MAT.SET",
     "In a survey of $100$ people, $50$ read newspaper A, $45$ read B, $40$ read C, $20$ read A and B, $15$ read B and C, $12$ read A and C, and $8$ read all three. "
     "The number of people who read none of the three is",
     100 - union,
     "$n(A\\cup B\\cup C)=50+45+40-20-15-12+8=96$. None $=100-96=4$.", diff="M")
