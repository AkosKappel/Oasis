# Architecture

Oasis is a Chromium Manifest V3 extension built with WXT and React. WXT generates the manifest and the TypeScript configuration.

## Layout

| Path                     | Contents                                       |
| ------------------------ | ---------------------------------------------- |
| `src/entrypoints/popup`  | Toolbar quick capture                          |
| `src/entrypoints/newtab` | The new-tab page                               |
| `src/features/<feature>` | UI, hooks and pure helpers of one feature      |
| `src/database`           | Dexie schema and the space-scoped repositories |
| `src/components/ui`      | shadcn/ui components (editable source)         |
| `src/styles.css`         | Tailwind CSS and shared design tokens          |
| `e2e`                    | Playwright tests against the built extension   |

## Data

- Dexie wraps IndexedDB in `src/database/schema.ts`. Version 1 defines spaces, bookmarks, folders and tags. IDs are strings and timestamps are epoch milliseconds.
- Opening a fresh database creates one Personal space in a transaction.
- Every record belongs to a space through `spaceId`, and repositories check that ownership inside their transactions.
- Deletion is soft: records keep a `deletedAt` tombstone, so a future sync can see deletions. The conflict resolution for sync is not designed yet.
- Bookmark writes validate titles and HTTP(S) URLs and reject embedded credentials.
- Folder names are unique among siblings and tag names per space, ignoring case. Deleting a folder clears it from its bookmarks; deleting a tag removes it from theirs. Folders with active subfolders cannot be deleted. Parent changes validate ownership and prevent cycles transactionally.
- Schema changes need a new Dexie version and a migration test.
- Open the database only from extension pages: ordinary web origins have separate storage.

- `src/database/backup.ts` validates and exports active Personal-space records. Restore checks the merged graph inside a write transaction, preserves existing active IDs and adds only missing records. It never removes records or revives tombstones.

## UI

- One Dexie live query reads bookmarks, folders and tags in a read transaction, so the UI updates when records change, including writes from other Oasis tabs.
- Dialogs use the native `<dialog>` element for focus containment and Escape handling.

- New tabs open Home; `#library` opens bookmark management. Home reads the same live query for favorites and opens the command palette on search submission.
- The command palette shares the library live query and filter helper. Its native modal keeps focus inside search and restores the previous focused element when closed.
- The popup reads the active tab and reuses the bookmark form and repositories. It offers folder/tag assignment and reports unsupported pages before saving.

## Permissions

The manifest declares `activeTab` so the toolbar popup can read the current page title and URL after a user opens it. An event-driven background worker registers context menus and a capture command. No content script or network integration is used. Record any additional permission in [DECISIONS.md](DECISIONS.md).

## Appearance

Dexie v2 adds a `preferences` table without changing library records. The appearance repository checks space ownership transactionally. Extension pages subscribe to its live query and resolve the system theme with `prefers-color-scheme`; CSS tokens apply to Home, Library, dialogs and popup.

## Search

`createBookmarkSearch` parses text and operators once per query and caches normalized fields and bounded word comparisons for that query. `filterBookmarks` intersects organization filters with search and returns stable relevance ordering. Library and the palette use the same helper; all matching runs locally.

Folder path and descendant helpers are shared by management, assignment, cards, filters and search. Folder filter counts include descendants; hierarchy uses the existing v1 `parentId` field.

## Browser bookmark transfer

The browser-only parser in `src/features/transfer` converts an inert HTML template into a typed import plan. `src/database/bookmark-html.ts` validates folder references and limits, maps source folders to active Personal-space records, deduplicates exact URLs within folders and commits additions atomically. Export validates the library graph before serializing escaped Netscape HTML. JSON and HTML controls share the Backup and restore dialog.

## Image albums

Dexie v3 adds `albums`, `albumImages` and `backgrounds`. Images are re-encoded locally and stored as JPEG data URLs. The album repository owns transactions, quota bounds, relationships and deletion tombstones; browser image preparation and archive decoding happen before writes. Home and the album dialog subscribe to one media snapshot. Album archives are independent from bookmark JSON/HTML.

## Quotes

Dexie v4 adds `quoteCollections`, `quotes` and `quoteSettings`. The repository owns validation, ownership, display selection and additive archives. Home chooses a daily entry from the selected active collection, while the dialog manages plain text and optional authors. Quote archives are separate from bookmark and image backups.

## Library preferences

Dexie v5 adds `libraryPreferences`. Its repository merges partial updates atomically and live queries synchronize tabs. Filtering/search runs before an explicit non-mutating sort; grid and list reuse the bookmark component and actions. Dates outside the browser's supported range display a fallback instead of breaking a row.

## Home links

