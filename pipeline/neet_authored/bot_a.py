"""BOT part A: Living World, Biological Classification, Plant Kingdom, Morphology, Anatomy, Cell, Cell Cycle."""
from . import AR, CODE, M, N, S

# ------------------------------------------------------------------ BOT.LIV
c = "BOT.LIV"
S(c, "E", "Binomial nomenclature, the system of giving each organism a two-part scientific name, was introduced by",
  "Carolus Linnaeus", ["Aristotle", "R. H. Whittaker", "Charles Darwin"],
  "Binomial nomenclature was standardised by Carolus Linnaeus: each species gets a generic name followed by a specific epithet. Whittaker is known for the five-kingdom scheme and Darwin for natural selection.")
S(c, "E", "Which of the following is the correct way of writing a scientific name in print?",
  "*Mangifera indica*", ["*mangifera indica*", "*Mangifera Indica*", "*mangifera Indica*"],
  "By convention the genus name begins with a capital letter and the species epithet with a small letter, and both are italicised in print (underlined separately when handwritten).")
S(c, "E", "Arrange the following taxonomic categories in the correct ascending order (lowest to highest): family, genus, order, species.",
  "species, genus, family, order", ["genus, species, family, order", "species, family, genus, order", "order, family, genus, species"],
  "The hierarchy from lowest to highest is species, genus, family, order, class, phylum (division in plants), kingdom.")
S(c, "E", "The taxonomic category that lies immediately above the family is the",
  "order", ["genus", "class", "species"],
  "Order of ranks: species < genus < family < order < class < phylum < kingdom, so order is directly above family.")
S(c, "E", "A herbarium is best described as",
  "a store house of dried, pressed and preserved plant specimens mounted on sheets", ["a garden where living plants are grown for study", "a place where live animals are kept for study", "a collection of preserved animal specimens"],
  "Herbaria hold dried, pressed plant specimens on sheets with data on place and date of collection; living collections are botanical gardens and preserved animal collections are museums.")
S(c, "M", "The lion (*Panthera leo*) and the tiger (*Panthera tigris*) are placed in the same",
  "genus, but different species", ["species, but different genera", "genus and the same species", "family, but different genera"],
  "Both share the generic name *Panthera* so they are in the same genus; their specific epithets differ, so they are separate species. (They also share higher ranks, but genus is the lowest rank shared.)")
S(c, "M", "What is the lowest taxonomic category shared by a cat (*Felis*, family Felidae) and a dog (*Canis*, family Canidae)?",
  "Order (Carnivora)", ["Family", "Genus", "Species"],
  "Cats and dogs are placed in different families (Felidae, Canidae) and different genera, so the first rank they share is the order Carnivora.")
S(c, "M", "A mule is a sterile hybrid and worker honeybees are sterile. These examples show that",
  "reproduction cannot be taken as a defining property of all living organisms", ["growth cannot be taken as a defining property of living organisms", "sterile organisms are non-living", "metabolism is not a feature of living organisms"],
  "Reproduction is not all-inclusive: sterile mules, worker bees and infertile human couples are alive though they do not reproduce. Metabolism, by contrast, is shown by every living organism.")
S(c, "E", "Growth in living organisms differs from the increase in mass of non-living objects because living growth is",
  "from inside (intrinsic), by cell division and enlargement", ["from outside, by accumulation of material on the surface", "possible only in plants", "limited to the early embryonic period only"],
  "Living organisms grow from within by cell division and enlargement, while non-living objects such as a mountain or a sand pile grow only by external accumulation.")
S(c, "M", "The naming of animals is governed by the",
  "International Code of Zoological Nomenclature (ICZN)", ["International Code of Botanical Nomenclature (ICBN)", "International Code of Nomenclature of Bacteria", "International Code of Viral Classification"],
  "ICZN regulates animal names; plant names are under the botanical code (ICBN, now ICN), and bacteria and viruses have their own codes.")
