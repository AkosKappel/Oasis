# Oasis privacy

Effective date: 2026-11-16.

Oasis is a local-first new-tab dashboard and bookmark library. It has no account, backend, analytics, advertising or telemetry. The developer does not receive your bookmarks, notes, images, quotes or activity through Oasis.

## Data on your device

Oasis stores spaces, bookmarks, folders, tags, notes, personal images, quotes, appearance preferences, focus goals/sessions, widgets, scratchpad notes and task lists, explicit image/quote likes and dislikes, and optional weather settings/cache in your browser profile’s IndexedDB. Per-tab space selection uses sessionStorage. Open counting is off by default. If you enable it for a space, Oasis records counts and last-opened times for bookmark opens made from Oasis. It does not read your browser’s browsing history. Image and quote feedback stores only your current explicit choices per space and adjusts local daily rotation. Oasis does not log impressions or send feedback to a recommendation service. Neutral Next controls keep a temporary selection in the current tab only and do not save a rating. You can disable counting and clear the saved counts in Settings → Privacy.

Backup files are written only when you choose to export them. They may contain private content, including bookmark notes and saved open counts. Complete space archives contain active content and settings, including personal images, quotes, widget notes/tasks, saved searches and feedback. Restore creates a new space; weather/counting restore off and timers pause. Portable bookmark JSON/HTML, personal album and quote archives remain separate and do not include every setting. Notes and tasks also offer plain-text downloads. Archives cover the selected space. Keep exported files somewhere you trust.

## Requests you choose

Core bookmark and dashboard features work offline. Tag suggestions use only existing bookmarks and tags in the selected space, without fetching the page or contacting a model/service. Page details are off by default. Choosing “Read page details” in toolbar capture requests optional scripting access and reads the current page’s description. It may fetch a declared icon and preview from the same website, without cookies or referrer and without following redirects. Third-party image URLs are skipped, and no lookup service is used. Small PNG/JPEG copies are stored locally and displayed offline. Merely opening Library does not fetch website images.

If you enable weather and grant optional host access, city searches go to `geocoding-api.open-meteo.com` and forecasts for the coordinates of your selected city go to `api.open-meteo.com`. Requests also expose ordinary connection information such as your IP address to the provider. Oasis does not request device geolocation. Weather is cached locally and refreshed while used, not through a background crawl. Disabling weather stops its forecast requests in that space; you can also revoke host access in browser extension settings. See [Open-Meteo’s terms and privacy information](https://open-meteo.com/en/terms).

Home search defaults to your local bookmarks. If you choose Google, DuckDuckGo, Bing or Brave, submitting a query navigates to that provider with the query in the URL. Oasis does not send suggestions or queries while you type. Opening a saved bookmark similarly connects you to the destination site. Each destination applies its own privacy policy.

## Permissions

- `activeTab`: read a page’s title and URL when you explicitly capture it through the extension toolbar or shortcut.
- `contextMenus`: offer Save to Oasis actions for pages and links. Capture opens an editable confirmation page before saving.
- Optional `scripting`: read page details only after an explicit toolbar-capture action, using temporary `activeTab` access. Remove access in capture or browser extension settings; saved local images remain until removed.
- Optional Open-Meteo host access: city lookup and forecasts after you explicitly enable weather.

Oasis replaces the new-tab page. It does not request browsing-history, geolocation or blanket website access, and it does not load remotely hosted executable code.

## Removing data

You can delete individual content or a non-default space in Oasis. Deletion hides records using local tombstones; deleted personal and bookmark image payloads are released. Removed bookmarks, notes, widgets and tasks remain recoverable in this space’s Trash. Trash is local and excluded from backups. Other removed text and identifiers can remain locally for consistency. Clear Oasis extension storage through your browser or remove the extension to erase its local database. Exported backup files and data held by destination websites are outside that deletion and must be removed separately.

## Questions

Contact the publisher through the support link on the store listing or the public repository’s issue tracker. Avoid including private bookmark URLs, notes or backup files in a public issue.
