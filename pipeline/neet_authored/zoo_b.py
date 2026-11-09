"""ZOO part B: Locomotion, Neural, Chemical coordination, Reproduction, Reproductive health, Evolution, Health & disease."""
import math

from . import AR, CODE, M, N, S

# ------------------------------------------------------------------ ZOO.LOC
c = "ZOO.LOC"
S(c, "E", "In a sarcomere, the dark A band is formed mainly by",
  "myosin (thick filaments), partly overlapping with actin", ["actin only", "troponin only", "collagen"],
  "The A band (anisotropic) contains myosin and the overlapping portion of actin; the I band (isotropic) has only actin filaments and is bisected by the Z line.")
S(c, "M", "During muscle contraction according to the sliding filament theory,",
  "the I band and the H zone become shorter while the A band keeps the same length", ["the A band becomes shorter", "the thick filaments shorten", "the Z lines move apart"],
  "Thin filaments slide inward over thick filaments, pulling Z lines closer; the length of each filament remains the same, so the A band stays constant.")
S(c, "M", "The release of Ca$^{2+}$ from the sarcoplasmic reticulum initiates contraction because Ca$^{2+}$",
  "binds to troponin and exposes the myosin-binding sites on actin", ["binds to myosin and destroys ATP", "binds to tropomyosin and digests it", "stops the action of the neurotransmitter"],
  "Ca$^{2+}$ binding to troponin causes a conformational change that moves tropomyosin and unmasks the active sites on actin for cross-bridge formation with myosin heads.")
S(c, "E", "Red muscle fibres, such as those used for sustained activity, have",
  "plenty of myoglobin and mitochondria and use aerobic respiration", ["very little myoglobin and few mitochondria", "no mitochondria", "only anaerobic respiration"],
  "Myoglobin gives red fibres their colour and stores oxygen; white fibres have less myoglobin, fewer mitochondria and rely on anaerobic glycolysis.")
S(c, "E", "Muscle fatigue after strenuous exercise is due to",
  "accumulation of lactic acid from anaerobic breakdown of glycogen", ["accumulation of oxygen", "excess ATP", "absence of Ca$^{2+}$ in blood"],
  "Anaerobic breakdown of glycogen produces lactic acid, which accumulates in muscle and causes fatigue.")
S(c, "M", "Rapid, uncontrolled muscle spasms due to low Ca$^{2+}$ in body fluids is",
  "tetany", ["myasthenia gravis", "gout", "muscular dystrophy"],
  "Tetany: rapid spasms from low Ca$^{2+}$. Myasthenia gravis is an autoimmune disorder affecting neuromuscular junctions; gout is inflammation of joints from uric acid crystals.")
S(c, "M", "Decreased bone mass and increased chances of fractures, common after menopause owing to decreased oestrogen, is",
  "osteoporosis", ["arthritis", "gout", "tetany"],
  "Osteoporosis is an age-related disorder with decreased bone mass; oestrogen deficiency is a common cause.")
vert = 7 + 12 + 5 + 1 + 1
assert vert == 26
N(c, "M", "The human vertebral column has 7 cervical, 12 thoracic, 5 lumbar, 1 sacral (fused) and 1 coccygeal (fused) vertebrae. The total number of vertebrae counted this way is ______.", vert,
  "$7+12+5+1+1=26$.", integer=True)
S(c, "E", "The joint between the humerus and the pectoral girdle, which allows movement in all directions, is a",
  "ball and socket joint", ["hinge joint", "pivot joint", "fibrous joint"],
  "Ball and socket joints occur at the shoulder and hip. The knee is a hinge joint and the joint between atlas and axis is a pivot joint.")
S(c, "E", "Immovable joints between the bones of the skull are",
  "fibrous joints", ["cartilaginous joints", "synovial joints", "hinge joints"],
  "Fibrous joints (sutures) do not allow any movement; cartilaginous joints (e.g. between vertebrae) allow limited movement; synovial joints allow considerable movement.")
S(c, "M", "In humans, the number of pairs of 'true ribs' attached to the sternum directly through hyaline cartilage is",
  "7", ["3", "2", "12"],
  "Of the 12 pairs of ribs, the first seven pairs are true ribs; the 8th, 9th and 10th (false ribs) join indirectly, and the 11th and 12th are floating ribs.")
