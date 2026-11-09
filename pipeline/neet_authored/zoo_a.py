"""ZOO part A: Animal kingdom, Structural organisation, Biomolecules, Digestion, Breathing, Circulation, Excretion."""
from . import AR, CODE, M, N, S

# ------------------------------------------------------------------ ZOO.ANK
c = "ZOO.ANK"
S(c, "E", "Water enters the body of a sponge through minute pores and leaves through the large opening called the",
  "osculum", ["spongocoel", "choanocyte", "ostium"],
  "In sponges (Porifera) water enters through the ostia (numerous pores), flows through the spongocoel and exits through the osculum; choanocytes line the canals and spongocoel.")
S(c, "E", "Cnidarians possess stinging cells that are used for anchorage, defence and capture of prey. These are called",
  "cnidoblasts (cnidocytes)", ["choanocytes", "flame cells", "solenocytes"],
  "Cnidoblasts contain nematocysts; Cnidaria (e.g. *Hydra*, *Aurelia*) are diploblastic with tissue-level organisation.")
S(c, "M", "Which of the following animals has eight external rows of ciliated comb plates for locomotion and shows bioluminescence?",
  "*Pleurobrachia* (comb jelly)", ["*Hydra*", "*Aurelia*", "*Physalia*"],
  "Ctenophores such as *Pleurobrachia* and *Ctenoplana* are marine, radially symmetrical, diploblastic, with comb plates and bioluminescence; they lack cnidoblasts.")
S(c, "E", "Flame cells are the excretory and osmoregulatory structures of",
  "flatworms (Platyhelminthes)", ["annelids", "arthropods", "echinoderms"],
  "Platyhelminthes such as *Taenia* and *Fasciola* are dorso-ventrally flattened, acoelomate animals with flame cells; annelids have nephridia and insects have Malpighian tubules.")
S(c, "M", "The body cavity of roundworms (Aschelminthes), such as *Ascaris*, is a",
  "pseudocoelom", ["true coelom", "haemocoel formed as an open sinus", "no body cavity at all"],
  "In pseudocoelomates the body cavity is not fully lined by mesoderm; the mesoderm is scattered as patches between ectoderm and endoderm. Annelids have a true coelom.")
S(c, "E", "Metameric segmentation, in which the body is externally and internally divided into segments, is a feature of",
  "Annelida", ["Mollusca", "Cnidaria", "Porifera"],
  "Annelids such as *Pheretima* (earthworm) and *Hirudinaria* (leech) show metamerism and have a true coelom and nephridia.")
S(c, "E", "The largest phylum of the animal kingdom, characterised by jointed appendages and a chitinous exoskeleton, is",
  "Arthropoda", ["Mollusca", "Chordata", "Annelida"],
  "More than two-thirds of all named species are arthropods; they have an open circulatory system and Malpighian tubules (insects).")
S(c, "M", "A rasping organ, the radula, used for feeding is found in",
  "Mollusca", ["Echinodermata", "Annelida", "Platyhelminthes"],
  "Molluscs have a soft body covered by a calcareous shell and a muscular foot, and most have a radula (e.g. *Pila*, *Octopus*, *Pinctada*).")
S(c, "M", "The water vascular system, which helps in locomotion, capture and transport of food and respiration, is characteristic of",
  "Echinodermata", ["Arthropoda", "Hemichordata", "Cnidaria"],
  "Echinoderms (e.g. *Asterias*, *Echinus*, *Antedon*) have an endoskeleton of calcareous ossicles and a water vascular system with tube feet; adults are radially symmetrical.")
S(c, "E", "Which of the following features is found in all chordates at some stage of their life?",
  "notochord, dorsal hollow nerve cord and pharyngeal gill slits", ["a vertebral column", "a four-chambered heart", "jaws and paired fins"],
  "Chordates have a notochord, dorsal hollow nerve cord, paired pharyngeal gill slits, a post-anal tail and a closed circulatory system; a vertebral column appears only in vertebrates.")
S(c, "M", "Which of the following is a jawless vertebrate?",
  "*Petromyzon* (lamprey)", ["*Scoliodon*", "*Exocoetus*", "*Labeo*"],
  "Cyclostomes (*Petromyzon*, *Myxine*) have a sucking circular mouth without jaws; *Scoliodon* is cartilaginous and *Exocoetus* and *Labeo* are bony fishes.")
