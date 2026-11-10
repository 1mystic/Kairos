"""MSD part A: FRAME, DATA, FEAT, MODEL, EVAL, SERVE, MON. Source tags: ml1..ml6 = individual case PDFs, cs1..cs10 = combined case studies."""
import math
from .dsl import A, C, M, N, S

# ---------------------------------------------------------------- FRAME
C("MSD.FRAME", "ml:general framing + ml1-ml6 section 2")
S("E", "Before choosing a model, which step of an ML system design comes first?",
  "Clarify the product goal, the prediction target and the constraints (latency, cost, data)", ["Pick the largest available model", "Buy GPUs", "Start labelling randomly"],
  "The objective, target and constraints determine every later choice.")
S("M", "A spam filter team optimises overall accuracy on a stream where 2% of mail is spam. Why is accuracy a poor sole metric?",
  "A model that labels everything as not-spam is 98% accurate but useless", ["Accuracy cannot be computed", "Accuracy ignores true negatives only", "Accuracy is always correct for imbalanced data"],
  "With heavy imbalance, majority-class prediction scores high accuracy; use precision, recall or cost-weighted metrics.", s="ml1 Spam classifier")
S("M", "For an email spam filter, which error is usually more harmful to users?",
  "A false positive: a legitimate email sent to the spam folder", ["A false negative: spam in the inbox", "Both are always identical", "Neither matters"],
  "Missing a genuine email (an interview invitation, say) is costlier than seeing some spam, so thresholds are set conservatively.", s="ml1 Spam classifier")
S("M", "A video platform's goal is long-term user satisfaction, but the team trains on click-through rate. What is the risk?",
  "Optimising a proxy such as clicks can reward clickbait that lowers satisfaction", ["Clicks are always perfectly aligned with satisfaction", "CTR cannot be measured", "There is no risk"],
  "Proxy metrics can diverge from the true goal; add watch time, surveys or long-term metrics.", s="cs2 Feed ranking")
S("M", "In a design problem, an explicit cost cap such as 3,000 dollars per month most directly influences which choice?",
  "Which components are affordable, for example lightweight CPU models instead of persistent GPU clusters", ["The programming language of the UI", "The colour of the dashboard", "The font size"],
  "Hard budgets prune expensive offline training, GPU serving and large stores first.", s="ml1 Spam classifier")
N("M", "A stream of 100,000,000 emails per day arrives. What is the average request rate per second (86,400 s per day)? Round to the nearest integer.", 100e6 / 86400, 1, "$10^8/86400\\approx1157$ requests per second.", s="ml1 Spam classifier")
N("M", "Using the average of about 1,157 requests per second and a 2.5x peak multiplier, what is the peak requests per second? Round to the nearest integer.", 100e6 / 86400 * 2.5, 2, "Peak $\\approx1157\\times2.5\\approx2893$ requests per second.", s="ml1 Spam classifier")
S("H", "A product manager asks for 99.99% availability on a spam filter that depends on an ML model server. Which design element directly supports this goal?",
  "A rule-based fallback engine that handles requests when the model fails, times out or is uncertain", ["Removing monitoring", "A single model server", "Retraining every hour"],
  "The model is a dependency; a deterministic fallback keeps the service answering when it is unavailable.", s="ml1 Spam classifier")
M("M", "Select all items that belong in the problem framing step of ML system design.",
  [("Defining the prediction target and how its labels will be obtained", True), ("Choosing business and model metrics", True), ("Stating latency, throughput and cost constraints", True), ("Tuning the learning rate of the final model", False)],
  "Framing is about what to predict, how success is measured and what limits apply; hyperparameters come later.")
A("M", "In fraud detection, declining a legitimate payment can cost more than allowing one fraudulent charge.", "A false positive causes customer friction and lost revenue, whereas a single fraudulent charge has bounded loss.", 1,
  "That is why thresholds and step-up authentication are tuned against both costs, not only to maximise catches.", s="ml3 Fraud")

