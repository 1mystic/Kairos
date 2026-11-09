# A4 · Launch hygiene + app shell (audit notes)

Static review and edits only; nothing was run (no tests, tsc or build). Verify with `pnpm lint`, `tsc --noEmit`, `pnpm --filter @kairos/app test`, `vite build`.

## App shell (`App.tsx`)
- Every route group is mounted exactly once: practice, analysis, diagnostic (`/diagnostic`, `/mocks/new`), upload (+`/bank`), cbt pages (`/mocks`, result), onboarding, roadmap, admin, plan, settings inside `ProtectedRoute > AppLayout`; the exam runner `/exam/:paperId` is inside `ProtectedRoute` (guests admitted) but outside `AppLayout`.
- No duplicate paths. Precedence is handled by React Router ranking (static beats dynamic): `/practice/summary/:sessionId` over `/practice/:exam/:chapter`, `/mocks/new` and `/mocks` are different paths, `/exam/:paperId/result/:mockId` differs from `/exam/:paperId`, `/analysis/mock/:mockId` is mounted.
- Lazy split (`app/src/shell/lazyRoutes.tsx`): practice, analysis, diagnostic, onboarding, plan, roadmap, admin, cbt pages and the exam runner are `React.lazy` with the shared `PageSkeleton` (exam: `Spinner`). Upload was already split. Landing, auth, Home, Settings, Legal and AppLayout stay in the main chunk. The paths are listed in `lazyRoutes.tsx`; if a feature adds a route to its `*Routes` array, add its path there too (a missing path renders nothing). Nothing heavy is prefetched.
- `ErrorBoundary` wraps all routes (resets on navigation); `NotFound` is the catch-all (AppLayout for users/guests, `PublicShell` for visitors). `installTelemetry` is already called in `main.tsx`. The config-error screen now uses Page/PageHeader/EmptyState.
- Tests: `shell/ErrorBoundary.test.tsx` (written, not run).

## SEO / PWA
- `robots.txt`, `sitemap.xml`, canonical, OG/Twitter (url + image), light/dark theme-color, title/description mention JEE Main, NEET UG, IAT and GATE DA.
- Icons drawn with Pillow from the SVG geometry: `public/icons/{icon-192,icon-512,maskable-512,apple-touch-icon}.png`.
- Workbox: `navigateFallback: index.html` with a denylist for `/bank`, `/img`, `/__/` (Firebase Auth handler must reach the network), robots/sitemap. bank and img remain out of precache and runtime-cached. Fonts are runtime-cached.
- Offline behaviour: the app shell loads offline; practice works offline for banks already fetched; guest data is local. Not-yet-cached bank shards fail with the bank client's normal error.

## Hosting (`firebase.json`)
- Kept the `ignore` list (bank v1-v3 excluded) and the auth block.
- Caching: immutable `/assets/**`, `/bank/v*/**`, `/img/**`; no-cache `index.html`, `sw.js`, `bank/latest.json`; 1 h for robots/sitemap.
- `.json.gz`: `Content-Type: application/gzip`, no Content-Encoding. `bank/client.ts` fetches an ArrayBuffer and gunzips with `DecompressionStream` (it also tolerates an already-decompressed body): matches.
- Security: nosniff, strict-origin-when-cross-origin, minimal Permissions-Policy on all paths. `X-Frame-Options: DENY` only on `/` and app pages, deliberately NOT on Firebase's reserved `/__/` paths, because the Auth iframe on `kairos-76a0d.firebaseapp.com` is framed cross-origin by the app.
- CSP is `Content-Security-Policy-Report-Only`, not enforced: a wrong enforced CSP would break sign-in and I could not test it. It allows apis.google.com (gapi for the popup), accounts.google.com and `*.firebaseapp.com` frames, Firestore/Identity Toolkit/securetoken/www.googleapis.com connects, `worker-src 'self' blob:`, `style-src 'unsafe-inline'` (KaTeX), and a SHA-256 hash for the inline theme script in `index.html` (if that script changes, update the hash). Promote to enforcing after a clean console on the live site.

## Legal (`pages/Legal.tsx`)
Privacy and Terms rewritten; placeholders are accent chips. `LEGAL_LAST_UPDATED` constant. Minors section has both variants in a JSX comment.

## Nav (`pages/AppLayout.tsx`)
Roadmap added to the nav; `built` flag removed; custom `NavItem` so nested routes stay active (`/exam/*` highlights Mocks); mobile tab bar stays at 4 tabs (Home, Practice, Mocks, Settings), and the other entries (Plan, Upload, Analysis, Roadmap) appear in the phone account menu. Skip link, `#main` focus target, focus moves to the page `h1` on route change. `useDocumentTitle` in `shell/`. Admin is not linked (reach by URL; gated).

## Owner must supply
`[CONTACT EMAIL]`, `[GRIEVANCE OFFICER NAME/EMAIL]`, `[LEGAL ENTITY / ADDRESS]`, `[CITY / JURISDICTION]`, deletion time frame, minors decision (docs/14 blocker 4), review of both legal documents by a lawyer, promote CSP after testing.

## Not verified
Build size, lazy chunk behaviour, CSP violations, existing `App.test.tsx` under lazy routes (practice mock still applies to the dynamic import), glob syntax `@(a|b)` in Hosting header sources, icon look on devices.
