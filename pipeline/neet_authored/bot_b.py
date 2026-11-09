"""BOT part B: Transport, Mineral nutrition, Photosynthesis, Respiration, Growth, Sexual reproduction, Genetics."""
from fractions import Fraction as F
from itertools import product

from . import AR, CODE, M, N, S

# ------------------------------------------------------------------ BOT.TRN
c = "BOT.TRN"
S(c, "E", "Movement of substances from a region of higher concentration to lower concentration without expenditure of energy is",
  "diffusion", ["active transport", "bulk flow driven by ATP", "translocation against a gradient"],
  "Diffusion is passive and slow, down a concentration gradient, and needs no metabolic energy; active transport works against a gradient and needs ATP.")
S(c, "M", "Facilitated diffusion of a solute across the plasma membrane",
  "uses carrier or channel proteins and moves the solute down its gradient without ATP", ["moves the solute against its gradient using ATP", "needs no membrane proteins at all", "occurs only for lipid-soluble substances"],
  "Facilitated diffusion is passive: transport proteins give hydrophilic solutes a path, but the direction is set by the concentration gradient and no energy is used.")
S(c, "E", "The water potential of pure water at standard (atmospheric) pressure is taken as",
  "zero", ["positive 1 MPa", "negative, because of solutes", "equal to its osmotic pressure"],
  "Pure water has the highest water potential, set at zero; adding solutes lowers it, making it negative.")
psi_s, psi_p = -0.7, 0.3
psi = round(psi_s + psi_p, 3)
assert psi == -0.4
N(c, "M", "A plant cell has solute potential $-0.7$ MPa and pressure potential $+0.3$ MPa. Its water potential (in MPa) is ______.", psi,
  "$\\psi_w=\\psi_s+\\psi_p=-0.7+0.3=-0.4$ MPa.", tol=0.001)
a, b = -0.5, -0.3
assert b > a
S(c, "M", "Cell A has water potential $-0.5$ MPa and adjacent cell B has $-0.3$ MPa. Water will move",
  "from B to A", ["from A to B", "in neither direction", "in both directions equally"],
  "Water moves from higher (less negative) to lower (more negative) water potential, so from B ($-0.3$) to A ($-0.5$).", via=CODE)
S(c, "E", "When a plant cell is placed in a hypertonic solution, the protoplast shrinks away from the cell wall. This phenomenon is called",
  "plasmolysis", ["deplasmolysis", "guttation", "imbibition"],
  "Water leaves the cell by exosmosis, and the membrane-bound protoplast detaches from the wall: plasmolysis.")
S(c, "M", "The cohesion-tension theory of the ascent of sap was proposed by",
  "Dixon and Joly", ["Ernst Münch", "Jan Ingenhousz", "Stephen Hales"],
  "Dixon and Joly proposed that transpiration pull (tension) transmitted through a continuous water column held by cohesion and adhesion lifts water. Münch proposed the pressure-flow hypothesis for phloem.")
S(c, "M", "Guttation, the loss of water as droplets from leaf margins at night, is due to",
  "root pressure, and the water exudes through hydathodes", ["transpiration through stomata", "cuticular transpiration", "photorespiration"],
  "At night when stomata are closed and soil is moist, root pressure forces water out of special pores (hydathodes) at vein endings.")
S(c, "M", "Stomata open when the guard cells",
  "become turgid, as K$^+$ ions enter and water follows by osmosis", ["lose K$^+$ ions and become flaccid", "lose turgor due to ABA-induced water entry", "have their radial walls become thinner than the inner walls"],
  "Potassium influx lowers the solute potential of guard cells, water enters, they become turgid and the thicker inner walls draw them apart, opening the pore.")
S(c, "M", "The pressure-flow (mass flow) hypothesis explains the translocation of food in phloem as flow from",
  "source to sink along a turgor pressure gradient", ["sink to source along a concentration gradient", "root to leaf due to transpiration pull", "xylem to phloem by active pumping only"],
  "Sugar loaded at a source raises osmotic water entry and turgor in the sieve tube; at the sink unloading lowers turgor, so the sap flows from source to sink.")
S(c, "E", "Which of the following would DECREASE the rate of transpiration?",
  "an increase in atmospheric humidity", ["an increase in temperature", "an increase in wind speed", "a decrease in humidity"],
  "Higher humidity reduces the vapour-pressure gradient between leaf and air, so transpiration slows; heat, wind and dry air accelerate it.")
S(c, "M", "Movement of water from cell to cell through the cell walls and intercellular spaces, without crossing any membrane, is called",
  "apoplastic movement", ["symplastic movement", "transmembrane osmosis", "vacuolar transport"],
  "In the apoplast water moves through walls and spaces; in the symplast it moves via cytoplasm and plasmodesmata. The Casparian strip blocks the apoplast at the endodermis.")
