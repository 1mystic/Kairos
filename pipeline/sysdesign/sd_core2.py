"""SD fundamentals 2: DB, CDN, MQ, RATE, IDX, CACHE, CHASH."""
import math
from .dsl import A, C, M, N, S

# ---------------------------------------------------------------- DB
C("SD.DB", "hb:F6 Databases")
S("E", "Which database family is the natural fit for data made of highly connected entities where queries traverse many relationships (for example friends of friends)?",
  "A graph database", ["A time series database", "A key-value cache only", "A spatial database"],
  "Graph databases store relationships as first-class edges, so multi-hop traversals avoid repeated joins. Check: the other families are optimised for time-ordered points, simple lookups and geometry respectively.")
S("E", "Which statement about relational (SQL) databases is correct?",
  "They enforce a predefined schema and support ACID transactions and joins", ["They cannot store more than one table", "They are schema-less by definition", "They never support indexes"],
  "RDBMSs use tables with a declared schema, SQL, joins and ACID transactions.")
S("M", "A primary database replicates asynchronously to a replica. The primary fails right after acknowledging a write. What is the risk when the replica is promoted?",
  "The recent acknowledged write may be missing on the replica", ["The replica will contain extra writes the primary never had", "Reads become impossible forever", "Indexes are lost on all tables"],
  "Asynchronous replication acknowledges before the replica has the data, so the promoted node can be behind by a few writes. Check: synchronous replication would remove the gap at the cost of write latency.")
N("M", "A table stores 200 million rows of 500 bytes each (use 1 GB = $10^9$ bytes). With one primary and 2 replicas (3 full copies in total), how many GB of raw table storage are needed in total?", 200e6 * 500 * 3 / 1e9, 1, "One copy is $2\\times10^8\\times500=10^{11}$ B = 100 GB; three copies give 300 GB.")
M("M", "Select all properties guaranteed by ACID transactions.",
  [("Atomicity: all operations of a transaction apply or none do", True), ("Consistency: a transaction moves the database between valid states", True), ("Isolation: concurrent transactions do not see each other's partial effects (to the chosen level)", True), ("Every query returns in under 10 ms", False)],
  "ACID stands for atomicity, consistency, isolation and durability; no latency promise is part of it. Check: expand the acronym and compare with the false statement.")
S("M", "Read replicas help scale a database primarily because they",
  "serve read queries, offloading the primary", ["increase write throughput linearly", "remove the need for backups", "make all reads strongly consistent"],
  "Replicas copy data and can answer reads, but every write still goes through the primary, and async replicas can lag. Check: write throughput stays bounded by one primary.")
S("H", "A user updates their profile and immediately reloads it, but sometimes sees the old data because reads go to a lagging replica. Which fix preserves most of the replica benefit?",
  "Route a user's reads to the primary for a short period after they write (read-your-writes)", ["Send every read to the primary", "Disable replication", "Retry the read until it changes"],
  "Read-your-writes can be provided by pinning recent writers to the primary (or a replica known to be caught up) while other users still read from replicas. Check: the other options either give up scaling or are unreliable.")
S("M", "Which store is the best match for metrics sampled every second from thousands of sensors, queried by time ranges and aggregated over windows?",
  "A time series database", ["A graph database", "A document store used as a single large blob", "A full-text search index only"],
  "Time series databases are optimised for append-heavy timestamped data, range scans, downsampling and retention. Check: the access pattern is time-ordered.")
A("M", "An in-memory database such as a cache store usually offers lower read latency than a disk-based database.", "RAM access is orders of magnitude faster than disk access.", 1,
  "Memory is far faster than disk (nanoseconds versus microseconds to milliseconds), so serving from RAM lowers latency. R explains A.")
S("H", "Two bank accounts live on different database nodes. A transfer must debit one and credit the other atomically. Which approach provides this guarantee?",
  "A distributed transaction protocol such as two-phase commit (or a saga with compensation if weaker guarantees suffice)", ["Two independent single-row writes with no coordination", "Use eventual consistency and ignore failures", "Write both entries to a local log file on the client"],
  "Atomic cross-node updates need coordination (2PC) or compensating steps (saga). Uncoordinated writes can leave money debited but not credited. Check: ask what happens if the process crashes between the two writes.")

