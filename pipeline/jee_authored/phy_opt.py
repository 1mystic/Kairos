"""Physics: ray optics, wave optics, dual nature, semiconductor electronics."""
import itertools
import math

from . import fmt, intq, msq, nvq, scq, scqn
from .phy_mech import sci

# ------------------------------------------------------------------ PHY.ROP
u_, f_ = -30, 20  # Cartesian sign convention
v_ = 1 / (1 / f_ + 1 / u_)
assert abs(v_ - (-60)) < 1e-9 or True
v_ = 1 / (1 / f_ + 1 / u_)  # 1/v - 1/u = 1/f -> 1/v = 1/f + 1/u
assert abs(1 / v_ - 1 / u_ - 1 / f_) < 1e-12 and abs(v_ + 60) < 1e-9 or abs(v_ - 60) < 1e-9
assert abs(v_ - 60) < 1e-9, v_
scq("rop_lens", "PHY.ROP",
    "An object is placed $30\\ \\mathrm{cm}$ in front of a thin convex lens of focal length $20\\ \\mathrm{cm}$. The image is",
    "real, inverted, $60\\ \\mathrm{cm}$ from the lens on the other side",
    ["virtual, erect, $12\\ \\mathrm{cm}$ from the lens on the same side", "real, inverted, $12\\ \\mathrm{cm}$ from the lens on the other side",
     "virtual, erect, $60\\ \\mathrm{cm}$ from the lens on the same side"],
    "$\\dfrac1v-\\dfrac1u=\\dfrac1f$ with $u=-30$, $f=+20$: $\\dfrac1v=\\dfrac1{20}-\\dfrac1{30}=\\dfrac1{60}\\Rightarrow v=+60\\ \\mathrm{cm}$ "
    "(real, other side). $m=v/u=-2$: inverted and magnified.", diff="E")

depth, n_w = 12, 4 / 3
app = depth / n_w
assert abs(app - 9) < 1e-12
intq("rop_depth", "PHY.ROP",
     "A coin lies at the bottom of a $12\\ \\mathrm{cm}$ deep layer of water ($n=4/3$). Seen from directly above, its apparent depth in cm is",
     9,
     "Apparent depth $=\\dfrac{\\text{real depth}}{n}=\\dfrac{12}{4/3}=9\\ \\mathrm{cm}$.", diff="E")

A_, nP = 60, math.sqrt(3)
dmin = 2 * math.degrees(math.asin(nP * math.sin(math.radians(A_ / 2)))) - A_
assert abs(dmin - 60) < 1e-9
intq("rop_prism", "PHY.ROP",
     "A prism of apex angle $60^\\circ$ has refractive index $\\sqrt3$. The angle of minimum deviation in degrees is",
     60,
     "$n=\\dfrac{\\sin\\frac{A+\\delta_m}{2}}{\\sin\\frac A2}\\Rightarrow\\sin\\frac{60+\\delta_m}{2}=\\sqrt3\\times\\tfrac12=\\sin60^\\circ$, "
     "so $\\dfrac{60+\\delta_m}{2}=60^\\circ\\Rightarrow\\delta_m=60^\\circ$.", diff="M")

sC = 1 / (4 / 3)
Cang = math.degrees(math.asin(sC))
assert abs(Cang - 48.59) < 0.01
scq("rop_critical", "PHY.ROP",
    "The critical angle for light going from water ($n=4/3$) to air is $\\theta_c$. Then $\\sin\\theta_c$ equals",
    "$\\dfrac34$", ["$\\dfrac43$", "$\\dfrac{3}{5}$", "$\\dfrac{\\sqrt7}{4}$"],
    "At the critical angle the refracted ray grazes the surface: $n\\sin\\theta_c=1\\times\\sin90^\\circ\\Rightarrow\\sin\\theta_c=\\dfrac1n=\\dfrac34$ "
    "($\\theta_c\\approx48.6^\\circ$). $\\dfrac43>1$ is impossible for a sine.", diff="E")

fo, fe = 100, 5
assert fo / fe == 20 and fo + fe == 105
intq("rop_telescope", "PHY.ROP",
     "An astronomical telescope has an objective of focal length $100\\ \\mathrm{cm}$ and an eyepiece of focal length $5\\ \\mathrm{cm}$. "
     "In normal adjustment its angular magnification is",
     20,
     "$m=\\dfrac{f_o}{f_e}=\\dfrac{100}{5}=20$ (tube length $f_o+f_e=105\\ \\mathrm{cm}$).", diff="E")

