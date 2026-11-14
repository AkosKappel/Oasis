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
