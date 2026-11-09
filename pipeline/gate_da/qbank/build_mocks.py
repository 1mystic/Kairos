"""Build the three GATE DA mini mock papers from Mock Sets A/B/C (days 30-32) + General Aptitude (day 29).

  python -m pipeline.gate_da.qbank.build_mocks

The app fills mini papers by blueprint section order, taking per subject the questions whose TYPE matches the section
(`buildExamModel` in app/src/cbt/model.ts), so marks are implied by position: a section takes the first `count` questions of
its type, whatever their marks. To keep every question in a section with its true marks:
  * 1-mark SCQ/MSQ/NAT fill T1M-MCQ/T1M-MSQ/T1M-NAT exactly (12/6/7) before any 2-mark question of the same type follows;
  * GA1 (5 x 1 mark) is filled exactly before GA2.
Mock Sets have too few 1-mark MCQ/MSQ and too many 1-mark NAT for that, so: surplus 1-mark NAT are left out (they stay in
practice) and the missing 1-mark MCQ/MSQ are topped up with 1-mark questions from workbook Days 1-28. All questions are
different across the three papers (GA included). This script asserts the resulting section assignment.
"""
from __future__ import annotations

import json
import random
from collections import Counter

from ...paths import ROOT

SRC = ROOT / "content" / "sources" / "gate_da" / "qbank" / "GATE_DA_2027_QBank.jsonl"
BANK = ROOT / "pipeline" / "bank_src" / "gate_da_qbank.json"
IDMAP = ROOT / "pipeline" / "gate_da" / "qbank" / "id_map.json"
BLUEPRINT = ROOT / "content" / "blueprints" / "gate_da_2027.json"
OUT = ROOT / "pipeline" / "fixtures" / "papers"
ORDER = ["GA", "PRS", "LA", "CO", "PDS", "DBW", "ML", "AI"]
TARGET = {"PRS": 8, "LA": 6, "CO": 3, "PDS": 7, "DBW": 5, "ML": 7, "AI": 4}  # Mock Set weighting (per 40)
MOCKS = {"a": (30, "A"), "b": (31, "B"), "c": (32, "C")}
GA_2M = {"a": 3, "b": 3, "c": 2}  # Day 29 has only 8 two-mark MCQ


def load():
    recs = {}
    for l in SRC.read_text(encoding="utf-8").splitlines():
        r = json.loads(l)
        recs[r["id"]] = r
    bank = {q["id"]: q for q in json.loads(BANK.read_text(encoding="utf-8"))}
    idmap = json.loads(IDMAP.read_text(encoding="utf-8"))
    return recs, bank, idmap


def simulate(blueprint, slots, bank):
    """Python port of the mini branch of buildExamModel (+ subject_map resolution)."""
    sm = blueprint.get("subject_map", {})
    used, assign = set(), {}
    for subj in blueprint["subjects"]:
        allowed = sm.get(subj["code"]) or [subj["code"]]
        mine = [q for q in slots if bank[q]["tax"]["subject"] in allowed]
        for sec in subj["sections"]:
            take = [q for q in mine if q not in used and bank[q]["type"] == sec["type"]][: sec["count"]]
            for q in take:
                used.add(q)
                assign[q] = sec
    return assign