S(c, "M", "Placoid scales, a ventral mouth and no air bladder are characters of",
  "Chondrichthyes (cartilaginous fishes)", ["Osteichthyes", "Cyclostomata", "Amphibia"],
  "Cartilaginous fishes such as *Scoliodon* and *Pristis* have a cartilaginous endoskeleton and skin with placoid scales; they must swim constantly to avoid sinking since they lack an air bladder.")
S(c, "M", "Which of the following mammals lays eggs?",
  "*Ornithorhynchus* (platypus)", ["*Macropus* (kangaroo)", "*Pteropus* (flying fox)", "*Panthera* (lion)"],
  "Mammals are generally viviparous, but monotremes such as the platypus and echidna are oviparous; kangaroos are marsupials that give birth to young and carry them in a pouch.")
S(c, "H", "Match animal groups to their heart type: which animal group has a four-chambered heart?",
  "Aves", ["Pisces", "Amphibia", "most Reptilia (except crocodiles)"],
  "Fish have a 2-chambered heart, amphibians and most reptiles 3-chambered (two atria, one ventricle), while crocodiles, birds and mammals have a 4-chambered heart.")

# ------------------------------------------------------------------ ZOO.STR
c = "ZOO.STR"
S(c, "E", "Which epithelium lines the lumen of the stomach and intestine and helps in secretion and absorption?",
  "simple columnar epithelium", ["simple squamous epithelium", "stratified squamous epithelium", "pseudostratified ciliated epithelium"],
  "Simple columnar epithelium is composed of tall, slender cells with microvilli in the intestine; squamous epithelium lines alveoli and blood vessels.")
S(c, "E", "Which of the following types of cell junctions facilitates cell-to-cell communication by connecting the cytoplasm of adjacent cells?",
  "gap junctions", ["tight junctions", "adhering junctions", "desmosome-free junctions"],
  "Gap junctions form channels that allow the rapid transfer of ions, small molecules and sometimes big molecules; tight junctions prevent leakage of substances across a tissue.")
S(c, "E", "Tendons connect",
  "skeletal muscles to bones", ["bones to bones", "muscles to muscles", "nerves to muscles"],
  "Tendons are dense regular connective tissue connecting muscle to bone; ligaments connect bone to bone.")
S(c, "E", "Which tissue is striated, involuntary and has intercalated discs?",
  "cardiac muscle", ["skeletal muscle", "smooth muscle", "nervous tissue"],
  "Cardiac muscle fibres are branched and joined by intercalated discs, which allow rapid spread of excitation; skeletal muscle is voluntary and striated; smooth muscle is involuntary and non-striated.")
S(c, "M", "Adipose tissue is a type of",
  "loose connective tissue with cells specialised to store fat", ["epithelial tissue", "dense regular connective tissue", "muscular tissue"],
  "Adipose tissue lies beneath the skin and stores fat in its cells (adipocytes); areolar tissue and adipose tissue both belong to loose connective tissue.")
S(c, "M", "The clitellum of the earthworm *Pheretima posthuma*, a glandular band, is found in segments",
  "14 to 16", ["1 to 3", "26 to 28", "6 to 9"],
  "The clitellum (segments 14-16) divides the body into pre-clitellar, clitellar and post-clitellar regions; spermathecae are in segments 6-9.")
S(c, "M", "The earthworm excretes nitrogenous waste mainly as",
  "urea (ureotelic)", ["uric acid", "ammonia only", "creatinine"],
  "*Pheretima* is ureotelic and excretes via nephridia; cockroach is uricotelic.")
S(c, "M", "In the cockroach, excretion is carried out by",
  "Malpighian tubules, which remove nitrogenous waste mainly as uric acid", ["nephridia that remove ammonia", "kidneys with nephrons", "flame cells"],
  "Malpighian tubules at the junction of mid- and hindgut absorb waste from the haemolymph and eliminate it as uric acid, so the cockroach is uricotelic.")
S(c, "H", "The circulatory system of the cockroach is",
  "open, with a heart of 13 chambers, and blood (haemolymph) filling a haemocoel", ["closed, with a four-chambered heart", "closed, with a two-chambered heart", "absent"],
  "In cockroaches the heart is a muscular tube with 13 funnel-shaped chambers; blood lacks haemoglobin and flows into sinuses (haemocoel).")
S(c, "M", "The forewings of the cockroach, which are opaque, dark and leathery, are called",
  "tegmina", ["elytra", "halteres", "alula"],
  "In *Periplaneta americana* the first pair of wings (mesothoracic) are tegmina; the transparent hindwings are used for flight.")
