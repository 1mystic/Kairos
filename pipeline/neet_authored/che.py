"""CHE gap chapters (NCERT-level, text only): HC, HALO, ALC, CARB, AMN, BIOM, PERIO, SBLK, POLY, PBLK, DF, GAS, SOLID, SURF, METAL."""
import math
import re
from collections import Counter

from . import AR, CODE, M, N, S


def atoms(formula):
    out = Counter()
    for el, n in re.findall(r"([A-Z][a-z]?)(\d*)", formula):
        out[el] += int(n or 1)
    return out


def balanced(lhs, rhs):
    def side(terms):
        tot = Counter()
        for coef, f in terms:
            for el, n in atoms(f).items():
                tot[el] += coef * n
        return tot
    return side(lhs) == side(rhs)


# ------------------------------------------------------------------ CHE.HC
c = "CHE.HC"
S(c, "E", "The general formula of alkynes with one triple bond is",
  "$\\mathrm{C_nH_{2n-2}}$", ["$\\mathrm{C_nH_{2n+2}}$", "$\\mathrm{C_nH_{2n}}$", "$\\mathrm{C_nH_{n}}$"],
  "Alkanes are $\\mathrm{C_nH_{2n+2}}$, alkenes $\\mathrm{C_nH_{2n}}$ and alkynes $\\mathrm{C_nH_{2n-2}}$.")
N(c, "E", "The number of hydrogen atoms in the alkane with six carbon atoms is ______.", 14,
  "$\\mathrm{C_nH_{2n+2}}$ with $n=6$ gives $\\mathrm{C_6H_{14}}$.", integer=True)
S(c, "E", "The major product of the addition of HBr to propene in the absence of peroxide is",
  "2-bromopropane", ["1-bromopropane", "2-bromopropene", "1,2-dibromopropane"],
  "Markovnikov's rule: H adds to the carbon with more hydrogens, so Br ends up on the carbon with fewer hydrogens (C-2), via the more stable secondary carbocation.")
S(c, "M", "In the presence of a peroxide, HBr adds to propene to give mainly",
  "1-bromopropane (anti-Markovnikov product)", ["2-bromopropane", "propane", "allyl bromide"],
  "The peroxide effect (Kharasch) proceeds by a free radical chain: Br$\\cdot$ adds first at the terminal carbon to give the more stable secondary radical.")
S(c, "E", "Which of the following carbon-carbon bonds is the shortest?",
  "the triple bond in ethyne", ["the single bond in ethane", "the double bond in ethene", "the bond in cyclohexane"],
  "Bond length decreases with bond order: C-C $\\approx154$ pm, C=C $\\approx134$ pm, C$\\equiv$C $\\approx120$ pm.")
S(c, "M", "Which of the following is aromatic according to Hückel's rule ($4n+2$ $\\pi$ electrons, planar, cyclic, fully conjugated)?",
  "benzene", ["cyclohexane", "cyclobutadiene", "cyclohexene"],
  "Benzene has 6 $\\pi$ electrons ($n=1$). Cyclobutadiene has 4 (anti-aromatic) and cyclohexane and cyclohexene are not fully conjugated.")
S(c, "E", "The reaction of benzene with $\\ce{CH3Cl}$ in the presence of anhydrous $\\ce{AlCl3}$ gives",
  "toluene", ["chlorobenzene", "nitrobenzene", "phenol"],
  "Friedel-Crafts alkylation: the $\\ce{AlCl3}$ generates the electrophile $\\ce{CH3+}$ which substitutes a ring hydrogen.")
S(c, "M", "Sodium reacts with methyl bromide in dry ether to give mainly",
  "ethane", ["methane", "propane", "ethene"],
  "Wurtz reaction: $\\ce{2CH3Br + 2Na -> CH3-CH3 + 2NaBr}$, two alkyl groups couple.")
sigma = 4 + 1
N(c, "M", "The number of sigma bonds in one molecule of ethene ($\\ce{C2H4}$) is ______.", sigma,
  "Four C-H sigma bonds plus one C-C sigma bond $=5$ (the second C-C bond is a pi bond).", integer=True)
assert balanced([(1, "C3H8"), (5, "O2")], [(3, "CO2"), (4, "H2O")])
N(c, "M", "For the complete combustion $\\ce{C3H8 + O2 -> CO2 + H2O}$ (balanced with smallest integers), the coefficient of $\\ce{O2}$ is ______.", 5,
  "$\\ce{C3H8 + 5O2 -> 3CO2 + 4H2O}$.", integer=True)
S(c, "M", "Of the conformations of ethane, the more stable one is",
  "staggered, because of minimum torsional strain", ["eclipsed, because of maximum torsional strain", "both are equally stable", "eclipsed, because of lower repulsion"],
  "In the staggered form the C-H bonds on adjacent carbons are as far apart as possible, so repulsion is minimal.")
N(c, "E", "The number of structural isomers of butane's molecular formula $\\ce{C4H10}$ is ______.", 2,
  "n-Butane and 2-methylpropane (isobutane) are the only two.", via="second-derivation", integer=True)
S(c, "E", "Bromine water is decolourised by",
  "ethene", ["ethane", "benzene", "methane"],
  "Alkenes undergo electrophilic addition with bromine, forming a colourless dibromide; alkanes and benzene do not react under these conditions.")

# ------------------------------------------------------------------ CHE.HALO
c = "CHE.HALO"
S(c, "E", "Which of the following alkyl chlorides undergoes $\\mathrm{S_N1}$ hydrolysis the fastest?",
  "tert-butyl chloride", ["methyl chloride", "ethyl chloride", "isopropyl chloride"],
  "$\\mathrm{S_N1}$ proceeds through a carbocation, whose stability is $3^\\circ>2^\\circ>1^\\circ>$ methyl.")
