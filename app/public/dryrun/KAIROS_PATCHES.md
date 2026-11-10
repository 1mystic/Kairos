# Kairos patches to the embedded DryRun site

Source: github.com/1mystic/DryRun (owner's own project), commit fd2a28112613f512285a9fd9dd49fbed4b7b756a (2026-10-13).
Copied: `index.html`, `css/`, `js/`, `assets/`. Not copied: `.git`, `tools/`, `dist/`, docs.
Served at `/dryrun/`. Kairos frames it same-origin: `/dryrun/?embed=1#/p/<slug>`.

## Patches (all no-ops when `embed` is absent and the page is not framed)
1. `index.html`: the existing inline theme script also adds class `embed` to `<html>` when the query has `embed=1`.
2. `css/style.css` (appended): `html.embed` hides `.top` (top bar), `footer`, `.crumbs`, `#storewarn`; reduces `.page` padding; `.view` min-height 0.
3. `js/app.js`:
   - `kx(msg)`: `postMessage` to `window.parent` (same origin only), only when framed.
   - posts `{type:'dryrun:ready', slug}` after a problem page renders, and `{type:'dryrun:done', slug, done}` when "Mark done" is toggled.
   - `message` listener (same-origin only): `{type:'kairos:theme', theme:'light'|'dark'}` sets `data-theme` and `localStorage['dr-theme']`.
   - `storage` listener: live switch when `dr-theme` changes in another tab/frame.
   - Theme at load already honours `localStorage['dr-theme']` (unpatched behaviour).
4. No new runtime CDN. Google Fonts link unchanged (system-font fallback in CSS).

## CSP inventory (for the `/dryrun/**` header)
- Inline scripts: 1 (`<head>` theme/embed bootstrap in index.html). Needs `'unsafe-inline'` in script-src (or a hash).
- Inline styles: `style=` attributes in index.html (5), and `style.*`/`cssText`/innerHTML-with-style in js/app.js, hl.js, viz.js. Needs `style-src 'unsafe-inline'`.
- No `eval` / `new Function` / inline event-handler attributes found.
- External resources at page load: `https://fonts.googleapis.com` (css), `https://fonts.gstatic.com` (font files). Inline `data:` favicon.
- External `fetch` (only optional features): AI providers in `js/ai.js` (api.openai.com, api.anthropic.com, api.groq.com, openrouter.ai, generativelanguage.googleapis.com, api.mistral.ai, api.deepseek.com, api.cerebras.ai, integrate.api.nvidia.com, models.github.ai, dashscope-intl.aliyuncs.com, localhost:11434), problem lookup (`leetcode-api-pied.vercel.app`, `alfa-leetcode-api.onrender.com`), AnkiConnect (`http://127.0.0.1:8765`). All user-initiated from `#/gen`, `#/anki`. Header uses `connect-src https: http://127.0.0.1:8765 http://localhost:*`.
- Other URLs are plain `<a href>` links (leetcode.com, ankiweb.net, docs, key pages): not subject to CSP.
- Uses `localStorage` keys `dr-done`, `dr-theme`, `dr-mine`, `dr-ai`, `dr-session` (shared with Kairos origin: namespaced by `dr-`).
