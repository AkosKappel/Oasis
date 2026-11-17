# Release preparation

Prepared 2026-11-15 for a public MIT release. Nothing is published or pushed by this workflow.

## Local package

Use Node 24 and pnpm. Confirm `pnpm exec node --version` reports v24 (the host’s Vite+ shim can select a different runtime). Check `uptime` and `free -m`, then run jobs sequentially:

```sh
pnpm assets:notices
pnpm check
pnpm build
pnpm exec playwright test e2e/release.spec.ts --workers=1
pnpm zip
pnpm exec wxt zip -b edge
```

Distribution archives are under `.output/`. To smoke-test the Edge-target build in Chromium, use `OASIS_EXTENSION_PATH=.output/edge-mv3 pnpm exec playwright test e2e/release.spec.ts --workers=1`; this does not replace testing the Edge browser. Full E2E belongs in CI. Keep the archive’s manifest at its root. Rebuild after any source change. Do not include `.env`, local planning files, test profiles or private backups.

## Prepared material

- [MIT license](../LICENSE), chosen by the owner on 2026-11-15.
- [Privacy policy](../PRIVACY.md), ready to host at an owner-selected public URL.
- [Listing and permission explanations](STORE-LISTING.md).
- Original leaf icon source and PNG sizes under `public/icon/`. Regenerate with `pnpm assets:icons` (one Chromium job, no overlapping build/test suite).
- Bundled `public/LICENSE.txt` and `public/THIRD_PARTY_NOTICES.txt`; regenerate with `pnpm assets:notices` after dependency/license changes, and review upstream notices.
- Screenshot generation in `e2e/release.spec.ts` (1280×800 desktop store images plus a mobile preview), using fictional sample bookmarks and bundled backgrounds. Outputs belong to test artifacts, not the extension bundle. Prepared local copies are in `.output/release-assets/`; `store-*.png` are the desktop upload images and `preview-home-mobile.png` is a separate mobile preview.
- [Artwork provenance](ALBUM-ARTWORK.md), [accessibility checks](ACCESSIBILITY.md) and [performance observations](PERFORMANCE.md).

## Verification snapshot

2026-11-16, Node 24.21.0: `pnpm check` passes TypeScript, ESLint, formatting and all unit tests. Focused browser checks pass for the package, axe scans, Home keyboard/contrast/narrow layouts, storage recovery and 10,000-record Library workloads. The storage pass includes an injected space-list refresh failure while a bookmark draft is open; the draft is preserved. Feature-specific notes, spaces, smart collections, open history, backup, dashboard and weather flows also pass. The continuation batch verifies statistics, optional Home bookmark sections, saved layout controls, native drag/manual ordering, reviewed space transfers and explicit cached page details. The page-details flow executes the built serialized reader against a controlled page, checks denial/revocation, preserves entered text, skips off-origin declarations and renders saved images offline. Native toolbar grants remain in the manual matrix. Local image/quote likes, dislikes, weighted daily rotation and mixed albums are covered by migration, repository and rotation tests. The content-feedback browser flow checks persistence, cross-tab agreement, exclusion, preference review/reset and accessible photo-backed controls. Saved-search flows cover dynamic results, edits/deletion, cross-tab/reload persistence and the manager’s axe scan. Tag-suggestion flows verify supporting counts, explicit selection, preserved draft fields, saved assignments, offline use and the editor’s axe scan; toolbar and page-details capture regressions pass. Scratchpad/task-list checks cover hidden defaults, downloads, conflicts, cross-tab completion, single-dialog task navigation and direct note conflict handling, storage-failure rollback and drafts retained across focus changes. Existing clock/countdown regressions pass.

The consolidation checks cover symmetric bookmark archive limits, complete-space restore, the results-first Library, unified Settings, local Undo/Trash, skippable first-run setup, direct note edits and neutral content skipping. Desktop and narrow-layout screenshots were inspected.