S(c, "E", "An $\\mathrm{S_N2}$ reaction at a chiral carbon proceeds with",
  "inversion of configuration, in a single step", ["retention of configuration", "racemisation through a carbocation", "no change in configuration at all times"],
  "The nucleophile attacks from the side opposite to the leaving group (backside attack) in one concerted step, inverting the configuration.")
S(c, "M", "Optically active alkyl halide reacting by the $\\mathrm{S_N1}$ mechanism gives a product that is",
  "a racemic mixture (mostly), because the planar carbocation is attacked from both faces", ["entirely inverted", "entirely retained", "optically pure"],
  "The planar carbocation can be attacked from either side with equal probability, giving equal amounts of the two enantiomers.")
S(c, "M", "Chloroform is stored in dark-coloured, completely filled bottles because it is slowly oxidised by air in light to the poisonous gas",
  "phosgene ($\\ce{COCl2}$)", ["carbon monoxide", "chlorine", "methane"],
  "$\\ce{2CHCl3 + O2 ->[light] 2COCl2 + 2HCl}$; a little ethanol is added to convert phosgene to harmless diethyl carbonate.")
S(c, "M", "Aryl halides such as chlorobenzene are much less reactive towards nucleophilic substitution than alkyl halides because",
  "of resonance giving the C-Cl bond partial double-bond character and the $sp^2$ hybridised carbon", ["the C-Cl bond in aryl halides is longer", "chlorobenzene has no polar bond", "benzene is a good leaving group"],
  "The lone pair on chlorine is delocalised into the ring and the $sp^2$ carbon is more electronegative, strengthening and shortening the C-Cl bond.")
S(c, "M", "The reaction $\\ce{CH3CH2Br + NaI ->[dry acetone] CH3CH2I + NaBr}$ is called the",
  "Finkelstein reaction", ["Swarts reaction", "Sandmeyer reaction", "Wurtz reaction"],
  "NaBr is insoluble in dry acetone and precipitates, driving the equilibrium. The Swarts reaction uses metallic fluorides such as AgF to make alkyl fluorides.")
S(c, "M", "Among the isomeric bromobutanes, the one with the lowest boiling point is",
  "2-bromo-2-methylpropane, because branching reduces surface area", ["1-bromobutane", "2-bromobutane", "all three have the same boiling point"],
  "Boiling points: 1-bromobutane (375 K) > 2-bromobutane (364 K) > 2-bromo-2-methylpropane (346 K); more branched molecules are more spherical, with weaker van der Waals forces.")
S(c, "E", "Alcoholic KOH with a haloalkane such as 2-bromopropane mainly causes",
  "elimination (dehydrohalogenation) giving propene", ["substitution giving propan-2-ol", "addition giving propane", "oxidation to propanone"],
  "Alcoholic KOH favours $\\beta$-elimination; aqueous KOH favours substitution to alcohol.")
S(c, "E", "Which of the following is optically active?",
  "2-bromobutane", ["1-bromobutane", "bromoethane", "2-bromopropane"],
  "2-Bromobutane has a stereocentre (C-2 with H, Br, $\\ce{CH3}$, $\\ce{C2H5}$); the others have no carbon with four different groups.")
S(c, "E", "Grignard reagents ($\\ce{RMgX}$) are prepared by the reaction of an alkyl halide with magnesium in",
  "dry diethyl ether", ["water", "aqueous ethanol", "dilute acid"],
  "Grignard reagents react with water and other protic compounds, so they must be made in anhydrous ether.")
S(c, "H", "Chlorobenzene on nitration with a mixture of conc. $\\ce{HNO3}$ and conc. $\\ce{H2SO4}$ gives mainly",
  "ortho- and para-nitrochlorobenzene", ["meta-nitrochlorobenzene only", "no reaction", "nitrobenzene"],
  "Chlorine is deactivating (inductive effect) but ortho-para directing (resonance), so the nitro group enters ortho and para.")

# ------------------------------------------------------------------ CHE.ALC
c = "CHE.ALC"
S(c, "M", "In the Lucas test (conc. HCl with $\\ce{ZnCl2}$) at room temperature, turbidity appears immediately with",
  "a tertiary alcohol", ["a primary alcohol", "methanol", "a secondary alcohol only after heating"],
  "Reactivity follows carbocation stability: tertiary reacts immediately, secondary in about five minutes, primary only on heating.")
S(c, "E", "Phenol is more acidic than ethanol because",
  "the phenoxide ion is stabilised by resonance", ["phenol has more hydrogen bonds", "the OH bond in ethanol is weaker", "phenol is a stronger base"],
  "Delocalisation of the negative charge into the ring stabilises the phenoxide ion, whereas the ethoxide ion is destabilised by the electron-donating alkyl group.")
S(c, "M", "Which of the following is the most acidic?",
  "p-nitrophenol", ["phenol", "p-cresol", "ethanol"],
  "The electron-withdrawing nitro group stabilises the phenoxide ion further; the methyl group in p-cresol destabilises it.")
S(c, "M", "Ethanol heated with conc. $\\ce{H2SO4}$ at 443 K mainly gives",
  "ethene", ["ethoxyethane", "ethanal", "ethane"],
  "At 443 K intramolecular dehydration gives ethene; at 413 K with excess ethanol, intermolecular dehydration gives ethoxyethane.")
