# Kairos · brand

**name:** Kairos (καιρός) — "the right moment". the app's job is picking the right question at the right time before your exam. (working name — check trademark + domain before launch; alt: Metis, Praxis.)
**tagline:** the right question, at the right time.
**voice:** calm senior who's done it. direct, warm, no hype, no guilt. "you're 2 days behind — here are two ways to fix it." never "you failed!". hindi-english code-mix ok in tips.

## colour — brand palette = 3 colours; plus semantic status colours (owner decision 2026-11-08, updated)
neutrals (ink → paper greys) + **indigo** + **saffron**. nothing else in the product UI.
| token | hex | use |
|---|---|---|
| ink | #0E1330 | text, dark bg |
| slate / paper / surface | #5B6178 / #FAFAF7 / #FFFFFF | neutral greys |
| surface-2 / surface-3 | #F1F2F7 / #E5E7F0 (dark #1A2046 / #262D5C) | tint layers replacing borders: cards / fields, hover, tracks |
| line | #E3E5EC | 1px tinted rule, dividers only, sparingly |
| primary (indigo) | #3A3FD9 | buttons, links, active, **on track** |
| primary-50 | #EEF0FF | tints, selected rows |
| accent (saffron) | #F5A524 | countdown, streaks, highlights, **slightly behind** (tint) / **behind** (solid) |
| accent-ink | #9A5B00 | saffron for TEXT on light bg (contrast ≥4.5:1): form errors, warnings |
**semantic status colours (allowed, to indicate meaning better; the 3-colour limit was for UI consistency, not a ban on green/red):**
| token | use |
|---|---|
| good (green) `--good` / `--good-50` / `--good-ink` / `--on-good` | correct, success, saved, on track, improved |
| warn (saffron) = accent | needs attention, slightly behind, expiring |
| bad (red) `--bad` / `--bad-50` / `--bad-ink` / `--on-bad` | wrong, error, behind, failed, destructive actions |
Rules: semantic colours carry MEANING only (never decoration); always paired with an icon or words (accessibility: never colour alone); brand/interactive stays indigo; text on tints uses the `-ink` variants (≥4.5:1); classes live in `app/src/styles/semantic.css` (`chip-good/bad/warn`, `banner-good/bad`, `card-good/bad`, `btn-success`, `btn-danger`, `btn-danger-ghost`, `opt-right/wrong`, `progress-good/bad`, `text-status-*`).
**CBT exam screen is the only exception** — `--cbt-*` tokens mimic NTA exactly (realism > brand).

## type
- UI + headings: **Plus Jakarta Sans** (variable; geometric, neat). headings 600–700, body 400–500. `tabular-nums` for timers/scores.
- math: KaTeX (+ **mhchem** for `\ce{}` / `\pu{}` chemistry). hindi: Noto Sans Devanagari (later).

## question media
- images: webp only, content-addressed `/img/{id}.w{480|960}.webp`, inline in markdown as `![alt](img:<id>)`, metadata `{id,w,h,alt,variants}` in the question → client renders `<img srcset sizes width height loading=lazy decoding=async>` (no layout shift), service worker cache-first. ≤80KB per variant. alt text required.
- dark mode: images keep a white backing card (diagrams are drawn on white); never invert.

## logo
`logo.svg` — a K whose diagonal is an hourglass waist; the saffron dot = the moment. mark alone = `logo-mark.svg` (app icon, favicon). min size 20px. clear space = height of the dot.

## ui feel
**flat.** no borders, no outlines, no box-shadows, no gradients (sole exception: the landing countdown ring, indigo to saffron). layers are made of tints: paper > surface > surface-2 (cards) > surface-3 (fields, hover, tracks); primary-50 for selected/hero. one spacing scale (4/8/12/16/24/32/48/64), radius 16 cards / 12 buttons + inputs / pill chips, 8px grid, big tap targets (>=44px), dark mode first-class (students study at night). focus = 2px primary ring (focus-visible only). full rules: `docs/10_DESIGN_SYSTEM.md`.
