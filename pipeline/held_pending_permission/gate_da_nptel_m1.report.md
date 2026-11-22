# NPTEL GATE DA Mock Test 1: held extraction report

Source: `Gate_DA_Nptel_mocks.pdf` pages 1-14 (Mock Test 1, 65 questions, answer key on page 14). Held outside `pipeline/bank_src/`; release by moving the accepted file (see docs/13_GATE_DA.md).

- Accepted into `gate_da_nptel_m1.json`: **47** (32 verified by code recomputation, 15 conceptual with status `needs_review`).
- In `gate_da_nptel_m1.needs_review.json`: **18** (6 quarantined for missing context/figures, 12 key mismatches).

Marks are not printed in the PDF; inferred from the GATE DA layout (GA Q21-25 one mark, Q26-30 two; of the 55 technical questions the first 25 one mark, the last 30 two) and stored in `pipeline/gate_da/nptel/marks_m1.json`.

## Accepted by type and chapter

By type: MSQ 6, NVQ 12, SCQ 29

By chapter: CO.LIM 2, CO.OPT 1, CO.TAY 1, DBW.ER 1, DBW.NF 2, DBW.REL 5, GA.QUANT 4, GA.VERB 3, LA.EIG 2, LA.MAT 3, LA.PROJ 1, LA.SYS 1, LA.VS 1, ML.CLS 2, ML.REG 1, PDS.ALG 2, PDS.DS 3, PDS.GRAPH 2, PDS.PY 1, PRS.CNT 1, PRS.CRV 1, PRS.DRV 1, PRS.INF 1, PRS.MOM 2, PRS.PROB 3

## Quarantined (missing or broken context)

- Q13 (DBW.REL, PDF key 5): relational algebra expression is truncated at the page edge: the operator between the two projections is not shown. If it is set difference the answer is 5 (matches the key); union would give 6, intersection 0.
- Q19 (DBW.REL, PDF key C): the divisor of the division is cut off at the page edge, so the query cannot be evaluated. If the divisor were all departments {R&D, Marketing, Finance, HR} the result would be empty (nobody works in every department), which is not an option; the key (Alice) only fits a divisor such as {R&D, Marketing}.
- Q23 (GA.SPAT, PDF key B): depends on a figure that is not in the PDF text. A text-only reading (vertices of PQRS in order, L on QR, S on MN) gives area 4, which matches the key B, but the figure itself is not reproduced.
- Q24 (GA.ANAL, PDF key C): depends on the river-system diagram (which segments border which zones), which is not in the PDF text.
- Q30 (GA.SPAT, PDF key B): depends on a grid figure showing which squares are already filled and where diagonal AB lies; the figure is not in the PDF text.
- Q50 (PRS.MOM, PDF key 0.6): the joint PMF table is not present in the PDF, so the question cannot be answered or checked.

## Key mismatches (PDF key vs independent recomputation)

- Q1 (PDS.PY): PDF key **26**, recomputed **20**.
- Q3 (PDS.PY): PDF key **5**, recomputed **1**.
- Q31 (CO.LIM): PDF key **0.5**, recomputed **0**.
- Q33 (CO.LIM): PDF key **C,D**, recomputed **B,D**.
- Q36 (CO.LIM): PDF key **A,D**, recomputed **B,C**.
- Q38 (CO.TAY): PDF key **1.25**, recomputed **0.25**.
- Q39 (CO.OPT): PDF key **A**, recomputed **A,D**.
- Q40 (CO.LIM): PDF key **B,E**, recomputed **B,D,E**.
- Q55 (LA.MAT): PDF key **A,C,D**, recomputed **A,D**.
- Q56 (LA.VS): PDF key **A**, recomputed **C**.
- Q62 (ML.DR): PDF key **D**, recomputed **B**.
- Q65 (ML.CLS): PDF key **A**, recomputed **B**.

## Chapter mapping (all 65)

- CO.LIM: Q31, Q33, Q34, Q36, Q37, Q40
- CO.OPT: Q32, Q39
- CO.TAY: Q35, Q38
- DBW.ER: Q14
- DBW.NF: Q15, Q16
- DBW.REL: Q11, Q12, Q13, Q17, Q18, Q19, Q20
- GA.ANAL: Q24
- GA.QUANT: Q22, Q25, Q27, Q28
- GA.SPAT: Q23, Q30
- GA.VERB: Q21, Q26, Q29
- LA.EIG: Q59, Q60
- LA.MAT: Q52, Q54, Q55, Q57
- LA.PROJ: Q53
- LA.SYS: Q51
- LA.VS: Q56, Q58
- ML.CLS: Q61, Q63, Q65
- ML.DR: Q62
- ML.REG: Q64
- PDS.ALG: Q5, Q10
- PDS.DS: Q4, Q6, Q9
- PDS.GRAPH: Q7, Q8
- PDS.PY: Q1, Q2, Q3
- PRS.CNT: Q41
- PRS.CRV: Q45
- PRS.DRV: Q44
- PRS.INF: Q46
- PRS.MOM: Q47, Q49, Q50
- PRS.PROB: Q42, Q43, Q48

## Pages not read confidently

None. All 14 pages were rendered and read. Q13 and Q19 are cut off at the right page edge in the PDF itself (quarantined).
