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

A minimal new-tab home with a clock, date and favorite links, plus a separate bookmark library with folders, colored tags and filtering. Use Ctrl/Cmd+K to search bookmarks and navigate. The toolbar popup saves the current page to your library. Versioned JSON backup and restore keeps bookmarks, folders and tags portable. All data stays in IndexedDB on the device; there is no backend, account or analytics. Planned work is tracked in the local `BACKLOG.md`, the full product vision in the blueprint below.

## Documentation

- [Product blueprint](docs/PROJECT.md), original supplied specification, retained as planning context.
- [Architecture](docs/ARCHITECTURE.md)
- [Decisions](docs/DECISIONS.md)

License and open-source distribution are undecided. This repository is private by default and has no publication configuration.