# ------------------------------------------------------------------ PHY.WOP
lam, D, d = 600e-9, 1.5, 0.3e-3
beta = lam * D / d
assert abs(beta - 3e-3) < 1e-12
scq("wop_fringe", "PHY.WOP",
    "In Young's double-slit experiment the slits are $0.3\\ \\mathrm{mm}$ apart and the screen is $1.5\\ \\mathrm{m}$ away. Light of wavelength $600\\ \\mathrm{nm}$ "
    "is used. The fringe width is",
    "$3\\ \\mathrm{mm}$", ["$0.3\\ \\mathrm{mm}$", "$1.2\\ \\mathrm{mm}$", "$30\\ \\mathrm{mm}$"],
    "$\\beta=\\dfrac{\\lambda D}{d}=\\dfrac{600\\times10^{-9}\\times1.5}{0.3\\times10^{-3}}=3\\times10^{-3}\\ \\mathrm{m}$.", diff="E")

b2 = 500e-9 * 1 / 0.5e-3
y4 = 4 * b2 * 1e3
assert abs(y4 - 4) < 1e-9
intq("wop_position", "PHY.WOP",
     "In a double-slit experiment with slit separation $0.5\\ \\mathrm{mm}$, screen distance $1\\ \\mathrm{m}$ and $\\lambda=500\\ \\mathrm{nm}$, the distance "
     "(in mm) of the $4^{th}$ bright fringe from the central maximum is",
     4,
     "$y_n=\\dfrac{n\\lambda D}{d}$, $y_4=\\dfrac{4\\times500\\times10^{-9}\\times1}{0.5\\times10^{-3}}=4\\times10^{-3}\\ \\mathrm{m}=4\\ \\mathrm{mm}$.",
     diff="M")

w_c = 2 * 500e-9 * 2 / 0.2e-3
assert abs(w_c - 0.01) < 1e-12
intq("wop_single_slit", "PHY.WOP",
     "Light of wavelength $500\\ \\mathrm{nm}$ falls on a single slit of width $0.2\\ \\mathrm{mm}$. On a screen $2\\ \\mathrm{m}$ away the width of the central "
     "maximum in mm is",
     10,
     "Central maximum extends between the first minima: width $=\\dfrac{2\\lambda D}{a}=\\dfrac{2\\times500\\times10^{-9}\\times2}{0.2\\times10^{-3}}=10^{-2}\\ \\mathrm{m}=10\\ \\mathrm{mm}$.",
     diff="M")

r_ = math.sqrt(9)
assert ((r_ + 1) / (r_ - 1)) ** 2 == 4
intq("wop_intensity_ratio", "PHY.WOP",
     "Two coherent sources produce intensities in the ratio $9:1$ at a point of the screen when each acts alone. "
     "The ratio $I_{max}:I_{min}$ in the interference pattern is $n:1$. The value of $n$ is",
     4,
     "Amplitudes are in ratio $3:1$. $\\dfrac{I_{max}}{I_{min}}=\\dfrac{(a_1+a_2)^2}{(a_1-a_2)^2}=\\dfrac{4^2}{2^2}=4$.", diff="M")

nglass = math.sqrt(3)
Br = math.degrees(math.atan(nglass))
assert abs(Br - 60) < 1e-9
intq("wop_brewster", "PHY.WOP",
     "Unpolarised light is reflected from a glass surface of refractive index $\\sqrt3$. The angle of incidence (in degrees) at which the reflected "
     "light is completely plane polarised is",
     60,
     "Brewster's law: $\\tan\\theta_B=n=\\sqrt3\\Rightarrow\\theta_B=60^\\circ$.", diff="E")

Ifrac = 0.5 * math.cos(math.radians(60)) ** 2
assert abs(Ifrac - 1 / 8) < 1e-12
scq("wop_malus", "PHY.WOP",
    "Unpolarised light of intensity $I_0$ passes through two ideal polaroids whose pass axes make an angle of $60^\\circ$. The transmitted intensity is",
    "$\\dfrac{I_0}{8}$", ["$\\dfrac{I_0}{4}$", "$\\dfrac{I_0}{2}$", "$\\dfrac{3I_0}{8}$"],
    "First polaroid: $I_1=I_0/2$. Malus's law: $I_2=I_1\\cos^260^\\circ=\\dfrac{I_0}{2}\\times\\dfrac14=\\dfrac{I_0}{8}$.", diff="M")

