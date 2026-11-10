"""MSD part B: REC, CLF, FRAUD, DIST, RAG, LLMOPS, CASES."""
import math
from .dsl import A, C, M, N, S

# ---------------------------------------------------------------- REC
C("MSD.REC", "ml2 YouTube recs; ml4 Amazon recs; cs2 feed")
S("E", "What are the two broad stages of a large-scale recommender?",
  "Candidate retrieval (narrowing millions to hundreds) and ranking (scoring the candidates precisely)", ["Training and labelling", "Caching and logging", "Encoding and compressing"],
  "Retrieval gives cheap coverage; ranking gives precision on a short list.", s="ml2 Video recs")
N("M", "A homepage funnel goes from 500,000,000 products to 500 candidates. By what factor does retrieval reduce the number of items to score?", 500e6 / 500, 1, "$5\\times10^8/500=1{,}000{,}000$, a millionfold reduction.", s="ml4 Amazon recs")
util = 0.05 * 0.10 * 40 * (1 - 0.2)
N("M", "Expected-revenue ranking uses $P(\\text{click})\\times P(\\text{purchase}\\mid\\text{click})\\times\\text{price}\\times(1-\\text{return rate})$. For $P(click)=0.05$, $P(purchase|click)=0.10$, price 40 and return rate 0.2, what is the utility?", util, 0.001, "$0.05\\times0.10\\times40\\times0.8=0.16$.", s="ml4 Amazon recs")
S("M", "Why include an exploration mechanism (for example a bandit layer) in a recommender?",
  "To gather data on items the current model would not show, reducing feedback-loop bias and helping cold start", ["To make recommendations random for all users", "To reduce model size", "To avoid logging"],
  "Without exploration the model only learns about what it already shows.", s="cs2 Feed ranking")
S("M", "How can a brand new item with no interactions be recommended at all?",
  "Use content-based embeddings from its text or images, and give it exploration traffic", ["It cannot be recommended ever", "Wait a year", "Assign a random user id"],
  "Content features provide an initial representation before behaviour data exists.", s="cs6 Demand forecasting")
S("M", "Why use Reciprocal Rank Fusion rather than adding raw scores from different retrievers?",
  "Raw scores come from different scales, whereas RRF uses only ranks and needs no calibration", ["Ranks are more precise than scores", "RRF needs labelled data", "Scores cannot be sorted"],
  "RRF sums $1/(k+\\text{rank})$ over retrievers, so scale differences do not matter.", s="cs1 Search ranking")
S("M", "A feed ranker times out. What is a sensible fail-open behaviour?",
  "Serve a simple fallback such as a reverse-chronological or popular feed", ["Show an error page", "Show nothing forever", "Block the user"],
  "A degraded but valid feed is better than failure for a non-critical product.", s="cs2 Feed ranking")
S("H", "Why does a diversity filter after ranking improve a feed?",
  "Pure score ranking can show many near-identical items; diversification improves long-term satisfaction", ["It lowers latency", "It increases model size", "It removes the ranker"],
  "Re-ranking for variety counters redundancy among top-scored items.", s="cs2 Feed ranking")
M("M", "Select all signals that are useful as implicit feedback for a video recommender.",
  [("Watch time fraction", True), ("Clicks", True), ("Skips within a couple of seconds", True), ("The video's file name only", False)],
  "Behavioural signals indicate preference; skips are strong negatives.", s="ml2 Video recs")
A("M", "Candidate retrieval should favour recall, while ranking should favour precision.", "Items missing from the candidate list can never be ranked, whereas the ranker can sort a short list carefully.", 1,
  "Cheap broad retrieval first, careful ranking last.", s="ml2 Video recs")

# ---------------------------------------------------------------- CLF
C("MSD.CLF", "ml1 spam; cs7 moderation")
N("M", "A cache of known spam hashes and trusted senders handles 30% of a peak load of 2,893 requests per second before the model. How many requests per second reach the model? Round to the nearest integer.", 2893 * 0.7, 1, "$2893\\times0.7\\approx2025$ requests per second.", s="ml1 Spam classifier")
N("M", "One CPU core runs an INT8 spam model at 100 requests per second. How many cores are needed for 2,893 requests per second (round up)?", math.ceil(2893 / 100), 0, "$2893/100=28.93$, so 29 cores.", integer=True, s="ml1 Spam classifier")
N("M", "Each email contributes 10 KB of sanitised metadata (1 KB = 1,000 B). At 2,893 requests per second, what is the ingestion bandwidth in MB per second (1 MB = $10^6$ B)? Give 2 decimals.", 2893 * 10e3 / 1e6, 0.01, "$2893\\times10{,}000=2.893\\times10^7$ B/s = 28.93 MB/s.", s="ml1 Spam classifier")
S("M", "When should the spam filter hand a message to the fallback rules instead of trusting the model?",
  "When the model errors, times out or returns a score in an uncertain band such as 0.4 to 0.6", ["Only when the score is exactly 1", "Never", "Always for every message"],
  "Borderline predictions are where heuristics (authentication results, blocklists) add safety.", s="ml1 Spam classifier")