S(c, "E", "A taxonomic key is based on",
  "contrasting characters, presented in pairs called couplets", ["only molecular sequences", "geographical distribution only", "the economic value of species"],
  "Keys use pairs of contrasting characters (a couplet, each statement a lead); the user picks one statement at each step until the taxon is identified.")
S(c, "M", "Which publication gives the actual account of the habitat and distribution of the plants of a given area?",
  "Flora", ["Monograph", "Herbarium sheet", "Taxonomic key"],
  "A flora provides an account of the habitat and distribution of plants of a particular area, while a monograph treats a single taxon and a key is an identification aid.")

# ------------------------------------------------------------------ BOT.BCL
c = "BOT.BCL"
S(c, "E", "The five-kingdom system of classification was proposed by",
  "R. H. Whittaker", ["Carolus Linnaeus", "Carl Woese", "Ernst Haeckel"],
  "Whittaker (1969) proposed Monera, Protista, Fungi, Plantae and Animalia, based on cell structure, body organisation, mode of nutrition, reproduction and phylogeny.")
S(c, "E", "In the five-kingdom system, all bacteria are placed in kingdom",
  "Monera", ["Protista", "Fungi", "Plantae"],
  "Kingdom Monera holds all prokaryotes: bacteria, cyanobacteria, archaebacteria and mycoplasma.")
S(c, "E", "The cell wall of fungi is mainly composed of",
  "chitin and other polysaccharides", ["cellulose only", "peptidoglycan", "pectin and lignin"],
  "Fungal cell walls contain chitin, a nitrogen-containing polysaccharide; plant walls are cellulosic and bacterial walls contain peptidoglycan.")
S(c, "M", "Which of the following prokaryotes completely lacks a cell wall and is the smallest living cell known to survive without oxygen?",
  "Mycoplasma", ["Nostoc", "Anabaena", "Halobacterium"],
  "Mycoplasmas have no cell wall, are the smallest living cells and can survive without oxygen; Nostoc and Anabaena are cyanobacteria with walls.")
S(c, "M", "'Diatomaceous earth', used for filtration and polishing, consists of the",
  "silica-containing cell walls of dead diatoms", ["cellulose walls of green algae", "chitinous walls of fungi", "calcium carbonate shells of foraminiferans"],
  "Diatom walls are made of two overlapping silica shells that do not decay, so deposits of them accumulate as diatomaceous earth.")
S(c, "E", "'Red tides' in the sea are caused by the rapid multiplication of",
  "dinoflagellates such as *Gonyaulax*", ["diatoms", "slime moulds", "blue-green algae of fresh water"],
  "Red dinoflagellates like *Gonyaulax* multiply so rapidly that the sea appears red; their toxins can kill fish.")
S(c, "E", "Instead of a cell wall, euglenoids have a protein-rich, flexible layer called the",
  "pellicle", ["capsule", "peptidoglycan layer", "theca of cellulose"],
  "Euglenoids are covered by a protein-rich pellicle that makes the body flexible; they have two flagella, one short and one long.")
S(c, "M", "Viroids differ from viruses in that viroids",
  "consist of free RNA without a protein coat", ["have DNA surrounded by a capsid", "have a lipid envelope and protein spikes", "are made of protein only"],
  "Viroids are infectious RNA molecules of low molecular weight and lack the capsid (protein coat) found in viruses; the potato spindle tuber disease agent is an example.")
S(c, "E", "In a lichen, the fungal partner is called the",
  "mycobiont", ["phycobiont", "rhizobiont", "symbiont of the root"],
  "Lichens are symbiotic associations of an alga or cyanobacterium (phycobiont) with a fungus (mycobiont); lichens are also good pollution indicators.")
S(c, "M", "Archaebacteria that live in the guts of ruminant animals and produce methane from dung are the",
  "methanogens", ["halophiles", "thermoacidophiles", "nitrifying bacteria"],
  "Methanogens are strict anaerobic archaebacteria found in ruminant guts and in marsh sediment, and are responsible for biogas production from dung.")
