"""BOT part C: Molecular basis, Microbes, Biotechnology (2), Organisms & populations, Ecosystem, Biodiversity."""
import math

from . import AR, CODE, M, N, S

# ------------------------------------------------------------------ BOT.MOL
c = "BOT.MOL"
S(c, "E", "In the Hershey-Chase experiment, bacteriophages were grown with radioactive $^{32}$P and $^{35}$S in separate batches. $^{32}$P labelled the phage",
  "DNA, because DNA contains phosphorus but little or no sulphur", ["protein coat, because proteins contain phosphorus", "both DNA and protein equally", "lipid envelope"],
  "DNA has phosphate groups and no sulphur, while the protein coat contains sulphur (cysteine, methionine) and no phosphorus. Radioactivity inside infected bacteria came from $^{32}$P, showing DNA is the genetic material.")
S(c, "E", "Which of these showed that DNA is the 'transforming principle' in Griffith's experiment?",
  "Avery, MacLeod and McCarty, by purifying biochemicals from heat-killed S cells", ["Meselson and Stahl", "Hershey and Chase only", "Watson and Crick"],
  "Griffith showed transformation of R cells by heat-killed S cells; Avery, MacLeod and McCarty identified DNA as the transforming agent, since protease and RNase did not destroy activity but DNase did.")
a_pct = 30
g_pct = (100 - 2 * a_pct) / 2
assert g_pct == 20
N(c, "E", "In a double-stranded DNA 30% of the bases are adenine. The percentage of guanine is ______.", g_pct,
  "By Chargaff's rule A = T and G = C, so T = 30%, and A + T = 60%; G + C = 40%, so G = 20%.", tol=0.01)
tot = 2 * 1000
C_ = int(0.22 * tot)
A_ = (tot - 2 * C_) // 2
assert (C_, A_) == (440, 560)
N(c, "M", "A double-stranded DNA fragment of 1000 base pairs has 22% cytosine. The number of adenine bases in it is ______.", A_,
  "Total bases $=2000$. C = G = 440, so A + T = $2000-880=1120$, A = T = 560.", integer=True)
length_m = 6.6e9 * 0.34e-9
assert abs(length_m - 2.244) < 0.01
N(c, "M", "The distance between two adjacent base pairs in B-DNA is $0.34$ nm. For $6.6\\times10^{9}$ bp (the diploid human genome), the approximate length of the DNA in metres is ______.", 2.2,
  "$6.6\\times10^9\\times0.34\\times10^{-9}\\ \\mathrm{m}\\approx2.2$ m.", tol=0.05)
S(c, "M", "In the double helix of B-DNA the pitch is 3.4 nm and there are 10 bp per turn. The rise per base pair is therefore",
  "0.34 nm", ["3.4 nm", "0.034 nm", "34 nm"],
  "Rise per bp $=3.4\\ \\mathrm{nm}/10=0.34$ nm.", via=CODE)
S(c, "E", "Histones are rich in the basic amino acids",
  "lysine and arginine, which carry positive charges", ["aspartic acid and glutamic acid", "cysteine and methionine", "glycine and alanine"],
  "The positively charged residues of histones bind the negatively charged phosphate backbone of DNA; eight histone molecules (an octamer) form the core of a nucleosome.")
S(c, "M", "Meselson and Stahl grew *E. coli* for many generations in $^{15}$N medium and then transferred it to $^{14}$N medium. After one generation in $^{14}$N, the DNA was",
  "all of intermediate (hybrid) density", ["all heavy", "half heavy and half light", "all light"],
  "Semi-conservative replication gives DNA with one old ($^{15}$N) strand and one new ($^{14}$N) strand, so the single band had intermediate density.")
n_gen = 3
total = 2 ** n_gen
with15 = 2
assert with15 / total == 0.25
N(c, "H", "A DNA molecule with both strands labelled $^{15}$N replicates three times in $^{14}$N medium. The number of daughter DNA molecules that still contain $^{15}$N (in one strand) is ______.", with15,
  "Semi-conservative replication always leaves two old strands, one in each of 2 molecules, among $2^3=8$ molecules; the other 6 are fully $^{14}$N.", integer=True)
S(c, "M", "During transcription in bacteria, RNA polymerase",
  "reads the template strand 3' to 5' and synthesises RNA in the 5' to 3' direction", ["reads the template 5' to 3' and synthesises RNA 3' to 5'", "needs a primer to begin RNA synthesis", "copies both strands of DNA at the same time"],
  "All nucleic acid polymerases extend the new chain at its 3' end, so RNA is made 5'→3' using a template read 3'→5'; RNA polymerase needs no primer.")
S(c, "M", "The promoter of a transcription unit lies",
  "at the 5' end (upstream) of the structural gene", ["at the 3' end of the structural gene", "within the terminator", "on the tRNA"],
  "The promoter, where RNA polymerase binds, lies upstream (5') of the coding sequence on the coding strand; the terminator is at the 3' end.")
