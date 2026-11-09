"""Physics: kinematics, laws of motion, work-energy, gravitation, solids, KTG, oscillations (Class 11)."""
import math
from fractions import Fraction as F

from . import fmt, intq, msq, nvq, scq, scqn


def sci(x, sig=3):
    m, e = f"{x:.{sig - 1}e}".split("e")
    return f"${float(m):g}\\times10^{{{int(e)}}}$"


# ------------------------------------------------------------------ PHY.KIN1D
u, a = 72 / 3.6, 4.0
s_ = u * u / (2 * a)
assert s_ == 50 and abs(sum(u - a * 0 for _ in range(1)) - 20) < 1e-9
# brute force: integrate until v<=0 with tiny steps
_v, _x, _dt = u, 0.0, 1e-5
while _v > 0:
    _x += _v * _dt
    _v -= a * _dt
assert abs(_x - s_) < 0.01
scqn("kin1d_stop", "PHY.KIN1D",
     "A car travelling at $72\\ \\mathrm{km\\,h^{-1}}$ brakes with a uniform retardation of $4\\ \\mathrm{m\\,s^{-2}}$. "
     "The distance it covers before stopping is (in metres)",
     s_, [72 ** 2 / (2 * a), u * u / a, 25], 
     "Convert first: $u=72\\ \\mathrm{km/h}=20\\ \\mathrm{m/s}$. From $v^2=u^2-2as$ with $v=0$:\n\n"
     "$$s=\\frac{u^2}{2a}=\\frac{400}{8}=50\\ \\mathrm{m}.$$", diff="E")

h0, u0, g = 25, 20, 10
t_ = next(t / 1000 for t in range(1, 20000) if abs(u0 * t / 1000 - 5 * (t / 1000) ** 2 + h0) < 1e-9)
assert t_ == 5
intq("kin1d_tower", "PHY.KIN1D",
     "A stone is thrown vertically upward with speed $20\\ \\mathrm{m/s}$ from the top of a $25\\ \\mathrm{m}$ tower and "
     "finally lands on the ground at the foot of the tower. Taking $g=10\\ \\mathrm{m/s^2}$, the total time of flight "
     "in seconds is",
     t_,
     "Take upward positive and origin at the throw point: $-25=20t-5t^2\\Rightarrow t^2-4t-5=0\\Rightarrow (t-5)(t+1)=0$. "
     "Only $t=5\\ \\mathrm{s}$ is physical.", diff="M")

# v = (t-2)(t-4); distance vs displacement 0..5 s
def X(t):
    t = F(t)
    return t ** 3 / 3 - 3 * t ** 2 + 8 * t
dist = abs(X(2) - X(0)) + abs(X(4) - X(2)) + abs(X(5) - X(4))
disp = X(5) - X(0)
assert dist == F(28, 3) and disp == F(20, 3)
scq("kin1d_vt", "PHY.KIN1D",
    "The velocity of a particle moving along a line is $v=t^2-6t+8$ (SI units). The total distance travelled in the "
    "interval $t=0$ to $t=5\\ \\mathrm{s}$ is",
    "$\\dfrac{28}{3}\\ \\mathrm{m}$", ["$\\dfrac{20}{3}\\ \\mathrm{m}$", "$\\dfrac{16}{3}\\ \\mathrm{m}$", "$8\\ \\mathrm{m}$"],
    "$v=(t-2)(t-4)$ changes sign at $t=2$ and $t=4$, so split the path. With $x(t)=\\frac{t^3}{3}-3t^2+8t$: "
    "$x(2)=\\frac{20}{3},\\ x(4)=\\frac{16}{3},\\ x(5)=\\frac{20}{3}$.\n\n"
    "Distance $=\\frac{20}{3}+\\left|\\frac{16}{3}-\\frac{20}{3}\\right|+\\left|\\frac{20}{3}-\\frac{16}{3}\\right|=\\frac{28}{3}\\ \\mathrm{m}$. "
    "($\\frac{20}{3}$ is the displacement, not the distance.)", diff="H", skills=("conceptual", "calculation"))

