# Decisions

## 2026-11-14: project foundation

- Adopt the blueprint's WXT, React, TypeScript, Tailwind, shadcn/ui, and Dexie stack.
- Use pnpm per workspace guidelines and commit its lockfile for reproducibility.
- Target Chromium Manifest V3 initially, covering Chrome and Edge.
- Keep extension permissions empty until functionality needs them.
- Model spaces immediately and create one default space on database initialization.
- Include optional deletion timestamps without committing to a synchronization algorithm.
- Defer feature-specific dependencies, background scripts, and content scripts until needed.
- Leave repository hosting, licensing, and public distribution undecided.

## 2026-11-14: initial organization

- Start with flat folders and multiple tags per bookmark; defer hierarchy and drag-and-drop.
- Deleting a folder keeps bookmarks and removes their folder assignment. Deleting a tag removes its assignments. Both operations retain tombstones and commit atomically.
- Reject assignments to deleted, missing, or other-space records.
- Folder and tag names are trimmed, limited to 80 characters, and unique ignoring case within their type and space.
- Counts show active bookmarks across the whole library; filters combine by intersection.
- Keep `BACKLOG.md` local and ignored by Git, matching the workspace convention.

## 2026-11-14: documentation

- Track planned work only in the local `BACKLOG.md` and history only in Git. The blueprint's `docs/ROADMAP.md` and `docs/CHANGELOG.md` are dropped because they repeated both; add a changelog with the first public release.
- `AGENTS.md` holds the rules for coding agents (Codex, Claude); `CLAUDE.md` imports it.
