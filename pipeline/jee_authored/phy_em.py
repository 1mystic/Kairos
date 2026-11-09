"""Physics: electrostatics, capacitance, current electricity, magnetism, EMI, AC, EM waves (Class 12)."""
import math
from fractions import Fraction as F

from . import fmt, intq, msq, nvq, scq, scqn
from .phy_mech import sci

K = 9e9
MU0 = 4e-7 * math.pi
EPS0 = 8.85e-12

# ------------------------------------------------------------------ PHY.ELE
Fc = K * 4e-6 * 4e-6 / 0.3 ** 2
assert abs(Fc - 1.6) < 1e-9
scqn("ele_coulomb", "PHY.ELE",
     "Two point charges of $4\\ \\mu\\mathrm{C}$ each are placed $30\\ \\mathrm{cm}$ apart in air ($k=9\\times10^9\\ \\mathrm{N\\,m^2/C^2}$). "
     "The force of repulsion between them (in newton) is",
     Fc, [K * 4e-6 * 4e-6 / 0.3, 16 * 0.9e-3 * 1e3 / 100, K * 8e-6 / 0.09],
     "$F=\\dfrac{kq_1q_2}{r^2}=\\dfrac{9\\times10^9\\times16\\times10^{-12}}{0.09}=1.6\\ \\mathrm{N}$.", diff="E")

# square, charges (+,+,-,-) at (0,0),(a,0),(a,a),(0,a); field at centre
a_ = 1.0
cen = (a_ / 2, a_ / 2)
chg = [((0, 0), 1), ((a_, 0), 1), ((a_, a_), -1), ((0, a_), -1)]
Ex = Ey = 0.0
for (px, py), q in chg:
    dx, dy = cen[0] - px, cen[1] - py
    r2 = dx * dx + dy * dy
    r = math.sqrt(r2)
    Ex += q * dx / r ** 3
    Ey += q * dy / r ** 3
mag = math.hypot(Ex, Ey)
assert abs(Ex) < 1e-12 and abs(mag - 4 * math.sqrt(2)) < 1e-9  # in units of k q / a^2
scq("ele_square", "PHY.ELE",
    "Four point charges $+q,+q,-q,-q$ are placed in that order at the corners of a square of side $a$ (going around the square, so each "
    "charge has one neighbour of the same sign and one of opposite sign). The magnitude of the electric field at the centre of the square is",
    "$\\dfrac{4\\sqrt2\\,kq}{a^2}$", ["$0$", "$\\dfrac{8kq}{a^2}$", "$\\dfrac{4kq}{a^2}$"],
    "Each charge is at distance $a/\\sqrt2$ from the centre, so each contributes $E_0=\\dfrac{kq}{a^2/2}=\\dfrac{2kq}{a^2}$ "
    "(away from $+q$, towards $-q$). The two $+q$ fields and the two $-q$ fields all have a component along the same side direction; the components "
    "perpendicular to it cancel in pairs. Each contributes $E_0\\cos45^\\circ$ along it, so $E=4E_0/\\sqrt2=\\dfrac{4\\sqrt2\\,kq}{a^2}$.",
    diff="H", skills=("conceptual", "calculation"))

n = 800
tot = 0.0
a1 = 1.0
for i in range(n):
    for j in range(n):
        y, z = (i + .5) * a1 / n, (j + .5) * a1 / n
        tot += a1 / (a1 * a1 + y * y + z * z) ** 1.5
tot *= (a1 / n) ** 2 / (4 * math.pi)
assert abs(tot - 1 / 24) < 1e-5
scq("ele_cube_corner", "PHY.ELE",
    "A point charge $q$ is placed at one corner of a cube. The electric flux through a face of the cube that does NOT contain that corner is",
    "$\\dfrac{q}{24\\varepsilon_0}$", ["$\\dfrac{q}{8\\varepsilon_0}$", "$\\dfrac{q}{6\\varepsilon_0}$", "$\\dfrac{q}{4\\varepsilon_0}$"],
    "Surround the charge with $8$ identical cubes so it sits at their common centre. Total flux $q/\\varepsilon_0$ passes through $24$ equal outer "
    "faces, so each gets $\\dfrac{q}{24\\varepsilon_0}$. The three faces touching the charge are parallel to the field lines there and carry zero flux.",
    diff="H")

