"""SD trade-offs T1-T11 (handbook 'Trade-offs')."""
import math
from .dsl import A, C, M, N, S

# ---------------------------------------------------------------- TO_SCALE
C("SD.TO_SCALE", "hb:T1 Vertical vs Horizontal Scaling")
S("E", "Which is a drawback of vertical scaling compared with horizontal scaling?",
  "It has a hard hardware ceiling and leaves a single point of failure", ["It requires distributed coordination", "It needs a load balancer in every case", "It cannot increase CPU"],
  "A bigger single machine is simple but bounded and still one failure domain; horizontal scaling adds machines at the cost of distribution complexity.")
S("E", "Which is a drawback of horizontal scaling compared with vertical scaling?",
  "It adds the complexity of distributed state, coordination and failures", ["It has a hard ceiling at one machine", "It cannot add capacity", "It always reduces availability"],
  "Multiple nodes need balancing, data partitioning and consistency handling.")
S("M", "A legacy single-node relational database is at 70% CPU and growth is 5% per quarter. What is the most pragmatic first step?",
  "Scale up (bigger instance) while planning replicas or partitioning for later", ["Immediately rewrite as 100 microservices", "Ignore growth", "Move to a peer-to-peer design"],
  "Slow, predictable growth on a monolithic database favours the cheap, simple vertical step, buying time to design horizontal scaling. Check: simplicity matters when headroom exists.")
N("M", "A single server costs 1.0 unit and delivers 1 unit of capacity. A server with twice the capacity costs 2.5 units. To serve 8 units of capacity, by how many cost units is an all-small-servers fleet cheaper than an all-big-servers fleet?", 4 * 2.5 - 8 * 1.0, 0.01, "Small fleet: $8\\times1=8$. Big fleet: $4\\times2.5=10$. The small fleet is cheaper by $10-8=2$ units.")
S("M", "Which workload is naturally easiest to scale horizontally?",
  "Stateless request handlers that share nothing", ["A single global counter updated by every request", "A single-leader write path with strict ordering", "A job that needs one huge shared memory image"],
  "Share-nothing work divides freely; global shared state forces coordination.")
M("M", "Select all reasons a team might scale vertically first.",
  [("Simplicity: no code changes or data partitioning", True), ("Low operational complexity for a small team", True), ("Strong transactional guarantees on one node are retained", True), ("It has unlimited headroom", False)],
  "Vertical scaling is simple and keeps single-node semantics but is bounded.")
S("H", "A service autoscales out when CPU > 70%, but latency still rises during bursts because new instances take 3 minutes to warm. What is the best improvement?",
  "Scale proactively or keep spare warm capacity and use queues to absorb the burst", ["Lower the CPU target to 99%", "Remove autoscaling", "Increase the heartbeat interval"],
  "The problem is reaction time versus startup time. Headroom, predictive scaling and buffering cover the gap.")
A("M", "Horizontal scaling improves fault tolerance in addition to capacity.", "Losing one of many nodes removes only a fraction of the capacity.", 1,
  "With N nodes, a single failure cuts capacity by 1/N, whereas one big machine failing removes everything. R explains A.")

# ---------------------------------------------------------------- TO_CONS
C("SD.TO_CONS", "hb:T2 Strong vs Eventual Consistency")
S("E", "Under strong consistency, after a write is acknowledged,",
  "every subsequent read returns that write (or a newer one)", ["reads may return any older value indefinitely", "writes are lost", "only one client can read"],
  "Strong consistency means reads reflect the latest acknowledged write.")
S("E", "Under eventual consistency, if no new updates are made,",
  "all replicas will eventually converge to the same value, with no bound on when", ["replicas never agree", "reads are always up to date", "all writes are rejected"],
  "Eventual consistency promises convergence, not timing.")
S("M", "Which feature is best suited to eventual consistency?",
  "A social media like or view counter", ["Account balance debits", "Seat reservation for a numbered seat", "Inventory decrement for the last item"],
  "Counters tolerate temporary lag; money, unique seats and last-item stock need correctness.")