# ---------------------------------------------------------------- DATA
C("MSD.DATA", "ml2/ml3/ml4 imbalance; general data")
S("E", "What is training-serving skew?",
  "A mismatch between how features are computed in training and in production serving", ["A GPU hardware fault", "A slow network", "A misspelt column name only"],
  "If training uses data or logic different from serving, offline metrics will not reflect production.", s="ml1 Spam classifier")
S("M", "How can you prevent training-serving skew when building a training set from logged traffic?",
  "Log the exact feature vector used at serving time and train on those logged features", ["Recompute features later from current database state", "Use different code for training", "Guess feature values"],
  "Recomputing from today's state leaks the future and changes values; logged features are point-in-time correct.", s="ml1 Spam classifier")
N("M", "Training data has 1 positive per 100 negatives. After downsampling negatives with sampling fraction $\\beta=0.1$, the positive-to-negative ratio becomes 1 to what number of negatives?", 100 * 0.1, 0.01, "Keeping 10% of negatives turns 100 negatives into 10, so the ratio is 1:10.", s="ml2 Video recs")
p_prime = 0.5
beta = 0.1
p_corr = beta * p_prime / (1 - p_prime + beta * p_prime)
N("H", "A model trained on negative-downsampled data (negatives kept with fraction $\\beta=0.1$) outputs $p'=0.5$. Using $p=\\beta p'/(1-p'+\\beta p')$, what is the corrected probability? Give 4 decimals.", p_corr, 0.0005, "$p=0.1\\times0.5/(1-0.5+0.05)=0.05/0.55=0.0909$. Check: odds $p'/(1-p')=1$ scale by $\\beta$ to odds $0.1$, and $0.1/1.1=0.0909$.", s="ml2 Video recs")
S("M", "Why must probabilities be recalibrated after training on downsampled negatives?",
  "Downsampling inflates the predicted positive probability relative to the true base rate, so thresholds and expected-cost calculations would be wrong", ["Downsampling lowers probabilities", "Recalibration is only cosmetic", "It makes the model deeper"],
  "The model sees an artificially high positive rate; applying the Bayes adjustment restores true odds.", s="ml3 Fraud")
S("M", "Why are explicit skips and plain non-clicks treated differently in recommendation training data?",
  "A skip is a stronger negative signal, while a non-click may just mean the item was not noticed", ["They are identical in meaning", "Skips are positive labels", "Non-clicks are always explicit"],
  "Implicit and explicit negatives carry different confidence and are often weighted differently.", s="ml2 Video recs")
S("M", "Fraud labels from chargebacks can take 30 to 90 days to finalise. How can drift be monitored sooner?",
  "Use early surrogate signals such as 3-D Secure failures, instant dispute notices and manual review outcomes", ["Wait for chargebacks only", "Ignore labels", "Use random labels"],
  "Fast proxies for the delayed truth let teams react before final labels arrive.", s="ml3 Fraud")
M("M", "Select all ways to cope with severe class imbalance (positives under 2%).",
  [("Downsample negatives and recalibrate probabilities", True), ("Use a loss that down-weights easy examples such as focal loss", True), ("Use class weights", True), ("Evaluate only with accuracy", False)],
  "Resampling, loss shaping and weighting address skew, while accuracy hides it.", s="ml2 Video recs")
A("H", "Random train-test splitting of user interaction logs can overstate performance for a model that will predict future behaviour.", "Information from the future can leak into the training set when the split ignores time order.", 1,
  "A time-based split mimics deployment; random splits can place later events in training and earlier ones in test.")

# ---------------------------------------------------------------- FEAT
C("MSD.FEAT", "ml3 feature store; ml2/ml4 item embeddings")
S("E", "What does an online feature store provide?",
  "Low-latency lookup of precomputed features at serving time", ["Long-term raw log archiving", "Model training hardware", "A user interface"],
  "Online stores (for example in-memory key-value) serve feature vectors in milliseconds.", s="ml3 Fraud")
S("M", "Why does a feature store usually keep both an online and an offline view?",
  "Offline for point-in-time training data, online for low-latency serving, with consistent definitions between them", ["To double the cost", "Because models need two copies", "They are unrelated"],
  "Shared definitions across both views prevent training-serving skew.", s="ml1 Spam classifier")
