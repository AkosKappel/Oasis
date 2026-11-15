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

A minimal new-tab home with a clock, date, on-demand Links and appearance controls. Search favorites or browse bookmark folders in the Links panel. Choose either side and optionally keep it open on desktop; a visible shortcut row is optional. Use Layout to reorder, hide or widen Home sections independently in each space, or reset their arrangement. Choose system, light or dark theme, a preset or custom primary/secondary colors, clock format and which home elements to show. Color changes preview locally, save across tabs and automatically use readable text and focus colors. Focus mode provides a pauseable timer that hides Home distractions while running and follows the clock across tabs and reloads. Optional world clocks and countdowns can be added, hidden or removed through Widgets. Optional Recently added and Frequently opened sections show saved links; enabling them does not enable open counting. An optional daily focus adds one editable goal and completion checkbox for each local day. Create, rename and switch independent spaces from Home, Library or capture. Each tab remembers its selection; deleting a space removes its local content and settings, while the default space is protected. Backups cover the selected space. Selected bookmarks can be copied or moved to another space after reviewing folder/tag mapping; destination open counts start fresh. Smart collections show recently added, favorite, untagged and unorganized bookmarks and combine with Library filters. Per-space open counting is off by default; enable it in Library for recently/frequently opened collections, then disable or clear it whenever you choose. Only opens made from Oasis are counted. The separate bookmark library supports plain-text notes, nested folders, colored tags and ranked search with typo tolerance. Choose local bookmark search or Google, DuckDuckGo, Bing or Brave for Home in Appearance. Web queries are sent only on submission. Use Ctrl/Cmd+K to search bookmarks and navigate; filter with `tag:`, `folder:`, `domain:` or `is:favorite`, and quote names containing spaces.

Save pages through the toolbar popup, the page/link context menu or Alt+Shift+O (customizable in browser extension shortcuts). Context-menu and keyboard capture open an editable confirmation page. Oasis JSON backup preserves bookmarks, folders, tags, favorites and notes. Browser bookmark HTML import/export preserves folder hierarchy, titles, URLs and descriptions; import previews valid records, skips unsafe links and merges exact URLs within each folder. Appearance preferences are device-local and excluded from backups.

Home includes offline starter albums in illustrated landscape, nature, abstract, night, woodland and architectural styles. Choose a fixed image or daily rotation with dimming, upload personal image albums, and optionally show daily quotes from custom collections. Uploads are resized locally; album and quote managers provide separate portable backups. Built-in artwork stays separate from personal uploads and is excluded from album backups. Library statistics summarize retained additions, exact hosts and optional saved open counts without collecting new activity. Duplicate review groups matching URLs for explicit keep/delete decisions while preserving query strings and fragments. The Library offers grid/list views, saved name/date/manual sorting, native bookmark/folder drag-and-drop with keyboard alternatives and selection actions to move bookmarks, add/remove tags or soft-delete them together.

Optional online content providers are researched in [API sources](docs/API-SOURCES.md). Weather uses Open-Meteo only after explicit enablement and city selection, with current conditions, a three-day forecast, Celsius/Fahrenheit, shared caching and offline fallback. Its free endpoint is for personal/non-commercial use. No image or quote API is connected.

Storage warnings offer non-destructive retry, backup access and guidance for quota or upgrade problems. Failed saves retain open form fields.

Saved data stays on the device in IndexedDB; there is no backend, account or analytics. Optional weather sends city searches and chosen coordinates to Open-Meteo after permission is granted. It does not request device location. Planned work is tracked in the local `BACKLOG.md`, the full product vision in the blueprint below.

## Documentation

- [Product blueprint](docs/PROJECT.md), original supplied specification, retained as planning context.
- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)
- [Album artwork and prompts](docs/ALBUM-ARTWORK.md)
- [Privacy policy](PRIVACY.md)
- [Release preparation and remaining owner checks](docs/RELEASE.md)

Licensed under [MIT](LICENSE). Public repository and extension-store publication are prepared separately; no release is published by the development workflow.