S("M", "Which feature most needs strong consistency?",
  "Preventing double-booking of the same airline seat", ["A video's view count", "A list of suggested videos", "A profile picture cache"],
  "Two buyers must not both succeed for one seat, which needs a single authoritative, up-to-date view.")
N("M", "A store has 3 replicas and writes need W=2 acknowledgements. A read contacts R=2 replicas. Is $R+W>N$? Enter 1 if yes (reads are guaranteed to overlap the latest write), 0 if no.", int(2 + 2 > 3), 0, "$R+W=4>N=3$, so every read quorum intersects every write quorum: answer 1.", integer=True)
S("M", "What does 'read-your-writes' consistency guarantee?",
  "A client always sees its own earlier writes", ["All clients always see the same value", "Writes are never replicated", "Reads are always slower"],
  "It is a session guarantee weaker than strong consistency but valuable for user experience.")
M("M", "Select all consequences of choosing eventual consistency.",
  [("Lower write latency and higher availability are often possible", True), ("Readers may briefly see stale data", True), ("Concurrent updates may need conflict resolution", True), ("Linearizability is guaranteed", False)],
  "Weaker consistency buys speed and availability while introducing staleness and conflicts.")
A("H", "Strong consistency across regions increases write latency.", "A write must be confirmed by replicas far away before it is acknowledged.", 1,
  "Cross-region round trips add tens to hundreds of milliseconds to each write. R explains A.")

# ---------------------------------------------------------------- TO_STATE
C("SD.TO_STATE", "hb:T3 Stateful vs Stateless Design")
S("E", "In a stateless service, each request",
  "carries all the information needed to process it; the server keeps no client state between requests", ["depends on server memory of earlier requests", "must go to the same server every time", "cannot use a database"],
  "Statelessness means the server does not remember the client between calls, so any instance can serve any request.")
S("M", "Why are stateless services easier to scale horizontally?",
  "Any instance can handle any request, so instances can be added, removed or replaced freely", ["They need no network", "They use less CPU always", "They avoid databases entirely"],
  "Without per-client memory there is no affinity to maintain or lose.")
S("M", "A web app stores login sessions in each server's memory and uses sticky sessions. A server crashes. What happens to its users?",
  "They lose their sessions and must log in again", ["Nothing changes", "They are logged in to all servers", "Their sessions move automatically"],
  "In-memory state dies with the server. Externalising sessions (shared store or signed tokens) removes the issue.")
M("M", "Select all ways to make a stateful web tier effectively stateless.",
  [("Store sessions in a shared cache or database", True), ("Use signed tokens such as JWTs that the client presents", True), ("Keep sessions only in each server's RAM with sticky routing", False), ("Include needed context in each request", True)],
  "State must live outside the instance (shared store) or travel with the request (token).")
S("M", "Which system is inherently stateful?",
  "A database server holding data", ["A pure function endpoint that returns a hash of its input", "A static file server with immutable files", "A stateless proxy"],
  "Databases must remember data between requests; state is their purpose.")
S("H", "A game server keeps match state in memory for low latency and cannot be fully stateless. How can you limit the impact of a server failure?",
  "Periodically checkpoint match state to durable storage and let another server restore it", ["Never checkpoint", "Run matches in the client browser cookie", "Use a larger server"],
  "When state must stay in memory for speed, snapshots or replicated logs allow recovery.")
N("M", "A stateless tier needs 12 servers at peak plus 2 spares. If instead each of 5 stateful nodes holds 1/5 of the state and you need each to be replicated twice (2 extra copies), how many state-holding nodes are required in total (primary plus copies)?", 5 * 3, 0, "Each of 5 partitions has 1 primary and 2 copies: $5\\times3=15$ nodes. (The stateless tier needs only 14 and no replication.)", integer=True)
A("M", "Stateless designs simplify failover.", "Any surviving instance can immediately serve requests that were headed to a failed one.", 1,
  "No state needs to be moved or rebuilt, so traffic simply shifts. R explains A.")

