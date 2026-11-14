# Oasis

Your personal space on the web. A local-first browser extension combining a new-tab dashboard and bookmark library.

## Development

Use Node.js 22.12+ (or a newer supported LTS) and pnpm 12.18.0.

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

## Current scope

The foundation includes WXT, React, strict TypeScript, Tailwind CSS, shadcn/ui configuration and a Button primitive, Lucide icons, and a versioned Dexie schema. The new-tab page provides a bookmark library with add, edit, delete, favorites, and basic text filtering. Bookmarks open in a new tab. Folders, tags, import/export, and dashboard widgets are not implemented yet.

The database creates a Personal space on first open. All data stays in IndexedDB; no backend, analytics, or account is configured. Cloud synchronization remains an open decision.

## Documentation

- [Product blueprint](docs/PROJECT.md), original supplied specification, retained as planning context.
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Decisions](docs/DECISIONS.md)
- [Changelog](docs/CHANGELOG.md)

License and open-source distribution are undecided. This repository is private by default and has no publication configuration.