def main() -> int:
    recs, bank, idmap = load()
    blueprint = json.loads(BLUEPRINT.read_text(encoding="utf-8"))
    rnd = random.Random(2027)
    day = lambda r: r["day"]
    # every question that is part of a Mock Set (incl. the earlier twin of a duplicate) is reserved: fillers must not reuse it
    used_q: set[str] = {idmap[r["id"]] for r in recs.values() if r["day"] in (30, 31, 32) and r["id"] in idmap}

    def qid_of(src):
        return idmap[src]

    # ---- GA from Day 29 (SCQ only: the blueprint's GA sections are SCQ)
    ga = [r for r in recs.values() if r["day"] == 29 and r["type"] == "MCQ"]
    ga1 = [r for r in ga if r["marks"] == 1]
    ga2 = [r for r in ga if r["marks"] == 2]
    secs = lambda r: bank[qid_of(r["id"])]["tax"]["chapter"]
    rnd.shuffle(ga1)
    rnd.shuffle(ga2)

    def spread(pool, n, taken):
        """pick n from pool, preferring chapters not yet used in `taken`"""
        out = []
        for r in sorted(pool, key=lambda r: (Counter(secs(x) for x in taken + out)[secs(r)], rnd.random())):
            if len(out) < n:
                out.append(r)
        return out

    ga_pick = {}
    rem1, rem2 = list(ga1), list(ga2)
    for k in "abc":
        p1 = spread(rem1, 5, [])
        rem1 = [r for r in rem1 if r not in p1]
        p2 = spread(rem2, GA_2M[k], [])
        rem2 = [r for r in rem2 if r not in p2]
        ga_pick[k] = (p1, p2)
        used_q.update(qid_of(r["id"]) for r in p1 + p2)
    all_slots: list[str] = []

    # ---- technical
    ordered = lambda rs: sorted(rs, key=lambda r: (ORDER.index(bank[qid_of(r["id"])]["tax"]["subject"]), r["id"]))
    day_pool = [r for r in recs.values() if r["day"] < 29 and r["marks"] == 1 and r["type"] in ("MCQ", "MSQ")
                and (q := bank.get(qid_of(r["id"]) if r["id"] in idmap else "")) is not None and len(q["stem"]) < 600
                and not q["images"] and "| --- |" not in q["stem"] and q["status"] == "verified"
                and r["id"] in idmap and r["id"] == [k for k, v in idmap.items() if v == idmap[r["id"]]][0]]
    rnd.shuffle(day_pool)
    result = {}
    for k, (d, letter) in MOCKS.items():
        mock = [r for r in recs.values() if r["day"] == d and r["id"] in idmap]
        # dropped duplicates alias to an earlier question; keep each qid once across the three papers
        by = lambda m, t: [r for r in mock if r["marks"] == m and r["type"] == t]
        cnt = Counter(bank[qid_of(r["id"])]["tax"]["subject"] for r in mock)
        scq1, msq1, nat1 = by(1, "MCQ"), by(1, "MSQ"), by(1, "NAT")
        two = {t: by(2, t) for t in ("MCQ", "MSQ", "NAT")}
        fixed = scq1 + msq1 + sum(two.values(), [])
        cur = Counter(bank[qid_of(r["id"])]["tax"]["subject"] for r in fixed)

        def deficit(sub, cur):
            return TARGET[sub] / 40 * 40 - cur[sub]

        # 7 of the 1-mark NAT, greedy by subject deficit
        picked_nat = []
        pool = list(nat1)
        while len(picked_nat) < 7:
            pool.sort(key=lambda r: (-deficit(bank[qid_of(r["id"])]["tax"]["subject"], cur), r["id"]))
            r = pool.pop(0)
            picked_nat.append(r)
            cur[bank[qid_of(r["id"])]["tax"]["subject"]] += 1
        fill = {"MCQ": [], "MSQ": []}
        need = {"MCQ": 12 - len(scq1), "MSQ": 6 - len(msq1)}
        for t in ("MCQ", "MSQ"):
            while len(fill[t]) < need[t]:
                cands = [r for r in day_pool if r["type"] == t and qid_of(r["id"]) not in used_q]
                cands.sort(key=lambda r: (-deficit(bank[qid_of(r["id"])]["tax"]["subject"], cur), r["difficulty"], r["id"]))
                r = cands[0]
                day_pool.remove(r)
                used_q.add(qid_of(r["id"]))
                fill[t].append(r)
                cur[bank[qid_of(r["id"])]["tax"]["subject"]] += 1
        for r in scq1 + msq1 + picked_nat + sum(two.values(), []):
            used_q.add(qid_of(r["id"]))
        p1, p2 = ga_pick[k]
        slots_src = (ordered(p1) + ordered(p2)
                     + ordered(scq1 + fill["MCQ"]) + ordered(msq1 + fill["MSQ"]) + ordered(picked_nat)
                     + ordered(two["MCQ"]) + ordered(two["MSQ"]) + ordered(two["NAT"]))
        slots = [qid_of(r["id"]) for r in slots_src]
        assert len(set(slots)) == len(slots)
        assert not set(slots) & set(all_slots), "question reused across mocks"
        all_slots += slots
        assert all(bank[q]["status"] == "verified" for q in slots)
        # section/marks assertion
        assign = simulate(blueprint, slots, bank)
        assert set(assign) == set(slots), f"{k}: questions dropped by the mini builder"
        for r in slots_src:
            sec = assign[qid_of(r["id"])]
            assert sec["marks"]["correct"] == r["marks"], (k, r["id"], sec["id"], r["marks"])
        result[k] = (slots, slots_src, fill, picked_nat, nat1)
        paper = {
            "paperId": f"gate_da_mock_{k}", "blueprint": "gate_da_2027", "mini": True,
            "title": f"GATE DA 2027 · Full Mock {letter}", "slots": slots,
        }
        (OUT / f"gate_da_mock_{k}.json").write_text(json.dumps(paper, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
        sub = Counter(bank[q]["tax"]["subject"] for q in slots)
        print(f"Mock {letter}: {len(slots)} questions; GA {len(p1)}x1m + {len(p2)}x2m;"
              f" technical {len(slots) - len(p1) - len(p2)}; subjects {dict(sorted(sub.items()))}")
        print("   from Mock Set:", len(mock) - len(nat1) + len(picked_nat), "| 1m NAT left out:", len(nat1) - 7,
              "| day fillers MCQ", [r["id"] for r in fill["MCQ"]], "MSQ", [r["id"] for r in fill["MSQ"]])
        print("   GA 1m", [r["id"] for r in p1], "2m", [r["id"] for r in p2])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
