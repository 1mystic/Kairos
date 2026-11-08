# 10 · Design system (flat)

Owner brief (2026-11-08): net, modern, clean, beautiful learner SaaS. **Flat.** Source of truth for values: `brand/tokens.css` (copied to `app/src/styles/tokens.css`), Tailwind wiring in `app/src/index.css` (`@theme`), components in `app/src/components/ui.tsx`. Raw colours live **only** in `tokens.css`.

## rules
1. **No borders, outlines or box-shadows. No gradients** (one exception: the landing countdown ring, indigo to saffron). Exceptions: the CBT exam UI (`src/cbt`, NTA look) and the 2px focus ring (`:focus-visible`, `index.css` and `.opt:focus-within`).
2. Separation = **tint layers + space + type**: `paper` (page) > `surface` (white / raised) > `surface-2` (cards) > `surface-3` (fields on page, hover, tracks) ; `primary-50` for hero/selected; `accent-50` for notices. 1px `--line` rules only via `<Divider/>` / `.rule`, sparingly.
3. **3 colours**: neutrals + indigo `#3A3FD9` (dark `#7B80FF`) + saffron `#F5A524`. No green/red. Status = words + icon + indigo/saffron. Text on saffron tint uses `accent-ink`.
4. Inputs are filled tinted fields (`--field`: surface-2 on the page, surface inside cards/sheets). Error = accent-50 fill + icon + accent-ink text. Never red.
5. Tap targets >= 44px. Motion 150-200ms ease-out, transform/opacity only; `prefers-reduced-motion` collapses it.
6. Everything comes from tokens (enforced, see below). No page-specific spacing: use the primitives.

## tokens
| group | tokens |
|---|---|
| colour | `ink paper surface surface-2 surface-3 slate line primary primary-hover primary-active primary-50 accent accent-ink accent-50 scrim img-backing` (+ `--cbt-*`, untouched) |
| spacing (rem) | `--space-1..8` = 4 8 12 16 24 32 48 64 px. Tailwind: `p-s4 gap-s3 mt-s6` ... (`s1..s8`). **Numeric `p-4` / `gap-3` are banned.** |
| layout | `--gutter` 16 / 24 (md) / 32 (lg); `--card-pad` 16 / 24 (md); `--gap-card` 32 (between blocks on a page); `--gap-grid` 24 (between cards in one row/grid); `--sticky-top` (sticky navs/panes/bars: topbar + 16 on phones, 24 from lg); `--gap-section` 48, 64 from lg (landing sections); `--w-app` 1120 (1280 at 2xl, 1360 at 3xl); `--w-landing` 1120 (1360 at 3xl); `--w-reading` 720; `--w-form` 440; `--measure` 68ch |
| radius | `--radius-card` 16, `--radius-btn` 12 (buttons, inputs), `--radius-pill` |
| type | Plus Jakarta Sans Variable. `text-display` clamp(32px, 4vw+8px, 48px) / `text-h1` 28 / `text-h2` 22 / `text-h3` 18 / `text-body` 16 / `text-small` 14 / `text-caption` 12. Weights 400/500/600/700. Headings tracking -0.02em, `tabular` for numbers. Banned: `text-xs..text-9xl`. |
| safe areas | `--safe-t/b/l/r` = `env(safe-area-inset-*)`, used by topbar, tab bar, landing header |

### breakpoints (defined once)
`xs 480 · sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536 · 3xl 1920` (Tailwind `xs:` ... `3xl:`; CSS media queries use the same literals).
- `< lg`: top bar + bottom tab bar (Home, Practice, Mocks, Settings). `lg-xl`: slim icon sidebar (72px, `title`/`aria-label` on items). `>= xl`: labelled 240px sidebar with "soon" pills. Items not built are muted, not links.
- Large screens: `--w-app` grows modestly (1120 > 1280 > 1360), text measure stays <= 68ch (`max-w-measure`), root font scales to 17px at >= 1920 and 19px at >= 2560 (all rem tokens follow, so spacing and type scale together). Landing max width 1120 > 1360 at 3xl.
- Phones: tab bar and header respect safe-area insets; landscape phones use the tab bar (width < 1024). Check at 320.