S(c, "M", "Which of the following steps is part of post-transcriptional processing of a eukaryotic hnRNA?",
  "capping at the 5' end, splicing out introns and tailing (poly-A) at the 3' end", ["methylation of introns and their translation", "attachment of a poly-U tail", "synthesis of anticodons"],
  "hnRNA gets a methyl guanosine cap at 5', introns are removed and exons joined (splicing), and 200-300 adenylate residues are added at 3'.")
S(c, "E", "Which of the following is a stop (termination) codon?",
  "UAA", ["AUG", "GUG", "UUU"],
  "UAA, UAG and UGA do not code for any amino acid. AUG codes for methionine and also serves as the start codon.")
codons = 4 ** 3
assert codons - 3 == 61
N(c, "E", "Of the 64 possible codons, the number that code for amino acids is ______.", 61,
  "$4^3=64$ codons, of which 3 (UAA, UAG, UGA) are stop signals, leaving 61 sense codons.", integer=True)
nt = 303
aa = nt // 3 - 1
assert aa == 100
N(c, "M", "An mRNA coding region (AUG to the stop codon, inclusive) has 303 nucleotides. The number of amino acids in the polypeptide it encodes is ______.", aa,
  "$303/3=101$ codons, of which the last is the stop codon, so the polypeptide has 100 amino acids.", integer=True)
S(c, "M", "In the lac operon of *E. coli*, in the absence of lactose the repressor",
  "binds to the operator and prevents transcription of the structural genes", ["binds to lactose and activates the promoter", "is not produced because the i gene is switched off", "binds to RNA polymerase and activates the genes"],
  "The i gene constitutively produces the repressor; without an inducer it blocks the operator. Allolactose (an isomer of lactose) binds the repressor and releases the operator.")
S(c, "M", "In the lac operon, the gene $y$ codes for",
  "permease", ["$\\beta$-galactosidase", "transacetylase", "the repressor"],
  "lacZ codes for $\\beta$-galactosidase, lacY for permease (lactose entry) and lacA for transacetylase; the repressor is the i gene product.")
S(c, "M", "DNA fingerprinting is based on the polymorphism in",
  "variable number tandem repeats (VNTRs)", ["the genetic code", "the number of mitochondria", "the amino acid sequence of histones"],
  "VNTRs are short repeated sequences whose number varies between individuals; this is used to compare DNA from different people (technique of Alec Jeffreys).")
S(c, "M", "On the lagging strand, DNA is synthesised as short fragments called",
  "Okazaki fragments, joined by DNA ligase", ["exons, joined by RNA polymerase", "Okazaki fragments, joined by helicase", "introns, joined by primase"],
  "DNA polymerase can only extend 5'→3', so the strand oriented opposite to the fork movement is made discontinuously; ligase seals the nicks.")
S(c, "H", "In eukaryotes, the RNA polymerase that transcribes the precursor of mRNA (hnRNA) is",
  "RNA polymerase II", ["RNA polymerase I", "RNA polymerase III", "a single polymerase that transcribes all RNAs"],
  "RNA pol I transcribes rRNAs (28S, 18S, 5.8S), pol II the hnRNA and pol III tRNA, 5S rRNA and snRNAs. Bacteria use a single polymerase for all.")

# ------------------------------------------------------------------ BOT.MIC
c = "BOT.MIC"
S(c, "E", "Milk is converted into curd mainly by",
  "lactic acid bacteria such as *Lactobacillus*", ["*Saccharomyces cerevisiae*", "*Penicillium notatum*", "*Aspergillus niger*"],
  "LAB produce lactic acid, which coagulates and partially digests milk proteins; curd also has higher vitamin B$_{12}$.")
S(c, "E", "The puffed-up appearance of bread dough is due to the production of CO$_2$ by",
  "baker's yeast, *Saccharomyces cerevisiae*", ["*Lactobacillus*", "*Rhizobium*", "*Trichoderma*"],
  "Yeast ferments sugars in the dough, releasing CO$_2$ that expands the dough; hence it is called baker's yeast.")
S(c, "M", "The large holes in 'Swiss cheese' are due to",
  "the production of a large amount of CO$_2$ by *Propionibacterium sharmanii*", ["*Penicillium roqueforti* growing in it", "*Aspergillus niger*", "boiling of whey"],
  "The bacterium *Propionibacterium sharmanii* makes CO$_2$ during ripening. Roquefort cheese is ripened with *Penicillium roqueforti* for its flavour.")
S(c, "E", "The first antibiotic, penicillin, was discovered by Alexander Fleming from",
  "*Penicillium notatum*", ["*Streptococcus*", "*Monascus purpureus*", "*Trichoderma polysporum*"],
  "Fleming noticed the mould *Penicillium notatum* killing *Staphylococcus* on a culture plate; Chain and Florey later established its effectiveness.")