S(c, "M", "Cilia and flagella move by",
  "the sliding of microtubules in the 9+2 axoneme, driven by dynein arms and ATP", ["muscle contraction", "pseudopodia formation", "sliding of actin and myosin"],
  "Ciliary movement is seen in the trachea and in the oviduct; amoeboid movement involves pseudopodia formed by microfilaments.")
S(c, "H", "The Z line of a sarcomere",
  "bisects the I band and anchors the thin filaments", ["lies in the centre of the H zone", "is made of myosin", "bisects the A band"],
  "A sarcomere is the portion between two successive Z lines; the M line lies in the middle of the A band, anchoring thick filaments.")

# ------------------------------------------------------------------ ZOO.NEU
c = "ZOO.NEU"
S(c, "E", "The part of a neuron that carries impulses away from the cell body is the",
  "axon", ["dendrite", "Nissl granule", "synaptic cleft"],
  "Dendrites receive impulses and carry them towards the cell body (cyton); the axon transmits the impulse away.")
S(c, "M", "The sodium-potassium pump maintaining the resting potential moves",
  "3 Na$^+$ out and 2 K$^+$ in per ATP", ["2 Na$^+$ out and 3 K$^+$ in", "3 Na$^+$ in and 2 K$^+$ out", "1 Na$^+$ out and 1 K$^+$ in"],
  "The pump expels three Na$^+$ and takes in two K$^+$ using ATP, keeping the inside of the neuron negative relative to the outside at rest.")
S(c, "E", "During the rising phase of an action potential, the membrane potential is reversed because of",
  "rapid influx of Na$^+$", ["efflux of K$^+$", "influx of Cl$^-$", "efflux of Na$^+$"],
  "Depolarisation: voltage-gated Na$^+$ channels open and Na$^+$ rush in; repolarisation follows as Na$^+$ channels close and K$^+$ leaves.")
S(c, "E", "Impulse conduction is faster in myelinated axons because the impulse",
  "jumps from one node of Ranvier to the next (saltatory conduction)", ["moves through the myelin sheath", "moves along the dendrites", "is carried by blood"],
  "Myelin insulates the axon, so depolarisation occurs only at the nodes, increasing the speed of conduction.")
S(c, "M", "A neurotransmitter released at a chemical synapse",
  "diffuses across the synaptic cleft and binds to receptors on the post-synaptic membrane", ["passes through gap junctions", "is released into the blood only", "is always inhibitory"],
  "Impulse arrival at the axon terminal causes synaptic vesicles to fuse with the pre-synaptic membrane and release neurotransmitter (e.g. acetylcholine), which opens ion channels on the post-synaptic membrane.")
S(c, "E", "The 'fight or flight' response is mediated by the",
  "sympathetic nervous system", ["parasympathetic nervous system", "somatic nervous system", "enteric nervous system only"],
  "The sympathetic system increases heart rate and prepares the body for emergency; the parasympathetic system does the opposite (rest and digest).")
S(c, "M", "Which part of the brain controls body temperature, hunger and thirst?",
  "hypothalamus", ["cerebellum", "medulla oblongata", "corpus callosum"],
  "The hypothalamus contains centres for temperature regulation, hunger and thirst and secretes releasing hormones; the cerebellum controls balance and coordination.")
S(c, "M", "Centres controlling cardiovascular reflexes, respiration and gastric secretions are located in the",
  "medulla oblongata", ["cerebrum", "cerebellum", "thalamus"],
  "The medulla is part of the hindbrain and connects to the spinal cord.")
S(c, "E", "The correct sequence of events in a simple reflex arc is",
  "receptor, sensory neuron, spinal cord, motor neuron, effector", ["receptor, motor neuron, spinal cord, sensory neuron, effector", "effector, sensory neuron, spinal cord, motor neuron, receptor", "sensory neuron, receptor, motor neuron, effector"],
  "The stimulus is detected by a receptor, carried by a sensory (afferent) neuron to the CNS, processed, and a motor (efferent) neuron conducts it to an effector.")
