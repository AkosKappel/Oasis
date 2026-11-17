# Sync and shared spaces design

Status: proposal, 2026-11-17. Covers backlog X-01 (optional cloud synchronization) and X-02 (shared spaces). Nothing here is implemented. The owner must choose a provider before any code is written; the open decisions are listed at the end.

## Goals

- Sync is opt-in. Oasis keeps working fully offline and without an account; turning sync off never deletes local data.
- A person can use the same spaces on several browsers and devices, with predictable results when the same item changes in two places.
- Privacy promises stay true: no telemetry, no developer access to bookmark content where avoidable, host access requested only when sync is enabled.
- Later, a space can be shared with other people (X-02) without changing the data model again.

Non-goals for the first version: real-time collaborative text editing, syncing to the browser's own bookmark tree, and server-side search.

## What syncs

The unit of sync is a space. Each table is already space-scoped (`spaceId`) with `createdAt`, `updatedAt` and `deletedAt` tombstones, which is most of what a sync protocol needs.

| Data                                                                                                                        | Sync                                                       | Reason                                                                                |
| --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| spaces (name, icon, color)                                                                                                  | Yes                                                        | Needed to match spaces across devices.                                                |
| bookmarks, folders, tags, notes                                                                                             | Yes                                                        | Core content. Cached favicon and preview images are optional (size).                  |
| savedSearches, libraryPreferences (view, sort, folder order, Links view)                                                    | Yes                                                        | Small, user intent. `trackOpens` stays per device.                                    |
| preferences (appearance), dashboardLayouts, homeWidgets, widgetTasks, quoteCollections, quotes, quoteSettings, desktopItems | Yes                                                        | Small, and users expect the same Home.                                                |
| pageTexts (saved page copies and highlights)                                                                                | Optional, off by default                                   | Up to 100,000 characters each; private reading material.                              |
| albums, albumImages, backgrounds                                                                                            | Album metadata yes, image data optional and off by default | Images are large (data URLs) and dominate storage cost. Built-in albums need no sync. |
| contentFeedback (likes and dislikes)                                                                                        | Yes                                                        | Small; affects daily rotation everywhere.                                             |
| dailyFocus                                                                                                                  | Yes                                                        | One small record per day.                                                             |
| focusSessions                                                                                                               | No                                                         | Timers are per device; syncing a running deadline across devices is surprising.       |
| weatherSettings and cache                                                                                                   | City and units yes, cache and host grants no               | Grants are browser state; caches are cheap to refetch.                                |
| Open counts and last-opened times on bookmarks                                                                              | No                                                         | Personal usage history; also noisy writes. Kept as device-local fields.               |

The complete-space backup (`src/database/space-backup.ts`) already validates every one of these tables and remaps IDs. Sync should reuse those validators for anything received from a server, the same way restore does.

## Provider options

Figures checked on 2026-11-17 and subject to change; confirm on the official pages before choosing.