# ------------------------------------------------------------------ PHY.CAP
C1, C2, Vb = 6, 3, 12
Ceq = C1 * C2 / (C1 + C2)
Q = Ceq * Vb
assert Ceq == 2 and Q == 24 and Q / C2 == 8
intq("cap_series", "PHY.CAP",
     "Capacitors of $6\\ \\mu\\mathrm{F}$ and $3\\ \\mu\\mathrm{F}$ are connected in series across a $12\\ \\mathrm{V}$ battery. "
     "The potential difference across the $3\\ \\mu\\mathrm{F}$ capacitor in volt is",
     8,
     "$C_{eq}=\\dfrac{6\\times3}{9}=2\\ \\mu\\mathrm{F}$, charge on each $=2\\times12=24\\ \\mu\\mathrm{C}$, so $V_3=\\dfrac{24}{3}=8\\ \\mathrm{V}$ "
     "(and $V_6=4\\ \\mathrm{V}$; $8+4=12$).", diff="E")

C0, V0, Kd = 2e-6, 200, 5
U0 = 0.5 * C0 * V0 ** 2
U1 = U0 / Kd
Q0 = C0 * V0
assert abs(U1 - 0.5 * Q0 ** 2 / (Kd * C0)) < 1e-15 and abs(U1 * 1e3 - 8) < 1e-9
scqn("cap_dielectric", "PHY.CAP",
     "A $2\\ \\mu\\mathrm{F}$ parallel-plate capacitor is charged to $200\\ \\mathrm{V}$, disconnected from the battery, and the space between the plates is "
     "completely filled with a dielectric of constant $5$. The energy stored afterwards (in mJ) is",
     8, [200, 40, 1.6],
     "Isolated capacitor: $Q$ is fixed, $C\\to KC$. $U=\\dfrac{Q^2}{2C}$ falls by factor $K$: "
     "$U_0=\\tfrac12(2\\times10^{-6})(200)^2=40\\ \\mathrm{mJ}$, so $U=40/5=8\\ \\mathrm{mJ}$.", diff="M")

Ca, Va, Cb = 4, 100, 6
Vf = Ca * Va / (Ca + Cb)
loss = 0.5 * Ca * Va ** 2 - 0.5 * (Ca + Cb) * Vf ** 2
assert Vf == 40 and abs(loss - 12000) < 1e-9  # microjoule
intq("cap_sharing", "PHY.CAP",
     "A $4\\ \\mu\\mathrm{F}$ capacitor charged to $100\\ \\mathrm{V}$ is connected across an uncharged $6\\ \\mu\\mathrm{F}$ capacitor. "
     "The energy lost (in millijoule) in the process is",
     loss / 1000,
     "Common potential $V=\\dfrac{4\\times100}{10}=40\\ \\mathrm{V}$. "
     "$U_i=\\tfrac12(4\\times10^{-6})(100)^2=20\\ \\mathrm{mJ}$, $U_f=\\tfrac12(10\\times10^{-6})(40)^2=8\\ \\mathrm{mJ}$. Loss $=12\\ \\mathrm{mJ}$.", diff="M")

Vc = 4 * K * 2e-6 / (0.5 / math.sqrt(2))
assert abs(Vc / 1e3 - 203.6) < 0.1
nvq("cap_potential", "PHY.CAP",
    "Four charges of $+2\\ \\mu\\mathrm{C}$ each are placed at the corners of a square of side $0.5\\ \\mathrm{m}$. "
    "The electric potential at the centre of the square, in kV, is approximately ($k=9\\times10^9$ SI)",
    203.6, 2.0,
    "Distance of each corner from the centre $r=\\dfrac{0.5}{\\sqrt2}=0.3536\\ \\mathrm{m}$. Potential is a scalar so it adds: "
    "$V=4\\times\\dfrac{9\\times10^9\\times2\\times10^{-6}}{0.3536}=2.04\\times10^5\\ \\mathrm{V}\\approx204\\ \\mathrm{kV}$.", diff="M")

t_ = F(1, 2)  # slab thickness as fraction of d, K=3
Kk = 3
Cr = 1 / (t_ / Kk + (1 - t_))
assert Cr == F(3, 2)
scq("cap_slab", "PHY.CAP",
    "A parallel-plate capacitor has capacitance $C_0$ in air. A dielectric slab of constant $3$ and thickness $d/2$ (half the plate separation $d$, "
    "covering the full plate area) is inserted. The new capacitance is",
    "$\\dfrac{3}{2}C_0$", ["$3C_0$", "$2C_0$", "$\\dfrac{2}{3}C_0$"],
    "Treat as two capacitors in series: $\\dfrac1C=\\dfrac{d/2}{K\\varepsilon_0A}+\\dfrac{d/2}{\\varepsilon_0A}=\\dfrac{d}{\\varepsilon_0A}\\left(\\dfrac16+\\dfrac12\\right)=\\dfrac{2}{3C_0}$, "
    "so $C=\\tfrac32C_0$.", diff="H")