S(c, "M", "Phenol reacts with chloroform in the presence of aqueous NaOH, followed by acidification, to give mainly",
  "salicylaldehyde (2-hydroxybenzaldehyde)", ["salicylic acid", "benzaldehyde", "picric acid"],
  "This is the Reimer-Tiemann reaction. Salicylic acid forms from sodium phenoxide with $\\ce{CO2}$ (Kolbe's reaction).")
S(c, "M", "Sodium phenoxide heated with $\\ce{CO2}$ at 400 K under pressure and then acidified gives",
  "salicylic acid", ["salicylaldehyde", "benzoic acid", "phenyl acetate"],
  "Kolbe's reaction: carboxylation at the ortho position of phenoxide; salicylic acid is a precursor of aspirin.")
S(c, "H", "Which combination is best for preparing tert-butyl methyl ether by Williamson synthesis?",
  "sodium tert-butoxide and methyl bromide", ["sodium methoxide and tert-butyl bromide", "tert-butyl alcohol and methyl alcohol with acid", "sodium methoxide and 2-bromopropane"],
  "The $\\mathrm{S_N2}$ reaction needs a primary alkyl halide; a tertiary halide would give elimination (2-methylpropene) with the alkoxide base.")
S(c, "E", "Oxidation of a secondary alcohol such as propan-2-ol with an oxidising agent gives",
  "a ketone (propanone)", ["an aldehyde", "a carboxylic acid with fewer carbons", "an alkane"],
  "Secondary alcohols oxidise to ketones; primary alcohols give aldehydes (with PCC) or carboxylic acids (with strong oxidants).")
N(c, "M", "The number of structural isomers of alcohols with the molecular formula $\\ce{C4H10O}$ is ______.", 4,
  "Butan-1-ol, butan-2-ol, 2-methylpropan-1-ol and 2-methylpropan-2-ol.", via="second-derivation", integer=True)
S(c, "E", "The boiling points of alcohols are much higher than those of hydrocarbons of comparable molar mass because",
  "alcohol molecules are associated through intermolecular hydrogen bonding", ["alcohols are ionic", "alcohols have no polar bonds", "hydrocarbons are always gases"],
  "Hydrogen bonds between the O-H groups must be broken for evaporation.")
S(c, "E", "Phenol gives a violet colour with neutral",
  "$\\ce{FeCl3}$ solution", ["$\\ce{NaOH}$", "$\\ce{HCl}$", "$\\ce{KMnO4}$"],
  "The violet complex with ferric chloride is a characteristic test for phenols.")
S(c, "M", "Phenol with bromine water gives",
  "a white precipitate of 2,4,6-tribromophenol", ["o-bromophenol only", "a yellow precipitate of picric acid", "no reaction"],
  "The OH group strongly activates the ring, so substitution occurs at all ortho and para positions even without a Lewis acid.")

# ------------------------------------------------------------------ CHE.CARB
c = "CHE.CARB"
S(c, "E", "Tollens' reagent is reduced to a silver mirror by",
  "aldehydes", ["ketones", "ethers", "alkanes"],
  "Aldehydes are oxidised to carboxylate with the formation of silver metal; ketones are not oxidised by this mild reagent.")
S(c, "M", "Which of the following does NOT give a red precipitate with Fehling's solution?",
  "benzaldehyde", ["ethanal", "propanal", "methanal"],
  "Fehling's solution oxidises aliphatic aldehydes only; aromatic aldehydes such as benzaldehyde do not respond.")
S(c, "M", "Which of the following undergoes the Cannizzaro reaction?",
  "benzaldehyde, which has no $\\alpha$-hydrogen", ["ethanal", "propanone", "butanal"],
  "Aldehydes lacking $\\alpha$-hydrogens (HCHO, $\\ce{C6H5CHO}$) in conc. alkali disproportionate into an alcohol and a carboxylate; those with $\\alpha$-H undergo aldol condensation.")
S(c, "M", "Aldol condensation is shown by compounds having",
  "at least one $\\alpha$-hydrogen atom", ["no $\\alpha$-hydrogen", "only aromatic rings", "an OH group"],
  "A base removes an $\\alpha$-H to form an enolate that attacks the carbonyl group of another molecule, e.g. ethanal gives 3-hydroxybutanal.")
S(c, "E", "Which of the following is the strongest acid?",
  "trichloroacetic acid", ["acetic acid", "propanoic acid", "chloroacetic acid"],
  "Electron-withdrawing Cl atoms stabilise the carboxylate ion; the acidity order is $\\ce{CCl3COOH}>\\ce{CHCl2COOH}>\\ce{CH2ClCOOH}>\\ce{CH3COOH}$.")
S(c, "M", "Acetyl chloride is reduced to acetaldehyde by $\\ce{H2}$ over palladium on barium sulphate. This reaction is the",
  "Rosenmund reduction", ["Clemmensen reduction", "Wolff-Kishner reduction", "Stephen reaction"],
  "BaSO$_4$ partially poisons the Pd catalyst so that the aldehyde is not reduced further.")
S(c, "M", "Which of the following gives a yellow precipitate of iodoform with $\\ce{I2}$ and NaOH?",
  "propanone", ["propanal", "benzaldehyde", "diethyl ketone (pentan-3-one)"],
  "The haloform reaction requires a $\\ce{CH3CO-}$ group (or $\\ce{CH3CH(OH)-}$); propanone has it, while pentan-3-one and benzaldehyde lack it.")

