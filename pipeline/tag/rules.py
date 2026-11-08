"""Keyword/rule chapter classifier.

``classify(subject, text)`` scores every chapter of ``subject`` (PHY/CHE/MAT) by summing the
weights of the regex patterns that match the lower-cased question text (stem + options).
Patterns are plain regexes (search); a ``(pattern, weight)`` tuple overrides the default weight 1.

A result is *confident* when the best score >= MIN_SCORE and it beats the runner-up by >= MARGIN.
Anything else is returned as ``None`` and must be settled by hand in ``manual_tags.json``
(qid -> chapter). Nothing is ever guessed.
"""
from __future__ import annotations

import re

MIN_SCORE = 2
MARGIN = 2

W = lambda pat, w: (pat, w)  # noqa: E731

RULES: dict[str, dict[str, list]] = {
    "PHY": {
        "PHY.UNT": [W(r"dimension(al)? (formula|of)|dimensionless|dimensions of", 3), W(r"least count|vernier|screw gauge|significant figure|fractional error|percentage error|error in the measurement", 3)],
        "PHY.KIN1D": [W(r"straight line|rectilinear|uniform acceleration|deceleration|falls? freely|freely falling|dropped from", 2), r"velocity-time|displacement of a particle", r"\bretard"],
        "PHY.KIN2D": [W(r"projectile|angle of projection|horizontal range|maximum height|trajectory", 3), W(r"relative velocity|river|boat", 2), r"circular path|uniform circular|centripetal", r"\bvector"],
        "PHY.LOM": [W(r"friction|inclined plane|incline", 3), W(r"pulley|tension in the (string|rope)|string is massless|massless string", 2), r"coefficient of", r"newton'?s (second|third|first) law", r"\bblock\b", r"normal reaction|normal force|lift\b|elevator"],
        "PHY.WEP": [W(r"work done|kinetic energy|potential energy|\bpower\b|work-energy", 2), W(r"elastic collision|inelastic collision|collides|collision", 2), r"spring constant|compressed|\bspring\b", r"impulse|momentum", r"conservat"],
        "PHY.ROT": [W(r"moment of inertia|torque|angular momentum|angular velocity|angular acceleration", 3), W(r"rolling|rolls without|pure rolling|slipping", 3), W(r"rigid body|rigid rod|uniform rod|disc\b|disk\b|\bring\b|hollow sphere|solid sphere|solid cylinder|center of mass|centre of mass", 2), r"pivot|hinge|axis of rotation|\\omega"],
        "PHY.GRAV": [W(r"gravitation|gravitational|escape velocity|escape speed|orbital|satellite|kepler|planet|orbit of", 3), r"acceleration due to gravity|mass of the (earth|moon|sun)"],
        "PHY.SOL": [W(r"young'?s modulus|bulk modulus|shear modulus|modulus of rigidity|stress|strain|elastic limit|elongation|poisson'?s ratio", 3), r"wire is stretched|breaking"],
        "PHY.FLU": [W(r"viscos|surface tension|bernoulli|buoyan|capillar|terminal velocity|stokes|streamline|laminar", 3), W(r"fluid|liquid|water in a|density of the liquid|manometer|barometer|hydrostatic", 2), r"soap bubble|\bbubble|\bdrop\b|droplet|\bpressure\b|float|immersed|submerged"],
        "PHY.THP": [W(r"calorimeter|specific heat|latent heat|thermal conductivity|thermal expansion|coefficient of (linear|volume|areal) expansion|newton'?s law of cooling|heat conduction|rate of heat|stefan|black ?body|wien|emissivity|thermal radiation|\bradiat", 3), W(r"temperature of the (rod|body|sphere)|heat (is )?(supplied|transferred|flow)", 2), r"melting|ice at|steam|cooling"],
        "PHY.THD": [W(r"adiabatic|isothermal|isobaric|isochoric|isochoric|first law of thermodynamics|carnot|heat engine|refrigerator|entropy|efficiency of", 3), W(r"p-v|pv diagram|\bcycle\b|work done by the gas|ideal gas|molar heat capacity|heat capacity|c_\{?p|c_\{?v|\\gamma|quasi-?static", 2), r"internal energy|expands? (reversibly|isothermally|adiabatically)|piston|cylinder"],
        "PHY.KTG": [W(r"rms speed|root mean square speed|mean free path|degrees? of freedom|kinetic theory|equipartition|maxwell", 4), W(r"molecules of (a |an |the )?(ideal )?gas|average (kinetic )?energy of|diatomic|monatomic|mean speed|number density|avogadro", 2)],
        "PHY.OSC": [W(r"simple harmonic|\bshm\b|oscillat|simple pendulum|physical pendulum|torsional pendulum|time period of (the )?(small )?(oscill|motion)|amplitude of", 3), r"spring-mass|angular frequency|restoring"],
        "PHY.WAV": [W(r"sound|standing wave|stationary wave|travelling wave|transverse wave|longitudinal wave|organ pipe|resonan(ce|t) (tube|column|air)|beats|doppler|tuning fork|vibrating string|harmonic|overtone|node|antinode|wavelength of the (wave|sound)|speed of (the )?(wave|sound)|\bwave\b", 3), r"frequency", r"string"],
        "PHY.ELE": [W(r"electric field|coulomb|gauss'?s? law|electric flux|electric dipole|point charges?|charged (sphere|shell|ring|rod|disc|wire|particle)|charge density|linear charge|surface charge|volume charge|line of charge", 3), r"\bcharge\b|electrostatic force"],
        "PHY.CAP": [W(r"capacitor|capacitance|dielectric|electrostatic potential|electric potential|potential energy of (a )?(system|charge)|equipotential|potential difference between (two )?plates", 3), r"parallel plate|plates"],
        "PHY.CUR": [W(r"resistor|resistivity|ohm|potentiometer|wheatstone|kirchhoff|internal resistance|\bemf\b|battery|galvanometer|ammeter|voltmeter|drift velocity|conductivity of the wire|resistance of", 3), r"\bcurrent\b|circuit|voltage|\bwire\b|filament|bulb"],
        "PHY.MAG": [W(r"magnetic field|lorentz|cyclotron|solenoid|biot|ampere'?s|current[- ]carrying|magnetic force|moving charge|torque on (a )?(current )?loop|helical|mass spectrometer|velocity selector", 3), r"\bmagnetic\b|proton .*(field)|deflect"],
        "PHY.MAGM": [W(r"magnetic moment of (a )?(bar|magnet|atom)|bar magnet|diamagnet|paramagnet|ferromagnet|susceptibility|permeability|hysteresis|earth'?s magnetic|magnetic dipole|retentivity|coercivity|curie", 4)],
        "PHY.EMI": [W(r"induced (emf|current)|faraday|lenz|self[- ]inductance|mutual inductance|inductance|\binductor\b|eddy|motional emf|electromagnetic induction|flux linked|changing magnetic", 3), r"\bloop\b|rail"],
        "PHY.AC": [W(r"alternating|\ba\.?c\.? |lcr|impedance|reactance|power factor|rms (value|current|voltage)|phasor|transformer|series lcr|ac source|wattless|\bl-?c\b circuit|rlc", 3), r"resonan"],
        "PHY.EMW": [W(r"electromagnetic wave|poynting|radiation pressure|displacement current|em wave|electromagnetic radiation|plane wave|e_\{?0|b_\{?0", 4), r"intensity of (the )?(light|radiation|beam)|light beam|laser"],
        "PHY.ROP": [W(r"\blens\b|\blenses\b|mirror|focal length|refractive index|refraction|reflection|\bprism\b|total internal|critical angle|microscope|telescope|optical fib|concave|convex|\bray\b|rays|magnification|image distance|object distance|virtual image|real image", 3), r"incident|refract|angle of deviation|dispersion|\bglass\b|slab"],
        "PHY.WOP": [W(r"interference|diffraction|double[- ]slit|young'?s double|\bslit\b|polaris|brewster|coherent|fringe|path difference|huygens|single slit|thin film|newton'?s rings|grating|optical path|malus|resolving", 3), r"monochromatic|wavelength of light"],
        "PHY.DUAL": [W(r"photoelectric|work function|de broglie|de-broglie|stopping potential|photon|threshold (frequency|wavelength)|photocurrent|davisson|matter wave|cathode rays?|metal surface is (irradiated|illuminated)|photoemission|photoelectron", 4), r"emitted electron|incident light|electrons? (are )?accelerated"],
        "PHY.ATM": [W(r"bohr|hydrogen atom|hydrogen[- ]like|spectral line|rydberg|energy level|balmer|lyman|paschen|\bn ?= ?\d.*(orbit|state)|ground state|excited state|He\^\{?\+|li\^\{?2\+|series limit|atomic spectr|rutherford|alpha[- ]particle scattering|distance of closest approach|impact parameter", 3), r"orbit"],
        "PHY.NUC": [W(r"radioactiv|half[- ]life|decay|nuclear|nuclei|nucleus|binding energy|fission|fusion|mass defect|\\alpha|\\beta|activity of|mean life|disintegrat|isotope|neutron|atomic mass unit|\bamu\b|mev", 3), r"\bu\b.*mev|\\mathrm\{u\}"],
        "PHY.SEM": [W(r"semiconductor|diode|transistor|p-n|pn junction|logic gate|rectifier|zener|\bnand\b|\bnor\b|\band gate|\bor gate|\bnot gate|forward bias|reverse bias|depletion|band gap|doped|intrinsic|extrinsic", 4)],
    },
    "CHE": {
        "CHE.MOLE": [W(r"\bmoles? of\b|molar mass|molecular (mass|weight)|empirical formula|molecular formula|limiting reagent|stoichiometr|percent(age)? (composition|by mass|yield)|equivalent (weight|mass)|atomic (mass|weight)|number of atoms in|mass of .* (produced|obtained|formed)|avogadro|\bmole\b", 2), r"\bg\b.*\\mathrm\{~?g\}|mass percent|density"],
        "CHE.ATOM": [W(r"quantum number|\borbital\b|de broglie|bohr|heisenberg|uncertainty principle|aufbau|hund|pauli|electronic configuration|nodal|radial node|angular node|shell|subshell|\bphoton\b|wavelength of (the )?(electron|photon|radiation)|spectral|balmer|lyman|rydberg|hydrogen atom|hydrogen-like|ionization energy of (the )?hydrogen|spin quantum|number of (unpaired )?electrons|isotone|isobar|rutherford|\\psi", 3)],
        "CHE.PERIO": [W(r"ionization (enthalpy|energy|potential)|ionisation (enthalpy|energy)|electronegativity|atomic radius|atomic radii|ionic radius|ionic radii|electron gain|electron affinity|periodic (table|trend|property)|isoelectronic|diagonal relationship|screening|effective nuclear charge|metallic character|oxidi[sz]ing power (of|among) (the )?(halogen|element)", 4), r"increasing order of (atomic|ionic)|basic character of (the )?oxide|acidic character of (the )?oxide"],
        "CHE.BOND": [W(r"hybridi[sz]ation|bond order|vsepr|molecular orbital|bond angle|shape of|dipole moment|lone pair|geometry of|ionic bond|covalent bond|hydrogen bond|\bsp\^?\{?[123]|bond length|bond energy|sigma bond|pi bond|\\sigma|\\pi\b|resonance structure|formal charge|paramagnetic|diamagnetic|polar|number of (bonds|lone pairs)|total number of .*(bonds|lone)|molecular geometry|lewis|\bxe\b|fajans|lattice (energy|enthalpy)|octet|central atom|square planar|tetrahedral|trigonal|bipyramidal|octahedral shape|\bt-shaped|seesaw|linear", 3)],
        "CHE.THERMO": [W(r"enthalpy|entropy|gibbs|calorimeter|heat of|\\delta ?h|\\delta ?g|\\delta ?s|\\delta ?u|spontaneous|hess|bond enthalpy|internal energy|isothermal|adiabatic|reversible|first law|heat capacity|standard enthalpy|\bw\b.*work|work done|expansion of (an )?ideal gas|free energy", 3)],
        "CHE.CHEQ": [W(r"equilibrium constant|k_\{?p\}?|k_\{?c\}?|le chatelier|degree of dissociation|at equilibrium|equilibrium (is|mixture|partial)|equilibrium pressure|\\rightleftharpoons|dissociates|dissociation of", 3), r"equilibrium|\balpha\b.*dissociat"],
        "CHE.IONEQ": [W(r"\bph\b|k_\{?(sp|a|b|w)\}?|solubility product|buffer|\bpk|ionization constant|hydrolysis|common ion|\bsolubility\b|sparingly soluble|titration|indicator|acid(ic)? (strength|dissociation)|degree of ionization|conjugate (acid|base)|\[\\mathrm\{(h|oh)\}|lewis acid|bronsted|salt of|saturated solution of", 3)],
        "CHE.REDOX": [W(r"oxidation (state|number)|oxidising agent|oxidizing agent|reducing agent|redox|disproportionat|n-factor|oxidation of|reduced to|is oxidi[sz]ed|is reduced|equivalents of|oxidi[sz]ed by|acidified|permanganate|dichromate|iodometric|iodometry|thiosulfate|thiosulphate|balanc", 3)],
        "CHE.GOC": [W(r"inductive|resonance|hyperconjugation|carbocation|carbanion|nucleophil|electrophil|iupac|stereoisomer|chiral|enantiomer|optical(ly)? (activity|active)|geometrical isomer|tautomer|\br/s\b|free radical|number of (possible )?(isomers|structural)|structural isomer|constitutional isomer|diastereomer|meso|racemic|stereocent|stereogenic|cis-trans|e/z|acidic strength|basic strength|stability of|aromatic(ity)?|homolytic|heterolytic|degree of unsaturation|pka of", 3), r"isomer|configuration"],
        "CHE.HC": [W(r"alkene|alkane|alkyne|benzene|aromatic|markovnikov|ozonolysis|friedel|wurtz|hydrogenation|bromination|chlorination|hydrocarbon|cracking|kolbe|toluene|cyclohexane|propene|ethene|ethyne|acetylene|diels|birch|baeyer|lindlar|sabatier|nitration|sulfonation|sulphonation|1,3-butadiene|butene|pentene|hydroboration|ethylene|peroxide effect|kharasch|propyne|cycloalkane|monochlorination|polymeri[sz]ation of ethene", 3)],
        "CHE.SOLN": [W(r"molality|molarity|mole fraction|raoult|vapou?r pressure|osmotic|colligative|boiling point elevation|freezing point|depression in|van'?t hoff|azeotrope|ebullioscopic|cryoscopic|elevation (of|in) boiling|non-volatile|volatile (liquid|component)|ideal solution|henry'?s law|dilute solution|k_\{?(f|b)\}?\b|aqueous solution of .*(g|mol)", 3), r"\bsolution\b|solute|solvent"],
        "CHE.ELEC": [W(r"molar conductivity|\\lambda_\{?m|\\lambda\^\\circ|electrode potential|cell potential|galvanic|nernst|electrolysis|faraday|e\^\{?\\circ|e_\{?\\text\{?cell|e_\{?cell|\banode\b|\bcathode\b|conductivity|electrochemical|salt bridge|emf of (the )?cell|standard reduction potential|concentration cell|kohlrausch|degree of dissociation of (the )?weak|fuel cell|lead storage|electrolytic|current (is )?passed|\bcell\b.*\bv\b", 3), r"electrode|\bpt\b|\bzn\b.*\bcu\b"],
        "CHE.KIN": [W(r"rate constant|rate law|order of (the )?reaction|half[- ]life|first[- ]order|zero[- ]order|second[- ]order|activation energy|arrhenius|rate of (the )?reaction|rate of (formation|disappearance)|pseudo|reaction order|t_\{?1/2|t_\{?1 / 2|initial rate|\\frac\{d ?\[|\bk\b.*s\^\{-1\}|collision theory|pre-exponential|catalyst", 3)],
        "CHE.DF": [W(r"transition metal|lanthanoid|lanthanide|actinoid|actinide|kmno|k_\{?2\}?\\mathrm\{cr|cr_\{?2\}?\\mathrm\{o|d-block|f-block|chromate|3d series|inner transition|\\mathrm\{kmno|mno_\{?4|cr_\{?2\}?|mn\^\{?2|magnetic moment of (the )?(ion|metal)|interstitial|alloy|zinc|chromium|copper|silver|mercury|\bfe\b|\bni\b|\bmn\b|\bco\b", 2)],
        "CHE.COORD": [W(r"complex|ligand|coordination|crystal field|\[\\mathrm\{(fe|co|ni|cu|zn|pt|cr|mn|ag|pd)|\\left\[\\mathrm\{(fe|co|ni|cu|zn|pt|cr|mn|ag|pd|m)|edta|cfse|splitting|spin-only|spin only|low spin|high spin|chelat|geometrical isomers of|octahedral complex|square planar|tetrahedral complex|\\mathrm\{en\}|\\mathrm\{ox\}|ambidentate|wilkinson|werner|\\delta_\{?0|\\delta_\{?o|d-orbital|d\^\{?\d|t_\{?2g|e_\{?g|paramagnetic.*complex", 3)],
        "CHE.HALO": [W(r"haloalkane|alkyl halide|alkyl chloride|alkyl bromide|\bs_\{?n\}?[12]|\bsn[12]\b|aryl halide|chlorobenzene|bromobenzene|haloarene|\be2\b|\be1\b|dehydrohalogenation|walden|finkelstein|swarts|sandmeyer|ddt|chloroform|iodoform|freon|halogenation|alkyl iodide", 3)],
        "CHE.ALC": [W(r"alcohol|phenol|\bether\b|williamson|lucas|reimer|ethanol|methanol|propan|butanol|glycol|glycerol|dehydration of|hydroboration|epoxide|\bcresol|salicylic|aspirin|anisole|grignard|pcc\b|jones|oxidation of (the )?(primary|secondary)|picric|cumene|kolbe's", 3)],
        "CHE.CARB": [W(r"aldehyde|ketone|carboxylic|aldol|cannizzaro|clemmensen|wolff|esterification|acyl|carbonyl|haloform|benzaldehyde|acetophenone|anhydride|tollens|fehling|acetaldehyde|acetone|formic acid|acetic acid|benzoic acid|ester\b|hvz|hell-volhard|rosenmund|stephen|etard|gattermann|knoevenagel|perkin|\bpcl_?5|decarboxylation|carbonyl compound|hydroxy acid|schiff|cyanohydrin|oxime|hydrazone", 3)],
        "CHE.AMN": [W(r"amine|aniline|diazonium|hoffmann|hofmann|gabriel|\bazo\b|nitro compound|nitrobenzene|carbylamine|hinsberg|sandmeyer|nitrile|amide\b|isocyanide|pyridine|cyanide.*reduc|coupling reaction|diazotisation|diazotization|nitrous acid|benzenediazonium|sulphanilic|acetanilide", 3)],
        "CHE.BIOM": [W(r"glucose|protein|amino acid|\bdna\b|\brna\b|carbohydrate|peptide|nucleic|fructose|sucrose|starch|cellulose|vitamin|enzyme|nucleotide|glycosidic|anomer|lactose|maltose|zwitterion|polysaccharide|denatur|\blipid|triglyceride|hydrolysis of (the )?(sucrose|starch)|isoelectric", 3)],
        "CHE.GAS": [W(r"ideal gas|van der waals|compressibility|graham|effusion|diffusion of (the )?gas|gas laws?|critical (temperature|pressure)|boyle|charles'?s? law|partial pressure|gas (is|at|in) |gaseous|mean free path|molar volume|\bstp\b|\bnormal conditions|rms speed|root mean square|average speed|most probable|liquefaction|surface tension of (the )?liquid|viscosity of", 3), r"\bpressure\b|\bvolume\b|\batm\b"],
        "CHE.SBLK": [W(r"alkali metal|alkaline earth|\bsodium\b|potassium|lithium|\bmagnesium|calcium|beryllium|barium|strontium|group 1\b|group 2\b|s-block|plaster of paris|caustic soda|washing soda|baking soda|quick ?lime|slaked|\bhydride|deuterium|heavy water|\bhydrogen peroxide|hard(ness of)? water|cesium|caesium|rubidium", 3)],
        "CHE.PBLK": [W(r"borax|boric|boron|aluminium|aluminum|silicon|silicate|graphite|diamond|fullerene|group 1[3-8]\b|group (13|14|15|16|17|18)|p-block|nitrogen|phosphorus|phosphoric|oxoacid|oxyacid|sulphur|sulfur|h_\{?2\}?\\mathrm\{so|hno_\{?3|nh_\{?3|halogen|noble gas|xenon|\bxe\b|ozone|interhalogen|pcl|p_\{?4\}?|\\mathrm\{p\}_\{?4|bleaching powder|hydrogen halide|hf\b|\bhcl\b|hclo|clo_\{?|oxide of nitrogen|n_\{?2\}?\\mathrm\{o|no_\{?2|sio_\{?2|co_\{?2\}?\b|carbon monoxide|dry ice|thallium|inert pair|catenation|oxides? of|acidic character|reducing character of (the )?hydride|hydrides? of|\bsf_\{?|\bif_\{?|bf_\{?3|alcl|b_\{?2\}?\\mathrm\{h|diborane|\bsilane|\bphosph|\bpbo|\bsn(cl|o)|\bgeo|\bpb\b|\bsn\b|\bas\b|\bsb\b|\bbi\b|\bse\b|\bte\b|\bpo\b", 2)],
        "CHE.SOLID": [W(r"unit cell|lattice|packing efficiency|\bfcc\b|\bbcc\b|crystal|schottky|frenkel|\bvoid|close[- ]packed|coordination number|edge length|ccp|\bhcp\b|simple cubic|body[- ]centred|face[- ]centred|cubic (lattice|close)|tetrahedral voids?|octahedral voids?|packing fraction|radius ratio|nacl structure|rock salt|zinc blende|\bzns\b|cscl|interstitial", 4)],
        "CHE.SURF": [W(r"adsorption|adsorb|colloid|micelle|emulsion|freundlich|tyndall|peptisation|peptization|\bsol\b|gold number|critical micelle|langmuir|brownian|coagulat|hardy-schulze|heterogeneous catalysis|\bgel\b|aerosol|dialysis|electrophoresis|physisorption|chemisorption|surfactant|soap", 4)],
        "CHE.METAL": [W(r"extraction of|metallurgy|\bore\b|\bores\b|roasting|calcination|smelting|ellingham|froth flotation|cyanide process|refining|electrolytic refining|mond process|van arkel|zone refining|blast furnace|bessemer|thermite|flux|slag|hall-heroult|leaching|bauxite|haematite|hematite|pyrites|malachite|cinnabar|galena|copper pyrites|calamine|zincite|cryolite", 4)],
        "CHE.POLY": [W(r"polymer|polymeri[sz]ation|nylon|bakelite|rubber|polythene|polyethylene|\bpvc\b|monomer|buna|teflon|vulcani[sz]ation|polyester|terylene|dacron|polystyrene|orlon|glyptal|melamine|neoprene|detergent|antibiotic|antiseptic|tranquili[sz]er|analgesic|antacid|artificial sweetener|food preservative|polyacrylonitrile|\bpha?bv\b|novolac|cross-linked|condensation polymer|addition polymer", 4)],
    },
    "MAT": {
        "MAT.SET": [W(r"\bset\b.*(subset|elements|cardinality)|number of (elements|subsets) (in|of) the set|power set|\\cup|\\cap|venn|union of sets|n\(a|\bsubsets? of|number of elements in (the )?(set|union)|cardinality", 3)],
        "MAT.FUN": [W(r"domain of|range of the function|function .*(even|odd|periodic)|periodic function|greatest integer function|composite function|f ?\\circ ?g|g ?\\circ ?f|fractional part|\[x\]|\\lfloor|floor", 3), r"function|f:"],
        "MAT.RELF": [W(r"one[- ]one|one-to-one|\bonto\b|bijective|injective|surjective|invertible function|inverse (of )?(the )?function|many-one|number of (one|functions|relations)|equivalence relation|reflexive|symmetric relation|transitive|functional equation|f\(x ?\+ ?y\)|f\(x y\)|f\(x\) ?f\(y\)", 4)],
        "MAT.TRIG": [W(r"\\sin|\\cos|\\tan|\\cot|\\sec|\\csc|\\operatorname\{cosec\}|trigonometric|sin\b|cos\b|sine rule|cosine rule|triangle (abc|pqr)|circumradius|inradius|angles? of (the |a )?triangle|\\theta|\\alpha|\\beta|\\gamma|height of|angle of elevation|\\pi ?/", 1), W(r"trigonometric (equation|identity|function)|general solution|principal value|sin ?x ?=|cos ?x ?=|tan ?x ?=|solutions? of the equation .*(\\sin|\\cos|\\tan)|sides of a triangle|in a triangle|triangle .* (sides|angles)", 3)],
        "MAT.CPLX": [W(r"complex number|\bz\b.*\\in ?\\mathbb\{c\}|\\mathbb\{c\}|\\omega|cube root of unity|roots of unity|\|z|\\bar\{z\}|\\arg|argument of|modulus|real part|imaginary part|\\operatorname\{re\}|\\operatorname\{im\}|\\mathrm\{re\}|\\mathrm\{im\}|quadratic (equation|polynomial|expression)|roots? of the (quadratic|equation)|discriminant|\\alpha ?\+ ?\\beta|\\alpha ?\\beta|sum of the roots|product of (the )?roots|real and distinct|imaginary unit|\\sqrt\{-1\}|\bi\^|polynomial", 3)],
        "MAT.INEQ": [W(r"inequalit|linear inequalit", 3)],
        "MAT.PNC": [W(r"number of ways|permutation|combination|arrangements?|distinct (ways|words|numbers|committees)|committee|\^\{?\d*\}?c_\{?|\^\{?n\}?c_|\^\{?n\}?p_|\\binom|selected from|digit numbers|digits? (are|is) (chosen|selected)|number of (different|possible) (ways|arrangements)|seated|seating|distribut(e|ing) .* (identical|distinct)|arranged in a row|round a table|surjective functions|derangement|words? (can be|that can be) formed|letters of the word|number of (ordered|all possible) (pairs|triples|\w+-?tuples)|at least one|number of (onto|injective) ", 3)],
        "MAT.BINO": [W(r"binomial|coefficient of x|coefficient of|expansion of|\(1 ?\+ ?x\)\^|\\left\(1 ?\+ ?x\\right\)\^|\\sum_\{?r ?= ?0\}?\^\{?n\}? ?\^\{?n\}?c|general term|middle term|\^\{?\d*\}?c_\{?r", 4)],
        "MAT.SEQ": [W(r"arithmetic progression|geometric progression|harmonic progression|\ba\.?p\.?\b|\bg\.?p\.?\b|\bh\.?p\.?\b|sequence|sum of (the )?first|first \w+ terms|common difference|common ratio|series|a_\{?n\}?|a_\{?1\}?|a_\{?2\}?|terms? of (an?|the) (a\.?p|g\.?p|progression)|geometric mean|arithmetic mean|\\sum_\{?(n|k|i|r) ?= ?1\}?\^|telescop|infinite series|b_\{?n", 3)],
        "MAT.LINE": [W(r"straight line|slope|locus|lines? (l|pq|ab)|\bline\b.*(passes|intercept)|x ?\+ ?y ?=|intercepts?|angle bisector|centroid|orthocentre|orthocenter|circumcentre|incentre|vertices|area of (the )?(triangle|quadrilateral|parallelogram|rhombus)|triangle (abc|pqr|opq)|reflection of the point|image of the point|perpendicular (distance|from)|distance of the point|concurrent|collinear|foot of the perpendicular|equation of (the )?(line|side)|mid-?point|lines? .* x ?[+-] ?\d ?y", 2)],
        "MAT.CONIC": [W(r"parabola|ellipse|hyperbola|\bcircle\b|tangent to the|focus|foci|directrix|eccentricity|latus rectum|chord|asymptote|auxiliary circle|radical axis|x\^\{?2\}? ?\+ ?y\^\{?2\}?|y\^\{?2\}? ?= ?4|\\frac\{x\^\{?2\}?\}\{a\^\{?2\}?\}|common tangent|normal to the|polar of|diameter", 3)],
        "MAT.TDI": [W(r"distance between the points .*\(x, y, z\)", 3)],
        "MAT.TDG": [W(r"\bplane\b|direction (ratios|cosines)|skew lines|shortest distance between|foot of the perpendicular .*(plane|line)|x-?axis|y-?axis|z-?axis|\(x, y, z\)|three[- ]dimensional|3-?d|line (passing )?through the points? \(|lines? .*\\frac\{x ?[-+]|\\frac\{x ?- ?\d.*\}\{.*\}=\\frac\{y|sphere|octant|image of the point .*(plane|line)|distance of the point .* from the plane|\\alpha x ?\+ ?\\beta y ?\+ ?\\gamma z|ax ?\+ ?by ?\+ ?cz", 3)],
        "MAT.VEC": [W(r"\\vec|\\hat\{i\}|\\hat\{j\}|\\hat\{k\}|unit vector|dot product|cross product|scalar triple|vector product|\\times \\vec|\\cdot ?\\vec|parallelepiped|projection of (the )?vector|coplanar|collinear vectors|position vector|\\mathbf\{(a|b|c|u|v|w)\}|vectors? .* (are|is) (mutually )?(perpendicular|orthogonal)", 3)],
        "MAT.LIM": [W(r"\\lim|limit|l'hospital|l'hôpital|\\rightarrow ?(0|\\infty|a|1|\\frac)|\\to ?(0|\\infty)|derivative of|f\^\{\\prime\}|f'\(|lim_", 2), W(r"\\lim", 2)],
        "MAT.STAT": [W(r"\bmean\b|variance|standard deviation|\bmedian\b|\bmode\b|mean deviation|frequency distribution|data set|observations|statistic|quartile|dispersion|arithmetic mean of the (data|numbers)", 3)],
        "MAT.PROB": [W(r"probability|dice|\bdie\b|coin|balls? (are )?(drawn|chosen|selected)|urn|\bbag\b|cards?\b|at random|randomly|event|favourable|favorable|chosen at random|sample space|bernoulli|expected value|random variable|mutually exclusive|exhaustive|independent", 2)],
        "MAT.PROB2": [W(r"conditional probability|bayes|given that|independent events|random variable|binomial distribution|probability distribution|total probability|\bp\(a ?\\mid|\bp\(a ?\| ?b|\\mid|events? (a|e|f|x|y)|probability that .* given", 4)],
        "MAT.ITF": [W(r"\\sin ?\^\{?-1\}?|\\cos ?\^\{?-1\}?|\\tan ?\^\{?-1\}?|\\cot ?\^\{?-1\}?|\\sec ?\^\{?-1\}?|\\operatorname\{cosec\} ?\^\{?-1\}?|\\csc ?\^\{?-1\}?|inverse trigonometric|\\arcsin|\\arccos|\\arctan|principal value|\\sin\^\{-1\}|\\tan\^\{-1\}|\\cos\^\{-1\}", 4)],
        "MAT.MATX": [W(r"matrix|matrices|\btrace\b|adjoint|transpose|identity matrix|m\^\{-1\}|a\^\{-1\}|a\^\{?2\}? ?=|\bm\^\{?2\}? ?=|symmetric matrix|skew-symmetric|orthogonal matrix|nilpotent|idempotent|eigenvalue|\\begin\{array\}\{.*\}.*&|\\left\[\\begin|\\begin\{(b|p)matrix\}", 3)],
        "MAT.DET": [W(r"determinant|\\operatorname\{det\}|\\det\b|\\left\|\\begin\{array\}|\\left\| ?\\begin|\|\\begin\{array\}|\|a\| ?=|adjugate|consistent system|system of linear equations|infinitely many solutions|unique solution|no solution|cramer", 4)],
        "MAT.CD": [W(r"continuous|continuity|differentiable|differentiability|not differentiable|points? of discontinuity|number of points (at which|where)|f is not differentiable|left[- ]hand|right[- ]hand|\\mathrm\{c\}\^\{?1\}?", 4)],
        "MAT.AOD": [W(r"maximum value|minimum value|local (maximum|minimum|maxima|minima)|absolute (maximum|minimum)|increasing|decreasing|monoton|tangent to the curve|normal to the curve|extrema|extremum|critical point|rolle|mean value|concave|convex|point of inflection|inflexion|maximi[sz]e|minimi[sz]e|greatest value|least value|largest|smallest value|rate of change|f\^\{\\prime\\prime\}|f''", 3)],
        "MAT.INTG": [W(r"\\int|integral|antiderivative|\\sum.*\\int|definite|primitive of|integrate|\\int_", 3)],
        "MAT.AOI": [W(r"area (bounded|of the region|enclosed|between|under)|bounded by (the )?(curves?|lines?|parabola|graph)|region (bounded|enclosed)|area of the region|enclosed by the curves?|volume of the solid|area .* bounded|area of the (region|figure|portion)|\bregion\b.*\bx\b.*\by\b|\\left\\\{\(x, y\)", 5)],
        "MAT.DE": [W(r"differential equation|\\frac\{d y\}\{d x\}|\\frac\{d ?y\}\{d ?x\}|solution curve|y\^\{\\prime\}|y'|\\frac\{d\^2|ordinary differential|integrating factor|homogeneous differential|dy ?/ ?dx|curve .* passes through .*(satisf|tangent)|y\(x\)|solution of the .*(equation|problem)|\\frac\{dy\}\{dx\}", 3)],
    },
}

