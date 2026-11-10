"""SD patterns, interview template, estimation, classic cases."""
import math
from .dsl import A, C, M, N, S

# ---------------------------------------------------------------- PAT_CS
C("SD.PAT_CS", "hb:P1 Client-Server")
S("E", "In the client-server model, the server's role is to",
  "process client requests, manage resources such as data, and return results", ["render the user's screen directly on the client device", "initiate every connection to clients", "act only as a network cable"],
  "Clients request; servers hold resources and respond.")
S("M", "Which is a typical three-tier layout?",
  "Presentation (client), application logic (servers), data (database)", ["Database, database, database", "Two clients and one cable", "Cache, cache, cache"],
  "Separating tiers lets each be scaled and changed independently.")
S("M", "What is the main risk in a design where all clients connect to one server instance?",
  "That server is a bottleneck and a single point of failure", ["Clients cannot connect at all", "Servers become stateless automatically", "Latency becomes zero"],
  "Add replicas behind a load balancer to remove both limits.")
S("M", "A thin client versus a thick client: which statement is accurate?",
  "A thin client leaves most logic on the server, a thick client does more processing locally", ["A thin client stores the whole database", "A thick client has no logic", "They are identical"],
  "The split trades server load, offline ability and update complexity.")
M("M", "Select all properties of the client-server pattern.",
  [("Clients initiate requests and servers respond", True), ("Servers can be scaled behind load balancers", True), ("Clients can be many and heterogeneous (web, mobile)", True), ("Every client must act as a server", False)],
  "That last property describes peer-to-peer, not client-server.")
S("M", "Why do mobile apps often talk to a backend API rather than directly to the database?",
  "To enforce authentication, validation and business rules centrally and avoid exposing credentials", ["Databases cannot accept connections", "It makes apps slower deliberately", "APIs are free of rules"],
  "A server-side layer protects data and keeps logic consistent across clients.")
S("H", "Under client-server, a popular feature's request load grows 10x. Which change generally scales the server tier without redesign?",
  "Make the application tier stateless and add instances behind a load balancer", ["Move all state into each server's memory", "Ask clients to retry less politely", "Replace HTTP"],
  "Stateless tiers scale out; the data tier then needs its own scaling.")
A("M", "Client-server architectures centralise control of resources.", "The server holds and governs the data and logic that clients request.", 1,
  "Central servers make security and consistency easier but concentrate load. R explains A.")

# ---------------------------------------------------------------- PAT_MICRO
C("SD.PAT_MICRO", "hb:P2 Microservices")
S("E", "Microservices are best described as",
  "small, independently deployable services, each focused on one business capability", ["one large codebase deployed as a unit", "a single database shared by all code", "a kind of hardware"],
  "Each service owns its logic and data and communicates over lightweight protocols.")
S("M", "Why does each microservice usually own its own data store?",
  "To keep services loosely coupled so one team can change its schema without breaking others", ["Because databases cannot be shared at all", "To increase joins across services", "To avoid backups"],
  "A shared database couples services through schema and locking.")
S("M", "What new problem appears when an operation spans two microservices with separate databases?",
  "No single ACID transaction; you need sagas or similar patterns and must handle partial failure", ["There is no network latency", "Data is automatically consistent", "Calls can never fail"],
  "Cross-service consistency requires coordination such as sagas with compensating actions.")
S("M", "A downstream service is failing and each caller keeps retrying, making it worse. Which pattern helps?",
  "Circuit breaker with timeouts and backoff", ["More aggressive immediate retries", "Remove all timeouts", "Increase request size"],
  "A circuit breaker stops calling a failing dependency for a while, preventing cascading failure and allowing recovery.")
M("M", "Select all benefits of microservices.",
  [("Independent deployment and scaling per service", True), ("Technology flexibility per service", True), ("Fault isolation if designed with timeouts and breakers", True), ("Lower operational complexity than a monolith", False)],
  "Microservices increase operational overhead (deployment, monitoring, networking).")