# ------------------------------------------------------------------ CHE.AMN
c = "CHE.AMN"
S(c, "M", "In aqueous solution, the correct order of basic strength of methylamines and ammonia is",
  "$\\ce{(CH3)2NH > CH3NH2 > (CH3)3N > NH3}$", ["$\\ce{(CH3)3N > (CH3)2NH > CH3NH2 > NH3}$", "$\\ce{NH3 > CH3NH2 > (CH3)2NH > (CH3)3N}$", "$\\ce{CH3NH2 > (CH3)2NH > (CH3)3N > NH3}$"],
  "The +I effect of methyl groups increases basicity, but in water the solvation (hydrogen bonding) of the ammonium ion decreases with more alkyl groups; the net order is secondary > primary > tertiary > ammonia.")
S(c, "E", "Aniline is a weaker base than ammonia because",
  "the lone pair on nitrogen is delocalised into the benzene ring", ["aniline has no nitrogen lone pair", "the benzene ring is electron-donating towards nitrogen", "aniline is not polar"],
  "Resonance makes the lone pair less available for protonation.")
S(c, "E", "Primary amines give a foul-smelling isocyanide when heated with chloroform and alcoholic KOH. This is the",
  "carbylamine reaction", ["Hofmann bromamide reaction", "Gabriel synthesis", "Sandmeyer reaction"],
  "$\\ce{RNH2 + CHCl3 + 3KOH -> RNC + 3KCl + 3H2O}$; secondary and tertiary amines do not give this test.")
S(c, "M", "Benzenesulphonyl chloride (Hinsberg's reagent) reacts with a primary amine to give a product which is",
  "soluble in alkali", ["insoluble in alkali", "an alcohol", "unreactive and left unchanged"],
  "The sulphonamide from a primary amine has an acidic N-H hydrogen and dissolves in alkali; from a secondary amine it is insoluble; a tertiary amine does not react.")
S(c, "M", "Benzenediazonium chloride on treatment with $\\ce{CuCl}$/HCl gives",
  "chlorobenzene (Sandmeyer reaction)", ["phenol", "aniline", "benzene"],
  "The diazonium group is replaced by Cl; with warm water it would give phenol, and with $\\ce{H3PO2}$ benzene.")
S(c, "M", "The Gabriel phthalimide synthesis is used to prepare",
  "primary aliphatic amines but not aromatic amines", ["secondary amines", "tertiary amines", "aryl amines such as aniline"],
  "Aryl halides do not undergo nucleophilic substitution with the phthalimide anion, so the method fails for aromatic primary amines.")
S(c, "M", "Propanamide treated with $\\ce{Br2}$ and aqueous KOH (Hofmann bromamide degradation) gives",
  "ethanamine, which has one carbon less", ["propanamine", "propanoic acid", "ethanol"],
  "$\\ce{RCONH2 + Br2 + 4KOH -> RNH2 + K2CO3 + 2KBr + 2H2O}$: the carbonyl carbon is lost as carbonate.")
S(c, "E", "Aniline with bromine water gives",
  "a white precipitate of 2,4,6-tribromoaniline", ["a yellow precipitate", "no reaction", "p-bromoaniline only"],
  "The strongly activating $\\ce{NH2}$ group makes all ortho and para positions react at once.")

# ------------------------------------------------------------------ CHE.BIOM
c = "CHE.BIOM"
S(c, "E", "Glucose is an",
  "aldohexose", ["ketohexose", "aldopentose", "ketopentose"],
  "Glucose ($\\ce{C6H12O6}$) has six carbons and an aldehyde group; fructose is a ketohexose.")
chiral = 4
N(c, "M", "The open-chain structure of D-glucose has chiral carbons numbering ______.", chiral,
  "C-2, C-3, C-4 and C-5 are stereocentres in the aldohexose chain, so there are 4.", via="second-derivation", integer=True)
N(c, "H", "The number of possible stereoisomers (optical isomers) of an aldohexose such as glucose is $2^n$ where $n$ is the number of chiral centres. The number is ______.", 2 ** chiral,
  "$2^4=16$ stereoisomers (8 D- and 8 L-forms).", integer=True)
assert 2 ** chiral == 16
S(c, "E", "Hydrolysis of sucrose gives",
  "glucose and fructose, called invert sugar", ["glucose and galactose", "two molecules of glucose", "fructose only"],
  "Sucrose is dextrorotatory, but the hydrolysis mixture is laevorotatory because fructose is strongly laevorotatory, hence the name 'invert sugar'.")
S(c, "M", "Sucrose is a non-reducing sugar because",
  "the glycosidic linkage involves the reducing (anomeric) carbons of both glucose and fructose", ["it has no OH groups", "it has no glycosidic linkage", "it is a polysaccharide"],
  "Both anomeric carbons are tied up in the $\\alpha$-1,$\\beta$-2 glycosidic link, leaving no free aldehyde or ketone group.")
S(c, "M", "Starch consists of",
  "amylose (unbranched $\\alpha$-1,4 chains) and amylopectin (branched with $\\alpha$-1,6 links)", ["cellulose and glycogen only", "$\\beta$-D-glucose units only", "amylose and chitin"],
  "Amylose (about 15-20%) is water soluble and linear; amylopectin (80-85%) is branched. Cellulose is a $\\beta$-1,4 polymer.")
S(c, "E", "Denaturation of a protein, such as the coagulation of egg white on boiling, involves",
  "loss of the secondary and tertiary structure, while the primary structure is retained", ["breaking of peptide bonds", "loss of primary structure", "formation of new amino acids"],
  "Heat disrupts hydrogen bonds and other weak interactions that maintain the folding; the peptide backbone remains intact.")
