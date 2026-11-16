# Browser support and testing

Oasis is a desktop extension. A narrow viewport test does not establish mobile extension support.

| Browser                          | Release policy                 | Verification                                                             |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Chrome and Edge desktop          | Primary targets, latest stable | Built packages tested in bundled Chromium; native release checks pending |
| Firefox desktop                  | Experimental MV3, Firefox 140+ | Package and shared UI checks; native integration pending                 |
| Brave, Vivaldi and Opera desktop | Best effort                    | No browser-specific certification                                        |
| Safari                           | Deferred                       | No Safari extension package or native checks                             |
| Mobile browsers                  | Deferred                       | Responsive UI only                                                       |

Do not label a browser supported from a successful build alone. Record the actual browser version, OS, date and result for each native release check. Older releases are outside the current support commitment.

## Automated checks

CI separates shared type/lint/unit checks from extension jobs. Linux Chromium runs the full extension suite. Edge-target packages run focused flows in Chromium. Windows and macOS run Chrome-target Chromium smoke checks. These jobs verify extension code on those operating systems, not native Chrome/Edge permission UI. Package checks enforce the permission allowlist, entrypoints, icons, notices and exclusion of private/development files. Failed runs retain traces, screenshots and HTML reports; packages are uploaded as build artifacts, not published.

Run one local job at a time and leave the full browser suite to CI. Examples:

```sh
pnpm exec wxt build -b edge --mv3
node scripts/check-package.mjs edge
OASIS_EXTENSION_PATH=.output/edge-mv3 pnpm exec playwright test e2e/release.spec.ts --workers=1
```

## Native release gates

Complete the matrix in [Release preparation](RELEASE.md) on real Chrome and Edge before claiming native verification: new tabs, toolbar/context-menu capture, global shortcuts, permission accept/deny/revoke, offline use, downloads, restore, profile updates and screen readers. Include Windows with NVDA and macOS with VoiceOver. Use copied test profiles, never the owner's real data.

Firefox promotion requires its own manifest/API audit, actual temporary installation, the same core flows and Mozilla distribution/consent review. Safari requires a separate packaging and native validation effort.

[Playwright's extension guide](https://playwright.dev/docs/chrome-extensions) documents why extension automation uses bundled Chromium. [WXT browser targeting](https://wxt.dev/guide/essentials/target-different-browsers.html) explains separate target builds and manifest versions.

## Experimental Firefox build

Run `pnpm build:firefox`, `node scripts/check-package.mjs firefox` and `pnpm zip:firefox` sequentially. MV3 is explicit because WXT defaults Firefox to MV2. WXT generates background scripts for Firefox, rather than a Chromium service worker. A stable project UUID identifies the add-on; keep it stable across updates. Firefox 140 is the candidate minimum, not a claim that all releases since 140 have been tested.

| Area                        | Audit disposition                                  | Native gate                                                |
| --------------------------- | -------------------------------------------------- | ---------------------------------------------------------- |
| New tab and popup           | MV3 entrypoints generated                          | Install and open both                                      |
| Capture, menus and commands | WXT browser namespace, no direct Chrome-only calls | Toolbar, page/link menus and shortcut                      |
| Page details                | Optional scripting and activeTab retained          | Grant, deny, revoke and execute on a real page             |
| Weather                     | Optional host permissions retained                 | Grant/revoke and confirm requests stop                     |
| Storage and downloads       | IndexedDB and Blob/anchor downloads                | Cross-tab updates, backup restore and profile upgrade      |
| UI                          | Native dialogs/popovers and modern CSS             | Engine checks plus native keyboard, zoom and screen reader |

For temporary native verification, open `about:debugging#/runtime/this-firefox`, choose Load Temporary Add-on and select `.output/firefox-mv3/manifest.json`. Use a disposable profile and record Firefox/OS versions, dates and results before promoting support. Temporary installation is not store signing.

Experimental packaging omits automatic source archives. Prepare a separately reviewed source archive if Mozilla submission requires one.

The Firefox archive is **not AMO-ready**. Review Mozilla's transmission declaration and consent requirements for optional weather, web search and page-image requests before submission. Do not declare `none` solely because Oasis has no backend or telemetry. Accurate metadata, signing and native verification remain release gates.

Sources reviewed 2026-11-16: [WXT targeting](https://wxt.dev/guide/essentials/target-different-browsers.html), [Gecko identity](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/manifest.json/browser_specific_settings), [Mozilla data consent](https://extensionworkshop.com/documentation/develop/firefox-builtin-data-consent/).

## Shared UI engine checks

A separate suite serves the built dashboard on loopback and runs in Chromium, Firefox and WebKit. It covers onboarding, dialogs/popovers, Library CRUD, IndexedDB reload persistence, narrow layouts, keyboard focus, axe checks, note editing and task navigation. Engine versions are recorded in test annotations. Extension permission calls are denied by an injected test-only boundary; production code has no test mode. These are page/engine tests, not Firefox/Safari extension installation or permission results.

```sh
pnpm build
pnpm exec playwright install chromium firefox webkit
pnpm test:ui --project=firefox --workers=1
```

Playwright starts and stops the loopback fixture server. The server exposes only the built extension directory and rejects path traversal. CI installs each engine's Linux dependencies and retains failures/reports. On a host missing WebKit's GTK/media libraries, use its CI job rather than claiming a local pass. Safari remains deferred despite WebKit page coverage.

Local verification, 2026-11-16: shared UI flows pass in Chromium and Firefox. WebKit is configured as an enabled CI test job, but local execution requires GTK/media libraries not installed on this host. No native Firefox extension or Safari support is inferred from the page tests. The full hosted CI/OS matrix still needs an owner push and review of every job.
