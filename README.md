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

A minimal new-tab home with a clock, date, favorite links and appearance controls. Choose system, light or dark theme, an accent color, clock format and which home elements to show. The separate bookmark library supports nested folders, colored tags and ranked search with typo tolerance. Use Ctrl/Cmd+K to search and navigate; filter with `tag:`, `folder:`, `domain:` or `is:favorite`, and quote names containing spaces.

The toolbar popup saves the current page to your library. Oasis JSON backup preserves bookmarks, folders, tags, favorites and notes. Browser bookmark HTML import/export preserves folder hierarchy, titles, URLs and descriptions; import previews valid records, skips unsafe links and merges exact URLs within each folder. Appearance preferences are device-local and excluded from backups.

Data stays on the device in IndexedDB; there is no backend, account or analytics. Planned work is tracked in the local `BACKLOG.md`, the full product vision in the blueprint below.

## Documentation

- [Product blueprint](docs/PROJECT.md), original supplied specification, retained as planning context.
- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)

License and open-source distribution are undecided. This repository is private by default and has no publication configuration.