S("M", "Spammers insert zero-width characters and look-alike letters. What preprocessing helps?",
  "Unicode normalisation and OCR for image-only bodies before tokenisation", ["Lower the learning rate", "Remove the model", "Increase cache TTL"],
  "Normalising text removes cheap obfuscation before the model sees it.", s="ml1 Spam classifier")
S("M", "Why use different thresholds per policy category in a content moderation system?",
  "Categories differ in severity and base rates, so each needs its own precision and recall trade-off", ["One global threshold is always optimal", "Categories are identical", "Thresholds do not matter"],
  "High-severity harms warrant higher recall, low-severity ones may favour precision.", s="cs7 Moderation")
S("M", "For a moderation model failure, which fail mode fits the highest-severity category?",
  "Fail-closed: hold or block content pending review", ["Fail-open: publish everything", "Delete all users", "Ignore failures"],
  "Risk asymmetry: letting severe harm through costs more than delaying content.", s="cs7 Moderation")
S("H", "A moderation team has a fixed human review budget. Which sampling approach gets more value per review?",
  "Active learning that sends the most uncertain or highest-impact items to reviewers", ["Random sampling only", "Reviewing the most confident items", "Reviewing nothing"],
  "Uncertain items provide the most information per label.", s="cs7 Moderation")
M("M", "Select all measures that make a classifier more robust to adversarial evasion.",
  [("Adversarial data augmentation such as leetspeak and homoglyph perturbations", True), ("Frequent retraining on fresh feedback", True), ("Combining fast lexical filters with a deep model", True), ("Never updating the model", False)],
  "Evasion is an arms race; training on perturbations and updating quickly help.", s="cs7 Moderation")
A("M", "In spam filtering, thresholds are usually set conservatively so that only high-probability spam is moved to the spam folder.", "A false positive harms users more than a false negative.", 1,
  "Therefore precision is prioritised over recall at the decision threshold.", s="ml1 Spam classifier")

# ---------------------------------------------------------------- FRAUD
C("MSD.FRAUD", "ml3 Stripe fraud; cs10 anomaly")
N("M", "A payment system handles 500,000 transactions per day. What is the average rate in requests per second? Give 2 decimals (86,400 s per day).", 500000 / 86400, 0.01, "$500000/86400=5.79$ requests per second.", s="ml3 Fraud")
N("M", "Using a 10x surge multiplier on the 5.79 average, what is the peak rate in requests per second? Round to the nearest integer.", 500000 / 86400 * 10, 1, "$5.787\\times10\\approx58$ requests per second.", s="ml3 Fraud")
N("M", "A p99 latency budget of 50 ms is split into feature lookup 5 ms, model inference 15 ms, decision 5 ms. How many milliseconds remain for network and other overhead?", 50 - 5 - 15 - 5, 0, "$50-5-15-5=25$ ms.", integer=True, s="ml3 Fraud")
S("M", "With thresholds block at P(fraud) of at least 0.85, step-up authentication between 0.30 and 0.85, and approve below 0.30, what happens to a transaction scored 0.60?",
  "It is sent to step-up authentication (for example 3-D Secure)", ["It is blocked", "It is approved silently", "It is ignored"],
  "0.60 lies in the middle band, which triggers a challenge rather than a block.", s="ml3 Fraud")
S("M", "What is a reasonable behaviour when the fraud model server fails?",
  "Apply deterministic hard checks (for example AVS/CVV and IP-location rules) and flag transactions for asynchronous review if none is breached", ["Block all payments", "Approve everything without any check or log", "Crash the gateway"],
  "A rule-based fallback keeps the business running with bounded risk.", s="ml3 Fraud")
