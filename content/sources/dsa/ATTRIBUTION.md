# DSA content: DryRun

- Source: https://github.com/1mystic/DryRun, the project owner's own work (explanations, code and visuals are original to that project; LeetCode problem titles belong to their owners, DryRun is not affiliated with LeetCode).
- Retrieved: 2026-11-10 (shallow clone, upstream commit `fd2a28112613f512285a9fd9dd49fbed4b7b756a`, dated 2026-10-13).
- Copied verbatim to `app/public/dryrun/`: `index.html`, `css/`, `js/`, `assets/`. Not copied: `.git`, `tools/`, `dist/`.
- Patched (details in `app/public/dryrun/KAIROS_PATCHES.md`): `?embed=1` chrome hiding, theme sync (`dr-theme`), `postMessage` hooks. No content changed.
- Derived: `app/public/dsa/catalog.json` (metadata only, no code bodies) and `pipeline/bank_src/dsa_interview.json` (practice questions; license text "Derived from the owner's DryRun project").
- Attempt data is never sent to DryRun; the embedded site only uses its own `localStorage` keys (`dr-*`).