S(c, "M", "The frog has a",
  "three-chambered heart with two atria and one ventricle", ["two-chambered heart", "four-chambered heart", "single-chambered heart"],
  "The frog (*Rana tigrina*) has a three-chambered heart; the sinus venosus receives blood and opens into the right atrium. Frogs are ureotelic.")
S(c, "M", "Gizzard of the cockroach contains",
  "chitinous teeth that grind the food", ["digestive enzymes for starch", "bile ducts", "gastric caeca"],
  "The foregut includes the crop (storage) and the gizzard, which has an outer layer of thick muscles and an inner cuticle with six chitinous plate-like teeth.")
S(c, "H", "Which of the following correctly describes the tissue that forms the lining of the lumen of the nephron's proximal convoluted tubule?",
  "brush border cuboidal epithelium", ["simple squamous epithelium", "ciliated columnar epithelium", "stratified squamous epithelium"],
  "The PCT is lined by simple cuboidal brush-border epithelium that increases the surface area for reabsorption.")

# ------------------------------------------------------------------ ZOO.BMOL
c = "ZOO.BMOL"
S(c, "E", "In proteins, amino acids are linked by",
  "peptide bonds", ["glycosidic bonds", "ester bonds", "phosphodiester bonds"],
  "A peptide bond forms between the carboxyl group of one amino acid and the amino group of the next with loss of water.")
n_aa = 100
assert n_aa - 1 == 99
N(c, "E", "The number of peptide bonds in a linear polypeptide made of 100 amino acids is ______.", 99,
  "A linear chain of $n$ amino acids has $n-1$ peptide bonds: $100-1=99$.", integer=True)
S(c, "E", "Haemoglobin, made of four polypeptide chains, is an example of a protein with",
  "quaternary structure", ["only primary structure", "only secondary structure", "tertiary structure alone"],
  "Haemoglobin consists of two $\\alpha$ and two $\\beta$ subunits; the arrangement of multiple chains is quaternary structure.")
Vmax, Km = 100, 2
v = lambda s: Vmax * s / (Km + s)
assert v(2) == 50 and abs(v(6) - 75) < 1e-9
N(c, "M", "An enzyme obeys $v=V_{max}[S]/(K_m+[S])$ with $V_{max}=100$ units and $K_m=2$ mM. The reaction velocity at $[S]=6$ mM is ______ units.", 75,
  "$v=100\\times6/(2+6)=75$ units. At $[S]=K_m$ the velocity would be $V_{max}/2$.", tol=0.001)
S(c, "M", "The Michaelis constant $K_m$ of an enzyme is the",
  "substrate concentration at which the reaction velocity is half of $V_{max}$", ["substrate concentration at which $V_{max}$ is reached", "enzyme concentration at which the reaction stops", "temperature at which the enzyme is denatured"],
  "Setting $v=V_{max}/2$ in the Michaelis-Menten equation gives $[S]=K_m$.", via=CODE)
S(c, "M", "A competitive inhibitor of an enzyme",
  "resembles the substrate in structure and its effect is reduced by increasing the substrate concentration", ["binds irreversibly to a site far from the active site", "increases $V_{max}$", "is always a product of the reaction"],
  "Competitive inhibitors compete for the active site, e.g. malonate for succinic dehydrogenase; raising the substrate concentration overcomes the inhibition.")
S(c, "M", "Enzymes that catalyse the joining of two substrates using energy from ATP hydrolysis are",
  "ligases", ["hydrolases", "lyases", "isomerases"],
  "Class 6 enzymes, ligases, link two compounds with the use of ATP, e.g. DNA ligase; hydrolases break bonds with water and lyases cleave bonds without water.")
S(c, "M", "Enzymes that catalyse the removal of groups from substrates by cleaving C-C, C-O or C-N bonds, leaving double bonds, are",
  "lyases", ["hydrolases", "transferases", "ligases"],
  "Lyases cleave bonds by means other than hydrolysis, e.g. aldolase; hydrolases use water.")
S(c, "M", "Zinc is a cofactor of the enzyme",
  "carboxypeptidase", ["catalase", "NAD-dependent dehydrogenases", "amylase"],
  "Metal ions can be enzyme cofactors: zinc for carboxypeptidase. Haem is the prosthetic group of catalase, and NAD is a coenzyme.")
S(c, "E", "The most abundant protein in the whole biosphere is",
  "RuBisCO", ["collagen", "haemoglobin", "insulin"],
  "RuBisCO is the most abundant protein in the whole biosphere, while collagen is the most abundant protein in the animal world.")