S(c, "H", "A flaccid cell with $\\psi_s=-1.0$ MPa and $\\psi_p=0$ is placed in a solution with $\\psi_w=-0.4$ MPa. Which statement is correct?",
  "Water enters the cell until its pressure potential rises and its water potential equals that of the solution", ["Water leaves the cell because its solute potential is more negative", "No net movement occurs because the cell is flaccid", "The cell becomes plasmolysed"],
  "Initial cell $\\psi_w=-1.0+0=-1.0$ MPa, lower than $-0.4$ MPa, so water enters. Turgor ($\\psi_p$) builds until the cell's $\\psi_w$ matches the solution.", via=CODE)
assert -1.0 + 0 < -0.4

# ------------------------------------------------------------------ BOT.MIN
c = "BOT.MIN"
S(c, "E", "Which of the following is a micronutrient (trace element) for plants?",
  "Zinc", ["Magnesium", "Calcium", "Potassium"],
  "Macronutrients (needed in amounts above about 10 mmol per kg of dry matter) include C, H, O, N, P, S, K, Ca, Mg. Micronutrients include Fe, Mn, Cu, Zn, B, Mo, Cl and Ni.")
S(c, "E", "Soil-less cultivation of plants in a nutrient solution is known as",
  "hydroponics", ["aeroponic grafting", "tissue culture", "vernalisation"],
  "Hydroponics, developed from the work of Julius von Sachs, grows plants with roots in a defined nutrient solution; it helps identify essential elements.")
S(c, "M", "Deficiency symptoms of calcium appear first in young leaves because calcium",
  "is relatively immobile and is not remobilised from older tissues", ["is highly mobile and moves to old leaves", "is not needed by young leaves", "is lost by leaching only from young leaves"],
  "Elements such as N, P, K and Mg are mobile and symptoms appear first in older leaves; Ca, S and Fe are immobile, so young tissues show symptoms first.")
S(c, "M", "Chlorosis in older leaves with veins remaining green is a typical symptom of deficiency of",
  "magnesium", ["calcium", "iron in young leaves only", "boron"],
  "Mg forms the central atom of chlorophyll and is mobile, so deficiency shows as interveinal chlorosis in older leaves first.")
S(c, "M", "The enzymes nitrogenase and nitrate reductase both require the micronutrient",
  "molybdenum", ["manganese", "boron", "zinc"],
  "Molybdenum is a cofactor of nitrogenase (nitrogen fixation) and nitrate reductase (nitrate assimilation).")
S(c, "E", "Leghaemoglobin in root nodules of legumes",
  "scavenges oxygen to protect the oxygen-sensitive nitrogenase", ["fixes nitrogen directly", "carries nitrogen to the shoot", "synthesises nitrate"],
  "Nitrogenase is inactivated by oxygen. Leghaemoglobin, a pink pigment, binds oxygen and keeps the nodule interior at low oxygen levels.")
S(c, "M", "In nitrification, ammonia is oxidised first to nitrite and then to nitrate by, respectively,",
  "*Nitrosomonas/Nitrococcus* and *Nitrobacter*", ["*Nitrobacter* and *Nitrosomonas*", "*Pseudomonas* and *Thiobacillus*", "*Rhizobium* and *Azotobacter*"],
  "Nitrosomonas (or Nitrococcus) converts NH$_3$ to NO$_2^-$, and Nitrobacter converts NO$_2^-$ to NO$_3^-$. Denitrifying bacteria such as *Pseudomonas* return N$_2$ to the air.")
S(c, "M", "Conversion of nitrate in the soil back to molecular nitrogen is carried out by",
  "denitrifying bacteria such as *Pseudomonas* and *Thiobacillus*", ["*Nitrosomonas*", "*Rhizobium*", "*Nitrobacter*"],
  "Denitrification reduces nitrate to N$_2$ in anaerobic conditions; nitrifiers do the opposite and *Rhizobium* fixes N$_2$.")
S(c, "M", "Reductive amination of $\\alpha$-ketoglutaric acid with ammonia gives",
  "glutamic acid", ["aspartic acid", "alanine only", "asparagine"],
  "$\\alpha$-Ketoglutarate + NH$_4^+$ + NADPH gives glutamate (glutamic acid), through glutamate dehydrogenase; other amino acids are then made by transamination.")
S(c, "M", "Nitrogen is transported in the xylem of many plants mainly as the amides",
  "asparagine and glutamine", ["alanine and glycine", "urea and uric acid", "ATP and ADP"],
  "Asparagine and glutamine carry nitrogen with a high N:C ratio and are also produced by amination of aspartic and glutamic acids.")
S(c, "M", "The micronutrient needed for the splitting of water to liberate oxygen during photosynthesis is",
  "manganese (with chloride)", ["molybdenum", "boron", "copper only"],
  "Mn is needed in the oxygen-evolving complex of photosystem II; Cl$^-$ is also an essential co-factor.")
S(c, "M", "Zinc is required by plants for the synthesis of the hormone",
  "auxin (IAA)", ["abscisic acid", "ethylene", "gibberellin only"],
  "Zinc activates several enzymes and is needed for synthesis of indole-3-acetic acid; its deficiency causes 'little leaf'.")
