# NPTEL GATE DA Mock 2: held extraction report

Source: Gate_DA_Nptel_mocks.pdf, pdf pages 15-24 (key on page 24). 65 questions.
License recorded: Freely downloadable NPTEL GATE DA mock tests; provided by the project owner. Held outside pipeline/bank_src; owner publishes after merge.

Accepted: 40  |  needs_review: 25

Accepted by type: {'SCQ': 22, 'NVQ': 13, 'MSQ': 5}
Accepted by chapter: {'CO.LIM': 5, 'CO.OPT': 2, 'CO.TAY': 1, 'DBW.NF': 2, 'DBW.REL': 1, 'GA.QUANT': 2, 'GA.VERB': 2, 'LA.EIG': 2, 'LA.MAT': 3, 'LA.VS': 2, 'ML.CLS': 1, 'ML.CLU': 1, 'ML.DR': 1, 'PDS.ALG': 2, 'PDS.DS': 2, 'PDS.GRAPH': 1, 'PDS.PY': 1, 'PRS.CNT': 1, 'PRS.CRV': 2, 'PRS.DRV': 2, 'PRS.INF': 1, 'PRS.MOM': 1, 'PRS.PROB': 2}
Needs-review by reason: {'key_mismatch': 11, 'broken_context': 9, 'figure': 3, 'suspicious_key': 2}

Marks are NOT shown in the PDF; they are inferred (GA 21-25 one mark, 26-30 two; subject items by effort) and recorded in marks_m2.json.

## Needs review