S(c, "E", "A nucleoside consists of",
  "a nitrogenous base and a pentose sugar", ["a base, a sugar and a phosphate group", "a sugar and a phosphate only", "a base and a phosphate only"],
  "Nucleoside = base + sugar; nucleotide = nucleoside + phosphate. Nucleotides are joined by phosphodiester bonds.")
S(c, "E", "Which of the following are purines?",
  "adenine and guanine", ["cytosine and thymine", "thymine and uracil", "cytosine and uracil"],
  "Purines (adenine, guanine) have a double ring; pyrimidines (cytosine, thymine, uracil) have a single ring.")
S(c, "M", "Inulin, a polysaccharide, is a polymer of",
  "fructose", ["glucose", "galactose", "N-acetylglucosamine"],
  "Inulin is a fructose polymer; starch, glycogen and cellulose are polymers of glucose, and chitin has N-acetylglucosamine.")
S(c, "M", "Which of the following is a secondary metabolite?",
  "morphine", ["glucose", "amino acids", "nucleotides"],
  "Primary metabolites (sugars, amino acids, lipids, nucleotides) have identifiable roles in normal physiological processes; alkaloids such as morphine and codeine, pigments, drugs and rubber are secondary metabolites.")
S(c, "H", "An enzyme-catalysed reaction differs from the same reaction without enzyme in that the enzyme",
  "lowers the activation energy but does not change the equilibrium of the reaction", ["raises the activation energy", "shifts the equilibrium towards products", "is consumed in the reaction"],
  "Enzymes lower the energy barrier and speed approach to equilibrium; they are not used up and do not alter the free energy change or the equilibrium position.")

# ------------------------------------------------------------------ ZOO.DIG
c = "ZOO.DIG"
adult = {"I": 2, "C": 1, "PM": 2, "M": 3}
teeth = 2 * 2 * sum(adult.values())
assert teeth == 32
N(c, "E", "The adult human dental formula is $\\frac{2123}{2123}$ (incisors, canines, premolars, molars in one half of each jaw). The total number of teeth in an adult is ______.", teeth,
  "Each half-jaw has $2+1+2+3=8$ teeth; four half-jaws give $4\\times8=32$.", integer=True)
S(c, "E", "Salivary amylase begins the digestion of",
  "starch, into maltose", ["proteins into peptones", "fats into fatty acids", "cellulose into glucose"],
  "Saliva (pH about 6.8) contains the enzyme salivary amylase that acts on starch in the mouth.")
S(c, "E", "The innermost layer of the wall of the alimentary canal is the",
  "mucosa", ["serosa", "muscularis", "submucosa"],
  "From outside inward: serosa, muscularis, submucosa and mucosa.")
S(c, "M", "In the gastric glands, HCl and intrinsic factor are secreted by",
  "parietal (oxyntic) cells", ["chief (peptic) cells", "goblet cells", "Brunner's gland cells"],
  "Parietal cells secrete HCl and intrinsic factor (needed for absorption of vitamin B$_{12}$); chief cells secrete pepsinogen; mucous cells secrete mucus.")
S(c, "M", "Pepsinogen is converted to the active enzyme pepsin by",
  "hydrochloric acid", ["bile salts", "enterokinase", "salivary amylase"],
  "HCl provides the acidic pH (about 1.8) and activates pepsinogen to pepsin, which converts proteins into proteoses and peptones.")
S(c, "M", "Trypsinogen of the pancreatic juice is activated by",
  "enterokinase secreted by the intestinal mucosa", ["pepsin", "bile", "gastrin"],
  "Enterokinase converts trypsinogen into trypsin, which then activates the other zymogens such as chymotrypsinogen.")
S(c, "E", "Bile",
  "contains no digestive enzymes but its salts emulsify fats", ["contains lipase", "is produced by the gallbladder", "digests proteins"],
  "Bile is made in the liver and stored in the gallbladder; bile salts break large fat globules into micelles, increasing the surface for lipase action.")
S(c, "M", "The hormone released by the duodenum that stimulates the gallbladder to release bile and the pancreas to release enzymes is",
  "cholecystokinin (CCK)", ["gastrin", "secretin only", "thyroxine"],
  "CCK acts on the pancreas and gallbladder; secretin acts on the pancreas to secrete water and bicarbonate; gastrin acts on gastric glands.")