# ------------------------------------------------------------------ PHY.CUR
R0, nx = 8, 3
assert R0 * nx ** 2 == 72
intq("cur_stretch", "PHY.CUR",
     "A uniform wire of resistance $8\\ \\Omega$ is uniformly stretched to three times its original length (volume constant). "
     "The new resistance in ohm is",
     72,
     "$R=\\rho L/A$ with $AL$ constant: $R\\propto L^2$, so $R'=8\\times3^2=72\\ \\Omega$.", diff="E")

# solve E(r): I1(R1+r)=I2(R2+r)
I1, R1_, I2, R2_ = 2, 5, 1.2, 9
r_ = (I2 * R2_ - I1 * R1_) / (I1 - I2)
E_ = I1 * (R1_ + r_)
assert abs(r_ - 1) < 1e-9 and abs(E_ - 12) < 1e-9 and abs(I2 * (R2_ + r_) - 12) < 1e-9
intq("cur_emf", "PHY.CUR",
     "A cell sends a current of $2\\ \\mathrm{A}$ through an external resistance of $5\\ \\Omega$ and $1.2\\ \\mathrm{A}$ through $9\\ \\Omega$. "
     "The emf of the cell in volt is",
     12,
     "$\\varepsilon=2(5+r)=1.2(9+r)\\Rightarrow 10+2r=10.8+1.2r\\Rightarrow r=1\\ \\Omega$, so $\\varepsilon=2\\times6=12\\ \\mathrm{V}$.", diff="M")

E1, l1, l2 = 1.5, 75, 50
E2 = E1 * l2 / l1
assert abs(E2 - 1.0) < 1e-12
scqn("cur_potentiometer", "PHY.CUR",
     "In a potentiometer experiment a standard cell of emf $1.5\\ \\mathrm{V}$ balances at $75\\ \\mathrm{cm}$ of the wire. "
     "A second cell balances at $50\\ \\mathrm{cm}$ under the same driver-cell conditions. The emf of the second cell (in volt) is",
     E2, [1.5 * 75 / 50, 1.5 - 0.25, 0.75],
     "Potential gradient is constant, so $\\varepsilon\\propto l$: $\\varepsilon_2=1.5\\times\\dfrac{50}{75}=1.0\\ \\mathrm{V}$.", diff="E")

V_, P1, P2 = 220, 60, 100
Ra, Rb = V_ ** 2 / P1, V_ ** 2 / P2
I_ = V_ / (Ra + Rb)
Pa, Pb = I_ ** 2 * Ra, I_ ** 2 * Rb
assert abs(Pa - 23.4) < 0.05 and Pa > Pb
scqn("cur_bulbs", "PHY.CUR",
     "A $60\\ \\mathrm{W}$, $220\\ \\mathrm{V}$ bulb and a $100\\ \\mathrm{W}$, $220\\ \\mathrm{V}$ bulb are connected in series across a $220\\ \\mathrm{V}$ supply "
     "(resistances assumed constant). The power dissipated in the $60\\ \\mathrm{W}$ bulb (in watt) is approximately",
     Pa, [Pb, 60, 37.5],
     "$R_{60}=\\dfrac{220^2}{60}=806.7\\ \\Omega$, $R_{100}=484\\ \\Omega$. $I=\\dfrac{220}{1290.7}=0.1704\\ \\mathrm{A}$. "
     "$P_{60}=I^2R=23.4\\ \\mathrm{W}$ (the $100\\ \\mathrm{W}$ bulb gets $14.1\\ \\mathrm{W}$; total $37.5\\ \\mathrm{W}$). "
     "In series the larger-resistance (lower-rated) bulb glows brighter.", diff="M", f=lambda x: fmt(x, 3))

# ------------------------------------------------------------------ PHY.MAG
Fm = 0.2 * 4 * 0.5 * math.sin(math.radians(30))
assert abs(Fm - 0.2) < 1e-12
scqn("mag_wire", "PHY.MAG",
     "A $0.5\\ \\mathrm{m}$ long straight wire carrying $4\\ \\mathrm{A}$ is placed in a uniform field of $0.2\\ \\mathrm{T}$ making an angle of "
     "$30^\\circ$ with the field. The magnetic force on the wire (in newton) is",
     Fm, [0.2 * 4 * 0.5 * math.cos(math.radians(30)), 0.4, 0.8],
     "$F=BIl\\sin\\theta=0.2\\times4\\times0.5\\times\\sin30^\\circ=0.2\\ \\mathrm{N}$.", diff="E")

