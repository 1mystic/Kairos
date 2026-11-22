# NPTEL GATE DA Mock Test 3: held extraction report

Source: `Gate_DA_Nptel_mocks.pdf` pages 25-36 (Mock Test 3, 65 questions, answer key on page 36). Held outside `pipeline/bank_src/`; release by moving the accepted file (see docs/13_GATE_DA.md).

- Accepted into `gate_da_nptel_m3.json`: **48** (34 verified by code recomputation, 14 conceptual with status `needs_review`).
- In `gate_da_nptel_m3.needs_review.json`: **17** (10 quarantined for missing context/figures, 7 key mismatches).

Marks are not printed in the PDF; inferred from the GATE DA layout (GA Q21-25 one mark, Q26-30 two; of the 55 technical questions the first 25 one mark, the last 30 two) and stored in `pipeline/gate_da/nptel/marks_m3.json`.

## Accepted by type and chapter

By type: MSQ 7, NVQ 14, SCQ 27

By chapter: CO.LIM 5, CO.OPT 2, CO.TAY 1, DBW.NF 2, DBW.REL 1, GA.ANAL 1, GA.QUANT 2, GA.VERB 3, LA.DEC 2, LA.EIG 1, LA.MAT 2, LA.SYS 1, LA.VS 2, ML.CLS 1, ML.DR 3, ML.REG 1, PDS.ALG 3, PDS.DS 3, PDS.GRAPH 1, PDS.PY 3, PRS.CLT 1, PRS.CNT 1, PRS.DESC 1, PRS.DRV 1, PRS.MOM 2, PRS.PROB 2

## Quarantined (missing or broken context)

- Q12 (DBW.REL, PDF key C): table contents not shown in the PDF
- Q13 (DBW.REL, PDF key 6): tables and query not shown in the PDF
- Q14 (DBW.REL, PDF key 0): table contents/constraints not shown in the PDF
- Q16 (DBW.REL, PDF key B): the log table (records 1-6) is not shown in the PDF
- Q17 (DBW.REL, PDF key D): the SQL scripts T1-T3 are not shown in the PDF
- Q19 (DBW.REL, PDF key C): the SQL query and schema are not shown in the PDF; the answer depends on the exact query
- Q22 (GA.SPAT, PDF key A): figure-dependent: net and cube options are drawings absent from the PDF text (options read 'Option A..D')
- Q24 (GA.ANAL, PDF key A): the data table of iterations is not shown in the PDF
- Q27 (GA.QUANT, PDF key A): figure-dependent: positions of S, T relative to PQ, PR are only in the diagram (key 1/3 holds if P,S,Q and P,T,R are collinear, but this is not stated)
- Q34 (CO.LIM, PDF key 0): underdetermined: k-2l+m = -m, m not fixed; PDF key 0 not derivable

## Key mismatches (PDF key vs independent recomputation)

- Q18 (DBW.NF): PDF key **B**, recomputed **B,D**.
- Q29 (GA.SPAT): PDF key **D**, recomputed **A (literal) / D (alternative reading)**.
- Q31 (CO.LIM): PDF key **D**, recomputed **B,D**.
- Q45 (PRS.DRV): PDF key **D**, recomputed **C,D**.
- Q47 (PRS.INF): PDF key **B**, recomputed **A**.
- Q53 (LA.VS): PDF key **A**, recomputed **A,D**.
- Q54 (LA.EIG): PDF key **2000**, recomputed **-1818000**.

## Chapter mapping (all 65)

- CO.LIM: Q31, Q32, Q34, Q35, Q38, Q39, Q40
- CO.OPT: Q33, Q37
- CO.TAY: Q36
- DBW.NF: Q15, Q18, Q20
- DBW.REL: Q11, Q12, Q13, Q14, Q16, Q17, Q19
- GA.ANAL: Q23, Q24
- GA.QUANT: Q26, Q27, Q28
- GA.SPAT: Q22, Q29
- GA.VERB: Q21, Q25, Q30
- LA.DEC: Q55, Q59
- LA.EIG: Q52, Q54
- LA.MAT: Q57, Q58
- LA.SYS: Q60
- LA.VS: Q51, Q53, Q56
- ML.CLS: Q61
- ML.DR: Q62, Q63, Q64
- ML.REG: Q65
- PDS.ALG: Q2, Q4, Q10
- PDS.DS: Q3, Q7, Q9
- PDS.GRAPH: Q1
- PDS.PY: Q5, Q6, Q8
- PRS.CLT: Q46
- PRS.CNT: Q41
- PRS.DESC: Q49
- PRS.DRV: Q44, Q45
- PRS.INF: Q47
- PRS.MOM: Q48, Q50
- PRS.PROB: Q42, Q43

## Pages not read confidently

None. All 12 pages (25-36) were rendered and read. Tables/figures/scripts for Q12-14, Q16, Q17, Q19, Q22, Q24 and Q27 are absent from the PDF itself (quarantined).
