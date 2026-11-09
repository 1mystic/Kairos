"""PHY gap chapters (NCERT-level, text only): Magnetism and Matter, Wave Optics, Semiconductors, EM Waves."""
import math

from . import AR, CODE, M, N, S

# ------------------------------------------------------------------ PHY.MAGM
c = "PHY.MAGM"
S(c, "E", "Outside a bar magnet, the magnetic field lines",
  "emerge from the north pole and enter at the south pole, forming closed loops with the lines inside", ["start and end on the same pole", "never form closed loops", "begin at the south pole and end at the north pole outside the magnet"],
  "Magnetic field lines are continuous closed curves: outside the magnet they run from N to S and inside from S to N.")
S(c, "E", "Gauss's law for magnetism states that the net magnetic flux through any closed surface is zero. This implies that",
  "isolated magnetic monopoles do not exist", ["magnetic fields are always uniform", "magnets have no poles", "electric charges do not exist"],
  "Every field line that enters a closed surface also leaves it, because magnetic poles occur only in N-S pairs.")
m = 10 * 0.5 * 0.02
assert abs(m - 0.1) < 1e-12
N(c, "E", "A circular coil of 10 turns, each of area $0.02\\ \\mathrm{m^2}$, carries a current of $0.5$ A. Its magnetic dipole moment (in $\\mathrm{A\\,m^2}$) is ______.", 0.1,
  "$m=NIA=10\\times0.5\\times0.02=0.1\\ \\mathrm{A\\,m^2}$.", tol=0.0001)
tau = 0.1 * 0.5 * math.sin(math.radians(30))
assert abs(tau - 0.025) < 1e-12
N(c, "M", "A magnetic dipole of moment $0.1\\ \\mathrm{A\\,m^2}$ is placed at $30^\\circ$ to a uniform field of $0.5$ T. The torque on it (in N m) is ______.", 0.025,
  "$\\tau=mB\\sin\\theta=0.1\\times0.5\\times\\sin30^\\circ=0.025$ N m.", tol=0.0001)
S(c, "E", "The dip angle at the magnetic equator is",
  "zero", ["$90^\\circ$", "$45^\\circ$", "$180^\\circ$"],
  "At the magnetic equator the field is horizontal, so the angle of dip is $0^\\circ$; at the magnetic poles it is $90^\\circ$.")
S(c, "E", "A diamagnetic substance placed in a non-uniform magnetic field is",
  "weakly repelled, and has a negative susceptibility", ["strongly attracted", "weakly attracted", "unaffected"],
  "Diamagnetic materials (bismuth, copper, water) develop a magnetisation opposite to the applied field, so $\\chi<0$ and they move toward weaker field regions.")
S(c, "E", "Which of the following is a ferromagnetic material?",
  "iron", ["aluminium", "copper", "bismuth"],
  "Iron, cobalt, nickel and their alloys are ferromagnetic, having domains; aluminium is paramagnetic, copper and bismuth are diamagnetic.")
chi1, T1, T2 = 6e-4, 300, 600
chi2 = chi1 * T1 / T2
assert abs(chi2 - 3e-4) < 1e-12
N(c, "M", "The susceptibility of a paramagnetic sample is $6\\times10^{-4}$ at 300 K. By Curie's law, its susceptibility at 600 K, in units of $10^{-4}$, is ______.", 3,
  "$\\chi\\propto1/T$, so $\\chi_2=6\\times10^{-4}\\times300/600=3\\times10^{-4}$.", tol=0.001)
chi = 599
assert 1 + chi == 600
N(c, "M", "A material has susceptibility $\\chi=599$. Its relative permeability $\\mu_r=1+\\chi$ is ______.", 600,
  "$\\mu_r=1+599=600$.", integer=True)
S(c, "M", "Soft iron is used for the core of electromagnets and transformers because it has",
  "low coercivity and low retentivity, so its hysteresis loop is narrow", ["high coercivity and high retentivity", "zero permeability", "a very wide hysteresis loop"],
  "A small area of the hysteresis loop means low energy loss per cycle and easy magnetisation and demagnetisation; permanent magnets need high retentivity and coercivity.")
S(c, "M", "Above its Curie temperature, a ferromagnetic material",
  "behaves like a paramagnetic material", ["becomes diamagnetic", "becomes a superconductor", "becomes a stronger magnet"],
  "Thermal agitation destroys the domain alignment, so the material is only paramagnetic above the Curie temperature.")