S(c, "M", "Fatty acids and glycerol absorbed in the intestinal villi are first taken to",
  "lacteals, as chylomicrons", ["blood capillaries directly", "the portal vein only", "the bile duct"],
  "They are incorporated into small protein-coated fat globules called chylomicrons that enter the lymph vessels (lacteals) in the villi and reach the blood circulation via lymph.")
S(c, "M", "Glucose and amino acids are absorbed into the blood mainly by",
  "active transport coupled with sodium ions", ["simple diffusion through lipids", "lacteals", "endocytosis only"],
  "Fructose is absorbed by facilitated diffusion; glucose and amino acids are absorbed by sodium-linked active transport.")
S(c, "M", "Kwashiorkor is a form of protein-energy malnutrition due to",
  "protein deficiency, with adequate or near-adequate calorie intake", ["deficiency of both proteins and calories", "deficiency of vitamin C", "excess carbohydrates"],
  "Marasmus results from a deficiency of both proteins and calories, whereas kwashiorkor is caused mainly by protein deficiency.")
S(c, "E", "Yellowing of the skin and eyes in jaundice is due to deposition of",
  "bile pigments, because the liver is affected", ["excess melanin", "glucose", "haemoglobin in the cornea"],
  "In jaundice, bile pigments accumulate in the skin and the whites of the eyes.")
S(c, "H", "Crypts of Lieberkühn and Brunner's glands are found in the",
  "small intestine, as crypts secrete intestinal juice and Brunner's glands are in the duodenum", ["stomach", "large intestine only", "oesophagus"],
  "The intestinal glands (crypts of Lieberkühn) lie between villi; Brunner's glands in the submucosa of the duodenum secrete alkaline mucus.")
S(c, "M", "In the human stomach, the secretion that protects its lining from HCl and from enzymatic damage is",
  "mucus and bicarbonate", ["pepsin", "bile", "pancreatic amylase"],
  "Mucus-bicarbonate secretion forms a layer lubricating and protecting the mucosa from the acidic gastric juice.")

# ------------------------------------------------------------------ ZOO.BRE
c = "ZOO.BRE"
TV, IRV, ERV, RV = 500, 3000, 1100, 1200
VC = ERV + TV + IRV
TLC = VC + RV
FRC = ERV + RV
assert (VC, TLC, FRC) == (4600, 5800, 2300)
N(c, "M", "In a healthy adult, TV $=500$ mL, IRV $=3000$ mL and ERV $=1100$ mL. The vital capacity in mL is ______.", VC,
  "$\\mathrm{VC}=\\mathrm{ERV}+\\mathrm{TV}+\\mathrm{IRV}=1100+500+3000=4600$ mL.", integer=True)
N(c, "M", "If the residual volume is 1200 mL and the vital capacity is 4600 mL, the total lung capacity (mL) is ______.", TLC,
  "$\\mathrm{TLC}=\\mathrm{VC}+\\mathrm{RV}=4600+1200=5800$ mL.", integer=True)
N(c, "M", "With ERV $=1100$ mL and RV $=1200$ mL, the functional residual capacity (mL) is ______.", FRC,
  "$\\mathrm{FRC}=\\mathrm{ERV}+\\mathrm{RV}=2300$ mL.", integer=True)
assert 500 * 12 == 6000
N(c, "E", "A person breathes 12 times per minute with a tidal volume of 500 mL. The pulmonary ventilation (mL per minute) is ______.", 6000,
  "Minute ventilation $=\\mathrm{TV}\\times\\text{rate}=500\\times12=6000$ mL/min.", integer=True)
S(c, "E", "During normal inspiration",
  "the diaphragm contracts and flattens, and the volume of the thoracic cavity increases", ["the diaphragm relaxes and the external intercostals contract", "the pressure in the lungs rises above atmospheric", "the volume of the thoracic cavity decreases"],
  "Contraction of the diaphragm and external intercostals increases thoracic volume; intra-pulmonary pressure falls below atmospheric pressure, so air flows in.")
S(c, "E", "Most of the oxygen (about 97%) in the blood is transported",
  "bound to haemoglobin in red blood cells", ["dissolved in plasma", "as bicarbonate", "bound to albumin"],
  "About 97% of O$_2$ is carried by RBCs as oxyhaemoglobin and about 3% is dissolved in plasma.")
N(c, "E", "The maximum number of oxygen molecules that one molecule of haemoglobin can carry is ______.", 4,
  "Each haemoglobin has four haem groups, each binding one O$_2$ molecule.", via="second-derivation", integer=True)