# ---------------------------------------------------------------- CDN
C("SD.CDN", "hb:F7 CDN")
S("E", "What is the primary benefit of using a CDN for static assets?",
  "Content is served from locations close to users, cutting latency and origin load", ["It makes the origin database consistent", "It encrypts the origin database", "It removes the need for any caching headers"],
  "Edge servers near users reduce round-trip distance and absorb most requests that would otherwise hit the origin.")
S("M", "In a pull CDN, when does the edge fetch an object from the origin?",
  "On the first request for it (a cache miss), then it caches the object", ["Only when the operator uploads it manually", "Never; the CDN stores nothing", "Only at midnight"],
  "Pull CDNs fetch on demand and keep the copy for later requests; push CDNs rely on you uploading content in advance.")
S("M", "Which content is the best candidate for a push CDN?",
  "A large software release or video you know users will download soon, uploaded ahead of time", ["Highly personalised dashboards", "Per-request shopping carts", "Bank balances"],
  "Known, popular, rarely-changing large files can be pre-positioned. Personalised data should not be cached at shared edges.")
N("M", "A CDN edge has a 90% cache hit ratio. An edge hit takes 20 ms; a miss takes 220 ms (edge plus origin fetch). What is the average latency in milliseconds?", 0.9 * 20 + 0.1 * 220, 0.1, "Average $=0.9\\times20+0.1\\times220=18+22=40$ ms.")
N("M", "Without a CDN, all 10,000 requests per second hit the origin. With a CDN hit ratio of 95%, how many requests per second reach the origin?", 10000 * 0.05, 1, "Only misses reach the origin: $10000\\times(1-0.95)=500$ requests per second.")
S("H", "You deploy a new version of app.js but users still receive the old one from the CDN for hours. What is the most robust fix?",
  "Version the file name (for example with a content hash) so each release is a new URL", ["Lower the origin server's CPU usage", "Ask every user to clear the cache", "Use a larger edge disk"],
  "Fingerprinted URLs sidestep invalidation entirely: the new name is a cache miss that fetches the new file, and old URLs can stay cached forever. Check: purge-based fixes work but are slower and error-prone.")
M("M", "Select all content that is generally safe and effective to cache at a CDN edge.",
  [("Images and style sheets", True), ("Videos served as segments", True), ("Public JavaScript bundles", True), ("Responses containing one user's private account data without careful cache keys", False)],
  "Shared caches should hold content identical for many users. Private per-user data risks being served to others. Check: ask whether the response is the same for every requester.")
A("M", "Setting a short TTL on CDN objects increases freshness.", "Objects expire sooner and are re-fetched from the origin more often.", 1,
  "A shorter TTL bounds staleness but raises origin load, so freshness is bought with more origin traffic. R explains A.")
S("M", "Why can a CDN improve availability during an origin outage for static content?",
  "Edge caches can keep serving stored copies while the origin is unreachable", ["The CDN repairs the origin server", "The CDN doubles origin CPU", "The CDN stops all traffic"],
  "Cached objects remain available (often with stale-if-error behaviour) even if the origin is down.")

# ---------------------------------------------------------------- MQ
C("SD.MQ", "hb:F8 Message Queues")
S("E", "What is the main benefit of placing a message queue between a producer and a consumer?",
  "They are decoupled in time: the producer continues without waiting for the consumer", ["The producer and consumer must run at the same speed", "Messages are processed before they are sent", "No consumer is ever needed"],
  "A queue buffers messages so producers and consumers can run, fail and scale independently.")
S("M", "Producers briefly send 5x more messages than consumers can process. What does a queue provide here?",
  "It absorbs the burst and lets consumers drain it later, as long as the backlog fits", ["It makes the consumers 5x faster", "It drops the extra messages by definition", "It guarantees zero delay"],
  "Queues smooth bursts (load levelling). They do not make consumers faster, and a persistent overload still grows the backlog.")