S(c, "E", "Deficiency of vitamin C causes",
  "scurvy", ["rickets", "beri-beri", "night blindness"],
  "Vitamin C (ascorbic acid) deficiency causes scurvy; vitamin D deficiency causes rickets, vitamin B$_1$ beri-beri and vitamin A night blindness.")
S(c, "E", "RNA differs from DNA in that RNA has",
  "ribose sugar and uracil instead of thymine", ["deoxyribose and thymine", "deoxyribose and uracil", "ribose and thymine"],
  "RNA contains D-ribose and the base uracil; DNA contains 2-deoxyribose and thymine.")
S(c, "M", "Lactose on hydrolysis gives",
  "D-galactose and D-glucose", ["two glucose molecules", "glucose and fructose", "galactose and fructose"],
  "Lactose is the sugar of milk, a disaccharide of $\\beta$-D-galactose and $\\beta$-D-glucose; maltose gives two glucose units.")
S(c, "M", "Cellulose is a polymer of",
  "$\\beta$-D-glucose units joined by $\\beta$-1,4 glycosidic linkages", ["$\\alpha$-D-glucose with $\\alpha$-1,6 linkages", "fructose", "amino acids"],
  "Humans lack cellulase and cannot digest cellulose, unlike starch with its $\\alpha$ linkages.")
S(c, "H", "Which of the following is a water-soluble vitamin?",
  "vitamin B$_{12}$", ["vitamin A", "vitamin D", "vitamin K"],
  "Vitamins A, D, E and K are fat soluble; the B-complex vitamins (including B$_{12}$) and vitamin C are water soluble.")

# ------------------------------------------------------------------ CHE.PERIO
c = "CHE.PERIO"
S(c, "E", "The modern periodic law states that the properties of elements are a periodic function of their",
  "atomic numbers", ["atomic masses", "mass numbers", "number of neutrons"],
  "Mendeleev's law used atomic masses; Moseley's work led to the modern law based on atomic number.")
S(c, "E", "Along a period from left to right (main group), the atomic radius generally",
  "decreases, because of increasing effective nuclear charge", ["increases", "stays constant", "increases and then falls to zero"],
  "Electrons are added to the same shell while nuclear charge increases, so the electrons are pulled closer.")
S(c, "M", "Which element has the higher first ionisation enthalpy?",
  "nitrogen, because of its half-filled $2p$ subshell", ["oxygen", "they are equal", "oxygen, because of higher nuclear charge only"],
  "N ($2s^22p^3$) has extra stability from the half-filled $p$ subshell, so its first ionisation enthalpy exceeds that of O.")
S(c, "M", "The most negative electron gain enthalpy among the halogens is that of",
  "chlorine", ["fluorine", "bromine", "iodine"],
  "Fluorine's small size causes strong inter-electronic repulsion in the compact $2p$ shell, so Cl has a more negative value.")
S(c, "E", "The most electronegative element is",
  "fluorine", ["chlorine", "oxygen", "caesium"],
  "Electronegativity increases across a period and decreases down a group, so fluorine is highest.")
S(c, "M", "Among the isoelectronic species $\\ce{O^2-}$, $\\ce{F-}$, $\\ce{Na+}$ and $\\ce{Mg^2+}$, the largest ionic radius is that of",
  "$\\ce{O^2-}$", ["$\\ce{F-}$", "$\\ce{Na+}$", "$\\ce{Mg^2+}$"],
  "All have 10 electrons; the species with the lowest nuclear charge (O, Z = 8) holds them least tightly.")
S(c, "E", "The number of elements in the sixth period of the periodic table is",
  "32", ["8", "18", "50"],
  "Periods 1-7 contain 2, 8, 8, 18, 18, 32 and (incomplete) 32 elements.")
S(c, "M", "The element with atomic number 35 belongs to",
  "period 4 and group 17", ["period 3 and group 17", "period 4 and group 7", "period 5 and group 16"],
  "Z = 35 has the configuration $[\\mathrm{Ar}]3d^{10}4s^24p^5$, so it is in the fourth period with seven valence electrons in the $4s4p$ shell: group 17 (bromine).")
S(c, "E", "Diagonal relationship is shown by lithium and",
  "magnesium", ["sodium", "beryllium", "calcium"],
  "Li-Mg, Be-Al and B-Si show similarities owing to similar charge-to-size ratio.")

# ------------------------------------------------------------------ CHE.SBLK
c = "CHE.SBLK"
S(c, "E", "Sodium imparts which colour to a flame?",
  "golden yellow", ["crimson red", "violet", "apple green"],
  "Li gives crimson red, Na golden yellow, K violet, Rb red-violet, Cs blue; Ca gives brick red and Ba apple green.")
S(c, "E", "Heavy water is",
  "$\\ce{D2O}$", ["$\\ce{H2O2}$", "$\\ce{H2O}$ at high pressure", "$\\ce{T2O}$ only"],
  "Heavy water contains deuterium (heavy hydrogen) and is used as a moderator in nuclear reactors.")
N(c, "E", "The number of neutrons in a nucleus of tritium ($^{3}_{1}\\mathrm{H}$) is ______.", 2,
  "Neutrons $=A-Z=3-1=2$.", via=CODE, integer=True)
S(c, "E", "Plaster of Paris is",
  "$\\ce{CaSO4.1/2H2O}$", ["$\\ce{CaSO4.2H2O}$", "$\\ce{CaCO3}$", "$\\ce{Ca(OH)2}$"],
  "It is made by heating gypsum ($\\ce{CaSO4.2H2O}$) at 393 K and sets to a hard mass on adding water.")
