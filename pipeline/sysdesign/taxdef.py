"""Taxonomy definition for subjects SD (System Design) and MSD (AI/ML System Design).

Topic outline derives from owner-supplied study materials (see content/sources/sysdesign/ATTRIBUTION.md).
``python -m pipeline.sysdesign.taxdef`` adds/refreshes ONLY these two subjects in content/taxonomy/taxonomy.json
(atomic read-modify-write, other subjects untouched).
"""
from __future__ import annotations

import json
import os
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TAX = ROOT / "content" / "taxonomy" / "taxonomy.json"

# (chapter code, name, [(topic code, topic name), ...])
SD = [
    ("SCAL", "Scalability", [("DEF", "Scalability dimensions"), ("BOT", "Finding bottlenecks")]),
    ("AVAIL", "Availability and reliability", [("NINES", "Availability nines"), ("REDUN", "Redundancy and failover")]),
    ("LATTP", "Latency vs throughput", [("LAT", "Latency percentiles"), ("LITTLE", "Little's law and queueing")]),
    ("CAP", "CAP theorem and PACELC", [("CAP", "Consistency, availability, partition tolerance"), ("PACELC", "Latency trade-off without partitions")]),
    ("LB", "Load balancers", [("ALGO", "Balancing algorithms"), ("L4L7", "Layer 4 vs layer 7"), ("HEALTH", "Health checks")]),
    ("DB", "Databases and replication", [("REPL", "Replication"), ("TXN", "Transactions and isolation")]),
    ("CDN", "Content delivery networks", [("PUSH", "Push vs pull CDN"), ("INV", "Cache invalidation and TTL")]),
    ("MQ", "Message queues and streams", [("DELIV", "Delivery guarantees"), ("ORDER", "Ordering and partitions")]),
    ("RATE", "Rate limiting", [("ALGO", "Token bucket and window algorithms"), ("DIST", "Distributed rate limiting")]),
    ("IDX", "Database indexes", [("BTREE", "B-tree and LSM indexes"), ("COST", "Index cost and selectivity")]),
    ("CACHE", "Caching", [("POLICY", "Eviction policies"), ("PATT", "Cache-aside and stampede"), ("HIT", "Hit ratio and latency")]),
    ("CHASH", "Consistent hashing", [("RING", "Hash ring"), ("VNODE", "Virtual nodes")]),
    ("SHARD", "Database sharding", [("KEY", "Shard keys"), ("HOT", "Hot spots and resharding")]),
    ("CONS", "Consensus and quorums", [("QUORUM", "Quorum arithmetic"), ("RAFT", "Leader election and log replication")]),
    ("PROXY", "Proxy servers", [("FWD", "Forward vs reverse proxy"), ("USE", "Typical proxy roles")]),
    ("HB", "Heartbeats and failure detection", [("FD", "Failure detectors"), ("TIMEOUT", "Timeouts and false positives")]),
    ("CKSUM", "Checksums and data integrity", [("CRC", "Checksums and hashes"), ("REPAIR", "Corruption detection and repair")]),
    ("SVCDISC", "Service discovery", [("REG", "Registries"), ("CLIENT", "Client-side vs server-side discovery")]),
    ("BLOOM", "Bloom filters", [("FPR", "False-positive rate"), ("USE", "Applications and limits")]),
    ("GOSSIP", "Gossip protocols", [("SPREAD", "Epidemic dissemination"), ("MEMB", "Membership and failure detection")]),
    ("TO_SCALE", "Trade-off: vertical vs horizontal scaling", [("VH", "Scale up vs scale out")]),
    ("TO_CONS", "Trade-off: strong vs eventual consistency", [("MODELS", "Consistency models")]),
    ("TO_STATE", "Trade-off: stateful vs stateless", [("SESS", "Sessions and state placement")]),
    ("TO_WRITE", "Trade-off: write-through vs write-back caching", [("POL", "Write policies")]),
    ("TO_SQL", "Trade-off: SQL vs NoSQL", [("CHOICE", "Choosing a data store")]),
    ("TO_API", "Trade-off: REST vs RPC", [("STYLE", "API styles")]),
    ("TO_ASYNC", "Trade-off: synchronous vs asynchronous", [("COMM", "Communication styles")]),
    ("TO_BATCH", "Trade-off: batch vs stream processing", [("PROC", "Processing models")]),
    ("TO_PUSH", "Trade-off: polling, long polling, WebSockets", [("RT", "Real-time delivery")]),
    ("TO_NORM", "Trade-off: normalisation vs denormalisation", [("MODEL", "Data modelling")]),
    ("TO_NET", "Trade-off: TCP vs UDP", [("TRANS", "Transport protocols")]),
    ("PAT_CS", "Pattern: client-server", [("TIER", "Tiers and layering")]),
    ("PAT_MICRO", "Pattern: microservices", [("BOUND", "Service boundaries"), ("RES", "Resilience patterns")]),
    ("PAT_SERVERLESS", "Pattern: serverless", [("FAAS", "Functions as a service")]),
    ("PAT_EVENT", "Pattern: event-driven architecture", [("ES", "Event sourcing and CQRS")]),
    ("PAT_P2P", "Pattern: peer-to-peer", [("DHT", "Decentralised lookup")]),
    ("TEMPLATE", "Interview framework", [("REQ", "Requirements and scope"), ("API", "API and data model"), ("DEEP", "Deep dives and bottlenecks")]),
    ("ESTIM", "Back-of-the-envelope estimation", [("QPS", "Traffic estimates"), ("STORE", "Storage and bandwidth")]),
    ("CASES", "Classic design problems", [("URL", "URL shortener"), ("FEED", "News feed and chat"), ("MEDIA", "Video streaming and crawling"), ("INFRA", "Notifications, ride sharing, autocomplete, cache")]),
]
MSD = [
    ("FRAME", "Problem framing and metrics", [("OBJ", "Objectives and proxies"), ("METRIC", "Business vs model metrics")]),
    ("DATA", "Data and labels", [("LABEL", "Label sources and noise"), ("SPLIT", "Splits and leakage"), ("IMB", "Class imbalance")]),
    ("FEAT", "Features and feature stores", [("OFFON", "Offline/online consistency"), ("ENC", "Encodings and embeddings")]),
    ("MODEL", "Model selection and training", [("SEL", "Model choice"), ("OPT", "Optimisation and scaling rules")]),
    ("EVAL", "Offline and online evaluation", [("OFF", "Offline metrics"), ("AB", "A/B testing")]),
    ("SERVE", "Serving and latency", [("BATCH", "Batch vs online inference"), ("LAT", "Latency budgets")]),
    ("MON", "Monitoring and drift", [("DRIFT", "Data and concept drift"), ("LOOP", "Feedback loops")]),
    ("REC", "Recommender systems", [("RETR", "Retrieval and ranking"), ("COLD", "Cold start and exploration")]),
    ("CLF", "Classification: spam and abuse", [("SPAM", "Spam detection"), ("ADV", "Adversaries and thresholds")]),
    ("FRAUD", "Real-time fraud detection", [("RT", "Streaming features"), ("COST", "Cost-sensitive decisions")]),
    ("DIST", "Distributed training", [("PAR", "Data, model and pipeline parallelism"), ("COMM", "Communication and memory")]),
    ("RAG", "Retrieval-augmented generation", [("RETR", "Chunking and retrieval"), ("EVAL", "RAG evaluation")]),
    ("LLMOPS", "LLM serving, cost and guardrails", [("COST", "Token cost and latency"), ("SAFE", "Guardrails and safety")]),
    ("CASES", "ML system design case studies", [("RANK", "Ranking and ads"), ("PLAT", "End-to-end platforms")]),
]