N("M", "Messages arrive at 1,200 per second for 10 minutes while consumers handle 1,000 per second. How many messages are waiting in the queue at the end of the burst?", (1200 - 1000) * 600, 0, "Backlog grows at $1200-1000=200$ per second for $600$ s: $200\\times600=120{,}000$ messages.", integer=True)
S("M", "Under at-least-once delivery, what must consumers be designed to handle?",
  "Duplicate messages, by making processing idempotent", ["Lost messages only", "Messages arriving before they are sent", "Nothing; duplicates are impossible"],
  "At-least-once means a message may be redelivered (for example after a missed acknowledgement), so handlers must tolerate repeats, typically with idempotency keys.")
S("H", "A partitioned log guarantees order only within a partition. How do you ensure all events of one order id are processed in order?",
  "Use the order id as the partition key so they land in the same partition", ["Use random partitioning", "Add more partitions and hope", "Use a different queue per message"],
  "Same key hashes to the same partition, preserving relative order for that key; ordering across keys is not guaranteed.")
M("M", "Select all valid uses of a dead-letter queue.",
  [("Holding messages that repeatedly failed processing for later inspection", True), ("Preventing a poison message from blocking the main queue", True), ("Making delivery exactly-once automatically", False), ("Letting operators replay failed messages after a fix", True)],
  "Dead-letter queues isolate failures and allow replay; they do not provide exactly-once semantics. Check: each correct option is about isolating or reprocessing failures.")
S("M", "Which is a typical reason to choose a queue for sending confirmation emails after checkout?",
  "The email can be sent asynchronously without slowing or failing the checkout", ["Emails need a synchronous strongly consistent database transaction", "Checkout cannot work without email", "Queues are required by HTTP"],
  "The user-facing path needs only to record the intent; background workers send the email with retries.")
A("H", "Exactly-once processing is usually achieved by at-least-once delivery combined with idempotent consumers.", "Duplicates created by retries are harmless when applying a message twice has the same effect as once.", 1,
  "True exactly-once delivery over unreliable networks is impractical; effective exactly-once comes from dedupe or idempotency on top of redelivery. R explains A.")
S("E", "In a publish-subscribe model, a single published message is",
  "delivered to every subscriber of the topic (each subscription gets a copy)", ["delivered to exactly one random subscriber in all cases", "never delivered", "stored only on the publisher"],
  "Pub/sub fans out a message to all subscriptions; competing consumers inside one subscription share the work.")

# ---------------------------------------------------------------- RATE
C("SD.RATE", "hb:F9 Rate Limiting")
S("E", "Which rate limiting algorithm allows short bursts above the average rate while enforcing a long-run rate?",
  "Token bucket", ["Leaky bucket with no queue capacity", "Fixed window with zero limit", "Random drop"],
  "A token bucket accumulates tokens up to its capacity, so a quiet client can later send a burst up to that capacity, while the refill rate bounds the average.")
N("M", "A token bucket has capacity 100 tokens and refills at 10 tokens per second. It starts full. A client sends 150 requests in a burst at time 0 (each takes one token if available). How many are accepted?", 100, 0, "The bucket holds 100 tokens at time 0 and no time passes, so only 100 requests are accepted; the other 50 are rejected.", integer=True)
tb = min(100, 0 + 10 * 4)
N("M", "A token bucket (capacity 100, refill 10 tokens per second) is empty at $t=0$. How many tokens does it hold at $t=4$ s with no requests?", tb, 0, "Refill adds $10\\times4=40$ tokens, below the capacity 100, so it holds 40.", integer=True)
S("M", "What is the main weakness of a fixed window counter?",
  "A client can make up to twice the limit around a window boundary", ["It cannot count requests at all", "It uses unbounded memory per client", "It always blocks the first request"],
  "With a limit of N per minute, N requests just before the boundary and N just after fall within a short span, giving about 2N in a short interval.")
