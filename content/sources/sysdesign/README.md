# System design and AI/ML system design content

Questions and design problems derived from the owner-authored study notes (see `ATTRIBUTION.md`). Structured outlines of the notes are in `extracted/`.

## Counts

- System Design (`SD`, track SYS_DESIGN): **350** questions, E/M/H = 61/242/47
- AI/ML System Design (`MSD`, track ML_SYS_DESIGN): **137** questions, E/M/H = 9/109/19
- Design problems: 18 (10 system design, 8 ML) in `problems.json`

### By chapter and type

| Chapter | Name | Total | SCQ | MSQ | NVQ | INT | A/R |
|---|---|---|---|---|---|---|---|
| SD.SCAL | Scalability | 10 | 4 | 2 | 2 | 1 | 1 |
| SD.AVAIL | Availability and reliability | 10 | 4 | 1 | 4 | 0 | 1 |
| SD.LATTP | Latency vs throughput | 10 | 4 | 1 | 4 | 0 | 1 |
| SD.CAP | CAP theorem and PACELC | 10 | 8 | 1 | 0 | 0 | 1 |
| SD.LB | Load balancers | 10 | 7 | 1 | 0 | 1 | 1 |
| SD.DB | Databases and replication | 10 | 7 | 1 | 1 | 0 | 1 |
| SD.CDN | Content delivery networks | 9 | 5 | 1 | 2 | 0 | 1 |
| SD.MQ | Message queues and streams | 9 | 6 | 1 | 0 | 1 | 1 |
| SD.RATE | Rate limiting | 10 | 5 | 1 | 1 | 2 | 1 |
| SD.IDX | Database indexes | 10 | 7 | 1 | 0 | 1 | 1 |
| SD.CACHE | Caching | 10 | 5 | 1 | 3 | 0 | 1 |
| SD.CHASH | Consistent hashing | 9 | 5 | 1 | 2 | 0 | 1 |
| SD.SHARD | Database sharding | 9 | 5 | 1 | 0 | 2 | 1 |
| SD.CONS | Consensus and quorums | 8 | 4 | 0 | 0 | 3 | 1 |
| SD.PROXY | Proxy servers | 8 | 6 | 1 | 0 | 0 | 1 |
| SD.HB | Heartbeats and failure detection | 8 | 4 | 1 | 0 | 2 | 1 |
| SD.CKSUM | Checksums and data integrity | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.SVCDISC | Service discovery | 8 | 6 | 1 | 0 | 0 | 1 |
| SD.BLOOM | Bloom filters | 9 | 4 | 1 | 2 | 1 | 1 |
| SD.GOSSIP | Gossip protocols | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.TO_SCALE | Trade-off: vertical vs horizontal scaling | 8 | 5 | 1 | 1 | 0 | 1 |
| SD.TO_CONS | Trade-off: strong vs eventual consistency | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.TO_STATE | Trade-off: stateful vs stateless | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.TO_WRITE | Trade-off: write-through vs write-back caching | 8 | 6 | 1 | 1 | 0 | 0 |
| SD.TO_SQL | Trade-off: SQL vs NoSQL | 8 | 6 | 1 | 0 | 0 | 1 |
| SD.TO_API | Trade-off: REST vs RPC | 8 | 6 | 1 | 0 | 0 | 1 |
| SD.TO_ASYNC | Trade-off: synchronous vs asynchronous | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.TO_BATCH | Trade-off: batch vs stream processing | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.TO_PUSH | Trade-off: polling, long polling, WebSockets | 8 | 5 | 1 | 1 | 0 | 1 |
| SD.TO_NORM | Trade-off: normalisation vs denormalisation | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.TO_NET | Trade-off: TCP vs UDP | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.PAT_CS | Pattern: client-server | 8 | 6 | 1 | 0 | 0 | 1 |
| SD.PAT_MICRO | Pattern: microservices | 8 | 5 | 1 | 1 | 0 | 1 |
| SD.PAT_SERVERLESS | Pattern: serverless | 8 | 5 | 1 | 1 | 0 | 1 |
| SD.PAT_EVENT | Pattern: event-driven architecture | 8 | 6 | 1 | 0 | 0 | 1 |
| SD.PAT_P2P | Pattern: peer-to-peer | 8 | 5 | 1 | 0 | 1 | 1 |
| SD.TEMPLATE | Interview framework | 10 | 8 | 1 | 0 | 0 | 1 |
| SD.ESTIM | Back-of-the-envelope estimation | 10 | 1 | 0 | 8 | 1 | 0 |
| SD.CASES | Classic design problems | 19 | 14 | 1 | 3 | 0 | 1 |
| MSD.FRAME | Problem framing and metrics | 10 | 6 | 1 | 2 | 0 | 1 |
| MSD.DATA | Data and labels | 9 | 5 | 1 | 2 | 0 | 1 |
| MSD.FEAT | Features and feature stores | 9 | 5 | 1 | 2 | 0 | 1 |
| MSD.MODEL | Model selection and training | 10 | 7 | 1 | 1 | 0 | 1 |
| MSD.EVAL | Offline and online evaluation | 9 | 2 | 0 | 5 | 1 | 1 |
| MSD.SERVE | Serving and latency | 9 | 5 | 1 | 2 | 0 | 1 |
| MSD.MON | Monitoring and drift | 10 | 6 | 1 | 2 | 0 | 1 |
| MSD.REC | Recommender systems | 10 | 6 | 1 | 2 | 0 | 1 |
| MSD.CLF | Classification: spam and abuse | 10 | 5 | 1 | 2 | 1 | 1 |
| MSD.FRAUD | Real-time fraud detection | 10 | 5 | 1 | 2 | 1 | 1 |
| MSD.DIST | Distributed training | 10 | 2 | 1 | 6 | 0 | 1 |
| MSD.RAG | Retrieval-augmented generation | 10 | 4 | 1 | 3 | 1 | 1 |
| MSD.LLMOPS | LLM serving, cost and guardrails | 10 | 4 | 1 | 4 | 0 | 1 |
| MSD.CASES | ML system design case studies | 11 | 4 | 1 | 4 | 2 | 0 |