def xx(t): return 2 * t ** 3 - 9 * t ** 2 + 12 * t
def vv(t): return 6 * t ** 2 - 18 * t + 12
def aa(t): return 12 * t - 18
st = [
    ("The particle is momentarily at rest at $t=1\\ \\mathrm{s}$ and at $t=2\\ \\mathrm{s}$.", vv(1) == 0 and vv(2) == 0),
    ("Its acceleration at $t=1\\ \\mathrm{s}$ is $-6\\ \\mathrm{m/s^2}$.", aa(1) == -6),
    ("Its displacement during the first $3\\ \\mathrm{s}$ is $9\\ \\mathrm{m}$.", xx(3) - xx(0) == 9),
    ("Its velocity at $t=1.5\\ \\mathrm{s}$ is zero.", vv(1.5) == 0),
]
assert [t for _, t in st] == [True, True, True, False]
msq("kin1d_msq", "PHY.KIN1D",
    "A particle moves along the $x$-axis with $x=2t^3-9t^2+12t$ ($x$ in metres, $t$ in seconds). Select all correct statements.",
    st,
    "$v=6t^2-18t+12=6(t-1)(t-2)$ so $v=0$ at $t=1,2$ (A true) while $v(1.5)=-1.5\\ne0$ (D false). "
    "$a=12t-18\\Rightarrow a(1)=-6$ (B true). $x(3)=54-81+36=9$ and $x(0)=0$ (C true).", diff="M")

# ------------------------------------------------------------------ PHY.LOM
m1, m2 = 3, 5
acc = (m2 - m1) * 10 / (m1 + m2)
T = m1 * (10 + acc)
assert T == 2 * m1 * m2 * 10 / (m1 + m2) == m2 * (10 - acc) == 37.5
scqn("lom_atwood", "PHY.LOM",
     "Masses $3\\ \\mathrm{kg}$ and $5\\ \\mathrm{kg}$ hang from the two ends of a light string passing over a smooth light "
     "pulley. Taking $g=10\\ \\mathrm{m/s^2}$, the tension in the string (in newton) is",
     T, [30, 50, 3 * (10 - acc)],
     "$a=\\dfrac{(5-3)g}{8}=2.5\\ \\mathrm{m/s^2}$. For the lighter block $T-3g=3a\\Rightarrow T=3(10+2.5)=37.5\\ \\mathrm{N}$. "
     "Check with the heavier block: $5g-T=5a\\Rightarrow T=50-12.5=37.5$.", diff="E")

m, sn, cs, mu = 2, 0.6, 0.8, 0.5
Fup = m * 10 * (sn + mu * cs)
Fdn = m * 10 * (sn - mu * cs)
assert abs(Fup - 20) < 1e-9 and abs(Fdn - 4) < 1e-9
intq("lom_incline", "PHY.LOM",
     "A $2\\ \\mathrm{kg}$ block is pushed up a rough incline of angle $\\theta$ with $\\sin\\theta=0.6$, $\\cos\\theta=0.8$ and "
     "coefficient of kinetic friction $0.5$, by a force parallel to the incline so that it moves up at constant speed. "
     "With $g=10\\ \\mathrm{m/s^2}$, the force required in newton is",
     Fup,
     "Constant speed: net force zero along the incline, friction acts down the slope: "
     "$F=mg\\sin\\theta+\\mu mg\\cos\\theta=20(0.6+0.5\\times0.8)=20\\ \\mathrm{N}$.", diff="M")

scqn("lom_lift", "PHY.LOM",
     "A $60\\ \\mathrm{kg}$ person stands on a weighing scale in a lift that accelerates downward at $2\\ \\mathrm{m/s^2}$. "
     "Taking $g=10\\ \\mathrm{m/s^2}$, the scale reads (in newton)",
     60 * (10 - 2), [60 * 12, 600, 120],
     "$mg-N=ma\\Rightarrow N=m(g-a)=60\\times8=480\\ \\mathrm{N}$.", diff="E")