S("H", "A 4-person startup with a new product and unclear boundaries is considering 30 microservices. What is the likely best advice?",
  "Start with a well-structured monolith and extract services when boundaries and scale needs are clear", ["Always start with 30 services", "Avoid modularity entirely", "Use one table for everything"],
  "Premature distribution adds cost without benefit; modular monoliths evolve into services later.")
N("M", "A request passes sequentially through 5 services, each 99.9% available. What is the end-to-end availability as a percentage rounded to two decimals?", 0.999 ** 5 * 100, 0.01, "$0.999^5=0.99501$, i.e. about 99.50%.")
A("M", "In a microservices architecture, network calls replace in-process function calls.", "Services are separate deployable units communicating over a network.", 1,
  "That is why latency, partial failure and retries become design concerns. R explains A.")

# ---------------------------------------------------------------- PAT_SERVERLESS
C("SD.PAT_SERVERLESS", "hb:P3 Serverless")
S("E", "In a serverless (function-as-a-service) model, you typically pay",
  "for the compute time and invocations actually used", ["for idle servers all month", "a fixed hardware price", "nothing ever"],
  "Billing is per execution; the provider handles provisioning and scaling.")
S("M", "What is a cold start?",
  "Extra latency when a function instance must be initialised for a request after being idle", ["A frozen database", "A cache flush", "A network cable fault"],
  "New containers or runtimes must load code before handling the first request.")
S("M", "Which workload suits serverless best?",
  "Spiky, event-driven tasks such as resizing images when uploaded", ["A constant 24/7 high-throughput compute job", "A database primary", "A long-lived stateful game server"],
  "Intermittent event processing benefits from scale-to-zero and per-use pricing.")
S("M", "Why are serverless functions usually designed to be stateless?",
  "Instances are ephemeral and may be created or destroyed at any time, so durable state must live elsewhere", ["They have unlimited local disk", "They cannot read data", "State is illegal"],
  "Store state in databases or object storage, not in function memory.")
M("M", "Select all trade-offs of serverless.",
  [("Reduced operational burden for infrastructure", True), ("Possible cold-start latency", True), ("Execution time and resource limits per invocation", True), ("Unlimited control over the underlying OS", False)],
  "Serverless trades control for convenience.")
N("M", "A function is invoked 3 million times a month, runs 200 ms each at 0.5 GB memory. Compute usage is invocations x seconds x GB. How many GB-seconds is that?", 3e6 * 0.2 * 0.5, 1, "$3\\times10^6\\times0.2\\times0.5=300{,}000$ GB-seconds.")
S("H", "A function triggered by queue messages scales out to 1,000 concurrent instances and overwhelms a downstream database. What should you do?",
  "Limit function concurrency or add buffering and backpressure to protect the database", ["Remove the database", "Increase function memory only", "Disable retries and ignore"],
  "Auto-scaling of compute can overwhelm fixed-capacity dependencies; cap concurrency and smooth load.")
A("M", "Serverless platforms can scale a function down to zero instances when idle.", "Billing and capacity follow actual invocations rather than provisioned servers.", 1,
  "Idle functions need not hold resources, which is why cold starts exist. R explains A.")

# ---------------------------------------------------------------- PAT_EVENT
C("SD.PAT_EVENT", "hb:P4 Event-Driven")
S("E", "In an event-driven architecture, components communicate by",
  "producing and reacting to events, usually asynchronously", ["calling each other directly and waiting", "sharing a single variable", "emailing reports"],
  "Producers publish facts; consumers react independently.")
S("M", "What is a key benefit of event-driven decoupling?",
  "New consumers can be added without changing producers", ["Producers must know every consumer", "All components run in one process", "Order of events is irrelevant"],
  "Publishers do not depend on subscribers, so the system extends easily.")
S("M", "What does event sourcing store?",
  "The sequence of events that changed state, from which current state is derived", ["Only the latest state", "Only error logs", "Only user passwords"],
  "State is rebuilt by replaying events, providing a complete audit trail.")
S("M", "In CQRS, commands and queries are",
  "handled by separate models, so the read side can be optimised independently of the write side", ["merged into a single model always", "forbidden", "executed on clients only"],
  "Command Query Responsibility Segregation separates write and read models.")