S("M", "Why are features such as 'transactions in the last 5 minutes' computed with in-memory sliding windows?",
  "They change every second and must be fresh, which a batch-refreshed store cannot provide", ["They never change", "To save disk space only", "Because models cannot read stored features"],
  "Fast-changing velocity features need streaming computation.", s="ml3 Fraud")
S("M", "Why is recalibration needed for fraud models trained at a 1:10 fraud-to-legitimate ratio when real fraud is below 0.1%?",
  "Without it, predicted probabilities greatly overstate true fraud risk and thresholds mis-fire", ["Models cannot learn without it", "It speeds up inference", "It removes label delay"],
  "Downsampled training changes the prior; correcting it restores meaningful probabilities.", s="ml3 Fraud")
S("H", "Which design reduces both cost and latency for repeat-card checks?",
  "Cache and precompute per-card and per-merchant risk aggregates in an online feature store", ["Recompute aggregates from raw logs on each request", "Store nothing", "Query the data lake synchronously"],
  "Precomputed aggregates give sub-10 ms lookups.", s="ml3 Fraud")
M("M", "Select all reasons fraud systems need drift monitoring.",
  [("Fraudsters adapt their tactics over time", True), ("Ground-truth labels arrive late, so proxies are needed early", True), ("Feature distributions can shift with seasonal events", True), ("Fraud patterns are permanently fixed", False)],
  "Adversarial, non-stationary data requires monitoring.", s="ml3 Fraud")
A("H", "Rather than fixed rules alone, fraud systems combine a model with a fallback rule engine.", "The rule engine provides deterministic safety when the model is unavailable or uncertain.", 1,
  "Each covers the other's weakness.", s="ml3 Fraud")

# ---------------------------------------------------------------- DIST
C("MSD.DIST", "ml5 OpenAI distributed training")
Np, tokens_step = 1e12, 4e6
flops_step = 6 * Np * tokens_step
cluster = 10000 * 0.60 * 1.979e15
N("M", "Training FLOPs per token are about $6N$ for $N$ parameters. For $N=10^{12}$ and a step of 4,000,000 tokens, how many $10^{19}$ FLOPs does one step need? Give one decimal.", flops_step / 1e19, 0.05, "$6\\times10^{12}\\times4\\times10^6=2.4\\times10^{19}$ FLOPs, i.e. 2.4 units of $10^{19}$.", s="ml5 Distributed training")
N("M", "Peak per-GPU throughput is $1.979\\times10^{15}$ FLOP/s and utilisation (MFU) is 60%, on 10,000 GPUs. For a step of $2.4\\times10^{19}$ FLOPs, how many seconds does a step take? Give 2 decimals.", flops_step / cluster, 0.01, "Cluster rate $=10^4\\times0.6\\times1.979\\times10^{15}=1.187\\times10^{19}$ FLOP/s; time $=2.4/1.187=2.02$ s.", s="ml5 Distributed training")
N("H", "Using the same cluster rate of $1.1874\\times10^{19}$ FLOP/s, how many days to train on $10^{13}$ tokens with $N=10^{12}$ parameters ($6NT$ FLOPs)? Round to one decimal.", 6 * 1e12 * 1e13 / cluster / 86400, 0.1, "FLOPs $=6\\times10^{12}\\times10^{13}=6\\times10^{25}$; seconds $=6\\times10^{25}/1.1874\\times10^{19}=5.05\\times10^6$; days $=58.5$.", s="ml5 Distributed training")
N("M", "Mixed-precision Adam training stores FP16 weights (2 bytes), FP16 gradients (2 bytes) and 12 bytes of optimiser state per parameter. For a 7-billion-parameter model, how many GB (1 GB = $10^9$ B) of model state?", 7e9 * 16 / 1e9, 0.5, "$16$ bytes per parameter $\\times7\\times10^9=112\\times10^9$ B = 112 GB.", s="ml5 Distributed training")
N("H", "With ZeRO stage 3 the 112 GB of model state is partitioned across 64 GPUs. How many GB per GPU (ignoring activations)? Give 2 decimals.", 112 / 64, 0.01, "$112/64=1.75$ GB per GPU.", s="ml5 Distributed training")
N("M", "A pipeline of $p=8$ stages runs $m=32$ micro-batches per step. The idle bubble fraction is $(p-1)/(m+p-1)$. What is it? Give 3 decimals.", 7 / 39, 0.001, "$7/(32+7)=7/39=0.179$.", s="ml5 Distributed training")
S("M", "Why place tensor-parallel groups within a single node?",
  "Tensor parallelism needs frequent, high-bandwidth communication that fast intra-node links (NVLink) provide", ["Intra-node links are slower than the network", "Tensor parallelism needs no communication", "It reduces model size"],
  "Layer-level collectives happen several times per layer, so they belong on the fastest links.", s="ml5 Distributed training")