S(c, "H", "In the filamentous cyanobacterium *Nostoc*, atmospheric nitrogen is fixed in",
  "heterocysts", ["akinetes only", "hormogonia only", "the sheath"],
  "Heterocysts are specialised thick-walled cells that lack photosystem II activity and house nitrogenase, so nitrogen fixation can proceed in an oxygen-poor environment.")
S(c, "M", "The vegetative body of a slime mould under favourable conditions is a",
  "plasmodium, a multinucleate mass of protoplasm that creeps over decaying organic matter", ["mycelium of septate hyphae", "colony of unicellular flagellates", "filament of cells with chitin walls"],
  "Slime moulds are saprophytic protists; their feeding stage is a plasmodium that may grow to several feet. Under unfavourable conditions it forms spore-bearing fruiting bodies.")

# ------------------------------------------------------------------ BOT.PKG
c = "BOT.PKG"
S(c, "E", "The characteristic pigment of brown algae (Phaeophyceae) is",
  "fucoxanthin", ["phycoerythrin", "chlorophyll b", "phycocyanin"],
  "Brown algae contain chlorophyll a, c and the xanthophyll fucoxanthin, which gives them the brown colour. Phycoerythrin characterises red algae.")
S(c, "M", "The stored food in brown algae is",
  "laminarin or mannitol", ["starch only", "glycogen", "floridean starch"],
  "Brown algae store food as complex carbohydrates called laminarin or mannitol; green algae store starch and red algae store floridean starch.")
S(c, "E", "Agar, used to grow microbes and prepare jellies, is obtained from",
  "*Gelidium* and *Gracilaria*, which are red algae", ["*Laminaria*, a brown alga", "*Chlamydomonas*", "*Volvox*"],
  "Agar comes from the cell walls of the red algae *Gelidium* and *Gracilaria*. Algin comes from brown algae and carrageen from red algae.")
S(c, "E", "In bryophytes (for example a moss), the dominant, independent plant body is the",
  "haploid gametophyte", ["diploid sporophyte", "haploid sporophyte", "diploid gametophyte"],
  "In bryophytes the gametophyte is the main photosynthetic, free-living phase; the sporophyte is partially or wholly dependent on it for nutrition.")
S(c, "E", "Which group is described as the first terrestrial plants to possess vascular tissues (xylem and phloem)?",
  "Pteridophytes", ["Bryophytes", "Algae", "Fungi"],
  "Pteridophytes (ferns and their allies) have well-differentiated xylem and phloem, unlike bryophytes, which are non-vascular.")
S(c, "M", "The coralloid roots of *Cycas* are associated with",
  "nitrogen-fixing cyanobacteria", ["mycorrhizal fungi that fix nitrogen", "*Rhizobium* bacteria", "red algae"],
  "In *Cycas*, special coralloid roots grow upward and harbour nitrogen-fixing cyanobacteria (such as *Anabaena*); *Rhizobium* nodules are characteristic of legumes.")
S(c, "M", "Heterospory, the production of two kinds of spores (micro- and megaspores), is seen in",
  "*Selaginella* and *Salvinia*", ["*Funaria* and *Marchantia*", "*Dryopteris* and *Pteris*", "*Spirogyra* and *Volvox*"],
  "*Selaginella* and *Salvinia* are heterosporous pteridophytes. Retention of the megaspore and young embryo on the parent sporophyte is a precursor to the seed habit.")
S(c, "M", "Which of the following has a diplontic life cycle?",
  "*Fucus*", ["*Spirogyra*", "*Funaria*", "*Polysiphonia*"],
  "In a diplontic cycle the diploid sporophyte is the dominant phase and the haploid phase is limited to the gametes. *Fucus* (and all seed plants) is diplontic; *Spirogyra* is haplontic; *Funaria* and *Polysiphonia* are haplo-diplontic.")