S(c, "M", "Most of the carbon dioxide (about 70%) is transported in blood as",
  "bicarbonate in the plasma, formed through the action of carbonic anhydrase", ["carbaminohaemoglobin", "dissolved CO$_2$ only", "carbonic acid in lymph"],
  "In RBCs carbonic anhydrase forms H$_2$CO$_3$ from CO$_2$ and water, which dissociates to HCO$_3^-$ and H$^+$; 20-25% is carried as carbamino-haemoglobin and about 7% dissolved.")
S(c, "M", "The oxygen-haemoglobin dissociation curve shifts to the right (lower affinity for O$_2$) when there is",
  "an increase in pCO$_2$, increase in H$^+$ concentration (lower pH) and rise in temperature", ["a decrease in pCO$_2$ and rise in pH", "a fall in temperature", "an increase in pO$_2$ only"],
  "In the tissues, higher pCO$_2$ and H$^+$ and higher temperature favour release of O$_2$ (Bohr effect); in the alveoli the opposite conditions favour binding.")
S(c, "M", "The primary respiratory rhythm centre of the brain is located in the",
  "medulla oblongata", ["pons only", "cerebellum", "hypothalamus"],
  "The respiratory rhythm centre in the medulla is moderated by the pneumotaxic centre in the pons; a chemosensitive area near it detects CO$_2$ and H$^+$.")
S(c, "E", "The partial pressure of CO$_2$ is higher in",
  "deoxygenated blood than in the alveoli, so CO$_2$ diffuses from blood to alveoli", ["alveoli than in deoxygenated blood", "oxygenated blood than in the tissues", "the atmosphere than in alveoli"],
  "pCO$_2$ is about 45 mm Hg in deoxygenated blood and 40 mm Hg in alveoli, so CO$_2$ diffuses out down this gradient even though the gradient is small, owing to the high solubility of CO$_2$.")
S(c, "M", "In emphysema,",
  "the alveolar walls are damaged, reducing the respiratory surface; cigarette smoking is a major cause", ["the bronchi become inflamed with wheezing due to allergy", "the lungs are fibrosed by silica dust only", "the lungs fill with blood"],
  "Emphysema is a chronic disorder with damaged alveolar walls; asthma is inflammation of bronchi and bronchioles; silicosis and asbestosis are occupational lung diseases.")
S(c, "E", "The lungs are covered by a double-layered membrane called the",
  "pleura, with pleural fluid between the layers", ["pericardium", "peritoneum", "meninges"],
  "The pleural fluid reduces friction on the lung surface during breathing.")
S(c, "H", "Which of the following is the primary site of gas exchange in the human lung?",
  "alveoli, a thin simple squamous epithelium with capillaries", ["trachea", "bronchi", "bronchioles"],
  "Alveoli are thin-walled vascularised bag-like structures; the diffusion membrane is made of the squamous epithelium of the alveoli, the endothelium of the capillary and the basement substance between them.")

# ------------------------------------------------------------------ ZOO.CIR
c = "ZOO.CIR"
S(c, "E", "The most abundant WBC in human blood is the",
  "neutrophil", ["eosinophil", "basophil", "monocyte"],
  "Neutrophils form about 60-65% of the total WBCs; lymphocytes follow with 20-25%. Basophils are the least abundant.")
S(c, "E", "The average lifespan of human red blood cells is about",
  "120 days", ["20 days", "12 hours", "1 year"],
  "RBCs are formed in the red bone marrow and destroyed mainly in the spleen (the 'graveyard' of RBCs) after about 120 days.")
S(c, "M", "Which WBCs release histamine and are involved in inflammatory reactions?",
  "basophils", ["neutrophils", "monocytes", "lymphocytes"],
  "Basophils secrete histamine, serotonin and heparin; eosinophils are associated with allergic reactions and resist infections; neutrophils and monocytes are phagocytic.")
S(c, "E", "The universal donor blood group and the universal recipient blood group are, respectively,",
  "O and AB", ["AB and O", "A and B", "O and O"],
  "Blood group O has neither A nor B antigens, so it can be given to all (in terms of red cells); AB has no anti-A or anti-B antibodies in plasma, so it can receive from all.")