M("M", "Select all challenges of event-driven systems.",
  [("Eventual consistency between services", True), ("Debugging and tracing flows across events", True), ("Handling duplicate or out-of-order events", True), ("Strict synchronous guarantees by default", False)],
  "Asynchrony is the source of these challenges.")
S("H", "An order service must update its database and publish an 'OrderPlaced' event reliably, without losing either. Which pattern is used?",
  "Transactional outbox: write the event to an outbox table in the same transaction and relay it to the broker", ["Write the database, then hope the publish succeeds", "Publish first, never write", "Use two independent writes with no retry"],
  "A single atomic write plus a relay avoids the dual-write inconsistency.")
S("M", "Why must event consumers be idempotent?",
  "Brokers may redeliver events, so processing the same event twice must not corrupt state", ["Events are never repeated", "Consumers run once per year", "Because JSON requires it"],
  "At-least-once delivery means duplicates are possible.")
A("M", "Event-driven architecture suits workloads where multiple independent reactions follow one occurrence.", "A single event can be consumed in parallel by several subscribers.", 1,
  "Fan-out of one event to many consumers is a core strength. R explains A.")

# ---------------------------------------------------------------- PAT_P2P
C("SD.PAT_P2P", "hb:P5 Peer-to-Peer")
S("E", "In a peer-to-peer architecture, each node",
  "can act as both client and server, with no central server required", ["is only a client", "is only a server", "must contact a central master for each message"],
  "Peers share resources directly, giving resilience and scalability.")
S("M", "What is a major advantage of P2P over client-server?",
  "No single point of failure and capacity grows as peers join", ["Simpler security", "Guaranteed consistency", "Zero bandwidth use"],
  "Peers contribute resources, so each new peer adds capacity.")
S("M", "What is a major challenge of P2P systems?",
  "Discovery, trust and consistency among untrusted, unreliable peers", ["No networking needed", "Central logging is trivial", "Peers never leave"],
  "Without central control, lookup, security and churn are harder.")
S("M", "How do distributed hash tables (DHTs) help P2P networks?",
  "They map keys to responsible peers so lookups need no central index", ["They encrypt files", "They compress video", "They elect a master"],
  "A DHT assigns key ranges to peers and routes lookups in O(log N) hops.")
N("M", "A DHT with 1,000,000 peers routes in about $\\log_2 N$ hops. How many hops, rounded up to an integer?", math.ceil(math.log2(1e6)), 0, "$\\log_2 10^6\\approx19.93$, so 20 hops.", integer=True)
M("M", "Select all systems or protocols commonly associated with P2P designs.",
  [("BitTorrent file sharing", True), ("Blockchain networks", True), ("A single-primary SQL database cluster with one master", False), ("Distributed hash tables", True)],
  "A primary-replica SQL cluster is centralised; the others are decentralised designs.")
S("H", "A file sharing network wants to distribute a 4 GB file to 10,000 users without a huge origin bandwidth bill. Which approach helps?",
  "Let downloaders also upload pieces they already have to other peers", ["Make each user download only from the origin", "Ban uploading", "Split the file into 2 parts only"],
  "Piece exchange shifts bandwidth cost to the swarm, so origin load grows much slower than user count.")
A("M", "P2P networks can be more resilient to single-node failure than client-server systems.", "No peer is indispensable because others hold copies and can route around failures.", 1,
  "Decentralisation removes the central point whose failure stops everything. R explains A.")

# ---------------------------------------------------------------- TEMPLATE
C("SD.TEMPLATE", "hb:Template + Tips")
S("E", "What should be the first step in a system design interview?",
  "Clarify functional and non-functional requirements and scope", ["Draw the database schema", "Choose the programming language", "Pick a cloud vendor"],
  "Requirements drive all later choices.")
S("E", "Which is a non-functional requirement?",
  "The system must respond within 200 ms at the 99th percentile", ["Users can upload a photo", "Users can follow others", "Users can comment on a post"],
  "Latency targets are qualities of the system, whereas the others are features.")
