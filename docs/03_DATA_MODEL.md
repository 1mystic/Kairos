# 03 · Data model

## static content
```
/bank/v{N}/manifest.json
/bank/v{N}/{exam}/{subject}/{chapter}.json.gz   practice shards (with answers + solutions)
/bank/v{N}/mocks/{paperId}.json                 no answers
/bank/v{N}/taxonomy.json  /blueprints/*.json  /stats/items.json
/img/{sha256}.webp
```

## question
```json
{
  "id": "q_7f3a9c",
  "type": "SCQ|MSQ|NVQ|INT|MATCH|PARA_CHILD|ASSERT_REASON",
  "stem": "markdown + $LaTeX$", "images": ["img/ab12.webp"],
  "options": [{"key":"A","text":"..."}],
  "answer": {"keys":["B"]} ,
  "solution": "markdown", "solution_source": "official|in_house|llm_verified|user",
  "tax": {"subject":"PHY","chapter":"PHY.ROT","topics":["PHY.ROT.MOI"],"concepts":["parallel_axis"]},
  "skills": ["conceptual","calculation"],
  "ncert_ref": {"class":11,"chapter":7,"page":156},
  "appearances": [{"exam":"JEE_MAIN","year":2025,"session":1,"shift":"2025-01-22-S1","qno":14}],
  "in_syllabus": {"JEE_MAIN":{"2026":true}},
  "difficulty": {"label":"M","b":0.41,"a":1.1,"p_correct":0.46,"median_time_s":128,"n":3120},
  "source": {"kind":"official|dataset|user|authored","license":"...","url":"..."},
  "fingerprint": {"simhash":"...","emb_id":"..."},
  "status": "verified|needs_review|quarantined", "version": 3
}
```
answer variants: `{"keys":[...]}` | `{"value":2.5,"tol":0.01}` | `{"range":[2.4,2.6]}`.
taxonomy IDs: dotted, stable, from official syllabus + NCERT: `PHY.ROT.MOI`, `BIO.GEN.MENDEL.DIHYBRID`. one shared tree, per-exam flags.

## firestore
| path | holds | writes |
|---|---|---|
| `exam_calendar/{examSession}` | exam, session, date, window, status, source, last_checked | admin |
| `users/{uid}` | exam ref/custom date, ambition, minutes per weekday, off-day, chapters done, lang, dob, consent | rare |
| `users/{uid}/state/mastery` | map topicId → {θ, rd, n, last, S, D, due, err_mix} (~60KB) | per session |
| `users/{uid}/state/pace` | W, A, ρ, status, buffers_left, reserved-day map, f_u | daily |
| `users/{uid}/pace_log/{date}` | planned, done, ρ, mastery by subject, predicted band | 1/day |
| `users/{uid}/sessions/{sid}` | events[] (≤2000) + summary | session end |
| `users/{uid}/plans/{date}` | tasks[{id,kind,topic,items[],est_min,priority,status,carried_from}] | replan + tick |
| `users/{uid}/mocks/{mid}` | paperId, responses, timeline, score, analysis | submit |
| `users/{uid}/bank/{qid}` | private uploaded questions | upload |
| `papers/{paperId}` | shared mock meta | admin/fn |
| `uploads/{id}` | community submissions + status | user/admin |
| `leaderboards/{paperId}/shards/{k}` | score histograms | fn |

## event (raw material for all analytics — never store only aggregates)
```json
{"t":183402,"q":"q_7f3a9c","a":"visit|select|clear|save|mark|unmark|leave|submit","v":"B","ctx":"mock|practice|plan|review"}
```
`t` = ms since session start.
