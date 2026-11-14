# Roadmap

## Foundation

- [x] Local Git repository and pnpm project.
- [x] WXT, React, TypeScript, Tailwind, and shadcn/ui foundation.
- [x] New-tab entrypoint and shared design tokens.
- [x] Initial versioned Dexie schema and default-space test.
- [x] Linting, formatting, build scripts, and CI configuration.

## Next: bookmark management

- [x] Validated data access, bookmark creation, editing, and soft deletion.
- [x] Bookmark cards, favorites, basic text filtering, and opening links in new tabs.
- [x] Reactive local queries, loading and error states, database tests, and Chromium interaction test.
- [x] Flat folders, colored tags, assignment, combined filters and counts.
- [x] Atomic organization deletion that preserves bookmarks, with database and extension tests.
- [ ] Import/export.

Deleting a folder moves its bookmarks to Unorganized. Deleting a tag removes its assignments. Nested folders, drag-and-drop, and custom folder icons remain future work.

## Later

Search and command palette, quick capture, dashboard widgets, multiple-space UI, customization, and statistics follow the milestones in [the product blueprint](PROJECT.md). Backend and synchronization remain undecided.

The supplied blueprint is preserved as the original planning snapshot; this file tracks repository implementation progress.
