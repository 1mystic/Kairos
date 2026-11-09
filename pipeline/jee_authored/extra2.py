"""Third batch: extra items across chapters (physics, chemistry, maths), all recomputed in code."""
import itertools
import math
from fractions import Fraction as F

from . import fmt, intq, msq, nvq, scq, scqn

# ============================================================ Physics
H = (20 * math.sin(math.radians(30))) ** 2 / (2 * 10)
assert abs(H - 5) < 1e-9
intq("y_kin2d_height", "PHY.KIN2D",
     "A projectile is launched at $20\\ \\mathrm{m/s}$ at $30^\\circ$ above the horizontal ($g=10\\ \\mathrm{m/s^2}$). The maximum height reached, in metres, is",
     5,
     "$H=\\dfrac{u^2\\sin^2\\theta}{2g}=\\dfrac{400\\times0.25}{20}=5\\ \\mathrm{m}$. (Vertical component $10\\ \\mathrm{m/s}$: $H=10^2/20$.)", diff="E")

I_rod = 3 * 2 ** 2 / 3
assert I_rod == 4 == 3 * 2 ** 2 / 12 + 3 * 1 ** 2
intq("y_rot_rod", "PHY.ROT",
     "A uniform rod of mass $3\\ \\mathrm{kg}$ and length $2\\ \\mathrm{m}$ is rotated about an axis perpendicular to it through one end. Its moment of inertia in $\\mathrm{kg\\,m^2}$ is",
     4,
     "$I_{end}=\\dfrac{ML^2}{3}=\\dfrac{3\\times4}{3}=4$. Parallel-axis check: $\\dfrac{ML^2}{12}+M\\left(\\dfrac L2\\right)^2=1+3=4$.", diff="E")

a_roll = 10 * 0.5 / (1 + F(2, 5))
assert abs(float(a_roll) - 25 / 7) < 1e-12
nvq("y_rot_sphere", "PHY.ROT",
    "A solid sphere rolls without slipping down a $30^\\circ$ incline. Taking $g=10\\ \\mathrm{m/s^2}$, its acceleration down the incline in $\\mathrm{m/s^2}$ is approximately",
    3.57, 0.02,
    "$a=\\dfrac{g\\sin\\theta}{1+I/(mR^2)}=\\dfrac{10\\times0.5}{1+2/5}=\\dfrac{5}{1.4}=3.57\\ \\mathrm{m/s^2}$ (a sliding block would have $5\\ \\mathrm{m/s^2}$).", diff="M")

v_efflux = math.sqrt(2 * 10 * 5)
assert v_efflux == 10
intq("y_flu_torricelli", "PHY.FLU",
     "A small hole is made in the side of a tank filled with water, $5\\ \\mathrm{m}$ below the free surface (surface exposed to atmosphere, $g=10\\ \\mathrm{m/s^2}$). "
     "The speed of efflux of water in m/s is",
     10,
     "Bernoulli between surface and hole: $v=\\sqrt{2gh}=\\sqrt{2\\times10\\times5}=10\\ \\mathrm{m/s}$.", diff="E")

eta = 1 - 300 / 500
assert abs(eta - 0.4) < 1e-12
intq("y_thd_carnot", "PHY.THD",
     "A Carnot engine works between $500\\ \\mathrm{K}$ and $300\\ \\mathrm{K}$. Its efficiency in per cent is",
     40,
     "$\\eta=1-\\dfrac{T_2}{T_1}=1-\\dfrac{300}{500}=0.40=40\\%$.", diff="E")

T = 100.0
mu = 0.01
v_w = math.sqrt(T / mu)
f1 = v_w / (2 * 1.0)
assert v_w == 100 and f1 == 50
intq("y_wav_string", "PHY.WAV",
     "A string of length $1\\ \\mathrm{m}$ and linear density $0.01\\ \\mathrm{kg/m}$ is fixed at both ends under a tension of $100\\ \\mathrm{N}$. The fundamental frequency in Hz is",
     50,
     "$v=\\sqrt{T/\\mu}=\\sqrt{10^4}=100\\ \\mathrm{m/s}$. Fundamental: $\\lambda=2L=2\\ \\mathrm{m}$, $f=\\dfrac v\\lambda=50\\ \\mathrm{Hz}$.", diff="M")