mt, mh, mu2 = 4, 6, 0.25
a2 = (mh * 10 - mu2 * mt * 10) / (mt + mh)
T2 = mt * (a2 + mu2 * 10)
assert a2 == 5 and T2 == 30 == mh * (10 - a2)
intq("lom_pulley_fric", "PHY.LOM",
     "A $4\\ \\mathrm{kg}$ block on a rough horizontal table ($\\mu_k=0.25$) is connected by a light string over a smooth "
     "pulley at the table edge to a $6\\ \\mathrm{kg}$ block hanging freely. Taking $g=10\\ \\mathrm{m/s^2}$, the tension "
     "in the string in newton is",
     T2,
     "System: $6g-\\mu(4g)=(4+6)a\\Rightarrow 60-10=10a\\Rightarrow a=5\\ \\mathrm{m/s^2}$. "
     "Table block: $T-\\mu(4g)=4a\\Rightarrow T=10+20=30\\ \\mathrm{N}$; hanging block: $60-T=6\\times5\\Rightarrow T=30$ (consistent).",
     diff="M")

# ------------------------------------------------------------------ PHY.WEP
k_, x_, mb = 200, 0.1, 0.5
v_ = x_ * math.sqrt(k_ / mb)
assert abs(v_ - 2) < 1e-12 and abs(0.5 * k_ * x_ ** 2 - 0.5 * mb * v_ ** 2) < 1e-12
scqn("wep_spring", "PHY.WEP",
     "A block of mass $0.5\\ \\mathrm{kg}$ is pressed against a spring ($k=200\\ \\mathrm{N/m}$) compressing it by $10\\ \\mathrm{cm}$ "
     "on a smooth horizontal surface and is then released. The speed with which it leaves the spring (in m/s) is",
     v_, [x_ * math.sqrt(2 * k_ / mb), 4, 0.2],
     "Energy conservation: $\\tfrac12kx^2=\\tfrac12mv^2\\Rightarrow v=x\\sqrt{k/m}=0.1\\sqrt{400}=2\\ \\mathrm{m/s}$.", diff="E")

kg_per_min, depth, eff = 1800, 20, 0.75
Pout = kg_per_min / 60 * 10 * depth
Pin = Pout / eff
assert Pout == 6000 and abs(Pin - 8000) < 1e-9
intq("wep_pump", "PHY.WEP",
     "A pump lifts $1800\\ \\mathrm{kg}$ of water every minute from a well $20\\ \\mathrm{m}$ deep and delivers it with negligible "
     "kinetic energy. If its efficiency is $75\\%$ and $g=10\\ \\mathrm{m/s^2}$, the electrical power drawn in kW is",
     Pin / 1000,
     "Useful power $=\\dfrac{mgh}{t}=\\dfrac{1800\\times10\\times20}{60}=6000\\ \\mathrm{W}$. "
     "Input $=\\dfrac{6000}{0.75}=8000\\ \\mathrm{W}=8\\ \\mathrm{kW}$.", diff="M")

n_ = 200000
W_ = sum((3 * ((i + .5) * 4 / n_) ** 2 + 2 * (i + .5) * 4 / n_) * 4 / n_ for i in range(n_))
assert abs(W_ - 80) < 1e-6 and 4 ** 3 + 4 ** 2 == 80
intq("wep_varforce", "PHY.WEP",
     "A force $F=(3x^2+2x)\\ \\mathrm{N}$ acts on a particle along the $x$-axis. The work done by the force in moving the "
     "particle from $x=0$ to $x=4\\ \\mathrm{m}$ is, in joule,",
     80,
     "$W=\\int_0^4(3x^2+2x)\\,dx=\\left[x^3+x^2\\right]_0^4=64+16=80\\ \\mathrm{J}$.", diff="E")

# sphere: leaves surface where N=0; solve by bisection
def f_(c):  # N/m g = 3c - 2 for a block starting at rest at top (c=cos theta)
    return 3 * c - 2
lo_, hi_ = 0.0, 1.0
for _ in range(80):
    mid = (lo_ + hi_) / 2
    if f_(mid) > 0:
        hi_ = mid
    else:
        lo_ = mid