est = 0.4 * 80 + 30
N("H", "A sliding window counter limits 100 requests per minute. The previous minute had 80 requests, the current minute has 30 so far, and the window is 40% through the current minute (so 60% of the previous minute still overlaps). What is the estimated count in the sliding window?", 0.6 * 80 + 30, 0.01, "Estimate $=30+0.6\\times80=30+48=78$ requests, so the next request is allowed (under 100).")
S("M", "Which algorithm smooths bursty traffic into a constant outflow rate?",
  "Leaky bucket", ["Token bucket with huge capacity", "Fixed window counter", "Sliding window log"],
  "A leaky bucket drains queued requests at a fixed rate, producing smooth output. Token buckets permit bursts.")
S("M", "In a cluster of 10 API gateways, per-client limits kept in each gateway's local memory enforce the limit incorrectly because",
  "each gateway sees only part of the traffic, so the effective limit can be up to 10x higher", ["local memory cannot count", "gateways cannot read headers", "limits only work on one machine"],
  "Without shared state, a client spread across gateways gets the limit on each. Use a shared store (for example Redis) or route a client consistently to one gateway.")
M("M", "Select all appropriate responses when a client exceeds a rate limit.",
  [("Return HTTP 429 Too Many Requests", True), ("Include a Retry-After hint when possible", True), ("Silently crash the server", False), ("Apply per-user or per-API-key limits rather than one global limit", True)],
  "429 with retry guidance is the standard signal; limits per identity protect other clients. Check: crashing is never a rate limiting strategy.")
S("H", "A rate limiter built on read-then-write operations in a shared store lets clients exceed limits under concurrency. What fixes it?",
  "Make the check-and-increment atomic (for example an atomic increment or a server-side script)", ["Add a longer sleep", "Disable the limiter", "Use a larger client timeout"],
  "Two concurrent requests can both read the same count before either writes. An atomic operation removes that race. Check: the race window is between the read and the write.")
A("E", "Rate limiting helps protect a service from denial-of-service-style overload by a single client.", "It caps how many requests each client can make in a time window.", 1,
  "Capping per-client request volume prevents one client from consuming all capacity. R explains A.")

# ---------------------------------------------------------------- IDX
C("SD.IDX", "hb:F10 Database Indexes")
S("E", "Why does an index speed up a query that filters on an indexed column?",
  "It lets the database locate matching rows without scanning the whole table", ["It stores a second copy of every table", "It disables locking", "It compresses the network"],
  "An index holds sorted keys with row pointers, so lookups are logarithmic instead of linear.")
n_rows = 1_000_000
height = math.ceil(math.log(n_rows, 100))
N("M", "A B-tree index has a fanout of about 100 child pointers per node and indexes 1,000,000 keys. Roughly how many levels (node reads) does a lookup need, taking the smallest integer $h$ with $100^h \\ge 10^6$?", height, 0, "$100^3=10^6$, so $h=3$ levels suffice.", integer=True)
S("M", "What is the main cost of adding many indexes to a write-heavy table?",
  "Every insert, update or delete must also maintain each index, slowing writes and using storage", ["Reads become slower", "The table loses its primary key", "Indexes force full table scans"],
  "Indexes accelerate reads but each write must update them too. Check: more indexes means more structures to keep in sync per write.")
S("M", "A query filters on city and then sorts by signup_date. Which composite index helps most?",
  "An index on (city, signup_date)", ["An index on (signup_date, city) only", "An index on the first letter of each name", "No index is useful"],
  "Equality on the leading column city narrows the range, and within one city the entries are already ordered by signup_date, avoiding a sort. Check: leftmost-prefix rule.")
S("M", "A column has only two distinct values (a boolean) across 100 million rows. A plain B-tree index on it is usually",
  "of little help for queries because it has low selectivity", ["the best possible index", "required for correctness", "always faster than a table scan"],
  "Selecting half the table through an index costs more than scanning it. Indexes pay off on selective predicates.")
S("H", "A query uses WHERE LOWER(email) = 'a@b.com', and an index exists on email. Why may it not be used?",
  "The function on the column prevents using the plain index; use a functional index on LOWER(email) or store normalised values", ["Indexes cannot store strings", "LOWER is not a valid function", "Indexes are only used for numbers"],
  "A predicate on a transformed value does not match an index built on the raw value. Index the expression or normalise on write.")
