"""SD fundamentals 3: SHARD, CONS, PROXY, HB, CKSUM, SVCDISC, BLOOM, GOSSIP."""
import math
from fractions import Fraction
from .dsl import A, C, M, N, S

# ---------------------------------------------------------------- SHARD
C("SD.SHARD", "hb:F13 Database Sharding")
S("E", "What is database sharding?",
  "Splitting a large dataset into independent partitions (shards) placed on different nodes, each holding a subset of the rows", ["Copying the whole database to every node", "Compressing tables in place", "Encrypting each row separately"],
  "Sharding is horizontal partitioning across nodes; replication, by contrast, copies the same data.")
S("M", "Users are sharded by hash(user_id) mod 16. What is the main drawback if you later change to 20 shards?",
  "Most rows change shard, causing a large data migration", ["No rows move", "Only one shard changes", "Queries stop being possible"],
  "Changing the modulus remaps most keys. Consistent hashing or a directory/virtual-shard layer reduces data movement. Check: same argument as modulus remapping for caches.")
S("M", "A social app shards a posts table by created_date (one shard per month). What problem is likely?",
  "All new writes hit the newest shard, creating a hot spot", ["Old posts cannot be read", "Writes spread evenly across shards", "Shards cannot be added"],
  "Monotonic keys like timestamps route all current traffic to one shard. A hashed or composite key spreads writes.")
S("M", "Which query becomes expensive after sharding orders by customer_id?",
  "Finding all orders across all customers placed today (a scatter-gather across shards)", ["Fetching one customer's orders", "Inserting one new order", "Updating one order by customer_id and order id"],
  "Queries that include the shard key go to one shard; those that do not must query every shard and merge results.")
N("M", "A dataset of 12 TB must be split so that each shard holds at most 1.5 TB at the planned load, with no replication. What is the minimum number of shards?", math.ceil(12 / 1.5), 0, "$12/1.5=8$ shards at minimum (more for headroom).", integer=True)
N("M", "Peak write load is 36,000 writes per second. One shard node sustains 4,000 writes per second at target utilisation. With 3 replicas per shard (writes go to the primary only), how many shards are needed?", math.ceil(36000 / 4000), 0, "Writes land on the primary of each shard: $36000/4000=9$ shards.", integer=True)
S("H", "A multi-tenant database is sharded by tenant_id, but one tenant is 40% of the traffic. What is the best remedy?",
  "Give the large tenant its own shard or split its data across several shards with a sub-key", ["Add more tiny tenants", "Reduce replication to zero", "Hash tenant_id with a different function"],
  "A skewed key can remain a hot shard under any hash because it is a single key. Isolating or sub-sharding the large tenant addresses the actual skew.")
M("M", "Select all considerations when choosing a shard key.",
  [("It should spread data and traffic evenly", True), ("It should appear in the most common queries so they hit one shard", True), ("It should have high cardinality", True), ("It should be a constantly increasing timestamp for even distribution", False)],
  "Good keys balance load, have many values and match query patterns. Monotonic keys concentrate writes.")
A("M", "Sharding a database can increase total write throughput.", "Each shard has its own primary that handles a share of the writes.", 1,
  "Writes are divided among shard primaries, so capacity scales with the number of shards, unlike replication alone. R explains A.")

# ---------------------------------------------------------------- CONS
C("SD.CONS", "hb:F14 Consensus Algorithms")
def maj(n): return n // 2 + 1
S("E", "What do consensus algorithms such as Paxos and Raft let a group of nodes do?",
  "Agree on a single value or an ordered log of operations despite some node failures", ["Compress their network traffic", "Choose the fastest node permanently", "Avoid using a network"],
  "Consensus provides agreement and a consistent order of commands among replicas even when a minority fail.")
N("E", "A Raft cluster has 5 nodes. What is the minimum number of nodes that must acknowledge an entry for it to be committed (a majority)?", maj(5), 0, "A majority of 5 is $\\lfloor5/2\\rfloor+1=3$.", integer=True)
N("M", "A cluster of 7 voting nodes uses majority quorums. What is the largest number of node failures it can tolerate while still making progress?", 7 - maj(7), 0, "Majority is 4, so up to $7-4=3$ nodes may fail.", integer=True)
S("M", "Why do consensus clusters usually have an odd number of nodes?",
  "An extra node to make an even size adds no fault tolerance but adds cost", ["Even sizes cannot elect a leader at all", "Odd numbers are required by TCP", "It makes the network faster"],
  "A 4-node cluster needs 3 for a majority and tolerates 1 failure, the same as a 3-node cluster. A 5-node cluster tolerates 2.")
