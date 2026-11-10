"""SD fundamentals 1: SCAL, AVAIL, LATTP, CAP, LB. All text original."""
import math
from .dsl import A, C, M, N, S

# ---------------------------------------------------------------- SCAL
C("SD.SCAL", "hb:F1 Scalability")
S("E", "A web tier is CPU-bound at peak and the application keeps no per-user data in memory. Which change scales it most directly?",
  "Run more identical instances behind a load balancer", ["Move the database to a bigger disk", "Add a second DNS record that points to the same single server", "Compress responses with a stronger algorithm only"],
  "Stateless, CPU-bound servers scale out: identical copies share the load behind a balancer. The other options leave the saturated CPU on one machine. Check: capacity grows with instance count only if requests can go to any instance, which statelessness guarantees.")
f = 0.05
sp = 1 / (f + (1 - f) / 10)
N("M", "A job has a serial fraction of 5% that cannot be parallelised; the rest scales perfectly. By Amdahl's law, what is the speedup on 10 processors? Give a number rounded to two decimals.", sp, 0.02,
  f"Speedup $=1/(s+(1-s)/p)=1/(0.05+0.95/10)=1/0.145\\approx 6.90$. Check: even with infinite processors the limit is $1/0.05=20$, so 6.9 on 10 is plausible.")
S("M", "Reads are 95% of the traffic to a product catalogue and one primary database is at its limit. What is usually the cheapest first scaling step?",
  "Add a cache and read replicas, keeping the primary for writes", ["Shard by user id immediately", "Move all reads to the primary's standby with no replication", "Double the primary's RAM and do nothing else"],
  "A read-dominated load is relieved by offloading reads to caches or replicas; sharding is far more complex and is justified only when writes or data size exceed a node. Check: removing 95% of read work from the primary leaves about 5% of the original query rate if the cache is effective.")
cap_servers = math.ceil(40000 / 2500) + 2
N("E", "Peak traffic is 40,000 requests per second. One server handles 2,500 requests per second at the target utilisation. You also want two spare servers (N+2) for failures. How many servers do you provision?", cap_servers, 0, f"Needed: $40000/2500=16$ servers, plus 2 spares gives {cap_servers}.", integer=True)
S("H", "A rate counter for one celebrity account is updated by millions of clients. Sharding the counter table over 100 more nodes does not reduce latency. Why?",
  "All updates hit the same key, so one shard still serves that hot key", ["Sharding only helps reads", "More nodes always add network latency that cancels any gain", "Counters cannot be stored in distributed databases"],
  "Sharding spreads distinct keys. A single hot key still maps to one shard, so that shard remains the bottleneck. Fixes split the key (for example into several sub-counters summed on read) or aggregate updates before writing. Check: throughput for one key is bounded by one node regardless of cluster size.")
M("H", "Which of the following are bottlenecks that adding more stateless web servers will NOT fix?",
  [("A single primary database saturated by writes", True), ("A global lock held by a shared in-memory service", True), ("CPU saturation of the web tier itself", False), ("A single message broker partition receiving all the traffic", True)],
  "Extra web servers help only the web tier. Anything shared (one primary, one lock, one partition) stays a single point of contention. Check: each correct item is a component that all web servers still funnel into.")
A("E", "Vertical scaling eventually hits a hard ceiling.", "The largest machine available has finite CPU, memory and I/O.", 1,
  "Hardware has an upper bound per machine, which is exactly why vertical scaling is capped and designs eventually scale out. R states that bound, so it explains A.")
eff = 1000 * 8 * 0.85
N("M", "One node serves 1,000 requests per second. When the cluster has 8 nodes the load balancer, coordination and uneven load cost you 15% of the ideal linear throughput. What is the cluster's throughput in requests per second?", eff, 1,
  f"Ideal $=8\\times1000=8000$; with 85% scaling efficiency: $8000\\times0.85={eff:.0f}$ requests per second.")
S("M", "Which statement best describes the difference between scalability and raw performance?",
  "Scalability is how well throughput or capacity grows as resources are added; performance is how fast one request is served", ["They are the same measure under different names", "Scalability is only about reducing latency for a single user", "Performance only matters for databases"],
  "A system can be quick for one request yet fail to grow with load, or slow per request yet scale linearly. Check: adding machines changes capacity (scalability) while a single call's latency may stay the same.")