S(c, "M", "The retinal region with the highest concentration of cone cells and sharpest vision (the fovea) lies in the",
  "macula lutea (yellow spot)", ["blind spot", "choroid", "ciliary body"],
  "The fovea is a thinned-out portion of the macula lutea where only cones are densely packed; at the blind spot no photoreceptors are present.")
S(c, "M", "Rod cells contain a purple pigment, rhodopsin, derived from",
  "vitamin A", ["vitamin C", "vitamin K", "vitamin B$_{12}$"],
  "Rods function in dim light (scotopic vision) and contain rhodopsin, made from opsin and retinal (an aldehyde of vitamin A); cones function in bright light and give colour vision.")
S(c, "E", "The smallest bone of the human body, found in the middle ear, is the",
  "stapes", ["malleus", "incus", "cochlea"],
  "The three ear ossicles are malleus, incus and stapes; the stapes is attached to the oval window.")
S(c, "H", "The organ of Corti, containing hair cells that convert sound vibrations into nerve impulses, is located in the",
  "cochlea", ["semicircular canals", "utricle", "Eustachian tube"],
  "The organ of Corti rests on the basilar membrane inside the cochlea; the vestibular apparatus (semicircular canals, otolith organs) is for balance.")

# ------------------------------------------------------------------ ZOO.CHC
c = "ZOO.CHC"
S(c, "E", "Oxytocin and vasopressin are released from the",
  "posterior pituitary (neurohypophysis)", ["anterior pituitary", "adrenal cortex", "thyroid gland"],
  "They are synthesised by the hypothalamic neurons and transported along axons to the neurohypophysis, from where they are released.")
AR(c, "M", "The neurohypophysis does not synthesise its own hormones.", "Oxytocin and vasopressin are produced by neurons of the hypothalamus and transported along axons to the posterior pituitary for storage and release.", "A",
   "Because the hormones are made in the hypothalamus and only stored and released by the neurohypophysis, A is true, and R explains it.")
S(c, "E", "Over-secretion of growth hormone in adults causes",
  "acromegaly", ["gigantism", "dwarfism", "goitre"],
  "Excess GH in childhood leads to gigantism, while in adults it causes acromegaly (abnormal growth of hands, jaw, etc.); deficiency in childhood causes pituitary dwarfism.")
S(c, "E", "Simple goitre is caused by",
  "deficiency of iodine in the diet, leading to enlargement of the thyroid", ["excess iodine only", "deficiency of calcium", "excess of insulin"],
  "Low iodine reduces thyroxine synthesis; the pituitary then increases TSH, causing thyroid enlargement. Hypothyroidism during pregnancy causes cretinism in the child.")
S(c, "M", "The hormone that lowers blood calcium level by suppressing bone resorption is",
  "calcitonin", ["parathyroid hormone", "thyroxine", "glucagon"],
  "Calcitonin from the thyroid decreases blood Ca$^{2+}$; parathormone (PTH) from the parathyroids raises it by increasing bone resorption and renal reabsorption.")
S(c, "E", "Which gland secretes thymosins that promote the differentiation of T-lymphocytes?",
  "thymus", ["pineal", "adrenal", "thyroid"],
  "The thymus plays a major role in immunity; it degenerates in old age, so cell-mediated immunity weakens.")
S(c, "E", "The 'emergency hormones' or hormones of 'fight or flight', which increase alertness, heart rate and breathing, are",
  "adrenaline and noradrenaline from the adrenal medulla", ["cortisol and aldosterone from the cortex", "thyroxine only", "insulin and glucagon"],
  "The adrenal medulla secretes catecholamines that also increase the breakdown of glycogen and lipids.")
S(c, "E", "Which hormone is hyperglycaemic, increasing the blood glucose level?",
  "glucagon from the $\\alpha$ cells of the pancreas", ["insulin from the $\\beta$ cells", "calcitonin", "oxytocin"],
  "Glucagon stimulates glycogenolysis and gluconeogenesis; insulin is hypoglycaemic, so its deficiency causes diabetes mellitus.")
S(c, "M", "Interstitial (Leydig) cells of the testis secrete",
  "androgens such as testosterone", ["oestrogen only", "FSH", "inhibin only"],
  "Androgens regulate the development and functions of the male accessory organs and are responsible for muscular growth and the deep voice.")
