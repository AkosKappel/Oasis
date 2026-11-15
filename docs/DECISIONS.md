# Decisions

## 2026-11-14: project foundation

- Adopt the blueprint's WXT, React, TypeScript, Tailwind, shadcn/ui, and Dexie stack.
- Use pnpm per workspace guidelines and commit its lockfile for reproducibility.
- Target Chromium Manifest V3 initially, covering Chrome and Edge.
- Keep extension permissions empty until functionality needs them.
- Model spaces immediately and create one default space on database initialization.
- Include optional deletion timestamps without committing to a synchronization algorithm.
- Defer feature-specific dependencies, background scripts, and content scripts until needed.
- Leave repository hosting, licensing, and public distribution undecided.

## 2026-11-14: initial organization

- Start with flat folders and multiple tags per bookmark; defer hierarchy and drag-and-drop.
- Deleting a folder keeps bookmarks and removes their folder assignment. Deleting a tag removes its assignments. Both operations retain tombstones and commit atomically.
- Reject assignments to deleted, missing, or other-space records.
- Folder and tag names are trimmed, limited to 80 characters, and unique ignoring case within their type and space.
- Counts show active bookmarks across the whole library; filters combine by intersection.
- Keep `BACKLOG.md` local and ignored by Git, matching the workspace convention.

## 2026-11-14: documentation

- Track planned work only in the local `BACKLOG.md` and history only in Git. The blueprint's `docs/ROADMAP.md` and `docs/CHANGELOG.md` are dropped because they repeated both; add a changelog with the first public release.
- `AGENTS.md` holds the rules for coding agents (Codex, Claude); `CLAUDE.md` imports it.

## 2026-11-14: minimal new-tab home

- Open new tabs on a separate home with a clock, date, bookmark search and up to six favorites. Keep folders, tags and editing in Library.
- Use a local CSS background rather than a photo service. The home works offline without new permissions or requests.
- Use hash navigation so Library can be bookmarked and browser back/forward works. Home searches open the command palette; Library also accepts a query in its hash URL.
- Defer daily focus and appearance controls until the basic home and search flow are established.

## 2026-11-14: keyboard search

- Ctrl/Cmd+K opens a native modal search dialog on Home and Library. Arrow keys select, Enter opens, and Escape restores focus.
- Reuse the existing local substring matching across titles, URLs, descriptions, folders and tags. Fuzzy search and operators remain S-01; no search dependency is needed for this increment.
- Limit displayed bookmarks to 20 and include Home and Library navigation actions. Opening a result uses the current tab, matching new-tab launch behavior.

## 2026-11-14: portable Personal-space backups

- Export versioned Oasis JSON containing active bookmarks, folders and tags, including stable IDs and metadata. Deleted records, settings and other spaces are excluded.
- Restore adds missing records and keeps existing active records with the same ID unchanged. IDs owned by another space or by a deleted record stop the restore; restoring deleted IDs requires a fresh browser profile.
- Validate the complete file and the resulting merged library, including unique names, ownership, references, safe bookmark URLs and folder cycles. Commit all additions in one Dexie transaction or roll them all back.
- Limit import files to 10 MB. Preview counts before the explicit Restore action. Browser bookmark HTML is a separate B-06 feature.

## 2026-11-14: toolbar quick capture

- Add only `activeTab`, which grants temporary access to the current page URL and title when the user invokes the toolbar popup. No persistent site access, tabs permission, content scripts or background worker is needed.
- Reuse the existing bookmark form and transaction-backed repository for folder/tag assignment and validation. Saving is explicit; internal pages and credential-bearing URLs are rejected.
- Show a saved confirmation and a Library link rather than automatically opening a new tab after saving.

## 2026-11-14: minimalist appearance preferences

- Store Personal-space appearance preferences in Dexie v2, with system/light/dark theme, three accent colors, clock format and date/favorites visibility. Live queries synchronize open extension pages.
- Use a small Home appearance dialog and shared light/dark surface tokens, including Library and popup. Saving is explicit; Cancel preserves current settings.
- Keep image backgrounds, personal albums, quote collections and optional productivity widgets in the local backlog for later work.
- Existing JSON v1 backups still contain only library records; appearance preferences are device-local and excluded.