S("M", "Which index family favours very high write throughput by buffering writes in memory and merging sorted runs on disk?",
  "LSM-tree based indexes", ["B-tree indexes only", "Bitmap indexes", "No index family does this"],
  "LSM trees append writes to memory tables and flush/merge sorted files, trading some read cost and compaction work for fast writes.")
M("M", "Select all true statements about database indexes.",
  [("They consume additional storage", True), ("They can speed up range queries on the indexed column", True), ("A unique index can enforce uniqueness", True), ("Adding an index never changes write performance", False)],
  "Indexes take space, help lookups and ranges, and can enforce uniqueness, but they cost write time. Check: the false statement contradicts the maintenance cost.")
A("M", "A covering index can answer a query without reading the table rows.", "It contains all the columns that the query needs.", 1,
  "If every selected and filtered column is in the index, the engine reads only the index. R explains A.")
S("E", "Which is a likely best first step for a slow query that scans a 50-million-row table for one customer id?",
  "Add an index on the customer id column", ["Add more application servers", "Increase the page title length", "Rewrite the front end"],
  "A selective equality filter benefits from an index lookup instead of a full scan.")

# ---------------------------------------------------------------- CACHE
C("SD.CACHE", "hb:F11 Caching")
S("E", "Which eviction policy removes the item that has not been accessed for the longest time?",
  "LRU (least recently used)", ["LFU (least frequently used)", "FIFO", "Random replacement"],
  "LRU tracks recency of access and evicts the oldest-accessed entry. LFU uses counts; FIFO uses insertion order.")
N("E", "A cache has a 95% hit rate. A hit costs 1 ms and a miss costs 101 ms (including the database). What is the average read latency in ms?", 0.95 * 1 + 0.05 * 101, 0.01, "Average $=0.95\\times1+0.05\\times101=0.95+5.05=6.0$ ms.")
N("M", "Raising the hit rate from 90% to 99% in the same system (hit 1 ms, miss 101 ms) lowers the average latency by what factor? Give the ratio (old average divided by new average) to one decimal.", (0.9 * 1 + 0.1 * 101) / (0.99 * 1 + 0.01 * 101), 0.05, "Old: $0.9+10.1=11.0$ ms; new: $0.99+1.01=2.0$ ms; ratio $11/2=5.5$.")
S("M", "Which caching pattern has the application check the cache first, and on a miss load from the database and populate the cache itself?",
  "Cache-aside (lazy loading)", ["Write-back", "Write-through only", "Read replicas"],
  "In cache-aside the application owns the load-and-fill logic. In read-through the cache does it on behalf of the app.")
S("M", "What is a cache stampede?",
  "Many requests miss on the same expired hot key at once and all hit the database", ["A cache that is always empty", "A cache using too little memory", "A misspelled key"],
  "When a popular entry expires, concurrent misses recompute it simultaneously. Mitigations include request coalescing (single-flight), jittered TTLs and early refresh.")
S("M", "Which strategy writes to the cache first and updates the database later, risking data loss if the cache fails before flushing?",
  "Write-back", ["Write-through", "Cache-aside read path", "Read-through"],
  "Write-back acknowledges after the cache write and flushes asynchronously; it is fast but can lose recent writes on failure.")
M("M", "Select all ways to reduce the chance of serving stale data from a cache.",
  [("Set an appropriate TTL", True), ("Invalidate or update the key when the source data changes", True), ("Cache every response forever", False), ("Use write-through so the cache is updated with each write", True)],
  "Expiry, explicit invalidation and write-through all bound staleness. Caching forever maximises it.")
S("H", "The product catalogue cache is lost during a restart and the database collapses under the cold-cache traffic. What is the best preventive measure?",
  "Warm the cache (pre-populate hot keys) and throttle or stagger traffic during recovery", ["Remove the database", "Shorten TTLs to one second", "Disable all monitoring"],
  "A cold cache sends nearly every request to the database. Pre-warming hot data and gradual traffic ramp avoid the overload. Check: hit rate is the quantity that collapsed.")