S(c, "M", "Steroid hormones differ from peptide hormones in that steroid hormones",
  "bind to intracellular receptors and regulate gene expression", ["bind only to membrane receptors and use cAMP", "are all produced by the pituitary", "cannot cross the lipid membrane"],
  "Steroid hormones (cortisol, oestrogen, testosterone) are lipid-soluble and enter cells; peptide hormones bind to cell-surface receptors and use second messengers such as cAMP.")
S(c, "M", "The hormone secreted by the kidney that stimulates the formation of red blood cells is",
  "erythropoietin", ["renin", "aldosterone", "calcitonin"],
  "Juxtaglomerular cells of the kidney secrete erythropoietin, which stimulates erythropoiesis in the bone marrow.")
S(c, "E", "Melatonin from the pineal gland",
  "regulates the 24-hour (diurnal) rhythm, including sleep-wake cycle and body temperature", ["lowers blood glucose", "stimulates milk ejection", "causes ovulation"],
  "Melatonin also influences metabolism, pigmentation and the menstrual cycle, and defence capability.")
S(c, "H", "The hormone secreted by the corpus luteum to maintain the endometrium for implantation and pregnancy is",
  "progesterone", ["FSH", "oxytocin", "testosterone"],
  "After ovulation, the ruptured follicle becomes the corpus luteum, which secretes large amounts of progesterone.")

# ------------------------------------------------------------------ ZOO.HRP
c = "ZOO.HRP"
S(c, "E", "The testes are located outside the abdominal cavity in the scrotum because",
  "spermatogenesis requires a temperature 2-2.5 °C lower than the normal internal body temperature", ["sperm need a higher temperature", "the scrotum secretes hormones", "the abdominal cavity lacks blood"],
  "The scrotum acts as a thermoregulator for the testes, keeping them slightly below body temperature.")
S(c, "E", "The acrosome in the head of a sperm contains",
  "hydrolytic enzymes that help to penetrate the egg membranes", ["mitochondria", "the centriole", "RNA polymerase"],
  "The acrosome is a cap-like structure derived from the Golgi apparatus; mitochondria are in the middle piece, providing energy for the tail.")
S(c, "M", "Sertoli cells of the seminiferous tubules",
  "nourish the developing sperm and are regulated by FSH", ["secrete androgens", "produce LH", "are the site of meiosis only"],
  "Sertoli cells provide nutrition to germ cells; Leydig cells outside the tubules secrete androgens under LH control.")
spg = 100
assert spg // 4 == 25
N(c, "M", "One primary spermatocyte forms four sperms. The number of primary spermatocytes required to form 100 sperms is ______.", 25,
  "$100/4=25$.", integer=True)
N(c, "M", "One primary oocyte forms one functional ovum (plus polar bodies). The number of primary oocytes required to form 100 ova is ______.", 100,
  "Each primary oocyte yields a single functional ovum, so 100 are needed.", via="second-derivation", integer=True)
S(c, "M", "A secondary oocyte completes its second meiotic division",
  "only if it is penetrated by a sperm", ["before ovulation", "in the foetus", "at puberty regardless of fertilisation"],
  "Primary oocytes are arrested at prophase I in the foetus; the secondary oocyte is arrested at metaphase II and completes meiosis II only after sperm entry.")
S(c, "E", "In a normal human menstrual cycle of 28 days, ovulation occurs about on day",
  "14", ["1", "7", "28"],
  "The rise in LH (the surge) around the middle of the cycle induces rupture of the Graafian follicle and release of the ovum.")
S(c, "M", "The luteal phase of the menstrual cycle is characterised by",
  "the corpus luteum secreting progesterone to prepare the endometrium", ["maximum FSH secretion and follicle growth", "menstrual bleeding", "the rupture of the follicle"],
  "After ovulation the remaining cells of the follicle become the corpus luteum; if no fertilisation, it degenerates and menstruation follows.")
S(c, "M", "Fertilisation in humans normally takes place in the",
  "ampullary-isthmic junction of the fallopian tube", ["uterus", "vagina", "ovary"],
  "Sperm and ovum meet in the ampulla region of the oviduct; the zygote then divides as it moves to the uterus.")