## 2026-11-14: local ranked search

- Share one search implementation between Library and the command palette. Match all text terms, rank full titles and literal matches ahead of fuzzy matches, and search descriptions, notes, folder names and tags too.
- Support exact case/accent-insensitive tag/folder names, domain host or subdomain matching, and `is:favorite`. Quote phrases and names containing spaces. Repeated operators combine by intersection; unknown operators are literal text and unsupported `is:` values match nothing.
- Allow one word edit for 4-7 characters and two for 8-64, including adjacent transpositions. Shorter or longer terms and quoted phrases use substring matching.
- Keep the implementation dependency-free after a 10,000-bookmark typo/operator benchmark measured approximately 180-275 ms on this shared server with word comparisons cached. Q-01 remains for broader workloads and indexing decisions as libraries grow; these timings are observations, not CI thresholds.

## 2026-11-14: folder hierarchy

- Use the existing `parentId` model, without a schema change. Folder names are unique among siblings; tags remain unique per space. JSON v1 validation accepts the same hierarchy and sibling-name rules.
- Show full paths in management, bookmark assignment, cards and filters. A selected folder includes its descendants and its count aggregates their bookmarks. `folder:` accepts a name or full path and includes descendants too.
- Move folders with the parent selector in the edit form. Repository transactions validate ancestor ownership, active records, sibling collisions and cycles, while preserving folder IDs and bookmark assignments.
- Reject deletion of folders with active children. Deleting a leaf keeps its bookmarks and makes them Unorganized, preserving the existing behavior.

## 2026-11-14: browser bookmark HTML transfer

- Import/export Netscape bookmark HTML from a file without requesting the browser bookmarks permission. Parse imported markup in an inert template that is never attached to the page.
- Preview folder and valid-link counts; skip malformed, non-HTTP(S) and credential-bearing links. Invalid folder structure or names stop the file before any writes.
- Merge folders by case-insensitive sibling name and parent path. Skip an exact normalized URL already in the same folder, including duplicates within the file; keep query strings and fragments distinct and preserve existing records unchanged.
- Validate the plan before writing, then create missing folders and bookmarks in one space-scoped Dexie transaction. Imports never move or delete existing records and do not revive tombstones.
- Support names, URLs, descriptions, folder hierarchy and creation dates. HTML is not a full Oasis backup: tags, favorite status and notes use JSON. Escape all exported text and attributes.
- Limit HTML imports to 10 MB, 10,000 items and 32 folder levels, with a markup-complexity guard before parsing. HTML export rejects deeper structures; JSON remains the path for deeper libraries while streaming transfer is deferred.

## 2026-11-14: local image albums

- Dexie v3 adds space-owned image albums, images and background settings. Upload JPEG/PNG/WebP, resize to at most 2560 pixels per side and re-encode to JPEG to avoid carrying active content or source metadata.
- Limit source files to 20 MB and 40 megapixels, normalized images to 3 MB, and active Personal images to 100 / 30 MB. Process files sequentially before an atomic batch write; report storage errors and preserve existing data.
- Removing an image or album keeps tombstones but clears deleted image payloads to release storage. Deleting a selected background falls back safely.
- Provide a separate versioned album JSON archive including image data. Restore validates image decoding and dimensions before repository graph/ownership checks and atomic additions; existing active IDs stay unchanged. Bookmark JSON remains backward-compatible and separate.
- Background dimming starts at 60% for legible white text. No external images, network permissions or provider keys are introduced.

## 2026-11-14: daily image rotation

- Rotate a selected local album by local calendar day, with a stable album-specific offset and creation-time/ID ordering. Open tabs agree on the image, midnight advances it, and no timer service or network API is needed.
- Expose daily rotation and 60/70/85% dimming in the album dialog. Choosing a specific image returns to fixed-image mode. Empty or removed albums fall back to the plain Home.
- Use the rotation fields already defined in v3, so no schema migration is needed. The shared daily-item helper can also select daily quotes.

