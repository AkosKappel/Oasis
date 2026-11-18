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

## 2026-11-15: independent local spaces

- Keep active selection per tab rather than synchronizing a global selection and unexpectedly changing another tab’s work. Subscribe to active spaces so rename/deletion still updates every tab. Remount features on switching to discard stale forms and ensure repositories remain bound to their original space during asynchronous writes.
- Use the existing schema and ownership checks. Protect the default from deletion, soft-delete the complete owned graph atomically, and release deleted image payloads. No schema migration or permission is needed.
- Preserve version-1 portable content archives with a canonical archive namespace, explicitly mapping the selected target at restore. Preserve IDs and reject cross-space conflicts; do not silently turn restore into a copy operation. Settings stay device-local and per-space.

## 2026-11-15: built-in smart collections

- Derive Recently added, Favorites, Untagged and Unorganized directly from active bookmarks in the selected space. Recently added means the 50 newest records, with deterministic ID ties, rather than a date window that can unexpectedly empty the collection.
- Apply folder, tag and search filters within the collection, retaining the user’s sort preference. Recompute after live updates; do not store duplicate membership records or add custom rules yet.

## 2026-11-15: optional local open history

- Count clicks and keyboard opens made through Oasis only after a per-space opt-in. Do not request browser history or observe unrelated tabs. Native browser context-menu opens are outside these counts.
- Read consent and update the bookmark in one transaction so concurrent opens do not lose increments. Same-tab navigation waits for the local write attempt; failures still allow navigation. New-tab links keep native modifier/middle-click behavior.
- Turning counting off preserves earlier counts. Offer explicit clearing and derive recent/frequent collections from saved data. Existing bookmark JSON includes these fields; settings remain outside content backups.
- Dexie v14 adds the optional Library preference with counting disabled for existing records. Existing open metadata is preserved during migration.

## 2026-11-15: weather access shared across spaces

- Disabling weather changes the selected space. Revoke browser-wide optional host access only when no other active space uses weather; otherwise keep the grant and explain why. Ignore deleted spaces when checking whether another space still needs the grant. Browser extension settings can still revoke access globally.

## 2026-11-15: public MIT distribution

- The owner chose to prepare a public release under the MIT license. Keep third-party licenses and bundled-artwork provenance available with the source and distribution. The license does not replace external provider terms.
- Keep npm publication disabled with `private: true`; the distribution target is a browser-extension archive. Repository creation, pushing, support/privacy hosting and store submission remain owner actions.

## 2026-11-15: Library statistics

- Derive statistics from active records in the selected space. Group exact hostnames without a suffix-list dependency or network requests, and show twelve local-calendar months of retained additions using creation dates.
- Reuse optional saved open counts. Do not invent historical activity, deleted-record trends or a heatmap from last-open timestamps. Turning tracking off retains existing statistics until the user clears them.

## 2026-11-15: optional Home bookmark sections

- Offer Recently added and Frequently opened independently in Appearance, both off by default. Reuse Library smart-collection ordering and show at most six links per section.
- Frequent links use only saved opt-in counts, including counts retained after disabling tracking. Enabling a section never enables tracking. Missing counts show a plain explanation instead of an invented recommendation.
- Dexie v15 records optional appearance fields without rewriting older preferences. Missing fields remain off. Settings are per-space, synchronized across tabs and excluded from bookmark backups.

## 2026-11-15: per-space Home layout

- Store an ordered, validated list of section IDs with visibility and normal/wide bounds. Keep the default centered layout and existing opt-ins; layout visibility never grants permissions, enables content or changes its settings.
- Provide keyboard-operable Move up/Move down controls with announcements, local unsaved drafts and a reset limited to layout. Compare the opening revision on save so another tab cannot silently replace a draft.
- Dexie v16 adds a space-owned layout table. Earlier preferences/content stay unchanged, and layouts remain outside content backups. Hidden weather is not mounted and does not refresh from Home.

## 2026-11-15: manual order and drag organization