M("M", "Select all techniques that typically increase a system's ability to scale out.",
  [("Keeping session state in an external store instead of server memory", True), ("Partitioning data across nodes by a well-distributed key", True), ("Sticky routing every user to one fixed server forever", False), ("Making work asynchronous through a queue to absorb bursts", True)],
  "Externalised state, good partitioning and buffering via queues let capacity grow with nodes. Pinning users to one server ties load to that machine and defeats balancing. Check: each correct choice removes a dependency on one machine.")

# ---------------------------------------------------------------- AVAIL
C("SD.AVAIL", "hb:F2 Availability")
yr = 365 * 24 * 60
def down(a): return (1 - a) * yr
N("E", "A service promises 99.9% availability (three nines). Using a 365-day year, how many minutes of downtime per year does that allow? Round to the nearest minute.", down(0.999), 1, f"Allowed downtime $=(1-0.999)\\times525600=525.6\\approx526$ minutes (about 8.8 hours).", )
N("M", "Using a 365-day year, how many minutes of downtime per year does 99.99% availability allow? Give one decimal place.", down(0.9999), 0.1, "Allowed downtime $=0.0001\\times525600=52.56\\approx52.6$ minutes. Check: one more nine divides the 526 minutes of three nines by ten.")
series = 0.999 * 0.999 * 0.999
N("M", "A request must pass through three components in series, each independently available 99.9% of the time. What is the end-to-end availability, as a percentage rounded to two decimals?", series * 100, 0.01,
  "In series the availabilities multiply: $0.999^3=0.997003$, i.e. about 99.70%. Check: each 0.1% of unavailability adds roughly, giving about 0.3% total.")
par = 1 - (1 - 0.99) ** 2
N("M", "Two replicas, each independently available 99% of the time, serve traffic in an active-active pair and the service works if at least one is up (assume perfect failover). What is the combined availability as a percentage?", par * 100, 0.01,
  "Failure needs both down: $0.01^2=10^{-4}$, so availability is $1-10^{-4}=99.99\\%$. Check: redundancy squares the failure probability.")
S("M", "Why is a dependency chain of many services in series an availability risk?",
  "The overall availability is the product of the parts, so it is lower than that of any single part", ["Availability only depends on the slowest component", "Series dependencies increase availability through redundancy", "Each added service averages out failures"],
  "Probabilities of all components being up multiply, so each hard dependency reduces the total. Redundancy (parallel) is what raises it. Check: with ten 99.9% services in series the product is about 99.0%.")
S("E", "Which practice most directly improves availability against the failure of a single server?",
  "Redundant replicas with automatic failover", ["Adding more log statements", "Using a larger primary server", "Compressing stored data"],
  "Redundancy lets another replica take over when one fails. A bigger server is still a single point of failure.")
M("M", "Select all examples of eliminating a single point of failure.",
  [("Running two load balancers in an active-passive pair", True), ("Deploying replicas across multiple availability zones", True), ("Placing all replicas on the same rack and power feed", False), ("Using a primary database with a standby that can be promoted", True)],
  "Each correct option adds an independent copy in a separate failure domain. Same-rack replicas share power and network, so one fault takes them all. Check: ask 'what single event removes every copy?'; only the third answer has an answer.")
S("H", "A team measures availability only by whether the load balancer answers health pings, and reports 99.99%. Users still see frequent failed checkouts. What is the best conclusion?",
  "The metric does not measure user-visible success; track the success rate of real requests (an SLI) instead", ["Availability is a hardware metric, so checkout errors are irrelevant", "99.99% is always correct if the ping succeeds", "Add more health pings"],
  "Availability should reflect whether users' requests succeed, so use a request-level indicator such as the fraction of requests served without error. Pings can pass while the application behind them is failing. Check: the user-facing outcome is the definition of the SLO.")
