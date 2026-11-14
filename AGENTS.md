# Oasis

Local-first browser extension: a new-tab dashboard and bookmark library (WXT, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Dexie). The workspace rules in `~/projects/AGENTS.md` apply too; read them first if they are not already in your context.

## Commands

pnpm only (`pnpm-lock.yaml`), Node 24.

| Command         | Does                                                |
| --------------- | --------------------------------------------------- |
| `pnpm dev`      | WXT dev browser with the extension loaded           |
| `pnpm check`    | TypeScript, ESLint, Prettier check and Vitest       |
| `pnpm format`   | Prettier write                                      |
| `pnpm test:e2e` | Builds, then Playwright against the built extension |
| `pnpm build`    | Production extension in `.output/chrome-mv3`        |

Run `pnpm check` after your last edit, right before each commit. This machine is also the live home server: run Vitest with `--maxWorkers=3` and keep Playwright at one worker.

## Docs

- `docs/ARCHITECTURE.md`: layout, data model and permissions. Update it when they change.
- `docs/DECISIONS.md`: dated decisions. Add an entry when you choose between real alternatives.
- `docs/PROJECT.md`: the owner's original blueprint. Read it for product context; never edit it.
- `BACKLOG.md`: local and gitignored. Mark items done with the date and commit, keep stable IDs.

## Conventions

- One backlog item per commit, with its tests and doc updates in the same commit.
- Data access goes through the repositories in `src/database`. Every write runs in a Dexie transaction and checks space ownership; deletion sets `deletedAt` instead of removing the record.
- A schema change is a new Dexie version plus a migration test.
- Keep the manifest free of permissions until a feature needs one, and record why in `docs/DECISIONS.md`.
- Pure logic (filters, validation, repositories) gets Vitest tests next to the file (`*.test.ts`); user flows get a Playwright test in `e2e/`.
- UI text is user-facing English: short, plain sentences that tell the user what to do.
