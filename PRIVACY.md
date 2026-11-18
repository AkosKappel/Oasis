# Oasis privacy

Effective date: 2026-11-17.

Oasis is a local-first new-tab dashboard and bookmark library. It has no account, backend, analytics, advertising or telemetry. The developer does not receive your bookmarks, notes, images, quotes or activity through Oasis.

## Data on your device

Oasis stores spaces, bookmarks, folders, tags, notes, personal images, quotes, appearance preferences, focus goals/sessions, widgets, scratchpad notes and task lists, explicit image/quote likes and dislikes, and optional weather settings/cache in your browser profile’s IndexedDB. Per-tab space selection uses sessionStorage. Open counting is off by default. If you enable it for a space, Oasis records counts and last-opened times for bookmark opens made from Oasis. It does not read your browser’s browsing history. Image and quote feedback stores only your current explicit choices per space and adjusts local daily rotation. Oasis does not log impressions or send feedback to a recommendation service. Neutral Next controls keep a temporary selection in the current tab only and do not save a rating. You can disable counting and clear the saved counts in Settings → Privacy.

Backup files are written only when you choose to export them. They may contain private content, including bookmark notes and saved open counts. Complete space archives contain active content and settings, including personal images, quotes, widget notes/tasks, saved searches and feedback. Restore creates a new space; weather/counting restore off and timers pause. Portable bookmark JSON/HTML, personal album and quote archives remain separate and do not include every setting. Notes and tasks also offer plain-text downloads. Archives cover the selected space. Keep exported files somewhere you trust.

## Requests you choose

Core bookmark and dashboard features work offline. Tag suggestions use only existing bookmarks and tags in the selected space, without fetching the page or contacting a model/service. Page details are off by default. Choosing “Read page details” in toolbar capture requests optional scripting access and reads the current page’s description. It may fetch a declared icon and preview from the same website, without cookies or referrer and without following redirects. Third-party image URLs are skipped, and no lookup service is used. Small PNG/JPEG copies are stored locally and displayed offline. Merely opening Library does not fetch website images.

If you enable weather and grant optional host access, city searches go to `geocoding-api.open-meteo.com` and forecasts for the coordinates of your selected city go to `api.open-meteo.com`. Requests also expose ordinary connection information such as your IP address to the provider. Oasis does not request device geolocation. Weather is cached locally and refreshed while used, not through a background crawl. Disabling weather stops its forecast requests in that space; you can also revoke host access in browser extension settings. See [Open-Meteo’s terms and privacy information](https://open-meteo.com/en/terms).

Daily web content is off by default. If you turn on the picture of the day (Settings → Image albums), Oasis requests today’s featured content from `en.wikipedia.org` once a day and loads the picture from Wikimedia servers; no site access is needed because Wikipedia allows these requests. If you turn on the quote of the day (Settings → Quote collections) and allow access to `zenquotes.io`, Oasis requests today’s quote there once a day. Both providers receive ordinary connection information such as your IP address; no cookies or referrer are sent. Only today’s title, author, license and link (or the quote and its author) are stored, and they are forgotten when you turn the source off. See [Wikimedia’s privacy policy](https://foundation.wikimedia.org/wiki/Policy:Privacy_policy) and [ZenQuotes](https://zenquotes.io/).

Home search defaults to your local bookmarks. If you choose Google, DuckDuckGo, Bing or Brave, submitting a query navigates to that provider with the query in the URL. Oasis does not send suggestions or queries while you type. Opening a saved bookmark similarly connects you to the destination site. Each destination applies its own privacy policy.

Read page details also reads the visible text of the page’s main content. It is kept only if you tick Keep a text copy of this page before saving. Saved text and your highlights and highlight notes stay in this browser, appear in complete space backups, and are searchable in Library. Remove a copy with Remove text copy in the Page text dialog; deleting a space clears its copies.

Session saving reads titles and URLs in the current browser window only after you choose Read window tabs and grant optional tab access. You review a snapshot and select links before they are stored as ordinary bookmarks. Private tabs and unsupported browser pages are skipped. No browser-history API is used. Access can be removed in the session dialog or browser settings. Opening a saved folder creates background tabs on request, with confirmation above ten links and a limit of fifty.

Choosing Check links in Library lets you select URLs, grant access to their sites and start a one-time check. The selected sites receive those URLs (including query parameters) and ordinary connection information such as your IP address. Checks use HEAD requests without cookies or referrers, do not follow redirects and never fetch page bodies or run a background crawl. Requests are sequential, limited to fifty per run, time out after eight seconds and stop on cancellation or rate limiting. Results stay in the open dialog only and do not change or delete bookmarks. A denied, revoked, blocked or failed request is inconclusive, not proof that a page is gone. You can remove access for selected sites in the dialog or use browser extension settings; removing a site grant can affect other Oasis features using that site.

## Permissions

- `activeTab`: read a page’s title and URL when you explicitly capture it through the extension toolbar or shortcut.
- `contextMenus`: offer Save to Oasis actions for pages and links. Capture opens an editable confirmation page before saving.
- `favicon` (Chrome and Edge): show a saved site's icon from the browser's local favicon cache. No request is sent to the site.
- Optional `tabs`: preview the current window for explicit session saving. Tabs are not observed in the background.
- Optional `scripting`: read page details only after an explicit toolbar-capture action, using temporary `activeTab` access. Remove access in capture or browser extension settings; saved local images remain until removed.
- Optional HTTP(S) host access: the manifest permits requesting site-specific grants for reviewed link checks. Oasis requests only the selected scheme and site names, not an all-sites runtime grant. Browser grants cover all paths and ports for those site names; actual checks use only selected URLs. No host access is required at installation.
- Optional Open-Meteo host access: city lookup and forecasts after you explicitly enable weather.
- Optional `zenquotes.io` access: the quote of the day after you turn it on. Turning it off removes this access.

Oasis replaces the new-tab page. It does not request browsing-history or geolocation access, and it does not load remotely hosted executable code.

## Removing data

You can delete individual content or a non-default space in Oasis. Deletion hides records using local tombstones; deleted personal and bookmark image payloads are released. Removed bookmarks, notes, widgets and tasks remain recoverable in this space’s Trash. Trash is local and excluded from backups. Other removed text and identifiers can remain locally for consistency. Clear Oasis extension storage through your browser or remove the extension to erase its local database. Exported backup files and data held by destination websites are outside that deletion and must be removed separately.

## Questions

Contact the publisher through the support link on the store listing or the public repository’s issue tracker. Avoid including private bookmark URLs, notes or backup files in a public issue.
