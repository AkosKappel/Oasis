# Browser support and testing

Oasis is a desktop extension. A narrow viewport test does not establish mobile extension support.

| Browser                          | Release policy                 | Verification                                                             |
| -------------------------------- | ------------------------------ | ------------------------------------------------------------------------ |
| Chrome and Edge desktop          | Primary targets, latest stable | Built packages tested in bundled Chromium; native release checks pending |
| Firefox desktop                  | Compatibility work in progress | No supported release yet                                                 |
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