S(c, "M", "Erythroblastosis foetalis can occur when",
  "an Rh-negative mother carries an Rh-positive foetus, usually in a later pregnancy", ["an Rh-positive mother carries an Rh-negative foetus", "both parents are Rh-negative", "the mother is group O and the father is group O"],
  "Rh-positive foetal cells entering the mother at delivery sensitise her to produce anti-Rh antibodies, which can cross the placenta in subsequent pregnancies; hence anti-Rh antibody is given to the mother after the first delivery.")
S(c, "E", "In blood clotting, which ions are essential for the conversion of prothrombin to thrombin?",
  "calcium ions", ["sodium ions", "iron ions", "magnesium ions"],
  "Thromboplastin and Ca$^{2+}$ convert prothrombin to thrombin, which converts soluble fibrinogen to fibrin threads that trap blood cells to form a clot.")
S(c, "E", "The pacemaker of the human heart is the",
  "sino-atrial node", ["atrio-ventricular node", "bundle of His", "Purkinje fibres"],
  "The SA node, in the upper right corner of the right atrium, generates the action potentials that initiate each cardiac cycle.")
S(c, "E", "The valve between the left atrium and left ventricle is the",
  "bicuspid (mitral) valve", ["tricuspid valve", "aortic semilunar valve", "pulmonary semilunar valve"],
  "The right AV opening has the tricuspid valve; the left has the bicuspid (mitral) valve.")
sv, hr = 70, 72
co = sv * hr
assert co == 5040
N(c, "M", "A heart pumps a stroke volume of 70 mL at a rate of 72 beats per minute. The cardiac output (mL per minute) is ______.", co,
  "$\\mathrm{CO}=\\mathrm{SV}\\times\\mathrm{HR}=70\\times72=5040$ mL/min (about 5 L/min).", integer=True)
assert 60 / 0.8 == 75
N(c, "M", "If one complete cardiac cycle lasts 0.8 s, the heart rate (beats per minute) is ______.", 75,
  "$60/0.8=75$ beats per minute.", integer=True)
S(c, "M", "In an ECG, the QRS complex represents",
  "depolarisation of the ventricles, the start of ventricular contraction", ["depolarisation of the atria", "repolarisation of the ventricles", "repolarisation of the atria"],
  "The P-wave is atrial depolarisation, the QRS complex is ventricular depolarisation (followed by ventricular systole) and the T-wave is ventricular repolarisation (return of the ventricles to normal).")
S(c, "M", "The first heart sound, 'lub', is associated with",
  "the closure of the tricuspid and bicuspid valves", ["the closure of the semilunar valves", "opening of the aortic valve", "atrial diastole"],
  "The first sound is from closure of the AV valves at the beginning of ventricular systole; the second ('dub') from closure of the semilunar valves at the end of ventricular systole.")
S(c, "E", "The vein that carries blood from the intestine to the liver is the",
  "hepatic portal vein", ["hepatic vein", "renal vein", "inferior vena cava"],
  "The hepatic portal system carries blood from the digestive tract to the liver before it reaches the heart.")
S(c, "M", "Normal blood pressure of a healthy adult is about",
  "120/80 mm Hg", ["140/90 mm Hg", "80/120 mm Hg", "200/120 mm Hg"],
  "120 mm Hg systolic over 80 mm Hg diastolic; a person is hypertensive when the pressure is 140/90 mm Hg or above.")
S(c, "H", "Lymph differs from blood mainly because it",
  "lacks red blood cells and most plasma proteins, and contains lymphocytes", ["contains more RBCs", "lacks WBCs", "carries only oxygen"],
  "Lymph is a colourless fluid with specialised lymphocytes; it carries nutrients, hormones and fats absorbed via lacteals, and drains tissue fluid back to the blood.")

# ------------------------------------------------------------------ ZOO.EXC
c = "ZOO.EXC"
S(c, "E", "Birds and reptiles excrete their nitrogenous waste chiefly as",
  "uric acid", ["ammonia", "urea", "creatinine"],
  "Uricotelic animals (birds, reptiles, insects, land snails) excrete uric acid as a pellet or paste with minimum water loss; ammonotelic ones excrete ammonia and ureotelic ones urea.")
S(c, "E", "Ammonia is the principal nitrogenous waste of",
  "bony fishes and aquatic amphibians", ["human beings", "birds", "reptiles"],
  "Ammonia is highly toxic and needs a lot of water for removal, so ammonotelism is typical of aquatic animals.")
gfr = 125
litres = gfr * 60 * 24 / 1000
assert litres == 180
N(c, "E", "The glomerular filtration rate is about 125 mL/min. The volume of filtrate formed in a day (litres) is ______.", litres,
  "$125\\times60\\times24=180{,}000$ mL $=180$ L per day.", integer=True)
