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
| colour | `ink paper surface surface-2 surface-3 slate line primary primary-hover primary-50 accent accent-ink accent-50 scrim img-backing` (+ `--cbt-*`, untouched) |
| spacing (rem) | `--space-1..8` = 4 8 12 16 24 32 48 64 px. Tailwind: `p-s4 gap-s3 mt-s6` ... (`s1..s8`). **Numeric `p-4` / `gap-3` are banned.** |
| layout | `--gutter` 16 / 24 (md) / 32 (lg); `--card-pad` 16 / 24 (md); `--gap-card` 32 (between cards/blocks); `--gap-section` 48, 64 from lg (landing sections); `--w-app` 1120 (1280 at 2xl, 1360 at 3xl); `--w-landing` 1120 (1360 at 3xl); `--w-reading` 720; `--w-form` 440; `--measure` 68ch |
| radius | `--radius-card` 16, `--radius-btn` 12 (buttons, inputs), `--radius-pill` |
| type | Plus Jakarta Sans Variable. `text-display` clamp(32px, 4vw+8px, 48px) / `text-h1` 28 / `text-h2` 22 / `text-h3` 18 / `text-body` 16 / `text-small` 14 / `text-caption` 12. Weights 400/500/600/700. Headings tracking -0.02em, `tabular` for numbers. Banned: `text-xs..text-9xl`. |
| safe areas | `--safe-t/b/l/r` = `env(safe-area-inset-*)`, used by topbar, tab bar, landing header |

### breakpoints (defined once)
`xs 480 · sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536 · 3xl 1920` (Tailwind `xs:` ... `3xl:`; CSS media queries use the same literals).
- `< lg`: top bar + bottom tab bar (Home, Practice, Mocks, Settings). `lg-xl`: slim icon sidebar (72px, `title`/`aria-label` on items). `>= xl`: labelled 240px sidebar with "soon" pills. Items not built are muted, not links.
- Large screens: `--w-app` grows modestly (1120 > 1280 > 1360), text measure stays <= 68ch (`max-w-measure`), root font scales to 17px at >= 1920 and 19px at >= 2560 (all rem tokens follow, so spacing and type scale together). Landing max width 1120 > 1360 at 3xl.
- Phones: tab bar and header respect safe-area insets; landscape phones use the tab bar (width < 1024). Check at 320.

## components (`app/src/components/ui.tsx`)
Layout: `Page{width:'app'|'reading'|'form'}` · `PageHeader{title,subtitle,actions}` · `Section{title,aside}` · `Stack{gap}` / `Inline{gap}` (`gap: tight 8 | base 16 | loose 24 | section 32`) · `Divider` · **`DashboardGrid`** (6-col grid; children use `dash-hero` (4 cols x 3 rows from lg), `dash-third`, `dash-half`) · **`TwoColumnPage{nav}`** + **`StickySideNav{items,active,onSelect,label}`** (sticky left nav from lg; without `onSelect` items are `#anchor` links; `soon` items are muted) · **`SettingsSection{id,title,description,active}`** (titled card; rows get a rule between them; from lg only the `active` section shows, below lg all stack) · **`SettingRow{label,description,children}`** (label + description left, control right, stacks on phones). Use these for Analysis, Plan, Upload / My questions.
Controls: `Button{variant:primary|secondary|ghost,size:sm|md|lg,block,loading}` · `LinkButton` (same props + `to`) · `IconButton{label}` · `Input` `Select` `Textarea` (`invalid`) · `Field` `SelectField` `TextareaField` (`label,hint,error`).
Surfaces: `Card{tone:default|primary}` · `Tile{title,body,icon,to|onClick|soon}` · `Chip{tone:neutral|primary|accent}` (`Pill`) · `Tabs{tabs,value,onChange,label}` (segmented, arrow keys) · `Stat{label,value,hint}` · `ProgressBar{value,max,label}` · `Skeleton` · `EmptyState{icon,title,action}` · `StatusLine{done}`.
Overlays/feedback: `Modal` (alias `Sheet`; focus trap, Esc, scrim click, restores focus; bottom sheet on phones) · `Toast` (alias `Notice`) · `Banner{tone,icon,actions}` · `FormError` · `AuthShell` (centred form; two panes from lg with a primary-50 brand panel) · `Logo` `LogoMark` `Spinner`.
Shell: `pages/AppLayout.tsx` (`NAV` list controls sidebar and tab bar).
Icons: `components/icons.tsx`, 24px, stroke 1.75, rounded.

## layout recipes
- Wide screens use grids, not thin floating columns: dashboards use `DashboardGrid`; settings-like pages use `TwoColumnPage`; lists of cards use `.grid-auto` (auto-fit, min 18rem, no orphans). Centred single columns are for auth only.
- Vertical rhythm: blocks in a `Page` are 32px apart; card internals use `gap-base/loose`; landing sections use `--gap-section`.

## enforcement
`app/src/styles/consistency.test.ts` scans `src/**/*.{tsx,css}` (not tests, `tokens.css`, `cbt/`, `landing/PaletteDemo.tsx`, `landing/cbtDemo.css`) and fails on: hex colours, `border`/`divide`/`shadow`/`ring`/`outline` utilities or CSS, gradients, arbitrary Tailwind values (`p-[13px]`), numeric spacing utilities, `text-sm`-style sizes, raw px/rem in CSS margin/padding/gap/font-size. `app/e2e/responsive.spec.ts` fails on horizontal overflow for public pages at 320-2560.

## do / don't
- Do separate with tint layers; do use `Divider` only when whitespace is not enough; do pair status colour with a word and icon.
- Don't add a border "just for contrast"; pick the next tint. Don't add `shadow`. Don't hard-code px, hex or one-off margins. Don't use red/green.
- Diagram images keep a white backing (`--img-backing`) in dark mode (deliberate, borderless).
