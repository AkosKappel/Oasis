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