pct = (180 - 1.5) / 180 * 100
assert abs(pct - 99.17) < 0.01
N(c, "M", "If 180 L of filtrate is formed per day and 1.5 L of urine is excreted, the percentage of the filtrate reabsorbed (to 1 decimal place) is ______.", 99.2,
  "$(180-1.5)/180\\times100=99.17\\%\\approx99.2\\%$.", tol=0.1)
S(c, "M", "Reabsorption of nearly all the glucose and amino acids from the glomerular filtrate takes place in the",
  "proximal convoluted tubule", ["distal convoluted tubule", "collecting duct", "descending limb of the loop of Henle only"],
  "The PCT, with its brush-border epithelium, reabsorbs nearly all essential nutrients and 70-80% of electrolytes and water.")
S(c, "M", "The descending limb of the loop of Henle is",
  "permeable to water but almost impermeable to electrolytes", ["impermeable to water and permeable to electrolytes", "permeable to both", "impermeable to both"],
  "The ascending limb is impermeable to water but allows transport of electrolytes; together with the vasa recta they set up the counter-current gradient in the medulla.")
S(c, "M", "Conditional reabsorption of Na$^+$ and water takes place in the distal convoluted tubule and collecting duct under the control of",
  "aldosterone and antidiuretic hormone (ADH)", ["insulin and glucagon", "thyroxine", "adrenaline only"],
  "ADH makes the collecting duct water-permeable; aldosterone promotes Na$^+$ reabsorption in the DCT.")
S(c, "M", "Deficiency of ADH leads to",
  "diabetes insipidus, with passage of large volumes of dilute urine", ["diabetes mellitus", "glycosuria with sweet urine", "oliguria"],
  "Without ADH, water is not reabsorbed in the distal parts, resulting in diuresis and dehydration.")
S(c, "M", "Renin is released by the juxtaglomerular cells when",
  "the glomerular blood pressure or filtration rate falls", ["blood pressure rises sharply", "plasma osmolarity decreases", "urine becomes hypertonic"],
  "Renin converts angiotensinogen to angiotensin I and then II, which raises blood pressure and stimulates aldosterone secretion from the adrenal cortex.")
S(c, "H", "Atrial natriuretic factor (ANF), secreted by the atria of the heart on increased blood pressure, causes",
  "vasodilation and reduces the renin-angiotensin mechanism, acting as a check", ["vasoconstriction and increased aldosterone", "increased reabsorption of Na$^+$", "release of ADH"],
  "ANF opposes the RAAS: it dilates blood vessels, reducing blood pressure.")
S(c, "E", "The maximum osmolarity of the human medullary interstitial fluid, which allows the formation of concentrated urine, is about",
  "1200 mOsm/L", ["300 mOsm/L at the cortex only", "50 mOsm/L", "12 mOsm/L"],
  "The interstitial osmolarity rises from about 300 mOsm/L in the cortex to about 1200 mOsm/L in the inner medulla; this gradient allows the production of urine up to four times concentrated.")
S(c, "E", "Presence of glucose in urine is called",
  "glycosuria", ["ketonuria", "uremia", "haematuria"],
  "Glycosuria and ketonuria (ketone bodies in urine) are indicators of diabetes mellitus.")
S(c, "M", "Kidney stones (renal calculi) are formed of",
  "insoluble masses of crystallised salts such as oxalates", ["accumulated glucose", "dead RBCs", "excess bile"],
  "Renal calculi are crystallised oxalates and other salts that can form in the kidney.")
S(c, "E", "Micturition, the release of urine, is controlled by",
  "the central nervous system and the urinary bladder's stretch receptors", ["the adrenal cortex only", "the pituitary only", "the liver"],
  "Stretch of the bladder wall sends signals to the CNS, which passes motor messages causing contraction of the bladder muscles and relaxation of the urethral sphincter.")
S(c, "H", "Which of the following correctly lists the sequence of the nephron's parts from the glomerulus to the collecting duct?",
  "Bowman's capsule, PCT, loop of Henle, DCT, collecting duct", ["PCT, Bowman's capsule, DCT, loop of Henle, collecting duct", "Bowman's capsule, DCT, loop of Henle, PCT, collecting duct", "loop of Henle, PCT, Bowman's capsule, DCT, collecting duct"],
  "The filtrate passes from Bowman's capsule to the PCT, then the loop of Henle, DCT and the collecting duct.")