Home's Links control opens a native nonmodal auto popover, rendered through a body portal. Dexie v8 adds the preferred side and desktop pinning to appearance settings. Pinned Links uses a nonmodal complementary panel with direct folder navigation; narrow screens retain the popover. It shares bookmark matching and descendant folder filtering with Library. Dexie v6 makes the old favorites row opt-in while preserving the rest of appearance settings. The panel uses normal app colors even over photo backgrounds.

Custom appearance colors are optional in Dexie v7. `colors.ts` handles normalization and contrast, while `apply-appearance.ts` resolves presets/custom fills and readable semantic tokens. The app owns a temporary preview; the appearance hook applies it locally and only persists explicit saves.

Context-menu and keyboard actions open `capture.html`; its request fragment is parsed once and removed before React mounts. The shared capture form validates the page/link and explicitly saves through the bookmark repository. `contextMenus` is the only additional permission.

## Storage recovery

`storage-health.ts` exposes an in-memory external store for recognized storage failures and a retry generation. Library, appearance, media, quote and view-preference live queries retain cached snapshots and resubscribe after retry. Database blocked/version-change events provide specific guidance. The recovery UI offers connection retry, separate Library/backups and image management; it never deletes or replaces saved data.

## Built-in albums

`src/database/builtin-albums.ts` describes immutable collections and image URLs under `public/albums/`. The album repository combines this catalog with owned local records for display. Background writes validate both catalog and local assignments in the existing space-scoped transaction. Built-in records are never persisted, edited or exported; custom archives reject reserved catalog IDs. Existing background settings store fixed or daily catalog choices without a schema migration. Artwork provenance and prompts are recorded in `docs/ALBUM-ARTWORK.md`.

## Daily focus

Dexie v9 adds `dailyFocus`, indexed by space and local day. Its repository validates dates and bounded titles in space-scoped transactions. The optional appearance flag controls Home visibility. A date-keyed live component follows completion and edits across tabs, retains drafts on failure and refreshes on storage retry. Daily goals are not included in bookmark backups.

## Home widgets

Dexie v10 adds `homeWidgets` for clock and countdown records, validated by the repository with per-kind bounds. Visibility and soft deletion synchronize through live queries. Home uses its existing clock tick, IANA formatting and stored countdown instants; there is no network dependency or second timer loop.

## Focus sessions

Dexie v11 adds `focusSessions`. Repository transactions start, pause, resume and end the current space-owned session. Home derives remaining time from its existing wall-clock tick, with no background process or per-second writes. Running sessions hide Home navigation and widgets; elapsed sessions show completion when a page is open or next opened. Session settings are device-local and outside bookmark backups.

## Weather

Dexie v12 adds `weatherSettings` for opt-in city/units, cached current conditions and three daily forecasts, plus refresh timestamps and a lease. The repository validates settings and data, checks ownership and performs atomic claims/commits across tabs. The adapter validates bounded JSON from Open-Meteo. Home refreshes when opened and stale; manual refresh obeys cooldowns. Disabling prevents future requests and removes the two optional host grants. Late results are checked against the current city/unit key and claim. Cached data, location and goals/widgets/sessions stay outside bookmark backups.

## Duplicate review

`duplicates.ts` groups the active Library with conservative HTTP(S) URL equivalence. Deletion validates a keeper and reviewed copy revisions under the same space in one transaction, then writes deletion tombstones. The review dialog follows live Library data, shows metadata and never merges records. No network requests or schema changes are involved.

## Search destinations

Dexie v13 supports an optional preferred Home search source in appearance preferences. `search-engines.ts` defines fixed HTTPS provider destinations and encodes queries. Home navigates only on explicit submit; the command palette keeps local matching and exposes a separate web action. No suggestion requests, provider API or host permission is involved. The preference is device-local and excluded from bookmark backups.

## Bookmark notes

The Library notes editor uses the existing optional `Bookmark.notes` field. Its repository updates only notes after checking space ownership and the reviewed note value in one transaction. Conflicts keep the draft instead of replacing a newer note. The field remains plain text, participates in existing local search and JSON backup/restore, and needs no database version change. New content is bounded; unchanged longer imported content remains valid.

## Space selection

Spaces already exist in the schema. The space provider loads active spaces and binds repository instances to the selected ID. The entire feature tree remounts on switching, closing drafts and resetting subscriptions. Per-tab selection lives in sessionStorage; another tab deleting the selected space falls back to the default. Capture has an explicit selector and starts in the default space in a fresh tab. Libraries, appearance, media, quotes, focus, widgets and weather settings are isolated. Optional weather host access remains browser-wide.

Space deletion tombstones all owned records transactionally and releases personal image payloads. The default cannot be deleted. Bookmark/HTML, album and quote archives operate on the selected space. Version-1 archives retain the canonical `default` namespace at the boundary for compatibility, then map records into the chosen space when restoring. Existing IDs belonging to another space or tombstones are rejected; cross-space copying/remapping remains separate work. Appearance and widget settings remain outside content archives.
