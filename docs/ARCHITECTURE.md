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

- `src/database/backup.ts` validates and exports active records in the selected space. Restore checks the merged graph inside a write transaction, preserves existing active IDs and adds only missing records. It never removes records or revives tombstones.

## UI

- One Dexie live query reads bookmarks, folders and tags in a read transaction, so the UI updates when records change, including writes from other Oasis tabs.
- Dialogs use the native `<dialog>` element for focus containment and Escape handling.

- New tabs open Home; `#library` opens bookmark management. Home reads the same live query for favorites and opens the command palette on search submission.
- The command palette shares the library live query and filter helper. Its native modal keeps focus inside search and restores the previous focused element when closed.
- The popup reads the active tab and reuses the bookmark form and repositories. It offers folder/tag assignment and reports unsupported pages before saving.

## Permissions

The manifest declares `activeTab` so the toolbar popup can read the current page title and URL after a user opens it. An event-driven background worker registers context menus and a capture command. No persistent content script is registered. Optional weather and explicit toolbar page details are the network features described below. Record any additional permission in [DECISIONS.md](DECISIONS.md).

## Appearance

Dexie v2 adds a `preferences` table without changing library records. The appearance repository checks space ownership transactionally. Extension pages subscribe to its live query and resolve the system theme with `prefers-color-scheme`; CSS tokens apply to Home, Library, dialogs and popup.

## Search

`createBookmarkSearch` parses text and operators once per query and caches normalized fields and bounded word comparisons for that query. `filterBookmarks` intersects organization filters with search and returns stable relevance ordering. Library and the palette use the same helper; all matching runs locally.

Folder path and descendant helpers are shared by management, assignment, cards, filters and search. Folder filter counts include descendants; hierarchy uses the existing v1 `parentId` field.

## Browser bookmark transfer

The browser-only parser in `src/features/transfer` converts an inert HTML template into a typed import plan. `src/database/bookmark-html.ts` validates folder references and limits, maps source folders to active records in the selected space, deduplicates exact URLs within folders and commits additions atomically. Export validates the library graph before serializing escaped Netscape HTML. JSON and HTML controls share the Backup and restore dialog.

## Image albums

Dexie v3 adds `albums`, `albumImages` and `backgrounds`. Images are re-encoded locally and stored as JPEG data URLs. The album repository owns transactions, quota bounds, relationships and deletion tombstones; browser image preparation and archive decoding happen before writes. Home and the album dialog subscribe to one media snapshot. Album archives are independent from bookmark JSON/HTML.

## Quotes

Dexie v4 adds `quoteCollections`, `quotes` and `quoteSettings`. The repository owns validation, ownership, display selection and additive archives. Home chooses a daily entry from the selected active collection, while the dialog manages plain text and optional authors. Quote archives are separate from bookmark and image backups.

## Library preferences

Dexie v5 adds `libraryPreferences`. Its repository merges partial updates atomically and live queries synchronize tabs. Filtering/search runs before an explicit non-mutating sort; grid and list reuse the bookmark component and actions. Dates outside the browser's supported range display a fallback instead of breaking a row.

## Home links

Home's Links control opens a native nonmodal auto popover, rendered through a body portal. Dexie v8 adds the preferred side and desktop pinning to appearance settings. Pinned Links uses a nonmodal complementary panel with direct folder navigation; narrow screens retain the popover. It shares bookmark matching and descendant folder filtering with Library. Dexie v6 makes the old favorites row opt-in while preserving the rest of appearance settings. The panel uses normal app colors even over photo backgrounds.

Custom appearance colors are optional in Dexie v7. `colors.ts` handles normalization and contrast, while `apply-appearance.ts` resolves presets/custom fills and readable semantic tokens. The app owns a temporary preview; the appearance hook applies it locally and only persists explicit saves.

Context-menu and keyboard actions open `capture.html`; its request fragment is parsed once and removed before React mounts. The shared capture form validates the page/link and explicitly saves through the bookmark repository. `contextMenus` provides these menu actions; optional `scripting` is separately used for explicit toolbar page details.

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

