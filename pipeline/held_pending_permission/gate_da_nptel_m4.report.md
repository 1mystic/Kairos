# NPTEL GATE DA Mock 4: extraction report

Source: Gate_DA_Nptel_mocks.pdf pages 37-48. License: Freely downloadable NPTEL GATE DA mock tests; provided by the project owner.

Questions in PDF: 65. Accepted (verified): 45. Needs review / quarantined: 20.

Marks are not printed in the PDF; they are inferred (GA Q21-25 one mark, Q26-30 two; subject marks by a cautious heuristic) and recorded in marks_m4.json with basis 'inferred'.

## Accepted by type

- MSQ: 3
- NVQ: 14
- SCQ: 28

## Accepted by chapter

- CO.LIM: 7
- DBW.ER: 1
- DBW.NF: 1
- DBW.REL: 4
- GA.ANAL: 1
- GA.QUANT: 4
- GA.SPAT: 1
- GA.VERB: 1
- LA.EIG: 1
- LA.MAT: 1
- LA.PROJ: 1
- LA.SYS: 1
- LA.VS: 2
- ML.CLS: 1
- ML.DR: 2
- PDS.ALG: 2
- PDS.DS: 2
- PDS.GRAPH: 3
- PRS.CLT: 1
- PRS.CNT: 1
- PRS.CRV: 1
- PRS.DESC: 1
- PRS.DRV: 1
- PRS.INF: 2
- PRS.MOM: 1
- PRS.PROB: 1

Recomputed by code: 42; conceptual (key from source): [22, 28, 63]

## Needs review / quarantined