- Q2 (PDS.GRAPH, key_mismatch): PDF key ['A', 'C']. A true (a negative diagonal entry means a closed walk of negative weight). B false (triple loop, $O(V^3)$). C true. D is the standard Floyd-Warshall recurrence, so it is true as printed. Correct set by reasoning: A, C, D; the PDF key omits D. (Conceptual, not code-checkable; flagged because D is textbook-correct.)
- Q5 (PDS.DS, key_mismatch): PDF key ['A']; recomputed ['B']. Check A[i] >= A[2i], A[2i+1]. Option A: node 3 (value 10) has child A[6]=14 > 10, so A is NOT a max-heap. Option B: 23>=17,14; 17>=7,13; 14>=10,1; 7>=5,6; 13>=12: valid max-heap. C: A[5]=13 has child A[10]=15 > 13, not a heap. D: A[2]=14 has child A[5]=10 fine but A[4]=1 has child A[8]=12 > 1, not a heap. Correct key B; PDF key A.
- Q8 (PDS.DS, broken_context): PDF key ['B']. Stem is truncated ('Let S be a stack and Q be a queue...'): the definition of Result and the exact operation semantics are missing. Not reproducible.
- Q10 (PDS.DS, key_mismatch): PDF key ['B']; recomputed ['A', 'B']. Simulated all four orders with linear probing. A: 11->1, 23->3, 35->0, 20->(0 taken)->1 taken->2, 14->4 gives [35,11,20,23,14]: valid. B: 14->4, 35->0, 23->3, 11->1, 20->(0,1 taken)->2 gives [35,11,20,23,14]: valid. C: 23->3,35->0,14->4,20->(0 taken)->1, 11->(1 taken)->2 gives [35,20,11,23,14]: invalid. D: 23->3,20->0,35->(0 taken)->1: invalid. Correct set A, B (question asks 'which options', plural); PDF key lists only B.
- Q11 (DBW.REL, broken_context): PDF key 17. Schema (columns, keys, join condition) is not given and the relation names are inconsistent (Order/Orders, User/Users). The answer depends on whether the join is on a foreign key; PDF key 17 cannot be derived from the stem as printed.
- Q15 (DBW.NF, broken_context): PDF key ['B']. The four schemas and their functional dependencies are not included in the PDF.
- Q16 (DBW.REL, broken_context): PDF key 4. The instance of CR and the definition of T1 are not included.
- Q17 (DBW.REL, broken_context): PDF key ['A']. Queries 1 and 2 are not included.
- Q18 (DBW.REL, broken_context): PDF key ['B']. The transaction code ('the following transaction') is not included. The answer (Consistency) is derivable from the constraint wording alone, but the stem as printed refers to missing content.
- Q19 (DBW.REL, broken_context): PDF key ['A']. Attributes and keys of Students and Enroll are not given; the max/min depends on the shared attributes and foreign-key constraint.
- Q20 (DBW.NF, key_mismatch): PDF key ['B']; recomputed ['A']. Chase: rows for (A,B),(B,C),(B,D); A->B, B->C, C->D, D->B give an all-distinguished row (row (A,B) becomes a,a,a,a) so the join is lossless. Dependency preservation: projections give A->B on (A,B), B->C and C->B on (B,C) (C+=CDB), B->D and D->B on (B,D). Then C->B and B->D give C->D, and D->B, B->C, A->B are present directly, so every FD is preserved. Correct key A (lossless and dependency preserving); PDF key B.
- Q23 (GA.QUANT, key_mismatch): PDF key ['C']; recomputed ('val', 1800.0). Let c = core-likers, o = other-likers, o = 4c. |union| = 10000-1500 = 8500 = c + o - 500, so 5c = 9000, c = 1800 (option A). If instead 'like core branches' were exclusive of 'like both' (c + o + 500 = 8500, o = 4c) then c = 1600 (option C), which is what the PDF key matches, but the printed stem ('500 like both' as an overlap in the counts) gives 1,800. Ambiguous stem; PDF key C vs recomputed A.
- Q24 (GA.QUANT, figure): PDF key ['C']. Depends on two pie charts that are not in the PDF.
- Q25 (GA.VERB, broken_context): PDF key ['C']. The passage is not included in the PDF.
- Q28 (GA.QUANT, suspicious_key): PDF key ['D']. As printed, x+y = k x(x-y) is a curve, and along it (x^2+y^2)/(x^2-y^2) takes different values (checked numerically for k=1: t=y/x gives (1+t^2)/(1-t^2) varying), so 'is a constant' (key D) is false. The intended original is probably '(x+y) proportional to (x-y)' (typo 'x(x-y)'), for which the ratio depends only on the proportionality constant. Quarantined as a probable misprint.
- Q29 (GA.QUANT, suspicious_key): PDF key ['B']. As printed (54 pi cm x 4 cm) no option results (circumference 4, height 54 pi gives ratio 0.1796; circumference 54 pi gives other values). With the likely intended sheet 54 cm x 4 cm (area 216, cube side 6, volume 216; cylinder with circumference 4 and height 54 has volume 216/pi) the ratio is 1/pi, option A, not the PDF key B (2/pi). Misprint plus mismatching key.
- Q30 (GA.QUANT, figure): PDF key ['B']. Depends on a pie chart not present in the PDF.
- Q34 (CO.LIM, key_mismatch): PDF key 4; recomputed 3.0. f = sinh. onto: true. one-one: true. f^{-1}(x)=ln(x+sqrt(x^2+1)): true. 'f^{-1} doesn't exist': false (f is bijective). 'f(x)>=0 for all x': false (f(-1)<0). Count = 3; PDF key 4.
- Q36 (CO.LIM, key_mismatch): PDF key ['B', 'C']; recomputed ['A']. A: (f o g)'(0) = f'(g(0)) g'(0) = f'(3)(-2) = 2: TRUE. B: (f/g)(0) = 4/3, not 17/9: false. C: (fg)'(0) = f'(0)g(0)+f(0)g'(0) = 9-8 = 1, not -6: false. D: 4/3 != -17/9: false. Correct key A only; PDF key B, C.
- Q49 (PRS.CRV, key_mismatch): PDF key ['A', 'C', 'D']; recomputed ['C', 'D']. f_X(x) = int_0^1 6xy^2 dy = 2x, so A (3x) is FALSE. f_{Y|X}(y|x) = 6xy^2/(2x) = 3y^2: C true, B false. E[Y|X=x] = int_0^1 y*3y^2 dy = 3/4: D true. Correct key C, D; PDF key A, C, D.
- Q52 (LA.MAT, key_mismatch): PDF key ['D']. A(A+I) = A^2 + A = I, so A is invertible with inverse A+I: Assertion true. Reason: for square matrices AB = I implies B = A^{-1}, which is exactly the step used, so the Reason is true and is the correct explanation (option A). The PDF key D calls the Reason false, which holds only if non-square matrices are allowed; but the Assertion's A is square. Ambiguous; PDF key D vs reasoned A.
- Q54 (LA.MAT, key_mismatch): PDF key 6; recomputed 4.0. Right-hand-rule rotation about +y by 45 deg: x' = x cos + z sin, z' = -x sin + z cos. (a,b,c) = (5/sqrt2, 1, -1/sqrt2); a+b+c-1 = 4/sqrt2; times sqrt2 = 4. The PDF key 6 corresponds to the opposite sense (x' = x cos - z sin, z' = x sin + z cos): (1/sqrt2, 1, 5/sqrt2), giving 6. 'Anti-clockwise about the y-axis' is convention dependent; code gives 4 (right-hand rule) and 6 (opposite); PDF key 6.
- Q58 (LA.SYS, key_mismatch): PDF key ['C']; recomputed ['C', 'D']. A false (singular square matrix can have infinitely many solutions or none). B false (inconsistent systems exist). C true (rank <= k < n so nullity >= n-k > 0). D true: rank <= n < k, so the column space is a proper subspace of R^k and some b is outside it. E false (e.g. zero matrix). Correct key C, D; PDF key C only.
- Q62 (ML.DR, figure): PDF key ['A']. Depends on a diagram not present in the PDF.
- Q64 (ML.REG, broken_context): PDF key ['B']. The model equation (which variable is the target, which weights belong to weight and height) is not given. Also 'decreases by 1000' means divided by 1000, wording is loose.