S(c, "E", "Lime water turns milky when $\\ce{CO2}$ is passed through it because of the formation of",
  "insoluble $\\ce{CaCO3}$", ["soluble $\\ce{Ca(HCO3)2}$", "$\\ce{CaO}$", "$\\ce{CaCl2}$"],
  "$\\ce{Ca(OH)2 + CO2 -> CaCO3 v + H2O}$; excess $\\ce{CO2}$ re-dissolves the precipitate as $\\ce{Ca(HCO3)2}$.")
S(c, "M", "Alkali metals dissolve in liquid ammonia to give a deep blue solution that is conducting and paramagnetic. The blue colour is due to",
  "ammoniated electrons", ["metal cations only", "$\\ce{NH4+}$ ions", "hydride ions"],
  "$\\ce{M + (x+y)NH3 -> [M(NH3)_x]+ + [e(NH3)_y]-}$; the ammoniated electron absorbs in the visible region.")
S(c, "M", "Among $\\ce{Li+}$, $\\ce{Na+}$, $\\ce{K+}$ and $\\ce{Rb+}$, the ion with the highest hydration enthalpy is",
  "$\\ce{Li+}$", ["$\\ce{Na+}$", "$\\ce{K+}$", "$\\ce{Rb+}$"],
  "The smallest ion has the highest charge density and attracts water molecules most strongly.")
S(c, "E", "Washing soda is",
  "$\\ce{Na2CO3.10H2O}$", ["$\\ce{NaHCO3}$", "$\\ce{NaOH}$", "$\\ce{Na2SO4}$"],
  "Sodium carbonate decahydrate is washing soda, while baking soda is $\\ce{NaHCO3}$.")

# ------------------------------------------------------------------ CHE.POLY
c = "CHE.POLY"
S(c, "E", "Teflon is a polymer of",
  "tetrafluoroethene", ["vinyl chloride", "propene", "styrene"],
  "Teflon ($\\ce{-(CF2-CF2)_n-}$) is prepared by free radical polymerisation of $\\ce{CF2=CF2}$; PVC comes from vinyl chloride.")
S(c, "E", "Nylon-6,6 is prepared by the condensation of",
  "hexamethylenediamine and adipic acid", ["caprolactam alone", "phenol and formaldehyde", "ethylene glycol and terephthalic acid"],
  "Nylon-6,6 is a polyamide with six carbons in each of the two monomers; Dacron (terylene) is made from ethylene glycol and terephthalic acid.")
S(c, "E", "Bakelite is prepared from",
  "phenol and formaldehyde", ["urea and formaldehyde", "melamine and benzene", "styrene and butadiene"],
  "Condensation of phenol and methanal gives the highly cross-linked thermosetting polymer Bakelite.")
S(c, "E", "Natural rubber is a polymer of",
  "isoprene (2-methylbuta-1,3-diene)", ["styrene", "chloroprene", "propene"],
  "Natural rubber is cis-1,4-polyisoprene; vulcanisation with sulphur introduces cross-links to improve elasticity.")
S(c, "M", "A biodegradable polymer made from 3-hydroxybutanoic acid and 3-hydroxypentanoic acid is",
  "PHBV", ["PVC", "Teflon", "polystyrene"],
  "PHBV is a copolyester that decomposes by bacterial action; it is used in speciality packaging and orthopaedic devices.")
S(c, "E", "Soaps are",
  "sodium or potassium salts of long-chain fatty acids", ["sulphonates of alkylbenzenes", "esters of glycerol only", "calcium salts of carboxylic acids that are soluble in water"],
  "Saponification of fats or oils with NaOH gives soap and glycerol; synthetic detergents are alkyl sulphates or sulphonates.")
S(c, "M", "Synthetic detergents are preferred to soaps in hard water because",
  "they do not form insoluble calcium and magnesium salts (scum)", ["they are more acidic", "they are cheaper than water", "they are not surface active"],
  "Soaps precipitate as calcium and magnesium salts of fatty acids; the corresponding detergent salts are soluble.")
S(c, "M", "Aspirin is used as",
  "an analgesic, antipyretic and anti-blood-clotting agent", ["an antibiotic", "an antacid", "a sedative that induces sleep"],
  "Aspirin (acetylsalicylic acid) relieves pain and fever and inhibits platelet aggregation, so it is used in low doses to prevent heart attacks.")

# ------------------------------------------------------------------ CHE.PBLK
c = "CHE.PBLK"
S(c, "E", "In the Haber process, ammonia is manufactured from",
  "nitrogen and hydrogen over an iron catalyst with molybdenum as promoter", ["nitrogen and oxygen at high pressure", "ammonium chloride and sodium hydroxide only", "nitric acid and hydrogen"],
  "$\\ce{N2 + 3H2 <=> 2NH3}$, exothermic with a decrease in moles, so high pressure (about 200 atm) and moderate temperature (about 700 K) are used.")
S(c, "M", "Nitric acid is manufactured by the Ostwald process, in which the first step is the catalytic oxidation of",
  "$\\ce{NH3}$ to $\\ce{NO}$ over platinum-rhodium gauze", ["$\\ce{N2}$ to $\\ce{NO2}$", "$\\ce{NO2}$ to $\\ce{HNO3}$ by heating", "$\\ce{HNO3}$ to $\\ce{N2O5}$"],
  "$\\ce{4NH3 + 5O2 -> 4NO + 6H2O}$, then NO is oxidised to $\\ce{NO2}$, which dissolves in water to give $\\ce{HNO3}$.")