S("M", "A fraud model needs 'transactions by this card in the last 5 minutes'. Where should it be computed?",
  "With in-memory sliding-window counters updated by the event stream, while static features come from the feature store", ["Recomputed by scanning the transaction table on each request", "Taken from last month's batch only", "Not used at all"],
  "Fast-changing velocity features need streaming computation, slow-changing ones can be precomputed.", s="ml3 Fraud")
N("M", "An embedding table has 50 million items, 128 dimensions each, stored as float32 (4 bytes). How many GB (1 GB = $10^9$ B) does it take?", 50e6 * 128 * 4 / 1e9, 0.1, "$5\\times10^7\\times128\\times4=2.56\\times10^{10}$ B = 25.6 GB.", s="ml4 Amazon recs")
N("M", "The same table is compressed with product quantization into 16 bytes per vector. What is the new size in GB?", 50e6 * 16 / 1e9, 0.01, "$5\\times10^7\\times16=8\\times10^8$ B = 0.8 GB, a 32x reduction versus 25.6 GB.", s="ml4 Amazon recs")
S("M", "What is feature hashing used for in high-cardinality categorical features?",
  "Mapping many category values into a fixed-size space so the embedding table has bounded memory", ["Making features unique per row", "Encrypting labels", "Increasing cardinality"],
  "Hashing bounds memory at the cost of some collisions.", s="cs3 Ads CTR")
S("H", "Static item features (genre, text embedding) and session features (last three clicks) are both needed to rank. Which split is standard?",
  "Precompute item embeddings offline and compute session context online at request time", ["Compute everything offline once a year", "Compute item embeddings on each request", "Ignore session context"],
  "Slow-changing features can be precomputed in batch; fast-changing context must be fresh.", s="ml2 Video recs")
M("M", "Select all risks if features are computed differently in training and serving.",
  [("Offline metrics may not match online performance", True), ("Silent accuracy degradation after deployment", True), ("Hard-to-debug prediction differences", True), ("Lower storage cost guaranteed", False)],
  "Skew breaks the model's assumptions without raising obvious errors.", s="ml1 Spam classifier")
A("M", "A feature store reduces duplicated feature engineering across teams.", "It centralises feature definitions that many models can reuse consistently.", 1,
  "Shared definitions mean one implementation serves training and serving for all consumers.")

# ---------------------------------------------------------------- MODEL
C("MSD.MODEL", "ml1/ml3 model choice; cs1-cs10 tips")
S("E", "Why is a gradient-boosted tree model often chosen for low-latency tabular scoring such as fraud?",
  "It is accurate on tabular data and cheap to run on CPU with sub-10 ms inference", ["It needs a GPU cluster", "It cannot handle numeric features", "It is slower than any neural network"],
  "Boosted trees compile to fast code and fit tabular features well.", s="ml3 Fraud")
S("M", "What does focal loss do?",
  "Down-weights well-classified (easy) examples so training focuses on hard, rare positives", ["Increases weight of easy negatives", "Removes the need for labels", "Always lowers training time"],
  "Its modulating factor $(1-p_t)^\\gamma$ shrinks the contribution of confident predictions.", s="ml2 Video recs")
f1 = (1 - 0.9) ** 2 * (-math.log(0.9))
N("M", "Focal loss is $-\\alpha_t(1-p_t)^\\gamma\\log(p_t)$. For $\\alpha_t=1$, $\\gamma=2$ and a correctly classified example with $p_t=0.9$, what is the loss? Use natural log and give 5 decimals.", f1, 0.00002, "$(0.1)^2\\times(-\\ln0.9)=0.01\\times0.10536=0.00105$; compare with plain cross-entropy 0.10536, a 100x reduction.", s="ml2 Video recs")
S("M", "In a two-tower recommender, how is the match score between user and item computed?",
  "As a dot product of the user tower output and the item tower output", ["As the sum of ids", "As a database join", "As the length of the user name"],
  "Separate towers produce embeddings; the dot product allows precomputing item vectors and fast ANN search.", s="ml2 Video recs")