atp_per_n2 = 16
N(c, "H", "In biological nitrogen fixation the overall reaction is $\\mathrm{N_2}+8e^-+8H^++16\\,\\mathrm{ATP}\\to2\\mathrm{NH_3}+\\mathrm{H_2}+16\\,\\mathrm{ADP}+16P_i$. The number of ATP molecules consumed to fix one molecule of N$_2$ is ______.",
  atp_per_n2, "By the balanced equation 16 ATP are hydrolysed per N$_2$ reduced to 2 NH$_3$; this is why nitrogen fixation is an energy-demanding process.", via="second-derivation", integer=True)

# ------------------------------------------------------------------ BOT.PHS
c = "BOT.PHS"
S(c, "E", "In his classic experiment with *Cladophora* and aerobic bacteria, T. W. Engelmann showed that",
  "bacteria collected mainly in the blue and red regions, where photosynthesis (oxygen release) is highest", ["bacteria collected in the green region most", "photosynthesis occurs only in darkness", "oxygen is released only in far-red light"],
  "Engelmann split light with a prism over the alga; aerobic bacteria clustered where oxygen release was highest, giving the first action spectrum: blue and red light.")
S(c, "E", "The reaction centre pigments of photosystems I and II are, respectively,",
  "P700 and P680", ["P680 and P700", "P680 and P680", "P700 and P700"],
  "PS I has chlorophyll a P700 and PS II has chlorophyll a P680, named for their absorption maxima.")
S(c, "E", "Which products are formed by non-cyclic photophosphorylation?",
  "ATP, NADPH and oxygen", ["ATP only", "NADPH only, no ATP", "ATP and CO$_2$"],
  "In the Z-scheme, electrons from water pass through PS II and PS I to NADP$^+$, with ATP made by the proton gradient and O$_2$ released by water splitting.")
S(c, "M", "Cyclic photophosphorylation differs from the non-cyclic type because it",
  "involves only PS I and produces ATP but no NADPH or O$_2$", ["involves PS II only and produces NADPH", "produces both NADPH and oxygen", "occurs in the stroma"],
  "In cyclic flow the electrons excited in PS I return to PS I via the cytochrome complex: ATP is made, but there is no water splitting and no NADPH.")
S(c, "M", "According to the chemiosmotic hypothesis in chloroplasts, ATP is formed when protons",
  "move down their gradient from the thylakoid lumen to the stroma through ATP synthase", ["move from stroma to lumen through ATP synthase", "are pumped into the stroma by NADP reductase", "diffuse freely across the lipid bilayer"],
  "Water splitting and plastoquinone proton transport build up protons in the lumen; their return flow through CF$_0$-CF$_1$ drives ATP synthesis in the stroma.")
S(c, "E", "In C$_3$ plants the first stable product of CO$_2$ fixation is",
  "3-phosphoglyceric acid (3C)", ["oxaloacetic acid (4C)", "ribulose bisphosphate (5C)", "glucose (6C)"],
  "RuBisCO carboxylates RuBP (5C); the unstable 6C product splits into two molecules of 3-PGA, hence C$_3$.")
S(c, "M", "In C$_4$ plants, primary CO$_2$ fixation by PEP carboxylase takes place in",
  "mesophyll cells, forming oxaloacetic acid", ["bundle sheath cells, forming 3-PGA", "guard cells only", "root cells, forming malate"],
  "PEPcase in mesophyll cells fixes CO$_2$ to PEP making OAA (4C); the C$_4$ acid moves to bundle sheath cells where CO$_2$ is released for the Calvin cycle.")
atp_c3 = 3 * 6
nadph_c3 = 2 * 6
assert (atp_c3, nadph_c3) == (18, 12)
N(c, "M", "The Calvin cycle uses 3 ATP and 2 NADPH per CO$_2$ fixed. The number of ATP molecules used to synthesise one glucose molecule in a C$_3$ plant is ______.", atp_c3,
  "One glucose needs 6 CO$_2$ fixed, so $6\\times3=18$ ATP (and $6\\times2=12$ NADPH).", integer=True)
atp_c4 = 5 * 6
assert atp_c4 == 30
N(c, "H", "A C$_4$ plant needs 5 ATP and 2 NADPH per CO$_2$ fixed (the extra 2 ATP regenerate PEP). The ATP needed to make one glucose molecule is ______.", atp_c4,
  "Six CO$_2$ must be fixed, so $6\\times5=30$ ATP.", integer=True)
S(c, "M", "Photorespiration occurs when RuBisCO",
  "acts as an oxygenase at high O$_2$ and low CO$_2$ concentration, in C$_3$ plants", ["acts as a carboxylase at high CO$_2$", "is inhibited completely by light", "is blocked in the mitochondria of C$_4$ plants only"],
  "RuBisCO binds O$_2$ in place of CO$_2$, producing phosphoglycolate and releasing CO$_2$ via chloroplast, peroxisome and mitochondrion, without making ATP or NADPH.")
S(c, "M", "Blackman's law of limiting factors states that",
  "when several factors affect a process, its rate is determined by the factor nearest its minimal value", ["the rate is determined by the factor at its maximum", "all factors affect the rate equally", "only light affects photosynthesis"],
  "The factor in short supply limits the rate; increasing a non-limiting factor gives no further rise.")