S(c, "E", "In the contact process for sulphuric acid, the catalyst used is",
  "$\\ce{V2O5}$", ["Fe", "Pt gauze", "Ni"],
  "$\\ce{2SO2 + O2 <=> 2SO3}$ over vanadium pentoxide; $\\ce{SO3}$ is absorbed in conc. $\\ce{H2SO4}$ to form oleum.")
S(c, "M", "White phosphorus differs from red phosphorus in that white phosphorus",
  "consists of discrete tetrahedral $\\ce{P4}$ molecules, is more reactive and glows in the dark", ["is polymeric and non-poisonous", "is less reactive than red phosphorus", "does not burn in air"],
  "$\\ce{P4}$ has strained P-P-P angles of $60^\\circ$, so it is very reactive and is stored under water; red phosphorus is a polymeric chain structure.")
S(c, "E", "Which of the following is the strongest oxoacid of chlorine?",
  "$\\ce{HClO4}$", ["$\\ce{HClO}$", "$\\ce{HClO2}$", "$\\ce{HClO3}$"],
  "Acidity increases with the number of oxygen atoms (oxidation state of Cl: +1, +3, +5, +7) as the conjugate base is stabilised.")
S(c, "M", "The shape of $\\ce{XeF4}$ is",
  "square planar", ["tetrahedral", "see-saw", "octahedral"],
  "Xe has 8 valence electrons: 4 bond pairs and 2 lone pairs make an octahedral electron geometry with the lone pairs trans to each other, so the molecule is square planar.")
S(c, "M", "The first noble gas compound was prepared by Neil Bartlett, who obtained",
  "$\\ce{Xe+[PtF6]-}$", ["$\\ce{XeF2}$ only", "$\\ce{KrF4}$", "$\\ce{HeF2}$"],
  "He noticed that $\\ce{PtF6}$ oxidises $\\ce{O2}$ to $\\ce{O2+[PtF6]-}$, and since Xe has nearly the same ionisation enthalpy as $\\ce{O2}$, tried it with xenon.")
S(c, "M", "The correct order of bond dissociation enthalpy of halogen molecules is",
  "$\\ce{Cl2 > Br2 > F2 > I2}$", ["$\\ce{F2 > Cl2 > Br2 > I2}$", "$\\ce{I2 > Br2 > Cl2 > F2}$", "$\\ce{Br2 > Cl2 > F2 > I2}$"],
  "The $\\ce{F-F}$ bond is weak because of lone pair repulsion in the small molecule, so the order is $\\ce{Cl2 > Br2 > F2 > I2}$.")
S(c, "E", "The oxidation state of phosphorus in $\\ce{H3PO4}$ is",
  "+5", ["+3", "+1", "+4"],
  "$3(+1)+x+4(-2)=0$ gives $x=+5$.")
assert 3 * 1 + 5 + 4 * (-2) == 0

# ------------------------------------------------------------------ CHE.DF
c = "CHE.DF"
S(c, "E", "Which transition element exhibits the highest oxidation state of +7 in the first transition series?",
  "manganese", ["chromium", "iron", "copper"],
  "Mn ($3d^54s^2$) shows oxidation states from +2 to +7, as in $\\ce{KMnO4}$.")
S(c, "M", "The intense purple colour of $\\ce{MnO4-}$ is due to",
  "ligand-to-metal charge transfer, since Mn(VII) is $d^0$ and no $d$-$d$ transition is possible", ["$d$-$d$ transitions", "presence of unpaired electrons", "ionisation of potassium"],
  "Mn(VII) has no $d$ electrons, so colour arises from charge transfer from oxygen to the empty $d$ orbitals of Mn.")
S(c, "M", "Lanthanoid contraction is the",
  "steady decrease in ionic radii from La to Lu because of poor shielding by $4f$ electrons", ["increase in ionic radii across the series", "decrease in oxidation states", "decrease in atomic number"],
  "As $4f$ electrons shield poorly, the effective nuclear charge increases with Z, so the radii decrease; as a result, Zr and Hf have nearly identical sizes.")
S(c, "M", "Zinc is not usually considered a transition element because",
  "its $d$ orbitals are completely filled ($3d^{10}$) in the atom and in its common $\\ce{Zn^2+}$ ion", ["it has no $d$ orbitals", "it is a non-metal", "it is a liquid"],
  "The IUPAC definition requires an incompletely filled $d$ subshell in the atom or in one of its common ions.")
S(c, "M", "When an orange solution of potassium dichromate is made alkaline, it turns",
  "yellow, because $\\ce{Cr2O7^2-}$ is converted into $\\ce{CrO4^2-}$", ["green", "colourless", "blue"],
  "$\\ce{Cr2O7^2- + 2OH- <=> 2CrO4^2- + H2O}$; acidification reverses the change.")
mu = lambda n: math.sqrt(n * (n + 2))
assert abs(mu(5) - 5.92) < 0.01
N(c, "M", "The spin-only magnetic moment ($\\sqrt{n(n+2)}$ BM) of $\\ce{Fe^3+}$ ($Z=26$, five unpaired electrons) in BM, to two decimals, is ______.", 5.92,
  "$\\sqrt{5\\times7}=\\sqrt{35}=5.92$ BM.", tol=0.01)

# ------------------------------------------------------------------ CHE.GAS
c = "CHE.GAS"
R = 0.0821
n = 2 * 12.31 / (R * 300)
assert abs(n - 1.0) < 0.01
N(c, "M", "A gas at 2 atm occupies 12.31 L at 300 K. Using $R=0.0821\\ \\mathrm{L\\,atm\\,K^{-1}mol^{-1}}$, the amount of gas in moles (to 1 decimal place) is ______.", 1.0,
  "$n=PV/RT=2\\times12.31/(0.0821\\times300)\\approx1.0$ mol.", tol=0.05)