S("M", "Why ask about the read-to-write ratio early?",
  "It shapes caching, replication, indexing and storage choices", ["It decides the colour scheme", "It sets the server brand", "It only matters for security"],
  "Read-heavy and write-heavy systems need different architectures.")
S("M", "Which order best matches a sound interview flow?",
  "Requirements, capacity estimation, high-level design, data model and APIs, deep dive, bottlenecks and trade-offs", ["Deep dive, requirements, estimation", "Data model only", "Bottlenecks first, then requirements"],
  "Moving from scope to detail keeps the design grounded.")
S("M", "Which practice reduces cascading failures in a distributed design?",
  "Timeouts, retries with exponential backoff and circuit breakers", ["Unlimited immediate retries", "No timeouts", "Synchronous calls to everything"],
  "Bounded, backed-off retries and breakers protect overloaded services.")
M("M", "Select all items that belong in a high-level design block diagram for a typical web service.",
  [("Clients and load balancers", True), ("Application servers and services", True), ("Databases, caches and queues as needed", True), ("A list of the interviewer's hobbies", False)],
  "The diagram shows the major components and their connections.")
S("H", "An interviewer asks you to design a service but gives vague requirements. What is the best response?",
  "State assumptions and ask clarifying questions, confirming scale, latency and consistency needs", ["Start coding immediately", "Refuse to proceed", "Choose the most complex architecture"],
  "Scoping the problem is part of the evaluation.")
A("M", "Making operations idempotent simplifies retry logic.", "Repeating an idempotent operation does not change the outcome beyond the first execution.", 1,
  "Retried requests are then safe. R explains A.")
S("M", "Which statement reflects good trade-off discussion?",
  "Name the options, state what each gains and costs for these requirements, then justify a choice", ["Declare one technology always best", "Avoid choosing", "List buzzwords"],
  "There is no perfect design; reasoning from requirements is the point.")
S("M", "Why include monitoring and alerting in a design?",
  "To detect failures, performance regressions and anomalies quickly", ["To increase request size", "To replace the database", "To avoid testing"],
  "Observability closes the loop for reliability.")

# ---------------------------------------------------------------- ESTIM
C("SD.ESTIM", "hb:Template step 2 (capacity estimation)")
SEC = 86400
N("E", "A service has 10 million daily active users and each makes 20 requests a day on average. What is the average requests per second? Round to the nearest integer (use 86,400 s per day).", 10e6 * 20 / SEC, 1, "Total $=2\\times10^8$ requests per day; $/86400\\approx2315$ requests per second.")
N("M", "In the previous setting peak traffic is 3x the average. What peak requests per second? Round to the nearest integer.", 10e6 * 20 / SEC * 3, 1, "Average $\\approx2315$; peak $\\approx3\\times2315=6944$ requests per second.")
N("M", "A photo service stores 2 million new photos a day, 3 MB each (1 MB = $10^6$ B), with 3 replicas. How many TB (1 TB = $10^{12}$ B) are added per day, counting replicas?", 2e6 * 3e6 * 3 / 1e12, 0.01, "$2\\times10^6\\times3\\times10^6=6\\times10^{12}$ B = 6 TB per copy; times 3 replicas gives 18 TB per day.")
N("M", "Storage grows by 18 TB per day (with replicas). How many PB (1 PB = $10^{15}$ B) are needed after 5 years of 365 days? Give one decimal.", 18e12 * 365 * 5 / 1e15, 0.05, "$18\\times365\\times5=32{,}850$ TB $=32.85$ PB, about 32.9.")
N("M", "A video site serves 50,000 concurrent streams at 4 Mbps each. What is the outbound bandwidth in Gbps?", 50000 * 4 / 1000, 0.01, "$50000\\times4=200{,}000$ Mbps $=200$ Gbps.")
N("M", "A read-heavy service has 5,000 reads per second and caches the hottest 20% of a 500 GB dataset (use 1 GB = $10^9$ B). How many GB of cache memory are needed for the hot data alone?", 0.2 * 500, 0.1, "$0.2\\times500=100$ GB.")
N("M", "Each request averages 8 KB in response size (1 KB = 1,000 B). At 6,000 requests per second, what is the egress bandwidth in MB per second (1 MB = $10^6$ B)?", 6000 * 8e3 / 1e6, 0.1, "$6000\\times8000=4.8\\times10^7$ B/s = 48 MB/s.")
N("M", "A system needs 12,000 write operations per second at peak. Each node can sustain 1,500 writes per second at the target load. With N+1 redundancy (one extra node), how many nodes?", math.ceil(12000 / 1500) + 1, 0, "$12000/1500=8$ nodes plus 1 spare gives 9.", integer=True)
N("H", "Messages: 500 million per day, average 200 bytes each, retained for 2 years (730 days), stored with 3 copies (1 TB = $10^{12}$ B). How many TB?", 500e6 * 200 * 730 * 3 / 1e12, 1, "Per day $=10^{11}$ B = 0.1 TB; 730 days $=73$ TB; times 3 copies $=219$ TB.")
S("M", "Why is it acceptable to use round numbers (for example 100,000 seconds per day) in back-of-the-envelope estimates?",
  "The goal is the order of magnitude to guide design, not precise values", ["Precision is mandatory", "Round numbers are exact", "Estimates never matter"],
  "Estimates inform whether you need one machine or a thousand; a small error does not change that.")