A("H", "Adding a hard dependency on a 99.9%-available service to a 99.95%-available service cannot leave the combined availability at 99.95%.", "For components in series, availability is the product of the components' availabilities.", 1,
  "The product $0.9995\\times0.999\\approx0.9985$ is below 0.9995, so A holds and R is the reason. Check: multiplying by a number below 1 always lowers the result.")
S("M", "What is the difference between an SLO and an SLA?",
  "An SLO is an internal reliability target; an SLA is a contractual commitment, usually with penalties", ["They are the same except for spelling", "An SLA is internal and an SLO has penalties", "SLOs apply only to databases"],
  "Teams set SLOs as targets, typically stricter than the SLA they promise customers, so they have a margin. Check: SLA = agreement (contract); SLO = objective (target).")

# ---------------------------------------------------------------- LATTP
C("SD.LATTP", "hb:F3 Latency vs Throughput")
S("E", "Which statement correctly distinguishes latency from throughput?",
  "Latency is the time for one operation; throughput is the number of operations completed per unit time", ["Latency is bytes per second; throughput is the delay of one packet", "They always move together", "Throughput is only measured at the client"],
  "Latency is a duration for one unit of work; throughput is a rate. Check: units differ (seconds vs operations per second).")
N("M", "A service has 200 requests in flight on average (concurrency) and an average response time of 0.25 s. By Little's law, what throughput in requests per second does it sustain?", 200 / 0.25, 1, "Little's law: $L=\\lambda W$, so $\\lambda=L/W=200/0.25=800$ requests per second.")
N("M", "A thread pool has 64 worker threads, all busy on average, and each request takes 80 ms of service time. What is the maximum sustainable throughput in requests per second? Round to one decimal.", 64 / 0.08, 0.5, "With $L=64$ and $W=0.08$ s, $\\lambda=L/W=800$ requests per second.")
S("M", "Why do teams track p99 latency rather than only the average?",
  "A small slow fraction of requests can hurt many users and is hidden by the mean", ["The average is mathematically undefined for latency", "p99 is always lower than the average", "Percentiles cannot be aggregated across servers"],
  "Latency distributions are long-tailed, so a mean can look healthy while 1% of requests are very slow. Check: with 99 requests at 10 ms and one at 1,000 ms the mean is about 20 ms but p99 is near the slow request.")
m = (99 * 10 + 1000) / 100
N("M", "In a sample of 100 requests, 99 took 10 ms and 1 took 1,000 ms. What is the mean latency in milliseconds?", m, 0.1, f"Mean $=(99\\times10+1000)/100={m:.1f}$ ms, while the maximum is 1,000 ms.")
S("M", "A pipeline has three stages that process 100, 40 and 70 items per second. What is the steady-state throughput of the pipeline?",
  "40 items per second", ["70 items per second", "100 items per second", "70 items per second on average of all stages"],
  "The slowest stage (40 items/s) bottlenecks the flow; the other stages wait. Check: a queue before stage 2 grows if stage 1 feeds it faster than 40 per second.")
S("H", "A service's average utilisation rises from 70% to 95% with unchanged service time and Poisson-like arrivals. What happens to average queueing delay?",
  "It grows disproportionately (for a simple M/M/1 queue by roughly 8x), not linearly", ["It rises by about 25%", "It stays the same", "It decreases because the server is busier"],
  "For an M/M/1 queue the waiting-time factor is $\\rho/(1-\\rho)$: 2.33 at 70% and 19 at 95%, about 8x. Delay explodes near saturation, so keep headroom. Check: as utilisation approaches 100% the denominator approaches zero.")
rho1, rho2 = 0.7 / 0.3, 0.95 / 0.05
N("H", "For an M/M/1 queue, the mean waiting time in the queue is proportional to $\\rho/(1-\\rho)$. By what factor does waiting time grow when utilisation $\\rho$ rises from 0.70 to 0.95? Give one decimal.", rho2 / rho1, 0.1, f"$0.95/0.05=19$ and $0.7/0.3\\approx2.333$, so the ratio is about {rho2/rho1:.1f}.")
M("M", "Select all ways to reduce tail latency in a fan-out service that calls many backends in parallel.",
  [("Hedged requests: send a duplicate to a second replica after a short delay", True), ("Setting per-call timeouts and returning partial results when allowed", True), ("Waiting for the slowest backend with no timeout", False), ("Reducing fan-out width where possible", True)],
  "Hedging, timeouts with graceful degradation and smaller fan-out all cut the chance that one slow backend delays the whole response. Check: the response time is the maximum over backends, so each correct option reduces that maximum.")