S(c, "M", "Citric acid is commercially produced by",
  "*Aspergillus niger*", ["*Acetobacter aceti*", "*Clostridium butylicum*", "*Lactobacillus*"],
  "*A. niger* gives citric acid; *Acetobacter aceti* gives acetic acid (vinegar); *Clostridium butylicum* gives butyric acid; *Lactobacillus* gives lactic acid.")
S(c, "M", "The blood-cholesterol lowering agent 'statin' is produced by the yeast",
  "*Monascus purpureus*", ["*Trichoderma polysporum*", "*Saccharomyces cerevisiae*", "*Penicillium chrysogenum*"],
  "Statins are competitive inhibitors of the enzyme for cholesterol synthesis; cyclosporin A, the immunosuppressant, comes from *Trichoderma polysporum*.")
S(c, "E", "In sewage treatment, BOD (biochemical oxygen demand) measures",
  "the amount of oxygen microbes consume to oxidise the organic matter in the water", ["the amount of CO$_2$ released by fish", "the number of coliform bacteria only", "the total dissolved salt"],
  "A higher BOD means more biodegradable organic matter and thus more polluted water; treatment aims to lower BOD.")
S(c, "M", "During secondary (biological) treatment of sewage, aggregates of bacteria associated with fungal filaments that form mesh-like masses are called",
  "flocs", ["biofilms of algae only", "sludge granules of methanogens", "bio-pellets of yeast"],
  "Aerobic microbes grow as flocs in the aeration tank, consume the organic matter and reduce BOD. The settled flocs form activated sludge.")
S(c, "E", "The main constituent of biogas is",
  "methane", ["carbon monoxide", "ethanol", "hydrogen sulphide"],
  "Biogas from anaerobic digestion of dung or waste by methanogens such as *Methanobacterium* is mostly CH$_4$ with CO$_2$ and traces of H$_2$ and H$_2$S.")
S(c, "M", "Which of the following is used as a biological control agent of insect pests by being sprayed as spores?",
  "*Bacillus thuringiensis*", ["*Rhizobium*", "*Azotobacter*", "*Nostoc*"],
  "Dried spores of Bt are mixed with water and sprayed; the toxin protein kills larvae of moths and butterflies after ingestion.")
S(c, "M", "Mycorrhiza formed by *Glomus* helps the host plant mainly by",
  "absorbing phosphorus from the soil and increasing resistance to root pathogens", ["fixing atmospheric nitrogen in nodules", "producing antibiotics for human use", "fermenting sugars into alcohol"],
  "The fungal hyphae of *Glomus* absorb phosphorus and pass it to the plant, which in turn supplies carbohydrates.")
S(c, "M", "The 'clot buster' enzyme used to remove clots from the blood vessels of heart-attack patients, produced by *Streptococcus*, is",
  "streptokinase", ["lipase", "pectinase", "cyclosporin A"],
  "Streptokinase converts plasminogen into plasmin, which digests fibrin clots. Pectinases and proteases are used to clarify fruit juices.")
S(c, "E", "Which of the following is a biofertiliser for rice paddy fields (nitrogen-fixing, free-living, photosynthetic)?",
  "*Anabaena*, a cyanobacterium", ["*Penicillium*", "*Lactobacillus*", "*Saccharomyces*"],
  "Cyanobacteria such as *Anabaena*, *Nostoc*, *Oscillatoria* fix nitrogen in paddy fields and add organic matter, improving soil fertility.")

# ------------------------------------------------------------------ BOT.BTP
c = "BOT.BTP"
S(c, "E", "The enzymes that cut DNA at specific recognition sequences are",
  "restriction endonucleases", ["DNA ligases", "exonucleases", "DNA polymerases"],
  "Restriction endonucleases cut within DNA at specific palindromic sequences; ligase joins fragments and exonucleases remove nucleotides from the ends.")
S(c, "M", "In the name EcoRI, the letter 'R' stands for",
  "the strain (RY13) of the bacterium", ["restriction", "recombinant", "ribosome"],
  "E = genus *Escherichia*, co = species *coli*, R = strain RY13, I = order in which the enzyme was isolated from that strain.")
S(c, "E", "A palindromic DNA sequence is one in which",
  "the base sequence reads the same in the 5'→3' direction on both strands", ["all bases are identical", "the two strands are identical in the 3'→5' direction only", "no base pairing occurs"],
  "For example, 5'-GAATTC-3' is complementary to 3'-CTTAAG-5', which read 5'→3' is also GAATTC.")
S(c, "E", "DNA fragments produced by the same restriction enzyme can be joined by DNA ligase because they have",
  "complementary sticky (cohesive) ends", ["identical base sequences on both strands", "no free ends", "blunt ends only"],
  "Staggered cuts leave single-stranded overhangs that can base-pair with each other, and ligase seals the sugar-phosphate backbone.")