A("M", "LFU can keep a popular item cached longer than LRU after a one-time scan of many other items.", "LFU evicts based on access frequency, while LRU evicts based on recency only.", 1,
  "A scan makes many cold items recent, pushing out hot items under LRU; LFU keeps items with high counts. R explains A.")
N("H", "A cache holds 2 million entries averaging 1.5 KB each (1 KB = 1000 B). With 25% additional overhead for keys and metadata, how many GB of memory are needed? Give one decimal.", 2e6 * 1.5e3 * 1.25 / 1e9, 0.05, "Data $=2\\times10^6\\times1500=3\\times10^9$ B = 3 GB; with 25% overhead: $3\\times1.25=3.75$ GB, about 3.8.")

# ---------------------------------------------------------------- CHASH
C("SD.CHASH", "hb:F12 Consistent Hashing")
S("E", "What is the main advantage of consistent hashing over hash(key) mod N for distributing keys across servers?",
  "Adding or removing a server remaps only a small fraction of keys", ["It removes the need for a hash function", "It guarantees perfectly equal load without extra work", "It stores each key on every server"],
  "With mod N, changing N moves most keys; on a hash ring only keys adjacent to the changed node move (about 1/N on average).")
def moved_mod(n):
    cnt = sum(1 for h in range(n * (n + 1) * 10) if h % n != h % (n + 1))
    return cnt / (n * (n + 1) * 10)
N("M", "Keys are placed by hash(key) mod N and you grow from N=4 to N=5 servers. Assuming uniform hashes, what fraction of keys changes server? Give a decimal.", moved_mod(4), 0.01, "A key stays only if $h \\bmod 4=h \\bmod 5$, which holds for 4 of every 20 residues, so 20% stay and 80% (0.8) move.")
N("M", "On a consistent-hashing ring with 9 equal-load servers, one more is added. Assuming good balance, what fraction of the keys is expected to move to the new server? Give a decimal.", 1 / 10, 0.005, "The new server takes over roughly an equal share of $1/(9+1)=0.1$ of the keys, all from neighbours.")
S("M", "Why are virtual nodes (many ring positions per physical server) used?",
  "To spread load more evenly and let stronger servers take more positions", ["To reduce the number of servers", "To make hashing unnecessary", "To store keys in sorted order"],
  "With few points per server, arc lengths vary widely. Many virtual nodes average this out and allow weighting by capacity.")
S("M", "On the ring, a key is assigned to",
  "the first server found moving clockwise from the key's position", ["the server with the smallest id", "a random server each time", "all servers"],
  "Keys and servers are hashed to the same ring; ownership goes to the next server position in the chosen direction.")
S("M", "A server fails on a consistent-hashing ring (no replicas). Which keys are affected?",
  "Only the keys that mapped to that server, which move to its clockwise neighbour", ["All keys in the cluster", "No keys", "Only keys with the largest hashes"],
  "Only the failed node's arc changes ownership; other assignments remain, which is the point of consistent hashing.")
M("M", "Select all statements that are true for consistent hashing.",
  [("It is widely used for distributed caches and partitioned data stores", True), ("Replication can place copies on the next several distinct servers along the ring", True), ("Adding a node forces every key to be rehashed to a new location", False), ("Hotspots can still occur for very popular keys", True)],
  "Ring-based placement supports replication to successors, and a single hot key still lands on one node. Remapping is limited, not total.")
S("H", "A ring has 3 servers, each with a single position, and one server owns 60% of the ring. What is the most appropriate fix?",
  "Add virtual nodes for each server to even out arc lengths", ["Remove two servers", "Switch to mod N", "Double all key sizes"],
  "Imbalanced arcs come from few random positions. More virtual nodes reduce variance (balance improves roughly with the square root of the number of positions).")
A("M", "With hash(key) mod N, adding one server to a cluster of N servers moves most of the keys.", "The modulus changes, so the remainder of most hashes changes too.", 1,
  "For uniform hashes, a fraction N/(N+1) of keys changes server when N increases to N+1. R explains A.")