Tf = (50 * 80 + 100 * 20) / 150
assert Tf == 40
intq("y_thp_mix", "PHY.THP",
     "$50\\ \\mathrm{g}$ of water at $80^\\circ\\mathrm{C}$ is mixed with $100\\ \\mathrm{g}$ of water at $20^\\circ\\mathrm{C}$ in an insulated container. The final temperature in $^\\circ\\mathrm{C}$ is",
     40,
     "Heat lost $=$ heat gained: $50(80-T)=100(T-20)\\Rightarrow4000-50T=100T-2000\\Rightarrow T=40^\\circ\\mathrm{C}$.", diff="E")

# ============================================================ Chemistry
V = 10 / 100 * 22.4
assert abs(V - 2.24) < 1e-12
nvq("y_mole_caco3", "CHE.MOLE",
    "$10\\ \\mathrm{g}$ of pure $\\ce{CaCO3}$ ($M=100\\ \\mathrm{g/mol}$) is decomposed completely: $\\ce{CaCO3 -> CaO + CO2}$. The volume of $\\ce{CO2}$ at STP (molar volume $22.4\\ \\mathrm{L}$) in litres is",
    2.24, 0.01,
    "$n(\\ce{CaCO3})=\\dfrac{10}{100}=0.1$ mol gives $0.1$ mol $\\ce{CO2}$: $V=0.1\\times22.4=2.24\\ \\mathrm{L}$.", diff="E")

m_ = 18 / 180 / 0.5
dTb = 0.52 * m_
assert abs(m_ - 0.2) < 1e-12 and abs(dTb - 0.104) < 1e-12
nvq("y_soln_bp", "CHE.SOLN",
    "$18\\ \\mathrm{g}$ of glucose ($M=180$) is dissolved in $500\\ \\mathrm{g}$ of water ($K_b=0.52\\ \\mathrm{K\\,kg\\,mol^{-1}}$). The elevation in boiling point in kelvin is",
    0.104, 0.002,
    "$m=\\dfrac{0.1\\ \\mathrm{mol}}{0.5\\ \\mathrm{kg}}=0.2\\ \\mathrm{mol/kg}$; glucose does not dissociate ($i=1$). $\\Delta T_b=K_bm=0.52\\times0.2=0.104\\ \\mathrm{K}$.", diff="M")

Q = 2 * 965
mCu = Q / 96500 / 2 * 63.5
assert abs(mCu - 0.635) < 1e-12
nvq("y_elec_faraday", "CHE.ELEC",
    "A current of $2\\ \\mathrm{A}$ is passed for $965\\ \\mathrm{s}$ through aqueous $\\ce{CuSO4}$. The mass of copper deposited in grams is ($F=96500\\ \\mathrm{C/mol}$, $\\mathrm{Cu}=63.5$)",
    0.635, 0.005,
    "$Q=It=1930\\ \\mathrm{C}$; moles of electrons $=\\dfrac{1930}{96500}=0.02$. $\\ce{Cu^{2+} + 2e- -> Cu}$: $0.01$ mol Cu $=0.01\\times63.5=0.635\\ \\mathrm{g}$.", diff="M")

Tmin = 40000 / 100
assert Tmin == 400
nvq("y_thermo_gibbs", "CHE.THERMO",
    "For a reaction $\\Delta H=+40\\ \\mathrm{kJ\\,mol^{-1}}$ and $\\Delta S=+100\\ \\mathrm{J\\,K^{-1}mol^{-1}}$ (both temperature independent). The reaction becomes spontaneous above a temperature (in K) of",
    400, 1,
    "$\\Delta G=\\Delta H-T\\Delta S<0\\Rightarrow T>\\dfrac{\\Delta H}{\\Delta S}=\\dfrac{40000}{100}=400\\ \\mathrm{K}$ (convert kJ to J).", diff="M")

H_ = math.sqrt(1.8e-5 * 0.1)
pH = -math.log10(H_)
assert abs(pH - 2.87) < 0.005
nvq("y_ioneq_ph", "CHE.IONEQ",
    "The pH of $0.10\\ \\mathrm M$ acetic acid ($K_a=1.8\\times10^{-5}$) is approximately",
    2.87, 0.02,
    "Weak acid: $[\\ce{H+}]=\\sqrt{K_aC}=\\sqrt{1.8\\times10^{-6}}=1.34\\times10^{-3}\\ \\mathrm M$ ($\\alpha\\approx1.3\\%$, so the approximation holds). $\\mathrm{pH}=-\\log(1.34\\times10^{-3})=2.87$.", diff="M")