# ---------------------------------------------------------------- CASES
C("SD.CASES", "hb:Q1-Q10 common questions")
N("M", "A URL shortener creates 100 million new links a month. Each record is about 500 bytes. How many GB of new data per year (1 GB = $10^9$ B), before replication?", 100e6 * 12 * 500 / 1e9, 1, "$100\\times10^6\\times12=1.2\\times10^9$ links; $\\times500$ B $=6\\times10^{11}$ B = 600 GB.", s="hb:Q1 URL shortener")
N("M", "A URL shortener uses 7-character codes from 62 symbols (a-z, A-Z, 0-9). How many billion distinct codes exist? Give one decimal.", 62 ** 7 / 1e9, 0.05, "$62^7=3{,}521{,}614{,}606{,}208$, about 3,521.6 billion; the question asks for billions, so 3521.6.", s="hb:Q1 URL shortener")
S("M", "Which approach avoids collisions when generating short URL codes in a distributed shortener?",
  "Pre-allocate unique id ranges to each server and encode ids in base 62", ["Use random codes with no uniqueness check", "Use the first 7 letters of the long URL", "Use the current second only"],
  "Unique ids encoded in base 62 are collision-free by construction. Random codes need a check against the store.", s="hb:Q1 URL shortener")
S("M", "In a URL shortener's redirect path, which status code is typically used when you want browsers to re-check the short link each time (allowing link analytics and later changes)?",
  "302 Found (temporary redirect)", ["301 Moved Permanently", "200 OK with body", "404 Not Found"],
  "A permanent redirect may be cached by browsers, bypassing the service; a temporary one keeps requests flowing through it.", s="hb:Q1 URL shortener")
S("M", "In a chat application, how are messages usually pushed to online clients with low latency?",
  "Over persistent connections such as WebSockets", ["By clients polling once a day", "By email", "By page refresh only"],
  "Persistent bidirectional connections enable immediate delivery.", s="hb:Q2 Chat")
S("M", "For a chat app, how should delivery status (sent, delivered, read) be modelled?",
  "As acknowledgement events from the recipient's device that update a per-message state", ["As a single counter shared by all chats", "It cannot be tracked", "As a client-side guess"],
  "Receipts flow back from recipients and update the message state.", s="hb:Q2 Chat")
S("H", "A news feed uses fan-out on write (push) for all users. A celebrity with 50 million followers posts. What goes wrong and what is the standard fix?",
  "Writing to 50 million feeds at once is very expensive; use a hybrid where celebrity posts are pulled at read time", ["Nothing goes wrong", "The database shrinks", "Followers cannot read"],
  "Push suits typical users; for very high fan-out, merge celebrity content on read.", s="hb:Q3 Social feed")
