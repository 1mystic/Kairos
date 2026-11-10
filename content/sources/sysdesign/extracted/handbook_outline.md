# System Design Interview Handbook: structured outline (extracted, plain text)

Sections (page numbers refer to the owner's PDF) and the key points used to write questions.

## Fundamentals (pp 6-26)
1. Scalability: handle growing load by adding resources.
2. Availability: uptime / (uptime + downtime); availability tiers (table is an image; values recomputed by us).
3. Latency vs throughput: time of one operation vs work per unit time (RPS/TPS).
4. CAP: consistency (latest write or error), availability (non-error response), partition tolerance; cannot have all three.
5. Load balancers: round robin, weighted round robin, least connections, least response time, IP hash.
6. Databases: relational, NoSQL, in-memory, graph, time series, spatial.
7. CDN: geographically distributed edge servers delivering static content near users.
8. Message queues: asynchronous producer/consumer decoupling; multiple consumers share work.
9. Rate limiting: token bucket, leaky bucket, fixed window counter, sliding window log, sliding window counter.
10. Database indexes: lookup structure of column values plus row pointers.
11. Caching: read-through, write-through, write-back, cache-aside; eviction LRU, LFU, FIFO, TTL.
12. Consistent hashing: ring 0..2^n-1, servers and keys hashed, clockwise assignment, minimal remapping.
13. Sharding: horizontal partitioning into independent shards on separate nodes.
14. Consensus: Paxos (leader proposes, majority accepts), Raft (leader-based log replication).
15. Proxy servers: forward proxy (client side), reverse proxy (server side).
16. Heartbeats: periodic health messages; absence signals failure.
17. Checksums: fingerprint recomputed at the receiver to detect corruption.
18. Service discovery: registry as single source of truth for service locations.
19. Bloom filters: bit array of m bits, k hashes; definitely-not or possibly-in.
20. Gossip protocol: periodic random exchange; eventual convergence.

## Trade-offs (pp 28-43)
Vertical vs horizontal scaling; strong vs eventual consistency; stateful vs stateless; read-through vs write-through cache; SQL vs NoSQL; REST vs RPC; synchronous vs asynchronous; batch vs stream processing; long polling vs WebSockets; normalisation vs denormalisation; TCP vs UDP.

## Architectural patterns (pp 45-49)
Client-server; microservices (own database per service); serverless (event-triggered functions, pay per use); event-driven (decoupled, asynchronous events); peer-to-peer (equal peers, no central server).

## Interview template (pp 50-59)
Clarify requirements (functional and non-functional) -> capacity estimation -> high-level design -> database design -> API design -> deep dives (databases, application servers, caching) -> address key concerns (scalability and performance; reliability: redundancy, geo-redundancy, replication, circuit breakers, retries with exponential backoff, monitoring).

## 40 interview tips (pp 60-64)
Themes: requirements first; trade-offs; assume failure; keep it simple; prefer horizontal scaling; load balancers; SQL vs NoSQL vs graph; sharding; indexing; rate limiting; WebSockets; heartbeats; queues; denormalise for reads; Bloom filters; CDNs; caching and write/read-through; object storage; replication; autoscaling; async and batch; idempotency; data lake/warehouse; logging and monitoring; circuit breakers; chaos engineering; statelessness; failover; multi-data-centre; TTLs; cache warm-up.

## 10 common questions (pp 65-75)
URL shortener; chat application; social media platform; video streaming; e-commerce; ride sharing; file storage service; web crawler; notification system; logging and monitoring system. Each lists functional and non-functional requirements (turned into `problems.json`).