S(c, "M", "The blastocyst becomes implanted in the endometrium through its",
  "trophoblast cells", ["inner cell mass only", "zona pellucida", "amnion"],
  "Trophoblast attaches to the endometrium; the inner cell mass develops into the embryo.")
S(c, "E", "The pregnancy hormone whose detection is the basis of pregnancy tests is",
  "hCG (human chorionic gonadotropin)", ["FSH", "oxytocin", "melatonin"],
  "hCG is produced by the placenta (trophoblast) and maintains the corpus luteum early in pregnancy.")
S(c, "M", "Which hormone is involved in the initiation of the foetal ejection reflex leading to parturition?",
  "oxytocin", ["progesterone", "prolactin", "hCG"],
  "Signals from the fully developed foetus and the placenta induce mild uterine contractions; oxytocin then acts on the uterine muscle, causing stronger contractions.")
S(c, "E", "The first milk produced after child birth, rich in antibodies (IgA), is",
  "colostrum", ["whey", "lactose", "pancreatic juice"],
  "Colostrum contains several antibodies absorbed by the infant to build resistance.")
S(c, "M", "Which of the following is NOT secreted by the placenta?",
  "FSH", ["hCG", "human placental lactogen", "oestrogen"],
  "The placenta secretes hCG, hPL, oestrogens, progesterone and relaxin; FSH is a pituitary hormone.")
S(c, "H", "The early embryo at the 8-16 cell stage, a solid ball of blastomeres, is called the",
  "morula", ["blastocyst", "gastrula", "zygote"],
  "Cleavage divisions of the zygote give a morula, which continues to divide and forms the blastocyst with a cavity.")
S(c, "H", "FSH acts on Sertoli cells and LH acts on",
  "Leydig cells, stimulating the synthesis and secretion of androgens", ["Sertoli cells again to make androgens", "the epididymis only", "spermatids directly"],
  "GnRH from the hypothalamus acts on the anterior pituitary to secrete LH and FSH; LH acts on Leydig cells and FSH on Sertoli cells.")

# ------------------------------------------------------------------ ZOO.RPH
c = "ZOO.RPH"
S(c, "E", "Which of the following contraceptive methods also protects against sexually transmitted infections?",
  "condoms", ["copper-T", "oral pills", "tubectomy"],
  "Condoms are barrier methods that prevent contact of the sperm and ovum and also reduce the risk of STIs; IUDs and pills do not protect against infections.")
S(c, "M", "Copper-releasing IUDs prevent pregnancy mainly because Cu$^{2+}$ ions",
  "suppress sperm motility and the fertilising capacity of sperm", ["kill the ovum before ovulation", "increase FSH secretion", "block the fallopian tube permanently"],
  "Copper-releasing IUDs (Cu-T, Cu-7, Multiload 375) are ideal for women who want to delay pregnancy or space children.")
S(c, "M", "Oral contraceptive pills prevent pregnancy by",
  "inhibiting ovulation and implantation and altering cervical mucus to retard sperm entry", ["killing sperm in the testis", "causing menstruation continuously", "increasing LH"],
  "Pills contain progestogens or progestogen-oestrogen combinations; 'Saheli' is a non-steroidal oral contraceptive developed in India.")
S(c, "E", "The surgical method of contraception in males is",
  "vasectomy", ["tubectomy", "caesarean section", "hysterectomy"],
  "In vasectomy a small part of the vas deferens is removed or tied; in tubectomy, a small part of the fallopian tube is removed or tied.")
S(c, "M", "Medical termination of pregnancy (MTP) is generally considered safest during",
  "the first trimester", ["the third trimester", "the last week of pregnancy", "any time without risk"],
  "MTPs are legal in India with regulations under the MTP Act, 1971; they are safest in the first trimester, and the later stages have greater risks.")
S(c, "M", "Which of the following is a viral sexually transmitted infection?",
  "genital herpes", ["syphilis", "gonorrhoea", "trichomoniasis"],
  "Genital herpes, genital warts, hepatitis-B and HIV infection are viral; syphilis and gonorrhoea are bacterial and trichomoniasis is caused by a protozoan.")
S(c, "E", "'Test tube baby' programme involves",
  "in vitro fertilisation followed by embryo transfer", ["fertilisation inside the oviduct only", "artificial insemination only", "cloning of the embryo"],
  "In IVF, ova and sperm are fused in a laboratory under simulated conditions; the zygote or early embryo is then transferred to the female reproductive tract.")