ratio = math.sqrt(32 / 2)
assert ratio == 4
N(c, "M", "By Graham's law, the ratio of the rate of effusion of hydrogen ($M=2$) to that of oxygen ($M=32$) under the same conditions is ______.", 4,
  "$r_1/r_2=\\sqrt{M_2/M_1}=\\sqrt{32/2}=4$.", integer=True)
S(c, "E", "At constant temperature, the volume of a fixed amount of gas is inversely proportional to its pressure. This is",
  "Boyle's law", ["Charles's law", "Avogadro's law", "Graham's law"],
  "$PV=$ constant at constant $T$ and $n$.")
S(c, "E", "Dalton's law of partial pressures states that the total pressure of a mixture of non-reacting gases is",
  "the sum of the partial pressures of the individual gases", ["the product of their partial pressures", "the average of their partial pressures", "equal to the largest partial pressure"],
  "$P_{total}=p_1+p_2+\\cdots$; the partial pressure equals mole fraction times total pressure.")

# ------------------------------------------------------------------ CHE.SOLID
c = "CHE.SOLID"
S(c, "E", "The number of atoms per unit cell in a face-centred cubic (fcc) lattice is",
  "4", ["1", "2", "6"],
  "$8\\times\\frac18$ (corners) $+\\,6\\times\\frac12$ (faces) $=4$. Simple cubic has 1 and body-centred cubic has 2.")
S(c, "M", "In the rock salt (NaCl) structure, the coordination number of each ion is",
  "6", ["4", "8", "12"],
  "Each $\\ce{Na+}$ is surrounded by six $\\ce{Cl-}$ ions in an octahedral arrangement, and vice versa.")
a_ratio = 4 * (4 / 3) * math.pi / (2 * math.sqrt(2)) ** 3
assert abs(a_ratio - 0.7405) < 1e-3
N(c, "H", "In an fcc lattice the edge length is $a=2\\sqrt2\\,r$ and there are 4 atoms per cell. The packing efficiency (per cent, nearest integer) is ______.", 74,
  "$\\dfrac{4\\times\\frac43\\pi r^3}{(2\\sqrt2 r)^3}=0.7405$, i.e. about 74%.", tol=0.5)
S(c, "M", "The packing efficiency of a simple cubic lattice is",
  "52.4%", ["68%", "74%", "100%"],
  "$\\dfrac{\\frac43\\pi r^3}{(2r)^3}=\\pi/6\\approx0.524$; bcc is 68% and fcc is 74%.")

# ------------------------------------------------------------------ CHE.SURF
c = "CHE.SURF"
S(c, "E", "Physical adsorption (physisorption) differs from chemisorption in that physisorption",
  "involves weak van der Waals forces and is reversible, decreasing with a rise in temperature", ["involves chemical bonds and is irreversible", "increases strongly with temperature", "is highly specific"],
  "Physisorption has low enthalpy of adsorption (20-40 kJ/mol), is non-specific and multilayered; chemisorption involves bond formation and is specific.")
S(c, "E", "The scattering of light by colloidal particles, making the path of a beam visible, is called the",
  "Tyndall effect", ["Brownian movement", "electrophoresis", "Hardy-Schulze effect"],
  "Colloidal particles are large enough to scatter visible light; true solutions do not show it.")
S(c, "M", "For the coagulation of a negatively charged sol, the most effective ion among the following is",
  "$\\ce{Al^3+}$", ["$\\ce{Na+}$", "$\\ce{Ca^2+}$", "$\\ce{Cl-}$"],
  "Hardy-Schulze rule: coagulating power grows with the charge of the ion carrying opposite charge to the sol; $\\ce{Al^3+}>\\ce{Ca^2+}>\\ce{Na+}$.")
S(c, "M", "Which of the following is an emulsion?",
  "milk", ["smoke", "fog", "gold sol"],
  "An emulsion is liquid dispersed in liquid; milk is fat dispersed in water. Smoke is a solid in gas and fog is a liquid in gas.")

# ------------------------------------------------------------------ CHE.METAL
c = "CHE.METAL"
S(c, "E", "Froth flotation is used for the concentration of",
  "sulphide ores", ["oxide ores such as haematite only", "carbonate ores", "native gold only"],
  "The sulphide ore particles are wetted by oil and carried up with the froth, while gangue particles are wetted by water and sink.")
S(c, "E", "Roasting of a sulphide ore such as zinc blende involves",
  "heating strongly in excess of air, converting the sulphide into oxide", ["heating in the absence of air", "reducing the ore with carbon", "dissolving the ore in cyanide"],
  "$\\ce{2ZnS + 3O2 -> 2ZnO + 2SO2}$; calcination is heating in limited or no air, for carbonate and hydrated ores.")
S(c, "M", "In the electrolytic extraction of aluminium (Hall-Héroult process), cryolite is added to",
  "lower the melting point of alumina and increase conductivity", ["act as a reducing agent", "oxidise aluminium", "form a slag with silica"],
  "Pure $\\ce{Al2O3}$ melts at about 2300 K; with cryolite and fluorspar the electrolysis runs at about 1200 K.")
S(c, "M", "Zone refining is based on the principle that",
  "impurities are more soluble in the molten state than in the solid metal", ["the metal is more soluble in impurities", "impurities are volatile", "impurities form a slag"],
  "A moving heater melts a narrow zone; impurities pass into the melt and are swept to one end. The method gives ultra-pure Ge, Si and Ga for semiconductors.")