## components (`app/src/components/ui.tsx`)
Layout: `Page{width:'app'|'reading'|'form'}` (see **Page anatomy and symmetry** below for `CardGrid` `SpanGrid` `Columns` `TwoPane` `ListRow` `Skeleton*`) · `PageHeader{title,subtitle,actions}` · `Section{title,aside}` · `Stack{gap}` / `Inline{gap}` (`gap: tight 8 | base 16 | loose 24 | section 32`) · `Divider` · **`DashboardGrid`** (6-col grid; children use `dash-hero` (4 cols x 3 rows from lg), `dash-third`, `dash-half`) · **`TwoColumnPage{nav}`** + **`StickySideNav{items,active,onSelect,label}`** (sticky left nav from lg; without `onSelect` items are `#anchor` links; `soon` items are muted) · **`SettingsSection{id,title,description,active}`** (titled card; rows get a rule between them; from lg only the `active` section shows, below lg all stack) · **`SettingRow{label,description,children}`** (label + description left, control right, stacks on phones). Use these for Analysis, Plan, Upload / My questions.
Controls: `Select`/`SelectField` are a custom combobox + listbox (see Interaction). `Button{variant:primary|secondary|ghost,size:sm|md|lg,block,loading}` · `LinkButton` (same props + `to`) · `IconButton{label}` · `Input` `Select` `Textarea` (`invalid`) · `Field` `SelectField` `TextareaField` (`label,hint,error`).
Surfaces: `Card{tone:default|primary}` · `Tile{title,body,icon,to|onClick|soon}` · `Chip{tone:neutral|primary|accent}` (`Pill`) · `Tabs{tabs,value,onChange,label}` (segmented, arrow keys) · `Stat{label,value,hint}` · `ProgressBar{value,max,label}` · `Skeleton` · `EmptyState{icon,title,action}` · `StatusLine{done}`.
Overlays/feedback: `Modal` (alias `Sheet`; focus trap, Esc, scrim click, restores focus; bottom sheet on phones) · `Toast` (alias `Notice`) · `Banner{tone,icon,actions}` · `FormError` · `AuthShell` (centred form; two panes from lg with a primary-50 brand panel) · `Logo` `LogoMark` `Spinner`.
Shell: `pages/AppLayout.tsx` (`NAV` list controls sidebar and tab bar).
Icons: `components/icons.tsx`, 24px, stroke 1.75, rounded.

## Page anatomy and symmetry
Owner feedback (2026-11-08): spacing, visual equivalence and symmetry were lacking. These 9 rules are encoded in the primitives and (where mechanical) in `consistency.test.ts` ("layout rules"). Audit: `docs/layout-audit.md`.

