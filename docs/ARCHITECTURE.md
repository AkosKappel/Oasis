# Architecture

Oasis is a Chromium Manifest V3 extension built with WXT and React. `src/entrypoints/newtab` owns the new-tab page; shared application code lives in `src`. WXT generates the manifest and TypeScript configuration.

Tailwind CSS uses its Vite plugin. `components.json` configures shadcn/ui, with editable component source under `src/components/ui` and shared design tokens in `src/styles.css`.

Dexie wraps IndexedDB in `src/database/schema.ts`. Version 1 defines spaces, bookmarks, folders, and tags. IDs are strings, timestamps are epoch milliseconds, and records support deletion tombstones. Folder and tag ownership is explicit through `spaceId`. Referential integrity, deletion behavior, URL validation, and cross-space access must be enforced by the data-access functions added with bookmark management.

Opening a fresh database creates one Personal space transactionally. Import the database only from extension contexts; ordinary web origins have separate storage. Future schema changes require a new Dexie version and migration tests. Sync conflict resolution is not designed yet.

The current shell does not open the database. No background worker, content scripts, network integrations, or additional permissions are declared until a feature requires them.