S("M", "Why are photos and videos stored in object storage rather than in the relational database?",
  "Object storage is cheaper and scales for large blobs, while the database holds metadata and references", ["Databases cannot store text", "Object storage is slower for large files by design", "Blobs must be indexed by SQL"],
  "Blob storage plus CDN is the standard pattern for media.", s="hb:Q3 Social feed")
S("M", "How is a video prepared for adaptive streaming?",
  "It is transcoded into several bitrates and split into short segments that the player chooses between", ["It is stored as one huge file only", "It is converted to text", "It is sent unchanged to all devices"],
  "Adaptive bitrate streaming lets players switch quality as bandwidth changes.", s="hb:Q4 Video streaming")
N("M", "A video catalogue has 1 million hours of video, stored at an average of 2 GB per hour across all renditions (use 1 GB = $10^9$ B). How many PB (1 PB = $10^{15}$ B) is that?", 1e6 * 2e9 / 1e15, 0.01, "$10^6\\times2\\times10^9=2\\times10^{15}$ B = 2 PB.", s="hb:Q4 Video streaming")
S("M", "For an e-commerce checkout, which approach prevents overselling the last unit of an item?",
  "Reserve or decrement inventory atomically inside a transaction or with an optimistic version check", ["Read the stock, then write it later without checks", "Cache the stock forever", "Let clients decide"],
  "Concurrent buyers need atomic conditional updates.", s="hb:Q5 E-commerce")
S("H", "A ride-sharing app must find drivers near a rider quickly. Which data structure approach is typical?",
  "A geospatial index such as geohash or quadtree cells with periodically updated driver locations", ["A single list of all drivers scanned linearly", "Sorting drivers by name", "Using random drivers"],
  "Spatial partitioning lets the system query only nearby cells.", s="hb:Q6 Ride sharing")
S("M", "In a cloud file storage service, how are large uploads handled reliably?",
  "Split into chunks uploaded independently and resumable, with the metadata updated on completion", ["Upload as one request with no retries", "Email the file", "Upload only one byte at a time"],
  "Chunking enables parallelism, resume and deduplication.", s="hb:Q7 File storage")
S("M", "A web crawler must avoid fetching the same page repeatedly. What helps most?",
  "A visited-URL set, often a Bloom filter or database check, plus URL normalisation", ["Fetching everything again every second", "No tracking", "Random sleeps only"],
  "Deduplicating URLs prevents wasted work and loops.", s="hb:Q8 Web crawler")
S("M", "Why must a crawler respect politeness policies per host?",
  "To avoid overloading sites and being blocked, using per-host rate limits and robots.txt", ["Because DNS requires it", "To speed the crawler up", "It does not matter"],
  "Honouring robots.txt and spacing requests is both ethical and practical.", s="hb:Q8 Web crawler")
S("M", "A notification system must retry failed push deliveries. What is a sound design?",
  "Queue per channel with retries using exponential backoff and a dead-letter queue", ["Retry immediately in an infinite loop", "Drop failures silently", "Block the sender until success"],
  "Backoff avoids hammering providers; DLQs capture permanent failures.", s="hb:Q9 Notification system")
S("M", "In a logging and monitoring system, why are logs usually shipped through a message queue or stream before storage?",
  "To buffer bursts and decouple producers from storage and processing", ["Logs cannot be stored directly", "To make logs bigger", "To remove timestamps"],
  "A durable stream absorbs spikes and allows multiple consumers (indexing, alerting, archiving).", s="hb:Q10 Logging and monitoring")
M("M", "Select all good practices for tiered log storage.",
  [("Keep recent logs in fast searchable storage", True), ("Archive older logs to cheaper cold storage", True), ("Apply retention policies to delete expired logs", True), ("Keep all logs forever on the fastest tier", False)],
  "Tiering and retention control cost.", s="hb:Q10 Logging and monitoring")
A("M", "Link expiration in a URL shortener can be implemented with a TTL or an expiry timestamp checked at redirect time.", "The service can refuse or delete links whose expiry time has passed.", 1,
  "An expiry field checked on lookup, plus background cleanup, enforces it. R explains A.", s="hb:Q1 URL shortener")