1. **One page anatomy.** `Page` (gutter, max width, 24/32px top) > `PageHeader` (h1 28px, subtitle, actions right; full-width stacked buttons on phones; 32px below) > blocks separated by `--gap-card` 32px. Pages never pass `className` to `Page` and never write their own `<h1>`, top padding or wrapper stack. Banners/notices go between header and first block.
2. **Equal cards in a row.** Rows of cards are `CardGrid{cols:1|2|3|4|'auto', gap, dense}`: container-aware columns (2 from 576px, 3 from 832px, 4 from 1024px of the CONTAINER), `align-items: stretch`, equal widths, and an orphan card spans the rest of the last row (one CSS rule set, no JS). `Card` is a flex column; put the action in `footer={...}` so it pins to the bottom edge; clamp card titles with `card-title-clamp` when titles can wrap. Cards that choose their own width (dashboard) use `SpanGrid` + `spanClass(6|12)`. Never raw `grid-cols-*`, `col-span-*`, `flex-wrap` or hand-rolled `auto-fill` in page files.
3. **Symmetric margins and two named column ratios.** `Columns{ratio:'main-side'|'side-main', side, sideFrom, sticky}` = 2fr/1fr or 1fr/2fr, tops aligned, side sticky at `--sticky-top`. `TwoColumnPage` = sticky nav (1fr) + content (2fr). Text + media pairs (landing sections, hero) use `TwoPane{ratio:'equal'|'main-side'|'side-main', align:'center'|'stretch', reverse}`: same widths whichever side the media is on (`reverse` only swaps order), same gap, one vertical alignment per page type (centre for text + media, stretch for card + card). Never put a tall dense card next to a few lines of text unless the text is centred against it and section padding is symmetric. Auth is the full-bleed variant: two equal halves, each centring ONE column (`auth-col`) on the same optical centre.
4. **Semantic rhythm (use these, not `gap-s*` / `p-s*`, in page files).** `stack-section` 32 (blocks) · `stack-grid` 24 (stacked cards) · `stack-card` 16 (inside a card, between title and body) · `stack-field` 16 (stacked form fields) · `stack-label` 8 (label + control, list of tight items) · `stack-text` 4 (title + subtext) · `row-inline` 8 (icon + text, chips) · `row-actions` 12 (buttons) · `row-between` (left/right split, wraps). One card padding (`--card-pad`). `ListRow{lead,title,description,children}` is THE row anatomy (56px min height, icon/title left, meta/controls right); `SettingRow` and activity rows are ListRows.
5. **Type roles.** page title `text-h1` (PageHeader only) > section title `text-h2` (`Section`, `SettingsSection`, `EmptyState`) > card title `text-h3` (an `h2`/`h3` element, size by role) > body > `text-small` meta > `text-caption` labels. Labels over values use `Stat`; numbers are `tabular`. Chips share one height (24px). Buttons in one row share one size (sm 44 or md 48; never mixed). Primary action: top-right of the header from 640px, full-width stacked on phones.
6. **Control sizing.** Tap targets >= 44px. Inputs, selects and md buttons are 48px; sm buttons/tabs/pills 44px. Icons: 24px (nav, tile), 20px (in buttons and rows), 16px (inline with small text); `empty-icon` 64px container.
7. **Empty / loading / error.** `EmptyState` (one tinted block, centred, 64px icon, h2, one sentence, one action; becomes transparent inside a Card). Loading uses `SkeletonCards{count,cols}` (same `CardGrid` as the loaded content), `SkeletonRows`, or `PageSkeleton` (header block + cards); never ad-hoc `Skeleton` bars in pages, so nothing jumps.
8. **Large screens.** Two/three-column pages (Settings, Upload, Legal, Dashboard, Mocks) fill the `--w-app` container (1120 > 1280 > 1360); no thin 52rem column floating in empty space; text measure stays <= 68ch; root font scales at >= 1920.
9. **Mobile.** Columns stack in DOM order (main first, then side); the bottom tab bar is cleared by `.shell-main` padding (5.5rem + safe-area), toasts sit above it, sticky bars use `--sticky-top` so they never overlap content or the top bar.

### Primitives (props)
`Page{width}` `PageHeader{title,subtitle,actions}` `Section{title,aside}` `Card{tone,footer}` `CardGrid{cols,gap:'grid'|'tight',dense,as}` `SpanGrid{narrow}` `Columns{ratio,side,sideFrom:'always'|'lg',sticky}` `TwoColumnPage{nav}` `TwoPane{ratio,align,reverse}` `ListRow{lead,title,description,children,titleClass}` `SettingRow` `EmptyState` `SkeletonCards` `SkeletonRows` `PageSkeleton` `Brand`.

### do / don't
- Do: `<CardGrid cols={3}>{items.map(i => <Card footer={<LinkButton block/>}>...</Card>)}</CardGrid>`. Don't: `<div className="grid grid-cols-3 gap-s4">` or `<Card className="p-s5">`.
- Do: `<Columns ratio="main-side" side={<Preview/>}>`. Don't: `lg:grid-cols-3` + `lg:col-span-2` + `lg:sticky lg:top-s6`.
- Do: `<EmptyState .../>` straight in the page. Don't: wrap it in a Card or add `py-*`.
- Do: `<PageHeader actions={<LinkButton/>}/>`. Don't: a second `<h1>`, `sr-only` titles, or `page-center`.

## Interaction model (one for every clickable thing)
`rest -> hover -> active -> focus-visible -> disabled`, defined once in `index.css` ("THE interaction model") and tokens `--primary-hover --primary-active --tint-active`.
- **hover** = one tint step up: neutral controls and rows `surface-2 -> surface-3`; selectable/navigational tiles, ghost buttons, menu items `-> primary-50`; filled primary `-> primary-hover`; text links `-> primary-hover` + thicker underline. Only inside `@media (hover: hover)` (touch never sticks; enforced by the test).
- **active** = one step darker (`--tint-active` = surface-3 + 8% ink; primary `--primary-active`; primary-50 + 16% primary), buttons and tiles also scale .98/.99.
- **focus-visible** = the global 2px primary ring (unchanged).
- **disabled** = 55% opacity and inert (`pointer-events: none`), no special cursor.
- Transitions: background-color / color / transform, 180ms ease-out; `prefers-reduced-motion` collapses them.
- Classes: `.btn*` (Button, LinkButton, IconButton), `.tile`, `.tab`, `.nav-item`, `.tabbar-item`, `.menu-item`, `.pill-btn` (chips that are buttons, `aria-pressed`/`aria-checked`), `.check-row` (checkbox/radio rows), `.link-row` (list rows that are links), `.text-link` (inline text-button), `.brand`, `.u-step`, `.u-exam-opt`, `.sel-opt`, summary/details (`.ld-qa`). A raw `<button>` in page files must carry one of these (test).