c_ = (lo_ + hi_) / 2
assert abs(c_ - 2 / 3) < 1e-12
R_ = 90  # cm
drop = R_ * (1 - c_)
assert abs(drop - 30) < 1e-9
intq("wep_hemisphere", "PHY.WEP",
     "A small block slides from rest from the top of a smooth fixed hemisphere of radius $90\\ \\mathrm{cm}$ and leaves "
     "the surface at some point. The vertical distance (in cm) of that point below the top is",
     30,
     "At angle $\\theta$ from the vertical: energy gives $v^2=2gR(1-\\cos\\theta)$; radial equation "
     "$mg\\cos\\theta-N=mv^2/R$. It leaves when $N=0$: $\\cos\\theta=2(1-\\cos\\theta)\\Rightarrow\\cos\\theta=\\tfrac23$. "
     "Drop $=R(1-\\cos\\theta)=R/3=30\\ \\mathrm{cm}$.", diff="H", skills=("conceptual", "calculation"))

# ------------------------------------------------------------------ PHY.GRAV
W0 = 80
assert W0 / (1 + 1) ** 2 == 20
scqn("grav_height", "PHY.GRAV",
     "An astronaut weighs $80\\ \\mathrm{N}$ at the surface of the Earth (radius $R$). Her weight (in newton) at a height $R$ "
     "above the surface is",
     20, [40, 10, 80 / 3],
     "$g'=g\\left(\\dfrac{R}{R+h}\\right)^2=\\dfrac{g}{4}$ for $h=R$, so $W'=80/4=20\\ \\mathrm{N}$.", diff="E")

ve = 11.2 * math.sqrt(9 / 4)
assert abs(ve - 16.8) < 1e-9
scqn("grav_escape", "PHY.GRAV",
     "A planet has $9$ times the mass and $4$ times the radius of the Earth. If the escape speed from the Earth is "
     "$11.2\\ \\mathrm{km/s}$, the escape speed from the planet in km/s is",
     ve, [11.2 * 9 / 4, 11.2 * 3 / 4, 11.2 * 9 / 2],
     "$v_e=\\sqrt{2GM/R}\\propto\\sqrt{M/R}$, so $v_e'=11.2\\sqrt{9/4}=11.2\\times1.5=16.8\\ \\mathrm{km/s}$.", diff="M")

Ta, ra = 3, 1
Tb = Ta * math.sqrt(4 ** 3)
assert Tb == 24
intq("grav_kepler", "PHY.GRAV",
     "Two satellites circle the same planet. Satellite A has orbital period $3\\ \\mathrm{h}$. Satellite B moves in a circular "
     "orbit whose radius is $4$ times that of A. The period of B in hours is",
     24,
     "Kepler's third law: $T^2\\propto r^3\\Rightarrow T_B=T_A\\,4^{3/2}=3\\times8=24\\ \\mathrm{h}$.", diff="E")

gE, RE, ms, r_ = 10, 6.4e6, 500, 2
Eesc = ms * gE * RE ** 2 / (2 * r_ * RE)
assert abs(Eesc - 8e9) < 1
scq("grav_orbit_energy", "PHY.GRAV",
    "A $500\\ \\mathrm{kg}$ satellite moves in a circular orbit of radius $2R_E$ about the Earth ($R_E=6.4\\times10^6\\ \\mathrm{m}$, "
    "$g=10\\ \\mathrm{m/s^2}$ at the surface). The minimum extra energy needed to free it from the Earth's gravity is",
    sci(Eesc, 2), [sci(2 * Eesc, 2), sci(Eesc / 2, 2), sci(4 * Eesc, 2)],
    "Total energy in orbit $=-\\dfrac{GMm}{2r}$; to escape it must become $0$, so "
    "$\\Delta E=\\dfrac{GMm}{2r}=\\dfrac{gR_E^2m}{4R_E}=\\dfrac{gR_Em}{4}=\\dfrac{10\\times6.4\\times10^6\\times500}{4}=8\\times10^9\\ \\mathrm{J}$.",
    diff="H", skills=("conceptual", "calculation"))