S("M", "Why does a two-tower design suit candidate retrieval?",
  "Item embeddings can be precomputed offline and indexed for approximate nearest neighbour search", ["It scores every item with a deep model per request", "It needs no embeddings", "It forbids caching"],
  "Decoupled towers avoid running the item network at request time.", s="ml2 Video recs")
S("M", "In multi-task ranking, how are objectives such as like, share and watch time usually combined?",
  "As a weighted utility of the predicted outcomes", ["By taking only the first prediction", "By random choice", "By ignoring all but clicks"],
  "A weighted sum expresses the product's relative value of each outcome.", s="cs2 Feed ranking")
S("M", "Why is watch time better modelled with censoring-aware methods than plain squared error?",
  "Users who stop watching have unfinished, censored observations, which a plain regression treats as exact", ["Watch time is always exactly known", "MSE handles censoring automatically", "Censoring only applies to text"],
  "Survival-style models account for partial observations.", s="cs2 Feed ranking")
S("H", "A team has weak labelled data for rare defect types. Which approach is suited?",
  "Unsupervised anomaly detection (for example reconstruction error) plus augmentation for the few labelled classes", ["Collect millions of labels before any model", "Ignore rare defects", "Use accuracy only"],
  "Rare, diverse failures are hard to cover by supervised labels alone; models of normal data can flag deviations.", s="cs8 Visual defect")
M("M", "Select all model-side tricks to meet a strict CPU latency budget.",
  [("INT8 quantisation", True), ("Distilling a large model into a smaller one", True), ("Compiling trees or exporting to an optimised runtime such as ONNX", True), ("Adding more layers", False)],
  "Quantisation, distillation and compilation reduce inference cost; more layers increase it.", s="ml3 Fraud")
A("M", "Training on a 1:10 positive-to-negative ratio instead of the natural 1:100 ratio usually requires recalibrating output probabilities.", "The model learns a base rate that differs from the real one.", 1,
  "The adjusted prior shifts the output odds, which the Bayes correction undoes.", s="ml2 Video recs")

# ---------------------------------------------------------------- EVAL
C("MSD.EVAL", "ml1 PSI; cs7 precision/recall; cs5 recall@k")
tp, fp, fn = 80, 20, 40
prec, rec = tp / (tp + fp), tp / (tp + fn)
N("E", "A classifier produces 80 true positives, 20 false positives and 40 false negatives. What is its precision? Give a decimal.", prec, 0.001, "Precision $=TP/(TP+FP)=80/100=0.8$.", s="cs7 Moderation")
N("E", "With the same counts (80 TP, 20 FP, 40 FN), what is the recall? Give 3 decimals.", rec, 0.001, "Recall $=TP/(TP+FN)=80/120=0.667$.", s="cs7 Moderation")
N("M", "With the same counts, what is the F1 score? Give 3 decimals.", 2 * prec * rec / (prec + rec), 0.001, "$F_1=2PR/(P+R)=2(0.8)(0.667)/(1.467)=0.727$.", s="cs7 Moderation")
N("M", "A blocking stage must find true duplicate pairs. Out of 500 true duplicates, its top-k candidate lists contain 430 of them. What is recall@k as a decimal?", 430 / 500, 0.001, "Recall@k $=430/500=0.86$.", s="cs5 Duplicate detection")
S("M", "Why validate blocking recall@k separately from end-to-end precision in a duplicate detection system?",
  "A low-recall blocking stage silently caps overall recall regardless of how good the pairwise scorer is", ["Blocking does not affect results", "Precision and recall are the same", "The scorer always fixes missed candidates"],
  "Duplicates not retrieved by blocking can never be scored.", s="cs5 Duplicate detection")