## Chapter mapping (all 65)

- Q1: PDS.ALG
- Q2: PDS.GRAPH
- Q3: PDS.GRAPH
- Q4: PDS.DS
- Q5: PDS.DS
- Q6: PDS.DS
- Q7: PDS.ALG
- Q8: PDS.DS
- Q9: PDS.PY
- Q10: PDS.DS
- Q11: DBW.REL
- Q12: DBW.REL
- Q13: DBW.NF
- Q14: DBW.NF
- Q15: DBW.NF
- Q16: DBW.REL
- Q17: DBW.REL
- Q18: DBW.REL
- Q19: DBW.REL
- Q20: DBW.NF
- Q21: GA.VERB
- Q22: GA.QUANT
- Q23: GA.QUANT
- Q24: GA.QUANT
- Q25: GA.VERB
- Q26: GA.QUANT
- Q27: GA.VERB
- Q28: GA.QUANT
- Q29: GA.QUANT
- Q30: GA.QUANT
- Q31: CO.OPT
- Q32: CO.LIM
- Q33: CO.OPT
- Q34: CO.LIM
- Q35: CO.LIM
- Q36: CO.LIM
- Q37: CO.LIM
- Q38: CO.TAY
- Q39: CO.LIM
- Q40: CO.LIM
- Q41: PRS.CNT
- Q42: PRS.PROB
- Q43: PRS.PROB
- Q44: PRS.INF
- Q45: PRS.CRV
- Q46: PRS.DRV
- Q47: PRS.CRV
- Q48: PRS.MOM
- Q49: PRS.CRV
- Q50: PRS.DRV
- Q51: LA.MAT
- Q52: LA.MAT
- Q53: LA.MAT
- Q54: LA.MAT
- Q55: LA.VS
- Q56: LA.MAT
- Q57: LA.VS
- Q58: LA.SYS
- Q59: LA.EIG
- Q60: LA.EIG
- Q61: ML.DR
- Q62: ML.DR
- Q63: ML.CLU
- Q64: ML.REG
- Q65: ML.CLS

Notes: conceptual accepted items carry 'Verified by: key from source, conceptual.' (reasoning agrees with the key). Assumptions: Q26 repetition allowed; Q50 geometric support starts at 1; Q59 real matrix.