N("M", "A replicated store has N=5 replicas. Writes wait for W=3 acknowledgements. What is the smallest R such that $R+W>N$ (so reads overlap the latest write)?", 5 - 3 + 1, 0, "Need $R>N-W=2$, so the smallest integer is $R=3$.", integer=True)
S("M", "In Raft, what is the leader's role?",
  "It accepts client commands, appends them to its log and replicates them to followers", ["It only sends heartbeats and never stores data", "It is chosen at random for every request", "It stores nothing"],
  "A single leader orders entries and replicates the log; followers apply committed entries.")
S("H", "A 5-node Raft cluster is split by a partition into groups of 2 and 3. What happens?",
  "The group of 3 can elect a leader and commit; the group of 2 cannot make progress", ["Both groups commit independently", "Neither group can ever recover", "The group of 2 elects a leader and commits"],
  "Only a majority (3 of 5) can elect a leader and commit, so there can never be two committing groups; this is how split-brain is avoided.")
A("H", "With majority quorums, two different quorums always overlap in at least one node.", "Any two sets of more than half of the nodes must share a member.", 1,
  "If two sets each have more than N/2 members they cannot be disjoint, so the overlapping node carries the latest committed information. R explains A.")

# ---------------------------------------------------------------- PROXY
C("SD.PROXY", "hb:F15 Proxy Servers")
S("E", "Which proxy sits in front of clients and forwards their requests to the internet?",
  "A forward proxy", ["A reverse proxy", "A database replica", "A DNS root server"],
  "A forward proxy acts for clients (for example to filter or anonymise); a reverse proxy acts for servers.")
S("E", "Which proxy sits in front of web servers and accepts client requests on their behalf?",
  "A reverse proxy", ["A forward proxy", "A VPN client", "A mail relay only"],
  "Reverse proxies terminate connections, can cache, balance load and shield the origin servers.")
M("M", "Select all tasks commonly performed by a reverse proxy.",
  [("TLS termination", True), ("Caching of responses", True), ("Load balancing across backends", True), ("Hiding the client's identity from the destination for outbound traffic", False)],
  "Reverse proxies serve the backend side. Hiding clients' identity is a forward proxy function.")
S("M", "A company wants to block access to certain websites for employees and log their traffic. Which component fits?",
  "A forward proxy with access policies", ["A reverse proxy in the data centre only", "A CDN", "A message queue"],
  "Employee requests leaving the company network pass through a forward proxy where policy and logging apply.")
S("M", "Why can a reverse proxy protect backend servers?",
  "Clients never connect to them directly, so the proxy can filter, rate limit and absorb attacks", ["It deletes the servers' data", "It turns off the firewall", "It makes servers public"],
  "The proxy is the single public entry point and can enforce policy before traffic reaches private backends.")
S("M", "How does a reverse proxy cache reduce backend load?",
  "It serves repeated requests for the same cacheable response without contacting the backend", ["It compresses the database", "It forwards every request to the backend regardless", "It makes responses uncacheable"],
  "Cache hits are answered at the proxy; only misses go to the backend.")
S("H", "A single reverse proxy fronts the entire service. What is the main risk and the usual mitigation?",
  "It is a single point of failure; run redundant proxies behind a virtual IP or DNS balancing", ["It cannot cache; remove it", "It increases database size; shard it", "It cannot terminate TLS; replace it"],
  "Anything every request passes through must be redundant. Check: apply the single-point-of-failure test.")
A("M", "A reverse proxy and a load balancer are often the same software component in practice.", "Reverse proxies can distribute incoming requests among several backend servers.", 1,
  "Many proxies (for example NGINX or HAProxy) both proxy and balance; balancing is one of the reverse proxy's functions. R explains A.")

# ---------------------------------------------------------------- HB
C("SD.HB", "hb:F16 Heartbeats")
S("E", "What is the purpose of heartbeat messages in a distributed system?",
  "To let components detect that peers are alive and healthy", ["To transfer large files", "To encrypt data at rest", "To order database transactions"],
  "Periodic signals allow failures to be detected through their absence.")
