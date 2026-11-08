# 07 · Free-tier constraints (overrides 02_ARCHITECTURE where they conflict)

**Hard rule: Firebase Spark plan only. No billing account, ever.** Owner is in India. If something needs Blaze, use a free third party (Cloudflare first) or defer it.

Firebase project: `kairos-43000` (single project for now; `dev` = emulators).

## what we use on Spark (free, no card)
| need | service | Spark limit (VERIFY at build time) |
|---|---|---|
| sign-in | Firebase Auth: **Email/Password + Google** (replaces email-link in CLAUDE.md) | no practical cap for these providers on legacy Auth; do NOT upgrade to Identity Platform |
| user state | Firestore, location `asia-south1` | 50k reads / 20k writes / 20k deletes per day, 1 GiB |
| app hosting | Firebase Hosting | 10 GB stored, **~360 MB/day transfer** ← tightest limit |
| abuse guard | App Check (reCAPTCHA v3) | free |
| push | FCM (client registration free; sends come from a Cloudflare Worker cron) | free |
| CI / pipeline | GitHub Actions | free minutes |

## what is NOT available on Spark → replacement
| docs said | replacement |
|---|---|
| Cloud Functions (grade, leaderboard, digest, moderate) | **Cloudflare Workers** free (100k req/day, cron triggers). Worker verifies Firebase ID token via Google JWKS, writes Firestore via REST with a service-account key stored as a Worker secret. Code lives in `/worker` (was `/functions`). Not needed until phase 4. |
| Cloud Storage (uploads, images) | static images bundled into the bank build; if Hosting transfer gets tight, serve `/bank` + `/img` from **Cloudflare Pages** (unlimited bandwidth) or R2 (10 GB free). Bank base URL is config (`VITE_BANK_BASE_URL`), never hard-coded. |
| budget alert + kill-switch fn | not needed: Spark has hard caps, no bill. Instead: client-side write budget guard + graceful "quota reached, saved offline" state. |
| Blaze + ₹500 budget | removed |

## consequences for the roadmap
- phases 0–3: no server at all. PYQ replay + practice graded **in the browser** (PYQ keys are public anyway).
- "mock keys never ship to the client" stays true: shared/all-India mocks (phase 4) are graded by the Worker.
- user uploads (BYO paper) are text/JSON only → Firestore `users/{uid}/bank`; no image uploads until a free image host is chosen.
- Phase 0 "ingest 5k items" needs a vision LLM for PDF extraction = a paid API. Pipeline is built and tested on fixtures first; bulk ingest waits on owner's choice of extractor (free options: open datasets like JEEBench, Marker/MinerU locally).
- Python is 3.12 locally (docs say 3.11; code must run on both).