# ---------------------------------------------------------------- TO_WRITE
C("SD.TO_WRITE", "hb:T4 Read-through vs Write-through Cache")
S("E", "In a read-through cache, on a cache miss",
  "the cache itself loads the data from the data store, stores it and returns it", ["the application must write to the cache", "the request fails", "the database is bypassed forever"],
  "Read-through puts the load-on-miss logic inside the cache layer.")
S("E", "In a write-through cache, a write is considered complete when",
  "both the cache and the backing store have been updated", ["only the cache has been written", "only the database has been written", "neither"],
  "Write-through writes synchronously to both, so the cache and store stay consistent.")
S("M", "What is the main cost of write-through caching?",
  "Higher write latency, because each write waits for the backing store", ["Stale cache entries after writes", "Data loss on cache crash", "No benefit for reads"],
  "Synchronous double writes slow writes but keep the cache fresh and the data durable.")
S("M", "What is the main risk of write-back (write-behind) caching compared with write-through?",
  "Recent writes can be lost if the cache fails before they are flushed", ["Slower writes", "Stale reads are guaranteed", "No caching benefit"],
  "Write-back acknowledges from cache and flushes later, so unflushed data is at risk.")
S("M", "Which workload benefits most from a read-through cache?",
  "Read-heavy data with a hot working set", ["Write-once, never-read logs", "Data that changes on every read", "Random one-off lookups of unique items"],
  "Caching pays when entries are re-read; read-heavy hot sets have high hit rates.")
S("H", "A team uses write-through caching for a write-heavy workload and sees write latency double. Which statement best explains it?",
  "Each write now waits for both the cache and the database, so write-through adds work to the write path", ["Write-through makes writes asynchronous", "The cache is too large", "Reads are slower"],
  "Write-through helps read freshness, not write speed, so it is not an optimisation for write-heavy loads; write-back or batching targets that.")
N("M", "A write to the cache takes 1 ms and a write to the database takes 9 ms. How long does one write take under write-through if the two writes are sequential? Under write-back the caller waits only for the cache. By how many ms is a write-through write slower than a write-back write?", (1 + 9) - 1, 0.01, "Write-through: $1+9=10$ ms; write-back: 1 ms; difference 9 ms.")
M("M", "Select all true statements about cache write policies.",
  [("Write-through keeps cache and store consistent on every write", True), ("Write-back improves write latency and can coalesce multiple writes", True), ("Write-back is the safest policy for durability", False), ("Cache-aside leaves cache population to the application", True)],
  "Write-back trades durability for speed; write-through favours consistency and durability.")

# ---------------------------------------------------------------- TO_SQL
C("SD.TO_SQL", "hb:T5 SQL vs NoSQL")
S("E", "Which requirement most strongly suggests a relational (SQL) database?",
  "Complex multi-table queries with ACID transactions, such as financial records", ["Schema-less ingestion of a huge variety of documents with no relations", "A cache for session tokens only", "Storing a billion immutable log lines with no queries"],
  "SQL excels at joins and transactions on structured data.")
S("E", "Which requirement most strongly suggests a NoSQL store?",
  "Massive horizontal scaling with flexible or evolving schemas and simple access patterns", ["Multi-row ACID transfers between accounts", "Ad hoc analytics with many joins", "Strict referential integrity across ten tables"],
  "Many NoSQL systems trade rich queries and strict schemas for scale-out and flexibility.")
S("M", "An app looks up user sessions by id with sub-millisecond latency at huge volume. Which store type fits best?",
  "An in-memory key-value store", ["A relational data warehouse", "A graph database", "A full-text search engine"],
  "Single-key lookups at low latency map to key-value stores.")
