# Oasis

Your personal space on the web. A local-first browser extension combining a new-tab dashboard and bookmark library.

## Development

Use Node.js 24 and pnpm 12.

```sh
pnpm install
pnpm dev
```

WXT starts a Chromium development browser. To use an existing Chrome or Edge profile, run `pnpm build`, open the browser's extensions page, enable Developer mode, and load `.output/chrome-mv3` as an unpacked extension.

```sh
pnpm check       # TypeScript, ESLint, formatting, database tests
pnpm build       # Production Manifest V3 extension
pnpm zip         # Distribution archive
pnpm exec playwright install chromium
pnpm test:e2e    # Build and test the actual extension in Chromium
```

## Scope

A minimal new-tab home with a clock, date, on-demand Links and appearance controls. Search favorites or browse bookmark folders in the Links panel. Choose either side and optionally keep it open on desktop; a visible shortcut row is optional. Choose system, light or dark theme, a preset or custom primary/secondary colors, clock format and which home elements to show. Color changes preview locally, save across tabs and automatically use readable text and focus colors. Focus mode provides a pauseable timer that hides Home distractions while running and follows the clock across tabs and reloads. Optional world clocks and countdowns can be added, hidden or removed through Widgets. An optional daily focus adds one editable goal and completion checkbox for each local day. The separate bookmark library supports nested folders, colored tags and ranked search with typo tolerance. Use Ctrl/Cmd+K to search and navigate; filter with `tag:`, `folder:`, `domain:` or `is:favorite`, and quote names containing spaces.

Save pages through the toolbar popup, the page/link context menu or Alt+Shift+O (customizable in browser extension shortcuts). Context-menu and keyboard capture open an editable confirmation page. Oasis JSON backup preserves bookmarks, folders, tags, favorites and notes. Browser bookmark HTML import/export preserves folder hierarchy, titles, URLs and descriptions; import previews valid records, skips unsafe links and merges exact URLs within each folder. Appearance preferences are device-local and excluded from backups.

Home includes offline starter albums in illustrated landscape, nature, abstract and night styles. Choose a fixed image or daily rotation with dimming, upload personal image albums, and optionally show daily quotes from custom collections. Uploads are resized locally; album and quote managers provide separate portable backups. Built-in artwork stays separate from personal uploads and is excluded from album backups. The Library offers grid/list views, saved name/date sorting and selection actions to move bookmarks, add/remove tags or soft-delete them together.

Optional online content providers are researched in [API sources](docs/API-SOURCES.md). No weather, image or quote API is connected yet.

Storage warnings offer non-destructive retry, backup access and guidance for quota or upgrade problems. Failed saves retain open form fields.

Data stays on the device in IndexedDB; there is no backend, account or analytics. Planned work is tracked in the local `BACKLOG.md`, the full product vision in the blueprint below.

## Documentation

- [Product blueprint](docs/PROJECT.md), original supplied specification, retained as planning context.
- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)
- [Album artwork and prompts](docs/ALBUM-ARTWORK.md)

License and open-source distribution are undecided. This repository is private by default and has no publication configuration.