S(c, "M", "Companion cells are absent in the phloem of",
  "gymnosperms", ["dicotyledons", "monocotyledons", "all angiosperms"],
  "Gymnosperms have sieve cells in the phloem (and albuminous cells), with no companion cells; companion cells and sieve tubes are features of angiosperm phloem.")
S(c, "M", "Asexual reproduction in *Marchantia* occurs by",
  "gemmae formed in gemma cups", ["conidia in chains", "zoospores", "fragmentation of the sporophyte"],
  "*Marchantia* (a liverwort) produces green multicellular, asexual buds called gemmae in cup-like structures; they detach and grow into new thalli.")
S(c, "E", "Peat, used as fuel and as packing material for transporting living material, is obtained from",
  "*Sphagnum*, a moss", ["*Marchantia*, a liverwort", "*Cycas*, a gymnosperm", "*Pinus*, a conifer"],
  "*Sphagnum* moss accumulates as compressed peat, used as fuel and for its water-holding capacity as a packing material.")
S(c, "E", "In bryophytes the male sex organ is the antheridium and the female sex organ is the",
  "archegonium", ["sporangium", "gemma", "protonema"],
  "The antheridium produces biflagellate antherozoids; the flask-shaped archegonium bears a single egg.")

# ------------------------------------------------------------------ BOT.MORPH
c = "BOT.MORPH"
S(c, "E", "The root tip is protected by a thimble-like structure called the",
  "root cap", ["root hair zone", "pericycle", "coleorhiza"],
  "The root cap covers and protects the delicate meristematic tip as the root pushes through soil.")
S(c, "E", "Water and minerals are absorbed from the soil mainly through",
  "root hairs, in the region of maturation", ["the root cap", "the region of cell division only", "the root's endodermis surface"],
  "Root hairs are thin, unicellular outgrowths of epidermal cells in the region of maturation and greatly increase the surface for absorption.")
S(c, "E", "Which pair correctly matches the plant group with its typical root system?",
  "Dicots: tap root; monocots: fibrous roots", ["Dicots: fibrous roots; monocots: tap root", "Dicots and monocots: tap root", "Dicots: adventitious only; monocots: tap root"],
  "In dicots the radicle persists as a tap root; in monocots the primary root is short-lived and replaced by fibrous roots arising from the base of the stem.")
S(c, "M", "Pneumatophores, the roots that grow upward out of the mud for gaseous exchange, occur in",
  "*Rhizophora*, a mangrove", ["banyan", "maize", "*Monstera*"],
  "In swampy places mangroves such as *Rhizophora* develop negatively geotropic pneumatophores with pores to take up oxygen. Banyan has prop roots and maize has stilt roots.")
S(c, "E", "Reticulate venation is typical of the leaves of",
  "dicotyledonous plants", ["monocotyledonous plants", "mosses", "all algae"],
  "Dicot leaves show a net-like (reticulate) vein pattern while monocot leaves show parallel venation.")
S(c, "M", "Opposite phyllotaxy, with a pair of leaves at each node on opposite sides, is seen in",
  "*Calotropis*", ["mustard", "sunflower", "*Alstonia*"],
  "*Calotropis* has opposite phyllotaxy; mustard and sunflower have alternate leaves, and *Alstonia* has whorled leaves.")
S(c, "M", "Axile placentation, in which the placenta lies at the centre of a multilocular ovary, is seen in",
  "tomato", ["pea", "mustard", "sunflower"],
  "Tomato, lemon and China rose have axile placentation. Pea has marginal, mustard parietal, and sunflower basal placentation.")
S(c, "M", "Vexillary aestivation, with a large standard petal overlapping the two wing petals, which overlap the two keel petals, is characteristic of",
  "pea (family Fabaceae)", ["*Calotropis*", "China rose", "*Cassia*"],
  "The papilionaceous corolla of Fabaceae, with standard, wings and keel, shows vexillary aestivation. *Calotropis* is valvate, China rose twisted and *Cassia* imbricate.")