S("M", "Which is a true statement about NoSQL databases?",
  "They come in several families (key-value, document, wide-column, graph) with different trade-offs", ["They never scale horizontally", "They all provide full ACID joins", "They cannot store JSON"],
  "NoSQL is an umbrella term; the choice depends on the family.")
M("M", "Select all valid reasons to prefer SQL.",
  [("The data is highly relational and queried in varied ways", True), ("You need multi-statement transactions with strong guarantees", True), ("The schema is stable and integrity constraints matter", True), ("You want to avoid ever defining a schema", False)],
  "SQL provides relations, transactions and constraints, at the cost of upfront schema design.")
S("H", "A product catalogue has wildly different attributes per product category and is mostly read by id or category. Which design is most natural?",
  "A document store with one flexible document per product", ["One relational table with a column for every attribute of every category", "A graph database for all of it", "A text file per product on one server"],
  "Heterogeneous attributes fit self-describing documents, while sparse wide tables waste space and complicate schema changes.")
A("M", "Many NoSQL databases scale horizontally more easily than a traditional single-node SQL database.", "They are built around partitioning data across nodes and relax features such as cross-partition joins and transactions.", 1,
  "Giving up some relational features makes partitioning simpler. R explains A.")
S("M", "A team needs strong transactions for orders but flexible storage for product reviews. What is a sensible approach?",
  "Polyglot persistence: relational store for orders, a document or key-value store for reviews", ["Use one database for everything regardless of fit", "Store orders in a cache only", "Store reviews in a spreadsheet"],
  "Different data have different needs; choosing a store per access pattern is common practice.")

# ---------------------------------------------------------------- TO_API
C("SD.TO_API", "hb:T6 REST vs RPC")
S("E", "Which statement describes REST?",
  "It models resources identified by URLs and manipulated with standard HTTP methods", ["It forbids HTTP", "It requires binary protocols only", "It exposes only verbs such as doStuff()"],
  "REST is resource-oriented and uses GET, POST, PUT, DELETE semantics.")
S("E", "RPC style APIs are primarily organised around",
  "actions or procedures that a client calls remotely", ["web page layout", "database indexes", "DNS records"],
  "RPC exposes operations (methods) rather than resources.")
S("M", "Why is gRPC often chosen for service-to-service calls inside a microservices system?",
  "It uses compact binary serialisation over HTTP/2 with generated typed clients", ["It only works in browsers", "It requires XML", "It cannot stream"],
  "Efficiency, schemas and streaming make gRPC attractive internally.")
S("M", "A public API will be used by many third-party developers with simple tools like curl. Which style is often preferred?",
  "REST over HTTP with JSON", ["A custom binary RPC", "Raw TCP", "Shared database access"],
  "REST is easy to explore, cache and debug using ordinary HTTP tooling.")
S("M", "Which HTTP methods are conventionally idempotent?",
  "GET, PUT and DELETE", ["POST only", "POST and PATCH always", "None"],
  "Repeating GET, PUT or DELETE leaves the same server state; POST generally creates new resources each time.")
M("M", "Select all advantages of REST over RPC for public APIs.",
  [("Uniform interface that is widely understood", True), ("Responses can leverage HTTP caching", True), ("Works with simple tools like browsers and curl", True), ("Always lower latency than any RPC", False)],
  "REST's strengths are uniformity and ecosystem, not guaranteed speed.")
S("H", "A mobile client needs data that would require 5 REST calls per screen, causing latency on poor networks. Which approach directly reduces round trips?",
  "Offer an aggregated endpoint or a query language such as GraphQL that returns exactly the needed fields in one call", ["Add more REST endpoints with finer granularity", "Increase the server's disk", "Switch to polling every second"],
  "Fewer round trips matter on high-latency links; aggregation or GraphQL lets the client fetch a tailored payload.")
A("M", "A PUT request is expected to be idempotent.", "Sending the same PUT multiple times sets the resource to the same state.", 1,
  "Idempotence means repeating gives the same resulting state, which is the defining property of PUT. R explains A.")