- Use native browser drag-and-drop with a space-scoped Oasis payload. External URL/file drops and foreign-space payloads do not trigger writes. Keep Edit/folder controls and Move up/Move down as keyboard/touch alternatives.
- Bookmark manual order is per-space and available with cleared filters. Folder ordering applies among siblings; moving into a folder reuses transactional ownership, unique-name and cycle checks. Alphabetical folder order remains the default; manual folder order also drives Home Links and Library filter options.
- Most rank changes update one record. Rebalance with positive rank gaps only for ties or exhausted numeric precision. Rank and preference writes share a transaction. Dexie v17 records optional folder-order/manual-sort preferences without rewriting existing views or content.

## 2026-11-15: reviewed space transfers

- Transfer selected bookmarks using new destination IDs. Reuse case-insensitive sibling folder paths and tag names without changing destination names/colors; create only the missing organization graph. Never deduplicate destination bookmarks silently.
- Copy preserves content, notes and favorites while keeping originals. Move writes the destination and source tombstones in one transaction. Destination creation dates start at transfer time, and open counts restart at zero so activity is not carried into another space.
- Preview without writes, then rebuild inside the write transaction and compare complete source/dependency and destination-organization fingerprints. Changed or unavailable data requires a fresh review. Per-review IDs prevent retries from adding duplicate copies.

## 2026-11-15: Explicit current-page metadata with optional scripting

Use optional `scripting` plus temporary `activeTab` access, requested by “Read page details” in toolbar capture. Broad host access and third-party favicon/preview services would expose destinations unnecessarily. Read descriptions as text, preserve user-entered fields and cache bounded same-origin raster copies locally. Limit cached image text to 4 MiB per space, leaving room within the existing 10 MiB backup limit for ordinary bookmark text. Skip CDN/off-origin assets and unsupported images rather than widening access. Native permission grants still need interactive Chrome/Edge verification.

