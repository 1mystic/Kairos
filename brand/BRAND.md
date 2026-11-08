# Kairos · brand

**name:** Kairos (καιρός) — "the right moment". the app's job is picking the right question at the right time before your exam. (working name — check trademark + domain before launch; alt: Metis, Praxis.)
**tagline:** the right question, at the right time.
**voice:** calm senior who's done it. direct, warm, no hype, no guilt. "you're 2 days behind — here are two ways to fix it." never "you failed!". hindi-english code-mix ok in tips.

## colour — 3 colours max (owner decision 2026-11-08)
neutrals (ink → paper greys) + **indigo** + **saffron**. nothing else in the product UI.
| token | hex | use |
|---|---|---|
| ink | #0E1330 | text, dark bg |
| slate / line / paper / surface | #5B6178 / #E3E5EC / #FAFAF7 / #FFFFFF | neutral greys |
| primary (indigo) | #3A3FD9 | buttons, links, active, **on track** |
| primary-50 | #EEF0FF | tints, selected rows |
| accent (saffron) | #F5A524 | countdown, streaks, highlights, **slightly behind** (tint) / **behind** (solid) |
| accent-ink | #9A5B00 | saffron for TEXT on light bg (contrast ≥4.5:1): form errors, warnings |
status = good→primary, warn→accent tint, bad→accent solid + plain words. no green/red in product UI.
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
flat, roomy, 8px grid, radius 10 (cards) / 8 (buttons), no gradients except the countdown ring. dark mode first-class (students study at night).