| Q | chapter | reason | PDF key | recomputed | note |
|---|---|---|---|---|---|
| 2 | PDS.DS | answer_mismatch | ['A', 'D'] | ['B'] | PDF key ['A', 'D'] vs recomputed ['B'] |
| 7 | PDS.ALG | answer_mismatch | ['D'] | ['C'] | PDF key ['D'] vs recomputed ['C'] |
| 9 | PDS.ALG | answer_mismatch | ['D'] | ['C'] | PDF key ['D'] vs recomputed ['C'] |
| 13 | DBW.NF | answer_mismatch | ['A', 'B', 'D'] | ['A', 'C', 'D'] | PDF key ['A', 'B', 'D'] vs recomputed ['A', 'C', 'D'] |
| 15 | DBW.REL | quarantine | [1] | None | The relational algebra query and the relation instances (tuples of P, Q, R) are not present in the PDF; the question cannot be answered or reproduced. |
| 17 | DBW.REL | answer_mismatch | ['B'] | ['D'] | PDF key ['B'] vs recomputed ['D'] |
| 18 | DBW.REL | quarantine | ['A'] | None | The interleaved schedule is not given (only the three transactions' own operations), so no serial order can be called 'the' correct serialization. |
| 24 | GA.VERB | quarantine | ['C'] | None | Sentence S is garbled in the source ('Many millennia ago, a collided with the massive Eurasian Plate': the subject of the sentence is missing). The order SPRQ is derivable, but the stem as printed is  |
| 27 | GA.ANAL | quarantine | ['A'] | None | The $4\times4$ grid (positions of crosses and numbers in the first three rows) is not shown in the PDF; the answer depends on it. |
| 29 | GA.SPAT | quarantine | ['C'] | None | The map figure is not present in the PDF; the question cannot be reproduced. |
| 35 | CO.LIM | quarantine | ['A', 'E'] | None | The PDF key is 'A, E' but only options A-D are printed (option E does not exist). Among A-D only A is true ($a_n=1+1/n^2$ decreases to 1, and $b_n$ also decreases). |
| 38 | CO.OPT | quarantine | ['C', 'F'] | None | The PDF key is 'C, F' but only options A-D are printed (option F does not exist). Among A-D only C is true ($f''(1)=2>0$; there is no global minimum since $f(-1)=-2<f(1)=2$). |
| 40 | CO.OPT | quarantine | ['A', 'C'] | None | Ill-posed / suspicious key: oddness gives a local minimum at $-x_0$ in addition to the maximum at $x_0$, so A ('exactly one local extremum') is certainly false. With only the stated hypotheses, extrem |
| 48 | PRS.INF | quarantine | ['A'] | None | Options B, C and D are truncated ('...'), and the observed daily demand data needed for the test are not given. |
| 53 | LA.MAT | answer_mismatch | ['A'] | ['A', 'B'] | PDF key ['A'] vs recomputed ['A', 'B'] |
| 54 | LA.DEC | quarantine | ['A'] | {'L32': '-1/2', 'U33': '-1/2', 'x1': '0'} | Option D is the placeholder '...'. Also no printed option matches the recomputed LU factorisation (see mismatch). |
| 55 | LA.MAT | quarantine | ['C'] | None | Undefined context: the matrix $A$ and the matrices $P$, $Q$ (and the stated properties) are never defined. |
| 57 | LA.MAT | answer_mismatch | ['B'] | ['A', 'B'] | PDF key ['B'] vs recomputed ['A', 'B'] |
| 64 | ML.REG | answer_mismatch | [0.28] | 0.2857142857142857 | PDF key [0.28] vs recomputed 0.2857142857142857 |
| 65 | ML.REG | quarantine | ['A', 'C', 'E'] | None | The contour figure (with $c_1$, $c_2$ and the regulariser shape) is missing, and the key 'A, C, E' points to a non-existent option E. |

## Key mismatches (PDF key vs independent recomputation)

- Q2: PDF ['A', 'D'], recomputed ['B']. insert 95 into each option; only options reproducing the target heap qualify: B
- Q7: PDF ['D'], recomputed ['C']. insertion worst 1000000s (278 h), best 0.01s; merge sort n log n 0.27s always; quicksort/selection worst case n^2 = 1000000s so not 'always < 1 s'
- Q9: PDF ['D'], recomputed ['C']. smallest integer k with 10*n*log10(n) < 0.0001 n^2 at n=10^k is 6 (k=5: B=5e6 > A=1e6; k=6: B=6e7 < A=1e8)
- Q13: PDF ['A', 'B', 'D'], recomputed ['A', 'C', 'D']. attribute closure under F: PS+ and P+ include T,Q,R; R+={R}
- Q17: PDF ['B'], recomputed ['D']. history enumeration: only a read of an uncommitted write that commits first is non-recoverable (dirty read, D)
- Q53: PDF ['A'], recomputed ['A', 'B']. evaluate u^T A u at 50 random integer points
- Q57: PDF ['B'], recomputed ['A', 'B']. random 3x3 integer matrices: cyclic shifts BCA, CAB equal tr(ABC); BAC, ACB do not
- Q64: PDF [0.28], recomputed 0.2857142857142857. w=2/7

## Chapter mapping (all 65)

- Q1: PDS.GRAPH
- Q2: PDS.DS
- Q3: PDS.ALG
- Q4: PDS.ALG
- Q5: PDS.DS
- Q6: PDS.GRAPH
- Q7: PDS.ALG
- Q8: PDS.DS
- Q9: PDS.ALG
- Q10: PDS.GRAPH
- Q11: DBW.REL
- Q12: DBW.ER
- Q13: DBW.NF
- Q14: DBW.NF
- Q15: DBW.REL
- Q16: DBW.REL
- Q17: DBW.REL
- Q18: DBW.REL
- Q19: DBW.REL
- Q20: DBW.REL
- Q21: GA.QUANT
- Q22: GA.VERB
- Q23: GA.QUANT
- Q24: GA.VERB
- Q25: GA.QUANT
- Q26: GA.SPAT
- Q27: GA.ANAL
- Q28: GA.ANAL
- Q29: GA.SPAT
- Q30: GA.QUANT
- Q31: CO.LIM
- Q32: CO.LIM
- Q33: CO.LIM
- Q34: CO.LIM
- Q35: CO.LIM
- Q36: CO.LIM
- Q37: CO.LIM
- Q38: CO.OPT
- Q39: CO.LIM
- Q40: CO.OPT
- Q41: PRS.CNT
- Q42: PRS.PROB
- Q43: PRS.DRV
- Q44: PRS.INF
- Q45: PRS.DESC
- Q46: PRS.MOM
- Q47: PRS.INF
- Q48: PRS.INF
- Q49: PRS.CRV
- Q50: PRS.CLT
- Q51: LA.VS
- Q52: LA.PROJ
- Q53: LA.MAT
- Q54: LA.DEC
- Q55: LA.MAT
- Q56: LA.MAT
- Q57: LA.MAT
- Q58: LA.VS
- Q59: LA.EIG
- Q60: LA.SYS
- Q61: ML.DR
- Q62: ML.DR
- Q63: ML.CLS
- Q64: ML.REG
- Q65: ML.REG

## Reading notes

- Math in the PDF text layer is garbled; all stems were transcribed from page images (pdf pages 37-48), all read confidently.
- Q31: the exponent is read as $\sqrt{\pi}\,x$; the answer is 0 under either reading.
- Q3: $f_5=2^n\log n$ (superscript visible in the image).
- Q40: the PDF key (A, C) contradicts oddness (a minimum exists at $-x_0$); quarantined.