Dexie v12 adds `weatherSettings` for opt-in city/units, cached current conditions and three daily forecasts, plus refresh timestamps and a lease. The repository validates settings and data, checks ownership and performs atomic claims/commits across tabs. The adapter validates bounded JSON from Open-Meteo. Home refreshes when opened and stale; manual refresh obeys cooldowns. Disabling prevents future requests in that space. The two browser-wide optional host grants are removed only when no other active space has weather enabled. Late results are checked against the current city/unit key and claim. Cached data, location and goals/widgets/sessions stay outside bookmark backups.

## Duplicate review

`duplicates.ts` groups the active Library with conservative HTTP(S) URL equivalence. Deletion validates a keeper and reviewed copy revisions under the same space in one transaction, then writes deletion tombstones. The review dialog follows live Library data, shows metadata and never merges records. No network requests or schema changes are involved.

## Search destinations

Dexie v13 supports an optional preferred Home search source in appearance preferences. `search-engines.ts` defines fixed HTTPS provider destinations and encodes queries. Home navigates only on explicit submit; the command palette keeps local matching and exposes a separate web action. No suggestion requests, provider API or host permission is involved. The preference is device-local and excluded from bookmark backups.

## Bookmark notes

The Library notes editor uses the existing optional `Bookmark.notes` field. Its repository updates only notes after checking space ownership and the reviewed note value in one transaction. Conflicts keep the draft instead of replacing a newer note. The field remains plain text, participates in existing local search and JSON backup/restore, and needs no database version change. New content is bounded; unchanged longer imported content remains valid.

## Space selection

Spaces already exist in the schema. The space provider loads active spaces and binds repository instances to the selected ID. The entire feature tree remounts on switching, closing drafts and resetting subscriptions. Failed space-list refreshes retain the last loaded tree and open drafts while storage recovery remains available. Per-tab selection lives in sessionStorage; another tab deleting the selected space falls back to the default. Capture has an explicit selector and starts in the default space in a fresh tab. Libraries, appearance, media, quotes, focus, widgets and weather settings are isolated. Optional weather host access remains browser-wide.

Space deletion tombstones all owned records transactionally and releases personal image payloads. The default cannot be deleted. Bookmark/HTML, album and quote archives operate on the selected space. Version-1 archives retain the canonical `default` namespace at the boundary for compatibility, then map records into the chosen space when restoring. Existing IDs belonging to another space or tombstones are rejected; cross-space copying/remapping remains separate work. Appearance and widget settings remain outside content archives.

## Optional open history

Dexie v14 adds `trackOpens` to per-space Library preferences, defaulting to false. The open-history repository checks current consent and space ownership inside each transaction, then updates existing bookmark `openCount`/`lastOpenedAt` fields. Tracked bookmark anchors cover Library cards, Home favorites and Links; command-palette navigation awaits the same write attempt. Native context-menu opens are not counted. Disabling retains metadata; explicit clearing resets active records in the selected space. Recent/frequent collections derive up to 50 records from saved metadata. No browsing-history permission is used.

## Distribution assets

The manifest uses packaged PNG icons exported from the original SVG in `public/icon/`. Export uses the existing Playwright dependency. `assets:notices` copies the project MIT license and assembles runtime dependency notices, including WXT/browser, Tailwind CSS and shadcn component patterns, into public files for the extension bundle. The release smoke flow verifies packaged icon dimensions and captures offline sample-data screenshots. `OASIS_EXTENSION_PATH` lets focused tests load a browser-target build; the default remains Chrome MV3.

Library statistics are a pure projection of the active library snapshot. They do not add tables, collection events or network requests. Saved creation dates drive monthly retained additions; existing opt-in open counts drive frequency totals.

Dexie v15 adds optional recent/frequent bookmark-section visibility to appearance preferences. Home derives links from its existing library snapshot and shares the Library ranking helpers and tracked anchors. These sections do not change tracking consent or add queries/providers.

