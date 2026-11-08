# cbt: mock exam mode

Routes (`routes.tsx`): `cbtExamRoutes` (`/exam/:paperId`, full screen, mount outside AppLayout, not behind sign-in so guests can sit it),
`cbtPageRoutes` (`/exam/:paperId/result/:mockId`, `/mocks`, mount inside AppLayout), `cbtRoutes` (both).

Grading: mock shards carry no answers. For PYQ/sample papers the same qids are fetched WITH answers from the practice shards
(`loader.ts`). Real shared mocks will be server-graded in phase 4. If any answer is missing the MockDoc is stored with
`score: null` and `analysis.pending = true` ("Result pending").

Mini papers: per subject, sections take the paper's questions of matching type up to the section count; duration scales by share of questions.

## MockDoc written by exam mode (`store.putMock(id, doc)`, id = `m_<startedAtEpoch>`)
```
{ id, paperId, submittedAt,
  responses: { qid, answer: Response|null, status: PaletteStatus }[]   // slot order
  timeline: KairosEvent[]                                              // core events, t = ms since Start
  score: PaperScore | null                                             // {marks,max,correct,wrong,blank,partial,bySubject,bySection}
  analysis: MockAnalysis }                                             // model.ts, v: 1
```
`MockAnalysis` (v 1): `pending, title, exam, blueprintId, durationMs, usedMs, submitReason('manual'|'auto'),
subjectScores, sectionScores (keys 'PHY.A'), maxBySubject, maxBySection, counts{not_visited,not_answered,answered,marked,answered_marked,correct,wrong,blank,partial},
lostUnsaved, focusLog:{t,type:'leave'|'visit'}[], questions:{qid,subject,sectionId,type,status,verdict?,marks?,timeMs}[]`.
Read it with `readAnalysis(mock)`. `<MockResultSummary mock={mock}/>` renders from the doc alone; `<MockReview mock questions/>` adds the review list.

Attempts persist in IndexedDB `kairos-exam` (`attemptStore.ts`), keyed by paperId. The clock is `Date.now() - startedAtEpoch`, so refresh never pauses it.
`_harness.html` mounts the routes for e2e until App.tsx does.