# ------------------------------------------------------------------ PHY.SOL
Fw, Lw, Aw, dL = 100, 2.0, 1e-6, 1e-3
Y = Fw * Lw / (Aw * dL)
assert abs(Y - 2e11) < 1
scq("sol_young", "PHY.SOL",
    "A wire of length $2\\ \\mathrm{m}$ and cross-section $1\\ \\mathrm{mm^2}$ elongates by $1\\ \\mathrm{mm}$ under a load of $100\\ \\mathrm{N}$. "
    "Its Young's modulus is",
    "$2\\times10^{11}\\ \\mathrm{N/m^2}$", ["$2\\times10^{8}\\ \\mathrm{N/m^2}$", "$2\\times10^{5}\\ \\mathrm{N/m^2}$", "$5\\times10^{10}\\ \\mathrm{N/m^2}$"],
    "$Y=\\dfrac{FL}{A\\,\\Delta L}=\\dfrac{100\\times2}{(10^{-6})(10^{-3})}=2\\times10^{11}\\ \\mathrm{N/m^2}$ "
    "(convert $\\mathrm{mm^2}$ to $\\mathrm{m^2}$ with $10^{-6}$).", diff="E")

U_ = 0.5 * Fw * (Fw * Lw / (Aw * Y))
assert abs(U_ - 0.05) < 1e-12
scqn("sol_energy", "PHY.SOL",
     "A steel wire ($Y=2\\times10^{11}\\ \\mathrm{N/m^2}$, length $2\\ \\mathrm{m}$, area $1\\ \\mathrm{mm^2}$) carries a load of $100\\ \\mathrm{N}$. "
     "The elastic energy stored in the wire (in joule) is",
     U_, [0.1, 0.025, 5],
     "Extension $=\\dfrac{FL}{AY}=\\dfrac{100\\times2}{10^{-6}\\times2\\times10^{11}}=10^{-3}\\ \\mathrm{m}$. "
     "$U=\\tfrac12F\\,\\Delta L=\\tfrac12\\times100\\times10^{-3}=0.05\\ \\mathrm{J}$.", diff="M")

ratio = (2 / 1) * (2 / 1) ** 2  # (L2/L1)(r1/r2)^2 with L2=2L1, r2=r1/2
assert ratio == 8
intq("sol_ratio", "PHY.SOL",
     "Two wires of the same material carry the same load. Wire 2 is twice as long as wire 1 and has half the radius of wire 1. "
     "The ratio (extension of wire 2) : (extension of wire 1) is $n:1$. The value of $n$ is",
     8,
     "$\\Delta L=\\dfrac{FL}{\\pi r^2Y}\\propto\\dfrac{L}{r^2}$. So $\\dfrac{\\Delta L_2}{\\Delta L_1}=\\dfrac{2}{1}\\cdot\\dfrac{1}{(1/2)^2}=8$.", diff="M")

B_, dP, V0 = 1e11, 4e7, 500
dV = V0 * dP / B_
assert abs(dV - 0.2) < 1e-12
nvq("sol_bulk", "PHY.SOL",
    "A liquid sample of volume $500\\ \\mathrm{cm^3}$ has bulk modulus $1\\times10^{11}\\ \\mathrm{Pa}$. The decrease in its volume (in $\\mathrm{cm^3}$) "
    "when the pressure is increased by $4\\times10^{7}\\ \\mathrm{Pa}$ is",
    0.2, 0.005,
    "$B=-\\dfrac{\\Delta P}{\\Delta V/V}\\Rightarrow|\\Delta V|=\\dfrac{V\\,\\Delta P}{B}=\\dfrac{500\\times4\\times10^7}{10^{11}}=0.2\\ \\mathrm{cm^3}$.", diff="M")

sig, rr = 3.0e8, 0.5e-3
mmax = sig * math.pi * rr ** 2 / 10
assert abs(mmax - 23.56) < 0.01
nvq("sol_break", "PHY.SOL",
    "A wire of radius $0.5\\ \\mathrm{mm}$ has a breaking stress of $3.0\\times10^{8}\\ \\mathrm{N/m^2}$. Taking $g=10\\ \\mathrm{m/s^2}$, the maximum "
    "mass (in kg) that can be hung from it without breaking is approximately",
    23.6, 0.2,
    "$F_{max}=\\sigma A=3\\times10^8\\times\\pi(0.5\\times10^{-3})^2=235.6\\ \\mathrm{N}$, so $m=F/g=23.6\\ \\mathrm{kg}$.", diff="M")

