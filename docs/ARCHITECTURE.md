# Architecture

Oasis is a Chromium Manifest V3 extension built with WXT and React. `src/entrypoints/newtab` owns the new-tab page; shared application code lives in `src`. WXT generates the manifest and TypeScript configuration.

Tailwind CSS uses its Vite plugin. `components.json` configures shadcn/ui, with editable component source under `src/components/ui` and shared design tokens in `src/styles.css`.

Dexie wraps IndexedDB in `src/database/schema.ts`. Version 1 defines spaces, bookmarks, folders, and tags. IDs are strings, timestamps are epoch milliseconds, and records support deletion tombstones. Folder and tag ownership is explicit through `spaceId`. The bookmark repository enforces URL validation, space ownership, and soft deletion. Folder and tag relationships and their deletion rules will be implemented with their management features.

Opening a fresh database creates one Personal space transactionally. Import the database only from extension contexts; ordinary web origins have separate storage. Future schema changes require a new Dexie version and migration tests. Sync conflict resolution is not designed yet.

The library opens the database through a space-scoped bookmark repository. Writes validate titles and HTTP(S) URLs, reject embedded credentials, and check space ownership inside transactions. Deletion retains a tombstone. A Dexie live query updates the UI when local records change, including writes from other Oasis tabs. The editor uses a native modal dialog for focus containment and Escape handling. No background worker, content scripts, network integrations, or additional permissions are declared until a feature requires them.