A("E", "Increasing throughput can leave latency of a single request unchanged.", "Latency is the time of one request, while throughput counts how many requests finish per unit time.", 1,
  "Adding parallel workers raises throughput while each request still takes the same time, so A holds and R states why.")

# ---------------------------------------------------------------- CAP
C("SD.CAP", "hb:F4 CAP Theorem")
S("E", "In the CAP theorem, which three properties are named?",
  "Consistency, availability and partition tolerance", ["Cost, accuracy and performance", "Concurrency, atomicity and persistence", "Caching, availability and partitioning"],
  "CAP stands for Consistency, Availability and Partition tolerance.")
S("M", "During a network partition between two data centres, a store chooses to reject writes on the minority side to keep replicas identical. Which CAP choice is this?",
  "CP: it keeps consistency and gives up availability on the minority side", ["AP: it keeps availability and gives up consistency", "CA: it gives up partition tolerance", "Neither; CAP does not apply"],
  "Refusing requests to avoid divergence preserves consistency at the cost of availability. Check: if both sides kept accepting writes, replicas would diverge (AP).")
S("M", "A shopping-cart service must stay writable during a partition and merge conflicting carts later. Which CAP choice is this?",
  "AP: it favours availability and accepts temporary inconsistency", ["CP", "CA", "It violates the CAP theorem"],
  "Accepting writes on both sides and reconciling later gives availability and eventual consistency. Check: any later merge step is evidence that replicas diverged during the partition.")
S("M", "Why is 'CA' not a practical choice for a distributed system spanning several machines?",
  "Partitions can occur on real networks, so a system must tolerate them and choose between C and A during one", ["Partitions are impossible so CA is trivially true", "CA systems cannot store data", "CAP forbids using the network"],
  "Network partitions cannot be ruled out, so partition tolerance is not optional; the real choice when one occurs is consistency or availability. Check: a single-node database appears 'CA' only because there is no distribution.")
M("M", "Select all correct statements about the CAP theorem.",
  [("The trade-off between consistency and availability applies while a partition is occurring", True), ("It says a system can be only two of three at all times, even without partitions", False), ("'Consistency' in CAP means linearizability (a single up-to-date view)", True), ("Availability in CAP means every non-failing node returns a response", True)],
  "CAP's trade-off is forced when a partition happens; outside partitions a system can be both consistent and available. Its C is linearizability and A means every request to a live node gets a response. Check: the second statement overstates the theorem.")
S("H", "PACELC extends CAP. What additional trade-off does it name for the normal case with no partition?",
  "Latency versus consistency", ["Cost versus durability", "Throughput versus security", "Storage versus compression"],
  "PACELC: if Partition, choose Availability or Consistency; Else, choose Latency or Consistency. Waiting for more replicas to confirm raises consistency but also latency.")
S("H", "A database acknowledges a write after one replica stores it and replicates asynchronously to the rest. Which pair best describes its behaviour without partitions?",
  "Lower latency with weaker consistency (a read from another replica can be stale)", ["Higher latency with stronger consistency", "Linearizable reads from every replica", "Zero replication lag"],
  "Acknowledging early means readers of other replicas can see old values until replication catches up, trading consistency for latency. Check: synchronous replication would wait for replicas, adding latency but removing staleness.")
A("M", "A system that is linearizable cannot also remain fully available on both sides of a partition.", "Serving writes on both sides during a partition would let replicas diverge and violate the single up-to-date view.", 1,
  "That is the core of the CAP argument: with divergent sides, either one side stops answering or answers can contradict. R explains A.")
S("E", "Which type of system typically prefers consistency over availability during a partition?",
  "A bank's account-balance ledger", ["A social media like counter", "A product-recommendation cache", "A DNS caching resolver"],
  "Money correctness matters more than always answering. Likes, caches and DNS resolvers tolerate stale values.")