S(c, "H", "In embryo transfer, an embryo with more than eight blastomeres is transferred into the",
  "uterus (IUT)", ["fallopian tube (ZIFT)", "vagina", "ovary"],
  "Zygote or early embryos up to eight blastomeres are transferred into the fallopian tube (ZIFT), and those with more than eight blastomeres into the uterus (IUT).")
S(c, "M", "Lactational amenorrhea as a natural contraceptive method is effective",
  "only up to a maximum period of about six months after parturition, if the mother breastfeeds fully", ["for several years after birth in all cases", "only during pregnancy", "only in the first week after birth"],
  "During intense lactation the absence of menstrual cycle (and ovulation) provides a natural contraceptive effect, but only for about six months.")
S(c, "M", "Emergency contraception, which can prevent pregnancy if taken after unprotected coitus, must be taken within",
  "72 hours of coitus", ["7 days of coitus", "one month of coitus", "the first trimester"],
  "Administration of progestogens or progestogen-oestrogen combinations or IUDs within 72 hours of coitus is very effective.")
S(c, "E", "Amniocentesis is a prenatal diagnostic technique used to",
  "detect genetic and developmental disorders in the foetus by testing the amniotic fluid", ["increase fertility", "terminate pregnancy", "determine the sex for selection"],
  "The test is banned for sex determination in India because of its misuse for female foeticide.")
S(c, "M", "GIFT (gamete intrafallopian transfer) involves the transfer of",
  "an ovum collected from a donor into the fallopian tube of another female who cannot produce ova but can provide suitable conditions for fertilisation", ["a zygote into the uterus", "sperm into the vagina", "an embryo into a male"],
  "In GIFT, the gametes are transferred into the fallopian tube, so fertilisation happens in vivo, unlike IVF or ZIFT.")

# ------------------------------------------------------------------ ZOO.EVO
c = "ZOO.EVO"
q2 = 0.04
q = math.sqrt(q2)
p = 1 - q
assert abs(q - 0.2) < 1e-12 and abs(2 * p * q - 0.32) < 1e-12
N(c, "M", "In a population in Hardy-Weinberg equilibrium, 4% of individuals show a recessive trait ($q^2=0.04$). The frequency of the dominant allele $p$ is ______.", 0.8,
  "$q=\\sqrt{0.04}=0.2$, so $p=1-q=0.8$.", tol=0.001)
N(c, "M", "In the population above ($q^2=0.04$), the number of heterozygous carriers in a population of 10,000 is ______.", 3200,
  "$2pq=2\\times0.8\\times0.2=0.32$, so $0.32\\times10000=3200$.", integer=True)
p = 0.6
assert abs(p * p - 0.36) < 1e-12 and abs(2 * p * (1 - p) - 0.48) < 1e-12 and abs((1 - p) ** 2 - 0.16) < 1e-12
N(c, "M", "If the frequency of allele A is $0.6$ in a population at Hardy-Weinberg equilibrium, the frequency of the heterozygote Aa is ______.", 0.48,
  "$2pq=2\\times0.6\\times0.4=0.48$ (AA $=0.36$, aa $=0.16$).", tol=0.001)
S(c, "E", "Which of the following would disturb Hardy-Weinberg equilibrium in a population?",
  "natural selection favouring one genotype", ["random mating", "a very large population size", "absence of mutation"],
  "The equilibrium holds only if there is no selection, no gene flow, no mutation, no genetic drift (large population) and random mating; any departure, such as selection, means allele frequencies change, i.e. evolution is occurring.")
S(c, "E", "The Miller-Urey experiment simulated early-Earth conditions and showed the formation of",
  "amino acids from CH$_4$, H$_2$, NH$_3$ and water vapour under electric discharge", ["living cells", "DNA genomes", "oxygen-producing algae"],
  "Miller (1953) used a closed flask with CH$_4$, H$_2$, NH$_3$ and water vapour at 800 °C with electric discharge; amino acids formed, supporting chemical evolution.")