# ------------------------------------------------------------------ PHY.KTG
r_ratio = math.sqrt(32 / 2)
assert r_ratio == 4
intq("ktg_rms", "PHY.KTG",
     "At the same temperature, the ratio of the rms speed of hydrogen molecules ($M=2\\ \\mathrm{g/mol}$) to that of oxygen "
     "molecules ($M=32\\ \\mathrm{g/mol}$) is",
     4,
     "$v_{rms}=\\sqrt{3RT/M}\\propto M^{-1/2}\\Rightarrow\\dfrac{v_{H_2}}{v_{O_2}}=\\sqrt{32/2}=4$.", diff="E")

kB = 1.38e-23
KE = 1.5 * kB * 300
assert abs(KE - 6.21e-21) < 1e-23
scq("ktg_ke", "PHY.KTG",
    "Using $k_B=1.38\\times10^{-23}\\ \\mathrm{J/K}$, the average translational kinetic energy of a gas molecule at $27^\\circ\\mathrm{C}$ is",
    sci(KE), [sci(kB * 300), sci(1.5 * kB * 27), sci(3 * kB * 300)],
    "$T=300\\ \\mathrm{K}$ (always use kelvin). $\\bar{E}=\\tfrac32k_BT=1.5\\times1.38\\times10^{-23}\\times300=6.21\\times10^{-21}\\ \\mathrm{J}$.",
    diff="E")

Cv = (2 * F(3, 2) + 3 * F(5, 2)) / 5
gam = (Cv + 1) / Cv
assert gam == F(31, 21)
scq("ktg_mix", "PHY.KTG",
    "A mixture of $2$ mol of a monatomic ideal gas and $3$ mol of a rigid diatomic ideal gas is kept at moderate temperature. "
    "The ratio $C_p/C_v$ of the mixture is",
    "$\\dfrac{31}{21}$", ["$\\dfrac{3}{2}$", "$\\dfrac{7}{5}$", "$\\dfrac{19}{12}$"],
    "Per mole of mixture $C_v=\\dfrac{2(3R/2)+3(5R/2)}{5}=\\dfrac{21R}{10}$, $C_p=C_v+R=\\dfrac{31R}{10}$, so $\\gamma=\\dfrac{31}{21}\\approx1.48$. "
    "(Averaging the two $\\gamma$ values directly is wrong.)", diff="H", skills=("conceptual", "calculation"))

kT, d, P = 1.38e-23 * 300, 3.0e-10, 1.013e5
lam = kT / (math.sqrt(2) * math.pi * d ** 2 * P)
assert abs(lam - 1.02e-7) < 0.01e-7
scq("ktg_mfp", "PHY.KTG",
    "Treating molecules as hard spheres of diameter $3.0\\times10^{-10}\\ \\mathrm{m}$, the mean free path of a gas at $300\\ \\mathrm{K}$ and "
    "$1.013\\times10^5\\ \\mathrm{Pa}$ is ($k_B=1.38\\times10^{-23}\\ \\mathrm{J/K}$)",
    sci(lam, 3), [sci(lam * math.sqrt(2), 3), sci(lam / 2, 3), sci(lam * 10, 3)],
    "$\\lambda=\\dfrac{k_BT}{\\sqrt2\\,\\pi d^2P}=\\dfrac{4.14\\times10^{-21}}{1.414\\times3.142\\times9\\times10^{-20}\\times1.013\\times10^5}\\approx1.02\\times10^{-7}\\ \\mathrm{m}$.",
    diff="H")

he, ar = 4.0, 39.95
st = [
    ("Average translational kinetic energy per molecule is the same for He and Ar.", True),
    ("The rms speed of He atoms equals that of Ar atoms.", False),
    ("$v_{rms}(\\mathrm{He})/v_{rms}(\\mathrm{Ar})\\approx3.16$.", abs(math.sqrt(ar / he) - 3.16) < 0.01),
    ("At constant volume the pressure of a fixed gas sample doubles when its temperature is doubled in kelvin.", True),
    ("At constant volume the pressure doubles when the temperature rises from $27^\\circ\\mathrm{C}$ to $54^\\circ\\mathrm{C}$.", not (327 / 300 == 2)),
]
st[4] = (st[4][0], False)
msq("ktg_msq", "PHY.KTG",
    "Helium and argon gases (atomic masses $4.0$ and $39.95$) are in thermal equilibrium at the same temperature. Select all correct statements.",
    st,
    "$\\bar E=\\tfrac32k_BT$ depends only on $T$ (A true, B false). $\\sqrt{39.95/4.0}=3.16$ (C true). $P\\propto T$ at constant $V$ with $T$ in kelvin: "
    "doubling $T$ doubles $P$ (D true); $300\\to327\\ \\mathrm{K}$ is only a $9\\%$ increase (E false).", diff="M",
    via="second-derivation")