mp, qe = 1.67e-27, 1.6e-19
rp = math.sqrt(2 * mp * 800 / qe) / 0.2
assert abs(rp * 100 - 2.04) < 0.01
nvq("mag_proton", "PHY.MAG",
    "A proton, starting from rest, is accelerated through $800\\ \\mathrm{V}$ and enters a uniform magnetic field of $0.2\\ \\mathrm{T}$ "
    "perpendicular to its velocity. Its orbit radius in cm is approximately ($m_p=1.67\\times10^{-27}\\ \\mathrm{kg}$, $e=1.6\\times10^{-19}\\ \\mathrm{C}$)",
    2.04, 0.03,
    "$qV=\\tfrac12mv^2\\Rightarrow v=\\sqrt{2qV/m}=1.24\\times10^{5}\\ \\mathrm{m/s}$. $r=\\dfrac{mv}{qB}=\\dfrac{\\sqrt{2mV/q}}{B}=\\dfrac{4.09\\times10^{-3}}{0.2}=2.04\\times10^{-2}\\ \\mathrm{m}$.",
    diff="M")

Bc = MU0 * 20 * 5 / (2 * 0.1)
assert abs(Bc - 6.283e-4) < 1e-6
scq("mag_loop", "PHY.MAG",
    "A circular coil of $20$ turns and radius $10\\ \\mathrm{cm}$ carries a current of $5\\ \\mathrm{A}$. The magnetic field at its centre is "
    "($\\mu_0=4\\pi\\times10^{-7}\\ \\mathrm{T\\,m/A}$)",
    sci(Bc, 3) + "$\\ \\mathrm{T}$", [sci(Bc / 20, 3) + "$\\ \\mathrm{T}$", sci(Bc * 2, 3) + "$\\ \\mathrm{T}$", sci(Bc / math.pi, 3) + "$\\ \\mathrm{T}$"],
    "$B=\\dfrac{\\mu_0NI}{2R}=\\dfrac{4\\pi\\times10^{-7}\\times20\\times5}{0.2}=6.28\\times10^{-4}\\ \\mathrm{T}$.", diff="M")

fl = 2e-7 * 10 * 15 / 0.05
assert abs(fl - 6e-4) < 1e-12
intq("mag_parallel", "PHY.MAG",
     "Two long parallel wires $5\\ \\mathrm{cm}$ apart carry currents of $10\\ \\mathrm{A}$ and $15\\ \\mathrm{A}$ in the same direction. "
     "The force per unit length between them is $x\\times10^{-5}\\ \\mathrm{N/m}$. The value of $x$ is",
     60,
     "$\\dfrac{F}{L}=\\dfrac{\\mu_0I_1I_2}{2\\pi d}=\\dfrac{2\\times10^{-7}\\times10\\times15}{0.05}=6\\times10^{-4}=60\\times10^{-5}\\ \\mathrm{N/m}$ (attractive).",
    diff="M")

tau = 50 * 2 * 0.02 * 0.3 * math.sin(math.radians(60))
assert abs(tau - 0.5196) < 1e-3
nvq("mag_torque", "PHY.MAG",
    "A coil of $50$ turns, area $0.02\\ \\mathrm{m^2}$ and current $2\\ \\mathrm{A}$ is in a uniform field of $0.3\\ \\mathrm{T}$. The normal to the coil makes "
    "$60^\\circ$ with the field. The torque on the coil, in N m, is approximately",
    0.52, 0.005,
    "$\\tau=NIAB\\sin\\theta=50\\times2\\times0.02\\times0.3\\times\\sin60^\\circ=0.6\\times0.866=0.52\\ \\mathrm{N\\,m}$ "
    "($\\theta$ is the angle between the area normal and $\\vec B$).", diff="M")

# ------------------------------------------------------------------ PHY.MAGM
Bax = 1e-7 * 2 * 2 / 0.1 ** 3
assert abs(Bax - 4e-4) < 1e-12
scq("magm_axial", "PHY.MAGM",
    "A short bar magnet of magnetic moment $2\\ \\mathrm{A\\,m^2}$ lies in air. The magnitude of its field at a point on its axis $10\\ \\mathrm{cm}$ "
    "from the centre is ($\\mu_0/4\\pi=10^{-7}\\ \\mathrm{T\\,m/A}$)",
    "$4\\times10^{-4}\\ \\mathrm{T}$", ["$2\\times10^{-4}\\ \\mathrm{T}$", "$4\\times10^{-5}\\ \\mathrm{T}$", "$8\\times10^{-4}\\ \\mathrm{T}$"],
    "Axial field $B=\\dfrac{\\mu_0}{4\\pi}\\dfrac{2m}{r^3}=10^{-7}\\times\\dfrac{4}{10^{-3}}=4\\times10^{-4}\\ \\mathrm{T}$ "
    "(the equatorial value would be half of this: $2\\times10^{-4}$).", diff="E")