def _subject(sid: str, name: str, rows, flag: str) -> dict:
    chapters = []
    for code, cname, topics in rows:
        cid = f"{sid}.{code}"
        chapters.append({
            "id": cid, "name": cname, "class": 12,
            "exams": {"JEE_MAIN": False, "NEET_UG": False, "IAT": False, "GATE_DA": False, "DSA_INTERVIEW": False,
                      "SYS_DESIGN": flag == "SYS_DESIGN", "ML_SYS_DESIGN": flag == "ML_SYS_DESIGN"},
            "topics": [{"id": f"{cid}.{tc}", "name": tn} for tc, tn in topics],
        })
    return {"id": sid, "name": name, "chapters": chapters}


def apply() -> None:
    data = json.loads(TAX.read_text(encoding="utf-8"))  # re-read immediately before writing
    new = {"SD": _subject("SD", "System Design", SD, "SYS_DESIGN"),
           "MSD": _subject("MSD", "AI/ML System Design", MSD, "ML_SYS_DESIGN")}
    subs = [s for s in data["subjects"] if s["id"] not in new]
    subs += list(new.values())
    data["subjects"] = subs
    fd, tmp = tempfile.mkstemp(dir=TAX.parent, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as f:
        f.write(json.dumps(data, indent=1, ensure_ascii=False) + "\n")
    os.replace(tmp, TAX)
    print("subjects:", [s["id"] for s in subs])


if __name__ == "__main__":
    sys.exit(apply() or 0)