Sources: [optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [content-script network restrictions](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

## 2026-11-15: Local feedback for daily content

Store one current like/dislike per image or quote in each space, without impression logs, network requests or new permissions. Daily rotation uses a deterministic weighted exponential race: liked items have weight 8, neutral items related to a liked item have weight 2, others weight 1; disliked items are excluded. Related means the same image album or normalized non-empty quote author within the selected collection. This uses catalog metadata, not visual or semantic analysis. Daily choices may repeat, and selection agrees across tabs on the same local calendar day.

Mixed-album rotation is explicit and off by default; otherwise the selected album remains the pool. Fixed backgrounds remain fixed despite ratings. If every eligible item is disliked, show a plain background or no quote rather than overriding the choice. Preferences are device-local and outside content archives. Schema v18 adds the feedback table without rewriting existing settings or creating votes.

## 2026-11-15: Saved queries for custom smart collections

Reuse the existing search language rather than introducing a second rules engine. A saved query is a named, editable local smart collection; results stay live. Load it into the visible search box and reset other filters so hidden filter combinations do not change its meaning. Queries match current names, so renamed folder/tag references may need editing. Keep these per-space preferences outside portable bookmark archives.

## 2026-11-15: Reviewed same-host tag suggestions

Suggest existing tags from other active bookmarks with the exact same hostname in the selected space. Rank by distinct bookmark support, show counts and offer at most five. Exclude the bookmark being edited and inactive/foreign records. Users explicitly add suggestions to the draft and still confirm the bookmark save. This local heuristic avoids an external model, page fetch, semantic inference or background processing; semantic search remains separate future work.

## 2026-11-15: Optional scratchpad previews with explicit saves

Keep scratchpads inside the existing Widgets manager, hidden by default, rather than adding a permanent Home editor. Use plain text, explicit saves, revision checks and a text download instead of autosave or rich text. This preserves minimal Home and makes conflicts and data export clear.

## 2026-11-15: Bounded local task lists

Use separate task records under optional widgets rather than arrays inside widget settings, so completing a task cannot overwrite another task or the list’s settings. Keep the initial scope to add/edit/complete/remove and text export. Hide new lists by default, cap active tasks and Home previews, and leave reminders, recurrence and due dates for separate decisions.

## 2026-11-16: Symmetric bookmark backup limits

Use a shared 64 MiB bound for bookmark import and serialized export. Validate the exported bytes before starting a download so Oasis never knowingly emits a bookmark backup its own file reader rejects. The larger bound accommodates ordinary large libraries with notes; complete-space backups are a separate format. Label the existing format as a bookmark backup.

## 2026-11-16: Restore complete archives into a new space

Choose a reviewed, atomic new-space restore rather than destructive replacement or ambiguous settings merges. Normalize every table through bounded validators and remap IDs by table. Preserve user content, layout and preferences while requiring fresh enablement for weather/counting and explicit timer resume. This keeps recovery reversible and prevents imports from overwriting unrelated content or silently activating requests.

## 2026-11-16: Results-first Library

Keep everyday search, view and sorting near the results. Group built-in and saved collections in one selector, place organization filters in a desktop sidebar and collapse them on narrow screens. Move maintenance actions under More and collapse explanatory text. Remove marketing copy from the working Library. Native popovers preserve keyboard dismissal and return focus to their trigger before opening tools.

## 2026-11-16: One Settings entry

Home keeps one Settings icon and Focus mode. A shared dialog groups General, Appearance, layout, images, quotes, feedback, widgets, privacy and backups. Existing managers render as sections inside it, preserving explicit Save/Cancel and preventing navigation during writes. Clock and search are also available directly in General. Open counting lives in Privacy. Space management is an action in the space picker.

## 2026-11-16: Recover routine removals

Bookmarks, widgets, notes and tasks move to local Trash with a short Undo action. Space deletion still requires confirmation. Trash remains until browser data is cleared and is excluded from exports. Schema 22 adds optional deletion-batch metadata so restoring a task list revives only tasks removed with it. Older list tombstones restore the list alone, with tasks available separately. Restored bookmarks use only still-active folders and tags.

## 2026-11-16: Skippable first-run setup

Only new profiles see a brief clock/theme/import setup. Skip and Escape finish setup with existing defaults. Schema 23 marks existing spaces as configured, so upgrades keep opening directly to Home. Completion and chosen preferences save in one transaction. No persistent setup banner is added.

## 2026-11-16: Separate daily editing from widget setup

Home notes have a small hover/focus edit action with an explicit Save and revision check. A conflict keeps the draft. Task contents replace the Widgets panel inside Settings instead of stacking a second modal. Done and Escape return to Widgets and restore focus to the list action. Home task editing remains an independent dialog so layout changes preserve its draft.

## 2026-11-16: Neutral content skipping

Next image and Next quote appear with the existing hover/focus rating controls when another eligible item exists. Next cycles through eligible content in this tab without writing feedback. The choice resets on reload, day or collection change. Disliked content remains excluded; existing album/author affinity still affects selection. We chose temporary selection over stored skip history to avoid interpreting exploration as a negative preference. Next can preview another image without changing the saved fixed-image choice. Ratings leave fixed backgrounds unchanged.

## 2026-11-16: Browser support is evidence-based

Chrome and Edge are primary desktop targets; Firefox starts experimental, other Chromium browsers are best effort, and Safari/mobile extension support is deferred. CI separates shared checks, full Linux Chromium flows and target/OS smoke jobs, with diagnostic and package artifacts. Bundled Chromium is used for extension automation because branded Chrome/Edge removed the required sideload flags. Native browser permissions and OS integration remain explicit release gates, not inferred passes.

## 2026-11-16: Firefox starts as an experimental MV3 target

All targets explicitly use MV3 so Firefox does not default to MV2 while Oasis uses optional scripting. Firefox gets a stable UUID and candidate minimum version 140; Chromium manifests retain their permissions and service worker. Firefox package checks assert background scripts separately. Experimental packaging disables automatic source archives to avoid distributing local project material. Native flows and Mozilla consent/signing review gate supported distribution. Optional online features mean that no-backend does not justify a no-transmission declaration.

## 2026-11-16: Separate engine UI checks from extension integration

Shared UI runs from the production dashboard build over loopback in Chromium, Firefox and WebKit. A test-only API boundary denies extension permission requests; it does not emulate grants or native installation. This checks real engine layout, DOM, focus and IndexedDB behavior without pretending Playwright can load Firefox/WebKit extensions. The separate Chromium extension suite retains responsibility for extension integration. CI installs engine libraries; the local server is managed by Playwright and never publishes the app.

## 2026-11-16: Public project documentation uses the repository

The owner-authorized push publishes the prepared MIT source to the public repository. Use its readable privacy document and issue tracker as project links for store-form review. A separate hosted website is optional, so no new hosting service or deployment is introduced. Store settings, native release verification and submission remain separate owner actions.

## 2026-11-16: Responsive tests wait for breakpoint state

The hosted WebKit trace showed `setViewportSize` resolving before React received the breakpoint change. The test saw the old open filter panel, then the intended mobile collapse occurred. Wait for the actual collapsed state before opening filters. This preserves the responsive behavior and avoids arbitrary delays or browser-specific skips.

The full hosted extension suite also checks current More-menu entry points and scopes backup/search assertions to their named dialogs. Routine deletion tests exercise immediate removal and persistent recovery rather than obsolete confirmation prompts. Follow-up navigation and reloads wait for completed saves/deletions, so optimistic UI cannot produce a false pass.

## 2026-11-16: Smart-collection filters compile to existing queries

An optional builder inside Saved searches composes text phrases, domains, folder paths, tags and favorites using the existing AND query grammar. Applying filters only replaces the form draft, with explicit review before saving. Advanced queries are never parsed into lossy controls or rewritten automatically. Reuse query-string storage and complete-space backups, so no schema, permission or network change is needed. Folder/tag rules use names and may need updating after renames. Literal double quotes remain unsupported until the search grammar gains escaping.

## 2026-11-16: Focus cycles advance explicitly

Focus mode can opt into repeating focus and break phases. Each elapsed phase waits for an explicit Start break or Start next focus action. Time away never silently consumes later phases. Keep absolute deadlines, pause/resume, cross-tab persistence and a transactional stale-phase guard; add no background alarms, permissions or Home controls. Dexie v24 adds optional cycle metadata, leaving existing timers as single sessions. Complete-space backups validate the cycle and restore active timers paused. Long breaks and automatic starts remain outside this modest first version.

## 2026-11-16: Use system outlines in forced-colors mode

Shared buttons use a shadow focus ring in regular themes. Forced-colors mode removes that shadow, leaving no visible keyboard focus. Add a system-color outline, button borders and an inset pressed-state marker only within the forced-colors media query. Restore native select appearance so browsers without the custom picker keep their arrow when gradients disappear. Extend the shared engine suite with preference and enlarged-text/reflow checks; keep native Windows high contrast, browser zoom and assistive-technology verification as release gates.

## 2026-11-17: Home Links uses grouped icon lists

Home Links shows compact rows, quick collections and collapsible full-path folder groups. Manual ordering shares Library ranks, with drag handles and keyboard move buttons. Recent/frequent collections retain usage ordering and use existing opt-in open counts. Search runs before the 50-link history limit. Folder lists render 50 links at a time with an explicit expansion control.

Bookmark icons prefer an optional emoji or short label, then an existing validated cached favicon, then the title initial. Custom labels are limited to 16 UTF-16 code units and reject control and bidirectional formatting characters. No schema, dependencies, permissions or network requests are added. Full titles, URLs and tag names remain available in native hover details and accessible link text while visible text truncates.

## 2026-11-17: Links is a compact folder explorer

Replace collection filter buttons and flat full-path groups with nested folder disclosure rows. Favorites, recently used and frequently used are independent disclosure sections above the tree. All three start visible and collapsed; each can be disabled per space in Appearance without affecting Home widgets or Privacy's open counting. Search and a single-tag select apply together across the tree and sections. Filtering retains and expands matching ancestors; unfiltered trees include empty folders. Local manual ordering and icon behavior remain shared with Library.

Dexie v25 records the optional appearance fields without rewriting older preferences. Missing flags mean visible. Imported orphan folders and cycles remain reachable; iterative counting handles deep chains without recursive data traversal. Indentation stops increasing after five levels to preserve usable row width. Link rows retain full hover and accessible details while visible titles and tags truncate.

## 2026-11-17: Session saving uses optional tab access

An explicit Library tool requests optional tabs permission and reads a current-window snapshot, bounded at 500 tabs. Review and deselection precede an atomic folder/bookmark save. Unsupported/private tabs, repeated URLs and active duplicates anywhere in the destination space are skipped. URL protocol, query and fragments stay distinct. Duplicate and folder ownership checks repeat transactionally at save time; no empty folder is created when every candidate is already saved. No session schema or background listener is added.

Saved folder opening needs no tabs permission. It deduplicates validated links in manual order, optionally includes descendants, creates inactive tabs sequentially, confirms above ten and refuses more than fifty. Cancellation preserves tabs already opened. Native optional-permission prompts still require browser release checks. API references: [Chrome tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions).

## 2026-11-17: Link checks are reviewed, bounded and inconclusive by default

M-03 uses foreground, explicit selected-URL checks rather than background crawling. The manifest declares optional HTTP(S) hosts because bookmark sites are user-defined; runtime requests contain only selected scheme/host patterns, never an all-sites grant. Host patterns omit ports for Firefox compatibility and reject wildcard hostnames/URL credentials. Existing Open-Meteo requests retain their precise runtime hosts under these declarations. Revoking selected host access can affect other features and is disclosed before removal.

Only HEAD is sent, with no cookies, referrer, cache or redirect following. There is no GET fallback for sites rejecting HEAD. Fifty checks per run, sequential pacing, eight-second timeouts, cancellation and a stop on rate limits bound the work. 404/410 are reported as not found; login restrictions, redirects, unsupported HEAD, server errors and network/permission failures remain separate outcomes. Even a 2xx response is only a response, not verification of content. Results are transient and never cause database edits or automatic deletion.

References: [Chrome network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests), [optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [Firefox match patterns](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Match_patterns), [Fetch redirect control](https://developer.mozilla.org/en-US/docs/Web/API/Request/redirect). Native permission prompts, site-access revocation and Firefox behavior remain release gates.

## 2026-11-17: Long breaks are optional and follow a fixed rhythm

Focus cycles can add a long break after every fourth focus session, the common Pomodoro rhythm. Only the long break length is configurable; the interval stays fixed to keep the dialog short. The break type is derived from the completed focus count instead of a stored flag, so older cycles and backups need no migration and an unindexed optional field needs no new Dexie version. Phases still start only on request; automatic starts remain out of scope because they would consume time while the user is away.

## 2026-11-17: Links tiles reuse the shared order before free placement

The owner asked for a tiles view of Links, possibly growing into a desktop where links and folders sit at chosen positions. The first version is a toggle inside the existing Links panel: folders open in place like a file explorer, and tile order is the same manual order used by the list and Library. Free grid coordinates would need a new per-item position model, collision handling and a Home surface that conflicts with the minimal-home default, so that step is tracked separately (D-15d) until the owner confirms the direction.

## 2026-11-17: Automatic phase starts are opt-in and need an open tab

The owner asked for automatic starts, which revises the earlier "phases start only on request" rule for users who opt in. With "Start the next phase automatically", an open Oasis tab starts the next phase when the current one ends, timed from the deadline so every tab agrees. The existing stale-phase transaction lets only one tab win. If no tab notices the deadline within 90 seconds (background tabs can tick once a minute), the user was away and the cycle waits for an explicit start as before, so time away still never silently consumes phases. There is still no background alarm, notification or permission.

## 2026-11-17: Links desktop is an opt-in Home section with a fixed grid

D-15d places links and folders at chosen positions. A fixed 8 by 6 grid with integer cells keeps placement predictable, keyboard operable and easy to validate in backups; free pixel positions would need collision and resizing rules on every screen size. It is a new Home layout section, hidden by default, so the minimal Home stays the default. Narrow windows show the same items in reading order and arranging needs a wider window. Folders open in a dialog instead of floating windows. Desktop items reference existing bookmarks and folders rather than copying them, so edits and Trash apply everywhere.

## 2026-11-17: Page text copies reuse the explicit page-details read

X-04 needed storage, permissions and ownership decisions. Text is read through the existing optional scripting permission and the same explicit Read page details action, so no new permission or background capture exists. Only the main content's visible text is kept, never HTML, scripts or images, and only after the user ticks the option. Copies live in their own table so the Library's in-memory bookmark list stays small; search over them is a plain substring scan that is fine for hundreds of copies and is marked as a known limit. Highlights anchor by character offsets and are re-anchored by their quoted text when a page is read again. Highlighting by phrase (with "Use selected text") works for keyboard and pointer users alike, at the cost of choosing the first unhighlighted occurrence of a repeated phrase.

## 2026-11-17: Keyless daily providers first

D-14 asked for provider choices before integrating outside content. Unsplash needs an application key that a distributed extension cannot keep secret, and Pexels has paused new keys. Wikimedia Commons' picture of the day (through the Wikipedia featured feed) and ZenQuotes' quote of the day need no key, so they ship first, each behind its own opt-in. Wikimedia content is freely licensed and shown with author, license and source link. ZenQuotes requires a link back on its free tier. Each source fetches at most once per local day, with a claim so several tabs do not fetch together, and falls back to local albums and collections when offline. Pictures are not copied into storage; the browser's HTTP cache covers repeat views. Provider items are not rateable because ratings drive the local rotation.

## 2026-11-17: Related bookmarks use local word statistics before any model

X-03 left semantic search open between local and external processing. An external embedding service would send bookmark content off the device, and a bundled embedding model adds tens of megabytes plus a WebAssembly runtime. As a first step, related bookmarks use TF-IDF similarity over existing text, tags, folder and site: no dependency, no network and instant results. The limitation is stated in the UI and docs (shared words, not meanings). True semantic search remains a separate owner decision about consent, download size and cost.

## 2026-11-17: Maintenance helpers stay local and explain their limits

Blueprint gaps (paste a URL into search, folder suggestions, unused bookmarks, tag and folder statistics) were filled with local derivations only. Folder suggestions mirror the existing same-host tag suggestions rather than reading page content. "Not opened in 90 days" only appears while open counting is on, because Oasis cannot see opens made outside it; never-opened bookmarks age from their save date. Pasted addresses go through the normal editor and validation instead of saving silently.

## 2026-11-17: Custom Home colors are dimmed for readability

Solid and gradient Home backgrounds reuse the photo text style (white text) instead of choosing text color per background, because gradients can span light and dark colors. Oasis applies the smallest black overlay that keeps white text at 4.5:1 on every chosen color; very light choices therefore look muted. Images keep precedence over colors.

## 2026-11-18: System fonts, an explicit default space and shared icon rules

Font choices use system stacks only, so no font files are bundled or fetched. While adding them we found that Chrome injects its own font stylesheet into extension pages, which had been overriding Oasis's intended system-ui default; an unlayered body rule now lets the chosen font apply. The default space is a flag on one space record rather than a device setting, so it follows the existing space repository and transactions; per-tab choices still win so open tabs never jump between spaces. Folder and space icons reuse the bookmark custom-icon validation instead of adding an icon picker or icon library.

## 2026-11-18: Links open state is a per-browser convenience

Owner testing asked for Links to open on hover and to stay open in new tabs when left open. Whether the floating panel is open is remembered in localStorage rather than in the space's appearance record: it is a view state, not a setting worth backing up, syncing or restoring, and a write per open or close would churn the database. Pinning stays the durable, per-space choice. Hover only opens the panel and never moves focus; closing still uses Escape, the close button or a click outside.

## 2026-11-18: Pasted link import reuses the bookmark HTML pipeline

Batch import of pasted text and files (plain URLs, Markdown, CSV, TSV, OneTab-style lists, JSON exports, any HTML with links) parses into the same typed plan as bookmark HTML import, so validation, the 10,000 item limit, folder merging and duplicate skipping are shared. Format detection is heuristic (one link per line takes the rest of the line as its title) instead of asking the user to pick a format.