S(c, "E", "The wings of a bird and the wings of a butterfly are examples of",
  "analogous organs, evolved by convergent evolution", ["homologous organs, evolved by divergent evolution", "vestigial organs", "homologous organs, evolved by convergent evolution"],
  "They perform the same function but have different structure and origin, so they are analogous.")
S(c, "E", "The forelimbs of whales, bats, cheetahs and humans are",
  "homologous, showing adaptive radiation (divergent evolution)", ["analogous organs", "vestigial organs", "convergent structures"],
  "They share the same basic bone pattern (humerus, radius-ulna, carpals, metacarpals, phalanges) but are modified for different functions.")
S(c, "M", "The occurrence of Darwin's finches with different beak types in the Galápagos Islands is an example of",
  "adaptive radiation", ["convergent evolution", "genetic drift only", "artificial selection"],
  "A single ancestral seed-eating finch diversified into species with beaks adapted to different foods, an example of adaptive radiation.")
S(c, "M", "In the peppered moth (*Biston betularia*) after industrialisation in England, the dark (melanic) form increased because",
  "predatory birds could more easily see the light form on soot-darkened tree trunks, so the dark form had a selective advantage", ["the dark form mutated more rapidly because of soot", "light moths turned dark individually", "birds preferred dark moths"],
  "This is natural selection: the dark form was better camouflaged on polluted trees and survived and reproduced more.")
S(c, "M", "The 'mutation theory' of evolution, which proposes that large, sudden, heritable changes (saltation) drive speciation, was proposed by",
  "Hugo de Vries", ["Jean-Baptiste Lamarck", "Charles Darwin", "Alfred Wallace"],
  "De Vries, working on evening primrose, proposed that speciation happens by saltation; Darwin's variations were small and directional.")
S(c, "M", "Lamarck's theory of evolution proposed that",
  "organs used extensively become better developed and the acquired characters are inherited", ["variations arise by random mutation and the fittest survive", "evolution proceeds by saltation", "organisms never change"],
  "Lamarck's 'use and disuse' and inheritance of acquired characters (the giraffe's neck) is not supported by evidence, unlike Darwin's natural selection.")
S(c, "M", "A type of natural selection in which individuals at both extremes of a trait are favoured and the average individuals are selected against is",
  "disruptive selection", ["stabilising selection", "directional selection", "artificial selection"],
  "Disruptive selection produces two peaks in the distribution; stabilising selection favours the average and directional selection one extreme.")
S(c, "M", "The brain capacity of *Homo habilis* was about",
  "650-800 cc", ["900 cc", "1400 cc", "350 cc"],
  "*Homo habilis* (about 650-800 cc) was probably the first human-like being and did not eat meat; *Homo erectus* had about 900 cc and Neanderthals about 1400 cc.")
S(c, "M", "A sudden change in allele frequencies in a small isolated population founded by a few individuals is called",
  "the founder effect (a type of genetic drift)", ["gene flow by migration", "stabilising selection", "natural selection"],
  "A few individuals that start a new population carry only a part of the gene pool of the original population, so the allele frequencies differ by chance.")
S(c, "H", "*Archaeopteryx*, a fossil with feathers, a long tail with vertebrae and teeth in the jaws, is regarded as a connecting link between",
  "reptiles and birds", ["fishes and amphibians", "amphibians and reptiles", "birds and mammals"],
  "It had reptilian characters (teeth, long bony tail, claws) and bird-like characters (feathers, wings), so it is considered a transitional form.")

# ------------------------------------------------------------------ ZOO.HHD
c = "ZOO.HHD"
S(c, "E", "Typhoid fever is caused by",
  "*Salmonella typhi*", ["*Plasmodium vivax*", "*Entamoeba histolytica*", "*Wuchereria bancrofti*"],
  "*Salmonella typhi* is a bacterium that spreads through contaminated food and water; the Widal test confirms typhoid.")
S(c, "E", "The vector of the malarial parasite *Plasmodium* is the",
  "female *Anopheles* mosquito", ["female *Culex* mosquito", "female *Aedes* mosquito", "tsetse fly"],
  "The female *Anopheles* transmits the infective sporozoites during a blood meal; the parasite's gametocytes develop in the mosquito's gut.")