S(c, "M", "Taq polymerase is used in PCR because it",
  "is thermostable and remains active at the high temperature used to denature DNA", ["works only at low temperature", "is isolated from humans", "digests the primer"],
  "Taq polymerase, from the bacterium *Thermus aquaticus*, survives the 94 °C denaturation step, so fresh enzyme need not be added each cycle.")
copies = 2 ** 5
assert copies == 32
N(c, "M", "Starting from one double-stranded template, the number of copies of the target DNA after five complete PCR cycles (ideal efficiency) is ______.", copies,
  "Each cycle doubles the copies: $2^5=32$.", integer=True)
def fragments(sites, circular):
    return sites if circular else sites + 1
assert fragments(4, False) == 5 and fragments(3, True) == 3
N(c, "M", "A linear DNA molecule has four recognition sites for EcoRI. The number of fragments produced on complete digestion is ______.", 5,
  "$n$ cuts in a linear molecule give $n+1$ fragments, so $4+1=5$ (a circular molecule with $n$ sites gives $n$ fragments).", integer=True)
N(c, "M", "A circular plasmid has three recognition sites for a restriction enzyme. The number of fragments on complete digestion is ______.", 3,
  "A circular molecule cut at $n$ sites gives $n$ fragments.", integer=True)
S(c, "M", "In agarose gel electrophoresis, DNA fragments move towards the",
  "anode (positive electrode), and the smaller fragments travel farther", ["cathode, and the larger fragments travel farther", "anode, and the larger fragments travel farther", "cathode, and the smaller fragments travel farther"],
  "DNA is negatively charged due to phosphate groups; the gel sieves fragments, so shorter ones move faster. Ethidium bromide with UV light visualises the bands.")
S(c, "H", "Foreign DNA is inserted at the BamHI site within the tetracycline resistance gene of pBR322, which also carries an ampicillin resistance gene. Cells carrying the recombinant plasmid will",
  "grow on ampicillin but not on tetracycline", ["grow on tetracycline but not on ampicillin", "grow on both antibiotics", "not grow on either antibiotic"],
  "Insertion inactivates tet$^R$ while amp$^R$ remains intact, so recombinants are amp$^R$ tet$^S$. Non-recombinants keep both genes and grow on both.")
S(c, "M", "Insertional inactivation of $\\beta$-galactosidase (lacZ) in a vector is used to select recombinants because, in the presence of a chromogenic substrate, recombinant colonies",
  "remain colourless, while non-recombinants produce a blue colour", ["are blue and non-recombinants are colourless", "die", "glow under UV light"],
  "An insert inactivates the lacZ enzyme, so the chromogenic substrate is not cleaved; non-recombinants with active enzyme give blue colonies.")
S(c, "M", "To make a bacterial cell competent to take up recombinant DNA, it is treated with",
  "a divalent cation such as calcium, followed by a brief heat shock at about 42 °C", ["sodium hydroxide", "ethidium bromide", "a restriction enzyme"],
  "Ca$^{2+}$ increases pore efficiency in the cell wall; incubating cells with DNA on ice, then at 42 °C, then back on ice makes DNA enter.")
S(c, "M", "A direct physical method of introducing DNA into plant cells using high-velocity microparticles of gold or tungsten is called",
  "biolistics (gene gun)", ["microinjection", "heat shock", "electrophoresis"],
  "Biolistics bombards plant cells with DNA-coated gold or tungsten particles; microinjection puts DNA directly into the nucleus of an animal cell.")
S(c, "M", "The main advantage of a stirred-tank bioreactor over shake flasks is that it",
  "provides even mixing and an oxygen supply through sparging, allowing large-scale culture under controlled conditions", ["needs no sterilisation", "works only under anaerobic conditions", "does not allow monitoring of pH or temperature"],
  "A stirrer ensures uniform distribution of cells and nutrients and a sparger bubbles in sterile air; probes control temperature, pH and oxygen.")
S(c, "M", "Which statement distinguishes an exonuclease from an endonuclease?",
  "An exonuclease removes nucleotides from the ends of DNA, while an endonuclease cuts at internal positions", ["An exonuclease cuts at internal sites and an endonuclease removes nucleotides from ends", "Both ligate DNA fragments", "Exonucleases occur only in viruses"],
  "Restriction endonucleases make cuts within the DNA; exonucleases remove nucleotides one by one from the ends.")

# ------------------------------------------------------------------ BOT.BTA
c = "BOT.BTA"
S(c, "E", "Bt cotton is resistant to",
  "cotton bollworms, due to the cry genes of *Bacillus thuringiensis*", ["nematodes through RNA interference", "herbicides only", "viral diseases"],
  "Bt toxin genes (e.g. cryIAc, cryIIAb) are inserted into cotton, which then produces insecticidal protein.")
