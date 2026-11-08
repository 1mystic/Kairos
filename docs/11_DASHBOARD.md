# 11 · Dashboard (Home) — layout + customisable cards

Layout reference supplied by the owner (a "Daily / Week / Month" analytics dashboard). We take the **structure only**: colours, gradients, shadows and borders are ignored. Our look follows docs/10_DESIGN_SYSTEM.md (flat, tint layers, 3 colours, Plus Jakarta Sans, spacing scale, responsive 320→2560).

## structure
```
[ Daily | Week | Month ]   [ ‹  Wed 8 Nov 2026  › (date picker) ]      [ Customise ]
┌───────────────────────────────────────────┐ ┌─────────────────────────────┐
│ READINESS hero: ring + big number + delta │ │ PLAN / PACE ring card       │
│ (predicted score band, or mastery % )     │ │ days left · ρ status · link │
├───────────────────────────────────────────┤ ├─────────────────────────────┤
│ TREND bar chart (metric switchable)       │ │ ACTIVITY feed (with filter) │
├───────────────────────────────────────────┤ │ "Last updated yesterday"    │
│ 3–4 STAT TILES (choose which)             │ ├─────────────────────────────┤
├───────────────────────────────────────────┤ │ TIP card (saffron tint)     │
│ TOP CHAPTERS list → "Open practice"       │ │ "Try this: ..."             │
└───────────────────────────────────────────┘ └─────────────────────────────┘
```
- The Daily/Week/Month toggle + date control sets the **range** for every card (default Daily = today, Week = last 7 days, Month = last 30). Prev/next arrows move the window; "Today" resets. Deltas compare with the previous equal window ("Up 8% from the previous day").
- ≥1280px: two columns (main 2fr / side 1fr). 768–1279: two-column grid where the side cards flow below the hero. <768: single column in a fixed priority order (Today/plan, readiness, stats, trend, chapters, activity, tip). No thin column floating in empty space on big screens: cards use auto-fit grids and the widths scale to 1360 max at ≥1920.

## cards (widget catalogue)
Every card is a widget with `{id, title, sizes: ('s'|'m'|'l')[], defaultSize, render(range, data)}`.
| id | what | data |
|---|---|---|
| `readiness` | ring + big number + delta chip + info popover (how it's calculated). Predicted score band (P25–P75) when we have enough data, else overall mastery %, with the confidence label "not enough data" instead of a scary number | core `predictScore` / measure `masteryBySubject` |
| `trend` | bar chart, metric switch: questions solved · accuracy % · study minutes · mastery. Hand-rolled SVG, 1 colour + saffron highlight for the selected day, table fallback for screen readers | sessions |
| `stats` | 3–4 tiles chosen from the stat catalogue below | sessions/mocks/mastery |
| `chapters` | top 3–5 chapters practised in range with time + accuracy; row → `/practice/<exam>/<chapter>` | sessions |
| `plan` | ring: days to exam, pace status (ahead / on track / slightly behind / behind) with words + icon, buffers left, "today's plan" CTA. Until onboarding exists: calm empty state "Set your exam date to get a plan" → `/onboarding` | core plan/pace (needs profile exam date) |
| `activity` | feed of events in range with filter chips (practice · mocks · mastery · uploads): "Practised Rotation: 18/25", "Mock completed: 164/300", "Ionic Equilibrium needs attention" | sessions, mocks |
| `tip` | one actionable suggestion derived from behaviour labels (e.g. many `silly_mistake` → "Try re-reading the question before locking in"; many time sinks → "Set a 2-minute cap") + a button | measure labels |
| `nextmock` | next mock / "Take the sample mock" CTA | schedule or mocks list |
| `mistakes` | marks lost by label (careless / concept gap / time sink) as a flat horizontal bar | session summaries |
| `upload` | "Add your own questions" CTA + usage meter (questions x/2000) | bank store usage |

### stat catalogue (tile picker)
questions solved · accuracy · study time · active days / streak · mocks taken · best mock score · backlog size · buffer days left · weakest chapter · predicted band · silly-mistake rate · avg time per question. Each tile: icon, label, value (tabular numerals), optional delta chip, optional info popover.

## customisation ("custom options for our cards")
- **Customise** button opens a sheet (side panel ≥1024, bottom sheet on mobile):
  - show/hide each card (switch), reorder (drag handle AND up/down buttons for keyboard/touch), card size S/M/L where allowed;
  - for `stats`: pick which tiles (max 4); for `trend`: default metric; for `readiness`: show predicted band vs mastery %;
  - presets: **Focus** (readiness + plan + trend), **Full**, **Minimal** (readiness + today's plan); **Reset to default**.
- Layout is saved per user as JSON (`{v:1, range:'daily', widgets:[{id,visible,size,options}]}`): localStorage key `kairos-dashboard` for guests and signed-in users in v1 (cloud sync of layout later; it needs a rules change, so out of scope now). Unknown/old ids are ignored gracefully; new widgets appear at the end.
- Every card has a small "⋯" menu: hide card, change size, card options.

## data & empty states
- Real data only, from `useStore()` (sessions, mocks, mastery state) + core measure/plan functions. No fake numbers. Guests and signed-in users see the same dashboard (guest data is local).
- Empty/new user: friendly per-card empty states with a single CTA each (Practice / Sample mock / Upload / Set exam date), BRAND voice (calm, no guilt). A one-click "Preview with sample data" toggle (clearly labelled "Sample data") is allowed so the layout can be seen.
- Loading: skeletons, no layout shift. Offline: works from local data.
- Deltas: show only if the previous window has data; otherwise hide the chip.

## a11y + quality
Charts have `role="img"` + aria-label summary and a visually hidden data table; all controls keyboard operable; segmented control uses radio-group semantics; contrast ≥4.5:1; reduced-motion respected; ring/bars animate once on mount (transform/opacity only).