AR(c, "H", "C$_4$ plants show very little photorespiration.", "In C$_4$ plants the CO$_2$ concentration is raised around RuBisCO in the bundle sheath cells.", "A",
   "The C$_4$ pathway concentrates CO$_2$ at RuBisCO, so oxygenation is suppressed. Both statements are true and R explains A.")
S(c, "H", "Cornelius van Niel's work on purple sulphur bacteria, which use H$_2$S instead of water, led to the inference that in green plants the oxygen released comes from",
  "water", ["carbon dioxide", "glucose", "chlorophyll"],
  "Bacteria release sulphur from H$_2$S; by analogy, green plants must release O$_2$ from H$_2$O (the equation $\\mathrm{CO_2+2H_2A\\to CH_2O+2A+H_2O}$).")

# ------------------------------------------------------------------ BOT.RESP
c = "BOT.RESP"
S(c, "E", "Glycolysis, the breakdown of glucose to pyruvic acid, occurs in the",
  "cytoplasm", ["mitochondrial matrix", "inner mitochondrial membrane", "chloroplast stroma"],
  "Glycolysis (EMP pathway) takes place in the cytoplasm of all living cells and is the common first step in aerobic and anaerobic respiration.")
N(c, "E", "The net gain of ATP molecules by substrate-level phosphorylation during glycolysis of one glucose molecule is ______.", 2,
  "Two ATP are used in the preparatory phase and four are made in the pay-off phase, a net of $4-2=2$ ATP.", via=CODE, integer=True)
assert 4 - 2 == 2
S(c, "E", "The Krebs cycle begins when acetyl CoA combines with",
  "oxaloacetic acid to form citric acid", ["pyruvic acid to form lactic acid", "glucose to form fructose", "succinic acid to form fumaric acid"],
  "Acetyl CoA (2C) condenses with oxaloacetate (4C) to give citrate (6C), the first step of the TCA cycle in the matrix.")
nadh = 2 + 2 + 6
assert nadh == 10
N(c, "H", "Per glucose molecule, the NADH molecules generated in glycolysis (2), pyruvate to acetyl CoA conversion (2) and the Krebs cycle (6) total ______.", nadh,
  "$2+2+6=10$ NADH (the Krebs cycle also gives 2 FADH$_2$ per glucose, since each acetyl CoA yields 3 NADH and 1 FADH$_2$).", integer=True)
co2 = 2 * 1 + 2 * 2
assert co2 == 6
N(c, "M", "Pyruvate dehydrogenase releases 1 CO$_2$ per pyruvate and each acetyl CoA releases 2 CO$_2$ in the Krebs cycle. The total CO$_2$ released per glucose in the link reaction plus Krebs cycle is ______.", co2,
  "Two pyruvates give $2\\times1=2$ CO$_2$ and two acetyl CoA give $2\\times2=4$ CO$_2$: total 6, matching the six carbons of glucose.", integer=True)
S(c, "E", "The final electron acceptor in the mitochondrial electron transport chain is",
  "oxygen", ["NAD$^+$", "cytochrome c", "ubiquinone"],
  "Electrons passed along complexes I-IV reach complex IV (cytochrome c oxidase), which reduces O$_2$ to water.")
S(c, "E", "In yeast, anaerobic breakdown of pyruvic acid yields",
  "ethanol and CO$_2$", ["lactic acid only", "acetyl CoA and water", "oxaloacetic acid"],
  "Pyruvate decarboxylase forms acetaldehyde and CO$_2$, and alcohol dehydrogenase reduces acetaldehyde to ethanol with NADH. Lactic acid formation occurs in muscle.")
rq = F(6, 6)
assert rq == 1  # C6H12O6 + 6 O2 -> 6 CO2 + 6 H2O
S(c, "M", "The respiratory quotient (RQ) when glucose is completely oxidised in aerobic respiration is",
  "1", ["0.7", "0.9", "greater than 1"],
  "$\\mathrm{C_6H_{12}O_6+6O_2\\to6CO_2+6H_2O}$: $\\mathrm{RQ}=6/6=1$. Fats have RQ below 1 (about 0.7).", via=CODE)
rq_fat = F(102, 145)
assert 0.70 < float(rq_fat) < 0.71  # tripalmitin: 2 C51H98O6 + 145 O2 -> 102 CO2 + 98 H2O
N(c, "H", "For complete oxidation of tripalmitin, $2\\,\\mathrm{C_{51}H_{98}O_6}+145\\,\\mathrm{O_2}\\to102\\,\\mathrm{CO_2}+98\\,\\mathrm{H_2O}$. The RQ, correct to one decimal place, is ______.", 0.7,
  "$\\mathrm{RQ}=102/145\\approx0.70$.", tol=0.05)