S(c, "M", "The Bt toxin is lethal to insect larvae but not to the bacterium itself because the toxin protein exists as",
  "an inactive protoxin that is activated by the alkaline pH of the insect gut", ["an active toxin that is destroyed in the gut", "a lipid that bursts only in acidic pH", "a DNA that is expressed only in larvae"],
  "The crystals dissolve in the alkaline insect midgut, get processed to active toxin, bind to the gut epithelium and create pores, causing swelling and lysis.")
S(c, "M", "RNA interference (RNAi) was used to protect tobacco plants from the root-knot nematode *Meloidogyne incognita* by",
  "producing dsRNA in the plant that silences a nematode gene", ["producing the Bt toxin", "killing the nematode with antibiotics", "deleting the plant's own genes"],
  "A nematode-specific gene is expressed in sense and antisense by Agrobacterium vectors, forming dsRNA that silences the mRNA of the pest's essential gene, so the parasite cannot survive.")
S(c, "E", "Human insulin consists of",
  "two short polypeptide chains, A and B, linked by disulphide bridges", ["a single polypeptide chain without disulphide bonds", "three chains A, B and C all in the mature hormone", "two chains linked by peptide bonds"],
  "Mature insulin has chain A (21 amino acids) and chain B (30 amino acids), joined by disulphide bonds. In pro-insulin the C peptide is removed during maturation.")
S(c, "M", "In the early recombinant production of insulin in *E. coli*, the A and B chains were produced",
  "separately and then combined by creating disulphide bonds", ["as a single chain that needed no processing", "in human cells only", "only after removal of the C peptide in bacteria"],
  "Eli Lilly (1983) made the DNA sequences for chains A and B separately in plasmids, expressed them in separate *E. coli* cultures, and then joined the chains in vitro.")
S(c, "M", "The first clinical gene therapy (1990) was given to a four-year-old girl with a deficiency of the enzyme",
  "adenosine deaminase (ADA)", ["phenylalanine hydroxylase", "lactase", "$\\beta$-galactosidase"],
  "ADA deficiency impairs immunity (severe combined immunodeficiency). Lymphocytes were grown outside, given a functional ADA gene with a retroviral vector and returned.")
S(c, "E", "'Golden Rice' is rich in",
  "provitamin A ($\\beta$-carotene)", ["vitamin C", "vitamin K", "iron only"],
  "Golden rice is genetically modified to produce $\\beta$-carotene, which the body converts to vitamin A.")
S(c, "M", "Biopiracy refers to",
  "the use of bio-resources by multinational companies and others without proper authorisation from the countries and people concerned", ["cultivating organic crops", "tissue culture of banana", "seed banking by governments"],
  "Patents on products derived from traditional knowledge, such as the attempt to patent Basmati rice, are examples of biopiracy.")
S(c, "E", "In India, the body that decides the validity of GM research and the safety of introducing GM organisms for public services is the",
  "Genetic Engineering Approval Committee (GEAC)", ["Indian Council of Agricultural Research", "Central Zoo Authority", "National Biodiversity Authority"],
  "GEAC makes decisions regarding the validity of GM research and the safety of introducing GM organisms.")
S(c, "M", "A transgenic cow, Rosie, produced human $\\alpha$-lactalbumin-enriched milk. This is an example of",
  "using transgenic animals to produce valuable biological products", ["gene therapy of the cow", "RNA interference", "biopiracy"],
  "Rosie (1997) produced milk with human $\\alpha$-lactalbumin, more nutritionally balanced for human infants. Transgenic animals are also used for vaccine safety testing and disease models.")
S(c, "M", "Early detection of an infection in which the bacteria or virus is present in very low numbers can be done by",
  "PCR (amplification of nucleic acid) or ELISA (antigen-antibody interaction)", ["Southern blotting without amplification", "restriction of RNA", "culturing in glass beads"],
  "PCR amplifies the pathogen's nucleic acid, and ELISA detects antibodies or antigens; both detect infection before symptoms appear.")
S(c, "M", "The anticoagulant hirudin was produced in transgenic",
  "*Brassica napus*", ["*Bacillus thuringiensis*", "*Meloidogyne incognita*", "cattle"],
  "A gene for hirudin, the protein of the leech that prevents blood clotting, was synthesised and expressed in *Brassica napus*; the seeds accumulate hirudin.")
S(c, "H", "A transgenic organism is one in which",
  "a foreign gene has been introduced and is expressed", ["a gene has been deleted by mutation", "the chromosome number is doubled", "all genes are replaced"],
  "Transgenic organisms carry and express a gene from another species, e.g. Bt cotton and transgenic mice.")

