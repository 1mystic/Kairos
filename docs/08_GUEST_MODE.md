# 08 · Guest mode (no sign-in, local-only)

Owner decision 2026-11-08: anyone can use Kairos as a **guest** without signing in. Their data stays on their device. Later they are invited, never forced, to sign in to save progress across devices.

## decisions
- **No Firebase auth for guests.** Not even Anonymous Auth: no Firestore reads or writes, no abandoned anon accounts, zero quota cost. A guest is purely local.
- **What guests can do:** everything that runs in the browser: practice, PYQ replay, exam screen, results, analytics, and later the planner (phases 0–3 are all client-side, see 07).
- **Sign-in required for:** cross-device sync, all-India mocks + leaderboards (phase 4, server-graded), BYO uploads to the community, push digests.
- **DPDP:** guests give no personal data. Name is optional (default "Guest"). No DOB is asked, because nothing leaves the device. DOB + consent are collected at sign-up, as today.

## storage abstraction (the rule that keeps this cheap)
All feature code goes through one interface; it never touches Firestore or IndexedDB directly.

```ts
interface UserStore {
  kind: 'local' | 'cloud';
  getProfile(): Promise<Profile | GuestProfile | null>;
  saveProfile(p): Promise<void>;
  getState(doc: 'mastery' | 'pace'): Promise<unknown | null>;
  putState(doc, data): Promise<void>;
  addSession(s: SessionDoc): Promise<void>;   // one batched write per session (CLAUDE.md)
  listSessions(opts): Promise<SessionDoc[]>;
  putPlan(date, plan) / getPlan(date); putMock(id, m) / listMocks(); putPaceLog(date, p);
}
```
- `LocalStore`: IndexedDB database `kairos-guest` via `idb`, with the same document shapes as the Firestore paths in docs/03.
- `FirestoreStore`: the paths from docs/03 under `users/{uid}`.
- `useStore()` returns LocalStore when signed out, FirestoreStore when signed in.
- On first guest visit, call `navigator.storage.persist()` so the browser is less likely to evict data.

## sign-in nudges (voice: calm, no guilt, see BRAND.md)
- A small persistent banner on Home: "Your progress is saved on this device only. Sign in to keep it safe." It can be dismissed for 7 days.
- Milestone prompts, at most one per day and each shown once:
  - after the first completed session or mock
  - after 3 active days
  - when the guest sets an exam date (the plan is worth keeping)
  - when local data passes ~50 sessions
- The prompt is always closable with "Not now". Never block a feature that works offline.
- Settings shows "Stored on this device", with export (JSON download) and a clear-data option.

## migration on sign-in / sign-up
1. After auth succeeds and the profile exists (sign-up or complete-profile done), check for a non-empty `kairos-guest` DB.
2. **New account (no cloud data):** upload everything. Use one `writeBatch` per ≤400 docs: sessions, mocks, plans, pace_log, state. Then mark the local DB as `migratedTo: uid`, and clear it after the next successful load.
3. **Existing account with data:** ask "Add this device's progress to your account?" [Add] [Discard local].
   - Add = append guest sessions and mocks (new ids, no overwrite).
   - For mastery/pace state, keep the cloud copy, and replay guest session events into mastery client-side if core supports it; otherwise keep cloud.
4. Migration is idempotent: keep the ids already uploaded, so a retry after a network drop doesn't duplicate.
5. Respect the write budget: if a guest has a huge history, upload the most recent 60 days of sessions and keep summaries for the rest. Say so plainly.
6. Firestore rules need no change: migrated docs follow the same owner-only schema.

## signing out
On sign out, return to guest mode with an empty local store. Cloud data stays in the cloud. Don't copy cloud data back to local.