S(c, "E", "The edible part of a mango, a drupe, is the",
  "mesocarp", ["epicarp", "endocarp", "endosperm"],
  "In a mango the epicarp is the skin, the fleshy mesocarp is eaten, and the stony endocarp encloses the seed.")
S(c, "M", "In the grass family, the single cotyledon of the embryo is represented by the",
  "scutellum", ["coleoptile", "coleorhiza", "plumule"],
  "The scutellum is the shield-shaped cotyledon next to the endosperm; the coleoptile covers the plumule and the coleorhiza covers the radicle.")
S(c, "M", "Which of the following is a modified stem and NOT a modified root?",
  "Potato tuber", ["Sweet potato", "Carrot", "Radish"],
  "Potato tuber is a swollen underground stem with eyes (nodes) bearing buds. Sweet potato, carrot and radish are storage roots.")
S(c, "E", "A flower that can be divided into two equal halves by any vertical plane passing through the centre is",
  "actinomorphic (radially symmetrical)", ["zygomorphic", "asymmetric", "bilaterally symmetrical only"],
  "Actinomorphic flowers such as mustard and datura show radial symmetry; zygomorphic flowers such as pea and *Cassia* divide into equal halves in only one plane.")
S(c, "H", "In a flower with 10 stamens in which nine filaments are fused into a bundle and one is free, the stamens are described as",
  "diadelphous", ["monadelphous", "polyadelphous", "syngenesious"],
  "Two bundles of fused filaments make a diadelphous condition (9 + 1 in pea). Monadelphous means one bundle (China rose), polyadelphous many (citrus) and syngenesious refers to fused anthers (sunflower).")

# ------------------------------------------------------------------ BOT.ANAT
c = "BOT.ANAT"
S(c, "M", "Grasses regenerate quickly after being grazed by herbivores because of",
  "intercalary meristems at the bases of internodes", ["apical meristems of the root", "secondary meristems such as cork cambium", "xylem parenchyma"],
  "Intercalary meristems, located between mature tissues at the nodes or internode bases, allow regrowth of leaves and internodes after cutting or grazing.")
S(c, "E", "Which cells are the only living elements of xylem?",
  "xylem parenchyma", ["tracheids", "vessels", "xylem fibres"],
  "Tracheids, vessels and xylem fibres are dead at maturity (lignified, empty lumen); xylem parenchyma is living and stores food.")
S(c, "M", "Sieve tube elements have no nucleus at maturity. Their functioning is controlled by the nucleus of the adjacent",
  "companion cells", ["phloem fibres", "phloem parenchyma", "xylem parenchyma"],
  "Companion cells are living, nucleated cells connected to sieve tube elements by plasmodesmata and maintain the pressure gradient for phloem transport.")
S(c, "E", "Which tissue provides mechanical support to growing parts of a plant, such as young stems, and has cell walls thickened at the corners?",
  "collenchyma", ["sclerenchyma", "xylem", "aerenchyma"],
  "Collenchyma cells are living, with corner thickenings of cellulose, hemicellulose and pectin, giving flexible support to growing organs; sclerenchyma is dead and lignified.")
S(c, "E", "Vascular bundles that are scattered in the ground tissue and have no cambium (closed) are characteristic of the",
  "monocot stem", ["dicot stem", "dicot root only", "gymnosperm stem"],
  "A monocot stem shows scattered, conjoint, closed vascular bundles surrounded by sclerenchymatous sheaths; a dicot stem shows an open ring of bundles.")
S(c, "M", "In roots the protoxylem lies towards the periphery and the metaxylem towards the centre. This arrangement is called",
  "exarch", ["endarch", "mesarch", "collateral"],
  "Roots have exarch xylem, while stems have endarch xylem (protoxylem towards the pith).")
S(c, "E", "The age of a tree growing in a temperate region can be estimated by counting its",
  "annual rings, each formed by one season of activity of the vascular cambium", ["number of branches", "number of lenticels", "leaf scars only"],
  "In temperate climates the cambium is active in spring and slows in autumn; each pair of early and late wood forms one annual ring.")