_COMPILED: dict[str, dict[str, list[tuple[re.Pattern, int]]]] = {}


def _compiled(subject: str):
    if subject not in _COMPILED:
        out: dict[str, list[tuple[re.Pattern, int]]] = {}
        for ch, pats in RULES[subject].items():
            lst = []
            for p in pats:
                pat, w = p if isinstance(p, tuple) else (p, 1)
                lst.append((re.compile(pat, re.I), w))
            out[ch] = lst
        _COMPILED[subject] = out
    return _COMPILED[subject]


def scores(subject: str, text: str) -> dict[str, int]:
    text = text.lower()
    res = {}
    for ch, pats in _compiled(subject).items():
        s = 0
        for rx, w in pats:
            if rx.search(text):
                s += w
        if s:
            res[ch] = s
    return res


def classify(subject: str, text: str) -> tuple[str | None, dict[str, int]]:
    """Return (chapter or None when not confident, all non-zero scores)."""
    sc = scores(subject, text)
    if not sc:
        return None, sc
    ranked = sorted(sc.items(), key=lambda kv: (-kv[1], kv[0]))
    best = ranked[0]
    second = ranked[1][1] if len(ranked) > 1 else 0
    if best[1] >= MIN_SCORE and best[1] - second >= MARGIN:
        return best[0], sc
    return None, sc