Bax = 1e-7 * 2 * 1.0 / 0.1 ** 3
assert abs(Bax - 2e-4) < 1e-12
N(c, "H", "A short bar magnet of dipole moment $1\\ \\mathrm{A\\,m^2}$ lies along the axis through the point at 0.1 m from its centre. The magnetic field at that axial point, in $\\mu$T, is (use $\\mu_0/4\\pi=10^{-7}\\ \\mathrm{T\\,m/A}$) ______.", 200,
  "$B_{axial}=\\frac{\\mu_0}{4\\pi}\\frac{2m}{r^3}=10^{-7}\\times2/10^{-3}=2\\times10^{-4}$ T $=200\\ \\mu$T.", tol=0.5)
S(c, "M", "At the same distance from a short bar magnet, the ratio of the magnetic field on the axial line to that on the equatorial line is",
  "2 : 1", ["1 : 2", "1 : 1", "4 : 1"],
  "$B_{axial}=\\frac{\\mu_0}{4\\pi}\\frac{2m}{r^3}$ and $B_{eq}=\\frac{\\mu_0}{4\\pi}\\frac{m}{r^3}$, so the ratio is $2:1$.")

# ------------------------------------------------------------------ PHY.WOP
c = "PHY.WOP"
S(c, "E", "According to Huygens' principle, every point on a wavefront",
  "acts as a source of secondary wavelets that spread forward, and their envelope gives the new wavefront", ["absorbs all the incident light", "acts as a source only in the backward direction", "produces no light at all"],
  "Huygens' construction explains reflection, refraction and diffraction by treating each wavefront point as a secondary source.")
S(c, "E", "Two sources produce sustained, observable interference only if they are",
  "coherent, i.e. have a constant phase difference", ["of different frequencies", "of random phase", "very bright"],
  "Coherence ensures that the interference pattern remains stable in time.")
lam, D, d = 600e-9, 1.5, 0.3e-3
beta = lam * D / d
assert abs(beta - 3e-3) < 1e-12
N(c, "M", "In Young's double-slit experiment, $\\lambda=600$ nm, slit separation $d=0.3$ mm and screen distance $D=1.5$ m. The fringe width in mm is ______.", 3,
  "$\\beta=\\lambda D/d=600\\times10^{-9}\\times1.5/(0.3\\times10^{-3})=3\\times10^{-3}$ m $=3$ mm.", tol=0.001)
nw = 4 / 3
beta_w = 2.4 / nw
assert abs(beta_w - 1.8) < 1e-12
N(c, "M", "A Young's double-slit setup gives a fringe width of 2.4 mm in air. When the whole apparatus is immersed in water ($n=4/3$) the fringe width in mm becomes ______.", 1.8,
  "Wavelength in water $\\lambda/n$, so $\\beta'=\\beta/n=2.4\\times3/4=1.8$ mm.", tol=0.001)
I_ratio = 4 * math.cos(math.pi / 4) ** 2
assert abs(I_ratio - 2) < 1e-9
N(c, "M", "Two coherent sources of equal intensity $I_0$ interfere. At a point where the phase difference is $90^\\circ$, the resultant intensity is $4I_0\\cos^2(\\phi/2)$, i.e. a multiple of $I_0$ equal to ______.", 2,
  "$I=4I_0\\cos^2(45^\\circ)=4I_0\\times\\frac12=2I_0$.", tol=0.001)
S(c, "E", "In Young's experiment with two equally intense slits, the intensity at a point of destructive interference is",
  "zero", ["$I_0$", "$2I_0$", "$4I_0$"],
  "For a path difference of an odd multiple of $\\lambda/2$ the two waves cancel completely, so the intensity is zero; at maxima it is $4I_0$.")
lam, a, D = 500e-9, 0.1e-3, 1.0
w = 2 * lam * D / a
assert abs(w - 1e-2) < 1e-12
N(c, "M", "In single-slit diffraction with $\\lambda=500$ nm, slit width $a=0.1$ mm and screen distance 1 m, the width of the central maximum is $2\\lambda D/a$, which in mm is ______.", 10,
  "$2\\times500\\times10^{-9}\\times1/(10^{-4})=10^{-2}$ m $=10$ mm.", tol=0.01)
n = math.sqrt(3)
ib = math.degrees(math.atan(n))
assert abs(ib - 60) < 1e-9
N(c, "M", "Light is totally plane-polarised on reflection from a glass surface of refractive index $\\sqrt3$. The angle of incidence in degrees is ______.", 60,
  "Brewster's law: $\\tan i_B=n=\\sqrt3$, so $i_B=60^\\circ$.", tol=0.01)