# ------------------------------------------------------------------ BOT.ORG
c = "BOT.ORG"
Nt, B, D, I, Em = 500, 60, 20, 10, 5
Nn = Nt + ((B + I) - (D + Em))
assert Nn == 545
N(c, "E", "A population has 500 individuals. In a year, 60 are born, 20 die, 10 immigrate and 5 emigrate. Using $N_{t+1}=N_t+[(B+I)-(D+E)]$, the population size at the end of the year is ______.", Nn,
  "$N_{t+1}=500+[(60+10)-(20+5)]=500+45=545$.", integer=True)
r, N0, K = 0.1, 200, 1000
dn = r * N0 * (K - N0) / K
assert abs(dn - 16) < 1e-9
N(c, "M", "In logistic growth $\\mathrm{d}N/\\mathrm{d}t=rN\\left(\\frac{K-N}{K}\\right)$. For $r=0.1$ per year, $N=200$ and $K=1000$, the growth rate (individuals per year) is ______.", 16,
  "$0.1\\times200\\times(800/1000)=16$.", tol=0.001)
assert abs(0.05 * 200 - 10) < 1e-9
N(c, "M", "In exponential growth $\\mathrm{d}N/\\mathrm{d}t=rN$ with $r=0.05$ per year, a population of 200 grows at (individuals per year) ______.", 10,
  "$0.05\\times200=10$ per year.", tol=0.001)
S(c, "E", "A population growing in an environment with limited resources typically shows",
  "a sigmoid (logistic) curve that levels off at the carrying capacity", ["a J-shaped curve that continues indefinitely", "a straight line", "a curve that always falls"],
  "Verhulst-Pearl logistic growth has a lag, an exponential phase and an asymptote at the carrying capacity $K$.")
S(c, "M", "According to Allen's rule, mammals from colder climates generally have",
  "shorter ears and limbs, to minimise heat loss", ["longer ears and limbs", "no fur", "a thinner fat layer than those from warm climates"],
  "A smaller surface area-to-volume ratio of extremities lowers heat loss in cold climates; the polar seal has a thick fat layer and polar fox short ears.")
S(c, "M", "Gause's competitive exclusion principle states that",
  "two closely related species competing for the same limiting resources cannot coexist indefinitely", ["species with different resources cannot coexist", "predators always eliminate prey", "mutualism is impossible"],
  "In Gause's experiments with *Paramoecium*, the better competitor eventually eliminated the other when the resource was limiting.")
S(c, "M", "The interaction between the cuckoo (koel) and the crow, in which the cuckoo lays its eggs in the crow's nest, is an example of",
  "brood parasitism", ["mutualism", "commensalism", "amensalism"],
  "The parasitic bird's eggs resemble the host's, so the host incubates them; this is a type of parasitism.")
S(c, "M", "The prickly pear cactus (*Opuntia*) became a pest in Australia and was brought under control by introducing",
  "the cactus-feeding moth *Cactoblastis cactorum*", ["a parasitic wasp", "a herbicide-producing fungus", "the dodo"],
  "Introduction of a natural predator of the cactus is an example of biological control by predation.")
S(c, "M", "An orchid growing on a mango branch is an example of",
  "commensalism", ["mutualism", "parasitism", "competition"],
  "The orchid (epiphyte) benefits by getting support while the mango is neither harmed nor benefited; cattle egret and grazing cattle are another example.")
S(c, "M", "The kangaroo rat in North American deserts survives without drinking water because it",
  "concentrates its urine and meets water needs through internal fat oxidation", ["stores water in its stomach", "drinks dew from leaves", "hibernates all year"],
  "Metabolic oxidation of fat yields water, and the kidney produces highly concentrated urine, an adaptation to desert life.")
S(c, "E", "Organisms that maintain a constant internal environment despite changes in the external environment are called",
  "regulators", ["conformers", "migrants only", "parasites"],
  "Birds and mammals are regulators (homeostasis by thermoregulation and osmoregulation); conformers let internal conditions change with the surroundings.")
S(c, "M", "A temporary suspension of development in zooplankton to tide over unfavourable conditions is called",
  "diapause", ["migration", "hibernation", "aestivation"],
  "Many zooplankton species in lakes and ponds undergo diapause, a stage of suspended development; hibernation is winter dormancy and aestivation is summer dormancy.")
S(c, "E", "Organisms that can tolerate and thrive in a wide range of temperatures are called",
  "eurythermal", ["stenothermal", "euryhaline", "stenohaline"],
  "Eurythermal species tolerate a wide temperature range; stenothermal ones only a narrow range. Euryhaline and stenohaline refer to salinity tolerance.")
S(c, "H", "An age pyramid with a broad base (large pre-reproductive group) indicates a population that is",
  "expanding", ["stable", "declining", "extinct"],
  "A large pre-reproductive group means many individuals will enter the reproductive age, so the population will grow; a bell-shaped pyramid is stable and an urn-shaped one is declining.")