| Option                                                    | Cost and limits                                                                                                                                                                                                                                                  | Auth in an MV3 extension                                                                                                                                                  | Conflicts and offline                                                                       | E2E encryption                                                                               | Notes                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| User-owned file (Google Drive `appDataFolder`, or WebDAV) | No backend for the owner to run or pay for. Uses the user's own quota.                                                                                                                                                                                           | `chrome.identity.launchWebAuthFlow` with OAuth PKCE; Firefox supports `identity.launchWebAuthFlow` too. Drive needs a Google OAuth client and verification for the scope. | Whole-file snapshots; Oasis merges records locally on download.                             | Straightforward: encrypt the file before upload.                                             | No sharing between users beyond file sharing. Edge and Firefox users need a Google account (or WebDAV).   |
| Supabase (Postgres, Row Level Security, Auth)             | Free plan reported as 500 MB database, 50,000 monthly active users, projects paused after a week of inactivity; Pro from $25 per month ([pricing](https://supabase.com/pricing), [summary](https://automationatlas.io/answers/supabase-free-tier-limits-2026/)). | Email magic link or OAuth via `launchWebAuthFlow`; tokens in `chrome.storage.local`.                                                                                      | Row-level upserts with server timestamps; change feed via `updated_at` queries or Realtime. | Possible for content fields; row metadata (IDs, timestamps, space membership) stays visible. | RLS fits shared spaces well. Open source, can be self-hosted.                                             |
| Firebase / Cloud Firestore                                | Spark plan: 1 GiB stored, 50,000 reads, 20,000 writes and 20,000 deletes per day ([pricing](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [quotas](https://firebase.google.com/docs/firestore/quotas)).                             | Firebase Auth works in extensions with some MV3 workarounds (no remote code; bundle the SDK).                                                                             | Built-in offline cache, but it duplicates Dexie.                                            | Same as Supabase.                                                                            | Proprietary; per-document billing makes initial uploads of large libraries expensive in reads and writes. |
| PocketBase (self-hosted)                                  | Owner runs and pays for a server (could live on the home server).                                                                                                                                                                                                | Built-in auth with OAuth providers.                                                                                                                                       | Record API and realtime subscriptions.                                                      | Same as Supabase.                                                                            | Single binary, simple, but the owner becomes the operator for every user.                                 |
| CRDT (Automerge or Yjs) with a relay                      | Relay hosting cost; documents grow with history.                                                                                                                                                                                                                 | Depends on relay.                                                                                                                                                         | Best merge semantics, including concurrent text.                                            | Relays can carry encrypted updates.                                                          | Requires replacing the record-and-tombstone model; large rewrite for little gain on bookmark-shaped data. |
| `chrome.storage.sync`                                     | Free, but 100 KB total, 8 KB per item, 512 items ([limits](https://chromium.googlesource.com/chromium/src/+/main/extensions/common/api/storage.json)).                                                                                                           | None needed.                                                                                                                                                              | Browser-managed.                                                                            | Possible.                                                                                    | Too small for libraries; fine only for a few preferences. Not shared across browser vendors.              |

### Recommendation

1. Personal sync first, through a user-owned encrypted file (Google Drive `appDataFolder`), merged record by record. It needs no backend, keeps the developer out of the data, reuses the complete-space backup format and validators, and costs nothing to run.
2. Shared spaces later on Supabase, because sharing needs a server that enforces membership (Row Level Security). The record model below works for both, so phase 1 is not throwaway.

If the owner prefers one provider from the start, Supabase is the better single choice: it covers personal and shared sync, is open source and can be self-hosted. The trade-off is running a service with costs, account deletion duties and a privacy policy that names a processor.

## Sync model

### Records and versions

- Keep the existing record shape. Add `rev` (an integer incremented on every local write) and `deviceId` of the last writer to synced tables.
- Use a hybrid logical clock (`hlc`) instead of raw `updatedAt` to order writes, so a device with a wrong clock cannot silently win every conflict. `updatedAt` stays for display.
- Deletion stays a tombstone (`deletedAt`). Tombstones sync like any change and are purged only after every known device has acknowledged them, or after 90 days.

### Change tracking

- Dexie v28 (or the next free version) adds a `syncState` table: per space, the last pulled cursor and the device ID; and an `outbox` table with an index on `[spaceId+table]`.
- Repositories already write inside Dexie transactions. Each write adds an outbox entry in the same transaction, so a crash cannot lose a change. One helper in `src/database/records.ts` keeps this out of every repository.
- Push sends outbox entries in batches; pull applies remote records through the backup validators, then writes them in one transaction per batch.

### Merging

- Default: last writer wins per record by `hlc`.
- Field-level merge for records where two fields commonly change independently: bookmarks (title vs. tags vs. notes vs. folder), and appearance preferences.
- Notes and page-text highlights already carry revision checks in the UI. On a sync conflict, keep the newer text and attach the other version as a conflict copy the user can review, rather than merging prose.
- Manual order uses sparse `sortOrder` ranks. Concurrent moves can produce equal ranks; ties already break by ID, and a later rebalance fixes gaps.

### First sync of an existing library

Two devices that already have content must merge, not overwrite. The first pull matches records by ID; content created independently (different IDs, same URL) is left as is and surfaced through the existing duplicate review. Spaces are matched by ID; a same-named local space is never silently merged.

### Version negotiation

Each pushed batch carries the Dexie schema version. A device that receives records from a newer schema stores them untouched in a holding table and asks the user to update Oasis, instead of dropping unknown fields. Older devices must never rewrite fields they do not understand: merges preserve unknown properties.

## Conflict cases

| Case                                                | Outcome                                                                                                                                                   |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Same bookmark edited on two devices                 | Field-level merge; if the same field changed, newer `hlc` wins and the other value goes to the conflict list.                                             |
| Folder moved into a folder deleted elsewhere        | The deleted parent's tombstone wins; the moved folder becomes top level. Existing orphan and cycle recovery in the Links tree already handles this shape. |
| Folder cycle created by two concurrent moves        | Detected on apply; the later move is reverted to top level (the same rule `linkGroups` uses to break imported cycles).                                    |
| Same URL saved offline on two devices               | Both kept; the duplicate review groups them. No automatic merge, matching M-02.                                                                           |
| Tag renamed on one device, deleted on another       | Delete wins; bookmarks lose the tag as they do on a local delete.                                                                                         |
| Tag created with the same name on two devices       | Names are unique per space: the later tag is merged into the earlier one and its assignments moved.                                                       |
| Notes edited concurrently                           | Newer text kept, older kept as a conflict copy.                                                                                                           |
| Desktop items placed in the same cell               | The later item moves to the next free cell.                                                                                                               |
| Space deleted on one device while edited on another | Delete wins after a confirmation on the other device the next time it syncs, offering a complete-space backup download first.                             |

## Security and privacy

- End-to-end encryption is recommended for personal sync: derive a key from a user passphrase with PBKDF2 or Argon2id (WebCrypto supports PBKDF2 natively), wrap a random data key, and encrypt each record or file with AES-GCM. The provider then sees only sizes, timestamps and counts.
- Losing the passphrase means losing synced data; the local copy remains. The UI must say this before enabling.
- With Supabase, Row Level Security policies restrict every table to the owner or space members. The anon key is public by design; never ship a service-role key.
- Host access is requested at opt-in for exactly the provider origins (for example `https://www.googleapis.com/*` or the Supabase project URL), declared as optional host permissions like weather.
- PRIVACY.md and the store listing must then describe: what is uploaded, where it is stored, whether it is encrypted, retention, how to delete the account and remote data, and that sync is off by default.
- Account deletion removes remote data; turning sync off offers to delete remote data or keep it.

## Shared spaces (X-02)

- Roles: owner (manage members, delete space), editor (change content), viewer (read only). Enforced by the server, mirrored in the UI.
- Invitations by link with an expiring token, accepted after sign-in.
- With end-to-end encryption, each shared space has its own key, wrapped for each member's public key; removing a member rotates the key.
- Personal data stays personal in a shared space: open counts, content likes and dislikes, focus timers and daily focus remain per person.
- Conflicts are shown in a small "Changes from others" review instead of silent overwrites for notes and page text.

## Phased plan

1. **Sync groundwork (no network).** Add `rev`, `hlc`, `deviceId`, the outbox and `syncState` in one Dexie version with migration tests. Done when every repository write produces exactly one outbox entry in its transaction, and existing tests pass.
2. **Merge engine.** A pure function that applies a batch of remote records to a local snapshot using the rules above. Done when the conflict table is covered by unit tests, including cycles, tombstones and unknown fields.
3. **Personal file sync.** Encrypted snapshot plus change log in the user's chosen storage, manual "Sync now" first, then periodic sync while a tab is open. Done when two browser profiles converge in an end-to-end test using a fake storage server.
4. **Settings and recovery.** Sync status, last sync time, conflict list, passphrase change, turning sync off, remote data deletion. Done when every state has a tested message.
5. **Shared spaces on a server.** Membership tables, RLS policies, invitations, per-space keys. Done when a three-user test (owner, editor, viewer) passes against a local Supabase instance.

Testing: Dexie migration tests for each version, unit tests for the merge engine, a fake server for deterministic multi-device tests, and one Playwright flow with two browser contexts.

## Decisions for the owner

1. Personal sync through user-owned storage first, or one hosted provider (Supabase) for everything?
2. If hosted: who pays and in which region, and is self-hosting on the home server acceptable?
3. End-to-end encryption required, optional, or not offered?
4. Should image albums and saved page text be syncable at all, given their size?
5. Which sign-in methods: Google only, email magic link, or both? Firefox and Edge users need a path that does not require a Google account.
6. Are shared spaces (X-02) in scope for the first public release, or later?
