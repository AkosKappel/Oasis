# Library performance

2026-11-15, headless Chromium on the shared WSL server, 10,000 generated bookmarks:

- JSON restore through the UI and first rendered batch: approximately 11.8 seconds, including transaction, validation, live-query refresh and automation overhead.
- Exact phrase search in notes through the UI: approximately 399 ms, including input and assertion overhead.
- Initial grid and list render 60 cards; Show more increases the batch by 60. Changing filters resets it. Search and sorting include the whole collection, and Select visible applies only to displayed cards (up to 1,000).

The final repeat used the Node 24.21.0 test harness after the spaces and optional open-history changes. These are diagnostic observations, not browser-independent budgets. Restore now uses batched existing-ID reads rather than one read per record. Filtering and sorting are memoized across unrelated UI state changes. The complete library still loads into memory; batching limits initial DOM work, not database payload or search cost. Repeated Show more can still render the full collection.

Reproduce with `pnpm build`, then `pnpm exec playwright test e2e/large-library.spec.ts --workers=1`. Pure exact, typo, operator and no-match workloads run in `src/features/bookmarks/large-library.test.ts` and report elapsed times. Check machine load first and run these jobs sequentially. Full E2E belongs in CI.

Next optimization trigger: sustained input latency on representative personal collections. Profile first, then consider precomputed search fields or a worker. Keep variable-height cards and keyboard navigation usable if virtualization becomes necessary.