## 2026-11-14: personal quote collections

- Dexie v4 adds quote collections, plain-text quote entries and display preferences. Quotes are optional, selected explicitly, and rotate with the same local-day helper as images.
- Allow up to 50 collections and 2,000 entries, with 500 characters per quote and 120 per optional author. All writes check active space/collection ownership and retain deletion tombstones.
- Provide a separate small quote archive with IDs and relationships. Validate the whole graph before additive atomic restore, preserve existing active records and reject deleted/cross-space ID collisions.
- Custom entries need no API or network permission. Provider quotes remain a later integration with attribution and content-rights checks documented in API-SOURCES.md.

## 2026-11-14: Library list view and sorting

- Dexie v5 adds independent space-owned Library view/sort preferences. Partial preference writes merge inside a transaction so concurrent view and sort changes do not clobber one another.
- Share bookmark content and actions between grid cards and compact rows. Rows retain folder/tag labels, favorite status, creation dates and edit/delete controls, including on small screens.
- Offer natural name ordering in both directions, newest/oldest ordering and Best match. Best match preserves ranked search and existing recent-first order when the query is empty; explicit ordering is applied after filters.
- Keep view preferences device-local and outside bookmark archives. Existing databases upgrade without changing media, quotes or library records.

## 2026-11-14: on-demand Home links

- Put Home links in a native auto popover with favorites, all bookmarks, folder selection and the shared local search. Show up to 50 matches and offer Library for the complete result set.
- Keep the shortcut row optional. Dexie v6 switches existing appearance records to the new off-by-default behavior once, preserving all other preferences; users can re-enable Show shortcut row.
- Render the nonmodal panel in a body portal to use the app theme independently of photo-background colors. Native dismissal handles Escape and outside clicks, with keyboard search-to-link navigation and focus return.

## 2026-11-14: custom primary and secondary colors

- Dexie v7 adds optional custom hex colors to appearance records; existing presets and saved preferences remain valid. Normalize three/six-digit hex input and reject invalid values before writing.
- Primary fills buttons; secondary fills highlights and hover states. Choose black/white foregrounds for at least 4.5:1 contrast. Derive separate link/icon/focus colors targeting 7:1 against the app's background and surface instead of forcing arbitrary fills into every role.
- Preview appearance in the current tab without writing it. Save commits and synchronizes other tabs; Cancel restores the latest saved appearance. Reset colors returns to the selected preset.
- Keep photo dimming and white overlay text independent of these theme colors. The body-portaled Links panel continues using the app theme.

## 2026-11-14: focused Home usability checks

- Verify Links/search/Appearance keyboard transitions and dismissal, readable custom highlights over bright photo backgrounds, and 320-pixel Home layouts with long quote/author text.
- Reduce the minimum clock size on narrow screens and wrap long authors in Home and quote management. Keep color controls synchronized with system-theme changes while the dialog is open.
- Expose color preview as a named accessible group. This focused browser/contrast pass does not replace the broader release accessibility and screen-reader review tracked locally.

## 2026-11-14: dropdown styling

- Keep native select controls and form/keyboard behavior. Use customizable native pickers in Chromium 135+ to style arrows, option spacing, selected/hover states and popup colors consistently with the theme.
- Older browsers retain native option lists and a CSS chevron fallback. No replacement dropdown library or browser minimum is introduced.

## 2026-11-14: configurable Links side panel

- Dexie v8 adds left/right placement and optional desktop pinning, preserving existing preferences and defaulting to left/on-demand.
- Show folder navigation directly in Links. Pinning reserves room beside the Home canvas on wide screens; small screens retain an on-demand overlay to avoid covering Home permanently.
- Keep pinned navigation nonmodal. Unpinning restores the compact trigger; choosing a side also moves the trigger to that side.

## 2026-11-14: context-menu capture