N("M", "Nodes send a heartbeat every 2 seconds and a node is declared failed after 3 consecutive missed heartbeats. What is the longest time in seconds, after the last heartbeat arrived, before the failure is declared (assume no jitter and declaration at the third miss)?", 3 * 2 + 0, 0, "Missing 3 consecutive intervals of 2 s each means 6 s after the last heartbeat is received.", integer=True)
S("M", "What is the main trade-off in choosing the heartbeat timeout?",
  "A short timeout detects failure fast but risks false positives; a long one is safer but slower to react", ["A short timeout is always better", "A long timeout is always better", "Timeouts have no effect"],
  "Network delay or GC pauses can delay a heartbeat, so aggressive timeouts may declare healthy nodes dead.")
N("M", "A cluster has 500 nodes, each sending one heartbeat per second to a central monitor. How many heartbeat messages per minute does the monitor receive?", 500 * 60, 0, "$500\\times60=30{,}000$ messages per minute.", integer=True)
S("M", "Why might a node that is alive be declared dead by a heartbeat monitor?",
  "A network partition or long pause delayed its heartbeats", ["Alive nodes cannot send heartbeats", "Heartbeats are always lost", "The monitor cannot count"],
  "Failure detection based on silence cannot distinguish a crashed node from a slow or unreachable one.")
S("M", "What typically happens when a leader's heartbeats to followers stop in Raft?",
  "Followers time out and start a new election", ["Followers shut down", "The cluster deletes its logs", "Clients pick a leader"],
  "Heartbeats suppress elections; missing them after an election timeout triggers one.")
M("M", "Select all good practices for heartbeat-based failure detection.",
  [("Use timeouts longer than typical network jitter", True), ("Randomise election or retry timers to avoid synchronised storms", True), ("Make heartbeats carry useful health data such as load", True), ("Declare failure after a single lost message on a lossy network", False)],
  "Single-loss detection yields many false alarms. Tuning, jitter and richer payloads improve reliability.")
A("H", "Sending heartbeats through a central monitor can itself limit scalability.", "All heartbeat traffic converges on one component, which becomes a load and failure bottleneck.", 1,
  "That is why large clusters use gossip-style or hierarchical failure detection. R explains A.")

# ---------------------------------------------------------------- CKSUM
C("SD.CKSUM", "hb:F17 Checksums")
S("E", "What does a checksum let a receiver check?",
  "Whether the received data matches what was sent, detecting accidental corruption", ["Whether the sender is trustworthy", "How fast the network is", "Whether the data is compressed"],
  "The receiver recomputes the checksum and compares it with the transmitted value.")
S("M", "Which is appropriate to detect tampering by an active attacker, rather than accidental errors?",
  "A keyed hash such as HMAC (or a digital signature)", ["A simple parity bit", "CRC32 alone", "A longer timeout"],
  "CRCs are easy to forge. An attacker cannot recompute an HMAC without the key.")
N("M", "A 1 GB file (1 GB = $10^9$ B) is split into 4 MB chunks (1 MB = $10^6$ B), each with its own checksum. How many chunks are there?", math.ceil(1e9 / 4e6), 0, "$10^9/(4\\times10^6)=250$ chunks.", integer=True)
S("M", "Why store checksums per chunk rather than one checksum for a large file in a storage system?",
  "A corrupted chunk can be detected and repaired from a replica without re-reading the whole file", ["Checksums cannot cover large files", "Per-chunk checksums use no space", "It prevents all failures"],
  "Smaller verification units localise corruption and enable targeted repair.")
S("M", "A replicated storage node finds a chunk whose checksum no longer matches. What is the usual response?",
  "Discard the bad copy and re-replicate it from a healthy replica", ["Ignore it", "Delete all replicas", "Recompute the checksum from the bad data and accept it"],
  "Recomputing from corrupt data would hide the error. Replication provides a good copy to repair from.")
M("M", "Select all true statements about checksums and hashes.",
  [("A cryptographic hash such as SHA-256 can serve as a checksum", True), ("CRC32 is designed to detect accidental errors, not malicious changes", True), ("Equal checksums prove two inputs are identical with certainty", False), ("Checksums are often verified end to end, not only per hop", True)],
  "Collisions are possible in principle, so equal checksums give strong evidence, not proof. End-to-end checks catch corruption at any hop.")