S(c, "M", "The Krebs cycle is described as an amphibolic pathway because it",
  "serves both in breakdown (catabolism) and as a source of intermediates for biosynthesis (anabolism)", ["takes place in both cytoplasm and chloroplast", "needs both oxygen and light", "occurs only in plants and animals but not microbes"],
  "TCA intermediates such as OAA and $\\alpha$-ketoglutarate are withdrawn to make amino acids, while fatty acids and proteins can be fed in for oxidation.")
S(c, "M", "ATP synthesis by chemiosmosis in mitochondria takes place by",
  "protons flowing back through ATP synthase (Complex V) in the inner membrane", ["protons moving out through the outer membrane", "NADH dehydrogenase directly phosphorylating ADP", "substrate-level phosphorylation in the cristae"],
  "Complexes I, III and IV pump protons into the intermembrane space; the proton-motive force drives F$_0$-F$_1$ ATP synthase.")
S(c, "M", "Which component is a mobile carrier shuttling electrons from Complex III to Complex IV?",
  "cytochrome c", ["ubiquinone", "Complex V", "FMN"],
  "Ubiquinone ferries electrons from complexes I and II to III, and cytochrome c (a small protein on the outer face of the inner membrane) carries them from III to IV.")

# ------------------------------------------------------------------ BOT.PGD
c = "BOT.PGD"
S(c, "E", "The hormone responsible for apical dominance and promoting rooting in stem cuttings is",
  "auxin", ["abscisic acid", "ethylene", "cytokinin"],
  "Apical-bud auxin suppresses lateral bud growth; synthetic auxins such as IBA and NAA stimulate root formation in cuttings.")
S(c, "M", "Spraying sugarcane with gibberellin increases the yield because it",
  "increases the length of the stem, giving more sugar-rich stalk", ["induces dormancy", "causes leaf abscission", "inhibits cell elongation"],
  "Gibberellins promote internode elongation; they are also used for bolting of rosette plants and malting in brewing.")
S(c, "M", "The hormone that promotes cell division (cytokinesis) and delays senescence of leaves is",
  "cytokinin", ["abscisic acid", "ethylene", "gibberellin"],
  "Cytokinins (zeatin, kinetin) were discovered through culture of tobacco pith by Skoog and Miller; they promote cell division, delay senescence and help shoot formation.")
S(c, "E", "The gaseous plant hormone that hastens fruit ripening is",
  "ethylene", ["auxin", "cytokinin", "gibberellin"],
  "Ethylene promotes ripening, senescence and abscission; ethephon releases ethylene.")
S(c, "E", "The 'stress hormone' that induces stomatal closure and seed dormancy is",
  "abscisic acid", ["auxin", "gibberellic acid", "zeatin"],
  "ABA closes stomata under water deficit, promotes seed dormancy and inhibits seed germination; it acts mostly as a growth inhibitor.")
S(c, "E", "The phases of growth, in order, are",
  "meristematic, elongation, maturation", ["maturation, elongation, meristematic", "elongation, meristematic, maturation", "meristematic, maturation, elongation"],
  "Cells divide in the meristematic zone, enlarge in the elongation zone and then differentiate in the maturation zone.")
L0, r, t = 2.0, 0.5, 10
L = L0 + r * t
assert L == 7.0
N(c, "M", "In arithmetic growth, $L_t=L_0+rt$. A root tip is 2 cm long and grows at $0.5$ cm/day. Its length after 10 days is ______ cm.", L,
  "$L_t=2+0.5\\times10=7$ cm.", tol=0.001)
S(c, "M", "Long-day plants flower when",
  "the photoperiod exceeds a critical length (the dark period is short)", ["the photoperiod is less than a critical length in all cases", "they are exposed to cold for a period", "no light is given"],
  "Flowering responses depend on photoperiod: short-day plants flower below a critical day length and long-day plants above it; perception is by the leaves.")
S(c, "M", "Vernalisation is the promotion of flowering by",
  "prior exposure to low temperature", ["exposure to long days only", "treatment with ethylene gas", "removal of the shoot apex"],
  "Winter varieties of wheat, barley and rye need a cold treatment to flower in the following summer; it substitutes for the winter requirement.")
S(c, "M", "2,4-D, a synthetic auxin, is used as a weedicide chiefly to kill",
  "dicotyledonous weeds in monocot crop fields", ["monocot weeds in dicot fields", "algae in ponds only", "all weeds equally"],
  "2,4-D selectively kills broad-leaved dicot weeds without harming monocot crops such as wheat or maize.")
S(c, "M", "Interfascicular cambium arises in a dicot stem through",
  "dedifferentiation of parenchyma cells between the vascular bundles", ["differentiation of tracheids", "redifferentiation of sieve tubes", "meiosis in the cortex"],
  "Mature parenchyma cells can regain the power of division (dedifferentiation) forming meristems such as interfascicular cambium and cork cambium.")
AR(c, "M", "Removal of the shoot apex promotes the growth of lateral buds.", "Auxin produced by the apical bud inhibits the growth of lateral buds.", "A",
   "Apical dominance is due to auxin from the apex; decapitating removes the source of auxin, so lateral buds sprout. Both are true and R explains A.")