- Add the `contextMenus` permission and a small event-driven background worker for Save page/Save link actions. Reuse temporary `activeTab` access, with no tabs permission, site access or content script.
- Alt+Shift+O opens the same explicit-save editor for the active page. Link capture defaults its title to the destination hostname; users can edit it and assign folders/tags.
- Pass validated capture data in the extension editor fragment and immediately scrub that fragment from its history entry. Save still goes through the existing transaction-backed bookmark form.
- Browser-owned context-menu clicks cannot be driven reliably in headless Chromium. Unit tests dispatch registered listeners; browser tests verify the real capture page, persistence, worker manifest and request scrubbing.

## 2026-11-14: bulk bookmark actions

- Add explicit selection mode in grid/list views, bounded to 1,000 bookmarks per operation. Filter changes clear selection; actions only use active visible selections.
- Move, add/remove tags and soft-delete in one space-scoped transaction after validating every bookmark and assignment. A failure rolls back the whole batch.
- Keep selections on failure, confirm deletion, and return focus to the persistent selection control after successful modal actions.

## 2026-11-14: non-destructive storage recovery

- Centralize quota, unavailable storage, blocked upgrades and version-change guidance without storing raw errors or clearing the database.
- Retain the last successful query snapshots and resubscribe failed live queries after an explicit retry. Reopen and verify the existing Personal space; never create a replacement database as recovery.
- Keep unsaved bookmark form values after write failure. Recognized write errors show guidance for backups/image management; a successful retry signals recovery.
- Test quota and read failures at the real IndexedDB API boundary, plus database reopen and retry behavior. Recovery links open Library separately to preserve an active capture form.

## 2026-11-14: bundled starter albums

- Offer Quiet geometry, Open air, Soft forms and After dark, each with warm/cool or contrasting scenes. Use original generated artwork with recorded prompts instead of third-party stock or a remote feed.
- Package optimized WebP assets with the extension and expose a read-only catalog alongside personal albums. Do not seed image copies into IndexedDB or consume the personal upload allowance. Stable reserved IDs use the existing background settings model, so no schema change is needed.
- Preserve existing plain/photo choices. Selecting a collection only browses it; choosing an image or saving daily settings applies it. Built-ins support the same dimming and daily rotation as personal albums.
- Exclude built-ins from portable personal-album archives and reject reserved catalog IDs in imported records. The catalog remains available after personal-album deletion or restore.

## 2026-11-14: daily focus

- Keep daily focus optional in Appearance, hidden by default. Store one short goal and completion status per space and local calendar day; the next day never inherits a previous goal.
- Dexie v9 adds daily focus entries. The optional appearance flag needs no backfill; older appearance records remain unchanged. Goals remain device-local and separate from bookmark backups.

## 2026-11-14: optional clocks and countdowns

- Dexie v10 adds space-owned Home widgets with visibility flags and deletion tombstones. Start empty, limit to three clocks and three countdowns, and manage them through Widgets.
- Use browser IANA time zones for clocks and daylight-saving behavior, with a date alongside the time. Countdown entry uses local time and saves an absolute instant; reject nonexistent local times instead of silently shifting them.
- Keep labels short and widgets compact. No location API, permission or dependency is needed. Widgets remain device-local and outside bookmark backups.

## 2026-11-14: focus sessions

- Dexie v11 stores one current session per space. Absolute deadlines avoid interval drift after sleep, tab suspension or reload; paused sessions store remaining time. Transactional actions always read current state across tabs.
- Running sessions replace Home controls with the timer and pause/end actions. Pausing or completing restores Home. No website blocking, sound, background alarm, notifications permission or automatic repeated sessions are included.

## 2026-11-14: opt-in weather

- Use Open-Meteo's free personal/non-commercial endpoint, with provider terms and attribution in settings and attribution beside forecasts. Geocoding attribution names GeoNames. Revisit the provider plan before commercial distribution.
- Add only optional host access to `api.open-meteo.com` and `geocoding-api.open-meteo.com`. Request it from an explicit user action; use manual city selection, never geolocation. Settings explain city/coordinate and IP disclosure. Turning weather off disables it and removes access.
- Dexie v12 stores per-space settings, a bounded three-day forecast and a short transactional refresh lease. Cache for one hour, limit manual refresh to 15 minutes after success and retries to one minute after failure. Tabs share the cache and lease; late responses cannot replace a different city's data.
- Bound response streams to 64 KB, time out requests, reject redirects and unexpected units/values, and omit credentials and referrers. Preserve cached forecasts on failure, label stale data and expire display after 48 hours. There is no background polling.
- Browser tests supply the browser-owned permission result and provider responses at the API boundary. A separate live request verifies the public endpoint shape using sample coordinates. Actual permission prompt acceptance remains a manual browser check.

