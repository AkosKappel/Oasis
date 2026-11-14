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