S(c, "H", "A student plots the dry weight of a developing seedling against time and obtains a sigmoid (S-shaped) curve. The correct sequence of the phases is",
  "lag, log (exponential), stationary (senescent)", ["stationary, log, lag", "log, lag, stationary", "lag, stationary, log"],
  "A sigmoid curve has an initial lag phase, a rapid exponential phase and finally a slowing stationary phase as nutrients become limiting.")

# ------------------------------------------------------------------ BOT.SRP
c = "BOT.SRP"
S(c, "E", "A typical angiosperm anther is bilobed and each lobe has",
  "two microsporangia (the anther is tetrasporangiate)", ["one microsporangium", "four megasporangia", "three microsporangia"],
  "Each anther is dithecous (two lobes, each with two chambers), so it has four microsporangia that produce pollen grains.")
S(c, "E", "The innermost wall layer of the microsporangium that nourishes the developing pollen grains is the",
  "tapetum", ["endothecium", "epidermis", "middle layer"],
  "Tapetum cells are multinucleate, dense and secrete nutrients for developing microspores.")
S(c, "M", "The outer wall of a pollen grain, resistant to enzymes, acids and high temperature, is the exine, made of",
  "sporopollenin", ["cellulose and pectin", "chitin", "lignin"],
  "Sporopollenin is one of the most resistant organic materials known; the exine has germ pores where it is absent. The inner intine is cellulose and pectin.")
S(c, "M", "A mature pollen grain at the time of release contains",
  "a vegetative cell and a generative cell", ["only one male gamete", "four sperm nuclei", "a zygote"],
  "Pollen is shed at the 2-celled stage commonly; the generative cell later divides into two male gametes (3-celled in some species).")
N(c, "E", "The number of cells in a mature (Polygonum type) embryo sac is ______.", 7,
  "Three mitoses of the functional megaspore give 8 nuclei; cell walls form such that there are 3 antipodals, 2 synergids, 1 egg and one large central cell with 2 polar nuclei: 7 cells.", via="second-derivation", integer=True)
mitoses = 3
nuc = 2 ** mitoses
assert nuc == 8
N(c, "M", "The functional megaspore undergoes 3 successive free-nuclear mitotic divisions to form the embryo sac. The number of nuclei in the mature embryo sac is ______.", nuc,
  "$2^3=8$ nuclei.", integer=True)
S(c, "E", "In double fertilisation, the fusion of a male gamete with the two polar nuclei yields",
  "a triploid primary endosperm nucleus", ["a diploid zygote", "a haploid egg", "a tetraploid embryo"],
  "One male gamete fuses with the egg (syngamy, 2n zygote); the other fuses with the two polar nuclei (triple fusion) giving the 3n primary endosperm nucleus.")
n_hap = 12
pen = 3 * n_hap
assert pen == 36
N(c, "M", "In a plant with $2n=24$, the number of chromosomes in a cell of the endosperm is ______.", pen,
  "Endosperm is triploid: $3n=3\\times12=36$.", integer=True)
