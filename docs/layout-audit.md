# Layout audit (W3h, 2026-11-08)

Owner feedback: "the spacings and the visual equivalence, consistent symmetry is lacking in the pages." Audit done by reading code and `grep`, BEFORE the fixes (line numbers refer to the pre-W3h files). Status column = fixed in W3h, or owner of the follow-up.

## grep findings (before)
- Card-row grids: 7 different ad-hoc templates: `grid-auto` (18rem, gap 16), Mocks `GRID` arbitrary `auto-fill 18rem` (cbt/MocksPage.tsx:7), Result `auto-fit 14rem` (cbt/MockResultSummary.tsx:5), MockReview `auto-fit 24rem items-start` (cbt/MockReview.tsx:26), `grid-cols-12` dashboard (dashboard/Dashboard.tsx:78,144-149), `grid-cols-2/4` stats (widgets/Stats.tsx:8), `ld-exams` landing. Gaps between cards in a row: 16, 16, 16, 16, 20/24, 12, 16 (three different values).
- Distinct gap utilities per area: dashboard 8 (`gap-s1..s6`, `gap-x/y`), upload 5, pages 4, cbt pages 4. `gap-section` hand-wrapped inside `Page` (cbt/MocksPage.tsx:29, ResultPage.tsx:55, MockResultSummary.tsx:25): a redundant 32px stack inside the 32px page stack.
- `flex-wrap` rows in dashboard (6), `grid-cols-*` in 9 files; Card with extra `className` for layout: `u-meter`, `u-bank-row`, `u-qcard`.
- Skeletons: 9 ad-hoc `<Skeleton className="h-s8 w-full"/>` bars, none shaped like the final layout (upload/BankPage.tsx:90, cbt/ResultPage.tsx:41, upload/routes.tsx:10, MocksPage.tsx:33,54, plan, analysis, onboarding).
- Sticky offsets: 3 different (`top: var(--space-6)` sidenav in index.css `.sidenav`, `topbar-h + space-4` upload.css `.u-pane-sticky`, `topbar-h` upload.css `.u-sumbar`). At >= 1024 there is no top bar, so the latter two floated 64px low.
- Two-column ratios: settings/legal `14rem + 52rem` (leaves empty space right of 66rem on wide screens), upload `1fr 1fr`, dashboard `2fr 1fr`, diagnostic `lg:grid-cols-3 / col-span-2`: four different ratios.
- Hover rules: 16 `:hover` rules scattered in index.css/upload.css/landing.css, none inside `@media (hover: hover)`; 5 tailwind `hover:bg-*` one-offs; disabled = `cursor: not-allowed` (not inert); no `:active` except scale on `.btn`.
- Native `<select>` look in 7 places (upload, onboarding, dashboard, diagnostic, bank).

## per page
| page | deviations (rules 1-9) | status |
|---|---|---|
| AppLayout (shell) | banner wrapper used `page page-app !pb-0` (own top padding, `!important`) AppLayout.tsx:122; account menu note `px-s3 py-s2` one-off :61; sidebar started with a raster wordmark (invisible-prone) and no brand block aligned to the header row | fixed (`page-lead`, `menu-note`, `.brand` block, 64px = top-bar height) |
| Home | OK (Page + PageHeader) but dashboard toolbar used its own flex-wrap with `ml-auto` and a different gap (Dashboard.tsx:121) | fixed (`row-between`) |
| Dashboard | `grid-cols-12 gap-s5 / md:gap-s5 gap-s4` (4 variants) :78,144-149; side column `col-span-1` of 3 (not the named 2fr/1fr); card title gap `gap-s4`; widgets `flex-wrap` x6; Activity rows custom (dot + text, `gap-s3`); Loading skeletons `h-48` not card-shaped | fixed: `SpanGrid`, `Columns main-side`, `ListRow`, `skeleton-card`, `row` helpers |
| Settings | structure OK; modal button row `stack gap-tight sm:flex-row-reverse` :84 reversed on desktop only; nav column fixed 14rem / content 52rem (thin, empty right) | fixed (`TwoColumnPage` 1fr/2fr, `row-actions`) |
| Legal | own sticky top via `.sidenav` (24px); cards with `stack gap-base` inside Card (double rhythm) | fixed |
| Placeholder | `h1.sr-only` + `page-center` (no visible header, different top offset) Placeholder.tsx:8 | fixed (PageHeader + EmptyState) |
| Landing | `.ld p{margin:0}` (specificity 0,1,1) silently cancelled `.ld-lead` / `.ld-eyebrow` margins: hero text touching; hero columns `1.1fr .9fr` vs sections `1fr 1.15fr` (flipped sections gave the card the NARROW track); header 92% transparent; hero + next section = double 64px band | fixed (`:where` reset, `TwoPane`, solid header, hero min-height) |
| Auth (sign in/up/forgot/complete) | form column hugged left, brand panel spread top-to-bottom (logo top, headline middle, tag bottom); wordmark `<img>` dark-on-tint invisible in dark mode; headline wrapped one word | fixed (`AuthShell` two centred columns, `Brand`, `text-wrap: balance`) |
| Upload wizard | `u-panes` 1fr/1fr + own sticky `calc(topbar-h + space-4)`; step cards `h2 text-h2` (section size on a card); `gap-base/tight` mix; done state in half-width left pane | fixed (`Columns main-side`, `--sticky-top`, card titles h3) |
| Review view | `u-sumbar` sticky `top: topbar-h`; two nested `stack gap-loose` (24) in a 32px page | fixed |
| My questions | empty state wrapped in a Card (double padding) BankPage.tsx:101; Tabs 44px next to md Button 48px in one row :140; usage meter `md:grid-cols-2` | fixed |
| Mocks / Result / MockResultSummary / MockReview | 3 different grids and `gap-section` nest; cards had button directly after score so footers ragged; titles not clamped | CardGrid + Card `footer` applied (W3h), file ownership then moved to the UX agent: see "conformance" |
| Onboarding / Plan / Analysis / Diagnostic | skeleton bars, `page-center`, raw `grid-cols`, `lg:grid-cols-3 col-span-2`, `flex-wrap` | skeletons migrated; rest listed in "For feature agents" |

## after (what now enforces it)
`app/src/styles/consistency.test.ts` ("layout rules"): every page uses Page + PageHeader; no className on `<Page>`; one `<h1>` source; no raw `grid-cols`/`col-span`/`flex-wrap` in layout files; no padding/gap utilities on `Card`/`Tile`; only semantic spacing in page files; no ad-hoc skeleton bars; sticky offsets use `--sticky-top`; `:hover` only inside `@media (hover: hover)`; raw `<button>` must carry a shared interactive class; no native `<select>`.