x_cr = 12 / 2
assert x_cr == 6 and 2 * 1 + 2 * 6 - 7 * 2 == 0
intq("y_redox_cr", "CHE.REDOX",
     "The oxidation state of chromium in $\\ce{K2Cr2O7}$ is",
     6,
     "$2(+1)+2x+7(-2)=0\\Rightarrow2x=12\\Rightarrow x=+6$.", diff="E")

# ============================================================ Maths
tosses = list(itertools.product("HT", repeat=4))
p2 = F(sum(1 for t in tosses if t.count("H") == 2), 16)
assert p2 == F(3, 8)
scq("y_prob_binom", "MAT.PROB",
    "A fair coin is tossed $4$ times. The probability of getting exactly $2$ heads is",
    "$\\dfrac38$", ["$\\dfrac14$", "$\\dfrac12$", "$\\dfrac{5}{16}$"],
    "$\\binom42\\left(\\tfrac12\\right)^4=\\dfrac{6}{16}=\\dfrac38$ ($6$ of the $16$ equally likely outcomes).", diff="M")

p8 = F(sum(1 for a, b in itertools.product(range(1, 7), repeat=2) if a + b == 8), 36)
assert p8 == F(5, 36)
scq("y_prob_dice", "MAT.PROB",
    "Two fair dice are thrown. The probability that the sum of the numbers is $8$ is",
    "$\\dfrac{5}{36}$", ["$\\dfrac16$", "$\\dfrac{1}{9}$", "$\\dfrac{7}{36}$"],
    "Favourable: $(2,6),(3,5),(4,4),(5,3),(6,2)$ $=5$ out of $36$.", diff="E")

pb = F(1, 2) * F(3, 5) / (F(1, 2) * F(3, 5) + F(1, 2) * F(2, 5))
assert pb == F(3, 5)
scq("y_prob2_bayes", "MAT.PROB2",
    "Bag 1 has $3$ red and $2$ blue balls; bag 2 has $2$ red and $3$ blue balls. A bag is chosen at random and a ball drawn from it is red. The probability that it came from bag 1 is",
    "$\\dfrac35$", ["$\\dfrac12$", "$\\dfrac{3}{10}$", "$\\dfrac25$"],
    "Bayes: $P(B_1|R)=\\dfrac{\\frac12\\cdot\\frac35}{\\frac12\\cdot\\frac35+\\frac12\\cdot\\frac25}=\\dfrac{3/10}{1/2}=\\dfrac35$.", diff="M")

ways = math.comb(5, 2) * math.comb(4, 2)
assert ways == 60
intq("y_pnc_committee", "MAT.PNC",
     "A committee of $2$ men and $2$ women is to be formed from $5$ men and $4$ women. The number of ways is",
     60,
     "$\\binom52\\binom42=10\\times6=60$.", diff="E")

n_term = [n for n in range(1, 100) if 3 + 4 * (n - 1) == 99]
assert n_term == [25]
intq("y_seq_ap", "MAT.SEQ",
     "In the arithmetic progression $3,7,11,\\dots$ the term equal to $99$ is the $n^{th}$ term. The value of $n$ is",
     25,
     "$a_n=3+(n-1)4=99\\Rightarrow n-1=24\\Rightarrow n=25$.", diff="E")

Mx = [[2, 1, 3], [0, 4, 1], [1, 2, 5]]
def det3(M):
    return (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0])
            + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]))
def det_perm(M):
    t = 0
    for p in itertools.permutations(range(3)):
        s = 1
        for i in range(3):
            for j in range(i + 1, 3):
                if p[i] > p[j]:
                    s = -s
        t += s * M[0][p[0]] * M[1][p[1]] * M[2][p[2]]
    return t
assert det3(Mx) == det_perm(Mx) == 25
intq("y_det3", "MAT.DET",
     "The value of the determinant $\\begin{vmatrix}2&1&3\\\\0&4&1\\\\1&2&5\\end{vmatrix}$ is",
     25,
     "Expand along the first row: $2(20-2)-1(0-1)+3(0-4)=36+1-12=25$.", diff="M")