## Verification coverage

- Recomputed by code (numeric items; the stored answer IS the script value and the solution is asserted to contain it): **106** (22%)
- Conceptual items with an explicit independent second derivation (the `Check:` sentence in the solution): **47** (10%)
- Conceptual items cross-checked at definition level only (stated in `Verified by`): **334** (69%)

## Regenerate

```
pipeline/.venv/bin/python -m pipeline.sysdesign.taxdef          # SD and MSD taxonomy subjects (idempotent)
pipeline/.venv/bin/python -m pipeline.sysdesign.build           # imports all content modules (asserts), writes both bank_src files
pipeline/.venv/bin/python -m pipeline.sysdesign.problems_src    # writes problems.json
pipeline/.venv/bin/python -m pipeline.sysdesign.readme_gen      # this README and coverage.json
pipeline/.venv/bin/python -m pipeline.validate pipeline/bank_src/sysdesign.json pipeline/bank_src/ml_sysdesign.json
```

## Coverage: notes section -> chapters, questions, problems

Question ids per section are in `coverage.json`. Tags: `hb:` handbook section (F fundamentals, T trade-offs, P patterns, Q common questions), `ml1`..`ml6` single-case PDFs, `cs1`..`cs10` combined case studies.

| Source section | Chapters | Questions | Design problems |
|---|---|---|---|
| cs1 Search ranking | MSD.CASES, MSD.REC | 3 | msd_search_ranking |
| cs1,cs7,cs8 fail modes | MSD.CASES | 1 | msd_spam_abuse, msd_search_ranking, msd_content_moderation |
| cs10 Anomaly detection | MSD.MON | 2 |  |
| cs2 Feed ranking | MSD.EVAL, MSD.FRAME, MSD.MODEL, MSD.MON, MSD.REC | 8 |  |
| cs3 Ads CTR | MSD.CASES, MSD.FEAT | 4 |  |
| cs4 ETA | MSD.CASES | 2 |  |
| cs5 Duplicate detection | MSD.CASES, MSD.EVAL | 3 |  |
| cs6 Demand forecasting | MSD.CASES, MSD.REC | 2 |  |
| cs7 Moderation | MSD.CLF, MSD.EVAL | 8 | msd_spam_abuse, msd_content_moderation |
| cs8 Visual defect | MSD.CASES, MSD.MODEL | 2 |  |
| cs9 LLM serving | MSD.LLMOPS | 9 |  |
| hb:F1 Scalability | SD.SCAL | 10 |  |
| hb:F10 Database Indexes | SD.IDX | 10 |  |
| hb:F11 Caching | SD.CACHE | 10 |  |
| hb:F12 Consistent Hashing | SD.CHASH | 9 |  |
| hb:F13 Database Sharding | SD.SHARD | 9 |  |
| hb:F14 Consensus Algorithms | SD.CONS | 8 |  |
| hb:F15 Proxy Servers | SD.PROXY | 8 |  |
| hb:F16 Heartbeats | SD.HB | 8 |  |
| hb:F17 Checksums | SD.CKSUM | 8 |  |
| hb:F18 Service Discovery | SD.SVCDISC | 8 |  |
| hb:F19 Bloom Filters | SD.BLOOM | 9 |  |
| hb:F2 Availability | SD.AVAIL | 10 |  |
| hb:F20 Gossip Protocol | SD.GOSSIP | 8 |  |
| hb:F3 Latency vs Throughput | SD.LATTP | 10 |  |
| hb:F4 CAP Theorem | SD.CAP | 10 |  |
| hb:F5 Load Balancers | SD.LB | 10 |  |
| hb:F6 Databases | SD.DB | 10 |  |
| hb:F7 CDN | SD.CDN | 9 |  |
| hb:F8 Message Queues | SD.MQ | 9 |  |
| hb:F9 Rate Limiting | SD.RATE | 10 |  |
| hb:P1 Client-Server | SD.PAT_CS | 8 |  |
| hb:P2 Microservices | SD.PAT_MICRO | 8 |  |
| hb:P3 Serverless | SD.PAT_SERVERLESS | 8 |  |
| hb:P4 Event-Driven | SD.PAT_EVENT | 8 |  |
| hb:P5 Peer-to-Peer | SD.PAT_P2P | 8 |  |
| hb:Q1 URL shortener | SD.CASES | 5 | sd_url_shortener |
| hb:Q10 Logging and monitoring | SD.CASES | 2 | sd_logging_monitoring |
| hb:Q2 Chat | SD.CASES | 2 | sd_chat |
| hb:Q3 Social feed | SD.CASES | 2 | sd_news_feed |
| hb:Q4 Video streaming | SD.CASES | 2 | sd_video_streaming |
| hb:Q5 E-commerce | SD.CASES | 1 | sd_ecommerce |
| hb:Q6 Ride sharing | SD.CASES | 1 | sd_ride_sharing |
| hb:Q7 File storage | SD.CASES | 1 | sd_file_storage |
| hb:Q8 Web crawler | SD.CASES | 2 | sd_web_crawler |
| hb:Q9 Notification system | SD.CASES | 1 | sd_notification |
| hb:T1 Vertical vs Horizontal Scaling | SD.TO_SCALE | 8 |  |
| hb:T10 Normalization vs Denormalization | SD.TO_NORM | 8 |  |
| hb:T11 TCP vs UDP | SD.TO_NET | 8 |  |
| hb:T2 Strong vs Eventual Consistency | SD.TO_CONS | 8 |  |
| hb:T3 Stateful vs Stateless Design | SD.TO_STATE | 8 |  |
| hb:T4 Read-through vs Write-through Cache | SD.TO_WRITE | 8 |  |
| hb:T5 SQL vs NoSQL | SD.TO_SQL | 8 |  |
| hb:T6 REST vs RPC | SD.TO_API | 8 |  |
| hb:T7 Synchronous vs Asynchronous | SD.TO_ASYNC | 8 |  |
| hb:T8 Batch vs Stream Processing | SD.TO_BATCH | 8 |  |
| hb:T9 Long Polling vs WebSockets | SD.TO_PUSH | 8 |  |
| hb:Template + Tips | SD.TEMPLATE | 10 |  |
| hb:Template step 2 (capacity estimation) | SD.ESTIM | 10 |  |
| ml1 PSI example; cs3/cs6/cs10 drift | MSD.MON | 1 | msd_spam_abuse |
| ml1 PSI; cs7 precision/recall; cs5 recall@k | MSD.EVAL | 2 | msd_spam_abuse |
| ml1 Spam classifier | MSD.CLF, MSD.DATA, MSD.FEAT, MSD.FRAME, MSD.MON, MSD.SERVE | 24 | msd_spam_abuse |
| ml2 Video recs | MSD.DATA, MSD.FEAT, MSD.MODEL, MSD.REC, MSD.SERVE | 19 | msd_video_recs |
| ml2/ml3/ml4 imbalance; general data | MSD.DATA | 1 |  |
| ml3 Fraud | MSD.DATA, MSD.FEAT, MSD.FRAME, MSD.FRAUD, MSD.MODEL, MSD.SERVE | 18 | msd_fraud |
| ml3 feature store; ml2/ml4 item embeddings | MSD.FEAT | 1 | msd_fraud |
| ml4 Amazon recs | MSD.FEAT, MSD.REC | 4 | msd_product_recs |
| ml5 Distributed training | MSD.DIST | 10 | msd_distributed_training |
| ml6 RAG | MSD.LLMOPS, MSD.RAG | 11 | msd_enterprise_rag |
| ml:general framing + ml1-ml6 section 2 | MSD.FRAME | 2 |  |