cf, cp = 50, 1
N("M", "A moderation threshold produces 30 false negatives and 400 false positives. A false negative costs 50 units and a false positive costs 1 unit. What is the total expected cost $C_{FN}\\cdot FN+C_{FP}\\cdot FP$?", 50 * 30 + 1 * 400, 0, "$50\\times30+1\\times400=1500+400=1900$ units.", integer=True, s="cs7 Moderation")
n_ab = 2 * (1.96 + 0.8416) ** 2 * 0.10 * 0.90 / 0.01 ** 2
N("H", "To detect an absolute lift of 0.01 on a baseline conversion of 0.10 with a two-sided 5% test and 80% power, use $n\\approx2(z_{\\alpha/2}+z_\\beta)^2p(1-p)/\\delta^2$ per group with $z_{\\alpha/2}=1.96$ and $z_\\beta=0.8416$. About how many users per group? Round to the nearest hundred.", round(n_ab, -2), 100, "$2(2.8016)^2(0.09)/0.0001=2\\times7.849\\times0.09/0.0001\\approx14{,}129$, so about 14,100 per group.")
S("M", "An offline metric improves but the online A/B test shows no lift. What is the most plausible explanation?",
  "The offline metric or data did not reflect the production setting (for example skew, bias or proxy mismatch)", ["The A/B test is always wrong", "Offline metrics are exact predictors", "Users are random"],
  "Offline evaluation is a proxy; online experiments measure the real outcome.")
A("M", "Logged recommendation data has position bias, so raw click rates overstate the quality of items shown at the top.", "Items shown higher get more attention regardless of relevance.", 1,
  "Inverse propensity weighting is one correction for such bias.", s="cs2 Feed ranking")

# ---------------------------------------------------------------- SERVE
C("MSD.SERVE", "ml1-ml4 serving; cs1-cs10 latency budgets")
S("E", "Why is a funnel (retrieve hundreds of candidates, then rank) used instead of scoring the whole catalogue?",
  "Scoring hundreds of millions of items per request with a heavy model is far too slow", ["Ranking models cannot score items", "Catalogues are always small", "Retrieval is more accurate than ranking"],
  "Cheap coverage first, expensive precision last: the funnel keeps latency within budget.", s="ml2 Video recs")
N("M", "Brute-force scoring of 800,000,000 items at 0.1 ms each would take how many seconds if done sequentially?", 800e6 * 0.1 / 1000, 1, "$8\\times10^8\\times0.1$ ms $=8\\times10^7$ ms $=80{,}000$ s.", s="ml2 Video recs")
N("M", "A two-stage system spends 5 ms on ANN retrieval and then ranks 500 candidates at 0.05 ms each. What is the total latency in ms?", 5 + 500 * 0.05, 0.01, "$5+500\\times0.05=5+25=30$ ms.", s="ml2 Video recs")
S("M", "A real-time email filter has a 15 ms inference budget. Which serving mode is appropriate?",
  "Online real-time inference with a lightweight model", ["An offline batch job over the day", "Manual review", "Weekly retraining only"],
  "Per-message decisions in the delivery path need synchronous low-latency scoring.", s="ml1 Spam classifier")
S("M", "What does a fallback engine do in an ML serving path?",
  "Applies deterministic rules when the model times out, errors or returns an uncertain score", ["Trains the model", "Stores features", "Labels data"],
  "It acts as a circuit breaker so the service still decides.", s="ml1 Spam classifier")
S("M", "A cache layer in front of a recommender stores whole feeds keyed by user with a 5 to 15 minute TTL. What is the main trade-off?",
  "Lower load and latency versus slightly stale recommendations, mitigated by invalidating on high-intent events", ["No trade-off exists", "Caches always make results fresher", "Caches remove the need for models"],
  "Short TTLs and event-driven invalidation bound staleness.", s="ml2 Video recs")
S("H", "For a payment fraud decision with a 50 ms p99 SLA, the model server exceeds 35 ms. What should the system do?",
  "Time out and let the fallback rules decide, while logging the event", ["Wait indefinitely", "Skip logging", "Approve everything silently"],
  "A hard internal time limit protects the SLA; the fallback uses deterministic checks.", s="ml3 Fraud")
M("M", "Select all components typically on a low-latency recommendation serving path.",
  [("Cache layer", True), ("ANN candidate retrieval", True), ("Online feature store lookup", True), ("Offline GPU training cluster", False)],
  "Training happens offline and is not in the request path.", s="ml2 Video recs")