H_, dip = 0.3, 60
Bt = H_ / math.cos(math.radians(dip))
Vv = Bt * math.sin(math.radians(dip))
assert abs(Vv - H_ * math.tan(math.radians(dip))) < 1e-12
scqn("magm_dip", "PHY.MAGM",
     "At a place the horizontal component of the Earth's field is $0.3\\ \\mathrm{G}$ and the angle of dip is $60^\\circ$. "
     "The total field (in gauss) is",
     Bt, [H_ * math.tan(math.radians(60)), H_ * math.sin(math.radians(60)), H_ / 2 * math.sqrt(3) * 2 / 1.5],
     "$H=B\\cos\\delta\\Rightarrow B=\\dfrac{H}{\\cos60^\\circ}=0.6\\ \\mathrm{G}$ "
     "(vertical component $V=B\\sin\\delta=0.52\\ \\mathrm{G}$).", diff="M", f=lambda x: fmt(x, 3))

tq = 5 * 0.2 * math.sin(math.radians(30))
assert abs(tq - 0.5) < 1e-12
scqn("magm_torque", "PHY.MAGM",
     "A magnet of moment $5\\ \\mathrm{A\\,m^2}$ is held at $30^\\circ$ to a uniform field of $0.2\\ \\mathrm{T}$. The torque on it (in N m) is",
     tq, [5 * 0.2 * math.cos(math.radians(30)), 1.0, 0.2 * 30],
     "$\\tau=mB\\sin\\theta=5\\times0.2\\times\\tfrac12=0.5\\ \\mathrm{N\\,m}$.", diff="E", f=lambda x: fmt(x, 3))

T0, Bf = 2.0, 4
Tn = T0 / math.sqrt(Bf)
assert Tn == 1.0 and 10 * Tn == 10
intq("magm_oscillation", "PHY.MAGM",
     "A bar magnet oscillating in a horizontal magnetic field completes $10$ oscillations in $20\\ \\mathrm{s}$. When the field is made four times as "
     "strong, the time (in seconds) taken for $10$ oscillations is",
     10,
     "$T=2\\pi\\sqrt{I/(mB)}\\propto B^{-1/2}$. Quadrupling $B$ halves the period: $T=2\\to1\\ \\mathrm{s}$, so $10$ oscillations take $10\\ \\mathrm{s}$.",
     diff="M")

chi = 6e-5 * 300 / 200
assert abs(chi - 9e-5) < 1e-12
intq("magm_curie", "PHY.MAGM",
     "The magnetic susceptibility of a paramagnetic sample at $300\\ \\mathrm{K}$ is $6\\times10^{-5}$. Assuming Curie's law, its susceptibility at "
     "$200\\ \\mathrm{K}$ is $x\\times10^{-5}$. The value of $x$ is",
     9,
     "Curie's law: $\\chi\\propto1/T\\Rightarrow\\chi_{200}=6\\times10^{-5}\\times\\dfrac{300}{200}=9\\times10^{-5}$.", diff="E")

msq("magm_msq", "PHY.MAGM",
    "Select all correct statements about magnetic materials.",
    [("Diamagnetic substances have a small negative susceptibility.", True),
     ("A ferromagnetic substance behaves as a paramagnet above its Curie temperature.", True),
     ("The susceptibility of a paramagnetic substance is proportional to $1/T$ (Curie law).", True),
     ("Soft iron is preferred for permanent magnets because of its large coercivity.", False),
     ("A superconductor has relative permeability $\\mu_r=1$.", False)],
    "A, B, C are standard results. D is false: permanent magnets need high coercivity and retentivity (steel), soft iron has low coercivity "
    "so it is used in electromagnets and transformer cores. E is false: a superconductor expels the field (Meissner effect), "
    "$\\chi=-1$, so $\\mu_r=1+\\chi=0$.", diff="M", via="second-derivation")

# ------------------------------------------------------------------ PHY.EMI
emf = 0.3 * 4 * 0.5
assert abs(emf - 0.6) < 1e-12
scqn("emi_rod", "PHY.EMI",
     "A conducting rod of length $0.5\\ \\mathrm{m}$ moves at $4\\ \\mathrm{m/s}$ perpendicular to a uniform field of $0.3\\ \\mathrm{T}$ "
     "and perpendicular to its own length. The motional emf across its ends (in volt) is",
     emf, [0.3 * 4, 0.3 * 0.5, 2.4],
     "$\\varepsilon=Blv=0.3\\times0.5\\times4=0.6\\ \\mathrm{V}$.", diff="E", f=lambda x: fmt(x, 3))