S("M", "What does linear learning-rate scaling suggest when the global batch grows from 256 to 2,048 with base learning rate 0.1?",
  "Scale the learning rate by the same factor to 0.8, usually with warm-up", ["Keep 0.1 always", "Use 0.0125", "Set it to zero"],
  "The heuristic scales the rate in proportion to batch size; warm-up stabilises early steps.", s="ml5 Distributed training")
M("M", "Select all techniques that increase effective GPU utilisation in large-scale training.",
  [("Overlapping gradient communication with backward computation", True), ("Packing short sequences instead of padding", True), ("Asynchronous checkpointing to host memory", True), ("Running one GPU at a time", False)],
  "Overlap, packing and non-blocking checkpoints reduce idle time.", s="ml5 Distributed training")
A("M", "On a loss spike or NaN gradients, rolling back to a recent checkpoint and skipping the offending batch is a common recovery strategy.", "Continuing from corrupted parameters can destroy previous progress.", 1,
  "Reloading a recent healthy state limits the damage.", s="ml5 Distributed training")

# ---------------------------------------------------------------- RAG
C("MSD.RAG", "ml6 Anthropic RAG")
rr = 1 / (60 + 1) + 1 / (60 + 3)
N("M", "A document is ranked 1st by dense retrieval and 3rd by BM25. With Reciprocal Rank Fusion $\\sum 1/(k+r)$ and $k=60$, what is its fused score? Give 5 decimals.", rr, 0.00002, "$1/61+1/63=0.016393+0.015873=0.032266$.", s="ml6 RAG")
N("M", "100 million chunks are embedded with 1,536 dimensions in float32 (4 bytes). How many GB (1 GB = $10^9$ B) is the raw vector store?", 100e6 * 1536 * 4 / 1e9, 0.5, "$10^8\\times1536\\times4=6.144\\times10^{11}$ B = 614.4 GB.", s="ml6 RAG")
N("M", "Quantising those vectors to int8 (1 byte per dimension) gives how many GB?", 100e6 * 1536 / 1e9, 0.5, "$10^8\\times1536=1.536\\times10^{11}$ B = 153.6 GB, a 75% reduction.", s="ml6 RAG")
def n_chunks(doc, size, overlap):
    stride = size - overlap
    starts = list(range(0, max(doc - overlap, 1), stride))
    return len(starts)
N("M", "A 10,000-token document is split into 500-token chunks with 100-token overlap (stride 400, last chunk may be shorter). How many chunks result?", math.ceil((10000 - 500) / 400) + 1, 0, "Stride 400: chunks start at 0, 400, ..., so $\\lceil(10000-500)/400\\rceil+1=24+1=25$.", integer=True, s="ml6 RAG")
assert n_chunks(10000, 500, 100) == 25
S("M", "Why combine dense vector search with BM25 keyword search in enterprise RAG?",
  "Dense retrieval captures meaning but can miss exact tokens such as part numbers or error codes, which BM25 matches", ["BM25 captures semantics better", "Dense search cannot rank", "Hybrid search is always slower for no gain"],
  "The two retrievers fail differently, so fusion improves recall.", s="ml6 RAG")
S("H", "In a multi-tenant RAG system, why apply access-control filters during retrieval rather than after?",
  "Post-filtering can leak data or return too few results after discarding unauthorised candidates; pre-filtering enforces security within the index", ["Filtering after retrieval is always faster and safer", "Access control is unnecessary", "Filters corrupt embeddings"],
  "Security must be enforced before candidates are formed, and it keeps result counts predictable.", s="ml6 RAG")
S("M", "What does a cross-encoder reranker do that a bi-encoder retriever does not?",
  "It reads the query and each chunk together, so it can model their interaction more precisely, at higher cost", ["It stores embeddings only", "It searches the whole corpus first", "It never uses the query"],
  "Joint encoding is more accurate but too expensive for the full corpus, so it reranks a shortlist.", s="ml6 RAG")
S("M", "How should cached retrieval results be handled when a source document is deleted?",
  "Invalidate cache entries keyed by tenant and document id, driven by change-data-capture events", ["Ignore deletions", "Wait for TTL only", "Delete the whole cache every second"],
  "Targeted invalidation prevents serving removed content.", s="ml6 RAG")