# ------------------------------------------------------------------ PHY.OSC
A_, w_ = 0.05, 4 * math.pi
amax = A_ * w_ ** 2
assert abs(amax - 7.896) < 0.001
scq("osc_amax", "PHY.OSC",
    "A particle executes SHM given by $x=5\\sin\\left(4\\pi t+\\dfrac{\\pi}{6}\\right)$ cm. The maximum acceleration of the particle is "
    "approximately",
    "$7.90\\ \\mathrm{m/s^2}$", ["$0.63\\ \\mathrm{m/s^2}$", "$1.97\\ \\mathrm{m/s^2}$", "$790\\ \\mathrm{m/s^2}$"],
    "$A=5\\ \\mathrm{cm}=0.05\\ \\mathrm{m}$, $\\omega=4\\pi\\ \\mathrm{rad/s}$. $a_{max}=A\\omega^2=0.05\\times(4\\pi)^2=0.05\\times157.9=7.90\\ \\mathrm{m/s^2}$.",
    diff="M")

k1, mm_ = 200, 0.5
Tser = 2 * math.pi * math.sqrt(mm_ / (k1 / 2))
Tpar = 2 * math.pi * math.sqrt(mm_ / (2 * k1))
Tone = 2 * math.pi * math.sqrt(mm_ / k1)
assert abs(Tser - 0.4443) < 1e-3
scqn("osc_series", "PHY.OSC",
     "A $0.5\\ \\mathrm{kg}$ block is attached to two identical springs of force constant $200\\ \\mathrm{N/m}$ joined end to end "
     "(in series) and oscillates on a smooth horizontal table. Its time period in seconds is approximately",
     Tser, [Tpar, Tone, 2 * math.pi * math.sqrt(mm_ / 50)],
     "Series combination: $k_{eff}=\\dfrac{200\\times200}{400}=100\\ \\mathrm{N/m}$. $T=2\\pi\\sqrt{m/k_{eff}}=2\\pi\\sqrt{0.005}=0.444\\ \\mathrm{s}$.",
     diff="M", f=lambda x: fmt(x, 3))

ratio_T = math.sqrt(10 / 13)
assert abs(ratio_T - 0.877) < 1e-3
scqn("osc_lift", "PHY.OSC",
     "A simple pendulum has period $T$ in a stationary lift. In a lift accelerating upward at $3\\ \\mathrm{m/s^2}$ (take $g=10\\ \\mathrm{m/s^2}$) "
     "its period becomes $T'$. The ratio $T'/T$ is approximately",
     ratio_T, [math.sqrt(1.3), 10 / 13, math.sqrt(0.7)],
     "In the lift's frame $g_{eff}=g+a=13\\ \\mathrm{m/s^2}$. $T\\propto g_{eff}^{-1/2}\\Rightarrow T'/T=\\sqrt{10/13}=0.877$.", diff="M",
     f=lambda x: fmt(x, 3))

A_cm = 24
xx_ = A_cm * math.sqrt(1 - 3 / 4)  # KE = 3 PE -> PE = E/4 -> x^2 = A^2/4
assert abs(xx_ - 12) < 1e-9
intq("osc_energy", "PHY.OSC",
     "A particle in SHM has amplitude $24\\ \\mathrm{cm}$. At a displacement of $x$ cm from the mean position its kinetic energy is "
     "three times its potential energy. The value of $x$ is",
     12,
     "$E=\\tfrac12kA^2$, $U=\\tfrac12kx^2$, $K=3U\\Rightarrow E=K+U=4U\\Rightarrow x^2=A^2/4\\Rightarrow x=A/2=12\\ \\mathrm{cm}$.", diff="E")