Dexie v16 adds `dashboardLayouts` (`id`, `spaceId`). The layout repository validates complete unique section lists, checks ownership and saves with revision comparison. Home renders enabled section components in saved order with bounded widths; optional source settings remain independent. The layout editor keeps drafts local until Save and offers accessible ordering/reset controls.

Dexie v17 supports manual Library sorting and optional manual folder ordering in `libraryPreferences`. The shared rank planner uses stable ID ties and sparse numeric ranks, with bounded rebalance logic for exhausted gaps. Repositories update ranks and ordering preferences transactionally; folder reparenting reuses ownership/cycle validation. Native drag payloads carry kind/ID/space, while keyboard controls and existing editors remain available. The destination panel is searchable and rendered in batches.

`space-transfer.ts` previews and commits selected bookmark transfers between active spaces. It maps only referenced folder ancestors/tags, preserves source content in new target records, and optionally tombstones originals atomically. Reviews carry an opaque request seed and a snapshot fingerprint, not trusted write payloads. Apply rebuilds the graph, checks the snapshot and performs all writes in one transaction. Preferences and activity history are not copied.

### Explicit page details

Toolbar capture can request optional `scripting` access alongside the existing temporary `activeTab` grant. Its self-contained isolated-world function reads a description and same-origin declared icon/preview only after a button press. It omits credentials/referrer, rejects redirects, streams at most 2 MiB per asset, bounds raster dimensions before decode and normalizes to local PNG/JPEG data URLs (64 px icon, 640 px preview). Unsupported or off-origin images are skipped. Library renders only bounded local rasters, never legacy remote image references. No automatic lookup or background crawl runs.

Existing bookmark fields hold caches without a schema change. Writes, backup merge and cross-space transfer enforce a 4 MiB character budget per active space; each icon/preview is capped at 32,000/400,000 characters. Deletion releases caches while retaining text tombstones. JSON backups carry cached images. Context-menu/full-page capture and arbitrary Library bookmarks do not request page details, since they lack the toolbar’s current-page grant.

### Content feedback and preferred rotation

Dexie v18 adds `contentFeedback` indexed by space and kind. The repository validates active owned user content or known built-in image IDs, then transactionally upserts a current vote or soft-deletes a cleared vote. Space deletion covers feedback. Ratings stay device-local and are excluded from bookmark, album and quote archives.

Home uses `preferred-daily-item.ts` for deterministic weighted daily choices, with per-item likes, hard exclusion of dislikes and album/author affinity. The optional mixed-album flag uses all active images only when daily rotation is enabled; fixed image selection is unchanged. There is no external model, inferred browsing profile, impression tracking or new permission. An initial feedback read must finish before displaying rated daily content; read failures keep the last snapshot.

The Content preferences dialog is rendered into the document body so photo-specific Home colors do not leak into it. It searches and filters the current votes with bounded batches, clears individual votes even after target deletion, and confirms kind-scoped or complete resets in a space-owned transaction. Clearing preferences never deletes source content. Empty daily pools explain how to recover, and disappearing feedback controls return focus to the preference trigger.

### Saved searches

Dexie v19 adds `savedSearches` indexed by space. Named queries reuse the local search engine, including phrase and tag/folder/domain/favorite operators, so membership changes with Library data. Loading a query resets other filters. The repository caps active queries at 50 per space, validates unique names and bounded text, and checks revisions for edits/deletions in space-owned transactions. Deletion keeps a tombstone; deleting a space includes saved searches. They are local settings and excluded from bookmark archives. The manager retains drafts on failed writes.

### Tag suggestions

The bookmark repository reads an owned bookmark/tag snapshot in a read transaction. `tag-suggestions.ts` counts distinct same-host bookmark assignments, filters active scoped tags and returns up to five candidates with supporting counts. The editor requests suggestions only on demand, preserves other fields and manually selected tags, and applies a candidate only to its draft. Normal bookmark save validation and ownership checks govern the eventual write. No schema, permission, background job or network integration is added.