M("M", "Select all failure modes that RAG evaluation should measure.",
  [("Retrieval recall (relevant chunks present in the shortlist)", True), ("Faithfulness of the answer to the retrieved context", True), ("Citation correctness", True), ("The colour of the chat window", False)],
  "RAG quality depends on retrieval and grounded generation.", s="ml6 RAG")
A("M", "Prepending document-level context (such as title and section) to a chunk before embedding can improve retrieval.", "A short chunk alone may lack the context needed to match a query.", 1,
  "Contextual embeddings disambiguate otherwise generic chunks.", s="ml6 RAG")

# ---------------------------------------------------------------- LLMOPS
C("MSD.LLMOPS", "cs9 LLM serving; ml6")
kv = 2 * 32 * 32 * 128 * 4096 * 2
N("H", "KV-cache memory per sequence is $2\\times L\\times H\\times D\\times S\\times\\text{bytes}$. For $L=32$ layers, $H=32$ heads, $D=128$, $S=4096$ tokens and 2 bytes (FP16), how many GB (1 GB = $10^9$ B)? Give 2 decimals.", kv / 1e9, 0.01, "$2\\times32\\times32\\times128\\times4096\\times2=2.147\\times10^9$ B = 2.15 GB.", s="cs9 LLM serving")
exp_tok = (1 - 0.8 ** 5) / (1 - 0.8)
N("H", "In speculative decoding, with draft acceptance rate $\\alpha=0.8$ and $k=4$ drafted tokens, the expected tokens produced per verification step is $(1-\\alpha^{k+1})/(1-\\alpha)$. What is it? Give 3 decimals.", exp_tok, 0.002, "$(1-0.8^5)/0.2=(1-0.32768)/0.2=3.362$.", s="cs9 LLM serving")
cost = 2.5 / (2500 * 3600) * 1e6
N("M", "A GPU costs 2.50 dollars per hour and sustains 2,500 generated tokens per second. What is the compute cost per million tokens in dollars? Give 3 decimals.", cost, 0.001, "Tokens per hour $=9\\times10^6$; cost per million $=2.5/9=0.278$ dollars.", s="cs9 LLM serving")
N("M", "A service has an average of 10,000 requests in flight and a mean request duration of 4 seconds. By Little's law, what throughput in requests per second does it sustain?", 10000 / 4, 1, "$\\lambda=L/W=10000/4=2500$ requests per second.", s="cs9 LLM serving")
S("M", "What does continuous batching improve over static batching in LLM serving?",
  "GPUs stay busy because new requests join the batch as soon as any sequence finishes", ["It makes every request wait for the longest one", "It removes the need for a GPU", "It disables KV caching"],
  "Per-iteration scheduling avoids idle slots from finished sequences.", s="cs9 LLM serving")
S("M", "Why are prefill and decode treated differently when sizing LLM serving?",
  "Prefill is compute-bound over the whole prompt, while decode is memory-bandwidth-bound one token at a time", ["They are identical", "Decode is compute-bound and prefill is network-bound", "Neither uses the GPU"],
  "Different bottlenecks imply different optimal batch sizes and sometimes separate pools.", s="cs9 LLM serving")
S("M", "What problem does paged KV-cache management solve?",
  "Memory fragmentation and waste from variable-length sequences", ["Slow disks", "Network jitter", "Token pricing"],
  "Allocating cache in fixed-size blocks, like OS paging, packs sequences efficiently.", s="cs9 LLM serving")
S("H", "A burst arrives that exceeds the GPU fleet's capacity. Which behaviour is preferable?",
  "Queue with backpressure and shed excess load gracefully while autoscaling", ["Crash all servers", "Accept unlimited requests with no limit", "Silently drop random tokens"],
  "Graceful degradation protects latency for admitted requests.", s="cs9 LLM serving")
M("M", "Select all guardrail layers commonly placed around an LLM application.",
  [("Input filtering for prompt injection and policy violations", True), ("Output moderation or validation before returning", True), ("Per-user rate limits and cost budgets", True), ("Trusting every user instruction", False)],
  "Defence in depth covers inputs, outputs and usage.", s="ml6 RAG")
A("M", "Quantising model weights to INT8 or INT4 can allow larger batches or bigger models per GPU.", "Lower-precision weights occupy less memory.", 1,
  "Freed memory can hold more KV cache or parameters, with some quality trade-off.", s="cs9 LLM serving")