frac = 0.5 * math.cos(math.radians(60)) ** 2
assert abs(frac - 0.125) < 1e-12
N(c, "H", "Unpolarised light of intensity $I_0$ passes through a polariser and then an analyser whose axis is at $60^\\circ$ to the polariser. The transmitted intensity as a fraction of $I_0$ is ______.", 0.125,
  "After the polariser $I_0/2$; Malus's law gives $\\frac{I_0}{2}\\cos^2 60^\\circ=\\frac{I_0}{2}\\times\\frac14=\\frac{I_0}{8}$.", tol=0.0005)
S(c, "M", "The phenomenon of polarisation shows that light waves are",
  "transverse", ["longitudinal", "stationary", "scalar"],
  "Only transverse waves can be polarised, as the vibration direction can be restricted to a plane perpendicular to propagation.")
S(c, "H", "The first minimum in single-slit diffraction occurs at an angle given by $a\\sin\\theta=\\lambda$. For a slit of width $a=2\\lambda$, the angle $\\theta$ is",
  "$30^\\circ$", ["$60^\\circ$", "$90^\\circ$", "$45^\\circ$"],
  "$\\sin\\theta=\\lambda/a=1/2$, so $\\theta=30^\\circ$.", via=CODE)
assert abs(math.degrees(math.asin(0.5)) - 30) < 1e-9

# ------------------------------------------------------------------ PHY.SEM
c = "PHY.SEM"
S(c, "E", "When silicon is doped with a small amount of boron, it becomes",
  "p-type, with holes as majority carriers", ["n-type, with electrons as majority carriers", "an insulator", "a superconductor"],
  "Boron is trivalent; each boron atom creates a hole. Pentavalent dopants (P, As, Sb) give n-type material.")
S(c, "E", "In an intrinsic semiconductor at room temperature, the number of electrons in the conduction band is",
  "equal to the number of holes in the valence band", ["greater than the number of holes", "zero", "less than the number of holes"],
  "Each electron promoted to the conduction band leaves behind a hole, so $n_e=n_h=n_i$.")
S(c, "E", "The energy gap between the valence and conduction bands of a typical semiconductor is",
  "less than about 3 eV", ["more than 6 eV", "zero", "exactly 10 eV"],
  "Insulators have a large gap (above about 3 eV), conductors have overlapping bands or no gap, and semiconductors have a smaller gap (Si about 1.1 eV).")
S(c, "E", "The electrical resistivity of a pure semiconductor, as its temperature rises,",
  "decreases", ["increases", "remains constant", "becomes infinite"],
  "More electron-hole pairs are generated with temperature, which dominates over increased scattering.")
S(c, "M", "When a p-n junction diode is forward biased, the width of the depletion region",
  "decreases", ["increases", "remains the same", "becomes infinite"],
  "The applied voltage opposes the barrier potential, narrowing the depletion layer and allowing majority carriers to cross.")
f_out = 2 * 50
assert f_out == 100
N(c, "M", "A full-wave rectifier is supplied by an a.c. of frequency 50 Hz. The frequency (Hz) of the ripple in the output is ______.", f_out,
  "A full-wave rectifier produces two output pulses per input cycle, so the output frequency is $2\\times50=100$ Hz (a half-wave rectifier gives 50 Hz).", integer=True)
S(c, "E", "A Zener diode is used as a",
  "voltage regulator, operating in reverse breakdown", ["half-wave rectifier only", "light source", "amplifier"],
  "In the breakdown region, the voltage across the Zener diode is nearly constant despite changes in current.")
S(c, "M", "A photodiode is operated in",
  "reverse bias, where the photo-generated carriers change the reverse current", ["forward bias to emit light", "an unbiased state only", "the breakdown region only"],
  "Photodiodes are reverse-biased; the fractional change in the reverse current is easily measurable when light of energy above the band gap falls on the junction. LEDs are forward biased.")
def NAND(a, b):
    return int(not (a and b))
assert NAND(1, 1) == 0
S(c, "E", "The output of a two-input NAND gate when both inputs are 1 is",
  "0", ["1", "undefined", "equal to the input in volts"],
  "NAND is AND followed by NOT: $\\overline{1\\cdot1}=0$.", via=CODE)
def NOR(a, b):
    return int(not (a or b))
assert [NOR(0, 0), NOR(0, 1), NOR(1, 0), NOR(1, 1)] == [1, 0, 0, 0]
S(c, "M", "A NOR gate gives output 1 for which combination of inputs (A, B)?",
  "A = 0, B = 0 only", ["A = 0, B = 1 only", "A = 1, B = 0 only", "any combination with at least one input 1"],
  "$Y=\\overline{A+B}$ equals 1 only when both $A$ and $B$ are 0.", via=CODE)