# ---------------------------------------------------------------- TO_ASYNC
C("SD.TO_ASYNC", "hb:T7 Synchronous vs Asynchronous")
S("E", "In synchronous communication, the caller",
  "waits for the response before continuing", ["never receives a response", "always uses a queue", "runs in a different process only"],
  "Synchronous calls block until completion; asynchronous ones return immediately and result arrives later.")
S("M", "Which operation is best handled asynchronously?",
  "Generating a monthly report and emailing it to the user", ["Checking a password on login", "Reading the user's balance for display", "Validating form syntax"],
  "Long-running, non-interactive work should not hold the user's request open.")
S("M", "A checkout calls payment, inventory and email synchronously in a chain. Email is slow and occasionally down. What improves checkout reliability most?",
  "Send the email asynchronously via a queue after the order is stored", ["Retry email in a loop inside the request", "Remove inventory checks", "Add a longer timeout to the user's browser"],
  "Non-critical side effects should not block or fail the critical path.")
N("M", "A request calls three downstream services in sequence taking 80, 120 and 50 ms. Calling them in parallel (they are independent) instead takes about how many ms, ignoring overhead?", max(80, 120, 50), 0, "In parallel the total is the slowest call, 120 ms, versus $80+120+50=250$ ms sequentially.", integer=True)
M("M", "Select all challenges introduced by asynchronous processing.",
  [("Harder debugging and tracing across components", True), ("Handling duplicates, retries and ordering", True), ("Eventual rather than immediate results", True), ("Callers are always blocked", False)],
  "Async improves decoupling but demands idempotency and observability.")
S("M", "How should a REST API respond when a client submits a long-running job?",
  "Return 202 Accepted with a job id and let the client poll or receive a callback", ["Hold the HTTP connection open for an hour", "Return an error", "Silently ignore it"],
  "The async request-reply pattern avoids long blocking connections.")
S("H", "A producer publishes events, and consumers must not double-apply them. Which technique addresses duplicates caused by retries?",
  "Idempotent handlers keyed by a unique event id", ["Disable acknowledgements", "Increase queue size", "Use random delays"],
  "Retries are inevitable in async systems; idempotency makes them safe.")
A("M", "Asynchronous processing can improve responsiveness for I/O-bound tasks.", "While waiting for I/O the system can continue working on other tasks instead of blocking.", 1,
  "Overlapping waits with useful work improves latency and throughput. R explains A.")

# ---------------------------------------------------------------- TO_BATCH
C("SD.TO_BATCH", "hb:T8 Batch vs Stream Processing")
S("E", "Batch processing is typically characterised by",
  "processing large volumes of accumulated data at scheduled intervals, with higher latency to results", ["processing every event within milliseconds", "never storing data", "having no schedule"],
  "Batch jobs trade latency for throughput and simplicity.")
S("E", "Stream processing is typically characterised by",
  "processing events continuously as they arrive for low-latency results", ["running only once a day", "requiring all data to be present first", "never producing output"],
  "Streams process unbounded data incrementally.")
S("M", "Which use case suits stream processing?",
  "Detecting a fraudulent card transaction within a second", ["Computing quarterly financial statements", "Nightly data warehouse loads", "Monthly invoice generation"],
  "Fraud blocking needs immediate decisions.")
S("M", "Which use case suits batch processing?",
  "Recomputing recommendations for all users overnight", ["Blocking a payment in real time", "Live dashboard of the last 10 seconds", "Instant chat delivery"],
  "No latency requirement and a large full-dataset computation favour batch.")
N("M", "A stream of 1,000 events per second is aggregated in 1-minute tumbling windows. How many events does each window contain?", 1000 * 60, 0, "$1000\\times60=60{,}000$ events per window.", integer=True)
S("M", "What is the main complexity of stream processing compared with batch?",
  "Handling late or out-of-order events, state and exactly-once semantics", ["It cannot scale", "It needs no state", "It is always cheaper"],
  "Event time versus processing time and fault-tolerant state make streaming harder.")