assert -(-100 // 4) == 25
N(c, "M", "The number of pollen mother cells needed to produce 100 pollen grains is ______.", 25,
  "Each microspore mother cell gives a tetrad of four microspores, so $100/4=25$.", integer=True)
S(c, "M", "Pollen grains of wind-pollinated flowers are typically",
  "light, non-sticky and produced in large numbers, with feathery stigmas", ["large, sticky and few in number", "scented with showy petals", "released only underwater"],
  "Anemophilous flowers have light dry pollen in abundance, exposed stamens and a large feathery stigma to catch pollen.")
S(c, "M", "Cleistogamous flowers such as those of *Viola* and *Commelina* always set seed because",
  "they never open, so pollination is autogamous", ["they are pollinated by insects at night", "they need cross-pollen", "they produce no gametes"],
  "Cleistogamous flowers remain closed; anthers and stigma lie close so pollination is within the flower, ensuring seed set even without pollinators.")
S(c, "M", "Fruit formation without fertilisation, as in banana, is called",
  "parthenocarpy", ["apomixis", "polyembryony", "vivipary"],
  "Parthenocarpic fruits are seedless; apomixis is seed formation without fertilisation, and polyembryony is more than one embryo in a seed.")
S(c, "H", "In black pepper and beet, a remnant of the nucellus persists in the mature seed. This tissue is called",
  "perisperm", ["endosperm", "chalaza", "tegmen"],
  "Perisperm is the persistent nucellus; endosperm is formed from the primary endosperm nucleus after triple fusion.")
S(c, "M", "The 'coconut water' of a tender coconut is",
  "free-nuclear endosperm, and the surrounding white kernel is cellular endosperm", ["cellular endosperm only", "perisperm", "the embryo"],
  "In coconut the endosperm nuclei divide first without wall formation (a coenocyte, the water) and later form cells at the periphery.")
S(c, "M", "The synergids at the micropylar end of the embryo sac have",
  "special cellular thickenings called the filiform apparatus that guide the pollen tube", ["starch grains that nourish the zygote", "the polar nuclei", "tubular chloroplasts"],
  "Synergids with the egg form the egg apparatus; the filiform apparatus directs pollen tube entry.")

# ------------------------------------------------------------------ BOT.GEN
c = "BOT.GEN"
S(c, "E", "Gregor Mendel conducted his hybridisation experiments on",
  "garden pea, *Pisum sativum*", ["*Drosophila melanogaster*", "maize", "*Neurospora*"],
  "Mendel studied seven contrasting pairs of traits in garden pea over about seven years; it has distinct traits, self-pollinates and has a short life cycle.")
S(c, "E", "A cross between an F$_1$ plant and its homozygous recessive parent is called a",
  "test cross", ["back cross to dominant parent only", "reciprocal cross", "dihybrid cross"],
  "A test cross reveals whether the dominant phenotype parent is homozygous (all dominant) or heterozygous (1:1).")
# enumerations
def cross(p1, p2):
    out = []
    for a in p1:
        for b in p2:
            out.append("".join(sorted(a + b, key=lambda x: (x.lower(), x.islower()))))
    return out
f2 = cross("Aa", "Aa")
assert sorted(f2) == ["AA", "Aa", "Aa", "aa"]
S(c, "E", "In a monohybrid cross between two heterozygous plants ($\\mathrm{Aa}\\times\\mathrm{Aa}$) with complete dominance, the genotypic ratio of the progeny is",
  "$1:2:1$", ["$3:1$", "$1:1$", "$9:3:3:1$"],
  "Gametes A and a combine as AA, Aa, Aa, aa, giving $1:2:1$ genotypes and $3:1$ phenotypes.", via=CODE)
S(c, "M", "In snapdragon (incomplete dominance), a cross between two pink-flowered F$_1$ plants gives red, pink and white offspring in the ratio",
  "$1:2:1$", ["$3:1$", "$1:1:1:1$", "$9:3:3:1$"],
  "With incomplete dominance the heterozygote is intermediate (pink), so the phenotypic ratio matches the genotypic ratio $1:2:1$.")
ab = set()
for p in product("AB", repeat=1):
    pass
# blood groups: parents A (IAi) x B (IBi)
kids = {frozenset(x + y) for x in ("IA", "i") for y in ("IB", "i")}
grp = set()
for x in (("A", "i"), ):
    pass
def group(g1, g2):
    s = {g1, g2}
    if s == {"A", "B"}:
        return "AB"
    if "A" in s:
        return "A"
    if "B" in s:
        return "B"
    return "O"
groups = {group(x, y) for x in ("A", "i") for y in ("B", "i")}
assert groups == {"A", "B", "AB", "O"}
S(c, "M", "A man with blood group A (genotype $I^Ai$) marries a woman with blood group B (genotype $I^Bi$). Their children can have blood group(s)",
  "A, B, AB or O", ["A or B only", "AB only", "A, B or AB only"],
  "Gametes: $I^A$ or $i$ from father, $I^B$ or $i$ from mother. Combinations: $I^AI^B$ (AB), $I^Ai$ (A), $I^Bi$ (B), $ii$ (O): all four groups.", via=CODE)
groups2 = {group(x, y) for x in ("A", "A") for y in ("B", "i")}
S(c, "H", "A man of blood group O marries a woman of blood group AB. Their children can be of blood group(s)",
  "A or B only", ["O or AB only", "A, B or O", "AB only"],
  "The man is $ii$; the woman is $I^AI^B$. Children are $I^Ai$ (A) or $I^Bi$ (B). No child can be AB or O.", via=CODE)
assert {group(x, "i") for x in ("A", "B")} == {"A", "B"}
n_gam = lambda g: 2 ** sum(1 for i in range(0, len(g), 2) if g[i] != g[i + 1])
assert n_gam("AaBbCc") == 8 and n_gam("AaBBCc") == 4
N(c, "M", "The number of different types of gametes formed by an individual of genotype $\\mathrm{AaBbCc}$ (genes on different chromosomes) is ______.", 8,
  "Each heterozygous gene pair doubles the types: $2^3=8$.", integer=True)
N(c, "M", "The number of different gamete types produced by $\\mathrm{AaBBCc}$ (independent assortment) is ______.", 4,
  "Only Aa and Cc are heterozygous; BB gives one type, so $2^2=4$.", integer=True)
gen = {x + y for x in "AaBb"[0:2] for y in "AaBb"[0:2]}
dih = {(g1, g2) for g1 in ("AA", "Aa", "aa") for g2 in ("BB", "Bb", "bb")}
assert len(dih) == 9
N(c, "M", "In the cross $\\mathrm{AaBb}\\times\\mathrm{AaBb}$ (complete dominance, independent assortment), the number of different genotypes among the progeny is ______.", 9,
  "$3$ genotypes for each gene give $3\\times3=9$ genotypes (and 4 phenotypes).", integer=True)
p = F(1, 4) * F(1, 4)
assert p == F(1, 16)
N(c, "M", "In $\\mathrm{AaBb}\\times\\mathrm{AaBb}$, the probability of an offspring being $\\mathrm{aabb}$ is (as a decimal) ______.", 0.0625,
  "$P(aa)=1/4$ and $P(bb)=1/4$, independent, so $1/16=0.0625$.", tol=0.0001)
q = F(3, 4) ** 3
assert q == F(27, 64)
N(c, "H", "Two heterozygous parents ($\\mathrm{Aa}\\times\\mathrm{Aa}$, complete dominance) have three children. The probability that all three show the dominant phenotype is (decimal, 3 places) ______.", 0.422,
  "$P(\\text{dominant})=3/4$ per child, so $(3/4)^3=27/64=0.4219\\approx0.422$.", tol=0.001)
# X-linked: carrier mother x normal father
mother, father = ("XC", "Xc"), ("XC", "Y")
kids = [(m, f) for m in mother for f in father]
sons = [k for k in kids if "Y" in k]
cb_sons = [k for k in sons if k[0] == "Xc"]
assert F(len(cb_sons), len(sons)) == F(1, 2)
S(c, "M", "A normal-visioned woman whose father was colour-blind (X-linked recessive) marries a normal man. The probability that a son is colour-blind is",
  "$1/2$", ["$0$", "$1/4$", "$1$"],
  "The woman is a carrier ($X^CX^c$) and the man is $X^CY$. Sons receive either $X^C$ or $X^c$ from the mother, so half the sons are colour-blind; no daughter is affected.", via=CODE)
mother, father = ("XC", "Xc"), ("Xc", "Y")
daus = [(m, f) for m in mother for f in father if "Y" not in (m, f)]
aff = [d for d in daus if d == ("Xc", "Xc")]
assert F(len(aff), len(daus)) == F(1, 2)
S(c, "H", "A carrier woman ($X^CX^c$) marries a colour-blind man ($X^cY$). The probability that a daughter is colour-blind is",
  "$1/2$", ["$0$", "$1/4$", "$1$"],
  "Daughters receive $X^c$ from the father and $X^C$ or $X^c$ from the mother with equal chance, so half of the daughters are $X^cX^c$ (colour-blind).", via=CODE)
S(c, "E", "Down syndrome is caused by",
  "trisomy of chromosome 21, giving 47 chromosomes", ["monosomy of the X chromosome", "an extra X chromosome in males", "trisomy of chromosome 13 only"],
  "Down syndrome results from an extra copy of chromosome 21 (non-disjunction); Turner syndrome is 45, XO and Klinefelter syndrome is 47, XXY.")
N(c, "E", "The total number of chromosomes in a person with Klinefelter's syndrome (XXY) is ______.", 47,
  "$44$ autosomes $+\\,\\mathrm{XXY}=47$ chromosomes.", via="second-derivation", integer=True)
S(c, "M", "A single gene producing multiple, apparently unrelated phenotypic effects, as with the gene for phenylketonuria, is called",
  "pleiotropy", ["epistasis", "codominance", "linkage"],
  "Pleiotropic genes affect more than one trait; the PKU mutation affects phenylalanine hydroxylase and causes mental retardation and reduced skin pigment.")
S(c, "M", "Sickle-cell anaemia is caused by",
  "a single base substitution leading to replacement of glutamic acid by valine at the sixth position of the $\\beta$-globin chain", ["deletion of the alpha-globin gene", "an extra chromosome 21", "a sex-linked dominant gene"],
  "The $\\mathrm{GAG}\\to\\mathrm{GUG}$ change gives HbS in homozygotes ($\\mathrm{Hb^SHb^S}$); it is an autosomal recessive trait.")
S(c, "M", "Thalassaemia is a",
  "quantitative defect: reduced synthesis of one of the globin chains", ["qualitative defect: an altered amino acid in $\\beta$-chain", "sex-linked dominant disorder", "chromosomal disorder due to trisomy"],
  "Thalassaemia is an autosomal recessive disorder due to mutations reducing globin chain synthesis; sickle-cell anaemia is the qualitative defect.")
N(c, "H", "In an additive polygenic trait controlled by three gene pairs ($\\mathrm{AaBbCc}\\times\\mathrm{AaBbCc}$), the number of distinct phenotypic classes in the progeny (by number of contributing alleles) is ______.", 7,
  "The number of contributing alleles ranges over $0,1,\\dots,6$, which gives $7$ classes with frequencies $1:6:15:20:15:6:1$.", integer=True)
assert [1, 6, 15, 20, 15, 6, 1] == [__import__("math").comb(6, k) for k in range(7)]
rf = 100 * 20 / 200
assert rf == 10
N(c, "M", "In a test cross of a dihybrid, 200 progeny are obtained, of which 20 are recombinants. The recombination frequency (%) is ______.", rf,
  "$\\text{RF}=(20/200)\\times100=10\\%$, i.e. 10 map units (cM) between the genes.", tol=0.01)
S(c, "M", "Genes located close together on the same chromosome show",
  "fewer recombinants, because tight linkage reduces crossing over between them", ["more recombinants than loosely linked genes", "independent assortment", "no linkage at all"],
  "Morgan showed that tightly linked genes tend to be inherited together; the farther apart two genes lie, the more often they recombine.")