## Select (custom dropdown)
`Select` / `SelectField` keep the native API (`value`, `defaultValue`, `onChange(e)` with `e.target.value`, `<option>`/`<optgroup>` children, `invalid`, `aria-*`). A visually hidden native `<select>` stays the source of truth (forms, label association, tests, `userEvent.selectOptions`); the visible control is a flat tinted `role=combobox` button plus a `role=listbox` popover: arrows, Home/End, type-ahead, Enter/Space, Esc (stops propagation so it does not close a modal), Tab, outside click, scrolls at 18rem, flips above when < 300px below and more room above, 44px rows, selected row = primary-50 + check, hover row = tint step. **Decision: no native fallback on touch**: one look and one behaviour everywhere; rows are 44px and the list scrolls, so it is as usable as the OS picker and keeps the product flat. Never write a raw `<select>` (test), except the exam runner.

## Sidebar brand
Desktop sidebar starts with `.brand`: mark (icon rail >= 1024) or mark + "Kairos" + tagline (labelled >= 1280), links to `/`, 64px tall = the top-bar height, `surface-3` tint on the `surface-2` rail. Wordmarks are live text (`Brand`), never the raster logo on tints (it was invisible in dark mode).

## For feature agents (onboarding, plan, analysis, diagnostic, practice, mocks)
Checklist before you ship a screen:
1. Root is `Page` > `PageHeader` > blocks. No `className` on `Page`, no `page-center`, no own `<h1>`.
2. Card rows: `CardGrid` / `SpanGrid`; two columns: `Columns` (`main-side` for content + preview/summary, `side-main` for nav + content). No `lg:grid-cols-3 col-span-2`, no `lg:sticky lg:top-s6` (use `Columns` sticky).
3. Cards: no `p-*` / `gap-*` on `Card`; action in `footer`; titles `text-h3`; clamp where titles may wrap.
4. Spacing: only `stack-*` / `row-*` / `gap-tight|base|loose|section|grid`; lists of rows are `ListRow`.
5. Loading: `SkeletonCards` / `SkeletonRows` / `PageSkeleton`. Empty/error: `EmptyState` (not wrapped in a Card).
6. Interactive: `Button` / `LinkButton` / `IconButton` / `Tabs` / `Tile` / `pill-btn` / `check-row` / `link-row`; no one-off `hover:bg-*`; no `<select>`.
7. Buttons in a row share one size; primary action top-right of `PageHeader`.
8. Run `pnpm --filter @kairos/app test src/styles` before committing.

## layout recipes (short)
- Wide screens use grids, not thin floating columns: dashboards `SpanGrid`/`Columns`; settings-like pages `TwoColumnPage`; lists of cards `CardGrid`.
- Vertical rhythm: blocks in a `Page` are 32px apart; cards in a row 24px; card internals 16px.

## enforcement
`app/src/styles/consistency.test.ts` scans `src/**/*.{tsx,css}` (not tests, `tokens.css`, `cbt/`, `landing/PaletteDemo.tsx`, `landing/cbtDemo.css`) and fails on: hex colours, `border`/`divide`/`shadow`/`ring`/`outline` utilities or CSS, gradients, arbitrary Tailwind values (`p-[13px]`), numeric spacing utilities, `text-sm`-style sizes, raw px/rem in CSS margin/padding/gap/font-size. `app/e2e/responsive.spec.ts` fails on horizontal overflow for public pages at 320-2560.

## do / don't
- Do separate with tint layers; do use `Divider` only when whitespace is not enough; do pair status colour with a word and icon.
- Don't add a border "just for contrast"; pick the next tint. Don't add `shadow`. Don't hard-code px, hex or one-off margins. Don't use red/green.
- Diagram images keep a white backing (`--img-backing`) in dark mode (deliberate, borderless).