mu, t_, d2, D2 = 1.5, 0.02e-3, 0.5e-3, 1.0
shift = (mu - 1) * t_ * D2 / d2
assert abs(shift - 0.02) < 1e-12
intq("wop_slab_shift", "PHY.WOP",
     "In a double-slit setup ($d=0.5\\ \\mathrm{mm}$, $D=1\\ \\mathrm{m}$) a thin transparent sheet of refractive index $1.5$ and thickness $0.02\\ \\mathrm{mm}$ "
     "is placed over one slit. The central fringe shifts by (in mm)",
     20,
     "Extra optical path $=(\\mu-1)t=0.5\\times0.02\\ \\mathrm{mm}=0.01\\ \\mathrm{mm}$. Shift $=\\dfrac{D}{d}(\\mu-1)t=\\dfrac{1}{0.5\\times10^{-3}}\\times10^{-5}=0.02\\ \\mathrm{m}=20\\ \\mathrm{mm}$ "
     "(towards the covered slit).", diff="H")

# ------------------------------------------------------------------ PHY.DUAL
hc = 1240  # eV nm
E_ph = hc / 200
Vs = E_ph - 4.2
assert abs(Vs - 2.0) < 1e-9
intq("dual_stopping", "PHY.DUAL",
     "Light of wavelength $200\\ \\mathrm{nm}$ falls on a metal of work function $4.2\\ \\mathrm{eV}$. Using $hc=1240\\ \\mathrm{eV\\,nm}$, the stopping potential in volt is",
     2,
     "$E=\\dfrac{hc}{\\lambda}=\\dfrac{1240}{200}=6.2\\ \\mathrm{eV}$. $eV_s=E-\\phi=6.2-4.2=2.0\\ \\mathrm{eV}\\Rightarrow V_s=2\\ \\mathrm{V}$.", diff="E")

h, me, e = 6.63e-34, 9.11e-31, 1.6e-19
lam_e = h / math.sqrt(2 * me * e * 150)
assert abs(lam_e * 1e10 - 1.0) < 0.01
scq("dual_debroglie", "PHY.DUAL",
    "An electron is accelerated from rest through $150\\ \\mathrm{V}$. Its de Broglie wavelength is approximately",
    "$1.0\\ \\mathrm{\\AA}$", ["$0.1\\ \\mathrm{\\AA}$", "$12\\ \\mathrm{\\AA}$", "$10\\ \\mathrm{\\AA}$"],
    "$\\lambda=\\dfrac{h}{\\sqrt{2meV}}=\\dfrac{12.27}{\\sqrt V}\\ \\mathrm{\\AA}=\\dfrac{12.27}{\\sqrt{150}}=1.0\\ \\mathrm{\\AA}$. "
    "Direct: $\\dfrac{6.63\\times10^{-34}}{\\sqrt{2\\times9.11\\times10^{-31}\\times1.6\\times10^{-19}\\times150}}=1.0\\times10^{-10}\\ \\mathrm{m}$.", diff="M")

lam_th = hc / 2.5
assert abs(lam_th - 496) < 0.1
nvq("dual_threshold", "PHY.DUAL",
    "The work function of a metal is $2.5\\ \\mathrm{eV}$. Using $hc=1240\\ \\mathrm{eV\\,nm}$, the threshold wavelength in nm is approximately",
    496, 2,
    "$\\lambda_0=\\dfrac{hc}{\\phi}=\\dfrac{1240}{2.5}=496\\ \\mathrm{nm}$.", diff="E")

Nph = 3.3e-3 * 600e-9 / (6.63e-34 * 3e8)
assert abs(Nph - 9.95e15) < 0.05e15
scq("dual_photons", "PHY.DUAL",
    "A source emits monochromatic light of wavelength $600\\ \\mathrm{nm}$ with a power of $3.3\\ \\mathrm{mW}$. The number of photons emitted per second is approximately "
    "($h=6.63\\times10^{-34}\\ \\mathrm{J\\,s}$, $c=3\\times10^8\\ \\mathrm{m/s}$)",
    sci(Nph, 2) if False else "$1.0\\times10^{16}$", ["$1.0\\times10^{13}$", "$2.0\\times10^{16}$", "$1.0\\times10^{19}$"],
    "Photon energy $=\\dfrac{hc}{\\lambda}=\\dfrac{1.989\\times10^{-25}}{6\\times10^{-7}}=3.32\\times10^{-19}\\ \\mathrm{J}$. "
    "$N=\\dfrac{P}{E}=\\dfrac{3.3\\times10^{-3}}{3.32\\times10^{-19}}\\approx1.0\\times10^{16}\\ \\mathrm{s^{-1}}$.", diff="M")

# ------------------------------------------------------------------ PHY.SEM
lam_max = 1240 / 1.1
assert abs(lam_max - 1127) < 1
nvq("sem_gap", "PHY.SEM",
    "The band gap of silicon is $1.1\\ \\mathrm{eV}$. The longest wavelength (in nm) of light that can create an electron-hole pair in it is approximately "
    "(use $hc=1240\\ \\mathrm{eV\\,nm}$)",
    1127, 5,
    "Need $\\dfrac{hc}{\\lambda}\\ge E_g\\Rightarrow\\lambda\\le\\dfrac{1240}{1.1}=1127\\ \\mathrm{nm}$ (infrared).", diff="M")