### Scratchpad widgets

Dexie v20 extends Home widget records with plain-text notes while preserving existing widgets. Notes are limited to three per space and 10,000 characters each. Creation defaults to hidden in the widget manager; Home displays a bounded read-only preview only after explicit enablement. Edits and removals check opening revisions inside owned transactions. Failed/conflicting saves keep the draft. Notes can be downloaded as text and stay outside bookmark archives. Deletion retains a text tombstone.

### Task-list widgets

Dexie v21 adds `widgetTasks` indexed by space and `(spaceId, widgetId)`. Task lists use existing widget records and start hidden. Up to 50 active tasks per list have bounded single-line text, completion state and deletion tombstones. Every mutation validates the active owned parent and task membership. Text edits/removal check revisions; completion explicitly sets a boolean while preserving current text. Removing a list atomically tombstones its children, and deleting a space includes both tables.

The Widgets manager and enabled Home previews open a native task dialog. Home shows at most five tasks per list; completion syncs through live queries. Export writes a plain-text checklist. Tasks stay outside bookmark backups. No reminders, background schedule, service or permission is added.

Task dialogs opened from Home are owned by Home rather than the preview card, so a focus-session or layout change cannot discard their drafts. Completion updates optimistically until the live query observes the committed revision and rolls back on a failed write. Clearing completed tasks preserves unrelated draft text. Nested dialogs isolate their close events and restore focus to their own trigger.

### Complete space archives

`space-backup.ts` exports a versioned active-space graph across content, media and settings tables. Existing graph/field validators normalize the archive before download or restore; both directions enforce a 64 MiB file bound. Restore always creates a new space in one transaction, remapping IDs and relationships, including task parents, personal media, quote collections and content preferences. Existing spaces are untouched. Quota or validation failure rolls back the new space and every imported record. Built-in image references stay stable.

Runtime behavior restores safely: weather and open counting are off, focus timers are paused/ended using remaining time at export, and request leases are omitted. Active content is included; deleted records are excluded. Portable bookmark, album and quote archives remain separate options.

### Library navigation

Library uses a compact working header and a results column beside collections and organization filters on desktop. The same panel collapses on narrow screens. Built-in and saved queries share one collection selector. Maintenance actions use a native More popover; tool dialogs return focus to its visible trigger. Saved-search dialogs are portaled outside the collapsible panel and reopen it when returning focus. Search guidance and counting controls are secondary disclosures pending the unified Settings entry.

The Settings shell owns modal focus and navigation. Feature managers accept an embedded mode; their writes expose `aria-busy` so the shell blocks navigation and dismissal until completion. General exposes clock/date/search preferences. Privacy owns optional bookmark-open counting.

Schema 22 adds optional deletion-batch metadata. The scoped Trash repository restores records transactionally, validates ownership and capacity, and restores task-list cascades only for a matching batch. The Undo provider lasts ten seconds and clears on a space switch. Settings → Backup and restore contains persistent Trash.

Schema 23 adds `Space.setupComplete`. Its migration marks existing spaces complete; fresh profiles offer a skippable setup after preferences load. The onboarding repository commits choices and completion atomically. Browser fixtures dismiss setup through its UI except in dedicated first-run tests.

Home owns note and task editors outside its configurable section tree. Notes save against the revision opened, preserving drafts on conflicts. Settings embeds task contents within its current modal, updates its accessible title and handles Escape as Back while a task list is open.

Neutral Next selections are transient Home state, scoped to the local day and current content pool. The weighted selector accepts excluded IDs so current/visited items can be skipped while affinity still derives from the full pool. No ratings or impressions are written.

WXT targets Chrome, Edge and experimental Firefox with explicit MV3. Gecko identity/minimum metadata is Firefox-only. WXT generates Firefox background scripts and Chromium service workers. No API permissions are added. See BROWSERS.md for validation and distribution gates.