## 2026-11-14: conservative duplicate review

- Group safe HTTP(S) URLs using URL parsing only. Normalize host case/default ports through the browser parser; preserve protocol, path slashes, query order/values and fragments. Do not strip tracking parameters or merge content heuristically.
- Review the whole Library with a chosen keeper and explicitly selected copies. Show folders, favorites, descriptions, tag counts and notes. Never merge metadata or delete automatically.
- Recheck ownership, URL equality and reviewed timestamps in one transaction before soft-deleting copies. A concurrent edit or storage failure leaves the batch unchanged. Keep selections on failure and return focus to Done after success. No schema change is needed.

## 2026-11-14: combined dashboard verification

- The new inline focus buttons need their own readable fills over photos. Set dark primary text and a dark translucent outline-button fill within photo Home; portal dialogs and panels retain the chosen app theme.
- Keep countdown deadline labels consistent with the chosen clock format.
- Verify the combined photo-backed daily focus, clocks/countdown, pinned Links and mocked weather, then enter/exit focus mode and check mobile width. Check button contrast against the brightest photo allowed by dimming. Provider permission acceptance remains outside headless automation.

## 2026-11-14: glass panels

- Give floating dialogs and Links a restrained theme-tinted glass surface with bounded backdrop blur. Keep fields and option pickers opaque, and strengthen secondary text for contrast even over extreme backgrounds.
- Fall back to opaque surfaces when blur is unsupported or reduced transparency is requested. Respect forced colors without blur or decorative shadows. Do not blur or animate the entire Home canvas.

## 2026-11-14: expanded built-in artwork

- Append scenes to existing albums without changing any saved image IDs. Add Woodland for botanical scenery and Quiet spaces for calm architecture/interiors, keeping broad variety without a large category menu.
- Package generated WebP assets locally with recorded prompts. Keep fixed selections unchanged; daily collections gain the additional scenes. Personal uploads and archives remain independent.

## 2026-11-14: preferred web search engines

- Keep local Bookmarks as Home's default. Offer Google, DuckDuckGo, Bing and Brave in Appearance, with explicit destination labels on Home. Ctrl/Cmd+K continues local search and adds an explicit preferred-provider action for a non-empty query.
- Build only allowlisted HTTPS navigation URLs with encoded queries. Do not request suggestions, add tracking parameters or send queries while typing. No provider API or new permission is needed.
- Dexie v13 records the optional appearance field without rewriting older preferences. Missing values resolve to local search; appearance preview/cancel/save and cross-tab behavior remain shared with existing settings.

## 2026-11-14: bookmark notes editor

- Expose existing plain-text bookmark notes through a dedicated Library card action, keeping quick capture short. Use the existing notes field and JSON format, with no schema change or Markdown/HTML renderer.
- Update only notes inside a space-scoped transaction. Compare the previously read note before writing, so concurrent note edits keep the draft and report a conflict while unrelated metadata edits remain intact.
- Bound new notes to 20,000 characters, normalize line endings and allow explicit clearing. Preserve longer imported notes when unchanged and never truncate them in the editor or backup. Notes already participate in local search and JSON backup/restore.

## 2026-11-15: bounded Library rendering

- Render Library results in batches of 60 with an explicit Show more action. Keep all matches available to search and sorting, announce the visible/total count, and reset the batch when filters change.
- Memoize filtering and sorting so selection and dialog state changes do not rerun a large query. Select visible applies to displayed results, capped at 1,000.
- Prefer batching over virtualized cards initially: it preserves native list semantics, keyboard access and variable card heights without another dependency. Revisit indexing or a worker if measured search latency becomes a problem; batching bounds initial DOM work, not total search cost.