S("M", "A banking transfer and a 'like' counter are both built on the same distributed store. What is the most sensible use of the consistency settings?",
  "Use strong consistency for the transfer and weaker consistency for the like count", ["Use eventual consistency for both", "Use strong consistency for the like count only", "Consistency settings do not matter for either"],
  "Match the guarantee to the cost of being wrong: errors in money are unacceptable, while a like count that lags briefly is harmless. Check: ask what happens if a reader sees a value that is a few seconds old.")

# ---------------------------------------------------------------- LB
C("SD.LB", "hb:F5 Load Balancers")
S("E", "What is the main job of a load balancer?",
  "Distribute incoming requests across multiple servers", ["Store the application's data", "Encrypt the database", "Translate programming languages"],
  "A load balancer spreads requests over a pool of backends so no single server is overloaded and failed servers are bypassed.")
S("M", "Servers differ: one has 4 times the capacity of the others. Which algorithm accounts for that?",
  "Weighted round robin (or weighted least connections)", ["Plain round robin", "Random choice with no weights", "Source-port hashing only"],
  "Weights let the balancer send proportionally more requests to larger machines. Plain round robin treats all servers equally. Check: with weights 4:1:1 the big server gets 4/6 of requests.")
S("M", "Requests vary hugely in duration (some last seconds, some milliseconds). Which algorithm usually balances load best?",
  "Least connections (fewest active requests)", ["Plain round robin", "IP hash", "Always the first server"],
  "Counting active requests accounts for long-running ones, so busy servers are avoided. Round robin ignores how long requests take. Check: round robin can stack several long requests on one server by chance.")
S("M", "An application needs to route /api/* and /static/* to different server pools based on the URL path. Which balancer layer is required?",
  "Layer 7 (application layer)", ["Layer 4 (transport layer) alone", "Layer 2 switching", "A DNS A-record only"],
  "Path-based routing needs to read the HTTP request, which is a layer 7 capability. Layer 4 sees only addresses and ports. Check: URL paths are not visible in TCP headers.")
M("M", "Select all advantages of a layer 4 load balancer compared with layer 7.",
  [("Lower per-request processing overhead", True), ("Can route by URL path or HTTP header", False), ("Works with any TCP-based protocol without parsing it", True), ("Typically higher raw throughput", True)],
  "Layer 4 forwards connections without parsing HTTP, so it is cheaper and protocol-agnostic. Content-based routing needs layer 7. Check: the false option requires application-level parsing.")
S("M", "What do load balancer health checks do?",
  "Detect unhealthy backends and stop sending them traffic until they recover", ["Encrypt traffic to the backends", "Cache responses for the clients", "Increase the backend's CPU"],
  "Periodic probes mark failing servers out of rotation so users are not routed to them. They do not alter the servers.")
S("H", "A single load balancer is used in front of a cluster. What is the problem with this design, and the usual fix?",
  "It is itself a single point of failure; run a redundant pair (active-passive or active-active) or use DNS/anycast", ["It cannot balance more than two servers; use more servers", "It always adds 1 second of latency; remove it", "It is impossible to monitor; use sticky sessions"],
  "A lone balancer makes the whole service depend on one machine, so you run several with failover. Check: apply 'what single event takes the service down?'")
S("M", "With IP-hash balancing, what happens to existing client-to-server mapping when a server is added using a simple hash(ip) mod N?",
  "Most clients get remapped to a different server", ["No client changes server", "Only the new server's clients change", "All clients map to the new server"],
  "Changing N in the modulus remaps most keys. Consistent hashing limits this movement. Check: a key stays in place only if hash mod N equals hash mod (N+1), which is rare.")
N("E", "Round-robin sends requests in order to 5 identical servers. Out of 10,000 requests, how many does each server receive?", 10000 / 5, 0, "Equal rotation gives $10000/5=2000$ requests per server.", integer=True)
A("M", "Terminating TLS at a layer 7 load balancer lets it route on HTTP headers.", "The balancer must decrypt the traffic to read the request headers.", 1,
  "Encrypted headers are unreadable without decryption, so header routing requires TLS termination (or inspection) at the balancer. R explains A.")