M("M", "Select all true statements about the lambda architecture idea.",
  [("It combines a batch layer for completeness with a speed layer for freshness", True), ("It can require maintaining logic in two code paths", True), ("It eliminates all latency", False), ("A serving layer merges the views", True)],
  "Lambda combines batch and speed layers; the duplicated logic is a known drawback.")
A("M", "Batch jobs are usually more efficient per record than processing records one by one.", "They amortise start-up costs and can optimise I/O over large chunks.", 1,
  "Per-record overhead is amortised over many records. R explains A.")

# ---------------------------------------------------------------- TO_PUSH
C("SD.TO_PUSH", "hb:T9 Long Polling vs WebSockets")
S("E", "A WebSocket connection is",
  "a persistent, full-duplex channel where both client and server can send messages at any time", ["a single request-response exchange", "one-way from client to server only", "only usable for file downloads"],
  "After the HTTP upgrade handshake the connection stays open for bidirectional messages.")
S("M", "In long polling, the server",
  "holds the client's request open until new data is available or a timeout occurs", ["answers immediately with no data always", "closes the TCP stack", "pushes data without any request"],
  "The client re-issues a request after each response, giving near-real-time updates over plain HTTP.")
N("M", "A client uses plain short polling every 5 seconds. On average, how many requests per second do 1,000 such clients generate in total, even when there is no new data?", 1000 / 5, 0.01, "Each client sends 0.2 requests per second; 1,000 clients give $1000/5=200$ requests per second even when there is no data.")
S("M", "Which application most strongly favours WebSockets?",
  "A live chat or collaborative editor with frequent two-way messages", ["A static blog page", "A nightly file download", "A one-time form submission"],
  "Frequent bidirectional low-latency messaging benefits from a persistent connection.")
S("M", "What is a downside of WebSockets for a large-scale service?",
  "Each client holds a long-lived connection, requiring connection-aware load balancing and resource planning", ["They cannot send data", "They only work on localhost", "They need no server resources"],
  "Millions of open sockets use memory and file descriptors and complicate deployment and failover.")
M("M", "Select all true statements about polling approaches.",
  [("Short polling wastes requests when there is no new data", True), ("Long polling reduces empty responses compared with short polling", True), ("Server-Sent Events provide a one-way server-to-client stream over HTTP", True), ("WebSockets use a new HTTP request for every message", False)],
  "WebSockets reuse one connection after the handshake.")
S("H", "A dashboard only needs server-to-client price updates and must work through restrictive corporate proxies. Which choice is a good fit?",
  "Server-Sent Events or long polling over plain HTTP", ["A custom UDP protocol", "Raw TCP sockets", "Email"],
  "One-way streaming over HTTP traverses proxies easily; full duplex is not needed.")
A("M", "Long polling still consumes a server connection per waiting client.", "The request stays open until data is ready or a timeout occurs.", 1,
  "Held requests occupy connection slots, so scale planning is needed even though empty responses are fewer. R explains A.")

# ---------------------------------------------------------------- TO_NORM
C("SD.TO_NORM", "hb:T10 Normalization vs Denormalization")
S("E", "What is the goal of normalisation?",
  "Reduce data redundancy and update anomalies by storing each fact once", ["Maximise read speed at any cost", "Duplicate data into every table", "Remove all keys"],
  "Normalised schemas keep one copy of each fact, improving integrity.")
S("E", "Why might you denormalise a schema?",
  "To avoid expensive joins and speed up reads by duplicating some data", ["To make writes simpler in every case", "To enforce stronger integrity", "To save storage"],
  "Duplication trades storage and write complexity for faster reads.")
S("M", "A customer renames their account. In a denormalised orders table that copies the customer name into each order row, what problem arises?",
  "Many rows must be updated, and copies can become inconsistent", ["Nothing; one update fixes all", "The orders table disappears", "Joins become required"],
  "Redundant copies create update anomalies unless all are changed together.")