S(c, "M", "Heartwood is dark and non-conducting because its cells are",
  "filled with tannins, resins, oils and gums and have lost their water-conducting function", ["living and actively dividing", "rich in chlorophyll", "filled with starch and thin-walled"],
  "The inner secondary xylem becomes heartwood: deposits of organic compounds make it dark, hard and durable, but it no longer conducts water.")
S(c, "M", "Dumb-bell-shaped guard cells are characteristic of the epidermis of",
  "grasses (monocots)", ["dicot leaves", "gymnosperm roots", "submerged aquatic roots"],
  "Guard cells are bean-shaped in dicots and dumb-bell-shaped in grasses. Bulliform cells in grass leaves help the leaf roll in water stress.")
S(c, "E", "In a typical dicot leaf, the mesophyll is differentiated into",
  "palisade parenchyma and spongy parenchyma", ["only palisade parenchyma", "only spongy parenchyma", "collenchyma and sclerenchyma"],
  "A dorsiventral (dicot) leaf has columnar palisade cells below the upper epidermis and loosely arranged spongy cells below; an isobilateral monocot leaf has undifferentiated mesophyll.")
S(c, "M", "The cork cambium (phellogen) cuts off",
  "phellem (cork) outwards and secondary cortex (phelloderm) inwards", ["phloem outwards and xylem inwards", "xylem outwards and phloem inwards", "cork inwards and secondary cortex outwards"],
  "Phellogen forms phellem toward the outside and phelloderm toward the inside; the three together constitute the periderm.")
S(c, "E", "Lenticels in woody stems are meant for",
  "gaseous exchange through the bark", ["secretion of resins", "photosynthesis", "water storage"],
  "Lenticels are lens-shaped openings in the periderm where loosely arranged cells allow exchange of gases.")
S(c, "M", "The radial and tangential walls of endodermal cells in roots have a band-like deposit of",
  "suberin (the Casparian strip)", ["lignin and cutin", "pectin and callose", "cellulose and starch"],
  "The Casparian strip of suberin blocks the apoplastic path so that water and ions must pass through the cell membranes of endodermal cells.")

# ------------------------------------------------------------------ BOT.CELL
c = "BOT.CELL"
S(c, "E", "Rudolf Virchow's addition to the cell theory was that",
  "new cells arise from pre-existing cells", ["all plants are made of cells", "all animals are made of cells", "cells can arise from non-living matter"],
  "Virchow stated omnis cellula-e cellula: cells divide and new cells form from pre-existing cells. Schleiden and Schwann had proposed that plants and animals are made of cells.")
S(c, "E", "The 'powerhouse of the cell', where aerobic respiration yields most ATP, is the",
  "mitochondrion", ["lysosome", "Golgi apparatus", "ribosome"],
  "Mitochondria have an outer membrane and an inner folded membrane (cristae) bearing ATP synthase; the Krebs cycle takes place in the matrix.")
S(c, "M", "The 80S ribosome of eukaryotes is made of subunits of",
  "60S and 40S", ["50S and 30S", "70S and 10S", "60S and 20S"],
  "Eukaryotic 80S ribosomes have 60S and 40S subunits. Prokaryotic 70S ribosomes have 50S and 30S subunits. S values are sedimentation coefficients and are not additive.")
S(c, "E", "Which cell organelle is the site of packaging, modification and secretion of proteins?",
  "Golgi apparatus", ["nucleolus", "peroxisome", "chloroplast"],
  "The Golgi apparatus, a stack of flattened cisternae, receives vesicles from the ER on its cis face, modifies them, and dispatches them from its trans face.")
