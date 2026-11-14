# Architecture

Oasis is a Chromium Manifest V3 extension built with WXT and React. WXT generates the manifest and the TypeScript configuration.

## Layout

| Path                     | Contents                                       |
| ------------------------ | ---------------------------------------------- |
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
- Folder and tag names are unique per space, ignoring case. Deleting a folder clears it from its bookmarks; deleting a tag removes it from theirs. Folders with active subfolders cannot be deleted until hierarchy management exists.
- Schema changes need a new Dexie version and a migration test.
- Open the database only from extension pages: ordinary web origins have separate storage.

## UI

- One Dexie live query reads bookmarks, folders and tags in a read transaction, so the UI updates when records change, including writes from other Oasis tabs.
- Dialogs use the native `<dialog>` element for focus containment and Escape handling.

## Permissions

The manifest declares no permissions, background worker, content scripts or network integrations. Add them only when a feature needs them, and record the reason in [DECISIONS.md](DECISIONS.md).

- New tabs open Home; `#library` opens bookmark management. Home reads the same live library query for favorites and passes searches through the hash query string.
- The command palette shares the library live query and filter helper. Its native modal keeps keyboard focus inside search and restores the previous focused element when closed.
- `src/database/backup.ts` validates and exports active Personal-space records. Restore checks the merged graph inside a write transaction, preserves existing active IDs and adds only missing records. It never removes records or revives tombstones.