a, b = (1, 2, 3), (2, -1, 1)
cr = (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
assert cr == (5, 5, -5) and sum(x * y for x, y in zip(cr, a)) == 0 == sum(x * y for x, y in zip(cr, b))
scq("y_vec_area", "MAT.VEC",
    "The area of the parallelogram with adjacent sides $\\vec a=\\hat i+2\\hat j+3\\hat k$ and $\\vec b=2\\hat i-\\hat j+\\hat k$ is",
    "$5\\sqrt3$", ["$5$", "$\\sqrt{75}\\,/\\,2$", "$3\\sqrt5$"],
    "$\\vec a\\times\\vec b=(2\\cdot1-3\\cdot(-1))\\hat i-(1\\cdot1-3\\cdot2)\\hat j+(1\\cdot(-1)-2\\cdot2)\\hat k=5\\hat i+5\\hat j-5\\hat k$. "
    "Area $=|\\vec a\\times\\vec b|=\\sqrt{75}=5\\sqrt3$ (the triangle would have half of this).", diff="M")

lr = 2 * 9 / 5
assert lr == 3.6
nvq("y_conic_lr", "MAT.CONIC",
    "The length of the latus rectum of the ellipse $\\dfrac{x^2}{25}+\\dfrac{y^2}{9}=1$ is",
    3.6, 0.01,
    "$a^2=25$, $b^2=9$: $\\ell=\\dfrac{2b^2}{a}=\\dfrac{18}{5}=3.6$.", diff="M")

lim = (1 - math.cos(4 * 1e-4)) / (1e-4) ** 2
assert abs(lim - 8) < 1e-3
intq("y_lim_cos", "MAT.LIM",
     "$\\displaystyle\\lim_{x\\to0}\\dfrac{1-\\cos4x}{x^2}$ equals",
     8,
     "$1-\\cos4x=2\\sin^22x$, so the limit is $2\\cdot\\left(\\dfrac{\\sin2x}{x}\\right)^2\\to2\\times2^2=8$.", diff="M")

n = 200000
I = sum(((i + .5) / n) * (1 - (i + .5) / n) ** 3 for i in range(n)) / n
assert abs(I - 1 / 20) < 1e-9
scq("y_intg_beta", "MAT.INTG",
    "The value of $\\displaystyle\\int_0^1x(1-x)^3\\,dx$ is",
    "$\\dfrac1{20}$", ["$\\dfrac1{12}$", "$\\dfrac14$", "$\\dfrac1{30}$"],
    "Substitute $t=1-x$: $\\int_0^1(1-t)t^3dt=\\dfrac14-\\dfrac15=\\dfrac1{20}$.", diff="M")

fm = max(x ** 3 - 12 * x for x in [i / 1000 for i in range(-3000, 3001)])
assert abs(fm - 16) < 1e-6
intq("y_aod_max", "MAT.AOD",
     "The maximum value of $f(x)=x^3-12x$ on the interval $[-3,3]$ is",
     16,
     "$f'(x)=3x^2-12=0\\Rightarrow x=\\pm2$. $f(-2)=-8+24=16$, $f(2)=-16$, endpoints $f(-3)=9$, $f(3)=-9$. The maximum is $16$.", diff="M")

val = math.sin(math.radians(15)) * math.cos(math.radians(15))
assert abs(val - 0.25) < 1e-12
scq("y_trig_15", "MAT.TRIG",
    "The value of $\\sin15^\\circ\\cos15^\\circ$ is",
    "$\\dfrac14$", ["$\\dfrac12$", "$\\dfrac{\\sqrt3}{4}$", "$\\dfrac{\\sqrt3-1}{4}$"],
    "$\\sin A\\cos A=\\tfrac12\\sin2A=\\tfrac12\\sin30^\\circ=\\dfrac14$.", diff="E")

z = complex(1, math.sqrt(3)) ** 6
assert abs(z - 64) < 1e-9
intq("y_cplx_power", "MAT.CPLX",
     "The value of $\\left(1+i\\sqrt3\\right)^6$ is",
     64,
     "$1+i\\sqrt3=2\\left(\\cos\\dfrac\\pi3+i\\sin\\dfrac\\pi3\\right)$. By De Moivre $z^6=2^6(\\cos2\\pi+i\\sin2\\pi)=64$.", diff="M")