S(c, "E", "Lysosomes are called 'suicide bags' because they contain",
  "hydrolytic enzymes active in acidic pH, which can digest the cell itself if released", ["photosynthetic pigments", "DNA and RNA polymerases", "respiratory enzymes for the Krebs cycle"],
  "Lysosomes carry acid hydrolases capable of digesting carbohydrates, proteins, lipids and nucleic acids; rupture releases these enzymes and digests the cell.")
S(c, "E", "The fluid mosaic model of the plasma membrane was proposed by",
  "Singer and Nicolson", ["Schleiden and Schwann", "Watson and Crick", "Robertson and Danielli"],
  "Singer and Nicolson (1972) described a quasi-fluid lipid bilayer with proteins embedded or attached, free to move laterally.")
S(c, "E", "Ribosomal RNA is synthesised mainly in the",
  "nucleolus", ["Golgi body", "smooth endoplasmic reticulum", "plasma membrane"],
  "The nucleolus is a non-membrane-bound region of the nucleus where rRNA is transcribed and ribosomal subunits begin assembly.")
S(c, "E", "Starch is stored in the colourless plastids called",
  "amyloplasts", ["elaioplasts", "aleuroplasts", "chromoplasts"],
  "Leucoplasts store nutrients: amyloplasts store starch, elaioplasts store oils and fats, and aleuroplasts store proteins. Chromoplasts hold carotenoid pigments.")
S(c, "M", "A centriole shows a cartwheel arrangement of nine peripheral fibrils, each a",
  "triplet of microtubules, with no central tubule", ["doublet of microtubules with two central tubules", "singlet of microfilaments", "doublet of microfilaments with no central tubule"],
  "Centrioles are 9+0: nine triplets and no central tubule. Cilia and flagella are 9+2 with nine doublets and two central singlets.")
S(c, "E", "Which of the following is present in both prokaryotic and eukaryotic cells?",
  "ribosomes", ["Golgi apparatus", "mitochondria", "endoplasmic reticulum"],
  "Ribosomes (70S in prokaryotes, 80S in eukaryotes) are present in all cells; prokaryotes lack membrane-bound organelles.")
S(c, "M", "Lipid synthesis and detoxification of drugs are chiefly the function of the",
  "smooth endoplasmic reticulum", ["rough endoplasmic reticulum", "lysosome", "nucleolus"],
  "The SER lacks ribosomes and is the site for lipid and steroid synthesis; the RER bears ribosomes and is involved in protein synthesis and secretion.")
S(c, "M", "The middle lamella of the plant cell wall is made mainly of",
  "calcium pectate", ["cellulose microfibrils", "lignin", "chitin"],
  "The middle lamella cements neighbouring cells and consists mostly of calcium pectate; primary and secondary walls are cellulosic.")
S(c, "M", "Microtubules are made up of the protein",
  "tubulin", ["actin", "histone", "myosin"],
  "Microtubules are polymers of tubulin dimers and form spindle fibres, cilia, flagella and centrioles; actin forms microfilaments.")
S(c, "H", "A student claims that chloroplasts and mitochondria are 'semi-autonomous organelles'. The best justification is that they",
  "contain their own circular DNA and 70S ribosomes and can make some of their own proteins", ["are not bounded by a membrane", "contain no DNA and rely entirely on nuclear genes", "are formed only by the Golgi apparatus"],
  "Both organelles carry a small circular DNA and 70S ribosomes and divide by fission, but still depend on nuclear genes for many proteins, hence semi-autonomous.")

# ------------------------------------------------------------------ BOT.CCD
c = "BOT.CCD"
S(c, "E", "DNA replication takes place in which phase of the cell cycle?",
  "S phase", ["G1 phase", "G2 phase", "M phase"],
  "The interphase has G1 (growth), S (DNA synthesis) and G2 (preparation for division). Replication is confined to the S phase.")
S(c, "E", "Cells that leave the cell cycle and remain metabolically active but do not divide are said to be in",
  "G0 (quiescent) stage", ["S phase", "prophase", "telophase"],
  "G0 is a quiescent stage entered from G1; many cells in the adult animal body, such as heart cells, remain in it.")