Chrome and Edge target archives were built sequentially and verified against their current build directories: CRC, root manifest, required/optional permissions, PNG dimensions, license notices and exclusion of development/private files. Both target packages have identical extension file contents and are smoke-tested in headless Chromium. This verifies the packaged code, not the separate Chrome and Edge product browsers. Full E2E remains for CI after the owner configures a remote and pushes.

## Browser and OS verification

Headless Chromium covers the actual built Manifest V3 extension. Chrome and Edge product builds, toolbar grants, browser-owned context-menu clicks, global OS shortcuts and screen readers require an interactive check. Do not mark them passed from handler mocks or manifest assertions.

| Check                                                       | Chrome  | Edge    |
| ----------------------------------------------------------- | ------- | ------- |
| Load the unpacked package and open a new tab                | Pending | Pending |
| Capture a real website through the toolbar and context menu | Pending | Pending |
| Invoke/customize the global capture shortcut                | Pending | Pending |
| Read page details, deny/accept/revoke optional scripting    | Pending | Pending |
| Accept, deny and revoke optional weather access             | Pending | Pending |
| Preserve an existing profile during an extension update     | Pending | Pending |
| Reload, offline use, export/import and separate spaces      | Pending | Pending |
| NVDA, zoom, high contrast and OS text scaling               | Pending | Pending |

Record versions and dates when completing the table. Existing automated migration tests protect earlier schemas; still verify an update in a real profile using a copy/backup.

## Owner steps

1. Push approved commits to the public repository and inspect every CI job. Configure required checks after the first complete matrix run.
2. Review the public policy/support links below and set them, together with publisher/contact details, in the store accounts.
3. Complete the interactive browser/OS checks above and the screen-reader pass in ACCESSIBILITY.md.
4. Review the listing, screenshots, MIT license and third-party/artwork notices. Keep the release free and non-commercial if using the current Open-Meteo endpoint; revisit provider terms before monetization.
5. Upload the verified archive to the Chrome Web Store and Microsoft Edge Add-ons, fill in privacy/permission fields, and submit for review when ready.

## Official references

Checked 2026-11-15. Store requirements can change; the dashboards are authoritative at submission.

- [Chrome image requirements](https://developer.chrome.com/docs/webstore/images): PNG store icon and at least one screenshot; screenshots can be 1280×800 or 640×400. Promotional images are optional in the current guidance.
- [Chrome privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy): single purpose, permission justifications and remote-code declaration.
- [Edge publication workflow](https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension): package, listing, privacy information and certification submission.
- [Open-Meteo terms](https://open-meteo.com/en/terms): free endpoint is limited to non-commercial use and requires attribution.

Browser commitments, CI coverage and promotion gates are tracked in [Browser support](BROWSERS.md). CI artifacts are verification outputs, not published releases.

## Public project links

- [Source repository](https://github.com/AkosKappel/Oasis)
- [Support and bug reports](https://github.com/AkosKappel/Oasis/issues)
- [Privacy policy](https://github.com/AkosKappel/Oasis/blob/main/PRIVACY.md)

The repository and issue tracker are public. These links are available for owner review in store forms; they do not imply store approval or publication. A separate website is optional.

Session saving native gate: grant, deny and revoke optional tabs access through Sessions and tabs; verify the current-window preview, deselection, duplicate skipping and folder save against a copied test profile. Confirm that opening a folder works without tabs access, large batches ask for confirmation, and stopping preserves already opened tabs.

Link-check native gate: verify host access starts absent; allow/deny/revoke selected site grants in Chrome, Edge and experimental Firefox. Confirm weather still requests only its two precise hosts under the optional HTTP(S) declarations. Test manual redirects, cookie/referrer omission, timeout/cancel, login walls and rate limiting. Permission removal is shared browser state and may affect weather if its host is selected. The fifty-link foreground check is not a background audit or proof that every inconclusive URL is broken.