S("H", "Why is an end-to-end checksum still valuable when each network link already uses its own error detection?",
  "Errors can occur in intermediate devices or memory between links, so only an end-to-end check covers the whole path", ["Links never fail", "End-to-end checks make link checks illegal", "Because checksums slow transfers deliberately"],
  "Hop-by-hop checks do not protect data while it sits in routers, disks or memory between the checks.")
A("E", "A checksum mismatch indicates the data was altered or damaged.", "A checksum is a fingerprint recomputed from the received data and compared with the original value.", 1,
  "A different fingerprint means the content differs from what was fingerprinted. R explains A.")

# ---------------------------------------------------------------- SVCDISC
C("SD.SVCDISC", "hb:F18 Service Discovery")
S("E", "What problem does service discovery solve?",
  "Letting services find each other's current network locations dynamically as instances come and go", ["Encrypting service traffic", "Storing user data", "Compiling code"],
  "Instances start, stop and move, so hard-coded addresses break; a registry maps service names to live instances.")
S("M", "In client-side discovery, who chooses the instance to call?",
  "The client queries the registry and selects an instance itself", ["A load balancer always selects", "The database selects", "Nobody selects"],
  "Client-side discovery puts lookup and balancing logic in the client; server-side discovery delegates it to a router.")
S("M", "How do registries usually learn that a service instance has died?",
  "Through health checks or missed heartbeats and registration leases (TTLs)", ["By guessing", "By asking users", "They never learn"],
  "Instances register and renew; if renewals stop, the entry expires.")
M("M", "Select all benefits of using a service registry.",
  [("Services can scale up and down without clients changing configuration", True), ("Unhealthy instances can be removed from lookups", True), ("Clients can use logical service names", True), ("It removes the need for any network", False)],
  "A registry adds indirection between names and addresses, supporting elasticity and health-aware routing.")
S("M", "What can go wrong if clients cache discovery results for too long?",
  "They may call instances that no longer exist", ["Services run out of memory by design", "DNS stops working everywhere", "Nothing; caching is harmless"],
  "Stale entries point to terminated instances. Short TTLs and retries with refresh limit the damage.")
S("H", "The registry itself becomes unavailable. Which design keeps services working?",
  "Clients keep a local cached copy of the last known instances and the registry runs as a replicated cluster", ["Every call fails until the registry returns", "Switch to random IP guessing", "Disable health checks"],
  "Registries must be highly available, and clients should degrade gracefully on cached data.")
S("M", "Which is an example of server-side discovery?",
  "Clients call a load balancer or router that consults the registry and forwards the request", ["The client holds a list and picks an instance", "Hard-coded IPs in source code", "Reading a printed list"],
  "The router performs lookup, hiding discovery from the client.")
A("M", "Hard-coding instance IP addresses in clients is fragile in a dynamically scaled environment.", "Instances can be replaced or rescheduled and receive new addresses.", 1,
  "Addresses change when instances are replaced, so static configuration soon points to nothing. R explains A.")

# ---------------------------------------------------------------- BLOOM
C("SD.BLOOM", "hb:F19 Bloom Filters")
S("E", "What does a Bloom filter answer when it says an element is NOT present?",
  "The element is definitely not in the set", ["The element is probably in the set", "The filter is full", "It may be present"],
  "Bloom filters have no false negatives: if any of the element's bits is 0, it was never added.")
S("M", "What is the one kind of error a standard Bloom filter can make?",
  "False positives (saying 'maybe present' for an absent element)", ["False negatives", "Both equally", "Neither"],
  "All bits for an absent element can happen to be set by other elements.")
def fpr(m, n, k): return (1 - math.exp(-k * n / m)) ** k
N("M", "A Bloom filter has $m=10{,}000$ bits, $n=1{,}000$ inserted elements and $k=7$ hash functions. Using $p\\approx(1-e^{-kn/m})^k$, what is the false-positive rate as a decimal rounded to 4 places?", fpr(10000, 1000, 7), 0.0005, "$kn/m=0.7$; $1-e^{-0.7}=0.5034$; $0.5034^7\\approx0.0082$.")
N("M", "The optimal number of hash functions is $k=(m/n)\\ln 2$. For $m/n=10$ bits per element, what is the nearest integer $k$?", round(10 * math.log(2)), 0, "$10\\times0.693=6.93$, so $k=7$.", integer=True)
N("H", "For a target false-positive rate of 1% with the optimal $k$, a Bloom filter needs $m/n=-\\ln p/(\\ln 2)^2$ bits per element. How many bits per element is that? Give one decimal.", -math.log(0.01) / math.log(2) ** 2, 0.05, "$-\\ln 0.01=4.605$; $(\\ln2)^2=0.4805$; ratio $=9.585$, about 9.6 bits per element.")
S("M", "Can you delete an element from a standard Bloom filter by clearing its bits?",
  "No; clearing bits may remove other elements' evidence, creating false negatives (use a counting Bloom filter)", ["Yes, always safely", "Yes, but only on Tuesdays", "Deleting is the only operation it supports"],
  "Bits are shared among elements, so clearing them can break other entries. Counting variants store counters.")