A("M", "Pre-computing item embeddings in batch lowers online latency.", "The heavy item encoder does not have to run during requests.", 1,
  "Only the cheap lookup and dot product remain online.", s="ml2 Video recs")

# ---------------------------------------------------------------- MON
C("MSD.MON", "ml1 PSI example; cs3/cs6/cs10 drift")
def psi(q, p): return sum((pi - qi) * math.log(pi / qi) for qi, pi in zip(q, p))
psi_v = psi([0.70, 0.10, 0.20], [0.40, 0.30, 0.30])
N("M", "Baseline score-bin shares are 0.70, 0.10 and 0.20; live shares are 0.40, 0.30 and 0.30. Using $PSI=\\sum(P_i-Q_i)\\ln(P_i/Q_i)$ (P live, Q baseline), what is PSI? Give 3 decimals.", psi_v, 0.002, "Terms: $(-0.30)\\ln(0.4/0.7)=0.168$; $0.20\\ln3=0.220$; $0.10\\ln1.5=0.041$; total $0.428$.", s="ml1 Spam classifier")
S("M", "By the common rule of thumb, what does PSI of 0.43 indicate?",
  "Significant drift (PSI at or above 0.25), warranting investigation or retraining", ["No drift", "Moderate drift needing no action", "A measurement error"],
  "Typical bands are below 0.10 stable, 0.10 to 0.25 moderate, and 0.25 or more significant.", s="ml1 Spam classifier")
S("E", "What is concept drift?",
  "The relationship between inputs and the target changes over time (for example spammers change tactics)", ["The model file is renamed", "The GPU gets hotter", "The input data format is fixed"],
  "The same features now imply different labels.", s="ml1 Spam classifier")
S("M", "How does data drift differ from concept drift?",
  "Data drift is a change in the input distribution; concept drift is a change in the input-output relationship", ["They are identical", "Data drift changes the labels only", "Concept drift only affects hardware"],
  "Either can degrade a model, and they are monitored differently.")
S("M", "Why monitor the distribution of model output scores, not only accuracy?",
  "Labels may arrive late, but score shifts are visible immediately and often signal drift early", ["Scores never change", "Accuracy is available instantly in all domains", "Scores are labels"],
  "Prediction drift is a label-free early warning.", s="ml1 Spam classifier")
S("M", "In streaming anomaly detection, why distinguish drift from anomalies?",
  "Drift should update the baseline of normal, while anomalies should trigger alerts; conflating them causes alert fatigue or missed incidents", ["They are the same thing", "Drift always triggers pages", "Anomalies update the baseline"],
  "A shifted normal needs a refreshed model of normal.", s="cs10 Anomaly detection")
alpha = 0.3
St = alpha * 120 + (1 - alpha) * 100
N("M", "An EWMA baseline is $S_t=\\alpha x_t+(1-\\alpha)S_{t-1}$. With $\\alpha=0.3$, $S_{t-1}=100$ and a new value $x_t=120$, what is $S_t$?", St, 0.01, "$0.3\\times120+0.7\\times100=36+70=106$.", s="cs10 Anomaly detection")
S("H", "A recommender trained on its own past recommendations gradually narrows what it shows. What is this problem and a mitigation?",
  "A feedback loop; add exploration (for example bandit layers) and debiasing of logged data", ["Overfitting to hardware", "Label noise only", "Network jitter"],
  "Models influence the data they later train on; exploration injects unbiased signal.", s="cs2 Feed ranking")
M("M", "Select all useful operational metrics for an ML serving system.",
  [("p99 latency", True), ("Error and timeout rate", True), ("Prediction score distribution", True), ("The model's file name", False)],
  "Latency, errors and score distributions reveal health and drift.", s="ml1 Spam classifier")
A("M", "A PSI-based alert can trigger an automated retraining job.", "A large shift between live and training distributions suggests the model may be out of date.", 1,
  "Thresholds on PSI are a common retrain trigger.", s="ml1 Spam classifier")