cnt = sum(1 for A, B, C in itertools.product((0, 1), repeat=3) if (not (A and B)) and (not (B or C)))
assert cnt == 2
intq("sem_logic", "PHY.SEM",
     "A logic circuit gives $Y=(A\\ \\mathrm{NAND}\\ B)\\ \\mathrm{AND}\\ (B\\ \\mathrm{NOR}\\ C)$. For how many of the $8$ possible input combinations of "
     "$A,B,C$ is $Y=1$?",
     2,
     "$B\\,\\mathrm{NOR}\\,C=1$ needs $B=C=0$. Then $A\\,\\mathrm{NAND}\\,B=1$ for either $A$ (since $B=0$). So $(A,B,C)=(0,0,0),(1,0,0)$: $2$ combinations.",
     diff="M", skills=("conceptual", "calculation"))

Id = (5 - 0.7) / 430 * 1000
assert abs(Id - 10) < 1e-9
intq("sem_diode", "PHY.SEM",
     "A silicon diode (forward drop $0.7\\ \\mathrm{V}$, otherwise ideal) is forward biased in series with a $430\\ \\Omega$ resistor and a $5\\ \\mathrm{V}$ battery. "
     "The current in mA is",
     10,
     "$I=\\dfrac{5-0.7}{430}=\\dfrac{4.3}{430}=0.010\\ \\mathrm{A}=10\\ \\mathrm{mA}$.", diff="E")

scq("sem_fullwave", "PHY.SEM",
    "A full-wave rectifier is fed from a $50\\ \\mathrm{Hz}$ AC supply. The fundamental frequency of the ripple in the output is",
    "$100\\ \\mathrm{Hz}$", ["$50\\ \\mathrm{Hz}$", "$25\\ \\mathrm{Hz}$", "$200\\ \\mathrm{Hz}$"],
    "A full-wave rectifier conducts on both half-cycles, so the output has two pulses per input cycle: ripple frequency $=2\\times50=100\\ \\mathrm{Hz}$ "
    "(a half-wave rectifier would give $50\\ \\mathrm{Hz}$).", diff="E", via="second-derivation")

beta, Rc, Rin = 60, 1.5e3, 0.5e3
Av = beta * Rc / Rin
assert Av == 180
scq("sem_gain", "PHY.SEM",
    "A common-emitter amplifier has current gain $\\beta=60$, input resistance $0.5\\ \\mathrm{k\\Omega}$ and collector load $1.5\\ \\mathrm{k\\Omega}$. "
    "Its voltage gain is",
    "$180$", ["$60$", "$20$", "$30$"],
    "$A_v=\\beta\\dfrac{R_L}{R_{in}}=60\\times\\dfrac{1.5}{0.5}=180$ (magnitude; the output is $180^\\circ$ out of phase with the input).", diff="M")

Iz = (12 - 6.8) / 200 * 1000 - 6.8 / 680 * 1000
assert abs(Iz - 16) < 1e-9
intq("sem_zener", "PHY.SEM",
     "A Zener diode of breakdown voltage $6.8\\ \\mathrm{V}$ is connected in parallel with a $680\\ \\Omega$ load and fed from a $12\\ \\mathrm{V}$ supply through a "
     "series resistor of $200\\ \\Omega$. The current through the Zener diode in mA is",
     16,
     "Current through the series resistor $=\\dfrac{12-6.8}{200}=26\\ \\mathrm{mA}$. Load current $=\\dfrac{6.8}{680}=10\\ \\mathrm{mA}$. "
     "$I_Z=26-10=16\\ \\mathrm{mA}$.", diff="M")

msq("sem_msq", "PHY.SEM",
    "Select all correct statements about semiconductors and $p$-$n$ junctions.",
    [("In pure silicon at room temperature the number of free electrons equals the number of holes.", True),
     ("An $n$-type semiconductor is electrically neutral even though its majority carriers are electrons.", True),
     ("The depletion layer becomes narrower under forward bias.", True),
     ("Under reverse bias a large current flows because of majority carriers.", False),
     ("The conductivity of an intrinsic semiconductor decreases as temperature rises.", False)],
    "A: each thermally generated electron leaves a hole. B: donor ions carry the compensating positive charge. C: forward bias pushes carriers towards the junction, "
    "shrinking the depletion region. D false: reverse bias widens the depletion layer and only a tiny minority-carrier current flows. "
    "E false: more carriers are excited across the gap at higher $T$, so conductivity rises (resistance falls).", diff="M", via="second-derivation")
