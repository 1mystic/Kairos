# 04 · CBT exam screen spec

goal: zero interface surprise on exam day. copy NTA CBT **behaviour**, our own branding. JEE Main now; NEET reuses it (CBT from 2027 — VERIFY final NTA NEET UI when published).

## layout
header: candidate name + photo placeholder · exam name · countdown (top right)
subject tabs (Physics/Chemistry/Maths; Section A/B inside)
left: question pane (Q no., type, +4/−1, stem, options)
right: question palette + legend counts
bottom: action bar

## palette states (exact)
| state | look | scored? |
|---|---|---|
| not visited | grey/white square | no |
| not answered (visited) | red/orange | no |
| answered | green | yes |
| marked for review, no answer | purple circle | **no** |
| answered + marked | purple + green dot | **yes** |
CBT palette colours are a **separate token set** (`--cbt-*` in tokens.css) — never themed by brand.

## buttons + rules
- Save & Next · Save & Mark for Review · Clear Response · Mark for Review & Next · Back · Next · Submit
- **clicking a palette number does NOT save** the current selection (replicate; post-mock nudge "lost N answers by navigating without saving")
- NVQ via on-screen keypad only; physical keyboard disabled in Exam Mode
- instructions screen + "I have read" checkbox; timer starts on Start
- auto-submit at 00:00; no pause in Exam Mode (Practice Mode can pause)
- EN/HI toggle per question; Question Paper overview; View Instructions
- JEE Adv skin: MSQ checkboxes, decimal NVQ, paragraph split pane
- fullscreen request; tab switches logged (shown in analysis), not punished
- every interaction → event log (see data model)

## modes
PYQ replay · blueprint mock · all-India mock (same paper, 48h window, percentile) · personalised mock (25–30% weak-tilted, counts locked) · part/chapter tests

## mock report
1 score + percentile band + rank band + trend · 2 marks-lost waterfall (negatives, silly mistakes, skipped easy, time sinks) + "potential score" · 3 attempt×accuracy quadrant · 4 time map of 3h · 5 fatigue curve · 6 chapter heatmap weight×mastery · 7 vs top 10% · 8 fix list → feeds planner

## a11y / perf
works on 360px phones (palette collapses to drawer), 60fps timer, KaTeX pre-rendered per question on paper load.