S(c, "M", "The infective stage of *Plasmodium* that enters the human body with the bite of an infected mosquito is the",
  "sporozoite", ["gametocyte", "trophozoite in blood cells", "merozoite in the mosquito gut"],
  "Sporozoites from the salivary glands of the mosquito enter the human liver; gametocytes in the human blood are taken up by a mosquito to continue the cycle.")
S(c, "M", "Filariasis (elephantiasis) is caused by",
  "*Wuchereria bancrofti* and transmitted by *Culex* mosquitoes", ["*Ascaris lumbricoides*, via contaminated food", "*Trichophyton*, via skin contact", "*Salmonella* via water"],
  "Filarial worms live in the lymphatic vessels of the lower limbs, causing chronic inflammation and swelling.")
S(c, "E", "Ringworm is a disease caused by",
  "fungi such as *Trichophyton*, *Microsporum* and *Epidermophyton*", ["bacteria like *Salmonella*", "viruses", "protozoans such as *Giardia*"],
  "Dry, scaly lesions with intense itching appear on the skin, nails and scalp; heat and moisture help the fungus grow.")
S(c, "E", "The secondary immune response, compared with the primary response, is",
  "quicker and more intense because of memory B and T cells", ["slower and weaker", "absent", "due to innate immunity only"],
  "On second exposure to the same antigen memory cells respond rapidly, producing high levels of antibody; this is the basis of vaccination.")
S(c, "M", "Antibodies (immunoglobulins) are made of",
  "two light and two heavy polypeptide chains, written as H$_2$L$_2$", ["a single polypeptide chain", "RNA only", "four identical light chains"],
  "Each antibody molecule has four chains, 2 heavy and 2 light.")
S(c, "M", "Which of the following provides passive immunity?",
  "injection of preformed antibodies, such as antivenom", ["vaccination with weakened pathogens", "recovery after a natural infection", "exposure to a mild infection"],
  "Passive immunity means readymade antibodies are given (antivenom, tetanus antitoxin) or passed from the mother (colostrum, placenta).")
S(c, "E", "In allergy, the chemical released by mast cells that causes symptoms such as sneezing and itching is",
  "histamine, triggered by IgE antibodies", ["insulin", "interferon", "fibrinogen"],
  "Allergens induce IgE production; on re-exposure, IgE bound to mast cells triggers the release of histamine and serotonin.")
S(c, "M", "HIV mainly infects",
  "helper T-lymphocytes (TH cells), causing a decline in the immune system", ["red blood cells", "neurons only", "osteoblasts"],
  "HIV is a retrovirus with RNA; reverse transcriptase makes viral DNA which integrates into the host genome; the loss of helper T cells leads to AIDS.")
S(c, "M", "HIV cannot be transmitted by",
  "mosquito bites and casual contact such as hugging", ["unprotected sexual contact", "contaminated needles", "infected mother to child through the placenta"],
  "HIV spreads by sexual contact with an infected person, by transfusion of contaminated blood and by sharing needles, and from infected mother to child.")
S(c, "M", "Cancer cells differ from normal cells because they",
  "lose contact inhibition and can spread to other parts (metastasis)", ["show strict contact inhibition", "do not divide", "are always benign"],
  "Normal cells stop dividing when they touch other cells (contact inhibition); cancer cells have lost this property and metastasise.")
S(c, "M", "Heroin, commonly called smack, is chemically",
  "diacetylmorphine, obtained by acetylation of morphine", ["a derivative of cannabinoid", "an alkaloid from the coca plant", "obtained from tobacco"],
  "Morphine is extracted from the latex of *Papaver somniferum*; acetylation gives heroin, which depresses the body's functions.")
S(c, "M", "Cocaine, obtained from the coca plant *Erythroxylum coca*, interferes with the transport of the neurotransmitter",
  "dopamine", ["acetylcholine at the neuromuscular junction", "insulin", "melatonin"],
  "Cocaine produces a sense of euphoria and increased energy; excessive dosage causes hallucinations.")
S(c, "H", "The primary lymphoid organs, where B and T lymphocytes mature, are",
  "bone marrow and thymus", ["spleen and tonsils", "lymph nodes and Peyer's patches", "liver and kidney"],
  "Lymphocytes originate in the bone marrow; B cells mature there while T cells migrate to the thymus; the spleen, lymph nodes and MALT are secondary lymphoid organs.")