# ------------------------------------------------------------------ BOT.ECOS
c = "BOT.ECOS"
gpp, resp = 100, 40
assert gpp - resp == 60
N(c, "E", "In an ecosystem, gross primary productivity is 100 units and plant respiration losses are 40 units. Net primary productivity is ______ units.", 60,
  "$\\mathrm{NPP}=\\mathrm{GPP}-R=100-40=60$.", integer=True)
S(c, "E", "Which ecological pyramid is always upright in any ecosystem?",
  "pyramid of energy", ["pyramid of numbers", "pyramid of biomass", "none of the pyramids"],
  "Energy decreases at each successive trophic level, so the energy pyramid cannot be inverted; numbers and biomass pyramids can be inverted (e.g. a tree with many insects, phytoplankton in the sea).")
S(c, "M", "The pyramid of biomass in a sea ecosystem is generally inverted because",
  "the standing crop of phytoplankton is small and they reproduce quickly, supporting a larger biomass of zooplankton and fish", ["fish have no biomass", "phytoplankton are larger than fish", "energy increases at higher levels"],
  "Producers (phytoplankton) have a small standing biomass at any time but a high turnover rate, so consumer biomass can exceed it; the energy pyramid is still upright.")
e = 20000
for _ in range(3):
    e *= 0.1
assert abs(e - 20) < 1e-9
N(c, "M", "A producer level fixes 20,000 J of energy. Applying the 10 per cent law, the energy available at the tertiary consumer level (producer, herbivore, secondary, tertiary consumers) is ______ J.", 20,
  "Each transfer retains 10%: $20000\\to2000\\to200\\to20$ J.", tol=0.01)
S(c, "E", "In the food chain grass $\\to$ grasshopper $\\to$ frog $\\to$ snake $\\to$ hawk, the frog is a",
  "secondary consumer", ["primary consumer", "tertiary consumer", "producer"],
  "Grass is the producer, the grasshopper the primary consumer, the frog the secondary consumer, the snake tertiary and the hawk quaternary.")
S(c, "E", "The dark, amorphous substance formed during decomposition, which is highly resistant to microbial action and is a reservoir of nutrients, is",
  "humus", ["detritus", "leachate", "peat only"],
  "Humification produces humus, which is degraded very slowly; mineralisation then releases inorganic nutrients.")
S(c, "M", "Decomposition proceeds faster when the detritus is",
  "rich in nitrogen and water-soluble substances, in warm and moist conditions", ["rich in lignin and chitin, in cold dry conditions", "in anaerobic conditions", "poor in nitrogen"],
  "Warm, moist, aerobic conditions favour microbial activity; lignin and chitin slow decomposition.")
S(c, "M", "The correct sequence of decomposition steps is",
  "fragmentation, leaching, catabolism, humification and mineralisation", ["catabolism, leaching, fragmentation, mineralisation, humification", "humification, fragmentation, leaching", "leaching, mineralisation, fragmentation"],
  "Detritivores fragment the detritus; water-soluble inorganic nutrients leach; fungi and bacteria carry out catabolism; humification forms humus; and mineralisation releases inorganic nutrients.")
S(c, "M", "A distinct feature of the phosphorus cycle compared with the carbon cycle is that",
  "there is no significant gaseous exchange with the atmosphere", ["atmosphere is its major reservoir", "it is a gaseous cycle", "respiration returns phosphorus to the air"],
  "The main reservoir of phosphorus is rock; its natural input to the atmosphere through rainfall is negligible, so it is a sedimentary cycle.")
S(c, "E", "On a bare rock, the pioneer species of primary succession are generally",
  "lichens", ["trees", "shrubs", "grasses"],
  "Lichens secrete acids that weather rock, then mosses, herbs and shrubs follow to reach a climax community.")
S(c, "M", "In terrestrial ecosystems the major conduit for energy flow is the",
  "detritus food chain", ["grazing food chain", "parasitic food chain only", "predator chain"],
  "In most terrestrial ecosystems a much larger part of energy flows through detritus than through grazers. In aquatic ecosystems the grazing chain is the major conduit.")
S(c, "M", "Only about 2-10 per cent of the photosynthetically active radiation (PAR) is captured by plants. PAR forms about what fraction of incident solar radiation?",
  "50 per cent", ["10 per cent", "1 per cent", "90 per cent"],
  "PAR (400-700 nm) forms around 50% of incident solar radiation; plants capture only 2-10% of it.")
S(c, "E", "Standing crop of an ecosystem refers to",
  "the mass of living organisms at each trophic level at a given time", ["the rate of production of new biomass", "the total energy lost by respiration", "the amount of dead organic matter"],
  "Standing crop is measured as fresh or dry weight of living material per unit area; productivity is the rate of biomass production.")
S(c, "H", "Secondary productivity is defined as the",
  "rate of formation of new organic matter by consumers", ["rate of photosynthesis by producers", "total biomass of decomposers only", "rate of respiration of producers"],
  "Primary productivity is by producers; secondary productivity is the rate of assimilation of food energy and production of new biomass by consumers.")