e_ = 100 * 0.01 * (0.5 - 0) / 0.05
assert abs(e_ - 10) < 1e-12
intq("emi_coil", "PHY.EMI",
     "A coil of $100$ turns and area $0.01\\ \\mathrm{m^2}$ has its plane perpendicular to a field that grows uniformly from $0$ to $0.5\\ \\mathrm{T}$ "
     "in $0.05\\ \\mathrm{s}$. The induced emf in volt is",
     10,
     "$|\\varepsilon|=N\\dfrac{\\Delta\\Phi}{\\Delta t}=100\\times\\dfrac{0.5\\times0.01}{0.05}=10\\ \\mathrm{V}$.", diff="E")

Ls = MU0 * 1000 ** 2 * 2e-4 / 0.5
assert abs(Ls * 1e3 - 0.503) < 0.001
scq("emi_solenoid", "PHY.EMI",
    "A long air-core solenoid has $1000$ turns, length $0.5\\ \\mathrm{m}$ and cross-sectional area $2\\times10^{-4}\\ \\mathrm{m^2}$. "
    "Its self-inductance is approximately",
    "$0.50\\ \\mathrm{mH}$", ["$0.25\\ \\mathrm{mH}$", "$5.0\\ \\mathrm{mH}$", "$0.050\\ \\mathrm{mH}$"],
    "$L=\\dfrac{\\mu_0N^2A}{l}=\\dfrac{4\\pi\\times10^{-7}\\times10^6\\times2\\times10^{-4}}{0.5}=5.03\\times10^{-4}\\ \\mathrm{H}=0.50\\ \\mathrm{mH}$.", diff="M")

Ig = 20 / 10 * (1 - math.exp(-0.2 * 10 / 2))
assert abs(Ig - 1.264) < 1e-3
scqn("emi_lr", "PHY.EMI",
     "A $2\\ \\mathrm{H}$ inductor in series with a $10\\ \\Omega$ resistor is connected at $t=0$ to a $20\\ \\mathrm{V}$ battery. "
     "The current (in ampere) at $t=0.2\\ \\mathrm{s}$ is ($e=2.718$)",
     Ig, [2 * math.exp(-1), 2.0, 1 - math.exp(-1)],
     "$\\tau=L/R=0.2\\ \\mathrm{s}$ so $t=\\tau$. $I=I_0(1-e^{-t/\\tau})=2(1-0.368)=1.26\\ \\mathrm{A}$.", diff="M",
     f=lambda x: fmt(x, 3))

em = 0.5 * 4 / 0.1
assert em == 20
intq("emi_mutual", "PHY.EMI",
     "Two coils have a mutual inductance of $0.5\\ \\mathrm{H}$. The current in the primary falls uniformly from $4\\ \\mathrm{A}$ to zero in $0.1\\ \\mathrm{s}$. "
     "The emf induced in the secondary in volt is",
     20,
     "$|\\varepsilon|=M\\left|\\dfrac{dI}{dt}\\right|=0.5\\times\\dfrac{4}{0.1}=20\\ \\mathrm{V}$.", diff="E")

emax = 200 * 0.05 * 0.4 * 2 * math.pi * 50
assert abs(emax - 1256.6) < 0.1
scq("emi_generator", "PHY.EMI",
    "A rectangular coil of $200$ turns and area $0.05\\ \\mathrm{m^2}$ rotates at $50$ revolutions per second in a uniform field of $0.4\\ \\mathrm{T}$ "
    "about an axis perpendicular to the field. The peak emf generated is approximately",
    "$1257\\ \\mathrm{V}$", ["$200\\ \\mathrm{V}$", "$628\\ \\mathrm{V}$", "$4\\ \\mathrm{V}$"],
    "$\\varepsilon_0=NAB\\omega$ with $\\omega=2\\pi\\times50=314\\ \\mathrm{rad/s}$: $200\\times0.05\\times0.4\\times314=1257\\ \\mathrm{V}$. "
    "(Using $\\omega=50$ instead of $2\\pi f$ is a common slip: it gives $200$ V.)", diff="M")