IB, beta_t = 20e-6, 50
IC = beta_t * IB
IE = IC + IB
assert abs(IC - 1e-3) < 1e-12 and abs(IE - 1.02e-3) < 1e-12
N(c, "M", "A transistor has base current 20 $\\mu$A and current gain $\\beta=I_C/I_B=50$. The emitter current in mA is ______.", 1.02,
  "$I_C=50\\times20\\ \\mu\\mathrm{A}=1$ mA and $I_E=I_C+I_B=1.02$ mA.", tol=0.001)
S(c, "M", "In a common-emitter amplifier, the output voltage is out of phase with the input voltage by",
  "$180^\\circ$", ["$0^\\circ$", "$90^\\circ$", "$45^\\circ$"],
  "In the CE configuration an increase in base current raises the collector current and the voltage drop across $R_C$, reducing the collector voltage, hence phase reversal.")
ni, ne = 1e16, 1e22
nh = ni ** 2 / ne
assert abs(nh - 1e10) < 1
N(c, "H", "In a doped semiconductor, $n_en_h=n_i^2$. If $n_i=10^{16}\\ \\mathrm{m^{-3}}$ and $n_e=10^{22}\\ \\mathrm{m^{-3}}$, the hole concentration in units of $10^{10}\\ \\mathrm{m^{-3}}$ is ______.", 1,
  "$n_h=n_i^2/n_e=10^{32}/10^{22}=10^{10}\\ \\mathrm{m^{-3}}$, i.e. 1 in these units.", tol=0.001)

# ------------------------------------------------------------------ PHY.EMW
c = "PHY.EMW"
S(c, "E", "Which of the following electromagnetic radiations has the highest frequency?",
  "gamma rays", ["microwaves", "infrared", "ultraviolet"],
  "In increasing frequency: radio waves, microwaves, infrared, visible, ultraviolet, X-rays, gamma rays.")
c_val = 1 / math.sqrt(4e-7 * math.pi * 8.854e-12)
assert abs(c_val - 3e8) / 3e8 < 0.005
N(c, "E", "From $c=1/\\sqrt{\\mu_0\\varepsilon_0}$ with $\\mu_0=4\\pi\\times10^{-7}$ and $\\varepsilon_0=8.85\\times10^{-12}$ (SI), the speed of EM waves in vacuum, in units of $10^8$ m/s (to 1 decimal), is ______.", 3.0,
  "$c=1/\\sqrt{4\\pi\\times10^{-7}\\times8.85\\times10^{-12}}\\approx3.0\\times10^8$ m/s.", tol=0.05)
lam = 3e8 / 100e6
assert lam == 3
N(c, "E", "The wavelength in metres of an EM wave of frequency 100 MHz in vacuum ($c=3\\times10^8$ m/s) is ______.", 3,
  "$\\lambda=c/f=3\\times10^8/10^8=3$ m.", tol=0.001)
B0 = 60 / 3e8
assert abs(B0 - 2e-7) < 1e-15
N(c, "M", "In a plane EM wave in vacuum $E_0/B_0=c$. If $E_0=60$ V/m, the amplitude $B_0$ in nT is ______.", 200,
  "$B_0=60/(3\\times10^8)=2\\times10^{-7}$ T $=200$ nT.", tol=0.5)
S(c, "E", "In an electromagnetic wave, the electric field and magnetic field vectors are",
  "perpendicular to each other and to the direction of propagation", ["parallel to each other", "parallel to the direction of propagation", "always out of phase by $90^\\circ$"],
  "EM waves are transverse: $\\vec E$, $\\vec B$ and the propagation direction are mutually perpendicular, and $\\vec E$ and $\\vec B$ oscillate in phase.")
S(c, "M", "Displacement current, introduced by Maxwell, is produced by",
  "a time-varying electric flux (changing electric field)", ["moving charges only", "a steady magnetic field", "a static charge"],
  "$I_d=\\varepsilon_0\\,\\mathrm d\\Phi_E/\\mathrm dt$; it makes Ampere's law consistent for a charging capacitor and predicts EM waves.")
S(c, "E", "The greenhouse effect is mainly due to the absorption and re-emission of which radiation by atmospheric gases?",
  "infrared radiation", ["X-rays", "gamma rays", "radio waves"],
  "Earth's surface re-radiates absorbed solar energy as infrared; greenhouse gases trap part of it.")