S("M", "A news feed read path joins 6 tables and is slow at high read volume while writes are rare. What is the usual remedy?",
  "Denormalise or precompute the feed into a read-optimised table or cache", ["Normalise further", "Add more joins", "Remove the primary keys"],
  "Read-heavy, write-light workloads favour materialised or denormalised views.")
M("M", "Select all costs of denormalisation.",
  [("Extra storage for duplicated data", True), ("More complex writes that must keep copies in sync", True), ("Risk of inconsistent copies", True), ("Slower reads in all cases", False)],
  "Denormalisation helps reads and burdens writes.")
N("M", "A normalised design needs 3 table reads (3 ms each) per page view; a denormalised design needs 1 read of 4 ms. At 2,000 page views per second, how many ms of database read time per second does denormalisation save?", (3 * 3 - 4) * 2000, 0, "Normalised: $3\\times3=9$ ms per view; denormalised: 4 ms; saving $5$ ms $\\times2000=10{,}000$ ms of database time per second.", integer=True)
S("H", "Which scenario justifies keeping data normalised even in a high-scale system?",
  "Frequently updated shared data where integrity matters, such as account balances", ["Static reference data that never changes", "Read-only analytics snapshots", "Precomputed feeds"],
  "When facts change often and must be consistent, single-copy storage avoids anomalies.")
A("M", "Document databases often favour denormalised, embedded data.", "Embedding related data in one document lets it be read in a single access without joins.", 1,
  "That is the typical document-modelling trade-off. R explains A.")

# ---------------------------------------------------------------- TO_NET
C("SD.TO_NET", "hb:T11 TCP vs UDP")
S("E", "Which protocol provides reliable, ordered delivery with connection setup?",
  "TCP", ["UDP", "ICMP echo only", "ARP"],
  "TCP uses handshakes, acknowledgements and retransmission to deliver an ordered byte stream.")
S("E", "Which protocol is connectionless with no delivery guarantee?",
  "UDP", ["TCP", "TLS", "HTTP/1.1 over TCP"],
  "UDP sends independent datagrams with minimal overhead.")
S("M", "Why is UDP often used for live voice or video calls?",
  "Late packets are useless, so low latency matters more than retransmitting lost ones", ["UDP guarantees order", "UDP encrypts by default", "TCP cannot carry audio"],
  "Waiting for retransmission would add delay; small losses are tolerable.")
S("M", "Which application most needs TCP's guarantees?",
  "File transfer or web page loading where every byte must arrive in order", ["A live game position update at 60 Hz", "A DNS lookup response only", "A live sports video stream with tolerance to loss"],
  "Correctness of every byte is required; TCP handles retransmission and ordering.")
S("M", "What is head-of-line blocking in TCP?",
  "A lost packet delays delivery of later packets until it is retransmitted", ["Packets are delivered out of order", "UDP blocks TCP", "The router drops all packets"],
  "TCP delivers bytes in order, so later data waits for the missing segment.")
N("M", "A TCP connection needs 1 round trip for the handshake before the first data byte can be sent (ignoring TLS). On a 80 ms round trip link, how many ms before the client can start sending data?", 80, 0, "The handshake takes about one round trip: 80 ms.", integer=True)
M("M", "Select all true statements about TCP and UDP.",
  [("TCP provides congestion control", True), ("UDP has lower per-packet overhead", True), ("UDP guarantees that packets arrive in order", False), ("QUIC builds reliability on top of UDP", True)],
  "UDP provides no ordering; QUIC implements reliability, multiplexing and encryption over UDP.")
A("M", "DNS queries typically use UDP.", "A small request-response over UDP avoids connection setup and is usually sufficient.", 1,
  "Most DNS lookups are single small datagrams; TCP is used for large responses or zone transfers. R explains A.")