# ---------------------------------------------------------------- CASES
C("MSD.CASES", "cs1-cs10 combined case studies")
N("M", "A search-ranking case study lists monthly costs of 1,950; 900; 2,200; 750; 800; 300; 350 dollars. What is the total, and thus how many dollars below an 8,000 dollar budget is it?", 8000 - (1950 + 900 + 2200 + 750 + 800 + 300 + 350), 0, "Total $=7250$; headroom $=8000-7250=750$ dollars.", integer=True, s="cs1 Search ranking")
N("M", "A search system receives 100,000,000 queries per day with a 3.5x peak factor. What is the peak queries per second? Round to the nearest integer.", 100e6 / 86400 * 3.5, 1, "Average $=1157.4$; peak $=1157.4\\times3.5\\approx4051$.", s="cs1 Search ranking")
S("M", "Why does an ads auction rank by expected value rather than by predicted click probability alone?",
  "Price depends on bid and probabilities together, so calibration error directly changes advertiser cost and revenue", ["Clicks are irrelevant", "Bids are ignored always", "Calibration does not matter"],
  "eCPM (expected revenue per thousand impressions) combines probability and bid; miscalibration misprices the auction.", s="cs3 Ads CTR")
N("M", "For a cost-per-click ad, expected revenue per thousand impressions is $P(click)\\times\\text{bid}\\times1000$. With $P(click)=0.02$ and a bid of 0.50 dollars per click, what is the eCPM in dollars?", 0.02 * 0.5 * 1000, 0.01, "$0.02\\times0.50\\times1000=10$ dollars per thousand impressions.", s="cs3 Ads CTR")
S("M", "In an ads system, which failure mode is recommended when the model is down?",
  "Fail-closed in the sense of lowering or withholding bids rather than bidding blindly", ["Bid maximum on everything", "Ignore the budget", "Randomise prices"],
  "Blind bidding can exhaust advertiser spend on unvalued impressions.", s="cs3 Ads CTR")
S("M", "Why does an ETA system fall back to historical averages when live traffic is missing?",
  "A degraded estimate is better than blocking the request", ["Historical averages are always more accurate", "It saves no cost", "Live traffic is never needed"],
  "Fail-open keeps the product functional with lower accuracy.", s="cs4 ETA")
pin = max(0.9 * (10 - 8), (0.9 - 1) * (10 - 8))
N("H", "The pinball (quantile) loss for quantile $\\tau$ is $\\max(\\tau(y-\\hat y),(\\tau-1)(y-\\hat y))$. For $\\tau=0.9$, true $y=10$ and prediction $\\hat y=8$, what is the loss?", pin, 0.001, "$y-\\hat y=2$; $0.9\\times2=1.8$ versus $(-0.1)\\times2=-0.2$; the max is 1.8.", s="cs4 ETA")
wape = sum(abs(a - b) for a, b in zip([10, 0, 5, 20], [8, 2, 5, 25])) / sum(abs(a) for a in [10, 0, 5, 20])
N("M", "Actual demand is 10, 0, 5, 20 and the forecasts are 8, 2, 5, 25. What is WAPE $=\\sum|y-\\hat y|/\\sum|y|$? Give 3 decimals.", wape, 0.001, "Errors: 2, 2, 0, 5 sum to 9; actuals sum to 35; $9/35=0.257$.", s="cs6 Demand forecasting")
N("M", "A conveyor delivers 50 units per second. How many milliseconds of time per unit does that leave for inspection?", 1000 / 50, 0, "$1000/50=20$ ms per unit.", integer=True, s="cs8 Visual defect")
S("M", "In near-duplicate product detection, why are uncertain pairs sent to human review instead of auto-merged?",
  "A wrong auto-merge corrupts product pages, while a missed duplicate is only a minor nuisance", ["Humans are faster than models", "Merging is always safe", "Models cannot output scores"],
  "Precision matters more than recall for irreversible actions.", s="cs5 Duplicate detection")
M("M", "Select all fail-mode choices that match their domain risk asymmetry.",
  [("Fail-open to BM25 results in search when the ranker times out", True), ("Fail-closed for high-severity content moderation", True), ("Fail-to-manual-lane for a defect inspection model failure", True), ("Fail-open in a payment system by approving everything with no check", False)],
  "Choose the safe default per domain; unchecked approval in payments is not a safe fallback.", s="cs1,cs7,cs8 fail modes")