# ------------------------------------------------------------------ PHY.AC
nstep = 100000
irms2 = sum((3 + 4 * math.sin(2 * math.pi * (k + .5) / nstep)) ** 2 for k in range(nstep)) / nstep
assert abs(irms2 - 17) < 1e-6
scqn("ac_rms", "PHY.AC",
     "A current $i=3+4\\sin\\omega t$ (in ampere) flows through a resistor. Its rms value (in ampere) is",
     math.sqrt(irms2), [5, 7, math.sqrt(9 + 4)],
     "$i_{rms}^2=\\overline{(3+4\\sin\\omega t)^2}=9+24\\,\\overline{\\sin\\omega t}+16\\,\\overline{\\sin^2\\omega t}=9+0+8=17$, so $i_{rms}=\\sqrt{17}=4.12\\ \\mathrm{A}$.",
     diff="H", f=lambda x: fmt(x, 3))

w, L_, C_, R_ = 1000, 80e-3, 25e-6, 30
XL, XC = w * L_, 1 / (w * C_)
Z = math.hypot(R_, XL - XC)
assert abs(XL - 80) < 1e-9 and abs(XC - 40) < 1e-9 and abs(Z - 50) < 1e-9
intq("ac_impedance", "PHY.AC",
     "A series circuit has $R=30\\ \\Omega$, $L=80\\ \\mathrm{mH}$ and $C=25\\ \\mu\\mathrm{F}$ driven at $\\omega=1000\\ \\mathrm{rad/s}$. "
     "The impedance in ohm is",
     50,
     "$X_L=\\omega L=80\\ \\Omega$, $X_C=\\dfrac{1}{\\omega C}=40\\ \\Omega$. $Z=\\sqrt{R^2+(X_L-X_C)^2}=\\sqrt{900+1600}=50\\ \\Omega$.", diff="M")

f0 = 1 / (2 * math.pi * math.sqrt(1e-3 * 10e-6))
assert abs(f0 - 1591.5) < 0.1
scq("ac_resonance", "PHY.AC",
    "A series LCR circuit has $L=1\\ \\mathrm{mH}$ and $C=10\\ \\mu\\mathrm{F}$. Its resonant frequency is approximately",
    "$1.59\\ \\mathrm{kHz}$", ["$10\\ \\mathrm{kHz}$", "$0.16\\ \\mathrm{kHz}$", "$15.9\\ \\mathrm{kHz}$"],
    "$f_0=\\dfrac{1}{2\\pi\\sqrt{LC}}=\\dfrac{1}{2\\pi\\sqrt{10^{-3}\\times10^{-5}}}=\\dfrac{10^4}{2\\pi}=1.59\\times10^3\\ \\mathrm{Hz}$ "
    "($\\omega_0=10^4\\ \\mathrm{rad/s}$; do not forget the $2\\pi$).", diff="E")

Qf = (1 / math.sqrt(1e-3 * 10e-6)) * 1e-3 / 0.5
assert abs(Qf - 20) < 1e-9
intq("ac_qfactor", "PHY.AC",
     "A series LCR circuit with $L=1\\ \\mathrm{mH}$, $C=10\\ \\mu\\mathrm{F}$ and $R=0.5\\ \\Omega$ is at resonance. Its quality factor is",
     20,
     "$\\omega_0=\\dfrac{1}{\\sqrt{LC}}=10^4\\ \\mathrm{rad/s}$, $Q=\\dfrac{\\omega_0L}{R}=\\dfrac{10^4\\times10^{-3}}{0.5}=20$.", diff="M")

Ip = 11 * 4 / (0.9 * 220)
assert abs(Ip - 0.2222) < 1e-3
scqn("ac_transformer", "PHY.AC",
     "A step-down transformer converts $220\\ \\mathrm{V}$ to $11\\ \\mathrm{V}$ and its secondary supplies $4\\ \\mathrm{A}$ to a load. If its efficiency is $90\\%$, "
     "the primary current (in ampere) is approximately",
     Ip, [4 / 20, 11 * 4 / 220 * 0.9, 4 * 20],
     "Output power $=11\\times4=44\\ \\mathrm{W}$; input $=44/0.9=48.9\\ \\mathrm{W}$; $I_p=\\dfrac{48.9}{220}=0.222\\ \\mathrm{A}$. "
     "(Ideal transformer would give $0.2$ A.)", diff="M", f=lambda x: fmt(x, 3))

Pw = 20 ** 2 * 6 / (6 ** 2 + 8 ** 2)
assert Pw == 24
intq("ac_power", "PHY.AC",
     "A coil of resistance $6\\ \\Omega$ and inductive reactance $8\\ \\Omega$ is connected to a $20\\ \\mathrm{V}$ (rms) AC source. "
     "The average power consumed in watt is",
     24,
     "$Z=\\sqrt{36+64}=10\\ \\Omega$, $I_{rms}=2\\ \\mathrm{A}$, $\\cos\\phi=R/Z=0.6$. $P=V_{rms}I_{rms}\\cos\\phi=20\\times2\\times0.6=24\\ \\mathrm{W}$ "
     "(equivalently $I^2R=4\\times6$).", diff="M")