S(c, "E", "Separation of sister chromatids following the splitting of the centromere occurs in",
  "anaphase", ["prophase", "metaphase", "telophase"],
  "At anaphase the centromeres split and the chromatids, now daughter chromosomes, move to opposite poles.")
S(c, "E", "Chromosomes are most easily counted and studied at",
  "metaphase, when they are fully condensed and aligned on the equatorial plate", ["prophase, when nucleoli are visible", "telophase, when they decondense", "interphase, when they replicate"],
  "At metaphase the chromosomes are maximally condensed and held at the metaphase plate, so their morphology is clearest.")
S(c, "M", "Crossing over between non-sister chromatids of homologous chromosomes takes place in which substage of meiosis I?",
  "pachytene", ["leptotene", "zygotene", "diakinesis"],
  "Synapsis occurs in zygotene, and recombination nodules appear in pachytene where crossing over occurs; chiasmata become visible in diplotene and terminalise in diakinesis.")
S(c, "M", "Terminalisation of chiasmata occurs during",
  "diakinesis", ["zygotene", "pachytene", "anaphase II"],
  "In diakinesis the chiasmata slide towards the ends of the bivalents (terminalisation), and the nucleolus and nuclear envelope disappear.")
S(c, "E", "Cytokinesis in a plant cell occurs by",
  "formation of a cell plate from the centre outwards", ["a cleavage furrow from the periphery inwards", "budding", "fragmentation of the nucleus"],
  "Plant cells have walls, so a cell plate grows centrifugally from the phragmoplast; animal cells divide by a constricting cleavage furrow.")
S(c, "E", "The significance of meiosis in sexually reproducing organisms is that it",
  "keeps the chromosome number constant across generations and creates genetic variation", ["doubles the chromosome number of each gamete", "produces genetically identical gametes", "occurs only in somatic cells"],
  "Halving the chromosome number offsets the doubling at fertilisation, and crossing over plus independent assortment provide variation.")
S(c, "M", "The nuclear envelope and nucleolus reappear during",
  "telophase", ["prophase", "metaphase", "anaphase"],
  "At telophase the chromosomes decondense, the nuclear envelope reassembles around each set and the nucleolus reforms.")
AR(c, "M", "Meiosis I is called a reductional division.", "In anaphase I, homologous chromosomes (not sister chromatids) separate and move to opposite poles.", "A",
   "Because whole homologues segregate in anaphase I, the chromosome number per cell halves from 2n to n; this explains why meiosis I is reductional. Both statements are true and R explains A.")
# computed items
g1 = 2
g2 = 2 * g1
assert g2 == 4
N(c, "E", "A diploid cell has $2\\mathrm{C}$ amount of DNA in G1. Its DNA amount (in units of C) in G2 is ______.", g2,
  "DNA doubles in S phase, so $2\\mathrm{C}\\to4\\mathrm{C}$ in G2, while the chromosome number stays $2n$.", integer=True)
chrom = 2 * 10
chromatids_meta = 2 * chrom
assert chromatids_meta == 40
N(c, "M", "A cell with $2n=20$ is at metaphase of mitosis. The number of chromatids it contains is ______.", chromatids_meta,
  "Each of the 20 chromosomes has replicated into two sister chromatids, so $20\\times2=40$ chromatids are present at metaphase.", integer=True)
cells = 1
for _ in range(6):
    cells *= 2
assert cells == 64
N(c, "M", "Starting from a single cell, the number of mitotic divisions needed (with every cell dividing each round) to produce 64 cells is ______.", 6,
  "After $n$ rounds the number of cells is $2^n$; $2^n=64$ gives $n=6$.", integer=True)
assert 80 // 4 == 20
N(c, "M", "Each spore mother cell undergoes meiosis to produce four haploid spores. The number of spore mother cells required to produce 80 spores is ______.", 20,
  "One meiocyte gives 4 spores, so $80/4=20$ mother cells.", integer=True)
