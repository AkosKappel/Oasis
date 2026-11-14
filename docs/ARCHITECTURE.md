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

The manifest declares `activeTab` so the toolbar popup can read the current page title and URL after a user opens it. There is no background worker, content script or network integration. Record any additional permission in [DECISIONS.md](DECISIONS.md).

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

Home's Links control opens a native nonmodal auto popover, rendered through a body portal. It shares bookmark matching and descendant folder filtering with Library. Dexie v6 makes the old favorites row opt-in while preserving the rest of appearance settings. The panel uses normal app colors even over photo backgrounds.

Custom appearance colors are optional in Dexie v7. `colors.ts` handles normalization and contrast, while `apply-appearance.ts` resolves presets/custom fills and readable semantic tokens. The app owns a temporary preview; the appearance hook applies it locally and only persists explicit saves.