# ------------------------------------------------------------------ PHY.EMW
c_ = 3e8
B0 = 60 / c_
assert abs(B0 - 2e-7) < 1e-12
scq("emw_b0", "PHY.EMW",
    "In a plane electromagnetic wave in vacuum the electric field amplitude is $60\\ \\mathrm{V/m}$. The magnetic field amplitude is "
    "($c=3\\times10^8\\ \\mathrm{m/s}$)",
    "$2\\times10^{-7}\\ \\mathrm{T}$", ["$2\\times10^{-9}\\ \\mathrm{T}$", "$1.8\\times10^{10}\\ \\mathrm{T}$", "$5\\times10^{6}\\ \\mathrm{T}$"],
    "$E_0=cB_0\\Rightarrow B_0=60/(3\\times10^8)=2\\times10^{-7}\\ \\mathrm{T}$.", diff="E")

Iw = 0.5 * EPS0 * c_ * 100 ** 2
assert abs(Iw - 13.3) < 0.05
scqn("emw_intensity", "PHY.EMW",
     "A plane electromagnetic wave in vacuum has electric field amplitude $100\\ \\mathrm{V/m}$. Its intensity (in $\\mathrm{W/m^2}$) is approximately "
     "($\\varepsilon_0=8.85\\times10^{-12}$ SI, $c=3\\times10^8\\ \\mathrm{m/s}$)",
     Iw, [EPS0 * c_ * 100 ** 2, 0.5 * EPS0 * c_ * 100, 0.5 * EPS0 * 100 ** 2],
     "$I=\\tfrac12\\varepsilon_0cE_0^2=0.5\\times8.85\\times10^{-12}\\times3\\times10^8\\times10^4=13.3\\ \\mathrm{W/m^2}$.", diff="M",
     f=lambda x: fmt(x, 3))

p_abs = 300 / c_
assert abs(p_abs - 1e-6) < 1e-15
scq("emw_pressure", "PHY.EMW",
    "Sunlight of intensity $300\\ \\mathrm{W/m^2}$ falls normally on a perfectly reflecting surface. The radiation pressure is "
    "($c=3\\times10^8\\ \\mathrm{m/s}$)",
    "$2\\times10^{-6}\\ \\mathrm{Pa}$", ["$1\\times10^{-6}\\ \\mathrm{Pa}$", "$9\\times10^{10}\\ \\mathrm{Pa}$", "$4\\times10^{-6}\\ \\mathrm{Pa}$"],
    "A perfect absorber feels $p=I/c=10^{-6}\\ \\mathrm{Pa}$; reflection reverses the momentum so $p=2I/c=2\\times10^{-6}\\ \\mathrm{Pa}$.", diff="M")

lam = 3e8 / 90e6
assert abs(lam - 3.333) < 1e-3
nvq("emw_wavelength", "PHY.EMW",
    "An FM station transmits at $90\\ \\mathrm{MHz}$. The wavelength of the wave in metres is approximately",
    3.33, 0.02,
    "$\\lambda=\\dfrac{c}{f}=\\dfrac{3\\times10^8}{90\\times10^6}=3.33\\ \\mathrm{m}$.", diff="E")

msq("emw_msq", "PHY.EMW",
    "Select all correct statements about a plane electromagnetic wave in vacuum.",
    [("$\\vec E$ and $\\vec B$ are perpendicular to each other and to the direction of propagation.", True),
     ("$\\vec E$ and $\\vec B$ oscillate $90^\\circ$ out of phase.", False),
     ("The average energy density of the electric field equals that of the magnetic field.", True),
     ("The speed of the wave depends on its frequency.", False),
     ("The wave carries momentum equal to energy divided by $c$.", True)],
    "Transverse, $\\vec E\\perp\\vec B\\perp\\vec k$ (A true). $E$ and $B$ are in phase (B false). $u_E=\\tfrac12\\varepsilon_0E^2$ and "
    "$u_B=\\dfrac{B^2}{2\\mu_0}=\\dfrac{E^2}{2\\mu_0c^2}=\\tfrac12\\varepsilon_0E^2$ (C true). In vacuum $c=1/\\sqrt{\\mu_0\\varepsilon_0}$ for all frequencies (D false). "
    "$p=U/c$ (E true).", diff="M", via="second-derivation")