S("M", "A storage engine checks a Bloom filter before reading each on-disk file for a key. What does this save?",
  "Disk reads for files that certainly do not contain the key", ["All writes", "The memory for the filter", "Network latency to clients"],
  "A negative answer skips the file entirely; only 'maybe' answers cost a disk read.")
M("M", "Select all true statements about Bloom filters.",
  [("They use far less memory than storing the full set", True), ("Lookup time depends on the number of hash functions, not on the set size", True), ("They can return the stored elements", False), ("Adding more elements increases the false-positive rate", True)],
  "A Bloom filter stores only bits, so it cannot enumerate elements; as it fills, more bits are 1 and false positives rise.")
A("M", "A Bloom filter can report an element as present even though it was never added.", "Different elements can set the same bits, so all positions checked for a new element may already be 1.", 1,
  "That is exactly a false positive. R explains A.")

# ---------------------------------------------------------------- GOSSIP
C("SD.GOSSIP", "hb:F20 Gossip Protocol")
S("E", "How does a gossip protocol spread information?",
  "Each node periodically exchanges state with a randomly chosen peer", ["A central server broadcasts to all nodes", "Nodes vote on every message", "Only the leader may send updates"],
  "Random pairwise exchange spreads updates epidemically without central coordination.")
N("M", "In an idealised push gossip model each informed node tells one new, uninformed node per round, so the number of informed nodes doubles each round. Starting with 1 informed node, what is the minimum number of rounds to inform at least 1,000 nodes?", math.ceil(math.log2(1000)), 0, "$2^{10}=1024\\ge1000$ and $2^9=512<1000$, so 10 rounds.", integer=True)
S("M", "What is the main scalability advantage of gossip over all-to-all messaging?",
  "Per-node load stays small while information reaches all nodes in about logarithmic time", ["It sends more messages per node as the cluster grows", "It needs a central coordinator", "It never converges"],
  "Each node talks to a few peers per round, yet the epidemic spread reaches everyone in O(log N) rounds.")
S("M", "Gossip is commonly used for which purpose in distributed databases?",
  "Cluster membership and failure detection information sharing", ["Executing SQL joins", "Compressing logs", "Rendering web pages"],
  "Nodes gossip who is alive and which ranges they own, tolerating failures without a central registry.")
S("M", "What kind of consistency does gossip-based dissemination provide?",
  "Eventual consistency: all nodes converge if updates stop", ["Strong linearizability immediately", "None, nodes diverge forever", "Serializable transactions"],
  "Gossip converges over time but offers no immediate global agreement.")
M("M", "Select all properties of gossip protocols.",
  [("Robust to node failures because there is no single coordinator", True), ("Convergence time is probabilistic rather than exactly bounded", True), ("Message overhead can be redundant because nodes may re-share known data", True), ("Guarantees every node learns an update at the same instant", False)],
  "Randomness gives resilience and probabilistic spread, at the price of redundant messages and no simultaneity.")
S("H", "A 1,000-node cluster uses gossip every 1 second with fan-out 1. Roughly how long until an update is known to almost all nodes?",
  "On the order of ten to twenty seconds (logarithmic in cluster size)", ["Several hours", "About 1,000 seconds", "Instantaneously"],
  "Spread is O(log N) rounds: log2(1000) is about 10 for pure doubling, and a few more rounds to reach the last nodes in the randomised case.")
A("M", "Gossip-based membership avoids a central heartbeat monitor bottleneck.", "Failure information is spread peer to peer instead of converging on one node.", 1,
  "Decentralised exchange removes the single bottleneck present in central monitoring. R explains A.")