Problem sources: `sd_url_shortener` <- hb:Q1; `sd_chat` <- hb:Q2; `sd_news_feed` <- hb:Q3; `sd_video_streaming` <- hb:Q4; `sd_ecommerce` <- hb:Q5; `sd_ride_sharing` <- hb:Q6; `sd_file_storage` <- hb:Q7; `sd_web_crawler` <- hb:Q8; `sd_notification` <- hb:Q9; `sd_logging_monitoring` <- hb:Q10; `msd_spam_abuse` <- ml1 + cs7; `msd_video_recs` <- ml2; `msd_fraud` <- ml3; `msd_product_recs` <- ml4; `msd_distributed_training` <- ml5; `msd_enterprise_rag` <- ml6; `msd_search_ranking` <- cs1; `msd_content_moderation` <- cs7

## Not included on purpose

- No figures, diagrams or page images (items are text only); the PDFs are not in the repo.
- Vendor-specific prices and numbers that change over time are used only where the owner's notes state them as stated assumptions in the question.
- Claims in the notes that looked wrong or outdated (see below) are not published as verified answers.
- Questions are not yet wired into `publish`; the orchestrator publishes the bank.

## Notes to double-check (owner)

- Handbook tips 24 and 25 ("write-through for write-heavy", "read-through for read-heavy"): write-through adds a synchronous backing-store write to every write, so it is not a write-latency optimisation; write-back or batching is. Not published as a verified answer (questions state the trade-off instead).
- Handbook "Long Polling vs WebSockets": the long-polling paragraph describes plain short polling (client asks at regular intervals). Questions use the standard definition (server holds the request open).
- Handbook availability-tier table is an image and was not extracted; downtime figures in questions are recomputed (365-day year).
- Handbook "10 common questions" differ from the task list (no rate limiter, autocomplete or distributed cache page); `problems.json` follows the handbook's ten.
- Case study 5 (distributed training) says ZeRO stage 2 gives a 2x memory reduction; the ZeRO paper reports up to 8x for stage 2 (stage 1 up to 4x). No question relies on the 2x claim; questions ask concrete per-GPU memory instead.
- Case study 5: 60% MFU at 10,000 GPUs with FP8 is a stated design target, optimistic against published large-run MFUs; 1.979e15 FLOP/s is the dense FP8 peak. Questions say "assume".
- Case study 5: "up to 40% wasted FLOPs from padding" depends on the length distribution; not used.
- Case study 9: the speculative-decoding speedup formula is garbled in the PDF text; questions use the standard expected tokens per step (1 - a^(k+1))/(1 - a).
- Case study 3: eCPM = P(click) x P(conversion|click) x bid x 1000 is right for cost-per-action bids; for cost-per-click bids eCPM = P(click) x bid x 1000, which is what the question uses.
- Case studies 1, 3, 6: "8-bit product quantization = 75% memory reduction" is scalar int8 quantisation (4 bytes to 1); PQ is a different technique. The questions use the int8 arithmetic only. HNSW "O(log N d)" is an empirical statement, not a worst-case bound.
- Case study 1 (spam): the uncertain band is 0.40-0.60 in the fallback text but the PSI example labels 0.4-0.7 as "Uncertain"; harmless but inconsistent.
- Case study 3 of the single PDFs (fraud): fail-open (approve and flag when no hard rule fires) vs the ads case (fail-closed bidding) are policy choices tied to risk, which the questions present as such.
- PSI bands 0.10 and 0.25 are industry rules of thumb, not statistical thresholds.
- Case study 2 (feed ranking): its budget cap was not read; only the cost total (11,100) was checked arithmetically.