# ------------------------------------------------------------------ BOT.BIOD
c = "BOT.BIOD"
S(c, "E", "The greatest cause of species extinction today is",
  "habitat loss and fragmentation", ["natural disasters only", "decline of the Sun's output", "lack of mutations"],
  "Of the 'evil quartet' (habitat loss and fragmentation, over-exploitation, alien species invasions, co-extinctions), habitat loss is the most important cause.")
S(c, "E", "Which of the following is an extinct animal?",
  "Dodo of Mauritius", ["Bengal tiger", "Asiatic lion", "One-horned rhinoceros"],
  "The dodo went extinct in the 17th century; the others still survive, though they are threatened.")
S(c, "M", "Conservation of biodiversity in its natural habitat, as in national parks and sanctuaries, is called",
  "in situ conservation", ["ex situ conservation", "cryopreservation", "seed banking"],
  "In situ conservation protects the whole ecosystem; ex situ methods include zoos, botanical gardens, seed banks and cryopreservation.")
S(c, "M", "Which of these is an ex situ conservation method?",
  "storing gametes at very low temperature (cryopreservation)", ["biosphere reserves", "sacred groves", "wildlife sanctuaries"],
  "Ex situ conservation protects threatened species outside their natural habitat: zoos, botanical gardens, gene banks, cryopreservation.")
S(c, "M", "Diversity of species between different communities of a region (turnover of species along habitat gradients) is called",
  "beta diversity", ["alpha diversity", "gamma diversity", "genetic diversity"],
  "Alpha diversity is within a community, beta diversity is between communities and gamma diversity is for the total geographical region.")
S(c, "E", "In the species-area relationship $\\log S=\\log C+Z\\log A$ for small areas, the slope $Z$ typically lies between",
  "0.1 and 0.2", ["2 and 3", "5 and 10", "-1 and 0"],
  "Alexander von Humboldt's relationship is a rectangular hyperbola, which on a log scale is a straight line with slope Z, generally 0.1-0.2 regardless of taxonomic group or region.")
ratio = 10 ** 0.2
assert abs(ratio - 1.585) < 0.001
N(c, "H", "For $S=CA^{Z}$ with $Z=0.2$, by what factor does the species richness $S$ increase when the area $A$ increases tenfold? (answer to two decimals) ______", 1.58,
  "$S_2/S_1=(A_2/A_1)^Z=10^{0.2}\\approx1.585$.", tol=0.01)
S(c, "M", "Which region in India is a biodiversity hotspot?",
  "Western Ghats and Sri Lanka", ["Thar Desert", "Gangetic plain", "Deccan plateau interior"],
  "Hotspots are regions with high species richness, high endemism and severe habitat threat. India's three hotspots are Western Ghats and Sri Lanka, Indo-Burma, and the Himalaya.")
S(c, "M", "The introduction of the Nile perch into Lake Victoria in East Africa led to",
  "the extinction of more than 200 species of cichlid fish", ["an increase in cichlid species", "extinction of all water birds", "no change in biodiversity"],
  "Alien species introduced deliberately or accidentally can become invasive and cause the decline of native species.")
S(c, "M", "Co-extinction refers to",
  "the extinction of a species whose survival depends on another species that has gone extinct, such as an obligate parasite or its host", ["extinction due to climate only", "extinction of two species by hybridisation", "random extinction by chance"],
  "When a host fish becomes extinct, its unique parasites also vanish; the same holds for plant and pollinator pairs.")
S(c, "M", "In a biosphere reserve, the zone in which no human activity is allowed is the",
  "core zone", ["buffer zone", "transition zone", "restoration zone"],
  "A biosphere reserve has a legally protected core zone, a surrounding buffer zone with limited activities and an outer transition zone with settlements.")
S(c, "E", "Species diversity generally",
  "decreases from the equator towards the poles", ["increases from the equator towards the poles", "is the same at all latitudes", "is highest at the poles"],
  "Tropical regions have greater species richness owing to more stable climate, longer evolutionary time and more solar energy.")
S(c, "H", "The 'rivet popper hypothesis', which compares species to the rivets holding together an aircraft, was proposed by",
  "Paul Ehrlich", ["David Tilman", "Robert May", "Alexander von Humboldt"],
  "Ehrlich argued that losing species one by one is like popping rivets, eventually a critical loss makes the ecosystem collapse; Tilman's long-term experiments showed more diverse plots are more productive.")
S(c, "E", "The international list that records the status of threatened species of plants and animals is called the",
  "IUCN Red List (Red Data Book)", ["Green Book", "Blue List of rivers", "Convention of tribal rights"],
  "The IUCN Red List categorises species as extinct, critically endangered, endangered, vulnerable and so on.")
